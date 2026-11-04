import 'server-only';
import {createHash,randomBytes} from 'node:crypto';
import {hashPassword} from 'better-auth/crypto';
import {getPool} from './auth-config.mjs';
import {getAuth} from './auth';
export const normalizeEmail=(email:string)=>email.trim().toLowerCase();
export const validEmail=(email:string)=>email.length<=254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export type Member={email:string;role:'user'|'admin';enabled:boolean;registered:boolean};
export async function listMembers():Promise<Member[]>{
 const {rows}=await getPool().query('SELECT a.email,a.role,a.enabled,EXISTS(SELECT 1 FROM "user" u WHERE lower(u.email)=a.email) AS registered FROM gateway_access a ORDER BY a.created_at,a.email');return rows;
}
export async function addMember(email:string,role:'user'|'admin'){
 const {rows}=await getPool().query('INSERT INTO gateway_access (email,role) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING email',[email,role]);return rows.length>0;
}
export async function updateMember(email:string,role:'user'|'admin',enabled:boolean){
 const client=await getPool().connect();
 try{
 await client.query('BEGIN');
 await client.query("SELECT pg_advisory_xact_lock(hashtext('gateway-access-admins'))");
 const {rows}=await client.query("UPDATE gateway_access SET role=$2,enabled=$3,setup_token_hash=CASE WHEN $3 THEN setup_token_hash ELSE NULL END,setup_expires_at=CASE WHEN $3 THEN setup_expires_at ELSE NULL END WHERE email=$1 AND (NOT(enabled AND role='admin') OR ($2='admin' AND $3) OR (SELECT count(*) FROM gateway_access WHERE role='admin' AND enabled)>1) RETURNING email",[email,role,enabled]);
 if(rows.length&&!enabled)await client.query('DELETE FROM session WHERE "userId" IN (SELECT id FROM "user" WHERE lower(email)=$1)',[email]);
 await client.query('COMMIT');return rows.length>0;
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function issueSetupLink(email:string,origin:string){
 const token=randomBytes(32).toString('base64url');
 const hash=createHash('sha256').update(token).digest('hex');
 const {rows}=await getPool().query("UPDATE gateway_access SET setup_token_hash=$2,setup_expires_at=now()+interval '24 hours' WHERE email=$1 AND enabled RETURNING email",[email,hash]);
 return rows.length?origin+'/set-password#token='+token:null;
}
export async function activateAccount(token:string,password:string){
 const hash=createHash('sha256').update(token).digest('hex');
 const {rows}=await getPool().query('UPDATE gateway_access SET setup_token_hash=NULL,setup_expires_at=NULL WHERE setup_token_hash=$1 AND setup_expires_at>now() AND enabled RETURNING email',[hash]);
 if(!rows.length)return false;
 const email=rows[0].email as string;
 const existing=await getPool().query('SELECT id FROM "user" WHERE lower(email)=$1',[email]);
 if(!existing.rows.length){
 await getAuth().api.signUpEmail({body:{email,password,name:email}});
 }else{
 // Use the library's scrypt format; reset and session revocation happen together.
 const passwordHash=await hashPassword(password);
 const client=await getPool().connect();
 try{
 await client.query('BEGIN');
 await client.query('UPDATE account SET password=$1,"updatedAt"=now() WHERE "userId"=$2 AND "providerId"=$3',[passwordHash,existing.rows[0].id,'credential']);
 await client.query('DELETE FROM session WHERE "userId"=$1',[existing.rows[0].id]);
 await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
 return true;
}
