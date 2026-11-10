import {gatewayFailure} from '../../helpers/gatewayResponse';
import {requireViewer} from '../../helpers/serviceViewer';import superjson from 'superjson';import {schema} from './settings_POST.schema';import {setCalendarSyncEnabled} from '../../helpers/calendarSyncSettings';
async function handleAuthorized(request:Request){await requireViewer(request);try{const p=schema.parse(superjson.parse(await request.text()));const syncEnabled=await setCalendarSyncEnabled(p.enabled);return new Response(superjson.stringify({syncEnabled}));}catch(e){return new Response(superjson.stringify({error:e instanceof Error?e.message:'Could not update calendar sync'}),{status:400});}}

export async function handle(request:Request){try{return await handleAuthorized(request);}catch(error){return gatewayFailure(error);}}
