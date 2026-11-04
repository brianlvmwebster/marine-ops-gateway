import {randomBytes,createHash} from 'node:crypto';
import {writeFile,mkdir} from 'node:fs/promises';
import {getPool} from '../lib/auth-config.mjs';
const email=(process.argv[2]||'').trim().toLowerCase();
const origin=process.argv[3]||'https://www.marineopstech.com';
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||new URL(origin).origin!==origin)throw new Error('Usage: bootstrap-admin.mjs <email> <site-origin>');
const pool=getPool();
try{
 const token=randomBytes(32).toString('base64url');
 const hash=createHash('sha256').update(token).digest('hex');
 await pool.query("INSERT INTO gateway_access (email,role) VALUES ($1,'admin') ON CONFLICT DO NOTHING",[email]);
 const result=await pool.query("UPDATE gateway_access SET setup_token_hash=$2,setup_expires_at=now()+interval '24 hours' WHERE email=$1 AND role='admin' AND enabled RETURNING email",[email,hash]);
 if(!result.rowCount)throw new Error('Account exists without admin access; bootstrap refused to change its role.');
 await mkdir('outputs',{recursive:true});
 await writeFile('outputs/admin-setup.txt',origin+'/set-password#token='+token+'\n');
 console.log('A one-use administrator setup link was saved to ignored outputs/admin-setup.txt. Share it only with the account owner. It expires in 24 hours.');
}finally{await pool.end();}
