import {getAccess} from '../../../lib/access';
import {redirect} from 'next/navigation';
import Members from './members';
export const dynamic='force-dynamic';
export default async function Page(){const access=await getAccess();if(!access.signedIn)redirect('/sign-in');if(!access.isAdmin)redirect('/');return <Members email={access.email}/>;}
