import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import postgres from 'postgres';
import {jobPartsStore,jobPartsHandler,jobPartChange} from '../platform/job-parts.ts';
import {partsStore} from '../platform/parts.ts';
import {LAKEVIEW_ID as company} from '../platform/policy.ts';
const data={supplier_code:'QA',part_number:'TEST-PART',description:'Test part',active:true,supplier_name:'QA supplier',category:'QA',manufacturer:'',manufacturer_part_number:'',upc:'',bins:['','',''],on_hand:'10',available:'8',active_price:'2.25',retail_price:'2.25',sale_price:'0',replacement_cost:'1',inventory_value:'10',reorder_point:'0',minimum:'0',maximum:'0',comments:''};
test('job parts request boundaries',async()=>{const url='https://test.invalid/_api/job-parts?companyId='+company;assert.equal((await jobPartsHandler({},async()=>{throw Error();})(new Request(url))).status,401);assert.equal((await jobPartsHandler({},async()=>1)(new Request(url,{method:'POST',headers:{Origin:'https://evil.invalid'}}))).status,403);assert.throws(()=>jobPartChange.parse({jobId:randomUUID(),partId:randomUUID(),requestId:randomUUID(),version:0,quantity:'-1',reason:'bad'}));});
test('job parts deduct and return atomically with concurrency and audit protection',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const schema='test_jobparts_'+Date.now(),setup=postgres(process.env.TEST_DATABASE_URL,{onnotice:()=>{}});await setup.unsafe(`create schema ${schema}`);await setup.end();const db=postgres(process.env.TEST_DATABASE_URL,{connection:{search_path:schema},onnotice:()=>{}});
 try{
 await db`create table users(id integer primary key,email text,display_name text)`;await db`create table native_gateway_members(auth_user_id integer,role text,enabled boolean)`;await db`create table service_jobs(id uuid primary key,job_number integer,data jsonb)`;
 await db`insert into users values(1,'owner@example.invalid','Owner'),(2,'member@example.invalid','Member'),(3,'other@example.invalid','Other')`;await db`insert into native_gateway_members values(1,'admin',true),(2,'user',true)`;
 const c=await db.reserve();try{for(const n of ['007-platform-foundation','012-parts-inventory','013-part-stock-movements','014-service-job-parts'])await c.unsafe(await readFile(new URL('../migrations/'+n+'.sql',import.meta.url),'utf8'));}finally{c.release();}
 const parts=partsStore(db),store=jobPartsStore(db),jobId=randomUUID();await db`insert into service_jobs values(${jobId},100,'{"status":"New"}')`;
 await parts.import(1,company,'c'.repeat(64),[{row:1,data,source:Array(127).fill('')}]);const part=(await parts.list(1,company,'','all','all',0)).rows[0];
 const request={jobId,partId:part.id,requestId:randomUUID(),version:0,quantity:'2.5',reason:'Initial issue'};
 await assert.rejects(store.save(2,company,request),{status:403});await assert.rejects(store.list(3,company,jobId),{status:403});await assert.rejects(store.save(1,randomUUID(),request),{status:403});await assert.rejects(store.save(1,company,{...request,partId:randomUUID()}),{status:404});
 await store.save(1,company,request);assert.equal((await store.save(1,company,request)).replayed,true);assert.equal(Number((await parts.detail(1,company,part.id)).part.data.on_hand),7.5);
 await assert.rejects(store.save(1,company,{...request,quantity:'3'}),{status:409});await assert.rejects(store.save(1,company,{...request,requestId:randomUUID()}),{status:409});
 for(const [version,quantity] of [[1,'4'],[2,'1'],[3,'0']])await store.save(1,company,{...request,requestId:randomUUID(),version,quantity,reason:'Correction'});
 const restored=(await parts.detail(1,company,part.id)).part;assert.equal(Number(restored.data.on_hand),10);assert.equal(Number(restored.data.available),8);assert.deepEqual(restored.opening_data,data);
 const history=await parts.history(1,company,part.id,0);assert.equal(history.total,4);assert.deepEqual(history.rows.map(r=>r.kind),['job_return','job_return','job_use','job_use']);assert.equal(history.rows[0].reference,'Service job #100');assert.equal(history.rows[0].actor_user_id,1);
 assert.equal((await store.list(2,company,jobId)).rows[0].quantity,'0');
 await db`update service_jobs set data='{"status":"Completed"}' where id=${jobId}`;await assert.rejects(store.save(1,company,{...request,requestId:randomUUID(),version:4,quantity:'1'}),{status:409});await db`update service_jobs set data='{"status":"New"}' where id=${jobId}`;
 await db`update inventory_parts set active=false where id=${part.id}`;await assert.rejects(store.save(1,company,{...request,requestId:randomUUID(),version:4,quantity:'1'}),{status:409});await db`update inventory_parts set active=true where id=${part.id}`;
 const otherJob=randomUUID();await db`insert into service_jobs values(${otherJob},101,'{"status":"New"}')`;
 const race=await Promise.allSettled([{jobId,version:4},{jobId:otherJob,version:0}].map(x=>store.save(1,company,{...request,...x,requestId:randomUUID(),quantity:'5'})));assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal(race.find(r=>r.status==='rejected').reason.status,409);assert.equal(Number((await parts.detail(1,company,part.id)).part.data.available),3);
 const [counts]=await db`select count(*)::int as n from part_stock_movements where job_id is not null`;assert.equal(counts.n,5);
 await db`update platform_entitlements set status='disabled' where tool_key='service-desk'`;await assert.rejects(store.list(1,company,jobId),{status:403});
 }finally{await db.end();const clean=postgres(process.env.TEST_DATABASE_URL,{onnotice:()=>{}});await clean.unsafe(`drop schema ${schema} cascade`);await clean.end();}
});
