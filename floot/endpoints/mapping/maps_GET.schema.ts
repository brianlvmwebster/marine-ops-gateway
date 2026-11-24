import type {MappingColumn} from "../../helpers/MapToolMappingColumns";
import superjson from "superjson";
import {z} from "zod";
import {mappingModel} from "../../helpers/MapToolMappingModel";
export const schema=z.object({});
export type Space=z.infer<typeof mappingModel.space>;
export type LayoutSection={id:string;name:string};
export type StorageMap={columns?:MappingColumn[];sectionId?:string|null;sortOrder?:number;archived?:boolean;id:string;name:string;imageUrl:string;imageWidth:number;imageHeight:number;sourceKind:"plan"|"aerial";revision:number;spaces:Space[]};
export type OutputType={capabilities?:{detection:boolean};maps:StorageMap[];sections?:LayoutSection[];organizationRevision?:number};
export async function getMaps():Promise<OutputType>{
 const r=await fetch("/_api/mapping/maps");
 const data=superjson.parse<OutputType&{error?:string}>(await r.text());
 if(!r.ok)throw new Error(data.error||"Could not load maps");
 return data;
}
