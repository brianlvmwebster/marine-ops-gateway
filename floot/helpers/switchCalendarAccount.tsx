import {db} from './db';import {sql} from 'kysely';
export async function switchCalendarAccount(email:string){
 return db.transaction().execute(async trx=>{
  // Serialize with sync's lease acquisition before changing any linked events.
  const existing=await trx.selectFrom('calendarConnection').selectAll().where('id','=',1).forUpdate().executeTakeFirst();
  if(existing?.lockUntil&&new Date(existing.lockUntil).getTime()>Date.now())throw new Error('Calendar sync is running. Wait for it to finish, then try changing accounts again.');
  if(!existing){await trx.insertInto('calendarConnection').values({id:1,email}).execute();return;}
  if(existing.email.toLowerCase()===email.toLowerCase()){
   await trx.updateTable('calendarConnection').set({email,syncError:null}).where('id','=',1).execute();return;
  }
  // Preserve jobs and old calendar events. The next sync creates fresh links in the new mailbox.
  await trx.updateTable('serviceJobs').set({eventId:null,remoteEtag:null,syncedVersion:0,syncError:null}).execute();
  await trx.updateTable('calendarConnection').set({
   email,calendarId:'primary',lastSync:null,syncError:null,subscriptionId:null,subscriptionExpires:null,
   webhookBase:null,webhookSecret:sql<string>`replace(gen_random_uuid()::text || gen_random_uuid()::text,'-','')`,lockUntil:null
  }).where('id','=',1).execute();
 });
}