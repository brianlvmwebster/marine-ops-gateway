import {db} from './db';import {graphCalendar} from './graphCalendar';
type Input={calendarId:string;expectedEmail:string;expectedCalendarId:string};
export async function selectOutlookCalendar(input:Input,lookup=graphCalendar){
 const active=await db.selectFrom('calendarConnection').select(['email','calendarId']).where('id','=',1).executeTakeFirst();
 if(!active||active.email!==input.expectedEmail||active.calendarId!==input.expectedCalendarId)throw new Error('The Outlook connection changed. Reload the calendar list and try again.');
 // Validate current access on the server; never trust a calendar name or edit flag from the browser.
 const selected=await lookup(input.expectedEmail,input.calendarId==='primary'?'/me/calendar':'/me/calendars/'+encodeURIComponent(input.calendarId));
 if(selected?.canEdit!==true)throw new Error('You do not have permission to edit this Outlook calendar.');
 const calendarId=selected.isDefaultCalendar?'primary':selected.id;
 if(!calendarId)throw new Error('Outlook returned an invalid calendar.');
 return db.transaction().execute(async trx=>{
 const c=await trx.selectFrom('calendarConnection').selectAll().where('id','=',1).forUpdate().executeTakeFirst();
 if(!c||c.email!==input.expectedEmail||c.calendarId!==input.expectedCalendarId)throw new Error('The Outlook connection changed. Reload the calendar list and try again.');
 if(c.calendarId===calendarId)return {changed:false,calendarId,name:selected.name};
 if(c.lockUntil&&new Date(c.lockUntil).getTime()>Date.now())throw new Error('Calendar sync is running. Wait for it to finish, then try changing calendars again.');
 await trx.updateTable('serviceJobs').set({eventId:null,remoteEtag:null,syncedVersion:0,syncError:null}).execute();
 await trx.updateTable('calendarConnection').set({calendarId,lastSync:null,syncError:null}).where('id','=',1).execute();
 return {changed:true,calendarId,name:selected.name};
 });
}