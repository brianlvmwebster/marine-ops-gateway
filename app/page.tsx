import Gateway from './gateway';
import { getAccess } from '../lib/access';
import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const access=await getAccess();
  if (!access.signedIn) redirect('/sign-in');
  if (!access.canView) return <main className="access"><UserButton /><h1>Access required</h1><p>This gateway is private. Ask your administrator to authorize your verified email address.</p></main>;
  return <Gateway admin={false} />;
}
