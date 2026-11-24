import {test} from 'node:test';
import assert from 'node:assert/strict';
import {jobModel,emptyJob} from '../helpers/jobModel.tsx';
import {activeBoardJobs,carryoverJobs,scheduleSummary} from '../helpers/jobSchedule.ts';

const data={...emptyJob,firstName:'Day',lastName:'QA',phone:'202-555-0145',email:'day@example.invalid',year:'2026',make:'Test',model:'QA',engine:'Test',serviceDate:'2026-11-23',services:['Winterize']};
test('day-based jobs accept a start day without inventing a time or duration',()=>{
 const day={...data,scheduleMode:'day',time:'',duration:0};
 assert.equal(jobModel.safeParse(day).success,true);
 assert.equal(jobModel.safeParse({...day,time:'13:30'}).success,true);
 assert.equal(jobModel.safeParse({...day,duration:60}).success,true);
 assert.equal(jobModel.safeParse({...day,time:'25:00'}).success,false);
 assert.equal(jobModel.safeParse({...day,duration:1}).success,false);
 assert.equal(jobModel.safeParse({...day,serviceDate:''}).success,false);
 assert.equal(jobModel.safeParse({...day,scheduleMode:'timed'}).success,false);
 const {scheduleMode,...legacy}=data;
 assert.equal(jobModel.parse(legacy).scheduleMode,'timed');
 assert.equal(jobModel.safeParse({...day,scheduleMode:'timed',time:'09:00',duration:60}).success,true);
 assert.equal(scheduleSummary(day),'2026-11-23 · Day-based');
 assert.ok(!scheduleSummary(day).includes('0 min'));
});
test('carryover includes unfinished earlier starts and excludes completed or cancelled work',()=>{
 const jobs=[
  {id:'old',data:{...data,serviceDate:'2026-11-22',status:'In progress'}},
  {id:'today',data},
  {id:'future',data:{...data,serviceDate:'2026-11-24'}},
  {id:'undated',data:{...data,serviceDate:''}},
  ...['Done','Completed','Cancelled'].map(status=>({id:status,data:{...data,serviceDate:'2026-11-22',status}})),
  {id:'cancelled-appointment',data:{...data,serviceDate:'2026-11-22',appointment:'Cancelled'}},
 ];
 assert.deepEqual(carryoverJobs(jobs,'2026-11-23').map(j=>j.id),['old']);
 assert.deepEqual(activeBoardJobs(jobs).map(j=>j.id),['old','today','future','undated']);
});
