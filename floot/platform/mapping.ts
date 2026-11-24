import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {z} from 'zod';
import superjson from 'superjson';
import {schema as mapInput} from '../endpoints/mapping/maps_POST.schema';
import {mappingModel} from '../helpers/MapToolMappingModel';
import {layoutModel} from '../helpers/MapToolLayoutModel';
import {columnsSchema,defaultColumns,normalizeFieldValues} from '../helpers/MapToolMappingColumns';
import {platformStore} from './store';
import {LAKEVIEW_ID,PlatformError,requireSameOrigin} from './policy';

const metadata=`id,name,image_width,image_height,source_kind,ready,spaces,columns,section_id,sort_order,archived,revision`;
const mapView=(r:any)=>({id:r.id,name:r.name,imageWidth:r.image_width,imageHeight:r.image_height,sourceKind:r.source_kind,imageUrl:'/_api/mapping/image?id='+r.id,spaces:mappingModel.spaces.parse(r.spaces),columns:columnsSchema.parse(r.columns),sectionId:r.section_id,sortOrder:r.sort_order,archived:r.archived,revision:r.revision});
export function mappingStore(sql:any){const platform=platformStore(sql);
 async function access(actor:number){await platform.toolAccess(actor,LAKEVIEW_ID,'mapping');}
 async function workspace(tx:any,actor:number){await tx`insert into mapping_workspaces(company_id,owner_id) values(${LAKEVIEW_ID},${actor}) on conflict do nothing`;return (await tx`select * from mapping_workspaces where company_id=${LAKEVIEW_ID} and owner_id=${actor} for update`)[0];}
 async function audit(tx:any,actor:number,action:string,id?:string){await tx`insert into platform_audit(actor_user_id,company_id,action,detail) values(${actor},${LAKEVIEW_ID},${action},${tx.json({id})})`;}
 return {
 access,
 async list(actor:number){await access(actor);const maps=await sql`select ${sql.unsafe(metadata)} from mapping_maps where company_id=${LAKEVIEW_ID} and owner_id=${actor} and ready order by sort_order,created_at desc`;
 const [w]=await sql`select sections,revision from mapping_workspaces where company_id=${LAKEVIEW_ID} and owner_id=${actor}`;return {maps:maps.map(mapView),sections:layoutModel.sections.parse(w?.sections??[]),organizationRevision:w?.revision??0,capabilities:{detection:false}};},
 async save(actor:number,input:unknown){await access(actor);const p=mapInput.parse(input);
 return sql.begin(async(tx:any)=>{const w=await workspace(tx,actor);
 if(p.action==='prepare'){
  if(p.imageWidth*p.imageHeight>100000000)throw new PlatformError(400,'Image exceeds 100 megapixels.');
  const [count]=await tx`select count(*)::integer as n from mapping_maps where company_id=${LAKEVIEW_ID} and owner_id=${actor}`;if(count.n>=100)throw new PlatformError(400,'This workspace supports up to 100 maps.');
  if(p.sectionId&&!layoutModel.sections.parse(w.sections).some(s=>s.id===p.sectionId))throw new PlatformError(400,'Section not found.');
  const id=randomUUID();await tx`insert into mapping_maps(id,company_id,owner_id,name,image_width,image_height,content_type,expected_bytes,source_kind,section_id,columns) values(${id},${LAKEVIEW_ID},${actor},${p.name},${p.imageWidth},${p.imageHeight},${p.contentType},${p.sizeBytes},${p.sourceKind},${p.sectionId??null},${tx.json(defaultColumns)})`;
  await audit(tx,actor,'mapping.prepared',id);return {id,revision:0,presignedUrl:'/_api/mapping/image?id='+id,headers:{'Content-Type':p.contentType}};
 }
 const [row]=await tx`select ${tx.unsafe(metadata)},(image_data is not null) as has_image from mapping_maps where id=${p.id} and company_id=${LAKEVIEW_ID} and owner_id=${actor} for update`;if(!row)throw new PlatformError(404,'Map not found.');
 if(p.action==='complete'){if(!row.has_image)throw new PlatformError(400,'Image upload is incomplete.');await tx`update mapping_maps set ready=true where id=${p.id} and company_id=${LAKEVIEW_ID} and owner_id=${actor}`;return {id:p.id,revision:row.revision};}
 if(!row.ready||row.archived)throw new PlatformError(409,'Finish uploading or restore this map before editing.');
 if(row.revision!==p.revision)throw new PlatformError(409,'This map changed in another session. Reload before saving.');
 const columns=columnsSchema.parse(p.columns??row.columns);let spaces;try{spaces=normalizeFieldValues(p.spaces,columns);}catch(e){throw new PlatformError(400,e instanceof Error?e.message:"Invalid field value.");}
 const [saved]=await tx`update mapping_maps set name=${p.name},spaces=${tx.json(spaces)},columns=${tx.json(columns)},revision=revision+1,updated_at=now() where id=${p.id} and company_id=${LAKEVIEW_ID} and owner_id=${actor} and revision=${p.revision} returning id,revision`;
 await audit(tx,actor,'mapping.saved',p.id);return saved;
 });},
 async image(actor:number,id:string){await access(actor);const [row]=await sql`select content_type,image_data from mapping_maps where company_id=${LAKEVIEW_ID} and owner_id=${actor} and id=${id} and ready`;if(!row?.image_data)throw new PlatformError(404,'Image not found.');return row;},
 async upload(actor:number,id:string,bytes:Buffer,contentType:string){await access(actor);
 const [row]=await sql`select image_width,image_height,content_type,expected_bytes,ready from mapping_maps where company_id=${LAKEVIEW_ID} and owner_id=${actor} and id=${id}`;if(!row)throw new PlatformError(404,'Map not found.');if(row.ready)throw new PlatformError(409,'Completed images cannot be replaced.');
 if(bytes.length!==row.expected_bytes||contentType!==row.content_type)throw new PlatformError(400,'Image size or type does not match.');
 let info;try{info=await sharp(bytes,{limitInputPixels:100000000}).metadata();}catch{throw new PlatformError(400,'Invalid image.');}
 if(info.width!==row.image_width||info.height!==row.image_height||'image/'+(info.format==='jpeg'?'jpeg':info.format)!==row.content_type||(info.pages??1)>1)throw new PlatformError(400,'Image format or dimensions do not match.');
 const updated=await sql`update mapping_maps set image_data=${bytes} where company_id=${LAKEVIEW_ID} and owner_id=${actor} and id=${id} and not ready and image_data is null returning id`;if(!updated.length)throw new PlatformError(409,'Image already uploaded.');return {uploaded:true};},
 async layouts(actor:number,input:unknown){await access(actor);const p=layoutModel.schema.parse(input);return sql.begin(async(tx:any)=>{
 const w=await workspace(tx,actor);const rows=await tx`select ${tx.unsafe(metadata)} from mapping_maps where company_id=${LAKEVIEW_ID} and owner_id=${actor} and ready for update`;
 let changes;try{changes=layoutModel.plan({revision:w.revision,sections:layoutModel.sections.parse(w.sections),maps:rows.map(mapView)},p);}catch(e){throw new PlatformError(Number((e as any)?.status)||400,e instanceof Error?e.message:'Invalid organization.');}
 for(const m of changes)await tx`update mapping_maps set name=${m.name},section_id=${m.sectionId},sort_order=${m.sortOrder},archived=${m.archived},revision=revision+1,updated_at=now() where id=${m.id} and company_id=${LAKEVIEW_ID} and owner_id=${actor}`;
 await tx`update mapping_workspaces set sections=${tx.json(p.sections)},revision=revision+1 where company_id=${LAKEVIEW_ID} and owner_id=${actor}`;await audit(tx,actor,'mapping.organized');return {revision:w.revision+1};});}
 };}
async function bytes(request:Request,limit:number){const reader=request.body?.getReader();if(!reader)throw new PlatformError(400,'Body required.');const chunks:Uint8Array[]=[];let length=0;try{while(true){const r=await reader.read();if(r.done)break;length+=r.value.length;if(length>limit){await reader.cancel();throw new PlatformError(413,'Request too large.');}chunks.push(r.value);}}finally{reader.releaseLock();}return Buffer.concat(chunks);}
const response=(data:unknown,status=200)=>new Response(superjson.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export function mappingHandler(store:ReturnType<typeof mappingStore>,auth:(r:Request)=>Promise<number>){return async(r:Request)=>{try{
 let actor;try{actor=await auth(r);}catch{throw new PlatformError(401,'Sign in to continue.');}if(!Number.isSafeInteger(actor)||actor<=0)throw new PlatformError(401,'Sign in to continue.');
 const u=new URL(r.url),path=u.pathname;if(r.method!=='GET')requireSameOrigin(r);await store.access(actor);
 if(path==='/_api/mapping/maps'&&r.method==='GET')return response(await store.list(actor));
 if(path==='/_api/mapping/image'){
  const id=z.uuid().parse(u.searchParams.get('id'));if(r.method==='GET'){const image=await store.image(actor,id);return new Response(new Uint8Array(image.image_data),{headers:{'Content-Type':image.content_type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
  if(r.method==='PUT')return response(await store.upload(actor,id,await bytes(r,10485760),r.headers.get('content-type')??''));
 }
 if(path==='/_api/mapping/analyze')throw new PlatformError(503,'AI detection has not been connected in Marine Ops. Place markers manually.');
 if(r.method==='POST'&&['/_api/mapping/maps','/_api/mapping/layouts'].includes(path)){
  if(!r.headers.get('content-type')?.startsWith('application/json'))throw new PlatformError(415,'JSON required.');
  let body;try{body=superjson.parse((await bytes(r,5*1024*1024)).toString());}catch(e){if(e instanceof PlatformError)throw e;throw new PlatformError(400,'Invalid request.');}
  return response(path.endsWith('/maps')?await store.save(actor,body):await store.layouts(actor,body));
 }return response({error:'Not found.'},404);
 }catch(e){if(e instanceof PlatformError)return response({error:e.message},e.status);if(e instanceof z.ZodError)return response({error:e.issues[0]?.message||'Check the fields.'},400);if(e instanceof Error&&'status' in e&&[400,404,409].includes(Number(e.status)))return response({error:e.message},Number(e.status));console.error('Mapping operation failed:',e instanceof Error?e.name:'unknown');return response({error:'Mapping service unavailable. Try again.'},503);}};}
