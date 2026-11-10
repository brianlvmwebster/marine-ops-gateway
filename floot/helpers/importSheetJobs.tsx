import {db} from './db';import {sql} from 'kysely';import {parseSheetCsv,mergeSheetJob,stableJson,SHEET_ID,SHEET_GID,type SheetConflict} from './sheetMapping';import type {JobData} from './jobModel';
export async function importSheetJobs(options:{force?:boolean}={}){
 const started=new Date();
 const state=await db.selectFrom('sheetImportState').selectAll().where('id','=',1).executeTakeFirstOrThrow();
 if(!state.enabled)return {skipped:true,reason:'Sheet imports are paused'};
 if(options.force===false&&state.lastImportAt&&started.getTime()-new Date(state.lastImportAt).getTime()<5*60000)return {skipped:true,reason:'Already checked recently'};
 try{
  const response=await fetch('https://docs.google.com/spreadsheets/d/'+SHEET_ID+'/export?format=csv&gid='+SHEET_GID,{signal:AbortSignal.timeout(25000),cache:'no-store'});
  if(!response.ok||!response.headers.get('content-type')?.includes('text/csv'))throw new Error('Google Sheet is not accessible. Existing jobs have been preserved.');
  const csv=await response.text();if(csv.length>4000000)throw new Error('Sheet exceeds the supported import size.');
  const records=parseSheetCsv(csv);
  return await db.transaction().execute(async trx=>{
   const active=await trx.selectFrom('sheetImportState').selectAll().where('id','=',1).forUpdate().executeTakeFirstOrThrow();
   if(!active.enabled)return {skipped:true,reason:'Sheet imports are paused'};
   if(active.lastFetchedAt&&new Date(active.lastFetchedAt).getTime()>started.getTime())return {skipped:true,reason:'A newer sheet snapshot was already imported'};
   if(options.force===false&&active.lastImportAt&&started.getTime()-new Date(active.lastImportAt).getTime()<5*60000)return {skipped:true,reason:'Already checked recently'};
   const existing=(await sql<any>`select s.*, j.data as job_data, j.version as job_version from sheet_job_sources s join service_jobs j on j.id = s.job_id for update of j, s`.execute(trx)).rows;
   const byKey=new Map(existing.map((r:any)=>[r.sourceKey,r]));
   const missing=records.filter(r=>!byKey.has(r.sourceKey));
   const newIds=new Map<string,string>();
   if(missing.length){
    const inserted=await trx.insertInto('serviceJobs').values(missing.map(r=>({data:r.data,calendarEligible:false}))).returning(['id','data']).execute();
    for(const row of inserted)newIds.set('jotform:'+(row.data as any).sourceSubmissionId,row.id);
    await trx.insertInto('sheetJobSources').values(missing.map(r=>({sourceKey:r.sourceKey,jobId:newIds.get(r.sourceKey)!,baselineData:r.data,rawData:{...r.raw,__sourceRow:r.sourceRow}}))).execute();
   }
   let updated=0,unchanged=0,conflicts=0,missingSource=0;
   for(const record of records){
    const previous:any=byKey.get(record.sourceKey);
    if(!previous)continue;
    const merged=mergeSheetJob(previous.jobData as JobData,previous.baselineData as JobData,record.data,previous.conflicts as SheetConflict[]);
    if(merged.changed){
     await trx.updateTable('serviceJobs').set({data:merged.data,version:previous.jobVersion+1,updatedAt:new Date()}).where('id','=',previous.jobId).where('version','=',previous.jobVersion).execute();updated++;
    }else unchanged++;
    if(merged.conflicts.length)conflicts++;
    if(stableJson(previous.baselineData)!==stableJson(record.data)||stableJson(previous.conflicts)!==stableJson(merged.conflicts)||previous.missingSource||stableJson(previous.rawData)!==stableJson({...record.raw,__sourceRow:record.sourceRow})){
     await trx.updateTable('sheetJobSources').set({baselineData:record.data,rawData:{...record.raw,__sourceRow:record.sourceRow},conflicts:merged.conflicts as any,missingSource:false,updatedAt:new Date()}).where('sourceKey','=',record.sourceKey).execute();
    }
   }
   const present=new Set(records.map(r=>r.sourceKey));
   for(const row of existing)if(!present.has(row.sourceKey)){missingSource++;if(!row.missingSource)await trx.updateTable('sheetJobSources').set({missingSource:true,updatedAt:new Date()}).where('sourceKey','=',row.sourceKey).execute();}
   const result={created:missing.length,updated,unchanged,conflicts,missingSource,total:records.length,completed:records.filter(r=>r.data.status==='Done').length,issues:records.filter(r=>r.data.importIssues?.length).length,finishedAt:new Date().toISOString()};
   await trx.updateTable('sheetImportState').set({lastImportAt:new Date(),lastFetchedAt:started,lastError:null,lastSummary:result}).where('id','=',1).execute();
   await trx.insertInto('sheetImportRuns').values({startedAt:started,result}).execute();
   return result;
  });
 }catch(error){
  const message=error instanceof Error?error.message:'Sheet import failed';
  await db.updateTable('sheetImportState').set({lastError:message}).where('id','=',1).execute();
  await db.insertInto('sheetImportRuns').values({startedAt:started,error:message}).execute();
  throw error;
 }
}
