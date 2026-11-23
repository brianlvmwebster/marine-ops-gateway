import assert from 'node:assert/strict';
const origin=process.env.STAGING_URL;
assert.equal(origin,'https://marine-ops-staging-7esxar6tqa-ue.a.run.app');
const company='00000000-0000-4000-8000-000000000001';
const login=await fetch(origin+'/staging/login',{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password:process.env.STAGING_LOGIN_SECRET})});
assert.equal(login.status,303);
const headers={Cookie:login.headers.get('set-cookie').split(';')[0],Origin:origin};
async function api(path,status=200){const response=await fetch(origin+'/_api/'+path+(path.includes('?')?'&':'?')+'companyId='+company,{headers});const body=await response.json();assert.equal(response.status,status,body.error);return body;}
try {
  const {rows}=await api('units?q=SYNTHETIC-UNIT-PICKER');assert.equal(rows.length,1);
  const history=await api('units/history?id='+rows[0].id);
  assert.ok(history.total>=3);
  for(const job of history.rows){assert.equal((await api('units/job?jobId='+job.id)).unit.id,rows[0].id);assert.ok(job.job_number);assert.ok(Array.isArray(job.services));const detail=await api('units/service-job?id='+rows[0].id+'&jobId='+job.id);assert.equal(detail.job.id,job.id);assert.equal(detail.job.jobNumber,String(job.job_number));const sheet=await fetch(origin+'/dashboard/jobs/'+job.id+'/print',{headers});assert.equal(sheet.status,200);}
  const missing=await api('units?q=Unit%20Picker%20Missing%20QA');assert.equal(missing.rows.length,1);
  assert.deepEqual(await api('units/history?id='+missing.rows[0].id),{rows:[],total:0});
  await api('units/service-job?id='+missing.rows[0].id+'&jobId='+history.rows[0].id,404);
  if(process.argv.includes('--verify-edit')){const details=await Promise.all(history.rows.map(job=>api('units/service-job?id='+rows[0].id+'&jobId='+job.id)));assert.equal(details.filter(d=>d.job.data.ro==='UNIT-HISTORY-EDIT-QA').length,1);}
  await api('units/history?id='+rows[0].id+'&page=-1',400);
  await api('units/history?id=00000000-0000-4000-8000-000000000099',404);
  console.log('PASS: linked history, job relationships, service-sheet routes, empty history and invalid requests. No customer, unit or job records changed.');
} finally {await fetch(origin+'/_api/auth/logout',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{}'});}
