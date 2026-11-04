import {getAccess} from '../../../../lib/access';
import {readLimitedBody,sameOrigin} from '../../../../lib/http';
import {addMember,issueSetupLink,listMembers,normalizeEmail,updateMember,validEmail} from '../../../../lib/members';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){const access=await getAccess();if(!access.isAdmin)return json({error:'Administrator access required.'},403);return json({members:await listMembers(),email:access.email});}
export async function POST(request:Request){return mutate(request);}
export async function PATCH(request:Request){return mutate(request);}
async function mutate(request:Request){
 const access=await getAccess();if(!access.isAdmin)return json({error:'Administrator access required.'},403);
 if(!sameOrigin(request))return json({error:'Invalid request origin.'},403);
 let data;try{data=JSON.parse(new TextDecoder().decode(await readLimitedBody(request,8192)));}catch{return json({error:'Invalid request.'},400);}
 if(!data||typeof data.email!=='string')return json({error:'Enter a valid email address.'},400);
 const email=normalizeEmail(data.email);
 if(!validEmail(email))return json({error:'Enter a valid email address.'},400);
 if(data.action==='setup'){const link=await issueSetupLink(email,new URL(request.url).origin);return link?json({link}):json({error:'Enable this account before issuing a setup link.'},400);}
 if(data.role!=='user'&&data.role!=='admin')return json({error:'Choose User or Admin.'},400);
 if(request.method==='POST'){
 if(!await addMember(email,data.role))return json({error:'This email is already on the whitelist.'},409);
 return json({link:await issueSetupLink(email,new URL(request.url).origin)});
 }
 if(typeof data.enabled!=='boolean')return json({error:'Invalid account status.'},400);
 if(!await updateMember(email,data.role,data.enabled))return json({error:'Keep at least one enabled administrator.'},409);
 return json({ok:true});
}
