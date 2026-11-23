import assert from 'node:assert/strict';
import superjson from 'superjson';
import {emptyJob} from '../helpers/jobModel.tsx';
const origin=process.env.STAGING_URL;assert.equal(origin,'https://marine-ops-staging-7esxar6tqa-ue.a.run.app');
const company='00000000-0000-4000-8000-000000000001';
async function send(url,options){for(let n=0;;n++){try{return await fetch(url,{...options,signal:AbortSignal.timeout(60000)});}catch(e){if(n===2)throw e;}}}
const login=await send(origin+'/staging/login',{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password:process.env.STAGING_LOGIN_SECRET})});assert.equal(login.status,303);
const headers={Cookie:login.headers.get('set-cookie').split(';')[0],Origin:origin,'Content-Type':'application/json'};
async function api(path,data){const r=await send(origin+'/_api/'+path+(path.includes('?')?'&':'?')+'companyId='+company,{headers,...(data?{method:'POST',body:JSON.stringify(data)}:{})});const v=await r.json();assert.equal(r.status,200,v.error);return v;}
async function save(data,status=200){const r=await send(origin+'/_api/jobs/save',{method:'POST',headers,body:superjson.stringify(data)});const v=superjson.parse(await r.text());assert.equal(r.status,status,v.error);return v;}
try{
 const found=await api('customers?q=picker-qa%40example.invalid');assert.equal(found.rows.length,1);const customer=found.rows[0];
 if(process.argv.includes('--verify-browser')){
  const jobs=(await api('customers/detail?id='+customer.id)).jobs;
  for(const marker of ['UNIT PICKER BROWSER NEW','UNIT PICKER BROWSER EDIT']){
   const job=jobs.find(j=>j.data.notes.includes(marker));assert.ok(job,'Missing '+marker);
   const {unit}=await api('units/job?jobId='+job.id);assert.ok(unit);assert.equal(unit.customer_id,customer.id);assert.equal(job.data.make,unit.make);assert.equal(job.data.model,unit.model);assert.equal(job.data.year,unit.year);assert.equal(job.data.hullId,unit.vin);assert.equal(job.data.engine,'Manual QA engine');
  }
  console.log('PASS: browser-created and browser-edited jobs retain the correct customer/unit links and vessel snapshots.');
 }else{
  const fields={year:'2026',make:'Test Marine',model:'Unit Picker QA',vin:'SYNTHETIC-UNIT-PICKER',name:'Unit Picker Full QA',unit_type:'Boat',length:'',notes:'Synthetic unit selection verification only.',status:'active',reviewed:false};
  let u=(await api('units?filter=all&q=SYNTHETIC-UNIT-PICKER')).rows[0];if(!u){const v=await api('units/save',{version:0,customerId:customer.id,data:fields});u={...fields,...v};}
  let missing=(await api('units?filter=all&q=Unit%20Picker%20Missing%20QA')).rows[0];if(!missing){const data={...fields,name:'Unit Picker Missing QA',year:'',model:'',vin:''};missing=await api('units/save',{version:0,customerId:customer.id,data});}
  const data={...emptyJob,firstName:customer.first_name,lastName:customer.last_name,email:customer.email,phone:customer.mobile_phone,year:fields.year,make:fields.make,model:fields.model,hullId:fields.vin,engine:'Manual QA engine',serviceDate:'2026-12-02',time:'10:00',duration:60,pickup:'Customer Drop-off (Land)',trailer:'Customer Trailer',returnType:'Customer Pickup',services:['Winterize'],notes:'UNIT PICKER API QA'};
  const linked=await save({data,customerId:customer.id,unitId:u.id,calendarEligible:false});assert.equal((await api('units/job?jobId='+linked.id)).unit.id,u.id);
  await save({id:linked.id,version:linked.version,data:{...data,notes:data.notes+' Manual edit.'}});assert.equal((await api('units/job?jobId='+linked.id)).unit.id,u.id);
  await save({id:linked.id,version:linked.version,data,unitId:u.id},409);
  await save({data,unitId:u.id},400);
  await save({data,customerId:customer.id,unitId:'00000000-0000-4000-8000-000000000099'},404);
  const existing=await save({data:{...data,year:'1999',make:'Old manual make',model:'Old manual vessel',hullId:'OLD',notes:'UNIT PICKER BROWSER EDIT'},customerId:customer.id,calendarEligible:false});
  console.log(JSON.stringify({result:'PASS: atomic links, preserved link on manual edit, stale version and invalid selection rejected',unitId:u.id,editJobId:existing.id}));
 }
}finally{await send(origin+'/_api/auth/logout',{method:'POST',headers,body:'{}'});}
