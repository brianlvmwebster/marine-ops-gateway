import {gatewayFailure} from '../../helpers/gatewayResponse';
import {requireViewer} from '../../helpers/serviceViewer';import {sql} from 'kysely';import superjson from 'superjson';
import {db} from '../../helpers/db';import {defaultWidgets,widgetLayoutSchema} from '../../helpers/dashboardWidgets';
async function handleAuthorized(request:Request){const viewer=await requireViewer(request);const result=await sql<{widgets:unknown;version:number;columns:number}>`select widgets,version,columns from service_dashboard_preferences where user_id=${viewer.userId}`.execute(db);const row=result.rows[0];return new Response(superjson.stringify({widgets:row?widgetLayoutSchema.parse(row.widgets):defaultWidgets,columns:row?.columns||3,version:row?.version||0}));}

export async function handle(request:Request){try{return await handleAuthorized(request);}catch(error){return gatewayFailure(error);}}
