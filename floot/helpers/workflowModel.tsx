import {z} from 'zod';

export const jobStatuses=['New','Scheduled','Onsite','In progress','Awaiting parts','Ready','Done','Completed','Cancelled'] as const;
export const statusLabel=(status:string)=>status;
export const nextStep=(status:string)=>({New:{status:'Scheduled',label:'Mark scheduled'},Scheduled:{status:'Onsite',label:'Mark onsite'},Onsite:{status:'In progress',label:'Start work'},'In progress':{status:'Done',label:'Mark done'},'Awaiting parts':{status:'In progress',label:'Resume work'},Ready:{status:'Done',label:'Mark done'}} as Record<string,{status:typeof jobStatuses[number];label:string}>)[status];
export const assignmentOptionSchema=z.object({id:z.uuid(),kind:z.enum(['person','group']),name:z.string(),memberIds:z.array(z.uuid()),version:z.number()});
export type AssignmentOption=z.infer<typeof assignmentOptionSchema>;
export const workflowInput=z.object({id:z.uuid(),version:z.number().int().positive(),status:z.enum(['New','Scheduled','Onsite','In progress','Awaiting parts','Ready','Done','Cancelled']).optional(),assignmentId:z.uuid().nullable().optional()}).strict().refine(p=>p.status!==undefined||p.assignmentId!==undefined,{message:'Choose a status or assignment'});
export const directoryInput=z.object({id:z.uuid().optional(),version:z.number().int().positive().optional(),kind:z.enum(['person','group']),name:z.string().trim().min(1).max(100),memberIds:z.array(z.uuid()).max(100).default([])}).strict().refine(p=>p.kind==='group'||p.memberIds.length===0,{message:'Only groups can have members'}).refine(p=>!p.id||!!p.version,{message:'Record version is required when editing'});
