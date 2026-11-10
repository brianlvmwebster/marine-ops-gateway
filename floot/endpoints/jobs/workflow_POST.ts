import {gatewayFailure} from '../../helpers/gatewayResponse';
import {requireViewer} from '../../helpers/serviceViewer';
import superjson from 'superjson';
import {db} from '../../helpers/db';
import {schema} from './workflow_POST.schema';
import {applyJobWorkflow} from '../../helpers/applyJobWorkflow';
import {assignmentOptionSchema} from '../../helpers/workflowModel';
import {jobModel} from '../../helpers/jobModel';
import {calendarSyncEnabled} from '../../helpers/calendarSyncSettings';
import {syncCalendar} from '../../helpers/syncCalendar';
import {sql} from 'kysely';

async function handleAuthorized(request:Request){
  await requireViewer(request);
  try{
    const p=schema.parse(superjson.parse(await request.text()));
    const result=await db.transaction().execute(async trx=>{
      const job=await trx.selectFrom('serviceJobs').selectAll().where('id','=',p.id).forUpdate().executeTakeFirst();
      if(!job)return {error:'Job not found',status:404};
      if(job.version!==p.version)return {error:'This job changed in another window. Refresh before updating it.',status:409};
      const options=p.assignmentId?(await sql`select id, kind, name, member_ids as "memberIds", version from service_assignment_options where id = ${p.assignmentId}::uuid`.execute(trx)).rows.map(row=>assignmentOptionSchema.parse(row)):[];
      const original=job.data&&typeof job.data==='object'&&!Array.isArray(job.data)?job.data:{};
      const data={...original,...applyJobWorkflow(jobModel.parse(job.data),p,options)};
      const changed=await trx.updateTable('serviceJobs').set({data,version:p.version+1,updatedAt:new Date()}).where('id','=',p.id).where('version','=',p.version).returning('id').executeTakeFirst();
      return changed?{saved:true}:{error:'This job changed. Refresh before updating it.',status:409};
    });
    if('error' in result)return new Response(superjson.stringify({error:result.error}),{status:result.status});
    let syncError:string|null=null;
    try{if(await calendarSyncEnabled())syncError=(await syncCalendar({id:p.id})).error||null;}catch(e){syncError=e instanceof Error?e.message:'Calendar sync failed';}
    return new Response(superjson.stringify({saved:true,syncError}));
  }catch(e){return new Response(superjson.stringify({error:e instanceof Error?e.message:'Update failed'}),{status:400});}
}

export async function handle(request:Request){try{return await handleAuthorized(request);}catch(error){return gatewayFailure(error);}}
