import 'server-only';
import { neon } from '@neondatabase/serverless';
import type { ButtonLink } from './validation';

function sql() {
  if (!process.env.DATABASE_URL) throw new Error('Database is not configured.');
  return neon(process.env.DATABASE_URL);
}
export async function readButtons(): Promise<{buttons:ButtonLink[];version:number}> {
  const rows = await sql()`SELECT contents, version FROM gateway WHERE id = 'main'`;
  return rows.length ? {buttons:rows[0].contents as ButtonLink[],version:Number(rows[0].version)} : {buttons:[],version:0};
}
export async function saveButtons(buttons:ButtonLink[],version:number) {
  const contents = JSON.stringify(buttons);
  const rows = version === 0
    ? await sql()`INSERT INTO gateway (id,contents,version) VALUES ('main',${contents}::jsonb,1) ON CONFLICT (id) DO NOTHING RETURNING version`
    : await sql()`UPDATE gateway SET contents = ${contents}::jsonb, version = version + 1 WHERE id = 'main' AND version = ${version} RETURNING version`;
  return rows.length ? Number(rows[0].version) : null;
}
