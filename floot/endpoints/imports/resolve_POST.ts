import {gatewayFailure} from '../../helpers/gatewayResponse';
import {requireViewer} from '../../helpers/serviceViewer';import {db} from '../../helpers/db';import {jobModel} from '../../helpers/jobModel';import {schema} from './resolve_POST.schema';import superjson from 'superjson';import type {SheetConflict} from '../../helpers/sheetMapping';
async function handleAuthorized(request:Request){await requireViewer(request);try{const p=schema.parse(superjson.parse(await request.text()));await db.transaction().execute(async trx=>{
 await trx.selectFrom('sheetImportState').select('id').where('id','=',1).forUpdate().executeTakeFirstOrThrow();
 const source=await trx.selectFrom('sheetJobSources').selectAll().where('jobId','=',p.id).forUpdate().executeTakeFirstOrThrow();
 const job=await trx.selectFrom('serviceJobs').selectAll().where('id','=',p.id).forUpdate().executeTakeFirstOrThrow();
 if((job.data as any).status==='Completed'&&(job.data as any).adminReview&&p.choice==='source')throw new Error('Completed jobs are locked after review. Keep the reviewed dashboard value.');
 if(job.version!==p.version)throw new Error('Job changed. Reload it before resolving the conflict.');
 const conflicts=source.conflicts as unknown as SheetConflict[],conflict=conflicts.find(c=>c.field===p.field);
 if(!conflict)throw new Error('This conflict was already resolved. Reload the job.');
 const next={...job.data as any};if(p.choice==='source'){next[p.field]=conflict.sourceValue;if(p.field==='pickupAddress')delete next.pickupPlaceId;if(p.field==='returnAddress')delete next.returnPlaceId;}const data=jobModel.parse(next);
 await trx.updateTable('serviceJobs').set({data,version:job.version+1,updatedAt:new Date()}).where('id','=',job.id).execute();
 await trx.updateTable('sheetJobSources').set({conflicts:conflicts.filter(c=>c.field!==p.field) as any,updatedAt:new Date()}).where('jobId','=',job.id).execute();
 });return new Response(superjson.stringify({saved:true}));}catch(e){return new Response(superjson.stringify({error:e instanceof Error?e.message:'Conflict resolution failed'}),{status:409});}}

export async function handle(request:Request){try{return await handleAuthorized(request);}catch(error){return gatewayFailure(error);}}
