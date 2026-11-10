import {gatewayFailure} from '../../helpers/gatewayResponse';
import {requireViewer} from '../../helpers/serviceViewer';
import {finalizeMicrosoftConnection,renderConnectionPopup} from '@floot/microsoft-integrations';
import {db} from '../../helpers/db';
import {switchCalendarAccount} from '../../helpers/switchCalendarAccount';
async function handleAuthorized(request:Request){
 await requireViewer(request);
 const u=new URL(request.url),code=u.searchParams.get('connection_code'),error=u.searchParams.get('error');
 if(error||!code)return renderConnectionPopup({type:'MICROSOFT_INTEGRATION_ERROR',error:error||'missing_connection_code'});
 try{
  const connection=await finalizeMicrosoftConnection(db,{code});
  await switchCalendarAccount(connection.email);
  return renderConnectionPopup({type:'MICROSOFT_INTEGRATION_SUCCESS',email:connection.email,scopes:connection.scopes});
 }catch(e){
  return renderConnectionPopup({type:'MICROSOFT_INTEGRATION_ERROR',error:'connection_failed',message:e instanceof Error?e.message:String(e)});
 }
}
export async function handle(request:Request){try{return await handleAuthorized(request);}catch(error){return gatewayFailure(error);}}
