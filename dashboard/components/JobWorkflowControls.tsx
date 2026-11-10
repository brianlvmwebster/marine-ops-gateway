import React,{useRef,useState} from 'react';
import {Button} from './Button';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from './Select';
import type {Job} from '../helpers/jobModel';
import {jobStatuses,nextStep,statusLabel,type AssignmentOption} from '../helpers/workflowModel';
import {api} from '../helpers/api';
import {toast} from '../helpers/toast';
import s from './JobWorkflowControls.module.css';

export function JobWorkflowControls({job,options,onSaved,disabled=false}:{job:Job;options:AssignmentOption[];onSaved:()=>void|Promise<void>;disabled?:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false);
 const locked=disabled||busy||job.data.status==='Completed';
 const next=nextStep(job.data.status),assignment=options.find(o=>o.id===job.data.assignmentId);
 const assignmentValue=assignment?.id||(job.data.technician&&job.data.technician!=='Unassigned'?'__legacy':'__unassigned');
 const update=async(patch:{status?:typeof jobStatuses[number];assignmentId?:string|null})=>{
  if(lock.current||disabled)return;lock.current=true;setBusy(true);setError('');
  try{const result=await api('jobs/workflow',{id:job.id,version:job.version,...patch});toast.success('Job #'+job.jobNumber+' · '+(patch.status?statusLabel(patch.status):'Assignment updated'));if(result.syncError)toast.warning('Job saved; '+result.syncError);await onSaved();}
  catch(e){setError(e instanceof Error?e.message:'Could not update job');}finally{lock.current=false;setBusy(false);}
 };
 return <div className={s.controls} aria-label={'Workflow for job '+job.jobNumber} aria-busy={busy}>
  <div className={s.statusRow}><Select value={job.data.status} disabled={locked} onValueChange={value=>void update({status:value as typeof jobStatuses[number]})}><SelectTrigger className={s.status} aria-label={'Status for job '+job.jobNumber}><SelectValue/></SelectTrigger><SelectContent>{jobStatuses.filter(status=>status!=='Completed'||job.data.status==='Completed').map(status=><SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}</SelectContent></Select>{next&&<Button className={s.advance} size="sm" variant="outline" disabled={locked||job.data.appointment==='Cancelled'} onClick={()=>void update({status:next.status})}>{busy?'Saving…':next.label}</Button>}</div>
  <Select value={assignmentValue} disabled={locked} onValueChange={value=>{if(value!=='__legacy')void update({assignmentId:value==='__unassigned'?null:value});}}><SelectTrigger className={s.assignment} aria-label={'Assignment for job '+job.jobNumber}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="__unassigned">Unassigned</SelectItem>{assignmentValue==='__legacy'&&<SelectItem value="__legacy">{job.data.technician} (existing)</SelectItem>}{options.map(option=><SelectItem value={option.id} key={option.id}>{option.kind==='group'?'Group: ':''}{option.name}{option.kind==='group'?' ('+option.memberIds.length+')':''}</SelectItem>)}</SelectContent></Select>
  {error&&<div className={s.error} role="alert">{error}<Button size="sm" variant="link" onClick={()=>void onSaved()}>Refresh job</Button></div>}
 </div>;
}
