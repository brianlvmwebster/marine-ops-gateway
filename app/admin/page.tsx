import Gateway from '../gateway';
import {getAccess} from '../../lib/access';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Admin(){const access=await getAccess();if(!access.signedIn)redirect('/sign-in');if(!access.isAdmin)redirect('/');return <Gateway admin canManage email={access.email}/>;}
