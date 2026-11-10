import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash,generateKeyPairSync,verify} from 'node:crypto';
import {dashboardAudience,dashboardIssuer,dashboardMethods,signDashboardRequest} from '../lib/dashboard-protocol.mjs';
test('dashboard assertions bind the trusted identity and exact backend body for 30 seconds',()=>{
 const keys=generateKeyPairSync('ed25519');const raw='{"route":"jobs","method":"GET"}';
 const token=signDashboardRequest(raw,{userId:'trusted-user',email:'fixture@example.test'},keys.privateKey,1800000000);
 const [head,payload,sig]=token.split('.');
 assert.ok(verify(null,Buffer.from(head+'.'+payload),keys.publicKey,Buffer.from(sig,'base64url')));
 const claims=JSON.parse(Buffer.from(payload,'base64url').toString());
 assert.equal(claims.sub,'trusted-user');assert.equal(claims.iss,dashboardIssuer);assert.equal(claims.aud,dashboardAudience);
 assert.equal(claims.exp-claims.iat,30);assert.equal(claims.bodyHash,createHash('sha256').update(raw).digest('hex'));
 assert.notEqual(signDashboardRequest(raw,{userId:'trusted-user',email:'fixture@example.test'},keys.privateKey,1800000000),token);
});
test('the dashboard dispatcher exposes only explicit app routes and methods',()=>{
 for(const key of ['GET jobs','POST jobs/save','GET access/session','GET dashboard/preferences'])assert.ok(dashboardMethods.has(key));
 for(const key of ['POST calendar/webhook','POST admin/users','GET https://evil.test','GET ../jobs','DELETE jobs','GET gateway/dispatch'])assert.ok(!dashboardMethods.has(key));
});
