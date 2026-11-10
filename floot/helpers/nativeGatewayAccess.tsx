import {getViewer} from '@floot/viewer';
import {sql} from 'kysely';
import {db} from './db';
import {getServerUserSession} from './getServerUserSession';
import {GatewayAccessError,companyMicrosoftSubject,requireGatewayOrigin} from './gatewayPolicy';
export type NativeGatewayAccess={userId:string;email:string;role:'admin'|'user';authUserId:number;displayName:string;preview:boolean};
type Member={email:string;role:'admin'|'user';serviceUserId:string|null;authUserId:number|null};
export async function nativeMemberForMicrosoftUser(user:{id:number;email:string;displayName:string}):Promise<NativeGatewayAccess>{
 const account=await db.selectFrom('oauthAccounts').select('providerUserId').where('userId','=',user.id).where('provider','=','microsoft').executeTakeFirst();
 if(!account||!companyMicrosoftSubject(account.providerUserId))throw new GatewayAccessError('Use your Lakeview company Microsoft account.',403);
 return db.transaction().execute(async trx=>{
  const result=await sql<Member>`select email,role,service_user_id,auth_user_id from native_gateway_members where email=${user.email.toLowerCase()} and enabled for update`.execute(trx);
  const member=result.rows[0];if(!member)throw new GatewayAccessError('Your company account needs gateway administrator approval.',403);
  if(member.authUserId!==null&&member.authUserId!==user.id)throw new GatewayAccessError('Account identity changed. Contact the gateway administrator.',403);
  const userId=member.serviceUserId||'microsoft:'+account.providerUserId;
  await sql`update native_gateway_members set auth_user_id=${user.id},service_user_id=${userId} where email=${member.email}`.execute(trx);
  return {userId,email:member.email,role:member.role,authUserId:user.id,displayName:user.displayName,preview:false};
 });
}
export async function nativeGatewayAccess(request:Request):Promise<NativeGatewayAccess>{
 requireGatewayOrigin(request);
 // A valid native session must pass company-tenant and current whitelist checks on every request.
 if((request.headers.get('cookie')||'').includes('floot_built_app_session=')){
  try{const {user}=await getServerUserSession(request);return await nativeMemberForMicrosoftUser(user);}catch(error){if(error instanceof GatewayAccessError)throw error;throw new GatewayAccessError();}
 }
 // Floot preview uses the already-authorized project viewer; public deployments have no viewer.
 const viewer=getViewer();
 if(viewer){const result=await sql<Member>`select email,role,service_user_id,auth_user_id from native_gateway_members where service_user_id=${viewer.userId} and enabled`.execute(db);const member=result.rows[0];if(member)return {userId:viewer.userId,email:viewer.email,role:member.role,authUserId:0,displayName:'Floot preview',preview:true};}
 throw new GatewayAccessError();
}
export async function nativeGatewayAdmin(request:Request){const access=await nativeGatewayAccess(request);if(access.role!=='admin')throw new GatewayAccessError('Gateway administrator access required.',403);return access;}
