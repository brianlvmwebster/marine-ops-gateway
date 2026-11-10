import type {Job} from './jobModel';
export const queueSortFields=['Service date','Job number','Customer','Vessel','Status','Priority','Technician'];
const text=(a:string,b:string)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'});
export function sortQueue(jobs:Job[],field:string='Service date',direction:string='Ascending'):Job[]{
 const sign=direction==='Descending'?-1:1;
 const value=(j:Job)=>field==='Customer'?`${j.data.firstName} ${j.data.lastName}`:field==='Vessel'?`${j.data.year} ${j.data.make} ${j.data.model}`:field==='Status'?j.data.status:field==='Technician'?j.data.technician:j.jobNumber;
 return [...jobs].sort((a,b)=>{
  let result=0;
  if(field==='Service date'){
   // Unscheduled jobs stay at the end in either direction.
   if(!a.data.serviceDate!==!b.data.serviceDate)return a.data.serviceDate?-1:1;
   result=text(a.data.serviceDate,b.data.serviceDate);
   if(!result&&a.data.serviceDate){
    if(!a.data.time!==!b.data.time)return a.data.time?-1:1;
    result=text(a.data.time,b.data.time);
   }
  }else if(field==='Priority'){
   const rank={Normal:0,High:1,Urgent:2};result=rank[a.data.priority]-rank[b.data.priority];
  }else result=text(value(a),value(b));
  return result*sign||text(a.jobNumber,b.jobNumber)||text(a.id,b.id);
 });
}
