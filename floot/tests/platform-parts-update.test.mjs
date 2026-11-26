import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import postgres from 'postgres';
import { partsExportRows, partSourceColumns } from '../helpers/partsExport.ts';
import { importUpdatesHandler, importUpdatesStore } from '../platform/import-updates.ts';
import { LAKEVIEW_ID } from '../platform/policy.ts';

const headings = JSON.parse(await readFile(new URL('../pages/parts-source-columns.json', import.meta.url), 'utf8'));
const origin = 'https://staging.example.invalid';
function cells(number, fields = {}) {
  const raw = Array(127).fill('');
  for (const column of [1, 32, 58, 60, 88, 94, 96, 98]) raw[column] = '0';
  const defaults = { 7: 'True', 11: '2', 24: 'Test part', 72: '3', 82: number, 116: '09', ...fields };
  for (const [column, value] of Object.entries(defaults)) raw[Number(column)] = value;
  return raw;
}

test('Parts Inventory parser preserves ordered headings, spacer variation, quantities and IDs', () => {
  const original = cells('0001', { 72: '-1.125' });
  const compact = row => partSourceColumns.map(index => row[index]);
  assert.deepEqual(partsExportRows([[], compact(headings), compact(original), ['Parts Inventory: 1']]), [[3, compact(original)]]);
  const wrong = [...headings];
  wrong[24] = 'Wrong description';
  assert.throws(() => partsExportRows([wrong, original]), /do not match/);
});

test('parts checks share audit history, preserve local movements and apply reviewed changes atomically',
  { skip: !process.env.TEST_DATABASE_URL }, async () => {
    const schema = 'test_parts_update_' + randomUUID().replaceAll('-', '');
    const root = postgres(process.env.TEST_DATABASE_URL, { onnotice: () => {} });
    await root`CREATE SCHEMA ${root(schema)}`;
    const db = postgres(process.env.TEST_DATABASE_URL, { connection: { search_path: schema }, onnotice: () => {} });
    try {
      await db`CREATE TABLE users(id integer PRIMARY KEY,display_name text,email text)`;
      await db`CREATE TABLE native_gateway_members(auth_user_id integer,role text,enabled boolean)`;
      await db`INSERT INTO users VALUES(1,'Admin','admin@example.invalid'),(2,'Member','member@example.invalid')`;
      await db`INSERT INTO native_gateway_members VALUES(1,'admin',true),(2,'user',true)`;
      const connection = await db.reserve();
      try {
        for (const name of ['007-platform-foundation','012-parts-inventory','013-part-stock-movements',
          '019-import-update-audit','020-parts-import-updates','020-parts-import-updates']) {
          await connection.unsafe(await readFile(new URL('../migrations/' + name + '.sql', import.meta.url), 'utf8'));
        }
      } finally { connection.release(); }
      await db`INSERT INTO platform_tools(key,name,path,available) VALUES('customers','Customers','/customers',true)`;
      await db`INSERT INTO platform_entitlements(company_id,tool_key,status) VALUES(${LAKEVIEW_ID},'customers','enabled')`;
      let actor = 1;
      const handler = importUpdatesHandler(importUpdatesStore(db), async () => actor);
      const call = (path, data) => handler(new Request(origin + '/_api/import-updates' + path
        + (path.includes('?') ? '&' : '?') + 'companyId=' + LAKEVIEW_ID, data ? {
        method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      } : {}));
      const check = async (...raw) => {
        const rows = partsExportRows([headings, ...raw]);
        const response = await call('/parts/check', { rows });
        assert.equal(response.status, 200);
        return { ...(await response.json()), rows };
      };
      const apply = (run, area = 'parts') => call('/' + area + '/apply', { id: run.run.id, rows: run.rows });
      const baseline = await check(cells('0001'), cells('0002'), cells('0004'));
      assert.equal(baseline.run.summary.added, 3);
      assert.deepEqual(await (await apply(baseline)).json(), { applied: 3 });
      const [managed] = await db`SELECT id FROM inventory_parts WHERE part_number='0002'`;
      await db`UPDATE inventory_parts SET data=jsonb_set(jsonb_set(data,'{on_hand}','"4"'),'{available}','"3"'),version=2 WHERE id=${managed.id}`;
      await db`INSERT INTO part_stock_movements(company_id,part_id,request_id,request,kind,quantity,before_on_hand,after_on_hand,
        before_available,after_available,reason,actor_user_id,actor_name,part_version)
        VALUES (${LAKEVIEW_ID},${managed.id},${randomUUID()},'{}','receive',1,3,4,2,3,'Fixture',1,'Fixture',2)`;
      const refreshRows = [cells('0001', { 11: '1.2500', 72: '-0.12500', 24: 'Updated test part' }),
        cells('0002', { 11: '4', 72: '6', 24: 'Updated managed part' }), cells('0003')];
      actor = 2;
      assert.equal((await call('/parts/check', { rows: partsExportRows([headings, ...refreshRows]) })).status, 403);
      actor = 1;
      const result = await check(...refreshRows);
      assert.deepEqual(result.run.summary, { compared: 3, added: 1, updated: 2, missing: 1, conflicts: 1,
        alreadyCurrent: 0, stockReview: 1, applied: 0, omitted: 0 });
      assert.ok(result.preview.some(part => part.differences?.some(value => value.held && value.field === 'On hand')));
      assert.ok(result.preview.some(part => part.outcome === 'missing'));
      assert.equal((await db`SELECT count(*)::int AS total FROM inventory_parts`)[0].total, 3);
      await db`UPDATE inventory_parts SET version=version+1 WHERE part_number='0001'`;
      assert.equal((await apply(result)).status, 409);
      const current = await check(...refreshRows);
      assert.equal((await apply(current, 'customers')).status, 404);
      assert.deepEqual(await (await apply(current)).json(), { applied: 3 });
      assert.deepEqual(await (await apply(current)).json(), { applied: 3 });
      const [ordinary, stock] = await db`SELECT part_number,data,opening_data,lightspeed_quantity_updated_at
        FROM inventory_parts WHERE part_number IN ('0001','0002') ORDER BY part_number`;
      assert.equal(ordinary.data.on_hand, '-0.125');
      assert.equal(ordinary.data.available, '1.25');
      assert.equal(ordinary.opening_data.on_hand, '3');
      assert.ok(ordinary.lightspeed_quantity_updated_at);
      assert.equal(stock.data.on_hand, '4');
      assert.equal(stock.data.available, '3');
      assert.equal(stock.data.description, 'Updated managed part');
      assert.equal(stock.lightspeed_quantity_updated_at, null);
      assert.equal((await db`SELECT count(*)::int AS total FROM part_stock_movements`)[0].total, 1);
      const again = await check(...refreshRows);
      assert.equal(again.run.status, 'not_applied');
      assert.equal(again.run.summary.updated + again.run.summary.added, 0);
      const recent = await (await call('')).json();
      assert.equal(recent.runs.filter(run => run.dataset === 'parts').length, 3);
      const history = await (await call('?dataset=parts')).json();
      assert.equal(history.runs.length, 4);
      assert.equal(history.runs[1].status, 'partial');
      assert.equal(history.runs[1].summary.applied, 3);
      assert.equal(JSON.stringify(history).includes('Updated managed part'), false);
    } finally {
      await db.end();
      await root`DROP SCHEMA ${root(schema)} CASCADE`;
      await root.end();
    }
  });
