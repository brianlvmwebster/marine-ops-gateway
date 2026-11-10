import {z} from 'zod';
export const companyTenantId='5b007bab-2109-468d-ac89-c12281d41515';
export function companyMicrosoftSubject(value:string){return new RegExp('^'+companyTenantId+':[0-9a-f-]{36}$','i').test(value);}
export function sameGatewayOrigin(request:Request){return request.headers.get('origin')===new URL(request.url).origin;}
export function requireGatewayOrigin(request:Request){if(request.method!=='GET'&&request.method!=='HEAD'&&!sameGatewayOrigin(request))throw new GatewayAccessError('Invalid request origin',403);}
export class GatewayAccessError extends Error{constructor(message='Sign in with an approved company Microsoft account.',public status=401){super(message);this.name='GatewayAccessError';}}
export const gatewayButtonSchema=z.object({id:z.string().regex(/^[\w-]{1,80}$/),title:z.string().trim().min(1).max(80),url:z.url().max(2048).refine(v=>{const u=new URL(v);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password;}),description:z.string().max(180),image:z.string().max(2048).refine(v=>!v||/^\/_api\/gateway\/image\?id=[a-f0-9-]{36}$/.test(v)||/^\/api\/images\/[\w-]+$/.test(v)||(()=>{try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}})()),newTab:z.boolean(),slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(60).or(z.literal('')).optional()}).strict();
export const gatewayButtonsSchema=z.array(gatewayButtonSchema).max(100).refine(rows=>new Set(rows.map(x=>x.id)).size===rows.length,'Duplicate destination ID').refine(rows=>new Set(rows.filter(x=>x.slug).map(x=>x.slug)).size===rows.filter(x=>x.slug).length,'Duplicate permanent URL name');
export type GatewayButton=z.infer<typeof gatewayButtonSchema>;
export const gatewayDestination=(button:GatewayButton)=>button.slug==='service-management'?'/dashboard':button.slug?'/apps/'+button.slug:button.url;
export function gatewayReturnPath(value:string|null){return value&&/^\/(?:dashboard(?:\/jobs\/[a-f0-9-]{36}\/print(?:\?mode=checklist)?)?\/?|admin(?:\/users)?|apps\/[a-z0-9]+(?:-[a-z0-9]+)*)$/.test(value)?value:'/';}
export function imageContentType(bytes:Uint8Array){const match=(at:number,signature:number[])=>signature.every((b,i)=>bytes[at+i]===b);return match(0,[137,80,78,71,13,10,26,10])?'image/png':match(0,[255,216,255])?'image/jpeg':match(0,[82,73,70,70])&&match(8,[87,69,66,80])?'image/webp':null;}
