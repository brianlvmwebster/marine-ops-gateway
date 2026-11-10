import {sql} from 'kysely';
import {db} from './db';
export async function isServiceAdmin(userId:string){
 const result=await sql`select 1 from service_access_roles where user_id=${userId} and role='service_admin'`.execute(db);
 return result.rows.length>0;
}
