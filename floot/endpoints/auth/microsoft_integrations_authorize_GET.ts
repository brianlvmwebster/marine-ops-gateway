import {gatewayFailure} from '../../helpers/gatewayResponse';
import {requireViewer} from '../../helpers/serviceViewer';
import {handleMicrosoftAuthorize} from '@floot/microsoft-integrations';
async function handleAuthorized(request:Request){await requireViewer(request);const u=new URL(request.url);u.searchParams.set('feature','calendar');return handleMicrosoftAuthorize(new Request(u,request));}
export async function handle(request:Request){try{return await handleAuthorized(request);}catch(error){return gatewayFailure(error);}}
