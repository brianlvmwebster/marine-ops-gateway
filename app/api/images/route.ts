import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { isAdmin } from '../../../lib/access';
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user || !isAdmin(user.email) || request.headers.get('origin') !== new URL(request.url).origin) return Response.json({error:'Administrator access required.'},{status:403});
  if (Number(request.headers.get('content-length')) > 2097152) return Response.json({error:'Image must be under 2 MB.'},{status:413});
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length > 2097152) return Response.json({error:'Image must be under 2 MB.'},{status:413});
  const matches = (at:number, signature:number[]) => signature.every((b,i)=>bytes[at+i]===b);
  const type = matches(0,[137,80,78,71,13,10,26,10]) ? 'image/png' : matches(0,[255,216,255]) ? 'image/jpeg' : matches(0,[82,73,70,70]) && matches(8,[87,69,66,80]) ? 'image/webp' : '';
  if (!type) return Response.json({error:'Choose a PNG, JPEG, or WebP image.'},{status:400});
  const id = crypto.randomUUID();
  await env.BUCKET!.put(id,bytes,{httpMetadata:{contentType:type}});
  return Response.json({image:'/api/images/'+id});
}
