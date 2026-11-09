import {redirect} from 'next/navigation';
import {headers} from 'next/headers';
import {getAccess} from '../../../lib/access';
import {readButtons} from '../../../lib/database';
import {webUrl} from '../../../lib/validation';
export const dynamic='force-dynamic';
export default async function Destination({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>60)return <main className="access"><h1>Destination not found.</h1><a href="/">Back to gateway</a></main>;
 const access=await getAccess();
 if(!access.signedIn)redirect('/sign-in?next='+encodeURIComponent('/apps/'+slug));
 if(!access.canView)return <main className="access"><h1>Access required.</h1><p>Ask your gateway administrator to approve your account.</p></main>;
 const {buttons}=await readButtons();
 const button=buttons.find(b=>b.slug===slug);
 if(!button||!webUrl(button.url))return <main className="access"><h1>Destination unavailable.</h1><p>Your administrator can update this destination in Manage links.</p><a href="/">Back to gateway</a></main>;
 const target=new URL(button.url);
 const host=(await headers()).get('host');
 if(target.host===host&&target.pathname.startsWith('/apps/'))return <main className="access"><h1>Destination needs updating.</h1><p>Set its destination to the application address, rather than another gateway link.</p><a href="/admin">Manage links</a></main>;
 // A temporary redirect keeps future destination edits effective for bookmarked gateway URLs.
 redirect(button.url);
}
