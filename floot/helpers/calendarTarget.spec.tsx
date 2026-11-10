import {calendarTarget} from './calendarTarget';
describe('Calendar event routing',()=>{
 it('scopes event writes and reads to the selected calendar and encodes opaque IDs',()=>{
 expect(calendarTarget.eventsPath('primary')).toBe('/me/calendar/events');
 expect(calendarTarget.eventsPath('service/id','event/id')).toBe('/me/calendars/service%2Fid/events/event%2Fid');
 });
 it('keeps create retries idempotent but separates calendars and accounts',()=>{
 const a=calendarTarget.transactionId('service@example.com','calendar-a','job-1');
 expect(calendarTarget.transactionId('SERVICE@example.com','calendar-a','job-1')).toBe(a);
 expect(calendarTarget.transactionId('service@example.com','calendar-b','job-1')).not.toBe(a);
 expect(calendarTarget.transactionId('other@example.com','calendar-a','job-1')).not.toBe(a);
 });
});