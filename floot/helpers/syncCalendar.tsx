import {calendarSyncEnabled,withCalendarSyncEnabled} from './calendarSyncSettings';import {isCalendarSyncPaused} from './calendarSyncPolicy';
import {db} from './db';import {calendarTarget} from './calendarTarget';import {sql} from 'kysely';import {graphCalendar} from './graphCalendar';import {serviceTime} from './serviceTime';import type {JobData} from './jobModel';
export async function syncCalendar(options:{id?:string;resolution?:'local'|'outlook'}={}){
const configured=await db.selectFrom('calendarConnection').select('id').where('id','=',1).executeTakeFirst();if(!configured)return {connected:false,paused:!(await calendarSyncEnabled()),error:null};
if(!(await calendarSyncEnabled()))return {connected:true,paused:true,count:0,error:null};
const lock=await db.updateTable('calendarConnection').set({lockUntil:new Date(Date.now()+16*60000)}).where('id','=',1).where(eb=>eb.or([eb('lockUntil','is',null),eb('lockUntil','<',new Date())])).returningAll().executeTakeFirst();if(!lock)return {connected:true,error:'A calendar sync is already running. Your job is saved; Sync now after it finishes.'};
const c=lock;
let count=0,errors:string[]=[];
try{
 let query=db.selectFrom('serviceJobs').selectAll().where('calendarEligible','=',true).where(sql<boolean>`NOT (data->>'status' = 'Completed' AND data ? 'adminReview')`,'=',true).orderBy('updatedAt','desc').limit(2000);if(options.id)query=query.where('id','=',options.id);const jobs=await query.execute();
 for(const j of jobs){try{
 if(!(await calendarSyncEnabled()))return {connected:true,paused:true,count,error:null};
 const d=j.data as unknown as JobData;const localChanged=j.version>j.syncedVersion;
 let remote:any=null,deleted=false;
 if(j.eventId){try{remote=await graphCalendar(c.email,calendarTarget.eventsPath(c.calendarId,j.eventId));}catch(e){if((e as any).status===404)deleted=true;else throw e;}}
 const remoteChanged=!!j.eventId&&(deleted||remote?.['@odata.etag']!==j.remoteEtag);
 if(remoteChanged&&localChanged&&!options.resolution){await db.updateTable('serviceJobs').set({syncError:'CONFLICT: Job and Outlook both changed. Choose which schedule to keep.'}).where('id','=',j.id).execute();errors.push('Job '+j.jobNumber+': conflict');continue;}
 const useRemote=remoteChanged&&(!localChanged||options.resolution==='outlook');
 if(useRemote){let next={...d};if(deleted||remote?.isCancelled){next.status='Cancelled';next.appointment='Cancelled';next.cancelledBy='OUTLOOK';}else{
 if(remote.type&&remote.type!=='singleInstance')throw new Error('Recurring Outlook events are not supported for jobs; restore a single appointment.');
 const start=remote.start?.dateTime,end=remote.end?.dateTime;if(!start||!end)throw new Error('Outlook event has no schedule');next={...next,...serviceTime.fromUtc(start),duration:Math.max(15,Math.round((Date.parse(end+'Z')-Date.parse(start+'Z'))/60000))};
 }
 await withCalendarSyncEnabled(()=>db.updateTable('serviceJobs').set({data:next,version:j.version+1,syncedVersion:j.version+1,remoteEtag:remote?.['@odata.etag']||null,eventId:deleted?null:j.eventId,syncError:null,updatedAt:new Date()}).where('id','=',j.id).where('version','=',j.version).execute());count++;continue;
 }
 if(!localChanged&&!options.resolution)continue;
 if(d.status==='Cancelled'||d.appointment==='Cancelled'){if(remote)await graphCalendar(c.email,calendarTarget.eventsPath(c.calendarId,j.eventId!),'DELETE',undefined,remote['@odata.etag']);await db.updateTable('serviceJobs').set({eventId:null,remoteEtag:null,syncedVersion:j.version,syncError:null}).where('id','=',j.id).execute();count++;continue;}
 const start=serviceTime.toUtc(d.serviceDate,d.time),end=new Date(start.getTime()+d.duration*60000);
 const body={subject:'LVM #'+j.jobNumber+' · '+d.firstName+' '+d.lastName+' · '+d.make+' '+d.model,start:{dateTime:start.toISOString(),timeZone:'UTC'},end:{dateTime:end.toISOString(),timeZone:'UTC'},location:{displayName:d.pickupAddress||d.lake||'Lakeview Marine'},body:{contentType:'Text',content:['Lakeview Marine job #'+j.jobNumber,'Customer: '+d.firstName+' '+d.lastName,d.phone+' | '+d.email,'Vessel: '+d.year+' '+d.make+' '+d.model+' | '+d.engine,'Services: '+d.services.join(', '),'Technician: '+d.technician,'Pickup: '+d.pickup,'Return: '+d.returnType,'Notes: '+d.notes].join('\n')}};
 let event;if(remote)event=await graphCalendar(c.email,calendarTarget.eventsPath(c.calendarId,j.eventId!),'PATCH',body,remote['@odata.etag']);else event=await graphCalendar(c.email,calendarTarget.eventsPath(c.calendarId),'POST',{...body,transactionId:calendarTarget.transactionId(c.email,c.calendarId,j.id)});
 await db.updateTable('serviceJobs').set({eventId:event.id,remoteEtag:event['@odata.etag'],syncedVersion:j.version,syncError:null}).where('id','=',j.id).execute();count++;
 }catch(e){if(isCalendarSyncPaused(e))return {connected:true,paused:true,count,error:null};const message=e instanceof Error?e.message:'Sync failed';errors.push('Job '+j.jobNumber+': '+message);await db.updateTable('serviceJobs').set({syncError:message}).where('id','=',j.id).execute();}}
 const error=errors.length?errors.slice(0,5).join('; '):null;
 await db.updateTable('calendarConnection').set({lastSync:new Date(),syncError:error}).where('id','=',1).execute();return {connected:true,count,error};
}catch(e){const error=e instanceof Error?e.message:'Sync failed';await db.updateTable('calendarConnection').set({syncError:error}).where('id','=',1).execute();throw e;}finally{await db.updateTable('calendarConnection').set({lockUntil:null}).where('id','=',1).execute();}
}