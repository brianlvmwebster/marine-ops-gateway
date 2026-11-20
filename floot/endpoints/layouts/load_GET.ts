import {z} from 'zod';
import {db} from '../../helpers/db';
import {nativeGatewayAccess} from '../../helpers/nativeGatewayAccess';
import {gatewayJson,gatewayFailure} from '../../helpers/gatewayResponse';
export async function handle(request:Request){try{await nativeGatewayAccess(request);const id=z.string().uuid().parse(new URL(request.url).searchParams.get('id'));const row=await db.selectFrom('savedLayouts').selectAll().where('id','=',id).executeTakeFirst();return row?gatewayJson(row):gatewayJson({error:'This layout no longer exists.'},404);}catch(e){return gatewayFailure(e);}}