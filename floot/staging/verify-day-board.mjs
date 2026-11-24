import assert from 'node:assert/strict';
import superjson from 'superjson';
import {emptyJob} from '../helpers/jobModel.tsx';
const origin=process.env.STAGING_URL;
assert.equal(origin,'https://marine-ops-staging-7esxar6tqa-ue.a.run.app');
const login=await fetch(origin+'/staging/login',{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password:process.env.STAGING_LOGIN_SECRET})});
assert.equal(login.status,303);
const headers={Cookie:login.headers.get('set-cookie').split(';')[0],Origin:origin,'Content-Type':'application/json'};
async function api(path,data,status=200){const response=await fetch(origin+'/_api/'+path,{headers,...(data?{method:'POST',body:superjson.stringify(data)}:{})});const value=superjson.parse(await response.text());assert.equal(response.status,status,value.error);return value;}
try{
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const previous=new Date(today+'T12:00:00Z');previous.setUTCDate(previous.getUTCDate()-1);const yesterday=previous.toISOString().slice(0,10);
 const base={...emptyJob,firstName:'Board QA',lastName:'Synthetic',phone:'202-555-0145',email:'board-qa@example.invalid',year:'2026',make:'Test Marine',model:'Day Board QA',engine:'Synthetic engine',services:['Winterize'],notes:'SYNTHETIC day-board verification. No real customer work.',scheduleMode:'day',time:'',duration:0,serviceDate:today};
 const before=(await api('jobs')).jobs;
 const ids=[];
 for(const [ro,changes] of [['DAY-BOARD-QA',{}],['CARRYOVER-BOARD-QA',{serviceDate:yesterday,status:'In progress'}],['TIMED-BOARD-QA',{scheduleMode:'timed',time:'10:00',duration:60}]]){
  const existing=before.find(job=>job.data.ro===ro&&job.data.email===base.email);
  const result=await api('jobs/save',{...(existing?{id:existing.id,version:existing.version}:{}),calendarEligible:false,data:{...base,...changes,ro}});
  ids.push(result.id);
 }
 await api('jobs/save',{data:{...base,scheduleMode:'timed'},calendarEligible:false},400);
 await api('jobs/save',{data:base,calendarEligible:true},400);
 const jobs=(await api('jobs')).jobs.filter(job=>ids.includes(job.id));assert.equal(jobs.length,3);
 for(const job of jobs){assert.equal(job.calendarEligible,false);if(job.data.scheduleMode==='day'){assert.equal(job.data.time,'');assert.equal(job.data.duration,0);}else{assert.equal(job.data.time,'10:00');assert.equal(job.data.duration,60);}}
 for(const original of jobs){
  const next=new Date(today+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+2);const newDay=next.toISOString().slice(0,10);
  const moved=await api('jobs/save',{id:original.id,version:original.version,calendarEligible:original.calendarEligible,data:{...original.data,serviceDate:newDay}});
  await api('jobs/save',{id:original.id,version:original.version,data:{...original.data,serviceDate:today}},409);
  const persisted=(await api('jobs')).jobs.find(job=>job.id===original.id);
  assert.deepEqual(persisted.data,{...original.data,serviceDate:newDay});
  assert.equal(persisted.calendarEligible,original.calendarEligible);
  await api('jobs/save',{id:original.id,version:moved.version,calendarEligible:original.calendarEligible,data:original.data});
 }
 assert.equal((await api('calendar/status')).syncEnabled,false);
 console.log(JSON.stringify({verified:true,today,jobs:jobs.map(job=>({id:job.id,number:job.jobNumber,ro:job.data.ro,mode:job.data.scheduleMode}))}));
}finally{await fetch(origin+'/staging/logout',{method:'POST',headers,redirect:'manual'});}
