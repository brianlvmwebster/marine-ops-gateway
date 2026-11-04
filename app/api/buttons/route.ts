import { getAccess } from '../../../lib/access';
import { readButtons, saveButtons } from '../../../lib/database';
import { readLimitedBody, sameOrigin } from '../../../lib/http';
import { validButtons } from '../../../lib/validation';
export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => Response.json(body, {status, headers: {'Cache-Control':'no-store'}});
export async function GET() {
  const access=await getAccess();
  if (!access.canView) return json({error:'Sign in with an authorized account.'},access.signedIn?403:401);
  try {return json(await readButtons());}
  catch (error) {console.error('Gateway read failed',error instanceof Error?error.name:'unknown');return json({error:'Unable to load destinations. Please try again.'},503);}
}
export async function PUT(request: Request) {
  const access=await getAccess();
  if (!access.isAdmin) return json({error:'Administrator access required.'},access.signedIn?403:401);
  if (!sameOrigin(request)) return json({error:'Invalid request origin.'},403);
  let data; try {data=JSON.parse(new TextDecoder().decode(await readLimitedBody(request,300000)));} catch(error) {return json({error:error instanceof RangeError?'Request too large.':'Invalid JSON.'},error instanceof RangeError?413:400);}
  if (!data || typeof data !== 'object' || !validButtons(data.buttons) || !Number.isSafeInteger(data.version) || data.version < 0) return json({error:'Check button names, URLs, and images. A maximum of 100 buttons is supported.'},400);
  try {
    const version=await saveButtons(data.buttons,data.version);
    if (version===null) return json({error:'Another administrator saved changes. Reload before editing again.'},409);
    return json({version});
  } catch(error) {console.error('Gateway save failed',error instanceof Error?error.name:'unknown');return json({error:'Unable to save changes. Please try again.'},503);}
}
