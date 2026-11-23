import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const origin=process.env.STAGING_URL;assert.equal(origin,'https://marine-ops-staging-7esxar6tqa-ue.a.run.app');
const company='00000000-0000-4000-8000-000000000001',payload=JSON.parse(await readFile(process.argv[2],'utf8'));assert.equal(payload.rows.length,24097);
async function send(url,options){for(let n=0;;n++){try{return await fetch(url,{...options,signal:AbortSignal.timeout(60000)});}catch(e){if(n===2)throw e;}}}
const login=await send(origin+'/staging/login',{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password:process.env.STAGING_LOGIN_SECRET})});assert.equal(login.status,303);
const headers={Cookie:login.headers.get('set-cookie').split(';')[0],Origin:origin,'Content-Type':'application/json'};
async function api(path,data){const r=await send(origin+'/_api/parts'+path+(path.includes('?')?'&':'?')+'companyId='+company,{headers,...(data?{method:'POST',body:JSON.stringify(data)}:{})});const v=await r.json();assert.equal(r.status,200,v.error);return v;}
try{
 if(!process.argv.includes('--verify-only')){let inserted=0,skipped=0;for(let i=0;i<payload.rows.length;i+=100){const v=await api('/import',{batch:payload.batch,rows:payload.rows.slice(i,i+100)});inserted+=v.inserted;skipped+=v.skipped;if(i%5000===0)console.log('Processed '+Math.min(i+100,payload.rows.length)+' parts');}console.log(JSON.stringify({inserted,skipped}));}
 const expected=new Map(payload.rows.map(r=>[r.row,r])),seen=new Set(),ids=new Set();let active=0,negative=0;
 function verify(p){if(p.source_batch!==payload.batch)return;const r=expected.get(p.source_row);assert.ok(r);assert.ok(!seen.has(p.source_row));seen.add(p.source_row);ids.add(p.id);for(const [key,value] of Object.entries(r.data)){if(!['on_hand','available'].includes(key))assert.deepEqual(p.data[key],value);}assert.equal(p.source_sha,createHash('sha256').update(JSON.stringify(r.source)).digest('hex'));if(p.data.active)active++;if(Number(r.data.on_hand)<0)negative++;}
 const first=await api('?status=all');assert.ok(first.total>=24097);first.rows.forEach(verify);
 for(let n=1;n<Math.ceil(first.total/50);n+=8){const pages=await Promise.all(Array.from({length:Math.min(8,Math.ceil(first.total/50)-n)},(_,j)=>api('?status=all&page='+(n+j))));pages.forEach(p=>p.rows.forEach(verify));}
 assert.equal(seen.size,24097);assert.equal(ids.size,24097);assert.equal(active,17942);assert.equal(negative,34);
 const sample=first.rows.find(p=>p.source_batch===payload.batch),detail=(await api('/detail?id='+sample.id)).part;assert.deepEqual(detail.source_record,expected.get(sample.source_row).source);
 assert.equal((await fetch(origin+'/_api/parts?companyId='+company)).status,401);
 console.log('PASS: all 24,097 IDs, catalog fields and original-row hashes reconciled (current stock may legitimately differ after movements). Anonymous access rejected.');
}finally{await send(origin+'/_api/auth/logout',{method:'POST',headers,body:'{}'});}
