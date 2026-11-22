import assert from 'node:assert/strict';
import superjson from 'superjson';
import {emptyJob} from '../helpers/jobModel.tsx';
const origin=process.env.STAGING_URL;assert.equal(origin,'https://marine-ops-staging-7esxar6tqa-ue.a.run.app');
const company='00000000-0000-4000-8000-000000000001';
const login=await fetch(origin+'/staging/login',{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password:process.env.STAGING_LOGIN_SECRET})});assert.equal(login.status,303);
const headers={Cookie:login.headers.get('set-cookie').split(';')[0],Origin:origin,'Content-Type':'application/json'};
async function customers(path,data){const r=await fetch(origin+'/_api/customers'+path+(path.includes('?')?'&':'?')+'companyId='+company,{headers,...(data?{method:'POST',body:JSON.stringify(data)}:{})});assert.equal(r.status,200);return r.json();}
async function save(data,status=200){const r=await fetch(origin+'/_api/jobs/save',{method:'POST',headers,body:superjson.stringify(data)});const v=superjson.parse(await r.text());assert.equal(r.status,status,v.error);return v;}
try{
 if(process.argv.includes('--verify-browser')){
  const found=await customers('?q=picker-qa%40example.invalid');assert.equal(found.rows.length,1);
  const detail=await customers('/detail?id='+found.rows[0].id);
  const browserJob=detail.jobs.find(j=>j.data.model==='Browser Picker QA');assert.ok(browserJob,'Browser-created job is linked on customer record');
  assert.equal(browserJob.data.phone,detail.customer.mobile_phone);assert.equal(browserJob.data.email,detail.customer.email);
  const edited=detail.jobs.find(j=>j.data.model==='Picker QA'&&!j.data.notes.includes('Edited snapshot.'));assert.ok(edited,'Previously unlinked browser-edited job is linked');
  assert.equal(edited.data.firstName,detail.customer.first_name);assert.equal(edited.data.lastName,detail.customer.last_name);
  console.log('PASS: browser-created and browser-edited jobs appear on the customer record with correct contact snapshots.');
 }else{
 const fields={first_name:'Picker QA',last_name:'Synthetic',email:'picker-qa@example.invalid',home_phone:'202-555-0142',mobile_phone:'202-555-0153',work_phone:'202-555-0164',addresses:[],notes:'SYNTHETIC customer-picker staging verification only.',status:'active'};
 const found=await customers('?q=picker-qa%40example.invalid&status=all');let id=found.rows[0]?.id;
 if(!id)id=(await customers('/save',{version:0,data:fields})).id;
 const job={...emptyJob,firstName:fields.first_name,lastName:fields.last_name,email:fields.email,phone:fields.mobile_phone,year:'2025',make:'Test Marine',model:'Picker QA',engine:'Synthetic engine',serviceDate:'2026-12-02',time:'10:00',duration:60,pickup:'Customer Drop-off (Land)',trailer:'Customer Trailer',trailerLocation:'Not applicable',returnType:'Customer Pickup',services:['Winterize'],notes:'SYNTHETIC customer-picker verification. No real customer work.'};
 const created=await save({data:job,customerId:id,calendarEligible:false});
 assert.equal((await customers('/job?jobId='+created.id)).customer.id,id);
 await save({id:created.id,version:created.version,data:{...job,notes:job.notes+' Edited snapshot.'}});
 assert.equal((await customers('/job?jobId='+created.id)).customer.id,id);
 await save({id:created.id,version:created.version,data:job,customerId:id},409);
 await save({data:job,customerId:'00000000-0000-4000-8000-000000000099'},404);
 const manual=await save({data:{...job,firstName:'Picker Edit',lastName:'QA'},calendarEligible:false});
 assert.equal((await customers('/job?jobId='+manual.id)).customer,null);
 assert.equal((await customers('/detail?id='+id)).customer.mobile_phone,fields.mobile_phone);
 console.log(JSON.stringify({result:'PASS: new linked job, preserved relationship on edit, stale-write rejection, invalid customer rejection, unchanged customer contact',customerId:id,linkedJobId:created.id,unlinkedJobForBrowser:manual.id}));
 }
}finally{await fetch(origin+'/_api/auth/logout',{method:'POST',headers,body:'{}'});}
