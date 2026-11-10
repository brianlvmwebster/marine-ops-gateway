import {normalizeJobStage} from './jobStage';
import Papa from 'papaparse';import {jobModel,emptyJob,type JobData} from './jobModel';
export const SHEET_ID='1P_qgxyu4tOBCG6bJrCf3Lg72HL94_r30RrSzf3cDSmM';
export const SHEET_GID='27945553';
export const SHEET_URL='https://docs.google.com/spreadsheets/d/'+SHEET_ID+'/edit#gid='+SHEET_GID;
export type SheetRecord={sourceKey:string;data:JobData;raw:Record<string,string>;sourceRow:number};
const columns:Record<string,string>={ro:'RO',firstName:'First Name',lastName:'Last Name',phone:'Phone Number',email:'E-Mail',year:'Year',make:'Make',model:'Length/Model',engine:'Engine',hullId:'Hull ID/VIN',pickup:'Pickup/Drop-off',trailer:'Trailer',trailerLocation:'Customer trailer location',lake:'Pond/Lake',pickupAddress:'Unit Address/Pickup Location',returnType:'Return/Store',returnAddress:'Return Address',notes:'Additional Information',cancelledBy:'Canceled By (Initials)'};
export const sourceFields=[...Object.keys(columns),'serviceDate','time','duration','appointment','services','removeItems','status'];
const split=(s:string)=>[...new Set(s.split(/[\n;]/).map(x=>x.trim()).filter(Boolean))];
function schedule(value:string){
 const m=value.match(/^\w+, (\w+) (\d{1,2}), (\d{4}) (\d{1,2}):(\d{2}) ([AP]M)-(\d{1,2}):(\d{2}) ([AP]M)$/);
 if(!m)return null;
 const month=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(m[1]);
 const day=Number(m[2]),year=Number(m[3]),date=new Date(Date.UTC(year,month,day));
 const start=(Number(m[4])%12+(m[6]==='PM'?12:0))*60+Number(m[5]),end=(Number(m[7])%12+(m[9]==='PM'?12:0))*60+Number(m[8]);
 if(month<0||date.getUTCMonth()!==month||date.getUTCDate()!==day||!Number(m[4])||Number(m[4])>12||Number(m[7])>12||!Number(m[7])||Number(m[5])>59||Number(m[8])>59||end-start<15||end-start>1440)return null;
 return {serviceDate:date.toISOString().slice(0,10),time:String(Math.floor(start/60)).padStart(2,'0')+':'+String(start%60).padStart(2,'0'),duration:end-start};
}
export function parseSheetCsv(csv:string):SheetRecord[]{
 const parsed=Papa.parse<string[]>(csv,{header:false,dynamicTyping:false,skipEmptyLines:'greedy'});
 if(parsed.errors.length)throw new Error('The sheet CSV could not be read: '+parsed.errors[0].message);
 const [header,...rows]=parsed.data;
 if(!header||!['Submission ID','First Name','Last Name','Completed','Service Date','Requested Services'].every(h=>header.includes(h)))throw new Error('The sheet no longer has the expected job columns.');
 const seen=new Set<string>(),result:SheetRecord[]=[];
 rows.forEach((cells,index)=>{
  const raw:Record<string,string>={},counts:Record<string,number>={};
  header.forEach((h,i)=>{const n=counts[h]=(counts[h]||0)+1;raw[n===1?h:h+' #'+n]=cells[i]||'';});
  const id=(raw['Submission ID']||'').trim();
  if(!id){if(Object.entries(raw).some(([k,v])=>v.trim()&&!(k==='Completed'&&['0','false'].includes(v.toLowerCase()))))throw new Error('Source row '+(index+2)+' has job data but no Submission ID. Nothing was imported.');return;}
  if(!/^\d+$/.test(id))throw new Error('A Submission ID is invalid at source row '+(index+2));
  if(seen.has(id))throw new Error('Duplicate Submission ID at source row '+(index+2)+'. Nothing was imported.');
  seen.add(id);
  const d:any={...emptyJob,checklist:[],sourceSubmissionId:id,importIssues:[]};
  for(const [field,column] of Object.entries(columns))d[field]=raw[column]||'';
  if(/^\d{4}\.0$/.test(d.year))d.year=d.year.slice(0,-2);
  if(d.year&&!/^\d{4}$/.test(d.year))d.importIssues.push('Vessel year needs review: '+d.year);
  const when=schedule(raw['Service Date']||'');
  Object.assign(d,when||{serviceDate:'',time:'',duration:0});
  if(!when)d.importIssues.push('No valid appointment time supplied; imported unscheduled.');
  d.appointment=/^confirm(ed)?$/i.test(raw['Confirm Cancel Appointment']||'')?'Confirmed':/^cancel(l?ed)?$/i.test(raw['Confirm Cancel Appointment']||'')?'Cancelled':'Unconfirmed';
  if(d.appointment==='Cancelled'&&!d.cancelledBy)d.cancelledBy='SOURCE';
  const completed=['1','true','yes'].includes((raw.Completed||'').toLowerCase());
  d.status=completed?'Done':d.appointment==='Cancelled'?'Cancelled':when?'Scheduled':'New';
  d.services=split(raw['Requested Services']||'');d.removeItems=split(raw['REMOVE ITEMS']||'');
  d.checklist=d.services.map((label:string)=>({label,done:false}));
  if(!d.trailer)d.importIssues.push('Trailer type not supplied.');
  if(!d.returnType)d.importIssues.push('Return / storage not supplied.');
  const data=jobModel.parse(d);result.push({sourceKey:'jotform:'+id,data,raw,sourceRow:index+2});
 });
 if(!result.length)throw new Error('The source has no job records. Existing dashboard jobs were left unchanged.');
 return result;
}
export type SheetConflict={field:string;localValue:unknown;sourceValue:unknown};
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function mergeSheetJob(local:JobData,baseline:JobData,incoming:JobData,previous:SheetConflict[]=[]){
 local=normalizeJobStage(local);baseline=normalizeJobStage(baseline);incoming=normalizeJobStage(incoming);
 if(local.status==='Completed'&&local.adminReview){
  const conflicts=[...previous];
  for(const field of sourceFields){const l=(local as any)[field],b=(baseline as any)[field],n=(incoming as any)[field];if(!same(b,n)&&!same(l,n)&&!conflicts.some(c=>c.field===field))conflicts.push({field,localValue:l,sourceValue:n});}
  return {data:local,conflicts,changed:false};
 }
 const next:any={...local,sourceSubmissionId:incoming.sourceSubmissionId,importIssues:incoming.importIssues};
 const conflicts:SheetConflict[]=[];
 for(const field of sourceFields){
  const l=(local as any)[field],b=(baseline as any)[field],n=(incoming as any)[field];
  if(same(l,n))continue;
  if(previous.some(c=>c.field===field)||(!same(b,n)&&(!same(l,b)||(local.status==='Completed'&&!same(b,n))||(field==='status'&&l==='Done'&&n!=='Done')))){
   conflicts.push({field,localValue:l,sourceValue:n});continue;
  }
  if(!same(b,n))next[field]=n;
 }
 if(next.pickupAddress!==local.pickupAddress)delete next.pickupPlaceId;
 if(next.returnAddress!==local.returnAddress)delete next.returnPlaceId;
 return {data:jobModel.parse(next),conflicts,changed:!same(local,next)};
}

export function stableJson(value:any):string{return JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);}
