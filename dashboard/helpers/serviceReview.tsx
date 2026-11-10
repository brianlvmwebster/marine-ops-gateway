import {normalizeJobStage} from './jobStage';
import {z} from 'zod';
import type {JobData} from './jobModel';
export const reviewInput=z.object({id:z.uuid(),version:z.number().int().positive(),pickupContactConfirmed:z.boolean(),lightspeedClosedConfirmed:z.boolean(),note:z.string().trim().max(1000).default('')}).strict();
export function pickupContactRequired(returnType:string){return !['deliver to customer','storage - outdoor','storage - indoor'].includes(returnType.trim().toLowerCase());}
export function completeReviewedJob(data:JobData,input:unknown,viewer:{userId:string;isServiceAdmin:boolean},now=new Date()){
 if(!viewer.isServiceAdmin)throw new Error('Service Admin access required.');
 const p=reviewInput.parse(input);
 data=normalizeJobStage(data);
 if(data.status!=='Done')throw new Error('Only Done jobs can be completed after review.');
 const required=pickupContactRequired(data.returnType);
 if(required&&!p.pickupContactConfirmed)throw new Error('Confirm the customer was contacted for pickup.');
 if(!p.lightspeedClosedConfirmed)throw new Error('Confirm the order was tallied and closed in Lightspeed.');
 return {...data,status:'Completed' as const,adminReview:{completedAt:now.toISOString(),completedBy:viewer.userId,pickupContactRequired:required,pickupContactConfirmed:p.pickupContactConfirmed,lightspeedClosedConfirmed:true,note:p.note}};
}
