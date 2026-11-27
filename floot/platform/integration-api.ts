import { createHash } from 'node:crypto';
import { z } from 'zod';
import { PlatformError } from './policy';

const tokenPattern = /^mops_stg_[A-Za-z0-9_-]{43}$/;
const text = z.string().trim().min(1).max(200);
const listQuery = z.object({
  q: text.min(2),
  after: z.uuid().optional(),
  limit: z.string().regex(/^[1-9][0-9]?$/).transform(Number).pipe(z.number().max(50)).optional(),
});
const routes = new Map<string, 'customers' | 'parts'>([
  ['/api/v1/customers', 'customers'],
  ['/api/v1/customers/lookup', 'customers'],
  ['/api/v1/parts', 'parts'],
  ['/api/v1/parts/lookup', 'parts'],
]);

export function integrationTokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function integrationApiStore(sql: any) {
  const customerSummary = sql`id, first_name AS "firstName", last_name AS "lastName", company_name AS "companyName",
    CASE WHEN source_system = 'lightspeed' THEN source_number END AS "lightspeedNumber",
    status, updated_at AS "updatedAt"`;
  const customerDetail = sql`${customerSummary}, nullif(email, '') AS email,
    coalesce(nullif(mobile_phone, ''), nullif(home_phone, ''), nullif(work_phone, '')) AS phone`;
  const partFields = sql`p.id, p.part_number AS "partNumber", p.supplier_code AS "supplierCode",
    p.description, p.active, p.data->>'on_hand' AS "onHand", p.data->>'available' AS available,
    greatest(p.created_at, p.lightspeed_quantity_updated_at, (SELECT m.created_at FROM part_stock_movements m
      WHERE m.company_id=p.company_id AND m.part_id=p.id ORDER BY m.id DESC LIMIT 1)) AS "quantityUpdatedAt"`;
  return {
    async access(hash: string, dataset: 'customers' | 'parts') {
      const tool = dataset === 'customers' ? 'customers' : 'parts-inventory';
      const [key] = await sql`
        SELECT k.id, k.company_id AS "companyId",
          (c.status='active' AND coalesce(t.available, false)
            AND (t.rollout_company_id IS NULL OR t.rollout_company_id=c.id)
            AND coalesce(e.status='enabled', false)
            AND CASE WHEN ${dataset}='customers' THEN k.customers_read ELSE k.parts_read END) AS allowed
        FROM integration_api_keys k
        JOIN platform_companies c ON c.id=k.company_id
        LEFT JOIN platform_entitlements e ON e.company_id=c.id AND e.tool_key=${tool}
        LEFT JOIN platform_tools t ON t.key=e.tool_key
        WHERE k.token_hash=${hash} AND k.revoked_at IS NULL AND k.expires_at>now()`;
      return key as { id: string; companyId: string; allowed: boolean } | undefined;
    },
    customers(company: string, q: string, after: string | null, limit: number) {
      return sql`SELECT ${customerSummary} FROM customers
        WHERE company_id=${company} AND (${after}::uuid IS NULL OR id>${after}::uuid)
          AND strpos(lower(concat_ws(' ', first_name, last_name, company_name, last_name||', '||first_name,
            CASE WHEN source_system='lightspeed' THEN source_number END)),lower(${q}))>0
        ORDER BY id LIMIT ${limit}`;
    },
    async customer(company: string, id: string | null, number: string | null) {
      const [customer] = await sql`SELECT ${customerDetail} FROM customers WHERE company_id=${company}
        AND (id=${id}::uuid OR (source_system='lightspeed' AND source_number=${number}))`;
      return customer;
    },
    parts(company: string, q: string, after: string | null, limit: number) {
      return sql`SELECT ${partFields} FROM inventory_parts p
        WHERE p.company_id=${company} AND (${after}::uuid IS NULL OR p.id>${after}::uuid)
          AND strpos(lower(concat_ws(' ',p.part_number,p.supplier_code,p.description)),lower(${q}))>0
        ORDER BY p.id LIMIT ${limit}`;
    },
    async part(company: string, supplier: string, number: string) {
      const [part] = await sql`SELECT ${partFields} FROM inventory_parts p
        WHERE p.company_id=${company} AND p.supplier_code=${supplier} AND p.part_number=${number}`;
      return part;
    },
  };
}

export function integrationApiHandler(store: ReturnType<typeof integrationApiStore>, log = console.info) {
  return async (request: Request) => {
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    const url = new URL(request.url);
    const route = url.pathname;
    const dataset = routes.get(route);
    const lookup = route.endsWith('/lookup');
    let status = 500;
    let keyId: string | undefined;
    const respond = (body: unknown, code = 200, extra: Record<string, string> = {}) => {
      status = code;
      return Response.json(body, { status, headers: { ...headers, ...extra } });
    };
    if (!dataset) return respond({ error: 'Not found.' }, 404);
    try {
      if (request.method !== 'GET') return respond({ error: 'Only GET is supported.' }, 405, { Allow: 'GET' });
      const token = /^Bearer ([^ ]+)$/i.exec(request.headers.get('authorization') ?? '')?.[1];
      const key = token && tokenPattern.test(token) ? await store.access(integrationTokenHash(token), dataset) : undefined;
      if (!key) return respond({ error: 'A valid integration token is required.' }, 401, { 'WWW-Authenticate': 'Bearer' });
      keyId = key.id;
      if (!key.allowed) return respond({ error: 'This integration cannot access the requested data.' }, 403);
      const query = Object.fromEntries(url.searchParams);
      if (url.searchParams.size !== Object.keys(query).length) throw new PlatformError(400, 'Duplicate query parameter.');
      const company = key.companyId;
      if (lookup) {
        const row = dataset === 'customers'
          ? await customerLookup(store, company, query)
          : await partLookup(store, company, query);
        return row ? respond(row) : respond({ error: 'Record not found.' }, 404);
      }
      const { q, after, limit = 25 } = listQuery.strict().parse(query);
      const rows = await store[dataset](company, q, after ?? null, limit + 1);
      const items = rows.slice(0, limit);
      return respond({ items, nextCursor: rows.length > limit ? items[limit - 1].id : null });
    } catch (error) {
      if (error instanceof z.ZodError) return respond({ error: 'Invalid query parameters.' }, 400);
      if (error instanceof PlatformError) return respond({ error: error.message }, error.status);
      return respond({ error: 'Integration API temporarily unavailable.' }, 503);
    } finally {
      log(JSON.stringify({ event: 'integration_api.request', keyId, dataset, operation: lookup ? 'lookup' : 'search', status }));
    }
  };
}

async function customerLookup(store: ReturnType<typeof integrationApiStore>, company: string, query: Record<string, string>) {
  const { id, number } = z.object({ id: z.uuid().optional(), number: text.optional() }).strict()
    .refine(value => Boolean(value.id) !== Boolean(value.number)).parse(query);
  return store.customer(company, id ?? null, number ?? null);
}

async function partLookup(store: ReturnType<typeof integrationApiStore>, company: string, query: Record<string, string>) {
  const { supplier, number } = z.object({ supplier: text, number: text }).strict().parse(query);
  return store.part(company, supplier, number);
}
