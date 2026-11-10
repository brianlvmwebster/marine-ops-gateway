import {gatewayFailure} from '../../helpers/gatewayResponse';
import {requireViewer} from '../../helpers/serviceViewer';
import superjson from 'superjson';
import {sql} from 'kysely';
import {db} from '../../helpers/db';
import {schema} from './save_POST.schema';
async function handleAuthorized(request:Request){
 await requireViewer(request);
 try{
  const p=schema.parse(superjson.parse(await request.text()));
  const memberIds=[...new Set(p.memberIds)];
  const result=await db.transaction().execute(async trx=>{
   if(memberIds.length){const people=await sql`select id from service_assignment_options where kind = 'person' and id in (${sql.join(memberIds)})`.execute(trx);if(people.rows.length!==memberIds.length)throw new Error('Choose existing individuals as group members.');}
   const members=sql`ARRAY[${sql.join(memberIds)}]::uuid[]`;
   if(p.id){const row=await sql`update service_assignment_options set name=${p.name}, member_ids=${members}, version=version+1, updated_at=now() where id=${p.id}::uuid and version=${p.version} and kind=${p.kind} returning id`.execute(trx);return row.rows.length?{saved:true}:{error:'This directory entry changed. Refresh before saving.',status:409};}
   await sql`insert into service_assignment_options (kind,name,member_ids) values (${p.kind},${p.name},${members})`.execute(trx);return {saved:true};
  });
  return new Response(superjson.stringify(result),{status:'status' in result?result.status:200});
 }catch(e){const duplicate=(e as {code?:string}).code==='23505';return new Response(superjson.stringify({error:duplicate?'A person or group with this name already exists.':e instanceof Error?e.message:'Could not save assignment entry'}),{status:400});}
}

export async function handle(request:Request){try{return await handleAuthorized(request);}catch(error){return gatewayFailure(error);}}
