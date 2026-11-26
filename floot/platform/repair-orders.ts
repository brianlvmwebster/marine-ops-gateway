import { createHash } from 'node:crypto';
import { z } from 'zod';
import { customerJobContact } from '../helpers/customerJobContact';
import { emptyJob, jobModel } from '../helpers/jobModel';
import { repairLineStatuses, repairOrderPageSize, repairOrderSorts } from '../helpers/repairOrders';
import { unitJobVessel } from '../helpers/unitJobVessel';
import { jobStatuses } from '../helpers/workflowModel';
import { readBody } from './customers';
import { LAKEVIEW_ID, PlatformError, requireSameOrigin } from './policy';
import { platformStore } from './store';

const uuid = z.uuid();
const notes = z.string().max(10000);
const line = z.object({
  id: uuid,
  title: z.string().trim().min(1).max(250),
  notes: z.string().max(4000),
  status: z.enum(repairLineStatuses),
}).strict();
const lines = z.array(line).max(50).refine(items => new Set(items.map(item => item.id)).size === items.length);
const createInput = z.object({
  id: uuid, customerId: uuid, unitId: uuid, notes, lines: lines.refine(items => items.length > 0),
}).strict();
const updateInput = z.object({ id: uuid, version: z.number().int().positive(), notes, lines }).strict();
const listInput = z.object({
  q: z.string().trim().max(200),
  status: z.enum(['all', ...jobStatuses]),
  sort: z.enum(repairOrderSorts),
  page: z.coerce.number().int().min(0).max(100000),
});

export function repairOrdersStore(sql: any) {
  const platform = platformStore(sql);
  async function access(actor: number, company: string, creating = false) {
    if (company !== LAKEVIEW_ID) throw new PlatformError(403, 'Repair Orders is available for Lakeview only.');
    await platform.toolAccess(actor, company, 'service-desk');
    if (creating) await platform.toolAccess(actor, company, 'customers');
  }

  const fields = sql`j.id,j.version,j.created_at,j.updated_at,
    coalesce(nullif(trim(j.data->>'ro'),''),'Job #' || j.job_number) as number,
    trim(concat_ws(' ',j.data->>'firstName',j.data->>'lastName')) as customer_name,
    trim(concat_ws(' ',nullif(j.data->>'year','0'),j.data->>'make',j.data->>'model')) as unit_description,
    coalesce(j.data->>'hullId','') as unit_serial,
    case when j.data->>'status'='Completed' and not j.data ? 'adminReview' then 'Done' else j.data->>'status' end as status`;

  return {
    async list(actor: number, company: string, input: z.infer<typeof listInput>) {
      await access(actor, company);
      const pattern = '%' + input.q.replace(/[\\%_]/g, '\\$&') + '%';
      const order = {
        newest: sql`created_at desc nulls last,id desc`,
        oldest: sql`created_at asc nulls last,id asc`,
        updated: sql`updated_at desc nulls last,id desc`,
        customer: sql`lower(customer_name),created_at desc nulls last,id desc`,
      };
      const rows = await sql`with orders as (
        select ${fields},j.job_number from service_jobs j
      ), filtered as (
        select * from orders where (${input.status}='all' or status=${input.status})
          and concat_ws(' ',number,job_number,customer_name,unit_description,unit_serial) ilike ${pattern}
      ), paged as (
        select * from filtered order by ${order[input.sort]}
        limit ${repairOrderPageSize} offset ${input.page * repairOrderPageSize}
      )
      select (select count(*)::integer from filtered) as total, coalesce((
        select jsonb_agg(to_jsonb(paged) || jsonb_build_object('line_count',(
          select count(*) from repair_order_lines where order_id=paged.id
        )) order by ${order[input.sort]}) from paged
      ),'[]'::jsonb) as rows`;
      return rows[0];
    },

    async detail(actor: number, company: string, id: string) {
      await access(actor, company);
      const [order] = await sql`select ${fields},c.customer_id,u.unit_id,coalesce(j.data->>'notes','') as notes,
        (j.data->>'status'='Completed' and j.data ? 'adminReview') as locked,
        coalesce((
          select jsonb_agg(jsonb_build_object('id',l.id,'title',l.title,'notes',l.notes,'status',l.status) order by l.position)
          from repair_order_lines l where l.order_id=j.id
        ),'[]'::jsonb) as lines
        from service_jobs j
        left join customer_service_jobs c on c.job_id=j.id and c.company_id=${company}
        left join customer_unit_service_jobs u on u.job_id=j.id and u.company_id=${company}
        where j.id=${id}`;
      if (!order) throw new PlatformError(404, 'Repair order not found.');
      return { ...order, line_count: order.lines.length };
    },

    async create(actor: number, company: string, value: unknown) {
      const input = createInput.parse(value);
      await access(actor, company, true);
      const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
      return sql.begin(async (tx: any) => {
        await tx`select pg_advisory_xact_lock(hashtextextended(${input.id},0))`;
        const [previous] = await tx`select submission_hash from repair_order_intakes where order_id=${input.id}`;
        if (previous) {
          if (previous.submission_hash !== hash) throw new PlatformError(409, 'This submission was already saved. Reopen the order from the list.');
          return { id: input.id };
        }
        const [customer] = await tx`select * from customers where company_id=${company} and id=${input.customerId} for share`;
        if (!customer || customer.status !== 'active') throw new PlatformError(409, 'Choose an available customer.');
        const [unit] = await tx`select * from customer_units where company_id=${company} and id=${input.unitId} for share`;
        if (!unit || unit.status !== 'active' || unit.customer_id !== customer.id)
          throw new PlatformError(409, 'Choose an available unit assigned to the selected customer.');

        const contact = customerJobContact(customer);
        const vessel = unitJobVessel(unit);
        const data = jobModel.parse({
          ...emptyJob, ...contact, ...vessel, repairOrderIntake: true,
          firstName: contact.firstName.slice(0, 200), lastName: contact.lastName.slice(0, 200),
          phone: contact.phone.slice(0, 200), email: contact.email.slice(0, 300),
          year: vessel.year.slice(0, 100), make: vessel.make.slice(0, 300),
          model: (vessel.model || unit.name || unit.length).slice(0, 300),
          notes: input.notes, scheduleMode: 'day', time: '', duration: 0,
        });
        const [order] = await tx`insert into service_jobs(id,data,calendar_eligible) values
          (${input.id},${tx.json(data)},false) on conflict(id) do nothing returning job_number`;
        if (!order) throw new PlatformError(409, 'That submission is already in use.');
        await tx`update service_jobs set data=jsonb_set(data,'{ro}',to_jsonb(${'RO-'+order.job_number}::text)) where id=${input.id}`;
        await tx`insert into repair_order_intakes(order_id,submission_hash) values(${input.id},${hash})`;
        await tx`insert into customer_service_jobs(company_id,customer_id,job_id) values(${company},${customer.id},${input.id})`;
        await tx`insert into customer_unit_service_jobs(company_id,unit_id,job_id) values(${company},${unit.id},${input.id})`;
        await saveLines(tx, input.id, input.lines, []);
        await tx`insert into platform_audit(actor_user_id,company_id,action,detail) values
          (${actor},${company},'repair_order.created',${tx.json({ id: input.id, lineCount: input.lines.length })})`;
        return { id: input.id };
      });
    },

    async update(actor: number, company: string, value: unknown) {
      const input = updateInput.parse(value);
      await access(actor, company);
      return sql.begin(async (tx: any) => {
        const [order] = await tx`select id,version,data from service_jobs where id=${input.id} for update`;
        if (!order) throw new PlatformError(404, 'Repair order not found.');
        if (order.version !== input.version) throw new PlatformError(409, 'This repair order changed. Reopen it before saving.');
        if (order.data.status === 'Completed' && order.data.adminReview)
          throw new PlatformError(409, 'This completed order is locked after Service Admin review.');
        const previous = await tx`select id from repair_order_lines where order_id=${input.id} order by position`;
        if (previous.some((item: { id: string }, i: number) => input.lines[i]?.id !== item.id))
          throw new PlatformError(400, 'Existing job lines must stay on the order. Use Cancelled for work that will not proceed.');
        await saveLines(tx, input.id, input.lines, previous);
        await tx`update service_jobs set data=jsonb_set(data,'{notes}',to_jsonb(${input.notes}::text)),
          version=version+1,updated_at=now() where id=${input.id}`;
        await tx`insert into platform_audit(actor_user_id,company_id,action,detail) values
          (${actor},${company},'repair_order.updated',${tx.json({ id: input.id, lineCount: input.lines.length })})`;
        return { id: input.id };
      });
    },
  };
}

async function saveLines(tx: any, orderId: string, items: z.infer<typeof lines>, previous: { id: string }[]) {
  for (const [index, item] of items.entries()) {
    if (index < previous.length) {
      await tx`update repair_order_lines set title=${item.title},notes=${item.notes},status=${item.status}
        where id=${item.id} and order_id=${orderId}`;
    } else {
      const inserted = await tx`insert into repair_order_lines(id,order_id,position,title,notes,status) values
        (${item.id},${orderId},${index + 1},${item.title},${item.notes},${item.status}) on conflict(id) do nothing returning id`;
      if (!inserted.length) throw new PlatformError(409, 'This job line already belongs to a repair order.');
    }
  }
}

export function repairOrdersHandler(store: ReturnType<typeof repairOrdersStore>, authenticate: (request: Request) => Promise<number>) {
  return async (request: Request) => {
    try {
      let actor: number;
      try { actor = await authenticate(request); } catch { throw new PlatformError(401, 'Sign in to continue.'); }
      if (!Number.isSafeInteger(actor) || actor <= 0) throw new PlatformError(401, 'Sign in to continue.');
      const { pathname, searchParams } = new URL(request.url);
      const company = uuid.parse(searchParams.get('companyId'));
      if (request.method === 'GET' && pathname === '/_api/repair-orders') {
        const id = searchParams.get('id');
        if (id) return Response.json(await store.detail(actor, company, uuid.parse(id)));
        return Response.json(await store.list(actor, company, listInput.parse({
          q: searchParams.get('q') ?? '', status: searchParams.get('status') ?? 'all',
          sort: searchParams.get('sort') ?? 'newest', page: searchParams.get('page') ?? '0',
        })));
      }
      if (request.method === 'POST' && ['/_api/repair-orders/create', '/_api/repair-orders/update'].includes(pathname)) {
        requireSameOrigin(request);
        const body = await readBody(request);
        return Response.json(pathname.endsWith('/create')
          ? await store.create(actor, company, body) : await store.update(actor, company, body));
      }
      return Response.json({ error: 'Not found.' }, { status: 404 });
    } catch (error) {
      if (error instanceof PlatformError) return Response.json({ error: error.message }, { status: error.status });
      if (error instanceof z.ZodError) return Response.json({ error: 'Check the repair order fields. New orders need a customer, a unit, and at least one job.' }, { status: 400 });
      console.error('Repair order operation failed');
      return Response.json({ error: 'Repair Orders is temporarily unavailable.' }, { status: 503 });
    }
  };
}
