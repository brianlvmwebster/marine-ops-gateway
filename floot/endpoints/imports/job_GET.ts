import {gatewayFailure} from '../../helpers/gatewayResponse';
import {requireViewer} from '../../helpers/serviceViewer';import {db} from '../../helpers/db';import superjson from 'superjson';import {schema} from './job_GET.schema';
async function handleAuthorized(request:Request){await requireViewer(request);const p=schema.parse(Object.fromEntries(new URL(request.url).searchParams));const source=await db.selectFrom('sheetJobSources').selectAll().where('jobId','=',p.id).executeTakeFirst();return new Response(superjson.stringify({source:source||null}));}

export async function handle(request:Request){try{return await handleAuthorized(request);}catch(error){return gatewayFailure(error);}}
