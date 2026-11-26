import { readFile } from 'node:fs/promises';
import { platformDatabase } from '../platform/database';
import { stagingOnly } from './config';

stagingOnly();
const db = platformDatabase();
try {
  const connection = await db.reserve();
  try {
    for (const migration of ['019-import-update-audit', '020-parts-import-updates']) {
      await connection.unsafe(await readFile(new URL('../migrations/' + migration + '.sql', import.meta.url), 'utf8'));
    }
  } finally {
    connection.release();
  }
  console.log('Import update audit schema ready.');
} finally {
  await db.end();
}
