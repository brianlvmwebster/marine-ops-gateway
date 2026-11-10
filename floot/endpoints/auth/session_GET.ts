import {nativeGatewayAccess} from '../../helpers/nativeGatewayAccess';
import {getServerUserSession} from '../../helpers/getServerUserSession';
import {setServerSession} from '../../helpers/getSetServerSession';
import {gatewayJson,gatewayFailure} from '../../helpers/gatewayResponse';
export async function handle(request:Request){try{const access=await nativeGatewayAccess(request);const response=gatewayJson({user:{id:access.authUserId,email:access.email,displayName:access.displayName,avatarUrl:null,role:access.role}});if(!access.preview){const {session}=await getServerUserSession(request);await setServerSession(response,{id:session.id,createdAt:session.createdAt,lastAccessed:Date.now()});}return response;}catch(error){return gatewayFailure(error);}}
