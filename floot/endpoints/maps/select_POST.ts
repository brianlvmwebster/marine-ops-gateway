import {gatewayFailure} from '../../helpers/gatewayResponse';
import {googlePlacesApiKey} from '../../helpers/googlePlaces';
import {requireViewer} from '../../helpers/serviceViewer';import {schema} from './select_POST.schema';import {selectAddress} from '../../helpers/googlePlaces';import superjson from 'superjson';
async function handleAuthorized(request:Request){await requireViewer(request);try{const p=schema.parse(superjson.parse(await request.text()));return new Response(superjson.stringify(await selectAddress(p.placeId,p.sessionToken,googlePlacesApiKey())),{headers:{'Cache-Control':'no-store'}});}catch(e){return new Response(superjson.stringify({error:e instanceof Error?e.message:'Address selection unavailable'}),{status:503,headers:{'Cache-Control':'no-store'}});}}

export async function handle(request:Request){try{return await handleAuthorized(request);}catch(error){return gatewayFailure(error);}}
