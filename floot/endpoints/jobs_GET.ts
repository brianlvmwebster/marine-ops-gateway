import {gatewayFailure} from '../helpers/gatewayResponse';
import {normalizeJobStage} from '../helpers/jobStage';import {jobModel} from '../helpers/jobModel';
import type { RepairChecklistItem } from '../helpers/repairOrders';
import { platformDatabase } from '../platform/database';
import {requireViewer} from '../helpers/serviceViewer';import {db} from '../helpers/db';import superjson from 'superjson';
async function handleAuthorized(request: Request) {
  await requireViewer(request);
  const jobs = await db.selectFrom('serviceJobs').selectAll().orderBy('createdAt','desc').limit(2000).execute();
  const staging = process.env.APP_ENV === 'staging';
  const checklists = new Map<string, RepairChecklistItem[]>();
  if (staging && jobs.length) {
    const sql = platformDatabase();
    const rows = await sql<{ order_id: string; checklist: RepairChecklistItem[] }[]>`
      select order_id,jsonb_agg(jsonb_build_object('id',id,'title',title,'status',status) order by position) as checklist
      from repair_order_lines where order_id=any(${jobs.map(job => job.id)}::uuid[]) group by order_id`;
    for (const row of rows) checklists.set(row.order_id, row.checklist);
  }
  return new Response(superjson.stringify({
    jobs: jobs.map(job => ({
      ...job,
      data: normalizeJobStage(jobModel.parse(job.data)),
      ...(staging ? { repairChecklist: checklists.get(job.id) ?? [] } : {}),
    })),
  }));
}
export async function handle(request:Request){try{return await handleAuthorized(request);}catch(error){return gatewayFailure(error);}}
