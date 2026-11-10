import {gatewayFailure} from '../../helpers/gatewayResponse';
import {requireViewer} from '../../helpers/serviceViewer';
import superjson from 'superjson';
import {db} from '../../helpers/db';
import {sql} from 'kysely';
import {assignmentOptionSchema} from '../../helpers/workflowModel';
async function handleAuthorized(request:Request){await requireViewer(request);const result=await sql`select id, kind, name, member_ids as "memberIds", version from service_assignment_options order by kind, name`.execute(db);const options=result.rows.map(row=>assignmentOptionSchema.parse(row));return new Response(superjson.stringify({options}));}

export async function handle(request:Request){try{return await handleAuthorized(request);}catch(error){return gatewayFailure(error);}}
