import { env } from 'cloudflare:workers';
export function isAdmin(email: string) {
  const emails = (env as unknown as {ADMIN_EMAILS?: string}).ADMIN_EMAILS || '';
  return emails.split(',').map(x => x.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
}
