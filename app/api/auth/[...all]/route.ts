import {getAuth} from '../../../../lib/auth';
const allowed=new Set(['/sign-in/email','/sign-out','/get-session']);
async function handle(request:Request){
 const path=new URL(request.url).pathname.slice('/api/auth'.length);
 // Account creation is reachable only through a validated one-time setup link.
 if(!allowed.has(path))return Response.json({error:'Not found'},{status:404});
 return getAuth().handler(request);
}
export {handle as GET,handle as POST};
