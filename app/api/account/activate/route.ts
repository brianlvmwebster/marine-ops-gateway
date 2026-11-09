import {readLimitedBody,sameOrigin} from '../../../../lib/http';
import {activateAccount} from '../../../../lib/members';
import {microsoftSettings} from '../../../../lib/microsoft-auth.mjs';
export async function POST(request:Request){
 if(microsoftSettings().only)return Response.json({error:'Use company Microsoft sign-in.'},{status:403});
 if(!sameOrigin(request))return Response.json({error:'Invalid request origin.'},{status:403});
 let data;try{data=JSON.parse(new TextDecoder().decode(await readLimitedBody(request,8192)));}catch{return Response.json({error:'Invalid request.'},{status:400});}
 if(!data||typeof data.token!=='string'||!/^[\w-]{43}$/.test(data.token)||typeof data.password!=='string'||data.password.length<12||data.password.length>128)return Response.json({error:'Use a valid setup link and a password between 12 and 128 characters.'},{status:400});
 try{if(!await activateAccount(data.token,data.password))return Response.json({error:'This setup link is invalid or expired. Ask an administrator for a new one.'},{status:400});return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});}
 catch{return Response.json({error:'Unable to set the password. Ask an administrator for a new setup link.'},{status:503});}
}
