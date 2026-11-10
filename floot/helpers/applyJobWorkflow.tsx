import {normalizeJobStage} from './jobStage';
import type {JobData} from './jobModel';
import {workflowInput,type AssignmentOption} from './workflowModel';

// Build only the requested fields, using directory data rather than client labels.
export function applyJobWorkflow(current:JobData,input:unknown,options:AssignmentOption[]){
  const p=workflowInput.parse(input);
  current=normalizeJobStage(current);
  if(current.status==='Completed')throw new Error('Completed jobs are locked after Service Admin review.');
  if(p.status&&p.status!=='Cancelled'&&current.appointment==='Cancelled')throw new Error('Reopen the cancelled appointment in Edit job before changing its status.');
  const patch:Partial<JobData>={};
  if(p.status!==undefined)patch.status=p.status;
  if(p.assignmentId!==undefined){
    const option=p.assignmentId?options.find(o=>o.id===p.assignmentId):undefined;
    if(p.assignmentId&&!option)throw new Error('That person or group is no longer available. Refresh and choose again.');
    patch.assignmentId=option?.id||null;
    patch.assignmentKind=option?.kind||null;
    patch.technician=option?.name||'Unassigned';
  }
  return {...current,...patch};
}
