import {readFile,readdir} from 'node:fs/promises';
import {getMigrations} from 'better-auth/db/migration';
import {authOptions,getPool} from '../lib/auth-config.mjs';
const pool=getPool();
try{
 for(const file of (await readdir(new URL('../db/migrations/',import.meta.url))).filter(x=>x.endsWith('.sql')).sort()){
 await pool.query(await readFile(new URL('../db/migrations/'+file,import.meta.url),'utf8'));
 }
 const migrations=await getMigrations(authOptions());
 await migrations.runMigrations();
 console.log('Gateway, whitelist, and authentication schema are ready.');
}finally{await pool.end();}
