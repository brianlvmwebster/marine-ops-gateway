import {gatewayFailure} from '../../helpers/gatewayResponse';
import {requireViewer} from '../../helpers/serviceViewer';import superjson from 'superjson';
import {db} from '../../helpers/db';import {schema} from './complete_POST.schema';
import {isServiceAdmin} from '../../helpers/serviceAccess';import {completeReviewedJob} from '../../helpers/serviceReview';import {jobModel} from '../../helpers/jobModel';
async function handleAuthorized(request:Request){
 const viewer=await requireViewer(request);
 if(!await isServiceAdmin(viewer.userId))return new Response(superjson.stringify({error:'Service Admin access required.'}),{status:403});
 try{const p=schema.parse(superjson.parse(await request.text()));const result=await db.transaction().execute(async trx=>{
  const job=await trx.selectFrom('serviceJobs').selectAll().where('id','=',p.id).forUpdate().executeTakeFirst();
  if(!job)return {error:'Job not found',status:404};
  if(job.version!==p.version)return {error:'This job changed. Refresh and review it again before completing.',status:409};
  const original=job.data&&typeof job.data==='object'&&!Array.isArray(job.data)?job.data:{};
  const data={...original,...completeReviewedJob(jobModel.parse(job.data),p,{userId:viewer.userId,isServiceAdmin:true})};
  await trx.updateTable('serviceJobs').set({data,version:p.version+1,updatedAt:new Date()}).where('id','=',p.id).where('version','=',p.version).execute();return {saved:true};
 });return new Response(superjson.stringify(result),{status:'status' in result?result.status:200});}catch(e){return new Response(superjson.stringify({error:e instanceof Error?e.message:'Could not complete job'}),{status:400});}
}

export async function handle(request:Request){try{return await handleAuthorized(request);}catch(error){return gatewayFailure(error);}}
