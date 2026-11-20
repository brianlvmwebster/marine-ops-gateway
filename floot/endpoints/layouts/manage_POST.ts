import {randomUUID} from 'node:crypto';
import superjson from 'superjson';
import {sql} from 'kysely';
import {db} from '../../helpers/db';
import {nativeGatewayAccess} from '../../helpers/nativeGatewayAccess';
import {gatewayJson,gatewayFailure,limitedGatewayBody} from '../../helpers/gatewayResponse';
import {layoutActionSchema} from '../../helpers/savedLayoutTypes';
export async function handle(request:Request){try{
const viewer=await nativeGatewayAccess(request);
const input=layoutActionSchema.parse(superjson.parse(await limitedGatewayBody(request,4000000)));
if(input.action==='save'&&!input.id){
const row=await db.insertInto('savedLayouts').values({id:randomUUID(),name:input.name,document:sql`cast(${JSON.stringify(input.document)} as jsonb)`,updatedBy:viewer.email}).returning(['id','name','revision','updatedAt','updatedBy']).executeTakeFirstOrThrow();return gatewayJson(row);
}
if(!input.id||!input.revision)return gatewayJson({error:'Reload the layout before updating it.'},400);
let row;
if(input.action==='delete')row=await db.deleteFrom('savedLayouts').where('id','=',input.id).where('revision','=',input.revision).returning('id').executeTakeFirst();
else row=await db.updateTable('savedLayouts').set({name:input.name,...(input.action==='save'?{document:sql`cast(${JSON.stringify(input.document)} as jsonb)`}:{}),revision:sql`revision + 1`,updatedAt:new Date(),updatedBy:viewer.email}).where('id','=',input.id).where('revision','=',input.revision).returning(['id','name','revision','updatedAt','updatedBy']).executeTakeFirst();
return row?gatewayJson(row):gatewayJson({error:'This layout was changed or deleted by someone else. Load the latest version, or save your work as a new layout.'},409);
}catch(e){return gatewayFailure(e);}}