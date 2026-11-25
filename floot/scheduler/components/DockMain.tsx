// @ts-nocheck
import { initializeDockEngine } from '../helpers/dockEngine';
// Existing scheduler interface preserved for migration.
import { useRealtimeChannel, useRealtimeReconnect } from '../helpers/live';
import { dockFetch } from '../helpers/dockFetch';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import {
  Badge, Box, Button, Checkbox, Divider, Group,
  NativeSelect, Paper, PasswordInput, Stack, Text, TextInput, ThemeIcon, Title,
  UnstyledButton, SegmentedControl,
} from '@mantine/core';
import { IconCalendar, IconMapPin, IconSearch, IconNotes, IconDroplet } from '@tabler/icons-react';
import L from 'leaflet';
import { Provider, setAppTheme } from './DockTheme';
import '@mantine/core/styles.css';
import 'leaflet/dist/leaflet.css';
import { ScheduleControls } from './DockSchedules';
import { DeleteJobDialog } from './DockDeleteJob';
import { AdminArea } from './DockAdmin';
import { jobEditUrl } from '../helpers/dockJobMetadata';
import { compareSubmissionDates } from '../helpers/dockSubmissionDate';
import { JobDates } from './DockJobDates';

window.L = L;
window.dockFetch = dockFetch;
// The map engine owns records, filtering and saves. React owns the component DOM.
// Small, explicit entry points let us modernize the UI without duplicating job logic.
let jobsRoot;
let updateStorage = () => {};
let updateSnapshot = () => {};
let requestDelete = () => {};
let updateSelection = () => {};
const deletedSchedules = new Map();
let selectedSchedule = (() => { try { return localStorage.getItem('dockCrewSchedule') ?? '00000000-0000-4000-8000-000000000001'; } catch { return ''; } })();
function normalizeSnapshot(result) {
  const definitions = result.historySchedules || result.schedules || [];
  for (const schedule of definitions) if (schedule.deleted_at) deletedSchedules.set(schedule.id, schedule);
  const history = new Map(definitions.map(schedule => [schedule.id, schedule]));
  for (const [id, schedule] of deletedSchedules) history.set(id, schedule);
  return { ...result, schedules: (result.schedules || []).filter(schedule => !deletedSchedules.has(schedule.id)), historySchedules: [...history.values()] };
}
function resetDeletedSelection() {
  if (!deletedSchedules.has(selectedSchedule)) return;
  selectedSchedule = ''; updateSelection('');
  try { localStorage.setItem('dockCrewSchedule', ''); } catch {}
}
window.schedulerUI = {
  setTheme: setAppTheme,
  jobEditUrl,
  compareSubmissionDates,
  setStorage(value) { updateStorage(value); },
  matchesSchedule(job) { return !deletedSchedules.has(job.scheduleId) && (!selectedSchedule || !job.scheduleId || job.scheduleId === selectedSchedule); },
  setSnapshot(result) { const snapshot = normalizeSnapshot(result); resetDeletedSelection(); updateSnapshot(snapshot); },
  scheduleDeleted(schedule) {
    deletedSchedules.set(schedule.id, schedule); resetDeletedSelection();
    updateSnapshot(previous => normalizeSnapshot(previous));
    window.schedulerEngine?.selectSchedule();
  },
  jobChanged(job) { if (job.jobId) updateSnapshot(previous => ({ ...previous, locations: previous.locations.map(item => item.jobId === job.jobId ? { ...item, ...job } : item) })); },
  requestDelete(job) { requestDelete(job); },
  jobDeleted(jobId) { updateSnapshot(previous => ({ ...previous, locations: previous.locations.filter(job => job.jobId !== jobId) })); },
  renderJobs(rows) {
    jobsRoot ||= createRoot(document.getElementById('customer-list'));
    jobsRoot.render(<Provider><JobList rows={rows} /></Provider>);
    document.getElementById('visible-count').textContent = `${rows.length} ${rows.length === 1 ? 'job' : 'jobs'}`;
  },
  createDialog(kind) {
    // Native dialog keeps the established focus trap and save/cancel lifecycle.
    const dialog = document.createElement('dialog');
    dialog.className = `completion-dialog${kind === 'photos' ? ' photo-dialog' : ''}`;
    const root = createRoot(dialog);
    flushSync(() => root.render(<Provider><DialogContent kind={kind} /></Provider>));
    const remove = dialog.remove.bind(dialog);
    dialog.remove = () => { root.unmount(); remove(); };
    return dialog;
  },
};

function JobList({ rows }) {
  if (!rows.length) return <Stack align="center" p="xl" gap="xs" className="no-results">
    <ThemeIcon size={44} variant="light"><IconSearch size={22} /></ThemeIcon>
    <Text fw={600}>No matching jobs</Text><Text size="sm" c="dimmed" ta="center">Try a different search or clear your filters.</Text>
  </Stack>;
  return <Stack gap="sm" p="md">{rows.map(job => <JobCard key={job.jobId || job.submissionId || job.rowNumber} job={job} />)}</Stack>;
}

function JobCard({ job }) {
  const engine = () => window.schedulerEngine;
  const showMap = () => {
    if (window.matchMedia('(max-width: 640px)').matches) window.dispatchEvent(new CustomEvent('scheduler-view', { detail: 'map' }));
  };
  const open = () => { showMap(); engine().focusLocation(job); };
  const hover = value => engine().hoverLocation(job, value);
  return <Paper withBorder radius="md" p="md" className={`customer${job.completed ? ' completed-row' : ''}`} onMouseEnter={() => hover(true)} onMouseLeave={() => hover(false)}>
    <Group justify="space-between" align="flex-start" wrap="nowrap" mb={6}>
      <UnstyledButton onClick={open} className="job-open"><Text fw={650} size="sm" className="customer-name">{job.fullName || 'Customer'}</Text></UnstyledButton>
      <Badge variant="light" color={job.completed ? 'teal' : 'lakeview'} size="xs">{job.completed ? 'Completed' : 'To do'}</Badge>
    </Group>
    {job.bodyOfWater && <Group gap={5} className="customer-water"><IconDroplet size={14} /><Text size="xs" fw={600}>{job.bodyOfWater}</Text></Group>}
    <JobDates job={job} />
    <Text size="xs" c="dimmed" mt={6} className="customer-address">{job.address || job.rawAddress || 'Address unavailable'}</Text>
    <Group gap={6} mt="sm" wrap="nowrap" className="customer-date"><IconCalendar size={14} /><Text size="xs" fw={500}>{job.appointment || 'Not scheduled'}</Text></Group>
    {job.workDescription && <Text size="xs" c="dimmed" mt="xs" className="customer-work">{job.workDescription}</Text>}
    {job.notes && <Box className="customer-notes" mt="xs"><Text size="xs"><b>Notes: </b>{job.notes}</Text></Box>}
    {!job.hasCoordinates && <Text c="orange" size="xs" mt="xs">Location not set</Text>}
    <Divider my="sm" />
    <Group justify="space-between" gap="xs" className="customer-actions">
      <Checkbox key={String(job.completed)} defaultChecked={job.completed} className="completed-control" size="xs" label="Completed" onChange={event => engine().updateCompleted(job, event.currentTarget.checked, event.currentTarget)} />
      <Group gap={2}>
        {jobEditUrl(job) && <Button component="a" href={jobEditUrl(job)} target="_blank" rel="noopener noreferrer" className="edit-job-button" variant="light" size="compact-xs">Edit job</Button>}
        {job.jobId && <Button color="red" variant="subtle" size="compact-xs" onClick={() => window.schedulerUI.requestDelete(job)}>{job.deletionPending ? 'Retry deletion' : 'Delete job'}</Button>}
        <Button className="notes-button" variant="subtle" size="compact-xs" leftSection={<IconNotes size={14} />} onClick={() => { showMap(); engine().openLocationPopup(job); }}>Notes</Button>
        <Button className="water-button" variant="subtle" size="compact-xs" onClick={() => { showMap(); engine().openLocationPopup(job); }}>Water</Button>
      </Group>
    </Group>
    <Button disabled title="Geocoding is not connected in staging" className="geocode-one" mt="xs" variant="subtle" color="gray" size="compact-xs" leftSection={<IconMapPin size={13} />} onClick={event => engine().geocodeOne(job, event.currentTarget)}>{job.hasCoordinates ? 'Refresh location' : 'Geocode address'}</Button>
  </Paper>;
}

function DialogContent({ kind }) {
  if (kind === 'signin') return <form><Badge variant="light" mb="md">Lakeview Marine</Badge><Title order={2} id="crew-sign-in-title">Crew sign in</Title><Text size="sm" c="dimmed" mt="xs" mb="lg">Sign in to view and update your crew’s jobs.</Text><PasswordInput id="crew-password" label="Crew password" autoComplete="current-password" required /><Text component="p" className="completion-error" role="alert" size="sm" /><Group justify="flex-end"><Button type="submit">Sign In</Button></Group></form>;
  if (kind === 'photos') return <form><Title order={2} id="photo-heading">Job photos</Title><Text component="p" className="photo-customer" c="dimmed" size="sm" /><Text size="sm" mb="md">Attach up to two photos. Compressed copies are included on the completed job printout.</Text><div className="photo-previews" /><TextInput id="job-photo-files" label="Add photos" type="file" accept="image/jpeg,image/png,image/webp" multiple mt="md" /><Text component="p" className="completion-error" role="alert" size="sm" /><Group justify="flex-end" mt="lg"><Button variant="default" type="button" className="photo-cancel">Cancel</Button><Button type="submit" className="photo-save">Save Photos</Button></Group></form>;
  return <form><Badge variant="light" color="teal" mb="md">Job completion</Badge><Title order={2} id="completion-heading">Complete job</Title><Text component="p" className="completion-customer" c="dimmed" size="sm" /><TextInput id="completion-signature" name="signature" label="Type your signature" maxLength={100} required autoComplete="name" /><div className="completion-preview" aria-live="polite" /><TextInput id="completion-date" name="date" label="Completion date" type="date" required mt="md" /><Text component="p" className="completion-error" role="alert" size="sm" /><Group justify="flex-end" mt="lg"><Button type="button" variant="default" className="completion-cancel">Cancel</Button><Button type="submit" color="teal" className="completion-save">Sign &amp; Mark Completed</Button></Group></form>;
}

export function DockScheduler() {
  useRealtimeChannel('dock:crew', () => window.schedulerEngine?.refreshData());
  useRealtimeReconnect(() => window.schedulerEngine?.refreshData());
  const [storage, setStorage] = useState(null);
  const [deleteJob, setDeleteJob] = useState(null);
  const [snapshot, setSnapshot] = useState({ schedules: [], locations: [] });
  const [schedule, setSchedule] = useState(selectedSchedule);
  const currentSchedule = snapshot.schedules?.find(item => item.id === schedule);
  function scheduleSaved(saved) {
    const replace = list => list.some(item => item.id === saved.id) ? list.map(item => item.id === saved.id ? saved : item) : [...list, saved];
    setSnapshot(previous => ({ ...previous, schedules: replace(previous.schedules), historySchedules: replace(previous.historySchedules || previous.schedules) }));
    window.schedulerEngine.refreshData();
  }
  function selectSchedule(value) {
    selectedSchedule = value; setSchedule(value);
    try { localStorage.setItem('dockCrewSchedule', value); } catch {}
    window.schedulerEngine?.selectSchedule();
  }
  const [view, setView] = useState('split');
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    updateStorage = setStorage;
    updateSnapshot = setSnapshot;
    requestDelete = setDeleteJob;
    updateSelection = setSchedule;
    const changeView = event => setView(event.detail);
    window.addEventListener('scheduler-view', changeView);
    return () => window.removeEventListener('scheduler-view', changeView);
  }, []);
  useEffect(() => {
    const stop = initializeDockEngine(L);
    return () => { stop(); const root = jobsRoot; jobsRoot = undefined; queueMicrotask(() => root?.unmount()); };
  }, []);
  return <div id="app"><div role="status" style={{padding:10,background:"#edf5fc"}}>Google staging · Appointments are saved in Marine Ops. Outlook sync and address geocoding are disconnected.</div>
    {deleteJob && <DeleteJobDialog key={deleteJob.jobId} job={deleteJob} onClose={() => setDeleteJob(null)} onDeleted={jobId => { window.schedulerEngine.removeJob(jobId); setDeleteJob(null); }} />}
    {snapshot.migrationReview && <div role="status" style={{padding:"0.65rem 1rem",background:"#edf5fc",color:"#002f5d",borderBottom:"1px solid #acd0ef"}}>Migration review · This is a read-only copy. Use the current scheduler to make changes.</div>}
    <header id="header" className={filtersOpen ? 'filters-open' : ''}>
      <Group justify="space-between" className="brand-row" gap="md">
        <Group gap="sm" wrap="nowrap" className="header-brand"><img className="header-logo" src="/scheduler-assets/lakeview-logo.png" alt="Lakeview Marine Dock & Lift Services" width="117" height="78" /><div><Text size="xs" fw={700} c="lakeview" tt="uppercase" style={{ letterSpacing: '0.12em' }}>Lakeview Marine</Text><Title id="title" order={1} size="h3">Dock &amp; lift scheduler <Text component="span" c="dimmed" inherit fw={400}>/ {currentSchedule?.name || (snapshot.schedules?.length ? "All schedules" : "Fall 2026")}</Text></Title></div></Group>
        <Group gap="md" wrap="nowrap" className="heading-actions"><Group gap="sm" id="summary">{[['total', 'Total jobs'], ['completed', 'Completed'], ['remaining', 'Remaining']].map(([key, label]) => <div className={`summary-box summary-${key}`} key={key}><Text id={`summary-${key}`} fw={700} size="xl" lh={1.1}>0</Text><Text size="xs" c="dimmed">{label}</Text></div>)}</Group><Button component="a" href={schedule ? `/dockscheduler/add-job?scheduleId=${encodeURIComponent(schedule)}` : "/dockscheduler/add-job"} disabled={currentSchedule?.archived} target="_blank" rel="noopener noreferrer" title="Open the job form in a new window" size="sm">Add job</Button></Group>
      </Group>
      {storage === 'records' && <ScheduleControls schedules={snapshot.schedules} historySchedules={snapshot.historySchedules} selected={schedule} onSelect={selectSchedule} rows={snapshot.locations} onRefresh={scheduleSaved} />}
      <div id="filter-bar" role="region" aria-label="Filter locations">
        <TextInput id="search" label="Search jobs" placeholder="Customer, address, phone, RO# or notes" leftSection={<IconSearch size={16} />} type="search" className="search-field" />
        <NativeSelect id="town" label="Town"><option value="">All towns</option></NativeSelect>
        <NativeSelect id="water-filter" label="Body of water"><option value="">All bodies of water</option></NativeSelect>
        <div className="date-field"><Text size="sm" fw={500} mb={3}>Appointment date range</Text><Group gap={6} wrap="nowrap" id="date-row"><TextInput id="date-from" type="date" aria-label="Appointment start date" /><Text c="dimmed" size="xs">to</Text><TextInput id="date-to" type="date" aria-label="Appointment end date" /></Group></div>
      </div>
      <Group justify="space-between" mt="sm" gap="xs" className="toolbar-actions">
        <Group gap="xs"><Button className="mobile-filter-toggle" variant="default" size="compact-sm" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>{filtersOpen ? 'Hide filters' : 'Filters'}</Button><Button id="filter-today" variant="light" size="compact-sm">Today</Button><Button id="filter-tomorrow" variant="light" size="compact-sm">Tomorrow</Button><Button id="clear-date" variant="subtle" color="gray" size="compact-sm">Clear filters</Button><Checkbox id="include-completed" label="Include completed" size="xs" ml="sm" /></Group>
        <Group gap="xs">{storage === 'records' && <AdminArea schedules={snapshot.schedules} rows={snapshot.locations} onSaved={scheduleSaved} onDeleted={saved => window.schedulerUI.scheduleDeleted(saved)} />}<Text id="refresh-status" size="xs" c="dimmed" role="status" />{storage === 'records' && <Button key="export" component="a" href="/_api/dock/records" variant="default" size="compact-sm">Export JSON</Button>}<Button key="theme" id="theme-toggle" variant="default" size="compact-sm">Dark theme</Button><Button key="geocode" id="geocode-all" disabled variant="default" size="compact-sm">Geocode all addresses</Button><Button key="refresh" id="refresh-data" variant="light" size="compact-sm">Refresh jobs</Button></Group>
      </Group>
    </header>
    <div className="mobile-view"><SegmentedControl fullWidth value={view} aria-label="Workspace view" data={[{ label: 'Map + list', value: 'split' }, { label: 'Map', value: 'map' }, { label: 'List', value: 'list' }]} onChange={setView} /></div>
    <main id="workspace" data-view={view}>
      <aside id="sidebar" aria-label="Locations"><Group justify="space-between" p="md" className="list-heading"><div><Text fw={650} size="sm">Crew jobs</Text><Text id="visible-count" size="xs" c="dimmed">Loading jobs…</Text></div><NativeSelect id="sort-by" aria-label="Sort jobs" size="xs" defaultValue="date" data={[{ value: 'date', label: 'Date / time slot' }, { value: 'submittedDate', label: 'Date Submitted' }, { value: 'lastName', label: 'Last name' }, { value: 'bodyOfWater', label: 'Body of water' }]} /></Group><div id="customer-list" /></aside>
      <div id="map" aria-label="Job locations map"><div id="map-status" role="status">Loading…</div></div>
    </main>
  </div>;
}


