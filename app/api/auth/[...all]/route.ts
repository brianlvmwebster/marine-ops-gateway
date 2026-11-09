import {getAuth} from '../../../../lib/auth';
import {authRouteAllowed,microsoftSettings} from '../../../../lib/microsoft-auth.mjs';
import {readLimitedBody} from '../../../../lib/http';
async function handle(request:Request){
 const path=new URL(request.url).pathname.slice('/api/auth'.length);
 const settings=microsoftSettings();
 if(settings.only&&!settings.configured)return Response.json({error:'Company Microsoft sign-in is not configured. Contact your administrator.'},{status:503});
 // Account creation is reachable only through a validated one-time setup link.
 if(!authRouteAllowed(path,settings))return Response.json({error:'Not found'},{status:404});
 if(path==='/sign-in/social'){
  if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
  let body;try{body=JSON.parse(new TextDecoder().decode(await readLimitedBody(request.clone(),8192)));}catch{return Response.json({error:'Invalid request.'},{status:400});}
  if(body?.provider!=='microsoft')return Response.json({error:'Use company Microsoft sign-in.'},{status:400});
 }
 return getAuth().handler(request);
}
export {handle as GET,handle as POST};
