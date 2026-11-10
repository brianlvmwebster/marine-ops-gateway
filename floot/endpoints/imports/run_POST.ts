import {gatewayFailure} from '../../helpers/gatewayResponse';
import {requireViewer} from '../../helpers/serviceViewer';import superjson from 'superjson';import {schema} from './run_POST.schema';import {importSheetJobs} from '../../helpers/importSheetJobs';
async function handleAuthorized(request:Request){await requireViewer(request);try{const p=schema.parse(superjson.parse(await request.text()));return new Response(superjson.stringify(await importSheetJobs(p)));}catch(e){return new Response(superjson.stringify({error:e instanceof Error?e.message:'Import failed'}),{status:400});}}

export async function handle(request:Request){try{return await handleAuthorized(request);}catch(error){return gatewayFailure(error);}}
