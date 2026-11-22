import {z} from 'zod';
import {PlatformError, requireSameOrigin} from './policy.ts';
import type {platformStore} from './store.ts';
type Store = ReturnType<typeof platformStore>;
const companyId = z.uuid();
const member = z.object({email:z.email().max(254).transform(s=>s.toLowerCase()),role:z.enum(['owner','admin','member']),status:z.enum(['active','suspended']),version:z.number().int().nonnegative()}).strict();
const entitlement = z.object({toolKey:z.string().min(1).max(80),status:z.enum(['enabled','disabled']),version:z.number().int().nonnegative()}).strict();
const company = z.object({slug:z.string().min(1).max(60).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),name:z.string().trim().min(1).max(120)}).strict();
const json = (data: unknown,status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function body(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new PlatformError(415,'JSON is required.');
  const reader=request.body?.getReader(); if(!reader) throw new PlatformError(400,'Request body is required.');
  const chunks:Uint8Array[]=[];let size=0;
  try { while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel();throw new PlatformError(413,'Request is too large.');}chunks.push(value);} }
  finally {reader.releaseLock();}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new PlatformError(400,'Invalid JSON.');}
}
export function platformHandler(store: Store, authenticate: (request: Request)=>Promise<number>) {
  return async (request: Request) => {
    try {
      let userId:number;
      try {userId=await authenticate(request);}catch{throw new PlatformError(401,'Sign in to continue.');}
      if (!Number.isSafeInteger(userId) || userId<=0) throw new PlatformError(401,'Sign in to continue.');
      const url=new URL(request.url),path=url.pathname.replace(/\/$/,'');
      if(request.method==='GET' && path==='/_api/platform') return json(await store.overview(userId));
      if(request.method==='GET' && path==='/_api/platform/company') return json(await store.company(userId,companyId.parse(url.searchParams.get('companyId'))));
      if(request.method==='POST') {
        requireSameOrigin(request);
        const data=await body(request);
        if(path==='/_api/platform/companies') return json(await store.createCompany(userId,company.parse(data)),201);
        const id=companyId.parse(url.searchParams.get('companyId'));
        if(path==='/_api/platform/memberships') return json(await store.setMembership(userId,id,member.parse(data)));
        if(path==='/_api/platform/entitlements') return json(await store.setEntitlement(userId,id,entitlement.parse(data)));
      }
      return json({error:'Not found.'},404);
    } catch(error) {
      if(error instanceof PlatformError) return json({error:error.message},error.status);
      if(error instanceof z.ZodError) return json({error:'Check the submitted fields.'},400);
      // Do not expose database topology, SQL, or connection errors to customers.
      console.error('Platform operation failed');
      return json({error:'Company administration is temporarily unavailable.'},503);
    }
  };
}
