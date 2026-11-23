import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
// Import rows are idempotent by file/row, so a lost response can be retried safely.
async function send(url,options){for(let attempt=0;;attempt++){try{return await fetch(url,{...options,signal:AbortSignal.timeout(60000)});}catch(e){if(attempt===2)throw e;await new Promise(resolve=>setTimeout(resolve,1000));}}}
const origin=process.env.STAGING_URL;assert.equal(origin,'https://marine-ops-staging-7esxar6tqa-ue.a.run.app');
const company='00000000-0000-4000-8000-000000000001',payload=JSON.parse(await readFile(process.argv[2],'utf8'));
assert.equal(payload.rows.length,10312);assert.equal(payload.excluded,25);assert.equal(new Set(payload.rows.map(r=>r.row)).size,payload.rows.length);
const login=await send(origin+'/staging/login',{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password:process.env.STAGING_LOGIN_SECRET})});assert.equal(login.status,303);
const headers={Cookie:login.headers.get('set-cookie').split(';')[0],Origin:origin,'Content-Type':'application/json'};
async function api(path,data){const r=await send(origin+'/_api/'+path+(path.includes('?')?'&':'?')+'companyId='+company,{headers,...(data?{method:'POST',body:JSON.stringify(data)}:{})});const v=await r.json();assert.equal(r.status,200,v.error);return v;}
try{
 if(!process.argv.includes('--verify-only')){const totals={inserted:0,skipped:0,unassigned:0,excluded:0};for(let i=0;i<payload.rows.length;i+=100){const v=await api('units/import',{batch:payload.batch,rows:payload.rows.slice(i,i+100)});for(const k of Object.keys(totals))totals[k]+=v[k];}console.log(JSON.stringify({import:totals}));}
 const expected=new Map(payload.rows.map(r=>[r.row,r])),seen=new Set(),unitIds=new Set(),customers=new Map();let assigned=0,unassigned=0;
 async function pages(path,consume){const first=await api(path+'&page=0');first.rows.forEach(consume);for(let n=1;n<Math.ceil(first.total/50);n+=8){const results=await Promise.all(Array.from({length:Math.min(8,Math.ceil(first.total/50)-n)},(_,j)=>api(path+'&page='+(n+j))));results.forEach(v=>v.rows.forEach(consume));}}
 await pages('customers?status=all',c=>{if(c.source_number)customers.set(c.source_number,c.id);});
 await pages('units?filter=all',u=>{if(u.source_batch!==payload.batch)return;const r=expected.get(u.source_row);assert.ok(r);assert.ok(!seen.has(u.source_row));seen.add(u.source_row);unitIds.add(u.id);assert.deepEqual(u.source_record,r);for(const k of ['make','model','vin','length'])assert.equal(u[k],r[k]);assert.equal(u.customer_id,customers.get(r.customer_number)||null);assert.deepEqual(u.review_flags,r.flags);if(u.customer_id)assigned++;else unassigned++;});
 assert.equal(seen.size,10312);assert.equal(unitIds.size,10312);assert.equal(assigned,9981);assert.equal(unassigned,331);
 console.log(JSON.stringify({verification:'Every source row, field, flag and customer relationship reconciled',units:seen.size,assigned,unassigned}));
}finally{await send(origin+'/_api/auth/logout',{method:'POST',headers,body:'{}'});}
