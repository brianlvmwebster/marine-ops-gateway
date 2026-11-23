import {z} from 'zod';
import {platformStore} from './store';
import {LAKEVIEW_ID,PlatformError,requireManager,requireSameOrigin} from './policy';
import {readBody} from './customers';
export const jobPartChange=z.object({jobId:z.uuid(),partId:z.uuid(),version:z.number().int().nonnegative(),requestId:z.uuid(),quantity:z.string().trim().regex(/^\d{1,12}(\.\d{1,6})?$/),reason:z.string().trim().min(1).max(1000)}).strict();
export function jobPartsStore(sql:any){const platform=platformStore(sql);
 async function access(actor:number,company:string,write=false){if(company!==LAKEVIEW_ID)throw new PlatformError(403,'Service Desk is Lakeview-only.');await platform.toolAccess(actor,company,'service-desk');const a=await platform.toolAccess(actor,company,'parts-inventory');if(write)requireManager(a);return a;}
 return {
 async list(actor:number,company:string,jobId:string){const a=await access(actor,company);const [job]=await sql`select id,data,job_number from service_jobs where id=${jobId}`;if(!job)throw new PlatformError(404,'Job not found.');const rows=await sql`select p.part_id,p.quantity::text,p.snapshot,p.version,(p.quantity*(p.snapshot->>'active_price')::numeric)::text as extended_price,i.data->>'on_hand' as on_hand,i.data->>'available' as available from service_job_parts p join inventory_parts i on i.id=p.part_id and i.company_id=p.company_id where p.company_id=${company} and p.job_id=${jobId} order by p.snapshot->>'part_number',p.part_id`;
 return {rows,canManage:['owner','admin'].includes(a.role)&&job.data.status!=='Completed'&&!job.data.adminReview,jobNumber:job.job_number,status:job.data.status};},
 async save(actor:number,company:string,input:z.infer<typeof jobPartChange>){await access(actor,company,true);const v=jobPartChange.parse(input);return sql.begin(async(tx:any)=>{
 const [job]=await tx`select id,job_number,data from service_jobs where id=${v.jobId} for update`;if(!job)throw new PlatformError(404,'Job not found.');
 const [part]=await tx`select * from inventory_parts where id=${v.partId} and company_id=${company} for update`;if(!part)throw new PlatformError(404,'Part not found.');
 const [prior]=await tx`select request from part_stock_movements where company_id=${company} and request_id=${v.requestId}`;
 if(prior){if(JSON.stringify(Object.entries(prior.request).sort())!==JSON.stringify(Object.entries(v).sort()))throw new PlatformError(409,'Submission ID already used for another stock change.');return {saved:true,replayed:true};}
 if(job.data.status==='Completed'||job.data.adminReview)throw new PlatformError(409,'Completed jobs are locked.');
 const [line]=await tx`select * from service_job_parts where company_id=${company} and job_id=${v.jobId} and part_id=${v.partId}`;
 if((line?.version||0)!==v.version)throw new PlatformError(409,'Job parts changed. Refresh parts and review the quantities before saving.');
 const [calc]=await tx`select (${line?.quantity||'0'}::numeric-${v.quantity}::numeric)::text as delta,${v.quantity}::numeric>${line?.quantity||'0'}::numeric as issue`;
 if(/^[-0.]+$/.test(calc.delta))throw new PlatformError(400,'Enter a different quantity.');
 if(calc.issue){if(!part.active)throw new PlatformError(409,'Inactive parts cannot be added or increased.');if(job.data.status==='Cancelled')throw new PlatformError(409,'Cancelled jobs can only return parts.');const [ok]=await tx`select ((${part.data.on_hand}::numeric+${calc.delta}::numeric)>=0 and (${part.data.available}::numeric+${calc.delta}::numeric)>=0) as enough`;if(!ok.enough)throw new PlatformError(409,'Insufficient on-hand or available stock. Receive or adjust stock first.');}
 const [who]=await tx`select coalesce(nullif(display_name,''),email,'User '||id::text) as name from users where id=${actor}`;
 const [next]=await tx`update inventory_parts set data=jsonb_set(jsonb_set(data,'{on_hand}',to_jsonb(((data->>'on_hand')::numeric+${calc.delta}::numeric)::text)),'{available}',to_jsonb(((data->>'available')::numeric+${calc.delta}::numeric)::text)),version=version+1 where company_id=${company} and id=${v.partId} returning data,version`;
 const snapshot=line?.snapshot||{part_number:part.part_number,description:part.description,supplier_code:part.supplier_code,active_price:part.data.active_price,replacement_cost:part.data.replacement_cost};
 await tx`insert into service_job_parts(company_id,job_id,part_id,quantity,snapshot,version) values(${company},${v.jobId},${v.partId},${v.quantity},${tx.json(snapshot)},1) on conflict(company_id,job_id,part_id) do update set quantity=excluded.quantity,version=service_job_parts.version+1,updated_at=now()`;
 const [movement]=await tx`insert into part_stock_movements(company_id,part_id,request_id,request,kind,quantity,before_on_hand,after_on_hand,before_available,after_available,reason,reference,actor_user_id,actor_name,part_version,job_id) values(${company},${v.partId},${v.requestId},${tx.json(v)},${calc.issue?'job_use':'job_return'},${calc.delta},${part.data.on_hand},${next.data.on_hand},${part.data.available},${next.data.available},${v.reason},${'Service job #'+job.job_number},${actor},${who.name},${next.version},${v.jobId}) returning id`;
 await tx`insert into platform_audit(actor_user_id,company_id,action,detail) values(${actor},${company},'parts.job_quantity_changed',${tx.json({jobId:v.jobId,partId:v.partId,movementId:movement.id})})`;return {saved:true,replayed:false};});}
 };}
export function jobPartsHandler(store:ReturnType<typeof jobPartsStore>,authenticate:(r:Request)=>Promise<number>){return async(r:Request)=>{try{let actor:number;try{actor=await authenticate(r);}catch{throw new PlatformError(401,'Sign in to continue.');}if(!Number.isSafeInteger(actor)||actor<=0)throw new PlatformError(401,'Sign in to continue.');const u=new URL(r.url),company=z.uuid().parse(u.searchParams.get('companyId'));
 if(r.method==='GET')return Response.json(await store.list(actor,company,z.uuid().parse(u.searchParams.get('jobId'))));
 if(r.method==='POST'){requireSameOrigin(r);return Response.json(await store.save(actor,company,jobPartChange.parse(await readBody(r,16384))));}
 return Response.json({error:'Method not allowed.'},{status:405});
 }catch(e){if(e instanceof PlatformError)return Response.json({error:e.message},{status:e.status});if(e instanceof z.ZodError)return Response.json({error:'Enter a nonnegative quantity (up to six decimal places) and a reason.'},{status:400});console.error('Job parts operation failed');return Response.json({error:'Unable to update job parts.'},{status:503});}};}
