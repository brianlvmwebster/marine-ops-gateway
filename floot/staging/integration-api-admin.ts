import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { platformDatabase } from '../platform/database';
import { stagingOnly } from './config';

stagingOnly();
const [action, ...args] = process.argv.slice(2);
const db = platformDatabase();

try {
  if (action === 'migrate' && args.length === 0) {
    await db.unsafe(await readFile(new URL('../migrations/018-integration-api.sql', import.meta.url), 'utf8'));
    console.log('Integration API schema ready.');
  } else if (action === 'register') {
    const [id, company, name, scope, hash, days] = z.tuple([
      z.uuid(), z.uuid(), z.string().regex(/^[A-Za-z0-9 _.-]{1,120}$/).trim().min(1),
      z.enum(['customers', 'parts', 'customers+parts']), z.string().regex(/^[0-9a-f]{64}$/),
      z.string().regex(/^[1-9][0-9]?$/).transform(Number).pipe(z.number().max(90)),
    ]).parse(args);
    const customers = scope !== 'parts';
    const parts = scope !== 'customers';
    const [key] = await db`
      INSERT INTO integration_api_keys(id, company_id, name, token_hash, customers_read, parts_read, expires_at)
      VALUES (${id}, ${company}, ${name}, ${hash}, ${customers}, ${parts}, now() + make_interval(days => ${days}))
      RETURNING id, expires_at`;
    console.log(JSON.stringify({ id: key.id, expiresAt: key.expires_at }));
  } else if (action === 'revoke') {
    const [id] = z.tuple([z.uuid()]).parse(args);
    const [key] = await db`UPDATE integration_api_keys SET revoked_at=coalesce(revoked_at, now()) WHERE id=${id} RETURNING id`;
    if (!key) throw new Error('Integration key was not found.');
    console.log(JSON.stringify({ id: key.id, revoked: true }));
  } else {
    throw new Error('Expected migrate, register, or revoke.');
  }
} catch (error) {
  // Operational logs must never contain the submitted verifier or database query values.
  console.error('Integration API administration failed.', error instanceof z.ZodError ? 'Invalid arguments.' : '');
  process.exitCode = 1;
} finally {
  await db.end();
}
