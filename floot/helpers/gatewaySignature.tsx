import {createHash,verify} from 'node:crypto';
import {z} from 'zod';

export const gatewayIssuer='https://lakeviewwebster.marineopstech.com';
export const gatewayAudience='lakeview-service-backend';
const claimsSchema=z.object({iss:z.literal(gatewayIssuer),aud:z.literal(gatewayAudience),sub:z.string().min(1).max(200),email:z.email().max(254),iat:z.number().int(),exp:z.number().int(),jti:z.uuid(),bodyHash:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export function verifyGatewaySignature(token:string,body:string,publicKey:string,now=Math.floor(Date.now()/1000)){
 if(token.length>4096)throw new Error('Invalid gateway assertion');
 const parts=token.split('.');if(parts.length!==3||parts.some(p=>!p||!/^[A-Za-z0-9_-]+$/.test(p)))throw new Error('Invalid gateway assertion');
 const [head,payload,signature]=parts;
 const header=JSON.parse(Buffer.from(head,'base64url').toString());
 if(header.alg!=='EdDSA'||header.typ!=='JWT'||Object.keys(header).some(k=>!['alg','typ'].includes(k)))throw new Error('Invalid gateway algorithm');
 if(!verify(null,Buffer.from(head+'.'+payload),publicKey,Buffer.from(signature,'base64url')))throw new Error('Invalid gateway signature');
 const claims=claimsSchema.parse(JSON.parse(Buffer.from(payload,'base64url').toString()));
 if(claims.exp<=now||claims.iat>now+5||claims.iat<now-35||claims.exp-claims.iat>30||claims.exp<=claims.iat)throw new Error('Expired gateway assertion');
 if(createHash('sha256').update(body).digest('hex')!==claims.bodyHash)throw new Error('Gateway body changed');
 return claims;
}
