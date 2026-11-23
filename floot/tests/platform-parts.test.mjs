import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import postgres from 'postgres';
import {partsStore,partsHandler,partData} from '../platform/parts.ts';
import {LAKEVIEW_ID} from '../platform/policy.ts';
const data={supplier_code:'QA',part_number:'001-QA',description:'Synthetic part',active:false,supplier_name:'Test supplier',category:'TEST',manufacturer:'',manufacturer_part_number:'',upc:'001234',bins:['B1','',''],on_hand:'-1.25',available:'-2.25',active_price:'0',retail_price:'0',sale_price:'0',replacement_cost:'-2',inventory_value:'0',reorder_point:'0',minimum:'0',maximum:'0',comments:''};
const row={row:3,data,source:Array(127).fill('')},batch='a'.repeat(64);
test('parts validation and request boundaries',async()=>{
 assert.equal(partData.parse(data).on_hand,'-1.25');assert.throws(()=>partData.parse({...data,on_hand:''}));assert.throws(()=>partData.parse({...data,available:'NaN'}));
 const url='https://test.invalid/_api/parts?companyId='+LAKEVIEW_ID;
 assert.equal((await partsHandler({},async()=>{throw Error();})(new Request(url))).status,401);
 const h=partsHandler({},async()=>1);assert.equal((await h(new Request(url+'&status=invalid'))).status,400);
 assert.equal((await h(new Request(url.replace('/parts?','/parts/import?'),{method:'POST',headers:{Origin:'https://evil.invalid'}}))).status,403);
});
test('parts preserve snapshots, supplier keys, quantities and access boundaries',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const schema='test_parts_'+Date.now(),setup=postgres(process.env.TEST_DATABASE_URL,{onnotice:()=>{}});await setup.unsafe(`create schema ${schema}`);await setup.end();
 const db=postgres(process.env.TEST_DATABASE_URL,{connection:{search_path:schema},onnotice:()=>{}});
 try{
 await db`create table users(id integer primary key,email text,display_name text)`;await db`create table native_gateway_members(auth_user_id integer,role text,enabled boolean)`;
 await db`insert into users values(1,'owner@example.invalid','Owner'),(2,'member@example.invalid','Member'),(3,'other@example.invalid','Other')`;await db`insert into native_gateway_members values(1,'admin',true),(2,'user',true)`;
 const c=await db.reserve();try{for(const n of ['007-platform-foundation','012-parts-inventory'])await c.unsafe(await readFile(new URL('../migrations/'+n+'.sql',import.meta.url),'utf8'));}finally{c.release();}
 const s=partsStore(db);assert.deepEqual(await s.import(1,LAKEVIEW_ID,batch,[row]),{inserted:1,skipped:0});assert.deepEqual(await s.import(1,LAKEVIEW_ID,batch,[row]),{inserted:0,skipped:1});
 await s.import(1,LAKEVIEW_ID,batch,[{...row,row:4,data:{...data,supplier_code:'QA2'}}]);
 const list=await s.list(2,LAKEVIEW_ID,'001-QA','inactive','negative',0);assert.equal(list.total,2);assert.notEqual(list.rows[0].id,list.rows[1].id);
 const p=(await s.detail(2,LAKEVIEW_ID,list.rows[0].id)).part;assert.equal(p.data.on_hand,'-1.25');assert.equal(p.data.available,'-2.25');assert.deepEqual(p.source_record,row.source);
 assert.equal((await s.list(1,LAKEVIEW_ID,'','active','all',0)).total,0);assert.equal((await s.list(1,LAKEVIEW_ID,'B1','all','all',0)).total,2);
 await assert.rejects(s.import(2,LAKEVIEW_ID,batch,[row]),{status:403});await assert.rejects(s.list(3,LAKEVIEW_ID,'','all','all',0),{status:403});await assert.rejects(s.list(1,randomUUID(),'','all','all',0),{status:403});
 await assert.rejects(s.detail(1,LAKEVIEW_ID,randomUUID()),{status:404});
 await assert.rejects(s.import(1,LAKEVIEW_ID,batch,[{...row,row:5,data:{...data,part_number:'ROLLBACK'}},{...row,data:{...data,on_hand:'99'}}]),{status:409});assert.equal((await s.list(1,LAKEVIEW_ID,'ROLLBACK','all','all',0)).total,0);
 await db`update platform_entitlements set status='disabled' where tool_key='parts-inventory'`;await assert.rejects(s.detail(1,LAKEVIEW_ID,p.id),{status:403});
 }finally{await db.end();const clean=postgres(process.env.TEST_DATABASE_URL,{onnotice:()=>{}});await clean.unsafe(`drop schema ${schema} cascade`);await clean.end();}
});
