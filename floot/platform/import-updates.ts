import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { customerAddressFields, customerContacts, customerExportColumns, maxCustomerExportBytes, maxCustomerExportRows } from '../helpers/customerExport';
import { maxPartsUploadBytes } from '../helpers/partsExport';
import { customerFields, readBody } from './customers';
import { customerDisplayName } from '../helpers/customerJobContact';
import { LAKEVIEW_ID, PlatformError, requireManager, requireSameOrigin } from './policy';
import { platformStore } from './store';
import { partsInputRows, partsUpdatePlan, writePartsUpdate } from './parts-update';

const dataset = z.enum(['customers', 'parts', 'ros', 'units']);
const runId = z.string().regex(/^[1-9]\d{0,17}$/);
const imports = {
  customers: { source: 'Lightspeed Customer Bulk', tool: 'customers', maxBytes: maxCustomerExportBytes },
  parts: { source: 'Lightspeed Parts Inventory Bulk', tool: 'parts-inventory', maxBytes: maxPartsUploadBytes },
} as const;
type ImportArea = keyof typeof imports;
const field = z.string().trim().max(500);
const inputRows = z.array(z.array(field).min(customerExportColumns.length - 1).max(customerExportColumns.length))
  .min(1).max(maxCustomerExportRows).refine(rows => rows.every(row => row.length === rows[0].length));
const contactEntries = Object.entries(customerContacts) as [keyof typeof customerContacts, string][];
const addressEntries = Object.entries(customerAddressFields) as [keyof typeof customerAddressFields, string][];
const labels = ['primary', 'alternate'] as const;
type Contact = Required<Pick<z.infer<typeof customerFields>, keyof typeof customerContacts | 'addresses'>>;
type Address = Contact['addresses'][number];
type Source = Record<string, string>;
type Customer = Contact & { id: string; version: number; source_number: string; source_record: Source | null };

function sourceValues(source: Source): Contact {
  const contacts = Object.fromEntries(contactEntries.map(([key, column]) => [key, source[column] ?? ''])) as Omit<Contact, 'addresses'>;
  const addresses = labels.map(label => {
    const prefix = label === 'alternate' ? 'Alternate ' : '';
    const values = addressEntries.map(([key, column]) => [key, source[prefix + column] ?? '']);
    return values.some(([, value]) => value) ? { label, ...Object.fromEntries(values) } as Address : null;
  }).filter(address => address !== null);
  return { ...contacts, addresses };
}

function normalize(rows: string[][]) {
  const sourceRows = new Map<string, Source>();
  for (const row of rows) {
    const number = row[0];
    if (!/^\d{1,100}$/.test(number) || sourceRows.has(number))
      throw new PlatformError(400, 'The export contains an invalid or duplicate customer number.');
    const source = Object.fromEntries(row.map((value, index) => [customerExportColumns[index], value]));
    if (/^(true|false)$/i.test(source.Active)) source.Active = source.Active.toLowerCase() === 'true' ? 'True' : 'False';
    sourceRows.set(number, source);
  }
  return sourceRows;
}

function compare(old: Contact, incoming: Contact, current: Contact) {
  const differences: { field: string; before: string; after: string }[] = [];
  let conflict = false;
  function merge(field: string, before = '', after = '', now = '') {
    if (before === after || now === after) return now;
    if (now !== before) conflict = true;
    differences.push({ field, before: now, after });
    return after;
  }
  const contacts = Object.fromEntries(contactEntries.map(([key, column]) => [key, merge(column, old[key], incoming[key], current[key])]));
  const addresses = labels.map(label => {
    const previous = old.addresses.find(address => address.label === label);
    const next = incoming.addresses.find(address => address.label === label);
    const local = current.addresses.find(address => address.label === label);
    const prefix = label === 'primary' ? 'Primary' : 'Alternate';
    const values = addressEntries.map(([key, column]) => [key, merge(prefix + ' ' + column, previous?.[key], next?.[key], local?.[key])]);
    return values.some(([, value]) => value) ? { label, ...Object.fromEntries(values) } as Address : null;
  }).filter(address => address !== null);
  return { values: { ...contacts, addresses } as Contact, differences, conflict };
}

async function plan(sql: any, company: string, sourceRows: Map<string, Source>) {
  const records: Customer[] = await sql`
    SELECT id,version,source_number,source_record,first_name,last_name,company_name,email,home_phone,work_phone,mobile_phone,addresses
    FROM customers WHERE company_id=${company} AND source_system='lightspeed' AND source_number IS NOT NULL`;
  const saved = new Map(records.map(record => [record.source_number, record]));
  const changes = [];
  const preview: { number: string; name: string; outcome: 'add' | 'update' | 'conflict'; differences?: ReturnType<typeof compare>['differences'] }[] = [];
  const summary = { compared: 0, excluded: 0, added: 0, updated: 0, missing: 0, conflicts: 0, alreadyCurrent: 0, applied: 0 };
  const orderedSource = [...sourceRows].sort(([a], [b]) => a.localeCompare(b));
  for (const [number, row] of orderedSource) {
    const record = saved.get(number);
    const includesCompany = Object.hasOwn(row, 'Company Name');
    const source = !includesCompany && Object.hasOwn(record?.source_record ?? {}, 'Company Name')
      ? { ...row, 'Company Name': record!.source_record!['Company Name'] } : row;
    const incoming = sourceValues(source);
    if (!includesCompany && record) incoming.company_name = record.company_name;
    if (!incoming.first_name && !incoming.last_name && !incoming.company_name) { summary.excluded++; continue; }
    summary.compared++;
    const name = customerDisplayName(incoming);
    if (!record) {
      summary.added++;
      changes.push({ number, source, values: incoming });
      if (preview.length < 50) preview.push({ number, name, outcome: 'add' });
      continue;
    }
    if (!record.source_record) {
      summary.conflicts++;
      if (preview.length < 50) preview.push({ number, name, outcome: 'conflict' });
      continue;
    }
    const old = sourceValues(record.source_record);
    if (!includesCompany) old.company_name = incoming.company_name;
    const result = compare(old, incoming, record);
    if (result.conflict) {
      summary.conflicts++;
      if (preview.length < 50) preview.push({ number, name, outcome: 'conflict', differences: result.differences });
      continue;
    }
    if (!result.differences.length) {
      if (contactEntries.some(([key]) => old[key] !== incoming[key])
          || JSON.stringify(old.addresses) !== JSON.stringify(incoming.addresses)) summary.alreadyCurrent++;
      continue;
    }
    const validation = customerFields.safeParse({ ...result.values, notes: '', status: 'active' });
    if (!validation.success) {
      summary.conflicts++;
      if (preview.length < 50) preview.push({ number, name, outcome: 'conflict' });
      continue;
    }
    summary.updated++;
    changes.push({ number, source, values: result.values, id: record.id, version: record.version });
    if (preview.length < 50) preview.push({ number, name, outcome: 'update', differences: result.differences });
  }
  summary.missing = records.filter(record => !sourceRows.has(record.source_number)).length;
  if (!summary.compared) throw new PlatformError(400, 'The export contains no named customers.');
  const hash = createHash('sha256').update(JSON.stringify({ orderedSource, summary, changes })).digest('hex');
  return { summary, changes, preview, hash };
}

async function runPlan(sql: any, company: string, area: ImportArea, rows: unknown) {
  if (area === 'parts') {
    const result = await partsUpdatePlan(sql, company, partsInputRows.parse(rows));
    return { ...result, write: (tx: any) => writePartsUpdate(tx, company, result) };
  }
  const result = await plan(sql, company, normalize(inputRows.parse(rows)));
  return { ...result, hasChanges: !!result.changes.length, write: async (tx: any) => {
    for (const change of result.changes) {
      const values = { ...change.values, addresses: tx.json(change.values.addresses),
        source_active: change.source.Active, source_record: tx.json(change.source) };
      if ('id' in change) {
        const updated = await tx`UPDATE customers SET ${tx(values)},version=version+1,updated_at=now()
          WHERE id=${change.id} AND company_id=${company} AND version=${change.version} RETURNING id`;
        if (!updated.length) throw new PlatformError(409, 'Customer data changed. Check the file again before applying.');
      } else {
        const inserted = await tx`INSERT INTO customers ${tx({ ...values, id: randomUUID(), company_id: company,
          source_system: 'lightspeed', source_number: change.number })}
          ON CONFLICT(company_id,source_system,source_number) DO NOTHING RETURNING id`;
        if (!inserted.length) throw new PlatformError(409, 'Customer data changed. Check the file again before applying.');
      }
    }
    return result.changes.length;
  } };
}

const auditColumns = 'id::text, dataset, source, checked_at, status, summary, applied_at';
export function importUpdatesStore(sql: any) {
  const platform = platformStore(sql);
  async function access(actor: number, company: string, area?: ImportArea) {
    if (area === 'parts' && company !== LAKEVIEW_ID) throw new PlatformError(403, 'Parts Inventory is Lakeview-only.');
    if (area) return requireManager(await platform.toolAccess(actor, company, imports[area].tool));
    const [membership] = await sql`
      SELECT m.company_id,m.role,m.status,c.status AS company_status FROM platform_memberships m
      JOIN platform_companies c ON c.id=m.company_id WHERE m.company_id=${company} AND m.user_id=${actor}`;
    return requireManager(membership);
  }
  return {
    async history(actor: number, company: string, area?: string, before?: string) {
      await access(actor, company);
      if (!area) {
        return { runs: await sql`
          SELECT ${sql.unsafe(auditColumns)} FROM (
            SELECT *,row_number() OVER(PARTITION BY dataset ORDER BY id DESC) AS row_number
            FROM import_update_runs WHERE company_id=${company}
          ) history WHERE row_number<=3 ORDER BY history.id DESC`, next: null };
      }
      const rows = await sql`SELECT ${sql.unsafe(auditColumns)} FROM import_update_runs
        WHERE company_id=${company} AND dataset=${area} AND (${before ?? null}::bigint IS NULL OR id<${before ?? null}::bigint)
        ORDER BY import_update_runs.id DESC LIMIT 26`;
      return { runs: rows.slice(0, 25), next: rows.length > 25 ? rows[24].id : null };
    },
    async check(actor: number, company: string, area: ImportArea, load: () => Promise<unknown>) {
      await access(actor, company, area);
      const checkedAt = new Date();
      const sourceName = imports[area].source;
      try {
        const result = await runPlan(sql, company, area, await load());
        const { summary, hash, preview } = result;
        const status = result.hasChanges ? 'pending'
          : summary.conflicts || summary.missing || ('omitted' in summary && summary.omitted) ? 'not_applied' : 'unchanged';
        const [run] = await sql`INSERT INTO import_update_runs(company_id,actor_user_id,dataset,source,checked_at,status,summary,preview_hash)
          VALUES (${company},${actor},${area},${sourceName},${checkedAt},${status},${sql.json(summary)},${hash})
          RETURNING ${sql.unsafe(auditColumns)}`;
        return { run, preview };
      } catch (error) {
        await sql`INSERT INTO import_update_runs(company_id,actor_user_id,dataset,source,checked_at,status,summary)
          VALUES (${company},${actor},${area},${sourceName},${checkedAt},'failed',${sql.json({ note: 'The export comparison did not complete.' })})`;
        throw error;
      }
    },
    async apply(actor: number, company: string, area: ImportArea, load: () => Promise<{ id: string; rows: unknown }>) {
      await access(actor, company, area);
      const { id, rows } = await load();
      return sql.begin('isolation level serializable', async (tx: any) => {
        const [run] = await tx`SELECT * FROM import_update_runs WHERE company_id=${company} AND id=${id} AND dataset=${area} FOR UPDATE`;
        if (!run) throw new PlatformError(404, 'Import check not found.');
        if (run.status === 'applied' || run.status === 'partial') return { applied: run.summary.applied };
        if (run.status !== 'pending') throw new PlatformError(409, 'This import check has no changes to apply.');
        const result = await runPlan(tx, company, area, rows);
        if (run.preview_hash !== result.hash || !result.hasChanges)
          throw new PlatformError(409, 'The file or Marine Ops data changed. Check the file again before applying.');
        const applied = await result.write(tx);
        const summary = { ...result.summary, applied };
        await tx`UPDATE import_update_runs SET status=${summary.conflicts ? 'partial' : 'applied'},
          applied_at=now(),summary=${tx.json(summary)} WHERE id=${id} AND company_id=${company}`;
        return { applied };
      });
    },
  };
}

export function importUpdatesHandler(store: ReturnType<typeof importUpdatesStore>, authenticate: (request: Request) => Promise<number>) {
  return async (request: Request) => {
    try {
      const actor = await authenticate(request).catch(() => 0);
      if (!Number.isSafeInteger(actor) || actor <= 0) throw new PlatformError(401, 'Sign in to continue.');
      const url = new URL(request.url);
      const company = z.uuid().parse(url.searchParams.get('companyId'));
      if (request.method === 'GET' && url.pathname === '/_api/import-updates') {
        const area = dataset.optional().parse(url.searchParams.get('dataset') ?? undefined);
        const before = runId.optional().parse(url.searchParams.get('before') ?? undefined);
        return Response.json(await store.history(actor, company, area, before));
      }
      if (request.method === 'POST') {
        requireSameOrigin(request);
        const route = /^\/_api\/import-updates\/(customers|parts)\/(check|apply)$/.exec(url.pathname);
        if (route) {
          const area = route[1] as ImportArea;
          const body = () => readBody(request, imports[area].maxBytes);
          if (route[2] === 'check') {
            const schema = z.object({ rows: z.array(z.unknown()) }).strict();
            return Response.json(await store.check(actor, company, area, async () => schema.parse(await body()).rows));
          }
          const schema = z.object({ id: runId, rows: z.array(z.unknown()) }).strict();
          return Response.json(await store.apply(actor, company, area, async () => schema.parse(await body())));
        }
      }
      return Response.json({ error: 'Not found.' }, { status: 404 });
    } catch (error) {
      if (error instanceof PlatformError) return Response.json({ error: error.message }, { status: error.status });
      if (error instanceof z.ZodError) return Response.json({ error: 'The import request is invalid.' }, { status: 400 });
      const code = (error as { code?: string })?.code;
      if (code === '40001') return Response.json({ error: 'Data changed during the import. Check the file again.' }, { status: 409 });
      console.error('Import update request failed.', code && /^[A-Z0-9_]{1,32}$/.test(code) ? code : (error as Error)?.name);
      return Response.json({ error: 'The import update is temporarily unavailable.' }, { status: 503 });
    }
  };
}
