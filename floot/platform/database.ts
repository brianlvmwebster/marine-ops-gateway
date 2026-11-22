import postgres from 'postgres';
let client: ReturnType<typeof postgres> | undefined;
export function platformDatabase() {
  const url = process.env.DATABASE_URL || process.env.FLOOT_DATABASE_URL;
  if (!url) throw new Error('Database configuration is missing.');
  return client ??= postgres(url, {max: 3, idle_timeout: 10, prepare: false});
}
