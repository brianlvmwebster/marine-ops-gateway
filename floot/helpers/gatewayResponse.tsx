import superjson from 'superjson';
import {GatewayAccessError} from './gatewayPolicy';
export const gatewayJson=(value:unknown,status=200)=>new Response(superjson.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function gatewayFailure(error:unknown){return gatewayJson({error:error instanceof Error?error.message:'Gateway request failed'},error instanceof GatewayAccessError?error.status:400);}
export async function limitedGatewayBody(request:Request,max:number){const reader=request.body?.getReader();let bytes=0;const chunks:Uint8Array[]=[];if(reader)try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>max){await reader.cancel();throw new GatewayAccessError('Request too large.',413);}chunks.push(value);}}finally{reader.releaseLock();}return Buffer.concat(chunks).toString('utf8');}
