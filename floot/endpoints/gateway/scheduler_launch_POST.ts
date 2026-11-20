import { callApp } from '@floot/apps';
import { nativeGatewayAccess } from '../../helpers/nativeGatewayAccess';
import { GatewayAccessError } from '../../helpers/gatewayPolicy';
export async function handle(request: Request) {
  try {
    const access = await nativeGatewayAccess(request);
    if (access.preview) throw new GatewayAccessError('Open the published gateway and sign in with Microsoft to use the scheduler.', 403);
    const result = await callApp<{ticket:string}>('dock-crew-scheduler', 'createSchedulerLaunch', {});
    if (!/^[A-Za-z0-9_-]{43}$/.test(result.ticket)) throw new Error('Invalid scheduler response');
    return Response.json(result, {headers:{'Cache-Control':'no-store'}});
  } catch(error) {
    const status=error instanceof GatewayAccessError?error.status:503;
    return Response.json({error:error instanceof GatewayAccessError?error.message:'Scheduler sign-in is temporarily unavailable. Try again shortly.'},{status,headers:{'Cache-Control':'no-store'}});
  }
}
