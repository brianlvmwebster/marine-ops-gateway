// @ts-nocheck
// Existing scheduler interface preserved for migration.
import {DockAppointmentTitle} from './DockAppointmentTitle';
import {defaultAppointmentTitle} from '../helpers/dockAppointmentTitle';
import { dockBookingWindow, dockBookingDayAllowed, dockBookingWindowLabel } from '../helpers/dockBookingWindow';
import { dockFetch } from '../helpers/dockFetch';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Alert, Anchor, Badge, Button, Container, Divider, Group, Loader, Modal, NativeSelect, Paper, PasswordInput, SimpleGrid, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconArrowLeft, IconCalendar, IconCheck } from '@tabler/icons-react';
import { Provider, setAppTheme } from './DockTheme';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { AddressInput } from './DockAddressInput';
import { WaterbodyInput } from './DockWaterbodyInput';
import { applyAddress, updateAddressField } from './DockWaterbodyDraft';

const editId = new URLSearchParams(window.location.search).get('jobId');
const editMode = editId !== null;
const requestedSchedule = (() => {
  const query = new URLSearchParams(window.location.search);
  if (query.get('scheduleId')) return query.get('scheduleId');
  try { return query.get('outlook') === 'connected' ? sessionStorage.getItem('lakeview-outlook-schedule') || '' : ''; }
  catch { return ''; }
})();
const draftKey = editMode ? `lakeview-edit-job-${editId}` : (requestedSchedule ? `lakeview-new-job-${requestedSchedule}` : 'lakeview-new-job');
const empty = { firstName: '', lastName: '', phone: '', roNumber: '', street: '', city: '', state: 'MA', zip: '', bodyOfWater: '', workDescription: '', notes: '' };
function initialDraft() {
  try { const saved = JSON.parse(sessionStorage.getItem(draftKey)); if (saved?.requestId) return { ...saved, scheduleId: saved.scheduleId || requestedSchedule || '00000000-0000-4000-8000-000000000001' }; } catch {}
  return { ...empty, scheduleId: requestedSchedule, requestId: crypto.randomUUID(), date: null, duration: '120', start: null, appointmentLabel: '', time: '' };
}

export function DockNewJob() {
  const [draft, setDraft] = useState(initialDraft);
  const [originalJob, setOriginalJob] = useState(null);
  const [recordLoaded, setRecordLoaded] = useState(!editMode);
  const [conflict, setConflict] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [connection, setConnection] = useState(null);
  const [slots, setSlots] = useState([]);
  const [checkedAt, setCheckedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addressResolving, setAddressResolving] = useState(false);
  const [waters, setWaters] = useState([]);
  const [watersLoading, setWatersLoading] = useState(false);
  const [watersError, setWatersError] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [locked, setLocked] = useState(() => Boolean(draft.submissionLocked));
  const [error, setError] = useState('');
  const [calendarError, setCalendarError] = useState('');
  const [success, setSuccess] = useState(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [password, setPassword] = useState('');
  const [signInError, setSignInError] = useState('');
  const refreshAvailability = useRef(() => {});
  const connectionRevision = useRef(0);
  const setField = (key, value) => setDraft(previous => ['street', 'city', 'state', 'zip'].includes(key) ? updateAddressField(previous, key, value) : { ...previous, [key]: value });

  const request = useCallback(async (url, options = {}) => {
    const response = await dockFetch(url, { cache: 'no-store', ...options });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401) setNeedsSignIn(true);
      const error = new Error(result.error || 'Unable to complete this request.');
      error.status = response.status;
      throw error;
    }
    return result;
  }, []);
  const loadWaters = useCallback(async () => {
    setWatersLoading(true); setWatersError(false);
    try { setWaters((await request('/api/waterbodies')).waterbodies); }
    catch { setWatersError(true); }
    finally { setWatersLoading(false); }
  }, [request]);
  const loadSchedules = useCallback(async () => {
    try {
      const result = await request('/api/schedules');
      setSchedules(result.schedules);
      setError('');
      setDraft(previous => previous.scheduleId ? previous : { ...previous, scheduleId: result.schedules.find(item => !item.archived)?.id || '' });
    } catch (failure) { setError(failure.message); }
  }, [request]);
  const checkConnection = useCallback(async () => {
    const revision = ++connectionRevision.current;
    setConnection(null); setCalendarError('');
    if (!draft.scheduleId) return;
    try {
      const result = await request(`/api/calendar?scheduleId=${encodeURIComponent(draft.scheduleId)}`);
      if (revision === connectionRevision.current) setConnection({ ...result, scheduleId: draft.scheduleId });
    } catch (failure) { if (revision === connectionRevision.current) setCalendarError(failure.message); }
  }, [request, draft.scheduleId]);
  const loadEdit = useCallback(async (replaceDraft = false) => {
    if (!editMode) return;
    if (replaceDraft) setRecordLoaded(false);
    setError(''); setConflict(false);
    try {
      const result = await request(`/api/entries?jobId=${encodeURIComponent(editId)}`);
      setOriginalJob(result.job);
      setDraft(previous => !replaceDraft && previous.loadedJobId === editId ? previous : {
        ...empty, ...result.fields, requestId: crypto.randomUUID(), loadedJobId: editId,
        identity: { jobId: result.job.jobId, version: result.job.version, recordKey: result.job.recordKey, rowNumber: result.job.rowNumber, submissionId: result.job.submissionId },
        duration: '120', start: null,
      });
      if (replaceDraft) setLocked(false);
      setRecordLoaded(true);
    } catch (failure) { setError(failure.message); }
  }, [request]);
  useEffect(() => {
    document.title = editMode ? 'Edit job · Lakeview Dock Crew' : 'Add a job · Lakeview Dock Crew';
    loadWaters();
    if (editMode) loadEdit(); else { checkConnection(); loadSchedules(); }
  }, [checkConnection, loadEdit, loadSchedules, loadWaters]);

  useEffect(() => {
    setSlots([]);
    setCheckedAt(null);
    if (editMode || !connection?.connected || !draft.date || locked) return;
    let active = true;
    let pending = false;
    const controller = new AbortController();
    async function refresh() {
      if (pending) return;
      pending = true;
      setLoading(true);
      try {
        const query = new URLSearchParams({ action: 'availability', scheduleId: draft.scheduleId, date: draft.date, duration: draft.duration });
        const result = await request(`/api/calendar?${query}`, { signal: controller.signal });
        if (!active) return;
        if (result.bookingWindow) setConnection(previous => ({...previous,bookingWindow:result.bookingWindow}));
        setSlots(result.slots); setCheckedAt(result.checkedAt); setCalendarError('');
        setDraft(previous => result.slots.some(slot => slot.start === previous.start) ? previous : { ...previous, start: null });
      } catch (failure) {
        if (active) { setCalendarError(failure.message); setSlots([]); setDraft(previous => ({ ...previous, start: null })); if (failure.status === 424) setConnection(previous => ({ ...previous, connected: false })); }
      } finally { pending = false; if (active) setLoading(false); }
    }
    refreshAvailability.current = refresh;
    refresh();
    // Refresh availability while the form is open; save rechecks it transactionally.
    const interval = setInterval(refresh, 20000);
    window.addEventListener('focus', refresh);
    return () => { active = false; controller.abort(); clearInterval(interval); window.removeEventListener('focus', refresh); refreshAvailability.current = () => {}; };
  }, [draft.date, draft.duration, draft.scheduleId, connection?.connected, locked, request]);

  async function connect() {
    if (connecting) return;
    setConnecting(true);
    setCalendarError('');
    try { sessionStorage.setItem('lakeview-outlook-schedule', requestedSchedule); } catch {}
    try { const result = await request('/api/calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); if (!result.url) throw new Error('Calendar connection is unavailable here.'); window.location.assign(result.url); }
    catch (failure) { setCalendarError(failure.message); }
    finally { setConnecting(false); }
  }
  async function signIn(event) {
    event.preventDefault(); setSaving(true); setSignInError('');
    try {
      await request('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      setNeedsSignIn(false); setPassword(''); loadWaters(); if (editMode) await loadEdit(); else { await checkConnection(); await loadSchedules(); }
    } catch (failure) { setSignInError(failure.message); }
    finally { setSaving(false); }
  }
  async function submit(event) {
    event.preventDefault();
    if (saving || addressResolving) return;
    setSaving(true); setError(''); setLocked(true);
    try {
      const result = await request('/api/entries', { method: editMode ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editMode ? { identity: draft.identity, requestId: draft.requestId, fields: draft } : { ...draft, appointmentTitle: draft.appointmentTitle ?? defaultAppointmentTitle(schedules.find(item=>item.id===draft.scheduleId)?.name || '',draft.lastName), calendarName: connection?.name, duration: Number(draft.duration) }) });
      sessionStorage.removeItem(draftKey); setSuccess(result);
      try { localStorage.setItem('dockCrewJobUpdated', JSON.stringify({ jobId: result.job.jobId, at: Date.now() })); } catch {}
    } catch (failure) {
      setError(failure.message);
      if (failure.status === 424) setConnection(previous => ({ ...previous, connected: false }));
      if (editMode && failure.status === 409) setConflict(true);
      if ([400, 401, 409, 424].includes(failure.status)) { setLocked(false); if (!editMode && failure.status === 409) setField('start', null); }
    } finally { setSaving(false); }
  }
  const bookingWindow = dockBookingWindow(connection?.bookingWindow || schedules.find(item=>item.id===draft.scheduleId)?.booking_window);
  const allowedDate = !draft.date || dockBookingDayAllowed(draft.date, bookingWindow);
  const ready = !addressResolving && (editMode ? recordLoaded && !conflict : schedules.some(item => item.id === draft.scheduleId && !item.archived) && connection?.connected && allowedDate && draft.start && checkedAt && !loading);
  const input = (key, label, required = false, options = {}) => <TextInput label={label} value={draft[key]} onChange={event => setField(key, event.currentTarget.value)} required={required && !editMode} {...options} />;
  return <>
    <header className="entry-header"><Container size="lg"><Group justify="space-between"><Group gap="sm" wrap="nowrap"><img className="header-logo" src="/scheduler-assets/lakeview-logo.png" alt="Lakeview Marine Dock & Lift Services" width="117" height="78" /><div><Text size="xs" c="lakeview" fw={700} tt="uppercase">Lakeview Marine</Text><Title order={1} size="h3">{editMode ? 'Edit crew job' : 'Add a crew job'}</Title></div></Group><Button component="a" href="/dockscheduler" variant="default" leftSection={<IconArrowLeft size={14} />}>Scheduler</Button></Group></Container></header>
    <Container size="lg" py="xl">
      {success ? <Paper withBorder p="xl" radius="lg"><Stack align="flex-start"><Badge color="teal" leftSection={<IconCheck size={12} />}>Saved</Badge><Title order={2}>{editMode ? 'Job changes saved' : 'Job and appointment saved'}</Title><Text>{success.job.fullName} {editMode ? 'has been updated.' : 'is now in the scheduler.'}</Text><Group><Button component="a" href="/dockscheduler">View scheduler</Button>{success.eventUrl && <Button component="a" href={success.eventUrl} target="_blank" rel="noopener noreferrer" variant="light">Open Outlook event</Button>}{editMode ? <Button variant="default" onClick={() => { setSuccess(null); setLocked(false); loadEdit(true); }}>Continue editing</Button> : <Button variant="default" onClick={() => { setDraft({ ...empty, scheduleId: draft.scheduleId, requestId: crypto.randomUUID(), date: null, duration: '120', start: null }); setLocked(false); setSuccess(null); }}>Add another job</Button>}</Group></Stack></Paper> : <>
        <Text c="dimmed" mb="lg">{editMode ? 'Update this job’s details and save your changes.' : 'Enter the customer and work details, then choose an available time in the local schedule.'}</Text>
        {!editMode && schedules.find(item => item.id === draft.scheduleId)?.archived && <Alert color="orange" mb="md">This schedule is archived. Choose an open schedule below, or reopen this schedule from the scheduler before booking.</Alert>}
        {editMode && !recordLoaded && !error && <Group mb="md"><Loader size="xs" /><Text size="sm">Loading job…</Text></Group>}
        <form onSubmit={submit}>
          <div className="entry-columns">
            <Paper withBorder p="lg" radius="lg"><Stack gap="md"><Title order={2} size="h4">Customer &amp; job details</Title><fieldset disabled={locked || saving || !recordLoaded} className="entry-fieldset"><Stack gap="md">
              {!editMode && <NativeSelect label="Schedule / season" value={draft.scheduleId || ''} onChange={event => setField('scheduleId', event.currentTarget.value)} required data={[{ value: '', label: 'Choose a schedule', disabled: true }, ...schedules.map(item => ({ value: item.id, label: item.name + (item.archived ? ' · Archived' : ''), disabled: item.archived }))]} />}
              <SimpleGrid cols={{ base: 1, xs: 2 }}>{input('firstName', 'First name', true, { maxLength: 100, autoComplete: 'given-name' })}{input('lastName', 'Last name', true, { maxLength: 100, autoComplete: 'family-name' })}{input('phone', 'Contact phone', false, { type: 'tel', maxLength: 50 })}{input('roNumber', 'RO number', false, { maxLength: 100 })}</SimpleGrid>
              <Divider label="Job location" labelPosition="left" />
              <AddressInput value={draft.street} onChange={value => setField('street', value)} onSelect={(address, match) => setDraft(previous => applyAddress(previous, address, match))} onResolving={setAddressResolving} request={request} disabled={locked || saving || !recordLoaded} required={!editMode} />
              <SimpleGrid cols={{ base: 1, xs: 3 }}>{input('city', 'Town / city', true, { autoComplete: 'address-level2', maxLength: 100 })}{input('state', 'State', true, { autoComplete: 'address-level1', maxLength: 50 })}{input('zip', 'ZIP code', false, { autoComplete: 'postal-code', maxLength: 20 })}</SimpleGrid>
              <WaterbodyInput draft={draft} setDraft={setDraft} waters={waters} loading={watersLoading} error={watersError} onRetry={loadWaters} disabled={locked || saving || !recordLoaded} required={!editMode} />
              <Textarea label="Description of work" value={draft.workDescription} onChange={event => setField('workDescription', event.currentTarget.value)} required={!editMode} minRows={3} maxLength={4000} />
              <Textarea label="Crew notes" value={draft.notes} onChange={event => setField('notes', event.currentTarget.value)} minRows={3} maxLength={20000} />
            </Stack></fieldset></Stack></Paper>
            <Stack gap="md">
              {editMode ? <EditAppointment draft={draft} setDraft={setDraft} job={originalJob} disabled={locked || saving || !recordLoaded} /> : <>
              <Paper withBorder p="lg" radius="lg"><Stack gap="md"><Group justify="space-between"><Title order={2} size="h4">Appointment</Title><Badge color={connection?.connected ? 'teal' : 'gray'} variant="light">{connection?.connected ? 'Local scheduling' : 'Loading schedule'}</Badge></Group>
                <div><Text fw={600} size="sm">Schedule: {connection?.name || schedules.find(item => item.id === draft.scheduleId)?.outlook_calendar_name || schedules.find(item => item.id === draft.scheduleId)?.name || 'Choose a schedule'}</Text><Text c="dimmed" size="xs">{connection?.mailbox || 'Marine Ops local schedule'} · Eastern time</Text></div>
                {!connection?.connected && <Alert color="blue" title="Local schedule status"><Text size="sm">{connection?.message || 'Loading local appointment availability. Outlook remains disconnected.'}</Text><Button mt="sm" ml="xs" size="xs" variant="subtle" onClick={checkConnection}>Check connection</Button></Alert>}
                {connection?.signInMailbox && connection.signInMailbox !== connection.mailbox && <Text size="xs" c="dimmed">Shared mailbox access through {connection.signInMailbox}.</Text>}
                <TextInput label="Appointment title" description="Defaults to DC-[Schedule Name]-[LastName]. You can customize it." value={draft.appointmentTitle ?? defaultAppointmentTitle(schedules.find(item=>item.id===draft.scheduleId)?.name || '',draft.lastName)} onChange={event=>setField('appointmentTitle',event.currentTarget.value)} maxLength={255} required disabled={locked||saving}/>
                <Button type="button" variant="subtle" size="xs" disabled={locked||saving} onClick={()=>setField('appointmentTitle',undefined)}>Use default title</Button>
                <DatePickerInput excludeDate={date=>!dockBookingDayAllowed(date,bookingWindow)} label="Appointment date" placeholder="Choose a date" value={draft.date} onChange={date => { setField('date', date); setField('start', null); }} minDate={new Date()} valueFormat="ddd, MMM D, YYYY" leftSection={<IconCalendar size={15} />} disabled={locked || saving} required clearable />
                <NativeSelect label="Job duration" value={draft.duration} disabled={locked || saving} onChange={event => { setField('duration', event.currentTarget.value); setField('start', null); }} data={[{ value: '30', label: '30 minutes' }, { value: '60', label: '1 hour' }, { value: '90', label: '1½ hours' }, { value: '120', label: '2 hours' }, { value: '180', label: '3 hours' }, { value: '240', label: '4 hours' }, { value: '480', label: '8 hours' }]} />
                <Group justify="space-between"><Text size="sm" fw={600}>Available times</Text><Button variant="subtle" size="compact-xs" disabled={!connection?.connected || !draft.date || loading || locked} onClick={() => refreshAvailability.current()}>Refresh</Button></Group>
                {loading && <Group gap="xs"><Loader size="xs" /><Text size="sm" c="dimmed">Checking local schedule…</Text></Group>}
                {!draft.date && <Text size="sm" c="dimmed">Choose a date to see available times.</Text>}
                {draft.date && connection?.connected && !loading && !slots.length && !calendarError && <Text size="sm" c="dimmed">No open times for this duration. Try another date or a shorter visit.</Text>}
                <div className="time-slots" role="group" aria-label="Available appointment times">{slots.map(slot => <Button key={slot.start} variant={draft.start === slot.start ? 'filled' : 'default'} size="xs" aria-pressed={draft.start === slot.start} disabled={locked || saving} onClick={() => setField('start', slot.start)}>{slot.label}</Button>)}</div>
                {checkedAt && <Text size="xs" c="dimmed">Checked {new Date(checkedAt).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', second: '2-digit' })} ET · updates every 20 seconds</Text>}
                {draft.start && <Text size="sm" fw={600}>Selected: {new Date(draft.start).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} ET</Text>}
                <Text size="xs" c="dimmed">{dockBookingWindowLabel(bookingWindow)}. Starts are offered every half hour. We’ll check these settings and availability again when you save.</Text>
                {!allowedDate && <Alert color="orange">This weekday is no longer available. Choose another date.</Alert>}
              </Stack></Paper>
              </>}
              {calendarError && <Alert color="orange" title="Calendar status">{calendarError}</Alert>}
              {error && <Alert color="red" title="Job not confirmed" role="alert">{error}{locked && <Text size="sm" mt="xs">Your details are kept for a retry. Use the same submission to finish saving.</Text>}{editMode && (conflict || !recordLoaded) && <><Text size="xs" mt="xs">Reloading replaces this draft with the latest saved values.</Text><Button variant="light" mt="sm" onClick={() => loadEdit(true)}>Reload latest job</Button></>}</Alert>}
              <Button size="md" type="submit" loading={saving} disabled={locked ? saving : !ready}>{locked && !saving ? 'Retry this submission' : editMode ? 'Save changes' : 'Add job'}</Button>
              <Text size="xs" c="dimmed">{editMode ? 'Saves changes to this job. Photos and completion signatures are retained.' : 'Saves this appointment in Marine Ops only. Outlook remains disconnected.'}</Text>
            </Stack>
          </div>
        </form>
      </>}
      <Group justify="space-between" mt="xl"><Anchor href="/dockscheduler" size="sm">Back to scheduler</Anchor><Button variant="subtle" color="gray" size="compact-xs" onClick={() => setAppTheme(document.body.classList.contains('dark') ? 'light' : 'dark')}>Switch theme</Button></Group>
    </Container>
    <Modal opened={needsSignIn} onClose={() => {}} withCloseButton={false} closeOnClickOutside={false} closeOnEscape={false} title="Crew sign in" centered><form onSubmit={signIn}><Stack><PasswordInput label="Crew password" value={password} onChange={event => setPassword(event.currentTarget.value)} autoComplete="current-password" required />{signInError && <Alert color="red">{signInError}</Alert>}<Button type="submit" loading={saving}>Sign in</Button></Stack></form></Modal>
  </>;
}

function EditAppointment({ draft, setDraft, job, disabled }) {
  const setSchedule = (date, time) => {
    let appointmentLabel = '';
    if (date) {
      const value = new Date(`${date}T${time || '12:00'}:00`);
      appointmentLabel = value.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      if (time) appointmentLabel += ' ' + value.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    setDraft(previous => ({ ...previous, date, time, appointmentLabel }));
  };
  return <Paper withBorder p="lg" radius="lg"><Stack gap="md">
    <Group justify="space-between"><Title order={2} size="h4">Appointment</Title><Badge variant="light" color={job?.completed ? 'teal' : 'lakeview'}>{job?.completed ? 'Completed job' : 'Existing job'}</Badge></Group>
    {job?.outlook?.id&&<DockAppointmentTitle job={job} disabled={disabled}/>}
    <TextInput label="Appointment" description="Keep the original wording, or choose a date and time below." value={draft.appointmentLabel || ''} disabled={disabled} maxLength={500} onChange={event => { const appointmentLabel = event.currentTarget.value; setDraft(previous => ({ ...previous, appointmentLabel, date: null, time: '' })); }} />
    <DatePickerInput label="Appointment date" placeholder="Choose a date" value={draft.date} disabled={disabled} clearable valueFormat="ddd, MMM D, YYYY" leftSection={<IconCalendar size={15} />} onChange={date => setSchedule(date, draft.time || '')} />
    <TextInput label="Appointment time" type="time" value={draft.time || ''} disabled={disabled || !draft.date} onChange={event => setSchedule(draft.date, event.currentTarget.value)} />
    {job?.outlook?.webLink && <Alert color="blue" title="Linked Outlook event"><Text size="sm">Outlook synchronization is disabled in staging. Date and time fields update the scheduler record only; manage event timing in Outlook.</Text><Button component="a" href={job.outlook.webLink} target="_blank" rel="noopener noreferrer" variant="light" size="xs" mt="sm">Open Outlook event</Button></Alert>}
  </Stack></Paper>;
}


