import {db} from './db';import {selectOutlookCalendar} from './selectOutlookCalendar';
describe('Outlook calendar selection',()=>{
 let current:any,writes:{table:string;values:any}[],lookup:jasmine.Spy;
 const input={calendarId:'service/calendar',expectedEmail:'service@example.com',expectedCalendarId:'primary'};
 beforeEach(()=>{
 current={email:'service@example.com',calendarId:'primary',lockUntil:null};writes=[];
 const read:any={select(){return this;},selectAll(){return this;},where(){return this;},forUpdate(){return this;},executeTakeFirst:async()=>current};
 spyOn(db,'selectFrom').and.returnValue(read);
 const trx:any={selectFrom:()=>read,updateTable:(table:string)=>({set(values:any){writes.push({table,values});return{where(){return this;},execute:async()=>[]};}})};
 spyOn(db,'transaction').and.returnValue({execute:async(fn:any)=>fn(trx)} as any);
 lookup=jasmine.createSpy('graph').and.resolveTo({id:'service/calendar',name:'Service schedule',canEdit:true,isDefaultCalendar:false});
 });
 it('validates the writable calendar and clears old event links without changing job details',async()=>{
 const result=await selectOutlookCalendar(input,lookup);
 expect(lookup).toHaveBeenCalledWith('service@example.com','/me/calendars/service%2Fcalendar');
 expect(result.calendarId).toBe('service/calendar');expect(result.changed).toBeTrue();
 const jobs=writes.find(w=>w.table==='serviceJobs')!.values;
 expect(jobs.eventId).toBeNull();expect(jobs.syncedVersion).toBe(0);expect('data' in jobs).toBeFalse();
 expect(writes.find(w=>w.table==='calendarConnection')!.values.calendarId).toBe('service/calendar');
 });
 it('rejects read-only calendars without changing the target or jobs',async()=>{
 lookup.and.resolveTo({id:'readonly',name:'Birthdays',canEdit:false});
 await expectAsync(selectOutlookCalendar(input,lookup)).toBeRejectedWithError('You do not have permission to edit this Outlook calendar.');
 expect(writes.length).toBe(0);
 });
 it('recognizes the default calendar by its real Graph ID and preserves existing links',async()=>{
 lookup.and.resolveTo({id:'actual-default-id',name:'Calendar',canEdit:true,isDefaultCalendar:true});
 const r=await selectOutlookCalendar({...input,calendarId:'actual-default-id'},lookup);
 expect(r.changed).toBeFalse();expect(writes.length).toBe(0);
 });
 it('rejects a stale account before looking up calendars',async()=>{
 current.email='another@example.com';
 await expectAsync(selectOutlookCalendar(input,lookup)).toBeRejectedWithError('The Outlook connection changed. Reload the calendar list and try again.');
 expect(lookup).not.toHaveBeenCalled();expect(writes.length).toBe(0);
 });
 it('rejects a calendar change while synchronization is active',async()=>{
 current.lockUntil=new Date(Date.now()+60000);
 await expectAsync(selectOutlookCalendar(input,lookup)).toBeRejectedWithError('Calendar sync is running. Wait for it to finish, then try changing calendars again.');
 expect(writes.length).toBe(0);
 });
 it('rechecks the connection inside the transaction after Graph returns',async()=>{
 lookup.and.callFake(async()=>{current={...current,calendarId:'someone-else-changed-it'};return{id:'service/calendar',name:'Service',canEdit:true};});
 await expectAsync(selectOutlookCalendar(input,lookup)).toBeRejectedWithError('The Outlook connection changed. Reload the calendar list and try again.');
 expect(writes.length).toBe(0);
 });
});