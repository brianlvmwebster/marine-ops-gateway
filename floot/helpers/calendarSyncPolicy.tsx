export class CalendarSyncPaused extends Error {
 readonly code='CALENDAR_SYNC_PAUSED';
 constructor(){super('Calendar sync is paused. Jobs are saved in the dashboard only.');}
}
export async function runIfCalendarSyncEnabled<T>(readEnabled:()=>Promise<unknown>,work:()=>Promise<T>):Promise<T>{
 if(await readEnabled()!==true)throw new CalendarSyncPaused();
 return work();
}
export function isCalendarSyncPaused(error:unknown){return error instanceof CalendarSyncPaused;}
