import {z} from 'zod';
import {jobStatuses} from './workflowModel';
const text=z.string().max(10000).default('');
const base=z.object({
 ro:text,firstName:z.string().max(200),lastName:z.string().max(200),phone:z.string().max(200),email:z.string().max(300),year:z.string().max(100),make:z.string().max(300),model:z.string().max(300),engine:z.string().max(1000),hullId:text,
 serviceDate:z.string(),time:z.string(),duration:z.number().int().min(0).max(1440),
 appointment:z.enum(['Unconfirmed','Confirmed','Cancelled']),cancelledBy:z.string().max(100).default(''),
 pickup:text,trailer:text,trailerLocation:text,lake:text,pickupAddress:text,returnType:text,returnAddress:text,pickupPlaceId:z.string().max(300).optional(),returnPlaceId:z.string().max(300).optional(),
 services:z.array(z.string().min(1).max(500)).max(100),removeItems:z.array(z.string().max(500)).max(100),
 notes:text,technician:z.string().max(100).default('Unassigned'),priority:z.enum(['Normal','High','Urgent']),status:z.enum(jobStatuses),assignmentId:z.uuid().nullable().optional(),assignmentKind:z.enum(['person','group']).nullable().optional(),
 checklist:z.array(z.object({label:z.string().min(1).max(500),done:z.boolean()})).max(100).default([]),
 adminReview:z.object({completedAt:z.string(),completedBy:z.string(),pickupContactRequired:z.boolean(),pickupContactConfirmed:z.boolean(),lightspeedClosedConfirmed:z.boolean(),note:z.string()}).optional(),
 sourceSubmissionId:z.string().max(100).optional(),importIssues:z.array(z.string().max(500)).max(100).optional()
});
export const jobModel=base.superRefine((d,ctx)=>{
 const issue=(field:string,message:string)=>ctx.addIssue({code:'custom',path:[field],message});
 if(d.serviceDate&&!/^\d{4}-\d{2}-\d{2}$/.test(d.serviceDate))issue('serviceDate','Enter a valid service date');
 if(d.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time))issue('time','Enter a 24-hour time');
 if(d.appointment==='Cancelled'&&!d.cancelledBy.trim())issue('cancelledBy','Enter cancellation initials');
 if(d.sourceSubmissionId)return; // Historical records retain source omissions and unusual original values.
 for(const key of ['firstName','lastName','make','model','engine'] as const)if(!d[key].trim())issue(key,'Required');
 if(d.phone.trim().length<7)issue('phone','Phone number is required');
 if(!z.email().safeParse(d.email).success)issue('email','Enter a valid email');
 if(!/^\d{4}$/.test(d.year))issue('year','Enter a four-digit year');
 if(!d.serviceDate)issue('serviceDate','Choose a service date');
 if(!d.time)issue('time','Enter a start time');
 if(d.duration<15)issue('duration','Duration must be at least 15 minutes');
 if(!d.pickup)issue('pickup','Choose pickup / drop-off');
 if(!d.trailer)issue('trailer','Choose a trailer');
 if(!d.returnType)issue('returnType','Choose return / storage');
 if(!d.services.length)issue('services','Select at least one service');
});
export type JobData=z.infer<typeof jobModel>;
export type Job={id:string;jobNumber:string;version:number;data:JobData;calendarEligible?:boolean;eventId:string|null;syncedVersion:number;syncError:string|null;remoteEtag:string|null;updatedAt:Date};
export const emptyJob:JobData={ro:'',firstName:'',lastName:'',phone:'',email:'',year:'',make:'',model:'',engine:'',hullId:'',serviceDate:'',time:'09:00',duration:120,appointment:'Unconfirmed',cancelledBy:'',pickup:'Customer Drop-off (Land)',trailer:'Customer Trailer',trailerLocation:'Not applicable',lake:'',pickupAddress:'',returnType:'Customer Pickup',returnAddress:'',services:[],removeItems:[],notes:'',technician:'Unassigned',priority:'Normal',status:'New',checklist:[]};
