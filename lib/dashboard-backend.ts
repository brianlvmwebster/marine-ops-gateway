import 'server-only';
import {getAccess} from './access';
import {sameOrigin,readLimitedBody} from './http';
import {dashboardMethods,signDashboardRequest,dashboardIssuer} from './dashboard-protocol.mjs';

const noStore={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
export async function dashboardBackend(request:Request,path:string[]){
 const access=await getAccess();
 if(!access.signedIn)return new Response(JSON.stringify({json:{error:'Sign in again to continue.'}}),{status:401,headers:noStore});
 if(!access.canView)return new Response(JSON.stringify({json:{error:'Approved gateway access required.'}}),{status:403,headers:noStore});
 if(!process.env.SERVICE_DASHBOARD_SIGNING_KEY||!access.userId)return new Response(JSON.stringify({json:{error:'Dashboard connection is not configured.'}}),{status:503,headers:noStore});
 const route=path.join('/');
 if(!dashboardMethods.has(request.method+' '+route))return new Response('Not found',{status:404,headers:noStore});
 if(request.method==='POST'&&!sameOrigin(request))return new Response('Forbidden origin',{status:403,headers:noStore});
 // The private-key deployment is scoped to the company preproduction branch.
 if(process.env.BETTER_AUTH_URL!==dashboardIssuer||process.env.AUTH_MICROSOFT_ONLY!=='true')return new Response('Dashboard is unavailable on this environment',{status:503,headers:noStore});
 try{
  const body=request.method==='POST'?new TextDecoder().decode(await readLimitedBody(request,1024*1024)):'';
  const raw=JSON.stringify({method:request.method,route,query:new URL(request.url).search,body});
  const token=signDashboardRequest(raw,{userId:access.userId,email:access.email},process.env.SERVICE_DASHBOARD_SIGNING_KEY);
  const upstream=await fetch('https://lakeviewservice.floot.app/_api/gateway/dispatch',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:raw,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(120000)});
  const headers=new Headers(noStore);headers.set('Content-Type',upstream.headers.get('Content-Type')||'application/json');
  return new Response(upstream.body,{status:upstream.status,headers});
 }catch(error){
  if(error instanceof RangeError)return new Response('Request too large',{status:413,headers:noStore});
  console.error('Service dashboard backend request failed',error instanceof Error?error.name:'UnknownError');
  return new Response(JSON.stringify({json:{error:'Dashboard connection unavailable. Try again.'}}),{status:502,headers:noStore});
 }
}
