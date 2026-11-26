// @ts-nocheck
// Migrated from record-jobs.js; source behavior retained.
import { createHash, randomUUID } from 'node:crypto';
import { recordDb, requireRecordStore } from './dockRecordDb';
import { translateRow_, parseAddress_, clean_ } from './dockModel';
import { validateCompletion, waterFields } from './dockJobs';
import { readPhotos, validatePhoto, PHOTO_COLUMNS } from './dockPhotos';
import { geocodeAddress } from './dockGoogle';
import { AppError } from './dockErrors';
import { validateJobFields } from './dockEntry';
import { DEFAULT_SCHEDULE, listSchedules, scheduleId } from './dockSchedules';
import { recordMetadata } from './dockJobMetadata';

const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export function editFields(row) {
  const job = translateRecord(row);
  return { firstName: job.firstName, lastName: job.lastName, phone: job.phone, email: job.email, roNumber: job.roNumber, street: [job.houseNumber, job.street].filter(Boolean).join(' ') || job.address || '', city: job.town, state: job.state, zip: job.zip, bodyOfWater: job.bodyOfWater, workDescription: job.workDescription, notes: job.notes, appointmentLabel: job.appointment, date: job.appointmentDate || null, time: Number.isFinite(job.appointmentTimeMinutes) ? `${String(Math.floor(job.appointmentTimeMinutes / 60)).padStart(2, '0')}:${String(job.appointmentTimeMinutes % 60).padStart(2, '0')}` : '' };
}
export function translateRecord(row, importHeaders = []) {
  const rowNumber = Number(row.sequence_id) + 1;
  return {
    ...translateRow_(row.data, rowNumber), ...waterFields(row.data), photos: readPhotos(row.data),
    jobId: row.id, version: row.version, scheduleId: row.schedule_id || DEFAULT_SCHEDULE,
    ...recordMetadata(row, importHeaders),
    ...(row.deletion_request_id && !row.deleted_at ? { deletionPending: true, deletionRequestId: row.deletion_request_id } : {}),
    recordKey: createHash('sha256').update(`${row.id}:${row.version}`).digest('hex'),
    ...(row.calendar ? { outlook: row.calendar } : {}),
  };
}

export function createRecordJobs({ database = recordDb, geocode = geocodeAddress } = {}) {
  let importHeaders;
  async function db() {
    const sql = database(); await requireRecordStore(sql);
    // Import headers are immutable. Retain duplicate date columns from the raw
    // source snapshot rather than trusting the flattened last-column mapping.
    if (!importHeaders) importHeaders = (await sql`SELECT headers FROM scheduler_imports WHERE id = (SELECT active_import FROM scheduler_record_state WHERE singleton)`)[0]?.headers || [];
    return sql;
  }
  const translate = row => translateRecord(row, importHeaders);
  async function resolve(sql, identity) {
    if (!identity || !uuid.test(identity.jobId || '') || !Number.isInteger(identity.version)) throw new AppError('The job reference is out of date. Refresh the scheduler.', 409);
    const rows = await sql`SELECT * FROM scheduler_jobs WHERE id = ${identity.jobId}::uuid AND (import_id IS NULL OR import_id = (SELECT active_import FROM scheduler_record_state WHERE singleton))`;
    const row = rows[0];
    if (!row || row.deleted_at || row.deletion_request_id || row.version !== identity.version || translateRecord(row).recordKey !== identity.recordKey) throw new AppError('This job was changed by another crew member, deleted, or is being deleted. Refresh before saving.', 409);
    return row;
  }
  async function patch(sql, row, fields) {
    const updated = await sql`UPDATE scheduler_jobs SET data = data || ${sql.json(fields)}::jsonb, version = version + 1, updated_at = now() WHERE id = ${row.id}::uuid AND version = ${row.version} RETURNING *`;
    if (!updated.length) throw new AppError('This job was changed by another crew member. Refresh before saving.', 409);
    return translate(updated[0]);
  }
  return {
    async beginDeletion(identity, requestId) {
      if (!identity || !uuid.test(identity.jobId || '') || !Number.isInteger(identity.version) || !uuid.test(requestId || '')) throw new AppError('Invalid deletion reference. Refresh the scheduler.', 409);
      const expectedKey = createHash('sha256').update(`${identity.jobId}:${identity.version}`).digest('hex');
      if (identity.recordKey !== expectedKey) throw new AppError('Invalid deletion reference. Refresh the scheduler.', 409);
      const sql = await db();
      const read = async () => (await sql`SELECT * FROM scheduler_jobs WHERE id = ${identity.jobId}::uuid AND (import_id IS NULL OR import_id = (SELECT active_import FROM scheduler_record_state WHERE singleton))`)[0];
      const existing = await read();
      if (!existing) throw new AppError('This job could not be found. Refresh the scheduler.', 404);
      if (existing.deletion_request_id === requestId) return { job: translate(existing), alreadyDeleted: Boolean(existing.deleted_at) };
      if (existing.deleted_at) throw new AppError('This job has already been deleted. Refresh the scheduler.', 410);
      if (existing.deletion_request_id) throw new AppError('A deletion is already in progress. Refresh, then retry Delete job.', 409);
      if (existing.version !== identity.version) throw new AppError('This job was changed by another crew member. Refresh before deleting.', 409);
      const updated = await sql`UPDATE scheduler_jobs SET deletion_request_id = ${requestId}::uuid, deletion_requested_at = now(), version = version + 1, updated_at = now() WHERE id = ${existing.id}::uuid AND version = ${identity.version} AND deleted_at IS NULL AND deletion_request_id IS NULL RETURNING *`;
      if (updated[0]) return { job: translate(updated[0]), alreadyDeleted: false };
      const retry = await read();
      if (retry?.deletion_request_id === requestId) return { job: translate(retry), alreadyDeleted: Boolean(retry.deleted_at) };
      throw new AppError('This job was changed by another crew member. Refresh before deleting.', 409);
    },
    async finishDeletion(jobId, requestId) {
      if (!uuid.test(jobId || '') || !uuid.test(requestId || '')) throw new AppError('Invalid deletion reference.', 409);
      const sql = await db();
      const rows = await sql`UPDATE scheduler_jobs SET deleted_at = now(), version = version + 1, updated_at = now() WHERE id = ${jobId}::uuid AND deletion_request_id = ${requestId}::uuid AND deleted_at IS NULL RETURNING id`;
      if (!rows.length) {
        const [row] = await sql`SELECT deleted_at, deletion_request_id FROM scheduler_jobs WHERE id = ${jobId}::uuid`;
        if (!row?.deleted_at || row.deletion_request_id !== requestId) throw new AppError('The deletion could not be confirmed. Retry Delete job.', 503);
      }
      return { jobId, deleted: true };
    },
    async getEntry(jobId) {
      if (!uuid.test(jobId || '')) throw new AppError('Invalid job link.');
      const sql = await db();
      const rows = await sql`SELECT * FROM scheduler_jobs WHERE id = ${jobId}::uuid AND (import_id IS NULL OR import_id = (SELECT active_import FROM scheduler_record_state WHERE singleton))`;
      if (!rows[0] || rows[0].deleted_at) throw new AppError('This job could not be found. It may have been deleted.', 404);
      return { job: translate(rows[0]), fields: editFields(rows[0]) };
    },
    async editEntry(identity, input, requestId) {
      if (!uuid.test(requestId || '')) throw new AppError('Invalid edit reference. Reload the form.');
      const fields = validateJobFields(input, { required: false });
      if (typeof input.appointmentLabel !== 'string' || input.appointmentLabel.length > 500 || /[\x00-\x1f]/.test(input.appointmentLabel)) throw new AppError('Appointment must be a single line of at most 500 characters.');
      fields.appointmentLabel = input.appointmentLabel.trim();
      const inputHash = createHash('sha256').update(JSON.stringify(fields)).digest('hex');
      const sql = await db();
      const current = (await this.getEntry(identity?.jobId)).job;
      const rows = await sql`SELECT * FROM scheduler_jobs WHERE id = ${current.jobId}::uuid`;
      const existing = rows[0];
      if (existing.last_edit?.requestId === requestId) {
        if (existing.last_edit.inputHash !== inputHash) throw new AppError('This edit was already saved with different details. Reload the latest job.', 409);
        return { job: translate(existing), alreadySaved: true };
      }
      const row = await resolve(sql, identity);
      const previous = editFields(row);
      const addressChanged = ['street', 'city', 'state', 'zip'].some(key => fields[key] !== previous[key]);
      const changes = {
        'Customer Name - First Name': fields.firstName, 'Customer Name - Last Name': fields.lastName,
        'Contact Phone': fields.phone, 'RO#': fields.roNumber, 'Description of Work': fields.workDescription,
        ...(fields.email !== undefined ? { 'Contact Email': fields.email } : {}),
        Notes: fields.notes, Appointment: fields.appointmentLabel,
        [waterFields(row.data).isOther ? 'Other Body' : 'Body of Water']: fields.bodyOfWater,
        ...(addressChanged ? { 'Product Location/Address': `Street Name: ${fields.street}\nCity: ${fields.city}\nState: ${fields.state}\nPostal Code: ${fields.zip}`, Latitude: '', Longitude: '' } : {}),
      };
      const updated = await sql`UPDATE scheduler_jobs SET data = data || ${sql.json(changes)}::jsonb, last_edit = ${sql.json({ requestId, inputHash })}::jsonb, version = version + 1, updated_at = now() WHERE id = ${row.id}::uuid AND version = ${row.version} RETURNING *`;
      if (!updated.length) {
        const retry = (await sql`SELECT * FROM scheduler_jobs WHERE id = ${row.id}::uuid`)[0];
        if (retry?.last_edit?.requestId === requestId && retry.last_edit.inputHash === inputHash) return { job: translate(retry), alreadySaved: true };
        throw new AppError('This job was changed by another crew member. Reload the latest job before saving.', 409);
      }
      return { job: translate(updated[0]), alreadySaved: false };
    },
    async getLocations() {
      const sql = await db();
      const rows = await sql`SELECT * FROM scheduler_jobs WHERE deleted_at IS NULL AND (import_id IS NULL OR import_id = (SELECT active_import FROM scheduler_record_state WHERE singleton)) ORDER BY sequence_id`;
      const historySchedules = await listSchedules(sql, { includeDeleted: true });
      return { locations: rows.map(translate), storage: 'records', schedules: historySchedules.filter(schedule => !schedule.deleted_at), historySchedules };
    },
    async findEntry(submissionId) {
      const sql = await db();
      const rows = await sql`SELECT * FROM scheduler_jobs WHERE data->>'Submission ID' = ${submissionId} AND (import_id IS NULL OR import_id = (SELECT active_import FROM scheduler_record_state WHERE singleton)) LIMIT 2`;
      if (rows.length > 1) throw new AppError('This submission reference is duplicated. Start a new job.', 409);
      if (rows[0]?.deleted_at || rows[0]?.deletion_request_id) throw new AppError('This submission was deleted or is being deleted. Start a new job with a new submission reference.', 410);
      return rows[0] ? translate(rows[0]) : null;
    },
    async addEntry(source, calendar, selectedSchedule = DEFAULT_SCHEDULE) {
      selectedSchedule = scheduleId(selectedSchedule);
      if (!/^scheduler-[a-f0-9-]{36}$/i.test(source?.['Submission ID'] || '')) throw new AppError('Invalid new-job reference.');
      const sql = await db();
      const sourceKey = `app:${source['Submission ID']}`;
      const inserted = await sql`INSERT INTO scheduler_jobs (id, source_key, data, calendar, schedule_id) VALUES (${randomUUID()}::uuid, ${sourceKey}, ${sql.json(source)}::jsonb, ${calendar ? sql.json(calendar) : null}::jsonb, ${selectedSchedule}::uuid) ON CONFLICT (source_key) DO NOTHING RETURNING *`;
      if (inserted[0]) return translate(inserted[0]);
      const existing = await sql`SELECT * FROM scheduler_jobs WHERE source_key = ${sourceKey}`;
      if (!existing[0]) throw new AppError('The new job could not be confirmed. Retry this submission.', 503);
      if (existing[0].deleted_at || existing[0].deletion_request_id) throw new AppError('This submission was deleted or is being deleted. Start a new job.', 410);
      if ((existing[0].schedule_id || DEFAULT_SCHEDULE) !== selectedSchedule) throw new AppError('This submission was already saved to another schedule.', 409);
      for (const key of ['Contact Email', '_MarineOpsCustomerId']) {
        if (clean_(existing[0].data[key]) !== clean_(source[key])) throw new AppError('This submission reference was already saved with different details.', 409);
      }
      for (const [key, value] of Object.entries(source)) {
        if (clean_(existing[0].data[key]) !== clean_(value)) throw new AppError('This submission reference was already saved with different details.', 409);
      }
      return translate(existing[0]);
    },
    async setCompleted(identity, completed, signature, completionDate) {
      validateCompletion(completed, signature, completionDate);
      const sql = await db(); const row = await resolve(sql, identity);
      return patch(sql, row, { Completed: completed, ...(completed ? { 'Completion Signature': signature.trim(), 'Completion Date': completionDate } : {}) });
    },
    async setNotes(identity, value) {
      if (typeof value !== 'string' || value.length > 20000) throw new AppError('Notes must be text of at most 20000 characters.');
      const sql = await db(); const row = await resolve(sql, identity);
      return patch(sql, row, { Notes: value.trim() });
    },
    async setBodyOfWater(identity, value) {
      if (typeof value !== 'string' || value.length > 200) throw new AppError('Body of Water must be text of at most 200 characters.');
      const sql = await db(); const row = await resolve(sql, identity);
      return patch(sql, row, { [waterFields(row.data).isOther ? 'Other Body' : 'Body of Water']: value.trim() });
    },
    async setPhotos(identity, photos) {
      if (!Array.isArray(photos) || photos.length > 2) throw new AppError('Attach up to two photos per job.');
      const validated = photos.map(validatePhoto);
      const sql = await db(); const row = await resolve(sql, identity);
      return patch(sql, row, Object.fromEntries(PHOTO_COLUMNS.map((label, index) => [label, validated[index] ? JSON.stringify(validated[index]) : ''])));
    },
    async geocodeLocation(identity) {
      const sql = await db(); const row = await resolve(sql, identity);
      const address = parseAddress_(row.data['Product Location/Address']).fullAddress;
      const result = await geocode(address);
      return { ...await patch(sql, row, { Latitude: result.latitude, Longitude: result.longitude }), address };
    },
    async geocodeBatch({ onlyMissing = false, identities = [] } = {}) {
      if (typeof onlyMissing !== 'boolean' || !Array.isArray(identities) || identities.length > 1) throw new AppError('Invalid geocoding batch.');
      const current = identities.length ? null : await this.getLocations();
      const selected = identities.length ? identities : current.locations.filter(job => !job.deletionPending && current.schedules.some(schedule => schedule.id === job.scheduleId) && !job.hasCoordinates && job.address).slice(0, 1);
      const results = [];
      for (const identity of selected) {
        const sql = await db(); const row = await resolve(sql, identity); const job = translateRecord(row);
        if ((onlyMissing && job.hasCoordinates) || !job.address) { results.push({ ...job, status: 'skipped' }); continue; }
        try { results.push({ ...await this.geocodeLocation(identity), status: 'updated' }); }
        catch (error) {
          if ([409, 503].includes(error.status)) throw error;
          results.push({ ...job, status: 'failed', message: error.message });
        }
      }
      return { total: selected.length, updated: results.filter(row => row.status === 'updated').length, skipped: results.filter(row => row.status === 'skipped').length, failed: results.filter(row => row.status === 'failed').length, results };
    },
    async exportRecords() {
      const sql = await db();
      const imports = await sql`SELECT id, headers, snapshot_hash, expected_count, completed_at FROM scheduler_imports WHERE id = (SELECT active_import FROM scheduler_record_state WHERE singleton)`;
      const rows = await sql`SELECT * FROM scheduler_jobs WHERE import_id IS NULL OR import_id = (SELECT active_import FROM scheduler_record_state WHERE singleton) ORDER BY sequence_id`;
      return { schemaVersion: 2, exportedAt: new Date().toISOString(), schedules: await listSchedules(sql, { includeDeleted: true }), sourceImport: imports[0], records: rows.map(row => ({ id: row.id, scheduleId: row.schedule_id, version: row.version, ...recordMetadata(row, imports[0]?.headers), fields: row.data, outlook: row.calendar, deletedAt: row.deleted_at || null, deletionRequestedAt: row.deletion_requested_at || null, deletionRequestId: row.deletion_request_id || null, sourceKey: row.source_key, originalHeaders: row.source_headers || (row.original_values ? imports[0]?.headers : null), originalSheetRow: row.source_row, originalValues: row.original_values })) };
    },
  };
}
export const recordJobs = createRecordJobs();
