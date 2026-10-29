import Gateway from '../gateway';
import { getChatGPTUser, chatGPTSignInPath } from '../chatgpt-auth';
import { isAdmin } from '../../lib/access';
export const dynamic = 'force-dynamic';
export default async function Admin() {
  const user = await getChatGPTUser();
  if (!user) return <main className="access"><h1>Manage your gateway</h1><p>Sign in with your administrator account to continue.</p><a className="primary" href={chatGPTSignInPath('/admin')} target="_top">Sign in with ChatGPT</a></main>;
  if (!isAdmin(user.email)) return <main className="access"><h1>Administrator access required</h1><p>Your account does not have permission to edit this gateway. Configure ADMIN_EMAILS in the hosting environment to grant access.</p><a href="/">Return to gateway</a></main>;
  return <Gateway admin />;
}
