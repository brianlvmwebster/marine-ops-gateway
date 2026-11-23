import assert from 'node:assert/strict';
const origin=process.env.STAGING_URL;assert.equal(origin,'https://marine-ops-staging-7esxar6tqa-ue.a.run.app');
const company='00000000-0000-4000-8000-000000000001';
const login=await fetch(origin+'/staging/login',{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password:process.env.STAGING_LOGIN_SECRET})});assert.equal(login.status,303);
const headers={Cookie:login.headers.get('set-cookie').split(';')[0],Origin:origin};
async function api(path,status=200){const r=await fetch(origin+'/_api/'+path+(path.includes('?')?'&':'?')+'companyId='+company,{headers});const v=await r.json();assert.equal(r.status,status,v.error);return v;}
try{
 const found=await api('customers?q=picker-qa%40example.invalid');assert.equal(found.rows.length,1);const id=found.rows[0].id;
 const {customer}=await api('customers/job-context?id='+id);assert.equal(customer.id,id);
 const {jobs}=await api('customers/detail?id='+id);assert.ok(jobs.length);
 for(const row of jobs){const {job}=await api('customers/service-job?id='+id+'&jobId='+row.id);assert.equal(job.id,row.id);assert.equal(job.jobNumber,String(row.job_number));assert.equal((await api('customers/job?jobId='+job.id)).customer.id,id);}
 await api('customers/service-job?id=00000000-0000-4000-8000-000000000099&jobId='+jobs[0].id,404);
 await api('customers/service-job?id='+id+'&jobId=invalid',400);
 if(process.argv.includes('--verify-edit')){const matching=jobs.filter(j=>j.data.ro==='CUSTOMER-HISTORY-EDIT-QA');assert.equal(matching.length,1);assert.equal((await api('units/job?jobId='+matching[0].id)).unit,null);}
 if(process.argv.includes('--verify-new')){const matches=jobs.filter(j=>j.data.notes==='CUSTOMER RECORD NEW JOB QA');assert.equal(matches.length,1);const job=matches[0];assert.equal(job.data.firstName,customer.first_name);assert.equal(job.data.email,customer.email);assert.equal(job.data.phone,customer.mobile_phone);const {unit}=await api('units/job?jobId='+job.id);assert.ok(unit);assert.equal(unit.customer_id,id);assert.equal(job.data.make,unit.make);assert.equal(job.data.model,unit.model);assert.equal(job.data.hullId,unit.vin);assert.equal(job.data.engine,'Customer launch QA engine');console.log('PASS: customer-launched browser job contact snapshot, selected unit and both links.');}
 console.log('PASS: full customer job reads, explicit links, invalid requests'+(process.argv.includes('--verify-edit')?' and persisted browser edit on a job without a unit.':'.'));
}finally{await fetch(origin+'/_api/auth/logout',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{}'});}
