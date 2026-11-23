import assert from 'node:assert/strict';
const origin=process.env.STAGING_URL;
assert.equal(origin,'https://marine-ops-staging-7esxar6tqa-ue.a.run.app');
const company='00000000-0000-4000-8000-000000000001';
const login=await fetch(origin+'/staging/login',{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password:process.env.STAGING_LOGIN_SECRET})});assert.equal(login.status,303);
const headers={Cookie:login.headers.get('set-cookie').split(';')[0],Origin:origin};
async function api(path,status=200){const r=await fetch(origin+'/_api/'+path+(path.includes('?')?'&':'?')+'companyId='+company,{headers});const v=await r.json();assert.equal(r.status,status,v.error);return v;}
try{
 const {rows}=await api('units?q=SYNTHETIC-UNIT-PICKER');assert.equal(rows.length,1);
 const context=await api('units/job-context?id='+rows[0].id);assert.equal(context.unit.id,rows[0].id);assert.equal(context.customer.id,rows[0].customer_id);
 const archived=await api('units?filter=archived&q=SYNTHETIC-UNIT-UI-QA');assert.equal(archived.rows.length,1);await api('units/job-context?id='+archived.rows[0].id,409);
 await api('units/job-context?id=00000000-0000-4000-8000-000000000099',404);
 if(process.argv.includes('--verify-browser')){
  const detail=await api('customers/detail?id='+context.customer.id);
  const jobs=detail.jobs.filter(j=>j.data.notes==='UNIT RECORD NEW JOB QA');assert.equal(jobs.length,1);
  const job=jobs[0];assert.equal((await api('units/job?jobId='+job.id)).unit.id,context.unit.id);
  assert.ok((await api('units/history?id='+context.unit.id)).rows.some(j=>j.id===job.id));
  assert.equal(job.data.email,context.customer.email);assert.equal(job.data.phone,context.customer.mobile_phone);assert.equal(job.data.year,context.unit.year);assert.equal(job.data.make,context.unit.make);assert.equal(job.data.model,context.unit.model);assert.equal(job.data.hullId,context.unit.vin);assert.equal(job.data.engine,'Manual unit launch QA engine');
 }
 console.log('PASS: saved unit/customer context and rejection checks'+(process.argv.includes('--verify-browser')?', browser-created job snapshots and both links verified.':'.'));
}finally{await fetch(origin+'/_api/auth/logout',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{}'});}
