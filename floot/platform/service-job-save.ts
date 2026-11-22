import {schema as legacySchema} from '../endpoints/jobs/save_POST.schema.ts';
import {z} from 'zod';
import {LAKEVIEW_ID,PlatformError} from './policy.ts';
import {platformStore} from './store.ts';
import {serviceTime} from '../helpers/serviceTime.tsx';

export const linkedJobInput=legacySchema.extend({customerId:z.uuid().optional()});
// Job and customer relationship commit together. This store is registered only by staging.
export function serviceJobSaveStore(sql:any){return async(actor:number,input:unknown)=>{
 const p=linkedJobInput.parse(input);
 await platformStore(sql).toolAccess(actor,LAKEVIEW_ID,'service-desk');
 if(p.customerId)await platformStore(sql).toolAccess(actor,LAKEVIEW_ID,'customers');
 if(!p.id&&p.data.sourceSubmissionId)throw new PlatformError(400,'Imported records must be created by the sheet importer.');
 if(p.data.serviceDate&&p.data.time)serviceTime.toUtc(p.data.serviceDate,p.data.time);
 return sql.begin(async(tx:any)=>{
  const existing=p.id?(await tx`select * from service_jobs where id=${p.id} for update`)[0]:null;
  if(p.id&&!existing)throw new PlatformError(404,'Job not found.');
  if(existing&&existing.version!==p.version)throw new PlatformError(409,'This job changed. Reload the job before saving.');
  if(p.data.status==='Completed'||p.data.adminReview||existing?.data.adminReview||existing?.data.status==='Completed')throw new PlatformError(400,'Completed jobs are locked. Use Service Admin review to complete a job.');
  if(existing&&(existing.data.sourceSubmissionId||'')!==(p.data.sourceSubmissionId||''))throw new PlatformError(400,'The source record identity cannot be changed.');
  const previous=p.id?(await tx`select customer_id from customer_service_jobs where job_id=${p.id}`)[0]:null;
  if(p.customerId){
   if(previous&&previous.customer_id!==p.customerId)throw new PlatformError(409,'This job is already linked to another customer.');
   const customer=(await tx`select id,status from customers where id=${p.customerId} and company_id=${LAKEVIEW_ID} for share`)[0];
   if(!customer)throw new PlatformError(404,'Lakeview customer not found.');
   if(customer.status!=='active'&&!previous)throw new PlatformError(409,'This customer is archived. Select an available customer.');
  }
  const calendarEligible=p.calendarEligible??existing?.calendar_eligible??false;
  if(calendarEligible&&(!p.data.serviceDate||!p.data.time||p.data.duration<15))throw new PlatformError(400,'Set a valid appointment before including this job in Outlook.');
  const [job]=existing?await tx`update service_jobs set data=${tx.json(p.data)},calendar_eligible=${calendarEligible},version=version+1,updated_at=now() where id=${p.id} returning id,version`:
   await tx`insert into service_jobs(data,calendar_eligible) values(${tx.json(p.data)},${calendarEligible}) returning id,version`;
  if(p.customerId&&!previous){await tx`insert into customer_service_jobs(company_id,customer_id,job_id) values(${LAKEVIEW_ID},${p.customerId},${job.id})`;
   await tx`insert into platform_audit(actor_user_id,company_id,action,detail) values(${actor},${LAKEVIEW_ID},'customer.job_linked',${tx.json({id:p.customerId,jobId:job.id})})`;}
  return {saved:true,id:job.id,version:job.version,syncError:null};
 });
};}
