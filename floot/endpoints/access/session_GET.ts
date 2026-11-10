import {gatewayFailure} from '../../helpers/gatewayResponse';
import {requireViewer} from '../../helpers/serviceViewer';
import superjson from 'superjson';
import {isServiceAdmin} from '../../helpers/serviceAccess';
async function handleAuthorized(request:Request){const viewer=await requireViewer(request);return new Response(superjson.stringify({userId:viewer.userId,email:viewer.email,isServiceAdmin:await isServiceAdmin(viewer.userId)}));}

export async function handle(request:Request){try{return await handleAuthorized(request);}catch(error){return gatewayFailure(error);}}
