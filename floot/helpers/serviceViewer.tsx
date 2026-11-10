import {AsyncLocalStorage} from 'node:async_hooks';
import {requireViewer as requireFlootViewer} from '@floot/viewer';
import {nativeGatewayAccess} from './nativeGatewayAccess';
export type ServiceViewer={userId:string;email:string};
const gatewayViewer=new AsyncLocalStorage<ServiceViewer>();
export function withServiceViewer<T>(viewer:ServiceViewer,run:()=>T){return gatewayViewer.run(viewer,run);}
export async function requireViewer(request?:Request):Promise<ServiceViewer>{const verified=gatewayViewer.getStore();if(verified)return verified;if(request){const access=await nativeGatewayAccess(request);return {userId:access.userId,email:access.email};}return requireFlootViewer();}
