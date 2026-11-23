import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {platformStore} from './store';
import {LAKEVIEW_ID,PlatformError,requireManager,requireSameOrigin} from './policy';
import {readBody} from './customers';
const text=z.string().max(5000),decimal=z.string().regex(/^-?\d+(\.\d+)?$/).max(40);
export const partData=z.object({supplier_code:text.min(1),part_number:text.min(1),description:text.min(1),active:z.boolean(),supplier_name:text,category:text,manufacturer:text,manufacturer_part_number:text,upc:text,bins:z.array(text).length(3),on_hand:decimal,available:decimal,active_price:decimal,retail_price:decimal,sale_price:decimal,replacement_cost:decimal,inventory_value:decimal,reorder_point:decimal,minimum:decimal,maximum:decimal,comments:text}).strict();
export const partRow=z.object({row:z.number().int().positive(),data:partData,source:z.array(text).length(127)}).strict();
export function partsStore(sql:any){const platform=platformStore(sql);
 async function access(actor:number,company:string,write=false){const a=await platform.toolAccess(actor,company,'parts-inventory');if(company!==LAKEVIEW_ID)throw new PlatformError(403,'Parts Inventory is Lakeview-only.');if(write)requireManager(a);return a;}
 return {
 async list(actor:number,company:string,q:string,status:string,stock:string,page:number){await access(actor,company);const pattern='%'+q.replace(/[\\%_]/g,'\\$&')+'%';
 const where=sql`company_id=${company} and (${status}='all' or active=(${status}='active')) and (${stock}='all' or (${stock}='positive' and (data->>'on_hand')::numeric>0) or (${stock}='zero' and (data->>'on_hand')::numeric=0) or (${stock}='negative' and (data->>'on_hand')::numeric<0)) and (${q}='' or concat_ws(' ',part_number,description,supplier_code,data->>'supplier_name',data->>'category',data->>'manufacturer',data->>'manufacturer_part_number',data->>'upc',data->'bins') ilike ${pattern})`;
 const rows=await sql`select id,data,source_sha,source_batch,source_row from inventory_parts where ${where} order by part_number,supplier_code,id limit 50 offset ${page*50}`;
 const [count]=await sql`select count(*)::integer as total from inventory_parts where ${where}`;return {rows,total:count.total};},
 async detail(actor:number,company:string,id:string){await access(actor,company);const [part]=await sql`select * from inventory_parts where company_id=${company} and id=${id}`;if(!part)throw new PlatformError(404,'Part not found.');return {part};},
 async import(actor:number,company:string,batch:string,rows:z.infer<typeof partRow>[]){await access(actor,company,true);return sql.begin(async(tx:any)=>{let inserted=0,skipped=0;
 for(const input of rows){const row=partRow.parse(input),d=row.data,sha=createHash('sha256').update(JSON.stringify(row.source)).digest('hex');
 const saved=await tx`insert into inventory_parts(id,company_id,supplier_code,part_number,description,active,data,source_record,source_sha,source_batch,source_row) values(${randomUUID()},${company},${d.supplier_code},${d.part_number},${d.description},${d.active},${tx.json(d)},${tx.json(row.source)},${sha},${batch},${row.row}) on conflict(company_id,supplier_code,part_number) do nothing returning id`;
 if(saved.length)inserted++;else{const [old]=await tx`select source_sha,data from inventory_parts where company_id=${company} and supplier_code=${d.supplier_code} and part_number=${d.part_number}`;if(old.source_sha!==sha||JSON.stringify(Object.entries(old.data).sort())!==JSON.stringify(Object.entries(d).sort()))throw new PlatformError(409,'An existing part differs from this import. No records in this batch were changed.');skipped++;}}
 if(inserted)await tx`insert into platform_audit(actor_user_id,company_id,action,detail) values(${actor},${company},'parts.imported',${tx.json({batch,inserted})})`;return {inserted,skipped};});}
 };}
export function partsHandler(store:ReturnType<typeof partsStore>,authenticate:(r:Request)=>Promise<number>){return async(request:Request)=>{try{
 let actor:number;try{actor=await authenticate(request);}catch{throw new PlatformError(401,'Sign in to continue.');}if(!Number.isSafeInteger(actor)||actor<=0)throw new PlatformError(401,'Sign in to continue.');
 const u=new URL(request.url),company=z.uuid().parse(u.searchParams.get('companyId'));
 if(request.method==='GET'&&u.pathname==='/_api/parts')return Response.json(await store.list(actor,company,z.string().max(200).parse(u.searchParams.get('q')||''),z.enum(['all','active','inactive']).parse(u.searchParams.get('status')||'all'),z.enum(['all','positive','zero','negative']).parse(u.searchParams.get('stock')||'all'),z.coerce.number().int().min(0).max(100000).parse(u.searchParams.get('page')||0)));
 if(request.method==='GET'&&u.pathname==='/_api/parts/detail')return Response.json(await store.detail(actor,company,z.uuid().parse(u.searchParams.get('id'))));
 if(request.method==='POST'&&u.pathname==='/_api/parts/import'){requireSameOrigin(request);const v=z.object({batch:z.string().regex(/^[a-f0-9]{64}$/),rows:z.array(partRow).min(1).max(100)}).strict().parse(await readBody(request));return Response.json(await store.import(actor,company,v.batch,v.rows));}
 return Response.json({error:'Not found.'},{status:404});
 }catch(e){if(e instanceof PlatformError)return Response.json({error:e.message},{status:e.status});if(e instanceof z.ZodError)return Response.json({error:'Check the submitted fields.'},{status:400});console.error('Parts operation failed');return Response.json({error:'Parts Inventory unavailable.'},{status:503});}};}
