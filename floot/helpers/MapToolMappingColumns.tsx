import {z} from "zod";
import type {Space} from "../endpoints/mapping/maps_GET.schema";

const builtinKeys=["lastName","firstName","boatDescription","trailerDetails"] as const;
export const defaultColumns:MappingColumn[]=[{id:"lastName",label:"Last Name"},{id:"firstName",label:"First Name"},{id:"boatDescription",label:"Boat"},{id:"trailerDetails",label:"Trailer"}];
const headerKey=(s:string)=>s.trim().toLowerCase().replace(/[^\p{L}\p{N}]/gu,"");
export const columnsSchema=z.array(z.object({id:z.union([z.enum(builtinKeys),z.string().uuid()]),hidden:z.boolean().optional(),type:z.enum(["text","number","boolean"]).optional(),trueLabel:z.string().trim().min(1).max(60).optional(),falseLabel:z.string().trim().min(1).max(60).optional(),label:z.string().trim().min(1).max(60)})).max(50).superRefine((columns,ctx)=>{
 if(new Set(columns.map(c=>c.id)).size!==columns.length)ctx.addIssue({code:"custom",message:"Column IDs must be unique."});
 for(const c of columns){if(c.type!=="boolean")continue;const yes=(c.trueLabel??"Yes").toLowerCase(),no=(c.falseLabel??"No").toLowerCase();if(yes===no||["false","no","0","unset"].includes(yes)||["true","yes","1","unset"].includes(no))ctx.addIssue({code:"custom",message:c.label+": Boolean labels must be different and cannot contradict true/false, yes/no or 1/0."});}
 const names=columns.map(c=>headerKey(c.label));
 if(names.some(n=>!n||["locationid","location","unit","unitid","unitlabel","space","spaceid","label","id"].includes(n))||new Set(names).size!==names.length)ctx.addIssue({code:"custom",message:"Use unique column names; Location ID and unit identifiers are reserved."});
});
export type MappingColumn=z.infer<typeof columnsSchema>[number];
export function isBuiltin(id:string):id is typeof builtinKeys[number]{return (builtinKeys as readonly string[]).includes(id);}
export function fieldValue(space:Space|undefined,id:string):string{return space?(isBuiltin(id)?space[id]:space.customFields?.[id]??""):"";}
export function fieldPatch(space:Space,id:string,value:string):Partial<Space>{return isBuiltin(id)?{[id]:value}:{customFields:{...space.customFields,[id]:value}};}
export function fieldLimit(id:string){return id==="lastName"||id==="firstName"?100:isBuiltin(id)?500:2000;}
// Values remain canonical strings in the existing JSON records; labels are presentation only.
export function parseFieldValue(column:MappingColumn,value:unknown):string{
 if(value===null||value===undefined||value==="")return "";
 if(!["string","number","boolean"].includes(typeof value))throw new Error(column.label+": use a simple value.");
 const text=String(value).trim();if(!text)return "";
 if(column.type==="number"){
  if(typeof value==="boolean"||!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(text)||!Number.isFinite(Number(text))||(Number.isInteger(Number(text))&&!Number.isSafeInteger(Number(text))))throw new Error(column.label+": enter a valid number (for example 12.5).");
  return String(Number(text));
 }
 if(column.type==="boolean"){
  const key=text.toLowerCase();
  if(["true","yes","1",(column.trueLabel??"Yes").toLowerCase()].includes(key))return "true";
  if(["false","no","0",(column.falseLabel??"No").toLowerCase()].includes(key))return "false";
  throw new Error(column.label+": use "+(column.trueLabel??"Yes")+" or "+(column.falseLabel??"No")+".");
 }
 if(text.length>fieldLimit(column.id))throw new Error(column.label+": value is too long.");
 return text;
}
export function displayFieldValue(space:Space|undefined,column:MappingColumn):string{
 const value=fieldValue(space,column.id);
 if(column.type!=="boolean"||!value)return value;
 try{return parseFieldValue(column,value)==="true"?(column.trueLabel??"Yes"):(column.falseLabel??"No");}catch{return value;}
}
export function normalizeFieldValues(spaces:Space[],columns:MappingColumn[]):Space[]{
 return spaces.map(space=>{let next=space;for(const column of columns){const value=fieldValue(space,column.id);let normalized:string;try{normalized=parseFieldValue(column,value);}catch(e){throw new Error(space.label+" — "+(e instanceof Error?e.message:"Invalid field."));}if(normalized!==value)next={...next,...fieldPatch(next,column.id,normalized)};}return next;});
}
export function templateGuide(columns:MappingColumn[]){return [["Field","Type","Accepted values"],["Location ID","Text","Keep the unit labels unchanged. Blank detail cells preserve existing values."],...columns.filter(c=>!c.hidden).map(c=>[c.label,c.type??"text",c.type==="boolean"?(c.trueLabel??"Yes")+" / "+(c.falseLabel??"No")+" (also TRUE/FALSE, yes/no, 1/0)":c.type==="number"?"Numbers, for example 12.5 or -3. No currency symbols.":"Text"])] ;}
export function templateRows(spaces:Space[],columns:MappingColumn[]){columns=columns.filter(c=>!c.hidden);return [["Location ID",...columns.map(c=>c.label)],...spaces.map(s=>[s.label,...columns.map(()=>"")])];}
export async function exportTemplate(spaces:Space[],columns:MappingColumn[]){
 const XLSX=await import("xlsx");
 const sheet=XLSX.utils.aoa_to_sheet(templateRows(spaces,columns));
 sheet["!cols"]=[{wch:22},...columns.filter(c=>!c.hidden).map(()=>({wch:24}))];
 const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,"Locations");
 XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(templateGuide(columns)),"Field guide");
 XLSX.writeFile(book,"location-import-template.xlsx");
}
