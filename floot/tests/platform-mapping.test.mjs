import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import postgres from 'postgres';
import sharp from 'sharp';
import superjson from 'superjson';
import {mappingHandler,mappingStore} from '../platform/mapping.ts';
import {LAKEVIEW_ID} from '../platform/policy.ts';

test('mapping HTTP rejects anonymous, foreign-origin, oversized and unconfigured AI requests',async()=>{
 const root='https://staging.example/_api/mapping';let writes=0;
 const store={access:async()=>{},save:async()=>{writes++;return {};}};
 assert.equal((await mappingHandler(store,async()=>{throw Error();})(new Request(root+'/maps'))).status,401);
 const handler=mappingHandler(store,async()=>1);
 assert.equal((await handler(new Request(root+'/maps',{method:'POST',headers:{Origin:'https://evil.invalid'}}))).status,403);
 assert.equal((await handler(new Request(root+'/maps',{method:'POST',headers:{Origin:'https://staging.example','Content-Type':'application/json'},body:'x'.repeat(5*1024*1024+1)}))).status,413);
 assert.equal((await handler(new Request(root+'/analyze',{method:'POST',headers:{Origin:'https://staging.example'}}))).status,503);
 assert.equal((await handler(new Request(root+'/image?id=invalid'))).status,400);assert.equal(writes,0);
});

test('standalone mapping preserves typed fields and enforces private images, revisions, membership and entitlement',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const schema='test_mapping_'+Date.now(),setup=postgres(process.env.TEST_DATABASE_URL,{onnotice:()=>{}});await setup.unsafe(`create schema ${schema}`);await setup.end();
 const db=postgres(process.env.TEST_DATABASE_URL,{connection:{search_path:schema},onnotice:()=>{}});
 try{
  await db`create table users(id integer primary key,email text,display_name text)`;
  await db`create table native_gateway_members(auth_user_id integer,role text,enabled boolean)`;
  await db`insert into users values(1,'owner@example.invalid','Owner'),(2,'member@example.invalid','Member'),(3,'outside@example.invalid','Outside')`;
  await db`insert into native_gateway_members values(1,'admin',true),(2,'user',true)`;
  const c=await db.reserve();try{for(const name of ['007-platform-foundation','015-mapping','015-mapping'])await c.unsafe(await readFile(new URL('../migrations/'+name+'.sql',import.meta.url),'utf8'));}finally{c.release();}
  const store=mappingStore(db);await assert.rejects(store.list(3),{status:403});assert.equal((await store.list(1)).maps.length,0);
  const image=await sharp({create:{width:3,height:3,channels:3,background:'white'}}).png().toBuffer();
  const prepared=await store.save(1,{action:'prepare',name:'Synthetic map',contentType:'image/png',sizeBytes:image.length,imageWidth:3,imageHeight:3,sourceKind:'plan'});
  await assert.rejects(store.upload(2,prepared.id,image,'image/png'),{status:404});
  await assert.rejects(store.save(1,{action:'complete',id:prepared.id}),{status:400});
  await store.upload(1,prepared.id,image,'image/png');await store.save(1,{action:'complete',id:prepared.id});
  assert.deepEqual((await store.image(1,prepared.id)).image_data,image);await assert.rejects(store.image(2,prepared.id),{status:404});
  await assert.rejects(store.upload(1,prepared.id,image,'image/png'),{status:409});
  const field=randomUUID(),space={id:randomUUID(),label:'001',points:[],marker:{x:.5,y:.5},firstName:'',lastName:'',boatDescription:'',trailerDetails:'',notes:'Keep',status:'reserved',reviewed:true,customFields:{[field]:'Paid'}};
  const input={action:'save',id:prepared.id,revision:0,name:'Synthetic map',columns:[{id:field,label:'Payment',type:'boolean',trueLabel:'Paid',falseLabel:'Unpaid'}],spaces:[space]};
  assert.equal((await store.save(1,input)).revision,1);await assert.rejects(store.save(1,input),{status:409});await assert.rejects(store.save(2,input),{status:404});
  const list=await store.list(1);assert.equal(list.maps[0].spaces[0].customFields[field],'true');assert.equal(list.maps[0].columns[0].trueLabel,'Paid');assert.equal(list.capabilities.detection,false);assert.equal((await store.list(2)).maps.length,0);
  const handler=mappingHandler(store,async()=>1);const result=await handler(new Request('https://staging.example/_api/mapping/maps'));assert.equal(result.status,200);assert.equal(superjson.parse(await result.text()).maps[0].id,prepared.id);
  const meta={id:prepared.id,revision:1,name:'Renamed',sectionId:null,sortOrder:0,archived:true};await store.layouts(1,{revision:0,sections:[],maps:[meta]});await assert.rejects(store.layouts(1,{revision:0,sections:[],maps:[meta]}),{status:409});
  await assert.rejects(store.save(1,{...input,revision:2}),{status:409});
  await db`update platform_entitlements set status='disabled' where company_id=${LAKEVIEW_ID} and tool_key='mapping'`;await assert.rejects(store.image(1,prepared.id),{status:403});
  await db`update platform_entitlements set status='enabled' where company_id=${LAKEVIEW_ID} and tool_key='mapping'`;await db`update platform_memberships set status='suspended' where company_id=${LAKEVIEW_ID} and user_id=1`;await assert.rejects(store.list(1),{status:403});
 }finally{await db.end();const clean=postgres(process.env.TEST_DATABASE_URL,{onnotice:()=>{}});await clean.unsafe(`drop schema ${schema} cascade`);await clean.end();}
});
