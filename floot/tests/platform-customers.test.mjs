import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import postgres from 'postgres';
import {customersStore,customersHandler,customerFields} from '../platform/customers.ts';
import {LAKEVIEW_ID} from '../platform/policy.ts';
const data={first_name:'Synthetic',last_name:'Customer',email:'shared@example.invalid',home_phone:'',work_phone:'555-0102',mobile_phone:'',addresses:[{label:'primary',line1:'123 Synthetic Lane',line2:'',city:'Test Town',state:'MA',postal_code:'00000',county:'',country:'US'},{label:'alternate',line1:'456 Synthetic Shore',line2:'Unit 2',city:'Test Lake',state:'NH',postal_code:'00001',county:'',country:'US'}],notes:'',status:'active'};
test('customer HTTP denies unauthenticated, cross-origin and invalid requests',async()=>{
 const url='https://staging.example/_api/customers/save?companyId='+LAKEVIEW_ID;
 assert.equal((await customersHandler({},async()=>{throw Error();})(new Request(url))).status,401);
 const handler=customersHandler({},async()=>1);
 assert.equal((await handler(new Request(url,{method:'POST',headers:{Origin:'https://evil.invalid'}}))).status,403);
 assert.equal((await handler(new Request(url,{method:'POST',headers:{Origin:'https://staging.example','Content-Type':'application/json'},body:'{}'}))).status,400);
 assert.equal(customerFields.safeParse({...data,first_name:'',last_name:''}).success,false);
});
test('customer database: tenant isolation, roles, import idempotency, source flags, conflicts and job links',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const schema='test_customers_'+Date.now(),setup=postgres(process.env.TEST_DATABASE_URL,{onnotice:()=>{}});
 await setup.unsafe(`create schema ${schema}`);await setup.end();
 const db=postgres(process.env.TEST_DATABASE_URL,{connection:{search_path:schema},onnotice:()=>{}});
 try{
  await db`create table users(id integer primary key,email text,display_name text)`;
  await db`create table native_gateway_members(auth_user_id integer,role text,enabled boolean)`;
  await db`create table service_jobs(id uuid primary key,job_number integer,data jsonb)`;
  await db`insert into users values(1,'owner@example.invalid','Owner'),(2,'member@example.invalid','Member'),(3,'other@example.invalid','Other')`;
  await db`insert into native_gateway_members values(1,'admin',true),(2,'user',true)`;
  const conn=await db.reserve();try{for(const name of ['007-platform-foundation','008-customers','022-customer-company-name'])await conn.unsafe(await readFile(new URL('../migrations/'+name+'.sql',import.meta.url),'utf8'));}finally{conn.release();}
  const store=customersStore(db),row={source_number:'000123',source_active:'False',source_record:{Active:'False'},data};
  assert.deepEqual(await store.import(1,LAKEVIEW_ID,[row]),{inserted:1,skipped:0});
  const list=await store.list(2,LAKEVIEW_ID,'000123','active',0);assert.equal(list.total,1);assert.equal(list.canManage,false);
  assert.deepEqual(list.rows[0].addresses,data.addresses);assert.equal(list.rows[0].work_phone,data.work_phone);
  const id=list.rows[0].id;
  assert.equal((await store.detail(1,LAKEVIEW_ID,id)).customer.source_active,'False');
  await assert.rejects(store.list(3,LAKEVIEW_ID,'','all',0),{status:403});
  await assert.rejects(store.save(2,LAKEVIEW_ID,id,1,data),{status:403});
  await store.save(1,LAKEVIEW_ID,id,1,{...data,status:'archived',notes:'Keep local edit'});
  await assert.rejects(store.save(1,LAKEVIEW_ID,id,1,data),{status:409});
  assert.deepEqual(await store.import(1,LAKEVIEW_ID,[row]),{inserted:0,skipped:1});
  assert.equal((await store.detail(1,LAKEVIEW_ID,id)).customer.notes,'Keep local edit');
  assert.equal((await store.list(1,LAKEVIEW_ID,'','active',0)).total,0);
  const other='00000000-0000-4000-8000-000000000009';await db`insert into platform_companies(id,slug,name) values(${other},'other','Other')`;
  await db`insert into platform_memberships(company_id,user_id,role,status) values(${other},3,'owner','active')`;
  await db`update platform_tools set rollout_company_id=null where key='customers'`;
  await db`insert into platform_entitlements(company_id,tool_key,status) values(${other},'customers','enabled')`;
  await store.import(3,other,[row]);assert.equal((await store.list(3,other,'','active',0)).total,1);
  await assert.rejects(store.detail(3,other,id),{status:404});
  await assert.rejects(store.save(3,other,id,2,data),{status:409});
  const job='00000000-0000-4000-8000-000000000111';await db`insert into service_jobs values(${job},1,'{}')`;
  await store.link(1,LAKEVIEW_ID,id,job);assert.equal((await store.detail(1,LAKEVIEW_ID,id)).jobs.length,1);
  const second=await store.save(1,LAKEVIEW_ID,undefined,0,data);await assert.rejects(store.link(1,LAKEVIEW_ID,second.id,job),{status:409});
  await db`update platform_entitlements set status='disabled' where company_id=${LAKEVIEW_ID} and tool_key='customers'`;
  await assert.rejects(store.detail(1,LAKEVIEW_ID,id),{status:403});
 }finally{await db.end();const clean=postgres(process.env.TEST_DATABASE_URL,{onnotice:()=>{}});await clean.unsafe(`drop schema ${schema} cascade`);await clean.end();}
});
