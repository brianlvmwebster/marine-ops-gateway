import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const origin=process.env.STAGING_URL;
assert.equal(origin,'https://marine-ops-staging-7esxar6tqa-ue.a.run.app');
const expected=JSON.parse(await readFile(process.argv[2],'utf8'));
const base='/_api/customers?companyId=00000000-0000-4000-8000-000000000001';
assert.equal((await fetch(origin+base)).status,401);
const login=await fetch(origin+'/staging/login',{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password:process.env.STAGING_LOGIN_SECRET})});assert.equal(login.status,303);
const headers={Cookie:login.headers.get('set-cookie').split(';')[0],Origin:origin,'Content-Type':'application/json'};
const get=async path=>{const r=await fetch(origin+path,{headers});assert.equal(r.status,200);return r.json();};
try{
 const first=await get(base+'&status=all'),pages=Math.ceil(first.total/50),all=[...first.rows];
 for(let p=1;p<pages;p+=8){const results=await Promise.all(Array.from({length:Math.min(8,pages-p)},(_,i)=>get(base+'&status=all&page='+(p+i))));all.push(...results.flatMap(r=>r.rows));}
 const imported=all.filter(r=>r.source_number!==null);
 assert.equal(imported.length,expected.length);assert.deepEqual(new Set(imported.map(r=>r.source_number)),new Set(expected.map(r=>r.source_number)));
 const byNumber=new Map(expected.map(r=>[r.source_number,r]));
 for(const row of imported){const source=byNumber.get(row.source_number);for(const key of ['first_name','last_name','email','home_phone','mobile_phone','status'])assert.equal(row[key],source.data[key],key+' mismatch');}
 for(const index of [0,Math.floor(imported.length/2),imported.length-1]){const row=imported[index],source=byNumber.get(row.source_number);const {customer}=await get('/_api/customers/detail?companyId=00000000-0000-4000-8000-000000000001&id='+row.id);assert.equal(customer.source_active,source.source_active);assert.deepEqual(customer.source_record,source.source_record);for(const [key,value] of Object.entries(source.data))assert.deepEqual(customer[key],value,key+' mismatch');}
 console.log('PASS: anonymous denial; all '+expected.length+' source identities, names, contacts and available statuses reconcile; sampled original Active flags, full source records and addresses preserved.');
}finally{await fetch(origin+'/_api/auth/logout',{method:'POST',headers,body:'{}'});}
