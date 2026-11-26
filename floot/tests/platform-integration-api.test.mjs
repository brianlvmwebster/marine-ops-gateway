import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { integrationApiHandler, integrationApiStore, integrationTokenHash } from '../platform/integration-api.ts';
import { LAKEVIEW_ID } from '../platform/policy.ts';

const origin = 'https://staging.example.invalid/api/v1';
const token = () => 'mops_stg_' + randomBytes(32).toString('base64url');
const call = (handler, path, bearer, method = 'GET') => handler(new Request(origin + path, {
  method,
  headers: bearer ? { Authorization: 'Bearer ' + bearer } : {},
}));

test('integration API denies browser-only requests, write methods and unknown routes', async () => {
  const handler = integrationApiHandler({}, () => {});
  const anonymous = await handler(new Request(origin + '/customers', { headers: { Cookie: 'session=example' } }));
  assert.equal(anonymous.status, 401);
  assert.equal(anonymous.headers.get('www-authenticate'), 'Bearer');
  assert.equal(anonymous.headers.get('cache-control'), 'no-store');
  const write = await call(handler, '/parts/lookup', token(), 'POST');
  assert.equal(write.status, 405);
  assert.equal(write.headers.get('allow'), 'GET');
  assert.equal((await call(handler, '/customers/save')).status, 404);
});

test('integration queries validate inputs and log without request details', async () => {
  const logs = [];
  const bearer = token();
  const key = { id: randomUUID(), companyId: LAKEVIEW_ID, allowed: true };
  const handler = integrationApiHandler({
    access: async digest => {
      assert.equal(digest, integrationTokenHash(bearer));
      return key;
    },
  }, line => logs.push(line));
  for (const path of ['/customers?q=private&q=other', '/customers?q=private&companyId=' + randomUUID(),
    '/customers?q=a', '/customers?q=private&limit=51', '/customers/lookup?id=bad',
    '/customers/lookup?number=001&id=' + randomUUID(), '/parts/lookup?number=001']) {
    assert.equal((await call(handler, path, bearer)).status, 400);
  }
  assert.ok(logs.every(line => !line.includes('private') && !line.includes(bearer)));
  assert.ok(logs.every(line => JSON.parse(line).keyId === key.id));
});

test('integration API projects company-scoped rows and enforces grants, revocation and expiry',
  { skip: !process.env.TEST_DATABASE_URL }, async () => {
    const schema = 'test_integration_' + randomUUID().replaceAll('-', '');
    const root = postgres(process.env.TEST_DATABASE_URL, { onnotice: () => {} });
    await root`CREATE SCHEMA ${root(schema)}`;
    const db = postgres(process.env.TEST_DATABASE_URL, { connection: { search_path: schema }, onnotice: () => {} });
    try {
      await db`CREATE TABLE users(id integer PRIMARY KEY)`;
      await db`CREATE TABLE native_gateway_members(auth_user_id integer,role text,enabled boolean)`;
      await db`CREATE TABLE service_jobs(id uuid PRIMARY KEY)`;
      const connection = await db.reserve();
      try {
        for (const migration of ['007-platform-foundation', '008-customers', '012-parts-inventory',
          '013-part-stock-movements', '018-integration-api', '018-integration-api', '020-parts-import-updates']) {
          await connection.unsafe(await readFile(new URL('../migrations/' + migration + '.sql', import.meta.url), 'utf8'));
        }
      } finally {
        connection.release();
      }
      const company = randomUUID();
      await db`INSERT INTO platform_companies(id,slug,name) VALUES (${company},'other','Other')`;
      await db`INSERT INTO platform_entitlements(company_id,tool_key,status) VALUES (${company},'customers','enabled')`;
      const first = randomUUID();
      const second = randomUUID();
      const outsider = randomUUID();
      await db`INSERT INTO customers(id,company_id,source_system,source_number,first_name,last_name,email,mobile_phone,notes)
        VALUES (${first},${LAKEVIEW_ID},'lightspeed','001','Fixture','Alpha','synthetic@example.invalid','555-0100','private notes'),
          (${second},${LAKEVIEW_ID},'lightspeed','002','Fixture','Beta','','',''),
          (${outsider},${company},'lightspeed','001','Fixture','Outside','','','')`;
      const part = randomUUID();
      const opening = db.json({ on_hand: '-1.25', available: '-1.50', replacement_cost: '99.99' });
      await db`INSERT INTO inventory_parts(id,company_id,supplier_code,part_number,description,active,data,opening_data,
        source_record,source_sha,source_batch,source_row)
        VALUES (${part},${LAKEVIEW_ID},'09','001','Fixture part',true,${opening},${opening},'[]','test','test',1)`;
      await db`INSERT INTO users VALUES (1)`;
      const movementDate = new Date(Date.now() + 1000);
      await db`INSERT INTO part_stock_movements(company_id,part_id,request_id,request,kind,quantity,
        before_on_hand,after_on_hand,before_available,after_available,reason,actor_user_id,actor_name,part_version,created_at)
        VALUES (${LAKEVIEW_ID},${part},${randomUUID()},'{}','adjust',-1, -0.25,-1.25,-0.50,-1.50,'fixture',1,'fixture',2,${movementDate})`;
      const register = async (companyId, customers, parts, options = {}) => {
        const value = token();
        const id = randomUUID();
        await db`INSERT INTO integration_api_keys(id,company_id,name,token_hash,customers_read,parts_read,created_at,expires_at)
          VALUES (${id},${companyId},'fixture',${integrationTokenHash(value)},${customers},${parts},
            now() - interval '2 days',now() + ${options.expired ? -1 : 1} * interval '1 day')`;
        return { value, id };
      };
      const reader = await register(LAKEVIEW_ID, true, true);
      const partsOnly = await register(LAKEVIEW_ID, false, true);
      const outside = await register(company, true, false);
      const expired = await register(LAKEVIEW_ID, true, false, { expired: true });
      const handler = integrationApiHandler(integrationApiStore(db), () => {});
      const read = async (path, bearer = reader.value) => {
        const response = await call(handler, path, bearer);
        assert.equal(response.status, 200);
        return response.json();
      };
      const page = await read('/customers?q=fixture&limit=1');
      assert.equal(page.items.length, 1);
      assert.equal(page.nextCursor, page.items[0].id);
      assert.equal('email' in page.items[0], false);
      const next = await read('/customers?q=fixture&limit=1&after=' + page.nextCursor);
      assert.deepEqual(new Set([page.items[0].id, next.items[0].id]), new Set([first, second]));
      assert.equal(next.nextCursor, null);
      assert.equal((await read('/customers?q=%25%25')).items.length, 0);
      const customer = await read('/customers/lookup?number=001');
      assert.deepEqual(await read('/customers/lookup?id=' + first), customer);
      assert.equal(customer.id, first);
      assert.equal(customer.phone, '555-0100');
      assert.equal(customer.email, 'synthetic@example.invalid');
      for (const key of ['notes', 'addresses', 'source_record']) assert.equal(key in customer, false);
      assert.equal((await call(handler, '/customers/lookup?number=001', outside.value)).status, 403);
      await db`UPDATE platform_tools SET rollout_company_id=NULL WHERE key='customers'`;
      assert.equal((await read('/customers/lookup?number=001', outside.value)).id, outsider);
      assert.equal((await call(handler, '/customers/lookup?id=' + outsider, reader.value)).status, 404);
      assert.equal((await call(handler, '/customers?q=fixture', partsOnly.value)).status, 403);
      assert.equal((await call(handler, '/customers?q=fixture', expired.value)).status, 401);
      const inventory = await read('/parts/lookup?supplier=09&number=001', partsOnly.value);
      assert.deepEqual(await read('/parts?q=fixture'), { items: [inventory], nextCursor: null });
      assert.equal(inventory.onHand, '-1.25');
      assert.equal(inventory.available, '-1.50');
      assert.equal(inventory.quantityUpdatedAt, movementDate.toISOString());
      assert.equal('replacementCost' in inventory, false);
      await db`UPDATE platform_entitlements SET status='disabled' WHERE company_id=${LAKEVIEW_ID} AND tool_key='parts-inventory'`;
      assert.equal((await call(handler, '/parts?q=fixture', reader.value)).status, 403);
      await db`UPDATE platform_companies SET status='suspended' WHERE id=${company}`;
      assert.equal((await call(handler, '/customers?q=fixture', outside.value)).status, 403);
      await db`UPDATE integration_api_keys SET revoked_at=now() WHERE id=${reader.id}`;
      assert.equal((await call(handler, '/customers?q=fixture', reader.value)).status, 401);
    } finally {
      await db.end();
      await root`DROP SCHEMA ${root(schema)} CASCADE`;
      await root.end();
    }
  });
