import 'server-only';
import { currentUser } from '@clerk/nextjs/server';
import { cache } from 'react';
const emails = (value: string | undefined) => (value || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);

// Verify identity through Clerk. Never trust client-supplied identity headers.
export const getAccess = cache(async () => {
  const user = await currentUser();
  if (!user) return { signedIn: false, canView: false, isAdmin: false };
  const verified = user.emailAddresses.filter(x => x.verification?.status === 'verified').map(x => x.emailAddress.toLowerCase());
  const admins = emails(process.env.ADMIN_EMAILS);
  const viewers = [...admins, ...emails(process.env.VIEWER_EMAILS)];
  return { signedIn: true, canView: verified.some(x => viewers.includes(x)), isAdmin: verified.some(x => admins.includes(x)) };
});
