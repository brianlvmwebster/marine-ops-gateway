import {z} from "zod";
import superjson from "superjson";
import {mappingModel} from "../../helpers/MapToolMappingModel";
export const schema=z.discriminatedUnion("action",[
 z.object({action:z.literal("prepare"),sectionId:z.string().uuid().nullable().optional(),name:z.string().trim().min(1).max(120),contentType:z.enum(["image/png","image/jpeg","image/webp"]),sizeBytes:z.number().int().min(1).max(10485760),imageWidth:z.number().int().min(1).max(20000),imageHeight:z.number().int().min(1).max(20000),sourceKind:z.enum(["plan","aerial"])}),
 z.object({action:z.literal("complete"),id:z.string().uuid()}),
 z.object({action:z.literal("save"),id:z.string().uuid(),revision:z.number().int().min(0),name:z.string().trim().min(1).max(120),spaces:mappingModel.spaces})
]);
export type OutputType={id:string;revision:number;presignedUrl?:string;headers?:Record<string,string>};
export async function postMaps(body:z.infer<typeof schema>):Promise<OutputType>{
 const r=await fetch("/_api/mapping/maps",{method:"POST",headers:{"Content-Type":"application/json"},body:superjson.stringify(schema.parse(body))});
 const d=superjson.parse<OutputType&{error?:string}>(await r.text());
 if(!r.ok)throw new Error(d.error||"Could not save map");
 return d;
}