import React,{useEffect,useState} from 'react';
import {JobDetail} from './JobDetail';
import {JobEditor} from './JobEditor';
import {Dialog,DialogContent,DialogTitle} from './Dialog';
import {api} from '../helpers/api';
import type {Job} from '../helpers/jobModel';
import type {AssignmentOption} from '../helpers/workflowModel';

export function LinkedServiceJob({company,recordId,source,jobId,onClose,onChanged}:{company:string;recordId:string;source:'units'|'customers';jobId:string;onClose:()=>void;onChanged:()=>void}){
 const [job,setJob]=useState<Job|null>(null),[options,setOptions]=useState<AssignmentOption[]>([]),[editing,setEditing]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();setJob(null);setError('');
  async function load(){try{
   const [response,assignments]=await Promise.all([fetch('/_api/'+source+'/service-job?companyId='+encodeURIComponent(company)+'&id='+encodeURIComponent(recordId)+'&jobId='+encodeURIComponent(jobId),{signal:controller.signal}),api<{options:AssignmentOption[]}>('assignments/list')]);
   const body=await response.json();if(!response.ok)throw Error(body.error||'Unable to open service job.');
   if(!controller.signal.aborted){setJob({...body.job,updatedAt:new Date(body.job.updatedAt)});setOptions(assignments.options);}
  }catch(e){if(!controller.signal.aborted)setError((e as Error).message);}}
  void load();return()=>controller.abort();
 },[company,recordId,source,jobId,revision]);
 function changed(){onChanged();setRevision(n=>n+1);}
 if(!job)return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent><DialogTitle>Service Desk job</DialogTitle>{error?<><p role="alert">{error}</p><button type="button" onClick={()=>setRevision(n=>n+1)}>Retry job</button></>:<p role="status">Loading service job...</p>}<button type="button" onClick={onClose}>Back to {source==='units'?'unit':'customer'}</button></DialogContent></Dialog>;
 if(editing)return <JobEditor key={job.id+':'+job.version} job={job} open onClose={()=>setEditing(false)} onSaved={changed}/>;
 return <JobDetail job={job} options={options} onClose={onClose} onEdit={()=>setEditing(true)} onSaved={changed}/>;
}
