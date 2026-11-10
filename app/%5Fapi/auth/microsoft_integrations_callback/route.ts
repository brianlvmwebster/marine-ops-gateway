import {dashboardBackend} from '../../../../lib/dashboard-backend';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return dashboardBackend(request,['auth','microsoft_integrations_callback']);}
