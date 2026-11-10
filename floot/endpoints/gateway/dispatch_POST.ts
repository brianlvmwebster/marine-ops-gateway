import {gatewayFailure} from '../../helpers/gatewayResponse';
import {sql} from 'kysely';
import {db} from '../../helpers/db';
import {gatewayIssuer,verifyGatewaySignature} from '../../helpers/gatewaySignature';
import {gatewayRoutes} from '../../helpers/gatewayRoutes';
import {withServiceViewer} from '../../helpers/serviceViewer';
import {schema} from './dispatch_POST.schema';

async function handleAuthorized(request:Request){
 let raw:string;let claims:ReturnType<typeof verifyGatewaySignature>;
 try{
  if(Number(request.headers.get('content-length'))>1100000)return new Response('Request too large',{status:413});
  const reader=request.body?.getReader();const chunks:Uint8Array[]=[];let size=0;
  if(reader)try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1100000){await reader.cancel();return new Response('Request too large',{status:413});}chunks.push(value);}}finally{reader.releaseLock();}
  raw=Buffer.concat(chunks).toString('utf8');
  const trust=await sql<{publicKey:string}>`select public_key from service_gateway_trust where issuer=${gatewayIssuer} and enabled`.execute(db);
  if(!trust.rows[0])throw new Error('Gateway unavailable');
  const token=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
  claims=verifyGatewaySignature(token,raw,trust.rows[0].publicKey);
 }catch{return new Response('Gateway authentication required',{status:401,headers:{'Cache-Control':'no-store'}});}
 let payload:unknown;try{payload=JSON.parse(raw);}catch{return new Response('Invalid gateway request',{status:400});}
 const parsed=schema.safeParse(payload);
 if(!parsed.success)return new Response('Invalid gateway request',{status:400});
 const p=parsed.data,key=(p.method+' '+p.route) as keyof typeof gatewayRoutes;
 if(!Object.hasOwn(gatewayRoutes,key))return new Response('Unknown gateway route',{status:404});
 const nonce=await sql`insert into service_gateway_request_nonces(id,expires_at) values (${claims.jti},to_timestamp(${claims.exp})) on conflict do nothing returning id`.execute(db);
 if(!nonce.rows.length)return new Response('Gateway assertion already used',{status:401});
 await sql`delete from service_gateway_request_nonces where expires_at < now()-interval '5 minutes'`.execute(db);
 const mapped=await sql<{serviceUserId:string}>`select service_user_id from service_gateway_identities where gateway_user_id=${claims.sub} and lower(email)=${claims.email.toLowerCase()}`.execute(db);
 const viewer={userId:mapped.rows[0]?.serviceUserId||'gateway:'+claims.sub,email:claims.email.toLowerCase()};
 return withServiceViewer(viewer,async()=>{
  const {handle}=await gatewayRoutes[key]();
  const url=new URL('/_api/'+p.route,p.route.startsWith('auth/')?gatewayIssuer:'https://lakeviewservice.floot.app');url.search=p.query;
  const forwarded=new Request(url,{method:p.method,headers:{'Content-Type':'application/json','Origin':gatewayIssuer,'X-Service-Gateway-Origin':gatewayIssuer},...(p.method==='POST'?{body:p.body}:{})});
  const response=await (handle as (request:Request)=>Promise<Response>)(forwarded);
  const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');
  return new Response(response.body,{status:response.status,headers});
 });
}

export async function handle(request:Request){try{return await handleAuthorized(request);}catch(error){return gatewayFailure(error);}}
