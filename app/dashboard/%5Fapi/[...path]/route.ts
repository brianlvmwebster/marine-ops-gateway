import {dashboardBackend} from '../../../../lib/dashboard-backend';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=180;
type Context={params:Promise<{path:string[]}>};
export async function GET(request:Request,{params}:Context){return dashboardBackend(request,(await params).path);}
export async function POST(request:Request,{params}:Context){return dashboardBackend(request,(await params).path);}
