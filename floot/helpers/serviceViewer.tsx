import {AsyncLocalStorage} from 'node:async_hooks';
import {nativeGatewayAccess} from './nativeGatewayAccess';
import {platformDatabase} from '../platform/database';
import {platformStore} from '../platform/store';
import {GatewayAccessError} from './gatewayPolicy';
export type ServiceViewer={userId:string;email:string};
const gatewayViewer=new AsyncLocalStorage<ServiceViewer>();
export function withServiceViewer<T>(viewer:ServiceViewer,run:()=>T){return gatewayViewer.run(viewer,run);}
export async function requireViewer(request?:Request):Promise<ServiceViewer>{
 let viewer=gatewayViewer.getStore();
 if(!viewer){if(request){const access=await nativeGatewayAccess(request);viewer={userId:access.userId,email:access.email};}else {if(process.env.APP_ENV==='staging')throw new GatewayAccessError();const {requireViewer:requireFlootViewer}=await import('@floot/viewer');viewer=await requireFlootViewer();}}
 // Fail closed if the foundation has not been migrated. Never infer a company from a request header.
 try{await platformStore(platformDatabase()).legacyServiceAccess(viewer!.userId);}
 catch{throw new GatewayAccessError('Service Desk is not available for your company membership.',403);}
 return viewer!;
}
