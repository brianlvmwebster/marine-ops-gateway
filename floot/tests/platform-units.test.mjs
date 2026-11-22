import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import postgres from 'postgres';
import {unitsStore,unitsHandler,unitFields} from '../platform/units.ts';
import {customersStore} from '../platform/customers.ts';
import {LAKEVIEW_ID} from '../platform/policy.ts';
const fields={make:'Synthetic',model:'Test boat',vin:'QA-UNIT-ONLY',length:'',name:'',year:'',unit_type:'Boat',notes:'Synthetic',status:'active',reviewed:false};
test('unit API rejects unauthenticated, cross-origin and invalid data',async()=>{
 const url='https://staging.example/_api/units/save?companyId='+LAKEVIEW_ID;
 assert.equal((await unitsHandler({},async()=>{throw Error();})(new Request(url))).status,401);
 const h=unitsHandler({},async()=>1);
 assert.equal((await h(new Request(url,{method:'POST',headers:{Origin:'https://evil.invalid'}}))).status,403);
 assert.equal((await h(new Request(url,{method:'POST',headers:{Origin:'https://staging.example','Content-Type':'application/json'},body:'{}'}))).status,400);
 assert.equal(unitFields.safeParse({...fields,make:'',model:'',vin:'',name:''}).success,false);
});
test('units: tenant access, assignment, import retries, repeated rows, source retention and conflicts',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const schema='test_units_'+Date.now(),setup=postgres(process.env.TEST_DATABASE_URL,{onnotice:()=>{}});await setup.unsafe(`create schema ${schema}`);await setup.end();
 const db=postgres(process.env.TEST_DATABASE_URL,{connection:{search_path:schema},onnotice:()=>{}});
 try{
 await db`create table users(id integer primary key,email text,display_name text)`;await db`create table native_gateway_members(auth_user_id integer,role text,enabled boolean)`;await db`create table service_jobs(id uuid primary key,job_number integer,data jsonb)`;
 await db`insert into users values(1,'owner@example.invalid','Owner'),(2,'member@example.invalid','Member'),(3,'other@example.invalid','Other')`;await db`insert into native_gateway_members values(1,'admin',true),(2,'user',true)`;
 const conn=await db.reserve();try{for(const name of ['007-platform-foundation','008-customers','010-customer-units'])await conn.unsafe(await readFile(new URL('../migrations/'+name+'.sql',import.meta.url),'utf8'));}finally{conn.release();}
 const customers=customersStore(db),store=unitsStore(db),cdata={first_name:'Synthetic',last_name:'Owner',email:'',home_phone:'',work_phone:'',mobile_phone:'',addresses:[],notes:'',status:'active'};
 await customers.import(1,LAKEVIEW_ID,[{source_number:'123',source_active:'False',source_record:{},data:cdata}]);
 const cid=(await customers.list(1,LAKEVIEW_ID,'123','all',0)).rows[0].id;
 const row={row:3,customer_number:'123',make:'Synthetic',model:'Boat',vin:'duplicate',length:'0',flags:['repeated_vin','identical_row']},batch='a'.repeat(64),rows=[row,{...row,row:4},{...row,row:5,customer_number:'999'},{...row,row:6,customer_number:'0'}];
 assert.deepEqual(await store.import(1,LAKEVIEW_ID,batch,rows),{inserted:3,skipped:0,unassigned:1,excluded:1});
 assert.deepEqual(await store.import(1,LAKEVIEW_ID,batch,rows),{inserted:0,skipped:3,unassigned:0,excluded:1});
 await assert.rejects(store.import(1,LAKEVIEW_ID,'b'.repeat(64),rows),{status:409});
 await assert.rejects(store.import(1,LAKEVIEW_ID,batch,[{...row,make:'Changed'}]),{status:409});
 const all=await store.list(2,LAKEVIEW_ID,'','all',0,null);assert.equal(all.total,3);assert.equal(all.canManage,false);assert.equal(new Set(all.rows.map(u=>u.id)).size,3);
 assert.equal((await store.list(1,LAKEVIEW_ID,'','all',0,cid)).total,2);
 await assert.rejects(store.list(3,LAKEVIEW_ID,'','all',0,null),{status:403});await assert.rejects(store.save(2,LAKEVIEW_ID,undefined,0,cid,fields),{status:403});
 const pending=all.rows.find(u=>!u.customer_id);await store.save(1,LAKEVIEW_ID,pending.id,1,cid,{...fields,reviewed:true});
 await assert.rejects(store.save(1,LAKEVIEW_ID,pending.id,1,cid,fields),{status:409});await assert.rejects(store.save(1,LAKEVIEW_ID,undefined,0,randomUUID(),fields),{status:404});
 const saved=(await store.list(1,LAKEVIEW_ID,'QA-UNIT-ONLY','all',0,null)).rows[0];assert.equal(saved.customer_id,cid);assert.equal(saved.source_customer_number,'999');assert.deepEqual(saved.source_record,rows[2]);
 assert.equal((await store.list(1,LAKEVIEW_ID,'','review',0,null)).total,2);
 await customers.save(1,LAKEVIEW_ID,cid,1,{...cdata,status:'archived'});await assert.rejects(store.save(1,LAKEVIEW_ID,undefined,0,cid,fields),{status:409});
 await store.save(1,LAKEVIEW_ID,pending.id,2,cid,{...fields,status:'archived'});
 assert.equal((await store.list(1,LAKEVIEW_ID,'','archived',0,cid)).total,1);
 const other=randomUUID();await db`insert into platform_companies(id,slug,name) values(${other},'other','Other')`;await db`insert into platform_memberships(company_id,user_id,role,status) values(${other},3,'owner','active')`;await db`update platform_tools set rollout_company_id=null where key='customers'`;await db`insert into platform_entitlements(company_id,tool_key,status) values(${other},'customers','enabled')`;
 assert.equal((await store.list(3,other,'','all',0,null)).total,0);await assert.rejects(store.save(3,other,pending.id,3,null,fields),{status:404});await assert.rejects(store.save(3,other,undefined,0,cid,fields),{status:404});
 await db`update platform_entitlements set status='disabled' where tool_key='customers'`;await assert.rejects(store.list(1,LAKEVIEW_ID,'','all',0,null),{status:403});
 }finally{await db.end();const clean=postgres(process.env.TEST_DATABASE_URL,{onnotice:()=>{}});await clean.unsafe(`drop schema ${schema} cascade`);await clean.end();}
});
