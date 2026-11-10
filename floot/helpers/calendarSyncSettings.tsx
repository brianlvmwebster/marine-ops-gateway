import {db} from './db';
import {sql} from 'kysely';
import {runIfCalendarSyncEnabled} from './calendarSyncPolicy';
export async function calendarSyncEnabled():Promise<boolean>{
 const result=await sql<{enabled:boolean}>`select enabled from calendar_sync_settings where id = 1`.execute(db);
 return result.rows[0]?.enabled===true;
}
// Pausing takes the same database row lock as every outbound write. A successful
// pause response therefore waits for already-started writes to finish.
export async function withCalendarSyncEnabled<T>(work:()=>Promise<T>):Promise<T>{
 return db.transaction().execute(async trx=>runIfCalendarSyncEnabled(async()=>{
 const r=await sql<{enabled:boolean}>`select enabled from calendar_sync_settings where id = 1 for update`.execute(trx);
 return r.rows[0]?.enabled;
 },work));
}
export async function setCalendarSyncEnabled(enabled:boolean){
 return db.transaction().execute(async trx=>{
 await sql`select id from calendar_sync_settings where id = 1 for update`.execute(trx);
 const result=await sql<{enabled:boolean}>`update calendar_sync_settings set enabled = ${enabled}, updated_at = now() where id = 1 returning enabled`.execute(trx);
 if(!result.rows[0])throw new Error('Calendar sync settings are unavailable; syncing remains blocked.');
 return result.rows[0].enabled;
 });
}
