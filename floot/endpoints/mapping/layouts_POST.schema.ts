import superjson from "superjson";
import {layoutModel} from "../../helpers/MapToolLayoutModel";
import type {z} from "zod";
export const schema=layoutModel.schema;
export type OutputType={revision:number};
export async function postLayouts(input:z.infer<typeof schema>):Promise<OutputType>{
 const response=await fetch("/_api/mapping/layouts",{method:"POST",headers:{"Content-Type":"application/json"},body:superjson.stringify(schema.parse(input))});
 const data=superjson.parse<OutputType&{error?:string}>(await response.text());
 if(!response.ok)throw new Error(data.error||"Could not save layouts.");
 return data;
}
