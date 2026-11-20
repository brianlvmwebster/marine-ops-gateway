import {nativeGatewayAccess} from '../../helpers/nativeGatewayAccess';
import {GatewayAccessError} from '../../helpers/gatewayPolicy';
import {dockBuilderAssets} from '../../helpers/dockBuilderAssets';
export async function handle(request:Request){
 try{
  await nativeGatewayAccess(request);
  const name=new URL(request.url).searchParams.get('file')||'index.html';
  const asset=dockBuilderAssets(name);
  if(!asset)return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
  return new Response(new Uint8Array(asset.body).buffer,{headers:{'Content-Type':asset.type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch(error){
  const status=error instanceof GatewayAccessError?error.status:503;
  return new Response(status===401||status===403?'Your company session expired or access changed. Return to the gateway and sign in again.':'DockBuilder is temporarily unavailable.',{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
 }
}
