import {createHash,randomUUID,sign} from 'node:crypto';
export const dashboardIssuer='https://lakeviewwebster.marineopstech.com';
export const dashboardAudience='lakeview-service-backend';
export const dashboardMethods=new Set(['GET jobs','POST jobs/save','POST jobs/workflow','POST jobs/complete','GET access/session','GET assignments/list','POST assignments/save','GET dashboard/preferences','POST dashboard/preferences','GET imports/status','GET imports/job','POST imports/run','POST imports/resolve','GET maps/status','POST maps/autocomplete','POST maps/select','GET calendar/status','GET calendar/list','POST calendar/select','POST calendar/sync','POST calendar/settings','POST calendar/activate','GET auth/microsoft_integrations_authorize','GET auth/microsoft_integrations_callback']);
export function signDashboardRequest(raw,viewer,privateKey,now=Math.floor(Date.now()/1000)){
 const head=Buffer.from(JSON.stringify({alg:'EdDSA',typ:'JWT'})).toString('base64url');
 const payload=Buffer.from(JSON.stringify({iss:dashboardIssuer,aud:dashboardAudience,sub:viewer.userId,email:viewer.email,iat:now,exp:now+30,jti:randomUUID(),bodyHash:createHash('sha256').update(raw).digest('hex')})).toString('base64url');
 const input=head+'.'+payload;
 return input+'.'+sign(null,Buffer.from(input),privateKey).toString('base64url');
}
