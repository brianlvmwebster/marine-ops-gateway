import Gateway from '../gateway';
import { getAccess } from '../../lib/access';
import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
export const dynamic = 'force-dynamic';
export default async function Admin() {
  const access = await getAccess();
  if (!access.signedIn) redirect('/sign-in?redirect_url=%2Fadmin');
  if (!access.isAdmin) return <main className="access"><UserButton /><h1>Administrator access required</h1><p>Sign in with your verified administrator email address to manage links.</p><a href="/">Return to gateway</a></main>;
  return <Gateway admin />;
}
