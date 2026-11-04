import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import { put, get, del } from '@vercel/blob';
const sql=neon(process.env.DATABASE_URL);
const id='verification-'+crypto.randomUUID();
const pathname='verification/'+id;
try {
  await sql`INSERT INTO gateway (id,contents,version) VALUES (${id},'[]'::jsonb,1)`;
  const results=await Promise.all([1,2].map(()=>sql`UPDATE gateway SET version=version+1 WHERE id=${id} AND version=1 RETURNING version`));
  assert.equal(results.filter(r=>r.length).length,1,'Exactly one competing save succeeds');
  const rows=await sql`SELECT version FROM gateway WHERE id=${id}`;assert.equal(rows[0].version,2);
  const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  await put(pathname,bytes,{access:'private',contentType:'image/png',addRandomSuffix:false});
  const blob=await get(pathname,{access:'private',useCache:false});assert.equal(blob?.statusCode,200);
  assert.deepEqual(Buffer.from(await new Response(blob.stream).arrayBuffer()),bytes);
  console.log('PASS: Neon reads/writes, concurrent save protection, private Blob upload and retrieval.');
} finally {
  await sql`DELETE FROM gateway WHERE id=${id}`;
  await del(pathname);
}
