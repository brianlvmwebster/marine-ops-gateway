import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {del} from '@vercel/blob';
import {getPool} from '../lib/auth-config.mjs';
const base='http://localhost:5173',db=getPool();
const testIp='203.0.113.'+(1+randomBytes(1)[0]%250);
const prefix='verify-'+randomBytes(6).toString('hex');
const adminEmail=prefix+'-admin@example.com',userEmail=prefix+'-user@example.com';
const password=randomBytes(24).toString('base64url'),newPassword=randomBytes(24).toString('base64url');
let server,adminCookie,userCookie,initial,version,uploaded;
const headers=cookie=>({'content-type':'application/json',origin:base,'x-forwarded-for':testIp,...(cookie?{cookie}:{})});
async function request(path,method='GET',body,cookie){return fetch(base+path,{method,headers:headers(cookie),...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'manual',signal:AbortSignal.timeout(15000)});}
async function login(email,pass){const r=await request('/api/auth/sign-in/email','POST',{email,password:pass});assert.equal(r.status,200,'Email/password login succeeds');return r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');}
try{
 await db.query("INSERT INTO gateway_access (email,role) VALUES ($1,'admin')",[adminEmail]);
 const token=randomBytes(32).toString('base64url');
 await db.query("UPDATE gateway_access SET setup_token_hash=$2,setup_expires_at=now()+interval '1 hour' WHERE email=$1",[adminEmail,createHash('sha256').update(token).digest('hex')]);
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','localhost','--port','5173'],{env:process.env,stdio:['ignore','pipe','pipe'],windowsHide:true});
 let log='';server.stdout.on('data',d=>{log+=d;});server.stderr.on('data',d=>{log+=d;});
 let ready=false;
 for(let i=0;i<30;i++){try{if((await fetch(base+'/sign-in',{signal:AbortSignal.timeout(15000)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
 assert.ok(ready,'Next.js starts');console.log('Local app is ready. Testing whitelist and permission boundaries.');
 assert.equal((await request('/api/buttons')).status,401);
 assert.equal((await request('/api/auth/sign-up/email','POST',{email:userEmail,password,name:'Uninvited'})).status,404);
 assert.equal((await request('/api/account/activate','POST',{token,password})).status,200);
 assert.equal((await request('/api/account/activate','POST',{token,password})).status,400,'Setup token is single-use');
 adminCookie=await login(adminEmail,password);
 let r=await request('/api/buttons','GET',undefined,adminCookie);assert.equal(r.status,200);initial=await r.json();version=initial.version;
 r=await request('/api/admin/users','POST',{email:userEmail,role:'user'},adminCookie);assert.equal(r.status,200);let link=(await r.json()).link;
 let userToken=new URLSearchParams(new URL(link).hash.slice(1)).get('token');
 assert.equal((await request('/api/account/activate','POST',{token:userToken,password})).status,200);
 userCookie=await login(userEmail,password);
 assert.equal((await request('/api/buttons','GET',undefined,userCookie)).status,200);
 assert.equal((await request('/api/buttons','PUT',{buttons:[],version},userCookie)).status,403);
 assert.equal((await request('/api/images','POST',{},userCookie)).status,403);
 assert.equal((await request('/api/admin/users','GET',undefined,userCookie)).status,403);
 const html=await (await request('/','GET',undefined,userCookie)).text();assert.equal(/<a[^>]+href="\/admin"/.test(html),false,'User UI hides editing links');
 assert.equal((await request('/admin','GET',undefined,userCookie)).status,307,'User cannot enter admin page');
 const fixture={id:prefix,title:'Verification tool',url:'https://example.com',description:'Disposable fixture',image:'',newTab:true};
 r=await request('/api/buttons','PUT',{buttons:[...initial.buttons,fixture],version},adminCookie);assert.equal(r.status,200);version=(await r.json()).version;
 assert.equal((await request('/api/buttons','PUT',{buttons:[],version:version-1},adminCookie)).status,409);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
 r=await fetch(base+'/api/images',{method:'POST',headers:headers(adminCookie),body:png});assert.equal(r.status,200);uploaded=(await r.json()).image;
 r=await request(uploaded,'GET',undefined,userCookie);assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),png);
 assert.equal((await request('/api/admin/users','PATCH',{email:userEmail,role:'admin',enabled:true},adminCookie)).status,200);
 assert.equal((await request('/api/admin/users','GET',undefined,userCookie)).status,200,'Role promotion applies to existing sessions');
 assert.equal((await request('/api/admin/users','PATCH',{email:userEmail,role:'user',enabled:true},adminCookie)).status,200);
 assert.equal((await request('/api/admin/users','GET',undefined,userCookie)).status,403,'Demotion applies immediately');
 assert.equal((await request('/api/admin/users','PATCH',{email:userEmail,role:'user',enabled:false},adminCookie)).status,200);
 assert.equal((await request('/api/buttons','GET',undefined,userCookie)).status,401,'Disabling revokes active sessions');
 assert.equal((await request('/api/auth/sign-in/email','POST',{email:userEmail,password})).status,403,'Disabled accounts cannot sign in');
 assert.equal((await request('/api/admin/users','PATCH',{email:userEmail,role:'user',enabled:true},adminCookie)).status,200);
 r=await request('/api/admin/users','POST',{email:userEmail,action:'setup'},adminCookie);assert.equal(r.status,200);link=(await r.json()).link;
 userToken=new URLSearchParams(new URL(link).hash.slice(1)).get('token');
 assert.equal((await request('/api/account/activate','POST',{token:userToken,password:newPassword})).status,200);
 assert.equal((await request('/api/auth/sign-in/email','POST',{email:userEmail,password})).status,401,'Old password no longer works');
 userCookie=await login(userEmail,newPassword);
 assert.equal((await request('/api/auth/sign-in/email','POST',{email:userEmail,password:newPassword})).status,429,'Repeated login attempts are rate limited');
 assert.equal((await request('/api/auth/sign-out','POST',{},userCookie)).status,200);
 assert.equal((await request('/api/buttons','GET',undefined,userCookie)).status,401);
 console.log('PASS: one-time setup, email/password login, no public signup, user read-only access, admin edits/images, role changes, immediate disable, password reset, logout, and save conflicts.');
}catch(error){console.error('Verification failed:',error.message);process.exitCode=1;}
finally{
 if(initial&&adminCookie){const r=await request('/api/buttons','PUT',{buttons:initial.buttons,version},adminCookie);if(!r.ok){console.error('Could not restore verification content: '+r.status);process.exitCode=1;}}
 if(uploaded)await del('images/'+uploaded.split('/').pop());
 await db.query('DELETE FROM "user" WHERE email=ANY($1::text[])',[[adminEmail,userEmail]]);
 await db.query('DELETE FROM gateway_access WHERE email=ANY($1::text[])',[[adminEmail,userEmail]]);
 await db.end();if(server)server.kill();
}
