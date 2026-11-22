import {z} from "zod";
import superjson from "superjson";
import type {Space} from "./maps_GET.schema";
import {detectionRegion} from "../../helpers/MapToolDetectionRegion";
export type DetectionArea=z.infer<typeof detectionRegion.schema>;
export const schema=z.object({id:z.string().uuid(),region:detectionRegion.schema.optional()});
export type OutputType={spaces:Space[];message:string};
export async function postAnalyze(body:z.infer<typeof schema>):Promise<OutputType>{
 const r=await fetch("/_api/mapping/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:superjson.stringify(schema.parse(body))});
 const raw=await r.text();
 if(!r.ok){
  let error="Image analysis failed. Try again or draw spaces manually.",code="";
  try{const d=JSON.parse(raw);if(d.code==="OUT_OF_CREDITS"){code=d.code;error=d.error;}}
  catch{}
  if(!code){try{const d=superjson.parse<{error:string}>(raw);error=d.error||error;}catch{}}
  throw Object.assign(new Error(error),{code,status:r.status});
 }
 return superjson.parse<OutputType>(raw);
}