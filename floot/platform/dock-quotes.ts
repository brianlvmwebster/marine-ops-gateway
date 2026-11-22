import {z} from 'zod';
import {createContext,runInContext} from 'node:vm';
import {dockBuilderAssets} from '../helpers/dockBuilderAssets';
import {platformStore} from './store';
import {LAKEVIEW_ID,PlatformError,requireSameOrigin} from './policy';
import {readBody} from './customers';

// Execute only our trusted bundled validator, never supplied JavaScript.
const validator=createContext({TextEncoder});
for(const name of ['layout-core.js','quote-document.js'])runInContext(new TextDecoder().decode(dockBuilderAssets(name)!.body),validator,{timeout:2000});
export function validateQuote(value:unknown){
 try{validator.input=JSON.stringify(value);if(validator.input.length>2*1024*1024)throw Error();
  return JSON.parse(runInContext('JSON.stringify(LVMQuoteDocument.pack(JSON.parse(input)))',validator,{timeout:1000}));
 }catch{throw new PlatformError(400,'Invalid or oversized Dock Builder document.');}finally{delete validator.input;}
}
const contact=z.object({name:z.string().trim().min(1).max(200),email:z.string().max(500),phone:z.string().max(500),address:z.string().max(1500)}).strict();
export const quoteInput=z.object({id:z.uuid(),version:z.number().int().min(0),customerId:z.uuid().nullable(),name:z.string().trim().min(1).max(200),contact,document:z.unknown()}).strict();
export function dockQuoteStore(sql:any){const platform=platformStore(sql);return{
 async list(actor:number,q:string,page:number){await platform.toolAccess(actor,LAKEVIEW_ID,'dock-builder');const pattern='%'+q.replace(/[\\%_]/g,'\\$&')+'%';return {quotes:await sql`select id,name,contact,customer_id,version,updated_at from dock_quotes where company_id=${LAKEVIEW_ID} and concat_ws(' ',name,contact->>'name') ilike ${pattern} order by updated_at desc,id limit 50 offset ${page*50}`};},
 async get(actor:number,id:string){await platform.toolAccess(actor,LAKEVIEW_ID,'dock-builder');const [quote]=await sql`select * from dock_quotes where company_id=${LAKEVIEW_ID} and id=${id}`;if(!quote)throw new PlatformError(404,'Quote not found.');return quote;},
 async save(actor:number,input:unknown){const p=quoteInput.parse(input);await platform.toolAccess(actor,LAKEVIEW_ID,'dock-builder');
 const document=validateQuote(p.document);if(document.configuration.customerName!==p.contact.name)throw new PlatformError(400,'Quote and contact names must match.');
 return sql.begin(async(tx:any)=>{
  const [before]=await tx`select * from dock_quotes where company_id=${LAKEVIEW_ID} and id=${p.id} for update`;
  if((before?.version||0)!==p.version)throw new PlatformError(409,'This quote changed. Open the saved version before editing.');
  if(before?.customer_id&&before.customer_id!==p.customerId)throw new PlatformError(409,'A saved quote cannot be reassigned. Save a new quote instead.');
  if(p.customerId&&before?.customer_id!==p.customerId){await platform.toolAccess(actor,LAKEVIEW_ID,'customers');const [c]=await tx`select id,status from customers where company_id=${LAKEVIEW_ID} and id=${p.customerId} for share`;if(!c)throw new PlatformError(404,'Lakeview customer not found.');if(c.status!=='active')throw new PlatformError(409,'Select an available customer.');}
  let rows;if(before)rows=await tx`update dock_quotes set name=${p.name},contact=${tx.json(p.contact)},document=${tx.json(document)},customer_id=${p.customerId},version=version+1,updated_at=now() where id=${p.id} and company_id=${LAKEVIEW_ID} returning id,version,name`;
  else rows=await tx`insert into dock_quotes(id,company_id,customer_id,name,contact,document,created_by) values(${p.id},${LAKEVIEW_ID},${p.customerId},${p.name},${tx.json(p.contact)},${tx.json(document)},${actor}) on conflict(id) do nothing returning id,version,name`;
  if(!rows.length)throw new PlatformError(409,'Quote already exists. Open its saved version.');
  await tx`insert into platform_audit(actor_user_id,company_id,action,detail) values(${actor},${LAKEVIEW_ID},'dock_quote.saved',${tx.json({id:p.id,customerId:p.customerId,version:rows[0].version})})`;return rows[0];
 });}
};}
export function dockQuotesHandler(store:ReturnType<typeof dockQuoteStore>,auth:(r:Request)=>Promise<number>){return async(r:Request)=>{try{
 let actor;try{actor=await auth(r);}catch{throw new PlatformError(401,'Sign in to continue.');}const u=new URL(r.url);
 if(r.method==='GET'){if(u.searchParams.has('id'))return Response.json(await store.get(actor,z.uuid().parse(u.searchParams.get('id'))));return Response.json(await store.list(actor,z.string().max(200).parse(u.searchParams.get('q')||''),z.coerce.number().int().min(0).max(100000).parse(u.searchParams.get('page')||0)));}
 if(r.method==='POST'){requireSameOrigin(r);return Response.json(await store.save(actor,await readBody(r,3*1024*1024)));}return Response.json({error:'Method not allowed.'},{status:405});
 }catch(e){if(e instanceof PlatformError)return Response.json({error:e.message},{status:e.status});if(e instanceof z.ZodError)return Response.json({error:'Check the quote fields.'},{status:400});console.error('Dock quote operation failed');return Response.json({error:'Quote service unavailable.'},{status:503});}};}
