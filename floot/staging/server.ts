import {schedulerHandler} from '../platform/dock-scheduler';
import {mappingHandler,mappingStore} from '../platform/mapping';
import {jobPartsHandler,jobPartsStore} from '../platform/job-parts';
import {partsHandler,partsStore} from '../platform/parts';
import {unitsHandler,unitsStore} from '../platform/units';
import {stagingDockAsset} from './dock-assets';
import {dockQuotesHandler,dockQuoteStore} from '../platform/dock-quotes';
import {Hono} from 'hono';
import {saveStagingJob} from './save-job';
import {customersHandler,customersStore} from '../platform/customers.ts';
import {integrationApiHandler,integrationApiStore} from '../platform/integration-api.ts';
import {importUpdatesHandler,importUpdatesStore} from '../platform/import-updates';
import {serve} from '@hono/node-server';
import {serveStatic} from '@hono/node-server/serve-static';
import superjson from 'superjson';
import {stagingOnly} from './config.ts';
import {stagingLogin,loginPage} from './auth.ts';
import {platformDatabase} from '../platform/database.ts';
import {platformStore} from '../platform/store.ts';
import {platformHandler} from '../platform/http.ts';
import {getServerUserSession} from '../helpers/getServerUserSession';
import {nativeGatewayAccess} from '../helpers/nativeGatewayAccess';
stagingOnly();
if(!process.env.JWT_SECRET || process.env.JWT_SECRET.length<32)throw new Error('Session secret required');
const app=new Hono();
// Keep same-origin form POST origins intact for CSRF checks; no-referrer makes them null.
app.use('*',async(c,next)=>{await next();c.header('Cache-Control','no-store');c.header('X-Content-Type-Options','nosniff');c.header('Referrer-Policy','same-origin');c.header('X-Frame-Options',['/_api/dock_builder/asset','/scheduler.html'].includes(c.req.path)?'SAMEORIGIN':'DENY');});
app.get('/staging/health',c=>c.json({status:'ok',environment:'staging',externalWrites:false}));
app.get('/readyz',async c=>{await platformDatabase()`select 1 from platform_companies limit 1`;return c.json({ready:true});});
app.get('/maps',c=>c.redirect('/mapping'+new URL(c.req.url).search,308));
app.get('/login',c=>c.html(loginPage));
app.post('/staging/login',c=>stagingLogin(c.req.raw));
const scheduler=schedulerHandler(platformDatabase(),async request=>(await getServerUserSession(request)).user.id);
app.all('/_api/dock/*',c=>scheduler(c.req.raw));
const mapping=mappingHandler(mappingStore(platformDatabase()),async request=>(await getServerUserSession(request)).user.id);
app.all('/_api/mapping/*',c=>mapping(c.req.raw));
const customers=customersHandler(customersStore(platformDatabase()),async request=>(await getServerUserSession(request)).user.id);
const jobParts=jobPartsHandler(jobPartsStore(platformDatabase()),async request=>(await getServerUserSession(request)).user.id);
app.all('/_api/job-parts',c=>jobParts(c.req.raw));
const parts=partsHandler(partsStore(platformDatabase()),async request=>(await getServerUserSession(request)).user.id);
app.all('/_api/parts',c=>parts(c.req.raw));app.all('/_api/parts/*',c=>parts(c.req.raw));
const units=unitsHandler(unitsStore(platformDatabase()),async request=>(await getServerUserSession(request)).user.id);
app.all('/_api/units',c=>units(c.req.raw));app.all('/_api/units/*',c=>units(c.req.raw));
app.all('/_api/customers',c=>customers(c.req.raw));app.all('/_api/customers/*',c=>customers(c.req.raw));
const integration=integrationApiHandler(integrationApiStore(platformDatabase()));
app.all('/api/v1/*',c=>integration(c.req.raw));
const importUpdates=importUpdatesHandler(importUpdatesStore(platformDatabase()),async request=>(await getServerUserSession(request)).user.id);
app.all('/_api/import-updates',c=>importUpdates(c.req.raw));
app.all('/_api/import-updates/*',c=>importUpdates(c.req.raw));
app.get('/_api/dock_builder/asset',c=>stagingDockAsset(c.req.raw));
const quotes=dockQuotesHandler(dockQuoteStore(platformDatabase()),async request=>(await nativeGatewayAccess(request)).authUserId);
app.all('/_api/dock-quotes',c=>quotes(c.req.raw));
const platform=platformHandler(platformStore(platformDatabase()),async request=>(await getServerUserSession(request)).user.id);
app.all('/_api/platform',c=>platform(c.req.raw));app.all('/_api/platform/*',c=>platform(c.req.raw));
app.get('/_api/auth/session',async c=>{try{await nativeGatewayAccess(c.req.raw);const {user}=await getServerUserSession(c.req.raw);return new Response(superjson.stringify({user}));}catch{return c.json({error:'Sign in to staging.'},401);}});
// Deliberate allowlist: unlisted integrations, webhooks, cron and legacy dispatch cannot run here.
app.post('/_api/jobs/save',c=>saveStagingJob(c.req.raw));
const routes:{method:'get'|'post';path:string;module:string}[]=[
 {method:'post',path:'/auth/logout',module:'auth/logout_POST'},
 {method:'get',path:'/gateway/links',module:'gateway/links_GET'},
 {method:'get',path:'/access/session',module:'access/session_GET'},
 {method:'get',path:'/jobs',module:'jobs_GET'},

 {method:'post',path:'/jobs/workflow',module:'jobs/workflow_POST'},
 {method:'post',path:'/jobs/complete',module:'jobs/complete_POST'},
 {method:'get',path:'/assignments/list',module:'assignments/list_GET'},
 {method:'post',path:'/assignments/save',module:'assignments/save_POST'},
 {method:'get',path:'/dashboard/preferences',module:'dashboard/preferences_GET'},
 {method:'post',path:'/dashboard/preferences',module:'dashboard/preferences_POST'},
 {method:'get',path:'/calendar/status',module:'calendar/status_GET'},
 {method:'get',path:'/imports/status',module:'imports/status_GET'},
 {method:'get',path:'/imports/job',module:'imports/job_GET'}
];
for(const route of routes)app[route.method]('/_api'+route.path,async c=>(await import('../endpoints/'+route.module+'.ts')).handle(c.req.raw));
app.all('/_api/*',c=>c.json({error:'This integration is disabled in isolated staging.'},403));
app.all('/__dev/*',c=>c.notFound());app.all('/static/*',c=>c.notFound());
app.use('*',serveStatic({root:'./dist'}));app.get('*',serveStatic({path:'./dist/index.html'}));
app.onError((error,c)=>{console.error('Staging request failed:',error.name);return c.json({error:'Staging request failed.'},500);});
// Cloud Run terminates TLS before Node. Use the configured public origin for CSRF checks,
// never a caller-controlled forwarded-host/proto header.
const server=serve({fetch:request=>{
 const url=new URL(request.url);
 const proxyOrigin='http://127.0.0.1:18089';
 const origin=process.env.STAGING_PROXY_ORIGIN===proxyOrigin&&request.headers.get('origin')===proxyOrigin?proxyOrigin:process.env.PUBLIC_ORIGIN;
 if(origin)request=new Request(new URL(url.pathname+url.search,origin),request);
 return app.fetch(request);
},hostname:'0.0.0.0',port:Number(process.env.PORT||8080)});
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
