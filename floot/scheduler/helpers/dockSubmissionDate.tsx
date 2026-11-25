// @ts-nocheck
// Migrated from submission-date.js; source behavior retained.
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
dayjs.extend(utc); dayjs.extend(timezone); dayjs.extend(customParseFormat);

const dates = ['YYYY-MM-DD', 'M/D/YYYY', 'MM/DD/YYYY', 'M/DD/YYYY', 'MM/D/YYYY', 'MMM D, YYYY', 'MMM DD, YYYY', 'MMMM D, YYYY', 'MMMM DD, YYYY'];
const formats = dates.flatMap(date => [' h:mm:ss A', ' hh:mm:ss A', ' h:mm A', ' hh:mm A', ' H:mm:ss', ' HH:mm:ss', ' H:mm', ' HH:mm', ''].map(time => date + time));
const parsedDates = new Map();

export function submissionTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  if (parsedDates.has(value)) return parsedDates.get(value);
  const result = parseTimestamp(value);
  if (parsedDates.size >= 5000) parsedDates.clear();
  parsedDates.set(value, result);
  return result;
}

function parseTimestamp(value) {
  const input = value.trim().replace(/\b(am|pm)\b/gi, part => part.toUpperCase());
  if (/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/i.test(input)) {
    const parsed = Date.parse(input);
    return dayjs(input.slice(0, 10), 'YYYY-MM-DD', true).isValid() && Number.isFinite(parsed) ? parsed : null;
  }
  const local = input.replace(/^(\d{4}-\d{2}-\d{2})T/, '$1 ');
  const format = formats.find(format => dayjs(local, format, true).isValid());
  if (!format) return null;
  const parsed = dayjs.tz(local, format, 'America/New_York');
  return parsed.isValid() ? parsed.valueOf() : null;
}

export function submittedTime(job) {
  if (job.origin === 'app') return submissionTimestamp(job.createdAt);
  const values = job.submittedDates || (job.submittedDate ? [job.submittedDate] : []);
  const times = values.map(submissionTimestamp);
  return times.length && times.every(time => time !== null && time === times[0]) ? times[0] : null;
}

export function compareSubmissionDates(a, b) {
  const left = submittedTime(a), right = submittedTime(b);
  if (left !== right) {
    if (left === null) return 1;
    if (right === null) return -1;
    return right - left;
  }
  return String(a.lastName || '').localeCompare(String(b.lastName || ''), 'en', { sensitivity: 'base' }) || String(a.fullName || '').localeCompare(String(b.fullName || ''), 'en', { sensitivity: 'base' }) || String(a.jobId || a.rowNumber || '').localeCompare(String(b.jobId || b.rowNumber || ''));
}
