import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required. Pull development settings first.');
const sql=neon(process.env.DATABASE_URL);
const statement=await readFile(new URL('../db/migrations/001_gateway.sql',import.meta.url),'utf8');
await sql.query(statement);
console.log('Gateway schema is ready.');
