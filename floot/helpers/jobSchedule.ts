import type {Job} from './jobModel';

export function scheduleSummary(data: Pick<Job['data'],'serviceDate'|'time'|'duration'|'scheduleMode'>){
  if(!data.serviceDate)return 'Unscheduled';
  return [data.serviceDate,data.scheduleMode==='day'?'Day-based':null,data.time?data.time+' ET':null,data.duration?data.duration+' min':null].filter(Boolean).join(' · ');
}

export function activeBoardJobs(jobs:Job[]){
  return jobs.filter(job=>!['Done','Completed','Cancelled'].includes(job.data.status)&&job.data.appointment!=='Cancelled');
}

export function carryoverJobs(jobs:Job[],today:string){
  return activeBoardJobs(jobs).filter(job=>job.data.serviceDate&&job.data.serviceDate<today);
}
