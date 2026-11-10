import {nativeMemberForMicrosoftUser} from '../../helpers/nativeGatewayAccess';
import {requireGatewayOrigin} from '../../helpers/gatewayPolicy';
import {gatewayFailure,limitedGatewayBody} from '../../helpers/gatewayResponse';
import { establishMicrosoftLoginSession } from "@floot/microsoft-login";
import { setServerSession } from "../../helpers/getSetServerSession";
import { db } from "../../helpers/db";
import superjson from "superjson";
import { schema } from "./microsoft_login_establish_session_POST.schema";

export async function handle(request: Request) {
  try{requireGatewayOrigin(request);
  const json = superjson.parse(await limitedGatewayBody(request,8192));
  const { tempToken } = schema.parse(json);
  const result = await establishMicrosoftLoginSession(db, tempToken);
  if ("error" in result) {
    return new Response(superjson.stringify({ error: result.error }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  let access;try{access=await nativeMemberForMicrosoftUser(result.user);}catch(error){await db.deleteFrom('sessions').where('id','=',result.session.id).execute();throw error;}
  const response = new Response(
    superjson.stringify({ user: {...result.user,role:access.role}, success: true }),
    { headers: { "Content-Type": "application/json" } }
  );
  await setServerSession(response, result.session);
  return response;
  }catch(error){return gatewayFailure(error);}
}

