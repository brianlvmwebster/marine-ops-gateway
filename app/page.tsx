import Gateway from './gateway';
import {getAccess} from '../lib/access';
import {redirect} from 'next/navigation';
import AccountMenu from './account-menu';
export const dynamic='force-dynamic';
export default async function Home(){const access=await getAccess();if(!access.signedIn)redirect('/sign-in');if(!access.canView)return <main className="access"><h1>Access required</h1><p>Your email is not on the active whitelist. Contact your administrator.</p><AccountMenu email={access.email}/></main>;return <Gateway admin={false} canManage={access.isAdmin} email={access.email}/>;}
