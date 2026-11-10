import {generateKeyPairSync,createHash,sign} from 'node:crypto';
import {verifyGatewaySignature,gatewayIssuer,gatewayAudience} from './gatewaySignature';
describe('gateway request authentication',()=>{
 const keys=generateKeyPairSync('ed25519');
 const publicKey=keys.publicKey.export({type:'spki',format:'pem'}).toString();
 const raw=JSON.stringify({method:'GET',route:'jobs',query:'',body:''}),now=1800000000;
 const claims={iss:gatewayIssuer,aud:gatewayAudience,sub:'fixture-user',email:'fixture@example.test',iat:now,exp:now+30,jti:'12345678-1234-4234-8234-123456789abc',bodyHash:createHash('sha256').update(raw).digest('hex')};
 const token=(overrides:object={},alg='EdDSA')=>{const head=Buffer.from(JSON.stringify({alg,typ:'JWT'})).toString('base64url'),payload=Buffer.from(JSON.stringify({...claims,...overrides})).toString('base64url'),input=head+'.'+payload;return input+'.'+sign(null,Buffer.from(input),keys.privateKey).toString('base64url');};
 it('accepts a signed, short-lived, body-bound identity',()=>expect(verifyGatewaySignature(token(),raw,publicKey,now).sub).toBe('fixture-user'));
 it('rejects body changes, bad signatures and malformed assertions',()=>{expect(()=>verifyGatewaySignature(token(),raw+' ',publicKey,now)).toThrow();const t=token();expect(()=>verifyGatewaySignature(t.slice(0,-5)+'aaaaa',raw,publicKey,now)).toThrow();expect(()=>verifyGatewaySignature('invalid',raw,publicKey,now)).toThrow();});
 it('rejects wrong issuers, audiences and algorithm substitution',()=>{expect(()=>verifyGatewaySignature(token({iss:'https://evil.test'}),raw,publicKey,now)).toThrow();expect(()=>verifyGatewaySignature(token({aud:'other'}),raw,publicKey,now)).toThrow();expect(()=>verifyGatewaySignature(token({},'none'),raw,publicKey,now)).toThrow();});
 it('rejects expired, future-dated and excessively long assertions',()=>{expect(()=>verifyGatewaySignature(token(),raw,publicKey,now+30)).toThrow();expect(()=>verifyGatewaySignature(token({iat:now+10,exp:now+30}),raw,publicKey,now)).toThrow();expect(()=>verifyGatewaySignature(token({exp:now+60}),raw,publicKey,now)).toThrow();});
});
