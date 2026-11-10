import {gatewayFailure} from '../helpers/gatewayResponse';
import {normalizeJobStage} from '../helpers/jobStage';import {jobModel} from '../helpers/jobModel';
import {requireViewer} from '../helpers/serviceViewer';import {db} from '../helpers/db';import superjson from 'superjson';
async function handleAuthorized(request:Request){await requireViewer(request);const jobs=await db.selectFrom('serviceJobs').selectAll().orderBy('createdAt','desc').limit(2000).execute();return new Response(superjson.stringify({jobs:jobs.map(job=>({...job,data:normalizeJobStage(jobModel.parse(job.data))}))}));}
export async function handle(request:Request){try{return await handleAuthorized(request);}catch(error){return gatewayFailure(error);}}
