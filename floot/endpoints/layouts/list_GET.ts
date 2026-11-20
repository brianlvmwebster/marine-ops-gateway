import {db} from '../../helpers/db';
import {nativeGatewayAccess} from '../../helpers/nativeGatewayAccess';
import {gatewayJson,gatewayFailure} from '../../helpers/gatewayResponse';
export async function handle(request:Request){try{await nativeGatewayAccess(request);return gatewayJson(await db.selectFrom('savedLayouts').select(['id','name','revision','updatedAt','updatedBy']).orderBy('updatedAt','desc').execute());}catch(e){return gatewayFailure(e);}}