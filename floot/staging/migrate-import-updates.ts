import { readFile } from 'node:fs/promises';
import { platformDatabase } from '../platform/database';
import { stagingOnly } from './config';

stagingOnly();
const db = platformDatabase();
try {
  const connection = await db.reserve();
  try {
    await connection.unsafe(await readFile(new URL('../migrations/019-import-update-audit.sql', import.meta.url), 'utf8'));
  } finally {
    connection.release();
  }
  console.log('Import update audit schema ready.');
} finally {
  await db.end();
}
