export function stagingOnly() {
  if (process.env.APP_ENV !== 'staging' || process.env.GOOGLE_CLOUD_PROJECT !== 'marine-ops' ||
      !process.env.DATABASE_URL || new URL(process.env.DATABASE_URL).pathname !== '/marine_ops_staging' ||
      process.env.FLOOT_DATABASE_URL) throw new Error('Isolated staging configuration is required.');
}
