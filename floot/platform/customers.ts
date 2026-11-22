import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {platformStore} from './store.ts';
import {LAKEVIEW_ID,PlatformError,requireManager,requireSameOrigin} from './policy.ts';

const text=z.string().trim().max(500);
export const customerFields=z.object({first_name:text,last_name:text,email:text,home_phone:text,work_phone:text,mobile_phone:text,
 addresses:z.array(z.object({label:z.enum(['primary','alternate']),line1:text,line2:text,city:text,state:text,postal_code:text,county:text,country:text}).strict()).max(2),
 notes:z.string().max(5000),status:z.enum(['active','archived'])}).strict().refine(v=>!!(v.first_name||v.last_name),'A name is required');
export const importRow=z.object({source_number:z.string().trim().min(1).max(100),source_active:text,source_record:z.record(z.string(),text),data:customerFields}).strict();
const uuid=z.uuid();
export function customersStore(sql:any){
 const platform=platformStore(sql);
 async function access(actor:number,company:string,write=false){const a=await platform.toolAccess(actor,company,'customers');if(write)requireManager(a);return a;}
 async function audit(tx:any,actor:number,company:string,action:string,detail:object){await tx`insert into platform_audit(actor_user_id,company_id,action,detail) values(${actor},${company},${action},${tx.json(detail)})`;}
 return {
  async list(actor:number,company:string,q:string,status:string,page:number){
   const a=await access(actor,company);const pattern='%'+q.replace(/[\\%_]/g,'\\$&')+'%';
   const where=sql`company_id=${company} and (${status}='all' or status=${status}) and (concat_ws(' ',first_name,last_name,source_number,email,home_phone,work_phone,mobile_phone) ilike ${pattern})`;
   const rows=await sql`select id,first_name,last_name,email,home_phone,mobile_phone,source_number,status,version from customers where ${where} order by last_name,first_name,id limit 50 offset ${page*50}`;
   const [count]=await sql`select count(*)::integer as total from customers where ${where}`;
   return {rows,total:count.total,canManage:['owner','admin'].includes(a.role)};
  },
  async detail(actor:number,company:string,id:string){await access(actor,company);const [customer]=await sql`select * from customers where company_id=${company} and id=${id}`;if(!customer)throw new PlatformError(404,'Customer not found.');
   let jobs:any[]=[];try{await platform.toolAccess(actor,company,'service-desk');jobs=await sql`select j.id,j.job_number,j.data from customer_service_jobs l join service_jobs j on j.id=l.job_id where l.company_id=${company} and l.customer_id=${id} order by j.job_number desc`;}catch(e){if(!(e instanceof PlatformError))throw e;}
   return {customer,jobs};},
  async save(actor:number,company:string,id:string|undefined,version:number,data:z.infer<typeof customerFields>){await access(actor,company,true);return sql.begin(async(tx:any)=>{
   let rows;if(id){rows=await tx`update customers set ${tx({...data,addresses:tx.json(data.addresses)})},version=version+1,updated_at=now() where id=${id} and company_id=${company} and version=${version} returning id,version`;}else{rows=await tx`insert into customers ${tx({id:randomUUID(),company_id:company,...data,addresses:tx.json(data.addresses)})} returning id,version`;}
   if(!rows.length)throw new PlatformError(409,'Customer changed. Reload before saving.');await audit(tx,actor,company,'customer.saved',{id:rows[0].id});return rows[0];});},
  async import(actor:number,company:string,rows:z.infer<typeof importRow>[]){await access(actor,company,true);return sql.begin(async(tx:any)=>{
   let inserted=0;for(const row of rows){const result=await tx`insert into customers ${tx({id:randomUUID(),company_id:company,source_system:'lightspeed',source_number:row.source_number,source_active:row.source_active,source_record:tx.json(row.source_record),...row.data,status:'active',addresses:tx.json(row.data.addresses)})} on conflict(company_id,source_system,source_number) do nothing returning id`;inserted+=result.length;}
   await audit(tx,actor,company,'customers.imported',{received:rows.length,inserted,skipped:rows.length-inserted});return {inserted,skipped:rows.length-inserted};});},
  async link(actor:number,company:string,id:string,jobId:string){await access(actor,company,true);await platform.toolAccess(actor,company,'service-desk');if(company!==LAKEVIEW_ID)throw new PlatformError(403,'Service Desk is currently Lakeview-only.');return sql.begin(async(tx:any)=>{
   const customers=await tx`select id from customers where company_id=${company} and id=${id}`;const jobs=await tx`select id from service_jobs where id=${jobId}`;if(!customers.length||!jobs.length)throw new PlatformError(404,'Customer or job not found.');
   const linked=await tx`insert into customer_service_jobs(company_id,customer_id,job_id) values(${company},${id},${jobId}) on conflict(job_id) do nothing returning job_id`;
   if(!linked.length){const [existing]=await tx`select customer_id from customer_service_jobs where job_id=${jobId}`;if(existing.customer_id!==id)throw new PlatformError(409,'This job is already linked to another customer.');}
   await audit(tx,actor,company,'customer.job_linked',{id,jobId});return {saved:true};});}
 };
}
async function readBody(request:Request){if(!request.headers.get('content-type')?.startsWith('application/json'))throw new PlatformError(415,'JSON required.');const reader=request.body?.getReader();if(!reader)throw new PlatformError(400,'Body required.');const chunks:Uint8Array[]=[];let n=0;try{while(true){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>1024*1024){await reader.cancel();throw new PlatformError(413,'Request too large.');}chunks.push(value);}}finally{reader.releaseLock();}try{return JSON.parse(Buffer.concat(chunks).toString());}catch{throw new PlatformError(400,'Invalid JSON.');}}
export function customersHandler(store:ReturnType<typeof customersStore>,authenticate:(r:Request)=>Promise<number>){return async(request:Request)=>{try{
 let actor:number;try{actor=await authenticate(request);}catch{throw new PlatformError(401,'Sign in to continue.');}if(!Number.isSafeInteger(actor)||actor<=0)throw new PlatformError(401,'Sign in to continue.');
 const url=new URL(request.url),company=uuid.parse(url.searchParams.get('companyId')),path=url.pathname;
 if(request.method==='GET'){if(path==='/_api/customers')return Response.json(await store.list(actor,company,z.string().max(200).parse(url.searchParams.get('q')||''),z.enum(['active','archived','all']).parse(url.searchParams.get('status')||'active'),z.coerce.number().int().min(0).max(100000).parse(url.searchParams.get('page')||0)));
 if(path==='/_api/customers/detail')return Response.json(await store.detail(actor,company,uuid.parse(url.searchParams.get('id'))));}
 if(request.method==='POST'){requireSameOrigin(request);const body=await readBody(request);
 if(path==='/_api/customers/save'){const v=z.object({id:uuid.optional(),version:z.number().int().nonnegative(),data:customerFields}).strict().parse(body);return Response.json(await store.save(actor,company,v.id,v.version,v.data));}
 if(path==='/_api/customers/import'){const v=z.object({rows:z.array(importRow).min(1).max(200)}).strict().parse(body);return Response.json(await store.import(actor,company,v.rows));}
 if(path==='/_api/customers/link'){const v=z.object({id:uuid,jobId:uuid}).strict().parse(body);return Response.json(await store.link(actor,company,v.id,v.jobId));}}
 return Response.json({error:'Not found.'},{status:404});
 }catch(e){if(e instanceof PlatformError)return Response.json({error:e.message},{status:e.status});if(e instanceof z.ZodError)return Response.json({error:'Check the submitted fields.'},{status:400});console.error('Customer operation failed');return Response.json({error:'Customer operation unavailable.'},{status:503});}};}
