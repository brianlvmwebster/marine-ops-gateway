import postgres from 'postgres';
import {readFile} from 'node:fs/promises';
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL explicitly for the standalone database.');
const sql=postgres(process.env.DATABASE_URL,{max:1});
try {
  await sql.unsafe(await readFile(new URL('../migrations/007-platform-foundation.sql',import.meta.url),'utf8'));
  console.log('Platform foundation applied. Lakeview and Service Desk are registered.');
} finally {await sql.end();}
