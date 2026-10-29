import { env } from 'cloudflare:workers';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
  const {id} = await params;
  if (!/^[\w-]{1,80}$/.test(id)) return new Response('Not found',{status:404});
  const image = await env.BUCKET!.get(id);
  if (!image) return new Response('Not found',{status:404});
  return new Response(image.body,{headers:{'Content-Type':image.httpMetadata?.contentType || 'application/octet-stream','Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});
}
