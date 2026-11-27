import{test}from'node:test';import assert from'node:assert/strict';import{randomUUID}from'node:crypto';import{readFile}from'node:fs/promises';import postgres from'postgres';import sharp from'sharp';
import{schedulerHandler,schedulerBody}from'../platform/dock-scheduler.ts';import{LAKEVIEW_ID}from'../platform/policy.ts';
const origin='https://staging.example';
test('scheduler rejects anonymous and oversized or malformed requests',async()=>{
 const handler=schedulerHandler({},async()=>{throw Error();});assert.equal((await handler(new Request(origin+'/_api/dock/records'))).status,401);
 await assert.rejects(schedulerBody(new Request(origin,{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(120001)})),{status:413});
 await assert.rejects(schedulerBody(new Request(origin,{method:'POST',headers:{'Content-Type':'application/json'},body:'[]'})),{status:400});
});
test('scheduler local appointments, shared contacts, idempotency, revisions, photos, signatures, history and company revocation',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const schema='test_scheduler_'+Date.now(),setup=postgres(process.env.TEST_DATABASE_URL,{onnotice:()=>{}});await setup.unsafe(`create schema ${schema}`);await setup.end();
 const db=postgres(process.env.TEST_DATABASE_URL,{connection:{search_path:schema},onnotice:()=>{}});
 try{
  await db`create table users(id integer primary key,email text,display_name text)`;await db`create table native_gateway_members(auth_user_id integer,role text,enabled boolean)`;
  await db`insert into users values(1,'owner@example.invalid','Owner'),(2,'member@example.invalid','Member'),(3,'outside@example.invalid','Outside')`;await db`insert into native_gateway_members values(1,'admin',true),(2,'user',true)`;
  await db`create table service_jobs(id uuid primary key)`;
  const c=await db.reserve();try{await c.unsafe(await readFile(new URL('../migrations/007-platform-foundation.sql',import.meta.url),'utf8'));await c.unsafe(await readFile(new URL('../migrations/008-customers.sql',import.meta.url),'utf8'));await c.unsafe(await readFile(new URL('../migrations/022-customer-company-name.sql',import.meta.url),'utf8'));const migration=(await readFile(new URL('../migrations/017-dock-scheduler.sql',import.meta.url),'utf8')).replaceAll('dock_scheduler_lakeview',schema).replaceAll('public.platform_',schema+'.platform_');await c.unsafe(migration);await c.unsafe(migration);}finally{c.release();}
  const importId=randomUUID(),schedule=randomUUID();await db`insert into scheduler_imports(id,source_hash,snapshot_hash,headers,expected_count) values(${importId},'fixture','fixture','[]',0)`;await db`insert into scheduler_record_state(singleton,active_import) values(true,${importId})`;await db`insert into scheduler_schedules(id,name) values(${schedule},'Synthetic schedule')`;
  let actor=1;const handler=schedulerHandler(db,async()=>actor,schema);
  const call=(path,input,extra={})=>handler(new Request(origin+'/_api/dock/'+path,input===undefined?{}:{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...extra},body:JSON.stringify(input)}));
  const success=async(path,input)=>{const r=await call(path,input);const value=await r.json();assert.equal(r.status,200,JSON.stringify(value));return value;};
  actor=3;assert.equal((await call('records')).status,403);actor=1;
  assert.equal((await call('jobs',{action:'getLocations',args:[]},{Origin:'https://evil.invalid'})).status,403);
  const available=await success('calendar?action=availability&scheduleId='+schedule+'&date=2035-06-15&duration=90');assert.ok(available.slots.length);
  const entry={requestId:randomUUID(),scheduleId:schedule,firstName:'Synthetic',lastName:'Fixture',street:'1 Test Street',city:'Webster',state:'MA',zip:'01570',bodyOfWater:'Test Lake',workDescription:'Install',notes:'Keep',start:available.slots[0].start,duration:90};
  const customerId=randomUUID();
  await db`insert into customers(id,company_id,first_name,last_name,email,mobile_phone,status)
    values(${customerId},${LAKEVIEW_ID},'Synthetic','Directory','directory@example.invalid','5550000','archived')`;
  assert.equal((await call('entries',{...entry,customerId})).status,409);
  assert.equal((await call('entries',{...entry,customerId:'invalid'})).status,400);
  await db`update customers set status='active' where id=${customerId}`;
  await db`update platform_entitlements set status='disabled' where company_id=${LAKEVIEW_ID} and tool_key='customers'`;
  assert.equal((await call('entries',{...entry,customerId})).status,403);
  await db`update platform_entitlements set status='enabled' where company_id=${LAKEVIEW_ID} and tool_key='customers'`;
  const linkedEntry={...entry,customerId,email:'job@example.invalid',phone:'5552222'};
  const first=await success('entries',linkedEntry),again=await success('entries',linkedEntry);assert.equal(first.job.jobId,again.job.jobId);assert.equal(again.alreadySaved,true);
  assert.equal(first.job.email,'job@example.invalid');
  assert.equal((await call('entries',entry)).status,409);
  assert.equal((await call('entries',{...entry,requestId:randomUUID()})).status,409);
  const [raw]=await db`select calendar,data from scheduler_jobs where id=${first.job.jobId}`;assert.equal(raw.calendar,null);assert.equal(raw.data._MarineOpsDuration,90);
  assert.equal(raw.data._MarineOpsCustomerId,customerId);
  assert.equal((await db`select email from customers where id=${customerId}`)[0].email,'directory@example.invalid');
  let job=first.job;const identity=()=>({jobId:job.jobId,version:job.version,recordKey:job.recordKey});const stale=identity();
  job=await success('jobs',{action:'setNotes',identity:identity(),args:[job.rowNumber,'Updated']});assert.equal(job.notes,'Updated');assert.equal((await call('jobs',{action:'setNotes',identity:stale,args:[job.rowNumber,'Lost update']})).status,409);
  job=await success('jobs',{action:'setCompleted',identity:identity(),args:[job.rowNumber,true,'Test Crew','2035-06-15']});assert.equal(job.completionSignature,'Test Crew');
  const bytes=await sharp({create:{width:2,height:2,channels:3,background:'white'}}).jpeg().toBuffer();job=await success('jobs',{action:'setPhotos',identity:identity(),args:[job.rowNumber,[{name:'Fixture',dataUrl:'data:image/jpeg;base64,'+bytes.toString('base64')}]]});assert.equal(job.photos.length,1);
  const edit=await success('entries?jobId='+job.jobId);assert.equal(edit.fields.email,'job@example.invalid');const edited=await success('entries?_action=edit',{identity:identity(),requestId:randomUUID(),fields:{...edit.fields,email:'crew@example.invalid',notes:'Edited'}});job=edited.job;assert.equal(job.photos.length,1);assert.equal(job.completionSignature,'Test Crew');assert.equal(job.notes,'Edited');assert.equal(job.email,'crew@example.invalid');
  assert.equal((await call('calendar?action=create&scheduleId='+schedule,{})).status,403);assert.equal((await call('sync',{})).status,403);
  const receipt=randomUUID();await success('entries?_action=delete',{identity:identity(),requestId:receipt,confirmed:true});await success('entries?_action=delete',{identity:identity(),requestId:receipt,confirmed:true});assert.equal((await success('records')).records.length,1);assert.ok((await success('records')).records[0].deletedAt);
  const newSchedule=randomUUID();await success('schedules',{id:newSchedule,action:'create',name:'New'});await success('schedules',{id:newSchedule,action:'archive',archived:true});await success('schedules?_action=delete',{id:newSchedule,confirmed:true});
  await db`update platform_entitlements set status='disabled' where company_id=${LAKEVIEW_ID} and tool_key='dock-scheduler'`;assert.equal((await call('records')).status,403);
  await db`update platform_entitlements set status='enabled' where company_id=${LAKEVIEW_ID} and tool_key='dock-scheduler'`;await db`update platform_memberships set status='suspended' where company_id=${LAKEVIEW_ID} and user_id=1`;assert.equal((await call('records')).status,403);
 }finally{await db.end();const clean=postgres(process.env.TEST_DATABASE_URL,{onnotice:()=>{}});await clean.unsafe(`drop schema ${schema} cascade`);await clean.end();}
});
