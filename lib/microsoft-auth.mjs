const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Require a specific directory, never Microsoft's common/organizations endpoints.
/** @param {Record<string,string|undefined>} env */
export function microsoftSettings(env=process.env){
 const tenantId=(env.MICROSOFT_TENANT_ID||'').trim();
 const clientId=(env.MICROSOFT_CLIENT_ID||'').trim();
 const clientSecret=env.MICROSOFT_CLIENT_SECRET||'';
 const only=env.AUTH_MICROSOFT_ONLY==='true';
 return {only,configured:uuid.test(tenantId)&&uuid.test(clientId)&&!!clientSecret,tenantId,clientId,clientSecret};
}
export function companyProfile(profile,tenantId){
 if(typeof profile.tid!=='string'||profile.tid.toLowerCase()!==tenantId.toLowerCase()||!uuid.test(profile.oid||''))throw new Error('Use an authorized company Microsoft account.');
 const email=(profile.email||profile.preferred_username||'').trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('The company account must provide an email address.');
 // Better Auth owns the stable provider identity (oid). Email is for the existing access list.
 return {email,image:null};
}
export function authRouteAllowed(path,settings){
 if(['/sign-out','/get-session'].includes(path))return true;
 if(path==='/sign-in/email')return !settings.only;
 return settings.configured&&['/sign-in/social','/callback/microsoft'].includes(path);
}
export function microsoftLinkingPolicy(companyOnly){
 // Legacy gateway accounts are created by admin setup links, not email-verification mail.
 // In company-only mode, the tenant-validated Microsoft identity is the proof of ownership.
 return {enabled:true,trustedProviders:['microsoft'],allowDifferentEmails:false,requireLocalEmailVerified:!companyOnly};
}
