import {db} from "../../helpers/db";
import {nativeGatewayAccess} from "../../helpers/nativeGatewayAccess";
import {gatewayFailure} from "../../helpers/gatewayResponse";
import {schema} from "./layouts_POST.schema";
import {layoutModel} from "../../helpers/MapToolLayoutModel";
import superjson from "superjson";
async function run(request:Request,viewer:{userId:string}){
 try{
  const input=schema.parse(superjson.parse(await request.text()));
  const result=await db.transaction().execute(async trx=>{
   await trx.insertInto("layoutOrganization").values({ownerId:viewer.userId}).onConflict(oc=>oc.column("ownerId").doNothing()).execute();
   const organization=await trx.selectFrom("layoutOrganization").selectAll().where("ownerId","=",viewer.userId).forUpdate().executeTakeFirstOrThrow();
   const maps=await trx.selectFrom("storageMaps").selectAll().where("ownerId","=",viewer.userId).where("ready","=",true).forUpdate().execute();
   const changes=layoutModel.plan({revision:organization.revision,sections:layoutModel.sections.parse(organization.sections),maps},input);
   for(const map of changes){
    const updated=await trx.updateTable("storageMaps").set({name:map.name,sectionId:map.sectionId,sortOrder:map.sortOrder,archived:map.archived,revision:map.revision+1,updatedAt:new Date()}).where("id","=",map.id).where("ownerId","=",viewer.userId).where("revision","=",map.revision).returning("id").executeTakeFirst();
    if(!updated)throw Object.assign(new Error("Map changed. Reload before retrying."),{status:409});
   }
   await trx.updateTable("layoutOrganization").set({sections:input.sections,revision:organization.revision+1}).where("ownerId","=",viewer.userId).execute();
   return {revision:organization.revision+1};
  });
  return new Response(superjson.stringify(result));
 }catch(e){const status=typeof e==="object"&&e&&"status" in e?Number(e.status):400;return new Response(superjson.stringify({error:e instanceof Error?e.message:"Could not save layouts."}),{status});}
}

export async function handle(request:Request){try{const response=await run(request,await nativeGatewayAccess(request));response.headers.set("Cache-Control","no-store");return response;}catch(error){return gatewayFailure(error);}}
