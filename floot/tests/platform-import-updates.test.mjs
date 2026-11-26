import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import postgres from 'postgres';
import { customerExportColumns, customerExportRows } from '../helpers/customerExport.ts';
import { importUpdatesHandler, importUpdatesStore } from '../platform/import-updates.ts';
import { LAKEVIEW_ID } from '../platform/policy.ts';

function row(number, fields = {}) {
  const values = { 'Customer Number': number, Active: 'False', 'First Name': 'Test', 'Last Name': 'Customer', ...fields };
  return customerExportColumns.map(column => values[column] ?? '');
}

test('Customer Bulk parser accepts a title row and rejects invalid headings and duplicate IDs', () => {
  const id = row('0007');
  assert.deepEqual(customerExportRows([['Lightspeed Customer Bulk'], [...customerExportColumns], id, row('Customer: 1')]), [id]);
  assert.throws(() => customerExportRows([['Customer Number'], id]), /missing required/);
  assert.throws(() => customerExportRows([[...customerExportColumns], id, id]), /duplicate/);
});

const origin = 'https://example.invalid';
const endpoint = '/_api/import-updates';
function request(path = '', body, from = origin, company = LAKEVIEW_ID) {
  const separator = path.includes('?') ? '&' : '?';
  return new Request(origin + endpoint + path + separator + 'companyId=' + company, body === undefined ? {} : {
    method: 'POST', headers: { Origin: from, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

test('import updates require a session and same-origin writes', async () => {
  const anonymous = importUpdatesHandler({}, async () => 0);
  assert.equal((await anonymous(request())).status, 401);
  const signedIn = importUpdatesHandler({}, async () => 1);
  assert.equal((await signedIn(request('/customers/check', { rows: [row('1')] }, 'https://outside.invalid'))).status, 403);
});

test('customer preview is read-only, safe to apply, and recorded in paginated company history',
  { skip: !process.env.TEST_DATABASE_URL }, async () => {
    const schema = 'test_import_updates_' + randomUUID().replaceAll('-', '');
    const root = postgres(process.env.TEST_DATABASE_URL, { onnotice: () => {} });
    await root`CREATE SCHEMA ${root(schema)}`;
    const db = postgres(process.env.TEST_DATABASE_URL, { connection: { search_path: schema }, onnotice: () => {} });
    try {
      await db`CREATE TABLE users(id integer PRIMARY KEY)`;
      await db`CREATE TABLE native_gateway_members(auth_user_id integer,role text,enabled boolean)`;
      await db`CREATE TABLE service_jobs(id uuid PRIMARY KEY)`;
      await db`INSERT INTO users VALUES (1),(2)`;
      await db`INSERT INTO native_gateway_members VALUES (1,'admin',true),(2,'user',true)`;
      const conn = await db.reserve();
      try {
        for (const migration of ['007-platform-foundation', '008-customers', '019-import-update-audit', '019-import-update-audit']) {
          await conn.unsafe(await readFile(new URL('../migrations/' + migration + '.sql', import.meta.url), 'utf8'));
        }
      } finally { conn.release(); }
      const other = randomUUID();
      await db`INSERT INTO platform_companies(id,slug,name) VALUES (${other},'other','Other')`;
      const id = randomUUID(), conflict = randomUUID();
      const baseline = cells => db.json(Object.fromEntries(customerExportColumns.map((column, index) => [column, cells[index]])));
      await db`INSERT INTO customers(id,company_id,source_system,source_number,source_record,first_name,last_name,email,mobile_phone,notes)
        VALUES (${id},${LAKEVIEW_ID},'lightspeed','01',${baseline(row('01'))},'Test','Customer','','local phone','Keep this'),
          (${conflict},${LAKEVIEW_ID},'lightspeed','02',${baseline(row('02'))},'Test','Customer','local@example.invalid','',''),
          (${randomUUID()},${LAKEVIEW_ID},'lightspeed','04',${baseline(row('04'))},'Test','Customer','','','')`;
      let actor = 1;
      const handler = importUpdatesHandler(importUpdatesStore(db), async () => actor);
      const rows = [row('01', { 'E-Mail': 'updated@example.invalid' }), row('02', { 'E-Mail': 'new@example.invalid' }), row('03')];
      actor = 2;
      assert.equal((await handler(request())).status, 403);
      assert.equal((await handler(request('/customers/check', { rows }))).status, 403);
      actor = 1;
      assert.equal((await handler(request('', undefined, origin, other))).status, 403);
      const history = async (path = '') => {
        const response = await handler(request(path));
        assert.equal(response.status, 200);
        return response.json();
      };
      assert.equal((await history()).runs.length, 1);
      const previewResponse = await handler(request('/customers/check', { rows }));
      assert.equal(previewResponse.status, 200);
      const preview = await previewResponse.json();
      assert.equal(preview.run.status, 'pending');
      assert.deepEqual(preview.run.summary, { added: 1, updated: 1, conflicts: 1, missing: 1,
        compared: 3, excluded: 0, alreadyCurrent: 0, applied: 0 });
      assert.equal(preview.preview.find(change => change.number === '01').differences[0].field, 'E-Mail');
      const [unsaved] = await db`SELECT email FROM customers WHERE id=${id}`;
      assert.equal(unsaved.email, '');
      await db`UPDATE customers SET version=version+1,notes='Changed after preview' WHERE id=${id}`;
      const apply = (id, rows) => handler(request('/customers/apply', { id, rows }));
      assert.equal((await apply(preview.run.id, rows)).status, 409);
      const next = await (await handler(request('/customers/check', { rows }))).json();
      assert.equal((await apply(next.run.id, [...rows, row('05')])).status, 409);
      assert.deepEqual(await (await apply(next.run.id, rows)).json(), { applied: 2 });
      assert.deepEqual(await (await apply(next.run.id, rows)).json(), { applied: 2 });
      const [saved] = await db`SELECT email,mobile_phone,notes FROM customers WHERE id=${id}`;
      assert.deepEqual({ ...saved }, { email: 'updated@example.invalid', mobile_phone: 'local phone', notes: 'Changed after preview' });
      const [untouched] = await db`SELECT email FROM customers WHERE id=${conflict}`;
      assert.equal(untouched.email, 'local@example.invalid');
      assert.equal((await handler(request('/customers/check', { rows: [row('01'), row('01')] }))).status, 400);
      const recent = (await history()).runs;
      assert.equal(recent.length, 3);
      assert.deepEqual(recent.map(run => run.status), ['failed', 'partial', 'pending']);
      const all = await history('?dataset=customers');
      assert.equal(all.runs.length, 4);
      assert.ok(all.runs[1].applied_at);
      assert.equal(JSON.stringify(all).includes('example.invalid'), false);
      await db`INSERT INTO import_update_runs(company_id,dataset,source,status,summary)
        SELECT ${LAKEVIEW_ID},'parts','Fixture','unchanged','{}' FROM generate_series(1,26)`;
      const page = await history('?dataset=parts');
      assert.equal(page.runs.length, 25);
      assert.equal((await history('?dataset=parts&before=' + page.next)).runs.length, 1);
    } finally {
      await db.end();
      await root`DROP SCHEMA ${root(schema)} CASCADE`;
      await root.end();
    }
  });
