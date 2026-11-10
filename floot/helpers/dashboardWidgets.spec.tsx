import {matchingWidgetJobs,matchingCalendarJobs,calendarWidgetDays,defaultCalendarSettings,addServiceDays,layoutInput} from './dashboardWidgets';
import {emptyJob,type Job} from './jobModel';import {serviceTime} from './serviceTime';
const job=(id:string,data:Partial<Job['data']>):Job=>({id,jobNumber:id,version:1,data:{...emptyJob,...data},eventId:null,syncedVersion:0,syncError:null,remoteEtag:null,updatedAt:new Date()});
describe('Dashboard widget selection',()=>{
 const today='2026-11-09';
 it('uses Eastern calendar dates across midnight and DST rather than elapsed 24-hour offsets',()=>{expect(serviceTime.fromUtc('2026-11-10T02:00:00Z').serviceDate).toBe(today);expect(addServiceDays(today,1)).toBe('2026-11-10');expect(addServiceDays('2026-10-31',1)).toBe('2026-11-01');expect(addServiceDays('2026-12-31',1)).toBe('2027-01-01');});
 it('shows active jobs tomorrow and sorts appointments by time, excluding Done, Completed and cancelled appointments',()=>{const jobs=[job('2',{serviceDate:'2026-11-10',time:'11:00'}),job('1',{serviceDate:'2026-11-10',time:'08:00'}),job('3',{serviceDate:'2026-11-10',status:'Done'}),job('4',{serviceDate:'2026-11-10',status:'Completed'}),job('5',{serviceDate:'2026-11-10',appointment:'Cancelled'}),job('6',{serviceDate:today})];expect(matchingWidgetJobs('tomorrow',jobs,today).map(j=>j.id)).toEqual(['1','2']);});
 it('separates road pickups, customer trailers, and future customer deliveries using the requested service-date ordering',()=>{const jobs=[job('1',{serviceDate:'2026-11-10',pickup:'Road Pickup',trailer:'Customer Trailer'}),job('2',{serviceDate:'2026-10-01',pickup:'Customer Drop-off (Land)',trailer:'Customer Trailer',status:'Done'}),job('3',{serviceDate:'2026-11-11',returnType:'Deliver to Customer',status:'Done'}),job('4',{serviceDate:'2026-10-01',returnType:'Deliver to Customer'}),job('5',{serviceDate:'2026-11-11',returnType:'Deliver to Customer',status:'Completed'})];expect(matchingWidgetJobs('road-pickups',jobs,today).map(j=>j.id)).toEqual(['1']);expect(matchingWidgetJobs('customer-trailers',jobs,today).map(j=>j.id)).toContain('2');expect(matchingWidgetJobs('customer-trailers',jobs,today).map(j=>j.id)).not.toContain('1');expect(matchingWidgetJobs('deliveries',jobs,today).map(j=>j.id)).toEqual(['3']);});
 it('validates limits and prevents client-selected preference ownership or duplicate card identities',()=>{expect(layoutInput.safeParse({version:0,widgets:[{id:'one',type:'tomorrow',limit:51}]}).success).toBeFalse();expect(layoutInput.safeParse({version:0,widgets:[],userId:'someone-else'}).success).toBeFalse();expect(layoutInput.safeParse({version:0,widgets:[{id:'one',type:'tomorrow',limit:5},{id:'one',type:'today',limit:5}]}).success).toBeFalse();});
 it('keeps older layouts valid and validates saved columns and compact-calendar ranges',()=>{
  expect(layoutInput.safeParse({version:0,widgets:[{id:'old',type:'tomorrow',limit:8}]}).success).toBeTrue();
  expect(layoutInput.safeParse({version:1,columns:4,widgets:[{id:'cal',type:'calendar',limit:5,calendar:defaultCalendarSettings}]}).success).toBeTrue();
  for(const columns of [0,5,1.5])expect(layoutInput.safeParse({version:0,columns,widgets:[]}).success).toBeFalse();
  expect(layoutInput.safeParse({version:0,widgets:[{id:'cal',type:'calendar',limit:5,calendar:{...defaultCalendarSettings,days:15}}]}).success).toBeFalse();
 });
 it('anchors This Week on Monday even on Sunday and handles month/year and DST boundaries',()=>{
  expect(calendarWidgetDays('2026-11-15',{...defaultCalendarSettings,range:'week'})).toEqual(['2026-11-09','2026-11-10','2026-11-11','2026-11-12','2026-11-13','2026-11-14','2026-11-15']);
  expect(calendarWidgetDays('2026-12-31',{...defaultCalendarSettings,days:3})).toEqual(['2026-12-31','2027-01-01','2027-01-02']);
  expect(calendarWidgetDays('2026-10-31',{...defaultCalendarSettings,days:3})).toEqual(['2026-10-31','2026-11-01','2026-11-02']);
 });
 it('combines calendar property filters and retains explicit completed/cancelled history when selected',()=>{
  const data={serviceDate:'2026-11-10',pickup:'Road Pickup',trailer:'LVM Trailer',technician:'Crew A',priority:'High' as const,services:['Winterize'],returnType:'Deliver to Customer'};
  const jobs=[job('1',data),job('2',{...data,trailer:'Customer Trailer'}),job('3',{...data,status:'Done'}),job('4',{...data,appointment:'Cancelled'}),job('5',{...data,serviceDate:'2026-11-20'}),job('6',{...data,assignmentId:'crew-id',technician:'Renamed crew'})];
  const filters={...defaultCalendarSettings,pickup:'Road Pickup',trailer:'LVM Trailer',assignment:'Crew A',priority:'High' as const,service:'Winterize',returnType:'Deliver to Customer'};
  expect(matchingCalendarJobs(jobs,today,filters).map(j=>j.id)).toEqual(['1']);
  expect(matchingCalendarJobs(jobs,today,{...filters,status:'Done'}).map(j=>j.id)).toEqual(['3']);
  expect(matchingCalendarJobs(jobs,today,{...filters,status:'all'}).map(j=>j.id)).toEqual(['1','3','4']);
  expect(matchingCalendarJobs(jobs,today,{...filters,assignment:'crew-id'}).map(j=>j.id)).toEqual(['6']);
  expect(matchingCalendarJobs(jobs,today,{...filters,assignment:'__unassigned'})).toEqual([]);
 });
});
