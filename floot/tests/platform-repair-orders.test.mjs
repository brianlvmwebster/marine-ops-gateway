import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { repairOrdersHandler, repairOrdersStore } from '../platform/repair-orders.ts';
import { serviceJobSaveStore } from '../platform/service-job-save.ts';
import { LAKEVIEW_ID } from '../platform/policy.ts';
import { emptyJob, jobModel } from '../helpers/jobModel.tsx';

const origin = 'https://example.invalid';
const url = origin + '/_api/repair-orders';
const actor = async () => 1;
const post = (action, value, requestOrigin = origin) => new Request(url + '/' + action + '?companyId=' + LAKEVIEW_ID, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: requestOrigin }, body: JSON.stringify(value),
});

test('repair orders reject anonymous users, invalid filters, cross-origin saves and incomplete new orders', async () => {
  const sql = () => {};
  const store = repairOrdersStore(sql);
  const handler = repairOrdersHandler(store, actor);
  const list = new Request(url + '?companyId=' + LAKEVIEW_ID);
  assert.equal((await repairOrdersHandler(store, async () => 0)(list)).status, 401);
  assert.equal((await handler(post('create', {}, 'https://other.invalid'))).status, 403);
  assert.equal((await handler(post('create', {}))).status, 400);
  assert.equal((await handler(new Request(list.url + '&sort=unknown'))).status, 400);
});

test('repair orders retain existing service rows and save separate job lines atomically', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const bootstrap = postgres(process.env.TEST_DATABASE_URL);
  const schema = 'repair_orders_' + randomUUID().replaceAll('-', '');
  await bootstrap.unsafe('create schema ' + schema);
  const db = postgres(process.env.TEST_DATABASE_URL, {
    max: 1, connection: { search_path: schema }, onnotice: () => {},
  });
  try {
    await db.unsafe(await readFile(new URL('../staging/000-baseline.sql', import.meta.url), 'utf8'));
    await db`create table native_gateway_members(auth_user_id integer,role text,enabled boolean)`;
    await db`insert into users(id,email,display_name) values(1,'owner@example.invalid','Owner'),(2,'other@example.invalid','Other')`;
    await db`insert into native_gateway_members values(1,'admin',true)`;
    for (const name of ['007-platform-foundation', '008-customers', '022-customer-company-name', '010-customer-units', '011-service-job-units', '021-repair-orders']) {
      await db.unsafe(await readFile(new URL('../migrations/' + name + '.sql', import.meta.url), 'utf8'));
    }
    const customer = randomUUID(), other = randomUUID(), unit = randomUUID(), wrongUnit = randomUUID(), legacy = randomUUID();
    await db`insert into customers(id,company_id,last_name) values (${customer},${LAKEVIEW_ID},'Zulu'),(${other},${LAKEVIEW_ID},'Other')`;
    await db`insert into customer_units(id,company_id,customer_id,make,vin) values
      (${unit},${LAKEVIEW_ID},${customer},'Test Boat','TEST123'),(${wrongUnit},${LAKEVIEW_ID},${other},'Test Boat','TEST456')`;
    await db`insert into service_jobs(id,data,calendar_eligible) values
      (${legacy},${db.json({ ...emptyJob, ro: '000124', firstName: 'Alpha', status: 'Completed', sourceSubmissionId: 'test-legacy' })},false)`;

    const store = repairOrdersStore(db);
    const handler = repairOrdersHandler(store, actor);
    const line = { id: randomUUID(), title: 'Inspect steering', notes: '', status: 'Pending' };
    const draft = { id: randomUUID(), customerId: customer, unitId: unit, notes: 'Synthetic intake', lines: [line] };
    assert.equal((await handler(post('create', { ...draft, lines: [] }))).status, 400);
    assert.equal((await handler(post('create', { ...draft, unitId: wrongUnit }))).status, 409);
    assert.deepEqual(await store.create(1, LAKEVIEW_ID, draft), { id: draft.id });
    assert.deepEqual(await store.create(1, LAKEVIEW_ID, draft), { id: draft.id });
    await assert.rejects(store.create(1, LAKEVIEW_ID, { ...draft, notes: 'Changed' }), { status: 409 });
    let saved = await store.detail(1, LAKEVIEW_ID, draft.id);
    assert.match(saved.number, /^RO-\d+$/);
    assert.equal(saved.customer_id, customer);
    assert.equal(saved.unit_id, unit);
    assert.deepEqual(saved.lines, [line]);

    const [parent] = await db`select data,calendar_eligible from service_jobs where id=${draft.id}`;
    assert.equal(parent.calendar_eligible, false);
    assert.equal(jobModel.parse(parent.data).ro, saved.number);
    await assert.rejects(serviceJobSaveStore(db)(1, { id: draft.id, version: 1, data: { ...parent.data, ro: 'Changed' } }), { status: 409 });
    await assert.rejects(store.create(1, LAKEVIEW_ID, { ...draft, id: randomUUID() }), { status: 409 });
    const [parents] = await db`select count(*)::int as count from service_jobs`;
    assert.equal(parents.count, 2, 'job lines and rolled back submissions must not produce separate service records');

    const added = { ...line, id: randomUUID(), title: 'Check impeller' };
    const edit = { id: draft.id, version: 1, notes: 'Updated order', lines: [{ ...line, status: 'Done' }, added] };
    await store.update(1, LAKEVIEW_ID, edit);
    await assert.rejects(store.update(1, LAKEVIEW_ID, edit), { status: 409 });
    await assert.rejects(store.update(1, LAKEVIEW_ID, { ...edit, version: 2, lines: [added] }), { status: 400 });
    saved = await store.detail(1, LAKEVIEW_ID, draft.id);
    assert.equal(saved.version, 2);
    assert.equal(saved.notes, edit.notes);
    assert.deepEqual(saved.lines, edit.lines);

    const orders = await store.list(1, LAKEVIEW_ID, { q: '', sort: 'customer', status: 'all', page: 0 });
    assert.deepEqual(orders.rows.map(order => order.id), [legacy, draft.id]);
    const matched = await store.list(1, LAKEVIEW_ID, { q: '000124', sort: 'updated', status: 'Done', page: 0 });
    assert.equal(matched.total, 1);
    assert.equal(matched.rows[0].number, '000124');
    assert.equal(matched.rows[0].id, legacy);
    await store.update(1, LAKEVIEW_ID, { id: legacy, version: 1, notes: 'Existing order', lines: [{ ...added, id: randomUUID() }] });
    assert.equal((await store.detail(1, LAKEVIEW_ID, legacy)).lines.length, 1);
    await assert.rejects(store.detail(2, LAKEVIEW_ID, draft.id), { status: 403 });
    await assert.rejects(store.detail(1, randomUUID(), draft.id), { status: 403 });
  } finally {
    await db.end();
    await bootstrap.unsafe('drop schema ' + schema + ' cascade');
    await bootstrap.end();
  }
});
