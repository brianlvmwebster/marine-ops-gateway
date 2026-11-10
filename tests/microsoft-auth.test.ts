import assert from 'node:assert/strict';
import {test} from 'node:test';
import {microsoftSettings,companyProfile,authRouteAllowed,microsoftLinkingPolicy} from '../lib/microsoft-auth.mjs';
const tenant='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const client='11111111-2222-3333-4444-555555555555';
const oid='66666666-7777-8888-9999-aaaaaaaaaaaa';
test('Microsoft sign-in requires an explicit company tenant and complete credentials',()=>{
 const env={MICROSOFT_TENANT_ID:tenant,MICROSOFT_CLIENT_ID:client,MICROSOFT_CLIENT_SECRET:'test-only',AUTH_MICROSOFT_ONLY:'true'};
 assert.equal(microsoftSettings(env).configured,true);
 for(const value of ['common','organizations','consumers','',tenant+'.evil'])assert.equal(microsoftSettings({...env,MICROSOFT_TENANT_ID:value}).configured,false);
 assert.equal(microsoftSettings({...env,MICROSOFT_CLIENT_SECRET:''}).configured,false);
});
test('company profile mapping rejects other tenants and missing stable identities',()=>{
 assert.deepEqual(companyProfile({tid:tenant,oid,email:'STAFF@example.com'},tenant),{email:'staff@example.com',image:null});
 assert.throws(()=>companyProfile({tid:client,oid,email:'staff@example.com'},tenant));
 assert.throws(()=>companyProfile({tid:tenant,email:'staff@example.com'},tenant));
 assert.deepEqual(companyProfile({tid:tenant,oid,preferred_username:'staff@example.com'},tenant),{email:'staff@example.com',image:null});
});
test('Microsoft-only auth blocks password routes and public account creation',()=>{
 const settings={only:true,configured:true};
 for(const path of ['/sign-in/email','/sign-up/email','/link-social','/callback/google'])assert.equal(authRouteAllowed(path,settings),false);
 for(const path of ['/sign-in/social','/callback/microsoft','/get-session','/sign-out'])assert.equal(authRouteAllowed(path,settings),true);
 assert.equal(authRouteAllowed('/sign-in/social',{only:true,configured:false}),false);
 assert.equal(authRouteAllowed('/sign-in/email',{only:false,configured:false}),true);
});
test('company SSO can migrate admin-provisioned legacy accounts without trusting other providers',()=>{
 const policy=microsoftLinkingPolicy(true);
 assert.equal(policy.requireLocalEmailVerified,false);
 assert.deepEqual(policy.trustedProviders,['microsoft']);
 assert.equal(policy.allowDifferentEmails,false);
 assert.equal(microsoftLinkingPolicy(false).requireLocalEmailVerified,true);
});
