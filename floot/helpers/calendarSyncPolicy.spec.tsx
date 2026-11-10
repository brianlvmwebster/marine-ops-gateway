import {runIfCalendarSyncEnabled,CalendarSyncPaused} from './calendarSyncPolicy';
describe('Calendar sync pause',()=>{
 for(const state of [false,undefined,null,'true',1]){
  it('blocks outbound work unless the setting is explicitly true: '+String(state),async()=>{
   const work=jasmine.createSpy('outbound request').and.resolveTo('sent');
   await expectAsync(runIfCalendarSyncEnabled(async()=>state,work)).toBeRejectedWithError(CalendarSyncPaused);
   expect(work).not.toHaveBeenCalled();
  });
 }
 it('does not make a request when the settings read fails',async()=>{
  const work=jasmine.createSpy('outbound request');
  await expectAsync(runIfCalendarSyncEnabled(async()=>{throw new Error('database offline');},work)).toBeRejectedWithError('database offline');
  expect(work).not.toHaveBeenCalled();
 });
 it('allows a request only after explicit resume',async()=>{
  const work=jasmine.createSpy('outbound request').and.resolveTo('sent');
  expect(await runIfCalendarSyncEnabled(async()=>true,work)).toBe('sent');
  expect(work).toHaveBeenCalledTimes(1);
 });
});