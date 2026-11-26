import { readFile } from 'node:fs/promises';
import { stagingOnly } from './config';
import { platformDatabase } from '../platform/database';

stagingOnly();
const db = platformDatabase();
try {
  const migration = await readFile(new URL('../migrations/021-repair-orders.sql', import.meta.url), 'utf8');
  const connection = await db.reserve();
  try { await connection.unsafe(migration); } finally { connection.release(); }
  console.log('Repair Orders schema ready.');
} finally {
  await db.end();
}
