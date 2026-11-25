import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import sharp from 'sharp';
import {z} from 'zod';
import {stagingOnly} from './config';
import {platformDatabase} from '../platform/database';
import {mappingModel} from '../helpers/MapToolMappingModel';
import {layoutModel} from '../helpers/MapToolLayoutModel';
import {columnsSchema,defaultColumns,normalizeFieldValues} from '../helpers/MapToolMappingColumns';
import {LAKEVIEW_ID} from '../platform/policy';

// Explicit one-time operator job; never exposed as an HTTP endpoint.
stagingOnly();
const sourceOwner='6e846880-bc19-44d8-97dd-87cbaf5fea06';
const bundle=JSON.parse(gunzipSync(Buffer.from(process.env.MAPPING_IMPORT_BUNDLE||'','base64'),{maxOutputLength:10000000}).toString());
if(!Array.isArray(bundle.maps)||bundle.maps.length>100||!bundle.maps.length)throw Error('Invalid bundle');
const sections=layoutModel.sections.parse(bundle.sections);
const rows=[];
for(const m of bundle.maps){
 if(m.owner_id!==sourceOwner||!m.ready)throw Error('Unexpected source owner or unfinished upload');
 z.string().uuid().parse(m.id);z.string().min(1).max(160).parse(m.name);z.enum(['plan','aerial']).parse(m.source_kind);
 z.number().int().nonnegative().parse(m.revision);z.number().int().parse(m.sort_order);z.boolean().parse(m.archived);
 if(m.section_id&&!sections.some(s=>s.id===m.section_id))throw Error('Unknown section');
 const columns=columnsSchema.parse(m.columns??defaultColumns);const spaces=mappingModel.spaces.parse(m.spaces);
 if(!isDeepStrictEqual(normalizeFieldValues(spaces,columns),spaces))throw Error('Source field values require review');
 const u=new URL(m.imageUrl);if(u.protocol!=='https:'||u.hostname!=='floot-client-app-storage.s3.us-east-1.amazonaws.com')throw Error('Untrusted image source');
 const response=await fetch(u,{redirect:'error',signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Image download failed');
 const image=Buffer.from(await response.arrayBuffer());
 if(image.length>10485760||image.length!==m.bytes||createHash('sha256').update(image).digest('hex')!==m.sha256)throw Error('Image checksum mismatch');
 const info=await sharp(image,{limitInputPixels:100000000}).metadata();
 if(info.width!==m.image_width||info.height!==m.image_height||!['png','jpeg','webp'].includes(info.format||'')||(info.pages??1)>1)throw Error('Invalid image dimensions');
 rows.push({...m,columns,spaces,image,content_type:'image/'+info.format});
}
const db=platformDatabase();
try{
 await db.begin(async tx=>{
  const [owner]=await tx`select id from users where email='owner@staging.example.invalid'`;
  if(!owner)throw Error('Staging owner not found');
  await tx`insert into mapping_workspaces(company_id,owner_id) values(${LAKEVIEW_ID},${owner.id}) on conflict do nothing`;
  const [w]=await tx`select * from mapping_workspaces where company_id=${LAKEVIEW_ID} and owner_id=${owner.id} for update`;
  const existing=await tx`select id from mapping_maps where company_id=${LAKEVIEW_ID} and owner_id=${owner.id}`;
  if(existing.length)throw Error('Target already contains maps; refusing to overwrite or duplicate');
  if(w.revision!==0||w.sections.length)throw Error('Target organization already edited');
  await tx`update mapping_workspaces set sections=${tx.json(sections)},revision=${bundle.organizationRevision} where company_id=${LAKEVIEW_ID} and owner_id=${owner.id}`;
  for(const m of rows){
   await tx`insert into mapping_maps(id,company_id,owner_id,name,image_width,image_height,content_type,expected_bytes,image_data,source_kind,ready,spaces,columns,section_id,sort_order,archived,revision,created_at,updated_at) values(${m.id},${LAKEVIEW_ID},${owner.id},${m.name},${m.image_width},${m.image_height},${m.content_type},${m.image.length},${m.image},${m.source_kind},true,${tx.json(m.spaces)},${tx.json(m.columns)},${m.section_id},${m.sort_order},${m.archived},${m.revision},${new Date(m.created_at)},${new Date(m.updated_at)})`;
   const [copy]=await tx`select image_data,spaces,columns from mapping_maps where id=${m.id}`;
   if(createHash('sha256').update(copy.image_data).digest('hex')!==m.sha256||!isDeepStrictEqual(copy.spaces,m.spaces)||!isDeepStrictEqual(copy.columns,m.columns))throw Error('Stored copy mismatch');
  }
  await tx`insert into platform_audit(actor_user_id,company_id,action,detail) values(${owner.id},${LAKEVIEW_ID},'mapping.imported',${tx.json({sourceOwner,maps:rows.length,spaces:rows.reduce((n,m)=>n+m.spaces.length,0),imagesVerified:rows.length})})`;
 });
 console.log(JSON.stringify({imported:rows.length,spaces:rows.reduce((n,m)=>n+m.spaces.length,0),imagesVerified:rows.length,sections:sections.length}));
}finally{await db.end();}
