import pg from 'pg';
import { APIError } from 'better-auth/api';
let pool;
export function getPool() {
 if(!process.env.DATABASE_URL)throw new Error('Database is not configured.');
 return pool ??= new pg.Pool({connectionString:process.env.DATABASE_URL,max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:10000});
}
/** @returns {import('better-auth').BetterAuthOptions} */
export function authOptions() {
 if(!process.env.BETTER_AUTH_SECRET)throw new Error('Authentication is not configured.');
 const origin=process.env.BETTER_AUTH_URL || (process.env.VERCEL_URL?'https://'+process.env.VERCEL_URL:'http://localhost:5173');
 return {
 database:getPool(),secret:process.env.BETTER_AUTH_SECRET,baseURL:origin,
 trustedOrigins:[origin,...(process.env.VERCEL_URL?['https://'+process.env.VERCEL_URL]:[]),...(process.env.AUTH_EXTRA_ORIGINS||'').split(',').filter(Boolean)],
 emailAndPassword:{enabled:true,autoSignIn:false,minPasswordLength:12,maxPasswordLength:128},
 session:{expiresIn:60*60*24*7,updateAge:60*60*24},
 rateLimit:{enabled:true,storage:'database',window:60,max:30,customRules:{'/sign-in/email':{window:60,max:5}}},
 databaseHooks:{user:{create:{before:async(user)=>{
 const {rows}=await getPool().query('SELECT email FROM gateway_access WHERE email=$1 AND enabled',[user.email.toLowerCase()]);
 if(!rows.length)throw new APIError('FORBIDDEN',{message:'This account is not authorized.'});
 return {data:{...user,email:user.email.toLowerCase()}};
 }}},session:{create:{before:async(session)=>{
 const {rows}=await getPool().query('SELECT a.email FROM gateway_access a JOIN "user" u ON lower(u.email)=a.email WHERE u.id=$1 AND a.enabled',[session.userId]);
 if(!rows.length)throw new APIError('FORBIDDEN',{message:'This account is not authorized.'});
 }}}},
 logger:{disabled:true},telemetry:{enabled:false}
 };
}
