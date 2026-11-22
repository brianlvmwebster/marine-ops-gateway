import {layoutModel} from "../../helpers/MapToolLayoutModel";
import {schema} from "./maps_POST.schema";
import {db} from "../../helpers/db";
import {nativeGatewayAccess} from "../../helpers/nativeGatewayAccess";
import {gatewayFailure} from "../../helpers/gatewayResponse";
import sharp from "sharp";
import {upload,getInfo,getUrl,copy} from "@floot/storage";
import superjson from "superjson";
import {sql} from "kysely";
async function run(request:Request,viewer:{userId:string}){
 try{
  const input=schema.parse(superjson.parse(await request.text()));
  if(input.action==="prepare"){
   if(input.sectionId){const organization=await db.selectFrom("layoutOrganization").select("sections").where("ownerId","=",viewer.userId).executeTakeFirst();if(!layoutModel.sections.parse(organization?.sections??[]).some(s=>s.id===input.sectionId))throw new Error("Section not found. Reload your layouts.");}
   const count=await db.selectFrom("storageMaps").select(db.fn.countAll<string>().as("count")).where("ownerId","=",viewer.userId).executeTakeFirstOrThrow();
   if(Number(count.count)>=100)throw new Error("This workspace supports up to 100 maps.");
   const id=crypto.randomUUID(),ext=input.contentType==="image/jpeg"?"jpg":input.contentType==="image/png"?"png":"webp";
   const uploadKey="uploads/"+id+"."+ext,imageKey="maps/"+id+"."+ext;
   const signed=await upload({visibility:"private",filename:uploadKey,contentType:input.contentType,sizeBytes:input.sizeBytes,ifAbsent:true});
   if(!signed.ok)throw new Error(signed.error.message);
   await db.insertInto("storageMaps").values({id,ownerId:viewer.userId,sectionId:input.sectionId??null,name:input.name,uploadKey,imageKey,imageWidth:input.imageWidth,imageHeight:input.imageHeight,sourceKind:input.sourceKind}).execute();
   return new Response(superjson.stringify({id,revision:0,presignedUrl:signed.presignedUrl,headers:signed.headers}));
  }
  const row=await db.selectFrom("storageMaps").selectAll().where("id","=",input.id).where("ownerId","=",viewer.userId).executeTakeFirst();
  if(!row)return new Response(superjson.stringify({error:"Map not found."}),{status:404});
  if(input.action==="complete"){
   if(!row.ready){
    const info=await getInfo({visibility:"private",filename:row.uploadKey});
    if(!info.ok||!info.exists)throw new Error("Image upload is incomplete. Please import it again.");
    if(info.sizeBytes>10485760)throw new Error("The image exceeds 10 MB.");
    const source=await getUrl({visibility:"private",filename:row.uploadKey});
    if(!source.ok)throw new Error("Uploaded image is unavailable.");
    const response=await fetch(source.url);
    if(!response.ok)throw new Error("Uploaded image could not be read.");
    const bytes=Buffer.from(await response.arrayBuffer());
    const metadata=await sharp(bytes,{limitInputPixels:100000000}).metadata();
    if(!["png","jpeg","webp"].includes(metadata.format??"")||metadata.width!==row.imageWidth||metadata.height!==row.imageHeight)throw new Error("Image format or dimensions do not match. Export it as PNG or JPG and try again.");
    const result=await copy({visibility:"private",from:row.uploadKey,to:row.imageKey,sourceEtag:info.etag,ifAbsent:true});
    if(!result.ok&&result.error.code!=="AlreadyExists")throw new Error(result.error.message);
    await db.updateTable("storageMaps").set({ready:true}).where("id","=",row.id).where("ownerId","=",viewer.userId).execute();
   }
   return new Response(superjson.stringify({id:row.id,revision:row.revision}));
  }
  if(row.archived)throw new Error("Restore this map in Layout manager before editing it.");
  if(!row.ready)throw new Error("Finish uploading the map first.");
  const updated=await db.updateTable("storageMaps").set({name:input.name,spaces:input.spaces,revision:sql`revision+1`,updatedAt:new Date()}).where("id","=",row.id).where("ownerId","=",viewer.userId).where("revision","=",input.revision).returning(["id","revision"]).executeTakeFirst();
  if(!updated)return new Response(superjson.stringify({error:"This map changed in another session. Reload before saving."}),{status:409});
  return new Response(superjson.stringify(updated));
 }catch(e){return new Response(superjson.stringify({error:e instanceof Error?e.message:"Could not save map."}),{status:400});}
}

export async function handle(request:Request){try{const response=await run(request,await nativeGatewayAccess(request));response.headers.set("Cache-Control","no-store");return response;}catch(error){return gatewayFailure(error);}}