// @ts-nocheck
// Existing scheduler interface preserved for migration.
import React from 'react';
import { Text } from '@mantine/core';

function timestamp(value) {
  const date = value && new Date(value);
  return date && Number.isFinite(date.getTime()) ? date.toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }) : 'Not available';
}

export function JobDates({ job, details = false }) {
  const dates = job.submittedDates || (job.submittedDate ? [job.submittedDate] : []);
  const fromSheet = job.origin === 'sheet' || dates.length > 0;
  return <div className="job-dates">
    <Text size={details ? 'sm' : 'xs'} c={details ? undefined : 'dimmed'}>{fromSheet ? `Submitted: ${dates.length > 1 ? 'Multiple source dates' : dates[0] || 'Not provided'}` : `Created: ${timestamp(job.createdAt)}`}</Text>
    {details && dates.length > 1 && <Text size="sm">Source submission dates: {dates.join(' · ')}. The original Sheet contains different values; no single submission date has been assumed.</Text>}
    {details && fromSheet && <Text size="sm">Added to scheduler: {timestamp(job.createdAt)}</Text>}
  </div>;
}
