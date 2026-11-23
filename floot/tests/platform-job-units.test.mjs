import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import postgres from 'postgres';
import {serviceJobSaveStore,linkedJobInput} from '../platform/service-job-save.ts';
import {unitsStore} from '../platform/units.ts';
import {customersStore} from '../platform/customers.ts';
import {LAKEVIEW_ID} from '../platform/policy.ts';
import {unitJobVessel} from '../helpers/unitJobVessel.ts';
import {emptyJob} from '../helpers/jobModel.tsx';
const vessel={year:'2026',make:'Synthetic Marine',model:'QA20',vin:'SYNTHETIC-UNIT-TEST'};
const unit={...vessel,name:'QA',unit_type:'Boat',length:'20',notes:'Synthetic',status:'active',reviewed:false};
const customer={first_name:'Synthetic',last_name:'Owner',email:'qa@example.invalid',home_phone:'202-555-0101',work_phone:'',mobile_phone:'',addresses:[],notes:'',status:'active'};
const job={...emptyJob,firstName:'Synthetic',lastName:'Owner',phone:customer.home_phone,email:customer.email,...unitJobVessel(vessel),engine:'Manual engine detail',serviceDate:'2026-12-02',time:'10:00',duration:60,pickup:'Customer Drop-off (Land)',trailer:'Customer Trailer',returnType:'Customer Pickup',services:['Winterize']};
test('unit autofill maps source fields, clears missing values and never guesses engine or length units',()=>{
 assert.deepEqual(unitJobVessel(vessel),{year:'2026',make:'Synthetic Marine',model:'QA20',hullId:'SYNTHETIC-UNIT-TEST',engine:''});
 assert.deepEqual(unitJobVessel({year:'0',make:'',model:'',vin:'',length:'24',unit_type:'Engine'}),{year:'',make:'',model:'',hullId:'',engine:''});
 assert.equal(linkedJobInput.safeParse({data:job,unitId:'invalid'}).success,false);
});
test('job unit linking is atomic, owner checked, immutable and preserves historical vessel snapshots',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const schema='test_job_units_'+Date.now(),setup=postgres(process.env.TEST_DATABASE_URL,{onnotice:()=>{}});await setup.unsafe(`create schema ${schema}`);await setup.end();
 const db=postgres(process.env.TEST_DATABASE_URL,{connection:{search_path:schema},onnotice:()=>{}});
 try{
 const c=await db.reserve();try{await c.unsafe(await readFile(new URL('../staging/000-baseline.sql',import.meta.url),'utf8'));await c`create table native_gateway_members(auth_user_id integer,role text,enabled boolean)`;await c`insert into users(id,email,display_name) values(1,'owner@example.invalid','Owner'),(2,'member@example.invalid','Member'),(3,'other@example.invalid','Other')`;await c`insert into native_gateway_members values(1,'admin',true),(2,'user',true)`;for(const m of ['007-platform-foundation','008-customers','010-customer-units','011-service-job-units'])await c.unsafe(await readFile(new URL('../migrations/'+m+'.sql',import.meta.url),'utf8'));}finally{c.release();}
 const cs=customersStore(db),us=unitsStore(db),save=serviceJobSaveStore(db);
 const a=await cs.save(1,LAKEVIEW_ID,undefined,0,customer),b=await cs.save(1,LAKEVIEW_ID,undefined,0,{...customer,last_name:'Other'});
 const ua=await us.save(1,LAKEVIEW_ID,undefined,0,a.id,unit),ub=await us.save(1,LAKEVIEW_ID,undefined,0,b.id,unit),unassigned=await us.save(1,LAKEVIEW_ID,undefined,0,null,unit);
 await assert.rejects(save(2,{data:job,unitId:ua.id}),{status:400});
 for(const id of [ub.id,unassigned.id])await assert.rejects(save(2,{data:job,customerId:a.id,unitId:id}),{status:409});
 await assert.rejects(save(2,{data:job,customerId:a.id,unitId:randomUUID()}),{status:404});
 assert.equal(Number((await db`select count(*) from service_jobs`)[0].count),0);
 const created=await save(2,{data:job,customerId:a.id,unitId:ua.id,calendarEligible:false});
 assert.equal((await us.job(2,LAKEVIEW_ID,created.id)).unit.id,ua.id);assert.equal((await cs.job(2,LAKEVIEW_ID,created.id)).customer.id,a.id);
 await assert.rejects(us.job(3,LAKEVIEW_ID,created.id),{status:403});
 await assert.rejects(save(2,{id:created.id,version:1,data:job,unitId:ub.id}),{status:409});
 await us.save(1,LAKEVIEW_ID,ua.id,1,b.id,{...unit,status:'archived',model:'Changed current record',vin:'CHANGED'});
 await save(2,{id:created.id,version:1,data:{...job,notes:'Manual job edit'}});
 await save(2,{id:created.id,version:2,data:job,unitId:ua.id});
 const snapshot=(await db`select data from service_jobs where id=${created.id}`)[0].data;assert.equal(snapshot.model,'QA20');assert.equal(snapshot.hullId,vessel.vin);
 await assert.rejects(save(2,{data:job,customerId:b.id,unitId:ua.id}),{status:409});
 await assert.rejects(save(2,{id:created.id,version:1,data:job}),{status:409});
 const manual=await save(2,{data:job,customerId:b.id});await save(2,{id:manual.id,version:1,data:job,unitId:ub.id});assert.equal((await us.job(2,LAKEVIEW_ID,manual.id)).unit.id,ub.id);
 const other=randomUUID(),foreign=randomUUID();await db`insert into platform_companies(id,slug,name) values(${other},'other','Other')`;await db`insert into customer_units(id,company_id,make) values(${foreign},${other},'Foreign')`;
 await assert.rejects(save(2,{data:job,customerId:a.id,unitId:foreign}),{status:404});
 await db`update platform_entitlements set status='disabled' where company_id=${LAKEVIEW_ID} and tool_key='customers'`;
 await assert.rejects(save(2,{data:job,unitId:ub.id}),{status:403});await assert.rejects(us.job(2,LAKEVIEW_ID,created.id),{status:403});
 await save(2,{id:created.id,version:3,data:job});assert.equal(Number((await db`select count(*) from customer_unit_service_jobs where job_id=${created.id}`)[0].count),1);
 await db`update service_jobs set data=jsonb_set(data,'{status}','"Completed"') where id=${created.id}`;await assert.rejects(save(2,{id:created.id,version:4,data:job}),{status:400});
 }finally{await db.end();const clean=postgres(process.env.TEST_DATABASE_URL,{onnotice:()=>{}});await clean.unsafe(`drop schema ${schema} cascade`);await clean.end();}
});
