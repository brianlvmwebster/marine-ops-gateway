import {schema as legacySchema} from '../endpoints/jobs/save_POST.schema.ts';
import {z} from 'zod';
import {LAKEVIEW_ID,PlatformError} from './policy.ts';
import {platformStore} from './store.ts';
import {serviceTime} from '../helpers/serviceTime.tsx';

export const linkedJobInput=legacySchema.extend({customerId:z.uuid().optional(),unitId:z.uuid().optional()});
// Job and customer relationship commit together. This store is registered only by staging.
export function serviceJobSaveStore(sql:any){return async(actor:number,input:unknown)=>{
 const p=linkedJobInput.parse(input);
 await platformStore(sql).toolAccess(actor,LAKEVIEW_ID,'service-desk');
 if(p.customerId||p.unitId)await platformStore(sql).toolAccess(actor,LAKEVIEW_ID,'customers');
 if(!p.id&&p.data.sourceSubmissionId)throw new PlatformError(400,'Imported records must be created by the sheet importer.');
 if(p.data.serviceDate)serviceTime.toUtc(p.data.serviceDate,p.data.time||'12:00');
 return sql.begin(async(tx:any)=>{
  const existing=p.id?(await tx`select * from service_jobs where id=${p.id} for update`)[0]:null;
  if(p.id&&!existing)throw new PlatformError(404,'Job not found.');
  if(existing&&existing.version!==p.version)throw new PlatformError(409,'This job changed. Reload the job before saving.');
  if(existing?.data.repairOrderIntake!==p.data.repairOrderIntake||(p.data.repairOrderIntake&&existing.data.ro!==p.data.ro))
   throw new PlatformError(409,'The repair order number and intake type are fixed.');
  if(p.data.status==='Completed'||p.data.adminReview||existing?.data.adminReview||existing?.data.status==='Completed')throw new PlatformError(400,'Completed jobs are locked. Use Service Admin review to complete a job.');
  if(existing&&(existing.data.sourceSubmissionId||'')!==(p.data.sourceSubmissionId||''))throw new PlatformError(400,'The source record identity cannot be changed.');
  const previous=p.id?(await tx`select customer_id from customer_service_jobs where job_id=${p.id}`)[0]:null;
  if(p.customerId){
   if(previous&&previous.customer_id!==p.customerId)throw new PlatformError(409,'This job is already linked to another customer.');
   const customer=(await tx`select id,status from customers where id=${p.customerId} and company_id=${LAKEVIEW_ID} for share`)[0];
   if(!customer)throw new PlatformError(404,'Lakeview customer not found.');
   if(customer.status!=='active'&&!previous)throw new PlatformError(409,'This customer is archived. Select an available customer.');
  }
  const previousUnit=p.id?(await tx`select unit_id from customer_unit_service_jobs where job_id=${p.id}`)[0]:null;
  if(p.unitId){
   if(previousUnit&&previousUnit.unit_id!==p.unitId)throw new PlatformError(409,'This job is already linked to another unit.');
   if(!previousUnit){
    const customerId=previous?.customer_id||p.customerId;
    if(!customerId)throw new PlatformError(400,'Choose a customer before selecting a unit.');
    const unit=(await tx`select id,customer_id,status from customer_units where company_id=${LAKEVIEW_ID} and id=${p.unitId} for share`)[0];
    if(!unit)throw new PlatformError(404,'Lakeview unit not found.');
    if(unit.customer_id!==customerId)throw new PlatformError(409,'This unit is not assigned to the selected customer. Reload the customer units.');
    if(unit.status!=='active')throw new PlatformError(409,'This unit is archived. Select an available unit.');
   }
  }
  const calendarEligible=p.calendarEligible??existing?.calendar_eligible??false;
  if(calendarEligible&&p.data.scheduleMode==='day')throw new PlatformError(400,'Day-based jobs stay on the job board. Use a timed appointment for Outlook.');
  if(calendarEligible&&(!p.data.serviceDate||!p.data.time||p.data.duration<15))throw new PlatformError(400,'Set a valid appointment before including this job in Outlook.');
  const [job]=existing?await tx`update service_jobs set data=${tx.json(p.data)},calendar_eligible=${calendarEligible},version=version+1,updated_at=now() where id=${p.id} returning id,version`:
   await tx`insert into service_jobs(data,calendar_eligible) values(${tx.json(p.data)},${calendarEligible}) returning id,version`;
  if(p.customerId&&!previous){await tx`insert into customer_service_jobs(company_id,customer_id,job_id) values(${LAKEVIEW_ID},${p.customerId},${job.id})`;
   await tx`insert into platform_audit(actor_user_id,company_id,action,detail) values(${actor},${LAKEVIEW_ID},'customer.job_linked',${tx.json({id:p.customerId,jobId:job.id})})`;}
  if(p.unitId&&!previousUnit){await tx`insert into customer_unit_service_jobs(company_id,unit_id,job_id) values(${LAKEVIEW_ID},${p.unitId},${job.id})`;
   await tx`insert into platform_audit(actor_user_id,company_id,action,detail) values(${actor},${LAKEVIEW_ID},'unit.job_linked',${tx.json({unitId:p.unitId,jobId:job.id})})`;}
  return {saved:true,id:job.id,version:job.version,syncError:null};
 });
};}
