import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import superjson from 'superjson';
import {emptyJob} from '../helpers/jobModel.tsx';
const origin=process.env.STAGING_URL;assert.equal(origin,'https://marine-ops-staging-7esxar6tqa-ue.a.run.app');
const company='00000000-0000-4000-8000-000000000001';
const baseline=new URL('../backups/job-parts-print-baseline.json',import.meta.url);
const login=await fetch(origin+'/staging/login',{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password:process.env.STAGING_LOGIN_SECRET})});assert.equal(login.status,303);
const headers={Cookie:login.headers.get('set-cookie').split(';')[0],Origin:origin,'Content-Type':'application/json'};
async function api(path,data,sj=false){const r=await fetch(origin+'/_api/'+path,{headers,...(data?{method:'POST',body:sj?superjson.stringify(data):JSON.stringify(data)}:{})});const v=sj?superjson.parse(await r.text()):await r.json();assert.equal(r.status,200,v.error);return v;}
try{
 if(process.argv.includes('--seed')){
  const rows=Array.from({length:19},(_,i)=>({row:i+1,data:{supplier_code:'QA-PRINT',part_number:'SYNTHETIC-PRINT-'+String(i+1).padStart(2,'0'),description:i===18?'Removed part must not print':'Synthetic print verification part '+(i+1)+' with a long description to verify wrapping and readable multi-page job sheets.',active:true,supplier_name:'Synthetic supplier',category:'QA',manufacturer:'',manufacturer_part_number:'',upc:'',bins:['TEST','',''],on_hand:'10',available:'8',active_price:'2.25',retail_price:'2.25',sale_price:'0',replacement_cost:'1',inventory_value:'10',reorder_point:'0',minimum:'0',maximum:'0',comments:'Synthetic print test only'},source:Array(127).fill('')}));
  await api('parts/import?companyId='+company,{batch:'d'.repeat(64),rows});
  const jobs=await api('jobs',undefined,true);if(!jobs.jobs.some(j=>j.data.ro==='JOB-PARTS-PRINT-QA'))await api('jobs/save',{calendarEligible:false,data:{...emptyJob,firstName:'Print QA',lastName:'Synthetic',phone:'202-555-0180',email:'print-qa@example.invalid',year:'2026',make:'Test Marine',model:'QA',engine:'Test engine',serviceDate:'2026-12-01',time:'09:00',services:['Winterize'],ro:'JOB-PARTS-PRINT-QA',notes:'SYNTHETIC PRINT VERIFICATION',checklist:[]}},true);
 }
 const job=(await api('jobs',undefined,true)).jobs.find(j=>j.data.ro==='JOB-PARTS-PRINT-QA');assert.ok(job);
 const found=await api('parts?companyId='+company+'&q=SYNTHETIC-PRINT-');assert.equal(found.total,19);
 const path='job-parts?companyId='+company+'&jobId='+job.id;
 async function change(partId,quantity){const line=(await api(path)).rows.find(l=>l.part_id===partId);if(Number(line?.quantity||0)===Number(quantity))return;await api('job-parts?companyId='+company,{jobId:job.id,partId,version:line?.version||0,requestId:randomUUID(),quantity,reason:'Synthetic printed job sheet verification'});}
 async function snapshot(){return {lines:(await api(path)).rows,parts:await Promise.all(found.rows.map(async p=>({part:(await api('parts/detail?companyId='+company+'&id='+p.id)).part,history:await api('parts/history?companyId='+company+'&id='+p.id)})))};}
 if(process.argv.includes('--seed')){for(const p of found.rows)await change(p.id,'2.5');await change(found.rows.find(p=>p.part_number==='SYNTHETIC-PRINT-19'||p.data.part_number==='SYNTHETIC-PRINT-19').id,'0');await writeFile(baseline,JSON.stringify(await snapshot()));console.log('Seeded 18 fractional lines and one removed line.');}
 if(process.argv.includes('--verify')){assert.deepEqual(await snapshot(),JSON.parse(await readFile(baseline,'utf8')));console.log('PASS: viewing and printing left all line versions, stock balances and movement history unchanged.');}
 if(process.argv.includes('--cleanup')){for(const p of found.rows)await change(p.id,'0');for(const p of (await snapshot()).parts){assert.equal(Number(p.part.data.on_hand),10);assert.equal(Number(p.part.data.available),8);}console.log('PASS: all synthetic stock returned.');}
 console.log('Print test URL: '+origin+'/dashboard/jobs/'+job.id+'/print');
}finally{await fetch(origin+'/_api/auth/logout',{method:'POST',headers,body:'{}'});}
