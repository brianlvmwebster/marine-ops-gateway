import {calendarSyncEnabled} from './calendarSyncSettings';
import {db} from './db';import {graphCalendar} from './graphCalendar';
export async function renewCalendar(){
 if(!(await calendarSyncEnabled()))return;
 const configured=await db.selectFrom('calendarConnection').select('webhookBase').where('id','=',1).executeTakeFirst();if(!configured?.webhookBase)return;
 const c=await db.updateTable('calendarConnection').set({lockUntil:new Date(Date.now()+16*60000)}).where('id','=',1).where(eb=>eb.or([eb('lockUntil','is',null),eb('lockUntil','<',new Date())])).returningAll().executeTakeFirst();
 if(!c)throw new Error('Calendar sync is running. Try renewing live updates again after it finishes.');
 try{
  if(!c.webhookBase)return;
  if(c.subscriptionExpires&&new Date(c.subscriptionExpires).getTime()>Date.now()+2*86400000)return;
  const expirationDateTime=new Date(Date.now()+6*86400000).toISOString();let sub;
  if(c.subscriptionId){try{sub=await graphCalendar(c.email,'/subscriptions/'+encodeURIComponent(c.subscriptionId),'PATCH',{expirationDateTime});}catch(e){if((e as any).status!==404)throw e;}}
  if(!sub)sub=await graphCalendar(c.email,'/subscriptions','POST',{changeType:'updated,deleted',notificationUrl:c.webhookBase+'/_api/calendar/webhook',resource:'me/events',expirationDateTime,clientState:c.webhookSecret});
  await db.updateTable('calendarConnection').set({subscriptionId:sub.id,subscriptionExpires:new Date(sub.expirationDateTime),syncError:null}).where('id','=',1).execute();
 }catch(e){
  await db.updateTable('calendarConnection').set({syncError:'Live Outlook notifications: '+(e instanceof Error?e.message:String(e))}).where('id','=',1).execute();throw e;
 }finally{await db.updateTable('calendarConnection').set({lockUntil:null}).where('id','=',1).execute();}
}