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
  const response=new Response(null,{status:303,headers:{Location:'/platform','Cache-Control':'no-store'}});
  await setServerSession(response,{id,createdAt:now,lastAccessed:now});return response;
 });
}
export const loginPage=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MarineOps staging sign-in</title><style>body{font:18px system-ui;max-width:600px;margin:8vh auto;padding:24px;background:#102331;color:#fff}input,button{font:inherit;padding:12px;margin:12px 0;display:block}input{max-width:90%}a{color:#90d4ff}</style><main><h1>MarineOps staging</h1><p>Isolated Lakeview test workspace. Synthetic data only. Imports, Outlook, email and external integrations are disabled.</p><form method="post" action="/staging/login"><label>Staging password<input type="password" name="password" required autocomplete="current-password" maxlength="256"></label><button>Sign in as Lakeview Test Owner</button></form><p>Retrieve the staging password from Google Secret Manager. This is separate from your Google and Microsoft passwords.</p></main></html>`;
