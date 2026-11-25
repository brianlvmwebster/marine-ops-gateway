// @ts-nocheck
// Existing scheduler interface preserved for migration.
import { dockFetch } from '../helpers/dockFetch';
import React, { useMemo, useState } from 'react';
import { IconPhoto } from '@tabler/icons-react';
import { Alert, Badge, Button, Group, Modal, NativeSelect, Paper, SimpleGrid, Stack, Table, Text, TextInput } from '@mantine/core';
import { DockJobPreview } from './DockJobPreview';
import { JobDates } from './DockJobDates';
import { jobEditUrl } from '../helpers/dockJobMetadata';

export function ScheduleControls({ schedules, historySchedules = schedules, selected, onSelect, rows, onRefresh }) {
  const [opened, setOpened] = useState(false);
  const [viewedJobId, setViewedJobId] = useState(null);
  const viewedJob = rows.find(job => job.jobId === viewedJobId);
  const [name, setName] = useState('');
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [historySchedule, setHistorySchedule] = useState('');
  const [status, setStatus] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const current = schedules.find(item => item.id === selected);
  const scheduleNames = new Map(historySchedules.map(item => [item.id, item.name + (item.deleted_at ? ' · Deleted schedule' : '')]));
  const summaries = useMemo(() => schedules.map(schedule => {
    const jobs = rows.filter(job => job.scheduleId === schedule.id);
    const completed = jobs.filter(job => job.completed).length;
    return { ...schedule, total: jobs.length, completed, remaining: jobs.length - completed, percent: jobs.length ? Math.round(100 * completed / jobs.length) : 0 };
  }), [schedules, rows]);
  const history = useMemo(() => rows.filter(job => {
    if (historySchedule && job.scheduleId !== historySchedule) return false;
    if (status === 'completed' && !job.completed || status === 'remaining' && job.completed) return false;
    if (from && (!job.appointmentDate || job.appointmentDate < from) || to && (!job.appointmentDate || job.appointmentDate > to)) return false;
    return [job.fullName, job.address, job.phone, job.roNumber, job.notes, job.workDescription, job.bodyOfWater, job.completionSignature].join(' ').toLowerCase().includes(query.trim().toLowerCase());
  }).sort((a, b) => (a.appointmentDate || '9999').localeCompare(b.appointmentDate || '9999') || (a.appointmentTimeMinutes ?? 0) - (b.appointmentTimeMinutes ?? 0)), [rows, historySchedule, status, from, to, query]);
  async function save(input) {
    setSaving(true); setError('');
    try {
      const response = await dockFetch('/api/schedules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save schedule.');
      if (input.action === 'create') { onSelect(result.schedule.id); setName(''); setRequestId(crypto.randomUUID()); }
      onRefresh(result.schedule);
    } catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  }
  return <>
    {viewedJob && <DockJobPreview job={viewedJob} scheduleName={scheduleNames.get(viewedJob.scheduleId) || ''} onClose={() => setViewedJobId(null)} />}
    <Group gap="sm" mb="md" align="end">
      <NativeSelect label="Schedule / season" value={selected} onChange={event => onSelect(event.currentTarget.value)} data={[{ value: '', label: 'All schedules' }, ...schedules.map(item => ({ value: item.id, label: item.name + (item.archived ? ' · Archived' : '') }))]} />
      <Button variant="light" onClick={() => setOpened(true)}>Schedules &amp; Job History</Button>
      {current?.archived && <Badge color="gray">Archived schedule</Badge>}
      <Text size="xs" c="dimmed">{current ? 'Showing jobs from this schedule.' : 'Showing jobs across all saved schedules.'}</Text>
    </Group>
    <Modal zIndex={1200} opened={opened} onClose={() => setOpened(false)} title="Schedules & Job History" size="min(1200px, 95vw)" closeButtonProps={{ 'aria-label': 'Close' }}>
      <Stack>
        <Text size="sm" c="dimmed">Start a fresh season without removing previous jobs. Archived schedules stay searchable and can be reopened.</Text>
        <form onSubmit={event => { event.preventDefault(); save({ action: 'create', id: requestId, name }); }}>
          <Group align="end"><TextInput label="New schedule name" placeholder="Spring 2027 installation" value={name} maxLength={120} required disabled={saving} onChange={event => setName(event.currentTarget.value)} style={{ flex: 1 }} /><Button type="submit" loading={saving}>Create schedule</Button></Group>
        </form>
        {error && <Alert color="red" role="alert">{error}</Alert>}
        <Table.ScrollContainer minWidth={650}><Table captionSide="top"><Table.Caption>All-time totals by schedule</Table.Caption><Table.Thead><Table.Tr><Table.Th>Schedule</Table.Th><Table.Th>Total</Table.Th><Table.Th>Completed</Table.Th><Table.Th>Remaining</Table.Th><Table.Th>Progress</Table.Th><Table.Th>Manage</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{summaries.map(item => <Table.Tr key={item.id}><Table.Td><Button variant="subtle" size="compact-sm" onClick={() => { onSelect(item.id); setOpened(false); }}>{item.name}</Button>{item.archived && <Badge size="xs" color="gray">Archived</Badge>}</Table.Td><Table.Td>{item.total}</Table.Td><Table.Td>{item.completed}</Table.Td><Table.Td>{item.remaining}</Table.Td><Table.Td>{item.percent}%</Table.Td><Table.Td><Button size="compact-xs" variant="default" disabled={saving} onClick={() => save({ action: 'archive', id: item.id, archived: !item.archived })}>{item.archived ? 'Reopen' : 'Archive'}</Button></Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer>
        <Paper withBorder p="md"><Stack gap="sm">
          <Text fw={600}>Calendar Agenda &amp; Job History</Text>
          <TextInput label="Search saved jobs" placeholder="Customer, RO#, address, work, notes or signature" value={query} onChange={event => setQuery(event.currentTarget.value)} />
          <SimpleGrid cols={{ base: 1, sm: 4 }}>
            <NativeSelect label="Schedule" value={historySchedule} onChange={event => setHistorySchedule(event.currentTarget.value)} data={[{ value: '', label: 'All schedules' }, ...historySchedules.map(item => ({ value: item.id, label: item.name + (item.deleted_at ? ' · Deleted schedule' : '') }))]} />
            <NativeSelect label="Job status" value={status} onChange={event => setStatus(event.currentTarget.value)} data={[{ value: 'all', label: 'All jobs' }, { value: 'completed', label: 'Completed only' }, { value: 'remaining', label: 'Remaining only' }]} />
            <TextInput label="Appointment from" type="date" value={from} onChange={event => setFrom(event.currentTarget.value)} />
            <TextInput label="Appointment to" type="date" value={to} onChange={event => setTo(event.currentTarget.value)} />
          </SimpleGrid>
          {from && to && from > to && <Text size="sm" c="red">The end date must be on or after the start date.</Text>}
          <Text size="sm" role="status">{history.length} jobs · {history.filter(job => job.completed).length} completed · {history.filter(job => !job.completed).length} remaining</Text>
        </Stack></Paper>
        <Table.ScrollContainer minWidth={850}><Table><Table.Thead><Table.Tr><Table.Th>Appointment</Table.Th><Table.Th>Customer / schedule</Table.Th><Table.Th>Work / location</Table.Th><Table.Th>Completion</Table.Th><Table.Th>View</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{history.map(job => <Table.Tr key={job.jobId}><Table.Td>{job.appointment || 'Unscheduled'}</Table.Td><Table.Td><Group gap={6} wrap="nowrap"><Text fw={600} size="sm">{job.fullName}</Text>{job.photos?.length > 0 && <span role="img" aria-label="Photos attached" title={`${job.photos.length} ${job.photos.length === 1 ? 'photo' : 'photos'} attached`} style={{ display: 'inline-flex', flexShrink: 0, color: 'var(--mantine-primary-color-light-color)' }}><IconPhoto size={15} aria-hidden="true" /></span>}</Group><Text size="xs">{scheduleNames.get(job.scheduleId)}</Text><JobDates job={job} /></Table.Td><Table.Td><Text size="sm">{job.workDescription}</Text><Text size="xs" c="dimmed">{job.address}</Text>{job.notes && <Text size="xs">Notes: {job.notes}</Text>}</Table.Td><Table.Td><Badge color={job.completed ? 'teal' : 'gray'}>{job.completed ? 'Completed' : 'Remaining'}</Badge>{job.completed && <Text size="xs">{job.completionDate || 'Date unavailable'}<br />{job.completionSignature}</Text>}</Table.Td><Table.Td><Stack gap={5}><Button variant="light" size="compact-xs" onClick={() => setViewedJobId(job.jobId)}>View Job</Button>{jobEditUrl(job) && <Button component="a" href={jobEditUrl(job)} target="_blank" rel="noopener noreferrer" size="compact-xs" variant="default">Edit job</Button>}{job.outlook?.webLink && <Button component="a" href={job.outlook.webLink} target="_blank" rel="noopener noreferrer" size="compact-xs" variant="subtle">Outlook event</Button>}<Button color="red" variant="subtle" size="compact-xs" onClick={() => window.schedulerUI.requestDelete(job)}>{job.deletionPending ? 'Retry deletion' : 'Delete job'}</Button></Stack></Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer>
        {!history.length && <Text ta="center" c="dimmed">No saved jobs match these filters.</Text>}
        <Text size="xs" c="dimmed">The agenda shows saved job appointments. New jobs book into the local Marine Ops schedule. Outlook synchronization is disconnected.</Text>
      </Stack>
    </Modal>
  </>;
}
