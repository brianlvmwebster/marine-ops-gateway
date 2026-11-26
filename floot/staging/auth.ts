import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {platformDatabase} from '../platform/database.ts';
import {setServerSession} from '../helpers/getSetServerSession';
import {stagingOnly} from './config.ts';
export async function stagingLogin(request:Request) {
 stagingOnly();
 const origin=new URL(request.url).origin;
 if(request.headers.get('origin')!==origin)return new Response('Invalid origin',{status:403});
 if(Number(request.headers.get('content-length')||0)>4096)return new Response('Too large',{status:413});
 const reader=request.body?.getReader();if(!reader)return new Response('Missing body',{status:400});
 let bytes=0;const chunks:Uint8Array[]=[];
 try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>4096){await reader.cancel();return new Response('Too large',{status:413});}chunks.push(part.value);}}finally{reader.releaseLock();}
 const form=new URLSearchParams(Buffer.concat(chunks).toString());
 const password=form.get('password')||'',secret=process.env.STAGING_LOGIN_SECRET||'';
 if(secret.length<32)throw new Error('Staging login secret is missing');
 const db=platformDatabase();
 const user=await db`select u.id from users u join native_gateway_members m on m.auth_user_id=u.id where u.email='owner@staging.example.invalid' and m.enabled`;
 if(user.length!==1)return new Response('Staging owner unavailable',{status:403});
 // A shared database lock makes the rate limit work across Cloud Run instances.
 return db.begin(async tx=>{
  await tx`select id from users where id=${user[0].id} for update`;
  const recent=await tx`select count(*) from login_attempts where attempted_at>now()-interval '15 minutes' and success=false`;
  if(Number(recent[0].count)>=10)return new Response('Too many attempts. Try again in 15 minutes.',{status:429});
  const match=timingSafeEqual(createHash('sha256').update(password).digest(),createHash('sha256').update(secret).digest());
  await tx`insert into login_attempts(email,success) values('owner@staging.example.invalid',${match})`;
  if(!match)return new Response('Invalid staging password.',{status:401});
  const id=randomBytes(32).toString('hex'),now=Date.now();
  await tx`insert into sessions(id,user_id,expires_at) values(${id},${user[0].id},now()+interval '8 hours')`;
  const response=new Response(null,{status:303,headers:{Location:'/','Cache-Control':'no-store'}});
  await setServerSession(response,{id,createdAt:now,lastAccessed:now});return response;
 });
}
export const loginPage=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Marine Ops staging sign-in</title>
<style>
*,*::before,*::after{box-sizing:border-box}
body{min-height:100dvh;margin:0;display:grid;place-items:center;padding:clamp(16px,4vw,40px);background:#edf2f5;color:#172d40;font:16px/1.5 system-ui,sans-serif}
main{display:grid;gap:16px;width:min(100%,420px);background:#fff;border:1px solid #c6d2db;border-radius:16px;padding:clamp(18px,5vw,36px);box-shadow:0 12px 40px #142d4116}
h1,p{margin:0}h1{font-size:clamp(1.65rem,5vw,2.1rem);line-height:1.2;letter-spacing:-.04em}
form,label{display:grid;gap:12px}label{gap:6px;font-weight:650}
input,button{width:100%;min-width:0;min-height:44px;font:inherit;padding:9px 12px;border-radius:10px;border:1px solid #617991}
button{border-color:#12578a;background:#12578a;color:#fff;font-weight:650;cursor:pointer}
button:hover{background:#0e4670}input:focus-visible,button:focus-visible{outline:2px solid #12578a;outline-offset:3px}
small{color:#455e72;font-size:13px}
</style></head><body><main><h1>Marine Ops staging</h1><p>Sign in to the Lakeview test workspace.</p>
<form method="post" action="/staging/login"><label>Staging password<input type="password" name="password" required autocomplete="current-password" maxlength="256"></label><button type="submit">Sign in</button></form>
<small>Use the staging password from Google Secret Manager.</small></main></body></html>`;
