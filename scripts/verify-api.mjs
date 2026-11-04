import assert from 'node:assert/strict';
import {createClerkClient} from '@clerk/backend';
import {spawn} from 'node:child_process';
import {del} from '@vercel/blob';
if(!process.env.CLERK_SECRET_KEY?.startsWith('sk_test_'))throw Error('This verification requires development Clerk keys.');
const clerk=createClerkClient({secretKey:process.env.CLERK_SECRET_KEY});
const email='verify-'+crypto.randomUUID().slice(0,12)+'+clerk_test@example.com';
const base='http://localhost:5173';
let user,server,authHeaders,version,initial,uploaded;
let serverLog='';
try {
  user=await clerk.users.createUser({emailAddress:[email],skipPasswordRequirement:true});
  const session=await clerk.sessions.createSession({userId:user.id});
  const {jwt}=await clerk.sessions.getToken(session.id);
  authHeaders={Authorization:'Bearer '+jwt,Origin:base,'Content-Type':'application/json'};
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','localhost','--port','5173'],{env:{...process.env,ADMIN_EMAILS:email},stdio:['ignore','pipe','pipe'],windowsHide:true});
  server.stdout.on('data',x=>{serverLog+=x;});server.stderr.on('data',x=>{serverLog+=x;});
  for(let i=0;i<40;i++){try{const r=await fetch(base+'/sign-in',{signal:AbortSignal.timeout(15000)});if(r.status===200)break;}catch{}await new Promise(r=>setTimeout(r,500));}
  console.log('Local Next.js server is ready. Testing authenticated routes.');
  assert.equal((await fetch(base+'/api/buttons')).status,401);
  assert.equal((await fetch(base+'/api/images/test')).status,401);
  let r=await fetch(base+'/api/buttons',{headers:authHeaders});assert.equal(r.status,200,'Verified administrator can read buttons');
  initial=await r.json();version=initial.version;
  const save=async(buttons,expected=version,headers=authHeaders)=>fetch(base+'/api/buttons',{method:'PUT',headers,body:JSON.stringify({buttons,version:expected})});
  const fixture={id:'verification-'+crypto.randomUUID(),title:'Verification tool',url:'https://example.com',description:'Disposable verification fixture',image:'',newTab:true};
  r=await save([fixture],version,{...authHeaders,Origin:'https://evil.example'});assert.equal(r.status,403);
  r=await save([{...fixture,url:'javascript:alert(1)'}]);assert.equal(r.status,400);
  r=await save([...initial.buttons,fixture]);assert.equal(r.status,200);version=(await r.json()).version;
  assert.equal((await save([],version-1)).status,409);
  let read=await (await fetch(base+'/api/buttons',{headers:authHeaders})).json();assert.ok(read.buttons.some(b=>b.id===fixture.id));
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  assert.equal((await fetch(base+'/api/images',{method:'POST',body:png})).status,401);
  assert.equal((await fetch(base+'/api/images',{method:'POST',headers:authHeaders,body:'<svg/>'})).status,400);
  r=await fetch(base+'/api/images',{method:'POST',headers:authHeaders,body:png});assert.equal(r.status,200);uploaded=(await r.json()).image;
  r=await fetch(base+uploaded,{headers:authHeaders});assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),png);
  r=await save([...initial.buttons,{...fixture,title:'Updated tool',image:uploaded}]);assert.equal(r.status,200);version=(await r.json()).version;
  read=await (await fetch(base+'/api/buttons',{headers:authHeaders})).json();assert.ok(read.buttons.some(b=>b.image===uploaded&&b.title==='Updated tool'));
  assert.equal((await fetch(base+'/admin',{headers:authHeaders})).status,200);
  console.log('PASS: Clerk verified-email authentication → API authorization → Neon CRUD/conflicts → private Blob upload/download.');
} catch(error) {console.error('API verification failed:',error.message,JSON.stringify(error.errors?.map(e=>({code:e.code,message:e.message,longMessage:e.longMessage}))));process.exitCode=1;}
finally {
  if(initial&&version!==undefined&&authHeaders){const r=await fetch(base+'/api/buttons',{method:'PUT',headers:authHeaders,body:JSON.stringify({buttons:initial.buttons,version})});if(!r.ok){console.error('Fixture restore failed: '+r.status);process.exitCode=1;}}
  if(uploaded)await del('images/'+uploaded.split('/').pop());
  if(user)await clerk.users.deleteUser(user.id);
  if(server)server.kill();
}
