import {db} from './db';
import {switchCalendarAccount} from './switchCalendarAccount';
describe('Outlook account switching',()=>{
 let existing:any,writes:{table:string;values:any}[],trx:any;
 beforeEach(()=>{
  writes=[];
  const read:any={selectAll(){return this;},where(){return this;},forUpdate(){return this;},executeTakeFirst:async()=>existing};
  trx={selectFrom:()=>read,updateTable:(table:string)=>({set(values:any){writes.push({table,values});return {where(){return this;},execute:async()=>[]};}}),insertInto:(table:string)=>({values(values:any){writes.push({table,values});return {execute:async()=>[]};}})};
  spyOn(db,'transaction').and.returnValue({execute:async(fn:any)=>fn(trx)} as any);
 });
 it('reconnects the same mailbox without breaking existing job links',async()=>{
  existing={email:'service@example.com',lockUntil:null};
  await switchCalendarAccount('SERVICE@example.com');
  expect(writes.some(w=>w.table==='serviceJobs')).toBeFalse();
  expect(writes[0].values.email).toBe('SERVICE@example.com');
 });
 it('detaches old mailbox links and notifications while preserving job data',async()=>{
  existing={email:'old@example.com',lockUntil:null};
  await switchCalendarAccount('new@example.com');
  const jobs=writes.find(w=>w.table==='serviceJobs')!.values;
  expect(jobs.eventId).toBeNull();expect(jobs.remoteEtag).toBeNull();expect(jobs.syncedVersion).toBe(0);
  expect('data' in jobs).toBeFalse();expect('version' in jobs).toBeFalse();
  const connection=writes.find(w=>w.table==='calendarConnection')!.values;
  expect(connection.email).toBe('new@example.com');
  expect(connection.subscriptionId).toBeNull();expect(connection.webhookBase).toBeNull();
  expect(connection.webhookSecret).toBeDefined();
 });
 it('leaves the account and job links untouched while a sync holds its lease',async()=>{
  existing={email:'old@example.com',lockUntil:new Date(Date.now()+60000)};
  await expectAsync(switchCalendarAccount('new@example.com')).toBeRejectedWithError('Calendar sync is running. Wait for it to finish, then try changing accounts again.');
  expect(writes.length).toBe(0);
 });
});