import superjson from 'superjson';
import {z} from 'zod';
import {nativeGatewayAccess} from '../helpers/nativeGatewayAccess';
import {GatewayAccessError} from '../helpers/gatewayPolicy';
import {gatewayFailure} from '../helpers/gatewayResponse';
import {platformDatabase} from '../platform/database';
import {PlatformError} from '../platform/policy';
import {readBody} from '../platform/customers';
import {serviceJobSaveStore} from '../platform/service-job-save';
export async function saveStagingJob(request:Request){try{
 const viewer=await nativeGatewayAccess(request);
 const input=superjson.deserialize(await readBody(request));
 return new Response(superjson.stringify(await serviceJobSaveStore(platformDatabase())(viewer.authUserId,input)));
}catch(e){if(e instanceof PlatformError)return new Response(superjson.stringify({error:e.message}),{status:e.status});if(e instanceof z.ZodError)return new Response(superjson.stringify({error:'Check the job fields.'}),{status:400});if(e instanceof GatewayAccessError)return gatewayFailure(e);console.error('Staging job save failed');return new Response(superjson.stringify({error:'Unable to save job. Please try again.'}),{status:503});}}
