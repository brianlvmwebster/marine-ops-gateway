import { put } from '@vercel/blob';
import { getAccess } from '../../../lib/access';
import { imageContentType } from '../../../lib/image';
import { readLimitedBody, sameOrigin } from '../../../lib/http';
export async function POST(request: Request) {
  const access=await getAccess();
  if (!access.isAdmin) return Response.json({error:'Administrator access required.'},{status:access.signedIn?403:401});
  if (!sameOrigin(request)) return Response.json({error:'Invalid request origin.'},{status:403});
  let bytes;try {bytes=await readLimitedBody(request,2097152);}catch{return Response.json({error:'Image must be under 2 MB.'},{status:413});}
  const type=imageContentType(bytes);
  if (!type) return Response.json({error:'Choose a PNG, JPEG, or WebP image.'},{status:400});
  const id = crypto.randomUUID();
  try {
    await put('images/'+id,Buffer.from(bytes),{access:'private',addRandomSuffix:false,contentType:type});
    return Response.json({image:'/api/images/'+id});
  } catch(error) {console.error('Image upload failed',error instanceof Error?error.name:'unknown');return Response.json({error:'Unable to upload this image. Please try again.'},{status:503});}
}
