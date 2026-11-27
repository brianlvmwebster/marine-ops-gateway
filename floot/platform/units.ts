import {jobModel} from '../helpers/jobModel';
import {normalizeJobStage} from '../helpers/jobStage';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {platformStore} from './store';
import {LAKEVIEW_ID,PlatformError,requireManager,requireSameOrigin} from './policy';
import {readBody} from './customers';
const text=z.string().trim().max(500),uuid=z.uuid();
export const unitFields=z.object({make:text,model:text,vin:text,length:text,name:text,year:text,unit_type:text,notes:z.string().max(5000),status:z.enum(['active','archived']),reviewed:z.boolean()}).strict().refine(v=>!!(v.make||v.model||v.vin||v.name),'Enter a unit description.');
export const unitImportRow=z.object({row:z.number().int().positive(),customer_number:z.string().regex(/^\d+$/).max(100),make:text,model:text,vin:text,length:text,flags:z.array(z.enum(['repeated_vin','identical_row'])).max(2)}).strict();
export function unitsStore(sql:any){const platform=platformStore(sql);
 async function access(actor:number,company:string,write=false){const a=await platform.toolAccess(actor,company,'customers');if(write)requireManager(a);return a;}
 return{
 async serviceJob(actor:number,company:string,id:string,jobId:string){await access(actor,company);await platform.toolAccess(actor,company,'service-desk');if(company!==LAKEVIEW_ID)throw new PlatformError(403,'Service Desk is Lakeview-only.');
 const [j]=await sql`select j.* from customer_unit_service_jobs l join customer_units u on u.id=l.unit_id and u.company_id=l.company_id join service_jobs j on j.id=l.job_id where l.company_id=${company} and l.unit_id=${id} and l.job_id=${jobId}`;
 if(!j)throw new PlatformError(404,'Linked service job not found.');
 return {job:{id:j.id,jobNumber:String(j.job_number),version:j.version,data:normalizeJobStage(jobModel.parse(j.data)),calendarEligible:j.calendar_eligible,eventId:j.event_id,syncedVersion:j.synced_version,syncError:j.sync_error,remoteEtag:j.remote_etag,updatedAt:j.updated_at}};},
 async jobContext(actor:number,company:string,id:string){await access(actor,company);await platform.toolAccess(actor,company,'service-desk');if(company!==LAKEVIEW_ID)throw new PlatformError(403,'Service Desk is Lakeview-only.');
 const [unit]=await sql`select * from customer_units where company_id=${company} and id=${id}`;if(!unit)throw new PlatformError(404,'Unit not found.');
 if(unit.status!=='active')throw new PlatformError(409,'This unit is archived. Make it available before creating a job.');
 if(!unit.customer_id)throw new PlatformError(409,'Assign a customer and save the unit before creating a job.');
 const [customer]=await sql`select id,first_name,last_name,company_name,email,mobile_phone,home_phone,work_phone,source_number,status from customers where company_id=${company} and id=${unit.customer_id}`;
 if(!customer||customer.status!=='active')throw new PlatformError(409,'The assigned customer is unavailable. Update the customer assignment before creating a job.');return {customer,unit};},
 async history(actor:number,company:string,id:string,page:number){await access(actor,company);await platform.toolAccess(actor,company,'service-desk');if(company!==LAKEVIEW_ID)throw new PlatformError(403,'Service Desk is Lakeview-only.');
 const [unit]=await sql`select id from customer_units where company_id=${company} and id=${id}`;if(!unit)throw new PlatformError(404,'Unit not found.');
 const rows=await sql`select j.id,j.job_number,j.data->>'serviceDate' as service_date,j.data->>'status' as status,j.data->'services' as services from customer_unit_service_jobs l join service_jobs j on j.id=l.job_id where l.company_id=${company} and l.unit_id=${id} order by nullif(j.data->>'serviceDate','') desc nulls last,j.job_number desc,j.id limit 50 offset ${page*50}`;
 const [count]=await sql`select count(*)::integer as total from customer_unit_service_jobs where company_id=${company} and unit_id=${id}`;return {rows,total:count.total};},
 async job(actor:number,company:string,jobId:string){await access(actor,company);await platform.toolAccess(actor,company,'service-desk');if(company!==LAKEVIEW_ID)throw new PlatformError(403,'Service Desk is Lakeview-only.');const [unit]=await sql`select u.* from customer_units u join customer_unit_service_jobs l on l.unit_id=u.id and l.company_id=u.company_id where l.company_id=${company} and l.job_id=${jobId}`;return {unit:unit||null};},
 async list(actor:number,company:string,q:string,filter:string,page:number,customerId:string|null){const a=await access(actor,company);const pattern='%'+q.replace(/[\\%_]/g,'\\$&')+'%';
 const where=sql`u.company_id=${company} and (${customerId}::uuid is null or u.customer_id=${customerId}::uuid) and (${filter}='all' or (${filter}='active' and u.status='active') or (${filter}='archived' and u.status='archived') or (${filter}='review' and (u.customer_id is null or (not u.reviewed and u.review_flags<>'[]'::jsonb)))) and concat_ws(' ',u.name,u.make,u.model,u.vin,u.source_customer_number,c.first_name,c.last_name,nullif(c.company_name,'')) ilike ${pattern}`;
 const rows=await sql`select u.*,concat_ws(' · ',nullif(trim(concat_ws(' ',c.first_name,c.last_name)),''),nullif(c.company_name,'')) as customer_name from customer_units u left join customers c on c.id=u.customer_id and c.company_id=u.company_id where ${where} order by u.created_at desc,u.id limit 50 offset ${page*50}`;
 const [count]=await sql`select count(*)::integer as total from customer_units u left join customers c on c.id=u.customer_id and c.company_id=u.company_id where ${where}`;
 return {rows,total:count.total,canManage:['owner','admin'].includes(a.role)};},
 async save(actor:number,company:string,id:string|undefined,version:number,customerId:string|null,data:z.infer<typeof unitFields>){await access(actor,company,true);data=unitFields.parse(data);return sql.begin(async(tx:any)=>{
 const [before]=id?await tx`select * from customer_units where company_id=${company} and id=${id} for update`:[];
 if(id&&!before)throw new PlatformError(404,'Unit not found.');
 if((before?.version||0)!==version)throw new PlatformError(409,'Unit changed. Reload before saving.');
 if(customerId&&customerId!==before?.customer_id){const [c]=await tx`select id,status from customers where company_id=${company} and id=${customerId} for share`;if(!c)throw new PlatformError(404,'Customer not found in this company.');if(c.status!=='active')throw new PlatformError(409,'Select an available customer.');}
 const rows=before?await tx`update customer_units set ${tx({...data,customer_id:customerId})},version=version+1,updated_at=now() where company_id=${company} and id=${id} returning id,version`:await tx`insert into customer_units ${tx({id:randomUUID(),company_id:company,customer_id:customerId,...data})} returning id,version`;
 await tx`insert into platform_audit(actor_user_id,company_id,action,detail) values(${actor},${company},'unit.saved',${tx.json({id:rows[0].id,previousCustomerId:before?.customer_id||null,customerId,version:rows[0].version})})`;return rows[0];});},
 async import(actor:number,company:string,batch:string,input:z.infer<typeof unitImportRow>[]){await access(actor,company,true);const rows=z.array(unitImportRow).min(1).max(200).parse(input);z.string().regex(/^[a-f0-9]{64}$/).parse(batch);return sql.begin(async(tx:any)=>{
 await tx`select id from platform_companies where id=${company} for update`;
 const [prior]=await tx`select batch_hash from customer_unit_imports where company_id=${company}`;
 if(prior&&prior.batch_hash!==batch)throw new PlatformError(409,'A different unit export was already imported. Review new-file matches before importing again.');
 await tx`insert into customer_unit_imports(company_id,batch_hash) values(${company},${batch}) on conflict do nothing`;
 let inserted=0,skipped=0,unassigned=0,excluded=0;
 for(const row of rows){if(/^0+$/.test(row.customer_number)){excluded++;continue;}
 const [existing]=await tx`select id,source_record=${tx.json(row)} as same from customer_units where company_id=${company} and source_batch=${batch} and source_row=${row.row}`;
 if(existing){if(!existing.same)throw new PlatformError(409,'Import row differs from its original source.');skipped++;continue;}
 const [customer]=await tx`select id from customers where company_id=${company} and source_system='lightspeed' and source_number=${row.customer_number}`;
 await tx`insert into customer_units ${tx({id:randomUUID(),company_id:company,customer_id:customer?.id||null,make:row.make,model:row.model,vin:row.vin,length:row.length,source_customer_number:row.customer_number,source_batch:batch,source_row:row.row,source_record:tx.json(row),review_flags:tx.json(row.flags)})}`;
 inserted++;if(!customer)unassigned++;}
 await tx`insert into platform_audit(actor_user_id,company_id,action,detail) values(${actor},${company},'units.imported',${tx.json({inserted,skipped,unassigned,excluded})})`;
 return {inserted,skipped,unassigned,excluded};});}
 };}
export function unitsHandler(store:ReturnType<typeof unitsStore>,auth:(r:Request)=>Promise<number>){return async(r:Request)=>{try{
 let actor:number;try{actor=await auth(r);}catch{throw new PlatformError(401,'Sign in to continue.');}if(!Number.isSafeInteger(actor)||actor<=0)throw new PlatformError(401,'Sign in to continue.');
 const u=new URL(r.url),company=uuid.parse(u.searchParams.get('companyId'));
 if(r.method==='GET'&&u.pathname==='/_api/units/service-job')return Response.json(await store.serviceJob(actor,company,uuid.parse(u.searchParams.get('id')),uuid.parse(u.searchParams.get('jobId'))));
 if(r.method==='GET'&&u.pathname==='/_api/units/job-context')return Response.json(await store.jobContext(actor,company,uuid.parse(u.searchParams.get('id'))));
 if(r.method==='GET'&&u.pathname==='/_api/units/history')return Response.json(await store.history(actor,company,uuid.parse(u.searchParams.get('id')),z.coerce.number().int().min(0).max(100000).parse(u.searchParams.get('page')||0)));
 if(r.method==='GET'&&u.pathname==='/_api/units/job')return Response.json(await store.job(actor,company,uuid.parse(u.searchParams.get('jobId'))));
 if(r.method==='GET'&&u.pathname==='/_api/units')return Response.json(await store.list(actor,company,z.string().max(200).parse(u.searchParams.get('q')||''),z.enum(['active','archived','all','review']).parse(u.searchParams.get('filter')||'active'),z.coerce.number().int().min(0).max(100000).parse(u.searchParams.get('page')||0),u.searchParams.has('customerId')?uuid.parse(u.searchParams.get('customerId')):null));
 if(r.method==='POST'){requireSameOrigin(r);const body=await readBody(r);
 if(u.pathname==='/_api/units/save'){const v=z.object({id:uuid.optional(),version:z.number().int().nonnegative(),customerId:uuid.nullable(),data:unitFields}).strict().parse(body);return Response.json(await store.save(actor,company,v.id,v.version,v.customerId,v.data));}
 if(u.pathname==='/_api/units/import'){const v=z.object({batch:z.string().regex(/^[a-f0-9]{64}$/),rows:z.array(unitImportRow).min(1).max(200)}).strict().parse(body);return Response.json(await store.import(actor,company,v.batch,v.rows));}}
 return Response.json({error:'Not found.'},{status:404});
 }catch(e){if(e instanceof PlatformError)return Response.json({error:e.message},{status:e.status});if(e instanceof z.ZodError)return Response.json({error:'Check the unit fields.'},{status:400});console.error('Unit operation failed');return Response.json({error:'Unit service unavailable.'},{status:503});}};}
