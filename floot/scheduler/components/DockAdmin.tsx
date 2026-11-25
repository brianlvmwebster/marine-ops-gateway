// @ts-nocheck
// Existing scheduler interface preserved for migration.
import { DockOutlookHours } from './DockOutlookHours';

import { dockFetch } from '../helpers/dockFetch';
import React, { useState } from 'react';
import { Alert, Badge, Button, Checkbox, Group, Modal, Paper, Stack, Text, TextInput } from '@mantine/core';
import { IconSettings, IconTrash } from '@tabler/icons-react';

export function AdminArea({ schedules, rows, onSaved, onDeleted }) {
  const [opened, setOpened] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function change(schedule, remove = false, newName, calendarConfig) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const payload = calendarConfig ? { action: 'calendar', id: schedule.id, ...calendarConfig } : remove ? { id: schedule.id, confirmed: true } : newName !== undefined ? { action: 'rename', id: schedule.id, name: newName } : { action: 'archive', id: schedule.id, archived: !schedule.archived };
      const response = await dockFetch(calendarConfig?.action === 'availability' ? '/api/outlook_settings' : '/api/schedules', { method: remove ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(calendarConfig?.action === 'availability' ? {id:schedule.id,bookingWindow:calendarConfig.bookingWindow} : payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update this schedule.');
      if (remove) { onDeleted(result.schedule); setDeleting(null); } else onSaved(result.schedule);
      if (newName !== undefined) setRenaming(null);
      try { localStorage.setItem('dockCrewJobUpdated', JSON.stringify({ scheduleId: schedule.id, at: Date.now() })); } catch {}
      return true;
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <>
    <Button variant="default" size="compact-sm" leftSection={<IconSettings size={15} />} onClick={() => { setError(''); setRenaming(null); setOpened(true); }}>Settings</Button>
    <Modal opened={opened} onClose={() => { if (!busy) { setOpened(false); setError(''); setRenaming(null); } }} title="Settings · Schedules" size="lg" zIndex={1200} closeButtonProps={{ 'aria-label': 'Close' }}>
      <Stack>
        <Text size="sm" c="dimmed">Manage schedules using your Marine Ops access. Archive a schedule when it is no longer in use. Deleting an archived schedule removes it from scheduling menus while keeping its jobs in history.</Text>
        {error && !deleting && <Alert color="red" role="alert">{error}</Alert>}
        {schedules.map(schedule => {
          const jobs = rows.filter(job => job.scheduleId === schedule.id);
          const completed = jobs.filter(job => job.completed).length;
          return <Paper component="article" aria-label={schedule.name} key={schedule.id} withBorder p="md" radius="md">
            <Stack gap="sm">
              <Group justify="space-between"><Text fw={650}>{schedule.name}</Text><Badge color={schedule.archived ? 'gray' : 'teal'}>{schedule.archived ? 'Archived' : 'Active'}</Badge></Group>
              <Text size="sm" c="dimmed">{jobs.length} jobs · {completed} completed · {jobs.length - completed} remaining</Text>
              <ScheduleCalendar key={`${schedule.id}:${schedule.name}:${schedule.outlook_calendar_name || ''}:${JSON.stringify(schedule.booking_window)}`} schedule={schedule} disabled={busy || Boolean(renaming)} onSave={calendarConfig => change(schedule, false, undefined, calendarConfig)} />
              {renaming?.id === schedule.id && <form onSubmit={event => { event.preventDefault(); change(schedule, false, name); }}><Stack gap="sm">
                <TextInput label="Schedule name" value={name} onChange={event => setName(event.currentTarget.value)} maxLength={120} required disabled={busy} autoFocus />
                <Group gap="sm"><Button type="submit" size="xs" loading={busy} disabled={!name.trim()}>Save name</Button><Button type="button" size="xs" variant="default" disabled={busy} onClick={() => { setRenaming(null); setError(''); }}>Cancel rename</Button></Group>
              </Stack></form>}
              <Group gap="sm"><Button variant="default" size="xs" disabled={busy || Boolean(renaming)} onClick={() => { setError(''); setName(schedule.name); setRenaming(schedule); }}>Rename</Button><Button variant="default" size="xs" disabled={busy || Boolean(renaming)} onClick={() => change(schedule)}>{schedule.archived ? 'Reopen schedule' : 'Archive schedule'}</Button><Button color="red" variant="light" size="xs" leftSection={<IconTrash size={14} />} disabled={busy || Boolean(renaming) || !schedule.archived} onClick={() => { setError(''); setDeleting(schedule); }}>Delete schedule</Button></Group>
              {!schedule.archived && <Text size="xs" c="dimmed">Archive this schedule before deleting it.</Text>}
            </Stack>
          </Paper>;
        })}
        {!schedules.length && <Text size="sm">No schedules to manage. Create one in Schedules &amp; Job History.</Text>}
      </Stack>
    </Modal>
    <Modal opened={Boolean(deleting)} onClose={() => { if (!busy) { setDeleting(null); setError(''); } }} title="Delete schedule?" centered zIndex={1300} closeOnClickOutside={false} closeOnEscape={!busy} withCloseButton={!busy} closeButtonProps={{ 'aria-label': 'Close' }}>
      {deleting && <Stack>
        <Text fw={700}>{deleting.name}</Text>
        <Text>Remove this archived schedule from the schedule selector and admin list?</Text>
        <Alert color="blue" role="note">Saved jobs, photos, and completion records remain available in Schedules &amp; Job History. Outlook appointments are unchanged.</Alert>
        {error && <Alert color="red" role="alert">{error}</Alert>}
        <Group justify="flex-end"><Button variant="default" disabled={busy} data-autofocus onClick={() => { setDeleting(null); setError(''); }}>Cancel</Button><Button color="red" loading={busy} onClick={() => change(deleting, true)}>Delete schedule</Button></Group>
      </Stack>}
    </Modal>
  </>;
}

function ScheduleCalendar({schedule,disabled,onSave}) {return <Stack gap="xs"><Text size="sm">Local appointment hours. Outlook is disconnected.</Text><DockOutlookHours value={schedule.booking_window} disabled={disabled||schedule.archived} onSave={onSave}/></Stack>;}
