// @ts-nocheck
// Migrated from job-metadata.js; source behavior retained.
const dateHeader = value => /^(date submitted|submission date)$/.test(String(value).trim().replace(/\s+/g, ' ').toLowerCase());
const text = value => value == null ? '' : String(value).trim();

export function submissionDates(source = {}, headers = [], values = []) {
  const original = Array.isArray(headers) && Array.isArray(values) ? headers.flatMap((header, index) => dateHeader(header) && text(values[index]) ? [text(values[index])] : []) : [];
  const mapped = Object.entries(source).flatMap(([header, value]) => dateHeader(header) && text(value) ? [text(value)] : []);
  return [...new Set(original.length ? original : mapped)];
}

export function recordMetadata(row, importHeaders = []) {
  const dates = submissionDates(row.data, row.source_headers || importHeaders, row.original_values);
  const timestamp = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toISOString() : null;
  return { origin: row.source_key?.startsWith('app:') ? 'app' : 'sheet', submittedDates: dates, submittedDate: dates.length === 1 ? dates[0] : null, createdAt: timestamp(row.created_at), updatedAt: timestamp(row.updated_at) };
}

export function jobEditUrl(job) {
  // Floot owns these migrated records; edit UUID-backed jobs in its own form.
  if (job.jobId) return `/dockscheduler/add-job?jobId=${encodeURIComponent(job.jobId)}`;
  if (job.origin === 'app' || (!job.origin && job.jobId && !job.submissionEditUrl)) return job.jobId ? `/dockscheduler/add-job?jobId=${encodeURIComponent(job.jobId)}` : null;
  try {
    const url = new URL(job.submissionEditUrl);
    if (url.protocol === 'http:' && /(^|\.)jotform\.com$/i.test(url.hostname)) url.protocol = 'https:';
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch { /* Older Sheet rows can lack a usable edit URL. */ }
  // Jotform documents this URL format for an existing submission ID.
  const id = text(job.submissionId);
  return /^\d{10,30}$/.test(id) ? `https://www.jotform.com/edit/${id}` : null;
}

