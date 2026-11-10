import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {getAccess} from '../../../lib/access';
import {microsoftSettings} from '../../../lib/microsoft-auth.mjs';
import {dashboardIssuer} from '../../../lib/dashboard-protocol.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Content-Type':'text/html; charset=utf-8','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'};
export async function GET(request:Request,{params}:{params:Promise<{path?:string[]}>}){
 const {path=[]}=await params;const url=new URL(request.url);
 if(path.length&&!(path.length===3&&path[0]==='jobs'&&/^[0-9a-f-]{36}$/i.test(path[1])&&path[2]==='print'))return new Response('Not found',{status:404,headers});
 const access=await getAccess();
 if(!access.signedIn){const next=path.length?'/dashboard/jobs/'+path[1]+'/print'+(url.searchParams.get('mode')==='checklist'?'?mode=checklist':''):'/dashboard/';return Response.redirect(new URL('/sign-in?next='+encodeURIComponent(next),url.origin),307);}
 if(!access.canView)return new Response('<h1>Access required</h1><p>Ask your gateway administrator to approve your account.</p><a href="/">Back to gateway</a>',{status:403,headers});
 if(!microsoftSettings().only||process.env.BETTER_AUTH_URL!==dashboardIssuer||!process.env.SERVICE_DASHBOARD_SIGNING_KEY)return new Response('<h1>Service dashboard is not configured for this environment.</h1><a href="/">Back to gateway</a>',{status:503,headers});
 if(!path.length&&url.pathname==='/dashboard')return Response.redirect(new URL('/dashboard/',url.origin),308);
 const html=await readFile(join(process.cwd(),'service-runtime','index.html'),'utf8');
 return new Response(html.replace('<head>','<head><script>window.__LAKEVIEW_SERVICE_BASE__="/dashboard";</script>'),{headers});
}
