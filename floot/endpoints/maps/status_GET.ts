import {gatewayFailure} from '../../helpers/gatewayResponse';
import {googlePlacesApiKey} from '../../helpers/googlePlaces';
import {requireViewer} from '../../helpers/serviceViewer';import superjson from 'superjson';
async function handleAuthorized(request:Request){await requireViewer(request);return new Response(superjson.stringify({configured:!!googlePlacesApiKey()}),{headers:{'Cache-Control':'no-store'}});}

export async function handle(request:Request){try{return await handleAuthorized(request);}catch(error){return gatewayFailure(error);}}
