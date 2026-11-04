import { get } from '@vercel/blob';
import { getAccess } from '../../../../lib/access';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
  const access=await getAccess();
  if (!access.canView) return new Response('Unauthorized',{status:access.signedIn?403:401,headers:{'Cache-Control':'no-store'}});
  const {id} = await params;
  if (!/^[\w-]{1,80}$/.test(id)) return new Response('Not found',{status:404});
  try {
    const image = await get('images/'+id,{access:'private'});
    if (!image || image.statusCode !== 200) return new Response('Not found',{status:404});
    return new Response(image.stream,{headers:{'Content-Type':image.blob.contentType || 'application/octet-stream','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  } catch(error) {console.error('Image read failed',error instanceof Error?error.name:'unknown');return new Response('Image unavailable',{status:503});}
}
