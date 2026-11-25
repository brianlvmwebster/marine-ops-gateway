// @ts-nocheck
// Migrated from schedules.js; source behavior retained.
import { randomUUID } from 'node:crypto';
import { recordDb, requireRecordStore } from './dockRecordDb';
import { AppError } from './dockErrors';

export const DEFAULT_SCHEDULE = '00000000-0000-4000-8000-000000000001';
export function scheduleId(value) {
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value || '')) throw new AppError('Choose a valid schedule.');
  return value.toLowerCase();
}
export function scheduleName(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 120 || /[\x00-\x1f]/.test(value)) throw new AppError('Enter a schedule name of 1–120 characters on one line.');
  return value.trim();
}
export async function listSchedules(sql = recordDb(), { includeDeleted = false } = {}) {
  await requireRecordStore(sql);
  if (includeDeleted) return sql`SELECT id, name, archived, created_at, deleted_at, outlook_calendar_name, booking_window FROM scheduler_schedules ORDER BY created_at, id`;
  return sql`SELECT id, name, archived, created_at, deleted_at, outlook_calendar_name, booking_window FROM scheduler_schedules WHERE deleted_at IS NULL ORDER BY created_at, id`;
}
export async function requireOpenSchedule(id, sql = recordDb()) {
  id = scheduleId(id);
  const [row] = await sql`SELECT id, name, archived, deleted_at, outlook_calendar_name, booking_window FROM scheduler_schedules WHERE id = ${id}::uuid`;
  if (!row || row.deleted_at) throw new AppError('This schedule no longer exists. Refresh the scheduler.', 404);
  if (row.archived) throw new AppError('This schedule is archived. Reopen it before adding jobs.', 409);
  return row;
}
export async function saveSchedule(input, sql = recordDb()) {
  await requireRecordStore(sql);
  const id = scheduleId(input?.id || randomUUID());
  if (input?.action === 'create') {
    const name = scheduleName(input.name);
    const rows = await sql`INSERT INTO scheduler_schedules (id, name) VALUES (${id}::uuid, ${name}) ON CONFLICT (id) DO NOTHING RETURNING *`;
    const row = rows[0] || (await sql`SELECT * FROM scheduler_schedules WHERE id = ${id}::uuid`)[0];
    if (row.deleted_at) throw new AppError('This schedule was deleted. Create a new schedule with a new reference.', 410);
    if (row.name !== name) throw new AppError('This schedule reference is already in use. Reload and try again.', 409);
    return row;
  }
  if (input?.action === 'rename') {
    const name = scheduleName(input.name);
    const existingId = scheduleId(input.id);
    const [row] = await sql`UPDATE scheduler_schedules SET name = ${name} WHERE id = ${existingId}::uuid AND deleted_at IS NULL RETURNING *`;
    if (!row) throw new AppError('Schedule not found.', 404);
    return row;
  }
  if (input?.action === 'calendar') {
    const name = input.override === false ? null : input.override === true ? scheduleName(input.calendarName) : undefined;
    if (name === undefined) throw new AppError('Choose whether to override the Outlook calendar name.');
    const existingId = scheduleId(input.id);
    const [row] = await sql`UPDATE scheduler_schedules SET outlook_calendar_name = ${name} WHERE id = ${existingId}::uuid AND deleted_at IS NULL RETURNING *`;
    if (!row) throw new AppError('Schedule not found.', 404);
    return row;
  }
  if (input?.action !== 'archive' || typeof input.archived !== 'boolean') throw new AppError('Invalid schedule action.');
  const [row] = await sql`UPDATE scheduler_schedules SET archived = ${input.archived} WHERE id = ${id}::uuid AND deleted_at IS NULL RETURNING *`;
  if (!row) throw new AppError('Schedule not found.', 404);
  return row;
}

export async function deleteSchedule(input, sql) {
  if (input?.confirmed !== true) throw new AppError('Confirm Delete schedule before deleting.');
  const id = scheduleId(input.id);
  sql ||= recordDb();
  await requireRecordStore(sql);
  // Retain the schedule and job references for history and exports. Recheck
  // archived state inside the write to handle concurrent reopening safely.
  const [deleted] = await sql`UPDATE scheduler_schedules SET deleted_at = now() WHERE id = ${id}::uuid AND archived = true AND deleted_at IS NULL RETURNING *`;
  if (deleted) return { schedule: deleted, deleted: true };
  const [existing] = await sql`SELECT * FROM scheduler_schedules WHERE id = ${id}::uuid`;
  if (!existing) throw new AppError('Schedule not found.', 404);
  if (existing.deleted_at) return { schedule: existing, deleted: true, alreadyDeleted: true };
  throw new AppError('Archive this schedule before deleting it.', 409);
}
