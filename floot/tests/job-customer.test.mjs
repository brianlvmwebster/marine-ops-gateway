import {test} from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import {readFile} from 'node:fs/promises';
import {serviceJobSaveStore} from '../platform/service-job-save.ts';
import {customersStore} from '../platform/customers.ts';
import {customerJobContact} from '../helpers/customerJobContact.ts';
import {LAKEVIEW_ID} from '../platform/policy.ts';
import {emptyJob} from '../helpers/jobModel.tsx';
const contact={first_name:'Synthetic',last_name:'Customer',email:'qa@example.invalid',mobile_phone:'202-555-0111',home_phone:'202-555-0122',work_phone:'202-555-0133'};
const customer={...contact,addresses:[],notes:'',status:'active'};
const job={...emptyJob,...customerJobContact(contact),year:'2025',make:'Test',model:'QA20',engine:'Test',serviceDate:'2026-12-02',time:'09:00',duration:60,pickup:'Customer Drop-off (Land)',trailer:'Customer Trailer',trailerLocation:'Not applicable',returnType:'Customer Pickup',services:['Winterize']};
test('customer autofill has explicit phone priority and clears missing contact fields',()=>{
 assert.equal(customerJobContact(contact).phone,contact.mobile_phone);
 assert.equal(customerJobContact({...contact,mobile_phone:''}).phone,contact.home_phone);
 assert.equal(customerJobContact({...contact,mobile_phone:'',home_phone:''}).phone,contact.work_phone);
 assert.deepEqual(customerJobContact({...contact,first_name:'',email:'',mobile_phone:'',home_phone:'',work_phone:''}),{firstName:'',lastName:'Customer',email:'',phone:''});
});
test('job/customer save is atomic, tenant checked, versioned and preserves snapshots',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const schema='test_job_customers_'+Date.now();const setup=postgres(process.env.TEST_DATABASE_URL,{onnotice:()=>{}});await setup.unsafe(`create schema ${schema}`);await setup.end();
 const db=postgres(process.env.TEST_DATABASE_URL,{connection:{search_path:schema},onnotice:()=>{}});
 try{
  const c=await db.reserve();try{await c.unsafe(await readFile(new URL('../staging/000-baseline.sql',import.meta.url),'utf8'));await c`create table native_gateway_members(auth_user_id integer,role text,enabled boolean)`;await c`insert into users(id,email,display_name) values(1,'owner@example.invalid','Owner'),(2,'member@example.invalid','Member'),(3,'other@example.invalid','Other')`;await c`insert into native_gateway_members values(1,'admin',true),(2,'user',true)`;for(const m of ['007-platform-foundation','008-customers'])await c.unsafe(await readFile(new URL('../migrations/'+m+'.sql',import.meta.url),'utf8'));}finally{c.release();}
  const customers=customersStore(db),save=serviceJobSaveStore(db);const {id}=await customers.save(1,LAKEVIEW_ID,undefined,0,customer);
  const created=await save(2,{data:job,customerId:id,calendarEligible:false});assert.equal(created.saved,true);
  assert.equal((await customers.job(2,LAKEVIEW_ID,created.id)).customer.id,id);
  await customers.save(1,LAKEVIEW_ID,id,1,{...customer,email:'changed@example.invalid',status:'archived'});
  await save(2,{id:created.id,version:created.version,data:{...job,notes:'Job-only edit'},customerId:id});
  assert.equal((await db`select data from service_jobs where id=${created.id}`)[0].data.email,'qa@example.invalid');
  await assert.rejects(save(2,{id:created.id,version:1,data:job,customerId:id}),{status:409});
  await assert.rejects(save(2,{data:job,customerId:id}),{status:409});
  const wrong='00000000-0000-4000-8000-000000000099';await db`insert into platform_companies(id,slug,name) values(${wrong},'other','Other')`;
  const foreign='00000000-0000-4000-8000-000000000098';await db`insert into customers(id,company_id,first_name) values(${foreign},${wrong},'Foreign')`;
  await assert.rejects(save(2,{data:job,customerId:foreign}),{status:404});assert.equal(Number((await db`select count(*) from service_jobs`)[0].count),1);
  await assert.rejects(save(3,{data:job}),{status:403});
  const second=await customers.save(1,LAKEVIEW_ID,undefined,0,customer);await assert.rejects(save(2,{id:created.id,version:2,data:job,customerId:second.id}),{status:409});
  const manual=await save(2,{data:job});await save(2,{id:manual.id,version:manual.version,data:job,customerId:second.id});assert.equal((await customers.detail(1,LAKEVIEW_ID,second.id)).jobs.length,1);
  await db`update platform_entitlements set status='disabled' where company_id=${LAKEVIEW_ID} and tool_key='customers'`;
  await assert.rejects(save(2,{data:job,customerId:second.id}),{status:403});
  await save(2,{id:created.id,version:2,data:job});assert.equal(Number((await db`select count(*) from customer_service_jobs where job_id=${created.id}`)[0].count),1);
  await db`update service_jobs set data=jsonb_set(data,'{status}','"Completed"') where id=${created.id}`;
  await assert.rejects(save(2,{id:created.id,version:3,data:job}),{status:400});
 }finally{await db.end();const clean=postgres(process.env.TEST_DATABASE_URL,{onnotice:()=>{}});await clean.unsafe(`drop schema ${schema} cascade`);await clean.end();}
});
