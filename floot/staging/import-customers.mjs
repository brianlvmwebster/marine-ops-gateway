import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin=process.env.STAGING_URL;
assert.equal(origin,'https://marine-ops-staging-7esxar6tqa-ue.a.run.app','Only the authorized staging host');
assert.ok(process.env.STAGING_LOGIN_SECRET);
const rows=JSON.parse(await readFile(process.argv[2],'utf8'));
assert.equal(rows.length,8851,'Expected named Lakeview export');
assert.equal(new Set(rows.map(r=>r.source_number)).size,rows.length);
const response=await fetch(origin+'/staging/login',{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password:process.env.STAGING_LOGIN_SECRET})});
assert.equal(response.status,303);
const headers={Cookie:response.headers.get('set-cookie').split(';')[0],Origin:origin,'Content-Type':'application/json'};
let inserted=0,skipped=0;
try{
 for(let i=0;i<rows.length;i+=100){const r=await fetch(origin+'/_api/customers/import?companyId=00000000-0000-4000-8000-000000000001',{method:'POST',headers,body:JSON.stringify({rows:rows.slice(i,i+100)})});const v=await r.json();assert.equal(r.status,200,JSON.stringify(v));inserted+=v.inserted;skipped+=v.skipped;}
 console.log(JSON.stringify({inserted,skipped,total:rows.length}));
}finally{await fetch(origin+'/_api/auth/logout',{method:'POST',headers,body:'{}'});}
