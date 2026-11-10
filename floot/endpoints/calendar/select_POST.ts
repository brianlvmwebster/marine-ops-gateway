import {gatewayFailure} from '../../helpers/gatewayResponse';
import {requireViewer} from '../../helpers/serviceViewer';import {selectOutlookCalendar} from '../../helpers/selectOutlookCalendar';import {schema} from './select_POST.schema';import superjson from 'superjson';
async function handleAuthorized(request:Request){await requireViewer(request);try{const input=schema.parse(superjson.parse(await request.text()));return new Response(superjson.stringify(await selectOutlookCalendar(input)));}catch(e){return new Response(superjson.stringify({error:e instanceof Error?e.message:'Could not select calendar'}),{status:400});}}
export async function handle(request:Request){try{return await handleAuthorized(request);}catch(error){return gatewayFailure(error);}}
