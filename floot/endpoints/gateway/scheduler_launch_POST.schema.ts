import { z } from 'zod';
export const schema=z.object({}).strict();
export type InputType=z.infer<typeof schema>;
export type OutputType={ticket:string};
export async function postGatewaySchedulerLaunch(input:InputType={},init?:RequestInit):Promise<OutputType>{
 const response=await fetch('/_api/gateway/scheduler_launch',{...init,method:'POST',headers:{'Content-Type':'application/json',...init?.headers},body:JSON.stringify(schema.parse(input)),cache:'no-store'});
 const result=await response.json();if(!response.ok)throw new Error(result.error||'Unable to open scheduler.');
 return z.object({ticket:z.string().regex(/^[A-Za-z0-9_-]{43}$/)}).parse(result);
}
