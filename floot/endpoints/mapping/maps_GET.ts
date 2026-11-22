import {layoutModel} from "../../helpers/MapToolLayoutModel";
import {db} from "../../helpers/db";
import {nativeGatewayAccess} from "../../helpers/nativeGatewayAccess";
import {gatewayFailure} from "../../helpers/gatewayResponse";
import {getUrl} from "@floot/storage";
import {mappingModel} from "../../helpers/MapToolMappingModel";
import superjson from "superjson";
import type {OutputType} from "./maps_GET.schema";
async function run(request:Request,viewer:{userId:string}){
 try{
  const rows=await db.selectFrom("storageMaps").selectAll().where("ownerId","=",viewer.userId).where("ready","=",true).orderBy("sortOrder","asc").orderBy("createdAt","desc").limit(100).execute();
  const maps=await Promise.all(rows.map(async row=>{
   const image=await getUrl({visibility:"private",filename:row.imageKey,expiresInSeconds:86400});
   if(!image.ok)throw new Error("Could not load a stored image");
   return {sectionId:row.sectionId,sortOrder:row.sortOrder,archived:row.archived,id:row.id,name:row.name,imageUrl:image.url,imageWidth:row.imageWidth,imageHeight:row.imageHeight,sourceKind:row.sourceKind,revision:row.revision,spaces:mappingModel.spaces.parse(row.spaces)};
  }));
  const organization=await db.selectFrom("layoutOrganization").selectAll().where("ownerId","=",viewer.userId).executeTakeFirst();
  return new Response(superjson.stringify({maps,sections:layoutModel.sections.parse(organization?.sections??[]),organizationRevision:organization?.revision??0} satisfies OutputType));
 }catch(e){console.error(e);return new Response(superjson.stringify({error:"Could not load your storage maps. Try again."}),{status:500});}
}

export async function handle(request:Request){try{const response=await run(request,await nativeGatewayAccess(request));response.headers.set("Cache-Control","no-store");return response;}catch(error){return gatewayFailure(error);}}
