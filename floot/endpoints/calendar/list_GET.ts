import {gatewayFailure} from '../../helpers/gatewayResponse';
import {requireViewer} from '../../helpers/serviceViewer';import {db} from '../../helpers/db';import {graphCalendar} from '../../helpers/graphCalendar';import superjson from 'superjson';import type {CalendarOption} from './list_GET.schema';
async function handleAuthorized(request:Request){await requireViewer(request);try{
 const c=await db.selectFrom('calendarConnection').select(['email','calendarId']).where('id','=',1).executeTakeFirst();if(!c)throw new Error('Connect Outlook first');
 const calendars:CalendarOption[]=[];let path='/me/calendars?$select=id,name,canEdit,isDefaultCalendar,owner&$top=100';
 for(let page=0;path;page++){
 if(page>=50)throw new Error('Too many Outlook calendars to list. Contact your Microsoft administrator.');
 const result=await graphCalendar(c.email,path);
 for(const v of result?.value||[])calendars.push({id:v.isDefaultCalendar?'primary':v.id,name:v.name||'Unnamed calendar',canEdit:v.canEdit===true,isDefault:v.isDefaultCalendar===true,owner:v.owner?.address||''});
 if(result?.['@odata.nextLink']){const u=new URL(result['@odata.nextLink']);if(u.origin!=='https://graph.microsoft.com'||!u.pathname.startsWith('/v1.0/'))throw new Error('Invalid calendar pagination link');path=u.pathname.slice('/v1.0'.length)+u.search;}else path='';
 }
 return new Response(superjson.stringify({email:c.email,selectedId:c.calendarId,calendars:[...new Map(calendars.map(v=>[v.id,v])).values()]}));
 }catch(e){return new Response(superjson.stringify({error:e instanceof Error?e.message:'Could not load Outlook calendars'}),{status:400});}}
export async function handle(request:Request){try{return await handleAuthorized(request);}catch(error){return gatewayFailure(error);}}
