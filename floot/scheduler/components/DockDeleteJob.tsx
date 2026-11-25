// @ts-nocheck
// Existing scheduler interface preserved for migration.
import { dockFetch } from '../helpers/dockFetch';
import React, { useState } from 'react';
import { Alert, Button, Group, Modal, Stack, Text } from '@mantine/core';

export function DeleteJobDialog({ job, onClose, onDeleted }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [requestId] = useState(() => {
    if (job.deletionRequestId) return job.deletionRequestId;
    try { const saved = sessionStorage.getItem(`delete-job-${job.jobId}`); if (saved) return saved; } catch {}
    return crypto.randomUUID();
  });
  async function remove() {
    if (saving) return;
    setSaving(true); setError('');
    try {
      try { sessionStorage.setItem(`delete-job-${job.jobId}`, requestId); } catch {}
      const identity = { jobId: job.jobId, version: job.version, recordKey: job.recordKey };
      const response = await dockFetch('/api/entries', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity, requestId, confirmed: true }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to confirm deletion. Retry Delete job.');
      try {
        sessionStorage.removeItem(`delete-job-${job.jobId}`);
        localStorage.setItem('dockCrewJobUpdated', JSON.stringify({ jobId: job.jobId, deleted: true, at: Date.now() }));
      } catch {}
      onDeleted(job.jobId);
    } catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  }
  const linked = Boolean(job.outlook?.id || job.outlook?.calendarId);
  return <Modal opened onClose={() => { if (!saving) onClose(); }} title="Delete job?" zIndex={1400} centered closeOnClickOutside={false} closeOnEscape={!saving} withCloseButton={!saving} closeButtonProps={{ 'aria-label': 'Close' }}>
    <Stack>
      <Text>Remove this job from the active map and job list? Its stored record remains in exports.</Text>
      <div><Text fw={700}>{job.fullName || 'Customer'}</Text><Text size="sm">{job.appointment || 'Unscheduled'}</Text><Text size="sm" c="dimmed">{job.address || job.rawAddress}</Text></div>
      <Alert role="note" color={linked ? 'orange' : 'blue'}>
        Staging only: this removes the local job. Historical Outlook events are unchanged; no notifications are sent.
      </Alert>
      {job.deletionPending && <Text size="sm">A previous deletion needs to be finished. Retry to complete it.</Text>}
      {error && <Alert color="red" role="alert">{error}</Alert>}
      <Group justify="flex-end"><Button variant="default" onClick={onClose} disabled={saving} data-autofocus>Cancel</Button><Button color="red" onClick={remove} loading={saving}>{error || job.deletionPending ? 'Retry deletion' : 'Delete job'}</Button></Group>
    </Stack>
  </Modal>;
}
