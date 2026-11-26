import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {stagingOnly} from '../staging/config.ts';
test('staging refuses production database settings',()=>{
 const saved={...process.env};
 try{
  process.env.APP_ENV='staging';process.env.GOOGLE_CLOUD_PROJECT='marine-ops';process.env.DATABASE_URL='postgres://test:test@localhost/production';delete process.env.FLOOT_DATABASE_URL;
  assert.throws(stagingOnly);
  process.env.DATABASE_URL='postgres://test:test@localhost/marine_ops_staging';stagingOnly();
  process.env.FLOOT_DATABASE_URL='postgres://production';assert.throws(stagingOnly);
 }finally{process.env=saved;}
});
test('standalone server starts without Floot; denied routes and anonymous APIs fail closed',async()=>{
 const child=spawn(process.execPath,['--import','tsx','staging/server.ts'],{env:{...process.env,APP_ENV:'staging',GOOGLE_CLOUD_PROJECT:'marine-ops',DATABASE_URL:'postgres://test:test@localhost/marine_ops_staging',FLOOT_DATABASE_URL:'',JWT_SECRET:'test-only-not-a-deployment-secret-123456',STAGING_LOGIN_SECRET:'test-only-not-a-deployment-secret-123456',PORT:'18087',CLOUD_SQL_CONNECTION_NAME:''},stdio:'pipe'});
 let output='';child.stderr.on('data',data=>output+=data);
 try{
  let ready=false;
  for(let i=0;i<80;i++){try{const r=await fetch('http://127.0.0.1:18087/staging/health');if(r.ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
  assert.ok(ready,output);
  const alias=await fetch('http://127.0.0.1:18087/maps?companyId=test',{redirect:'manual'});assert.equal(alias.status,308);assert.equal(alias.headers.get('location'),'/mapping?companyId=test');
  assert.equal((await fetch('http://127.0.0.1:18087/_api/dock/records')).status,401);
  const login=await fetch('http://127.0.0.1:18087/login');
  assert.equal(login.headers.get('referrer-policy'),'same-origin','Native form login must retain its same-origin Origin header');
  assert.equal((await fetch('http://127.0.0.1:18087/staging/login',{method:'POST',headers:{Origin:'null'},body:'password=test'})).status,403);
  for(const path of ['/_api/calendar/sync','/_api/imports/run','/_api/gateway/dispatch','/_api/auth/register_with_password']){
   assert.equal((await fetch('http://127.0.0.1:18087'+path,{method:'POST'})).status,403);
  }
  assert.equal((await fetch('http://127.0.0.1:18087/_api/platform')).status,401);
  assert.equal((await fetch('http://127.0.0.1:18087/_api/jobs')).status,401);
  assert.equal((await fetch('http://127.0.0.1:18087/_api/repair-orders')).status,401);
  assert.equal((await fetch('http://127.0.0.1:18087/_api/mapping/maps')).status,401);
  assert.equal((await fetch('http://127.0.0.1:18087/_api/mapping/image?id=00000000-0000-4000-8000-000000000001')).status,401);
  assert.equal((await fetch('http://127.0.0.1:18087/static/__dev/notes/test')).status,404);
  assert.equal((await fetch('http://127.0.0.1:18087/staging/login',{method:'POST',headers:{Origin:'https://evil.invalid'},body:'password=test'})).status,403);
 }finally{child.kill();}
});
