import {defaultColumns,fieldValue,fieldPatch,parseFieldValue,type MappingColumn} from "./MapToolMappingColumns";
import type {Space} from "../endpoints/mapping/maps_GET.schema";
import {mappingModel} from "./MapToolMappingModel";

type Field="locationId"|"lastName"|"firstName"|"boatDescription"|"trailerDetails";
type Table={name:string;headers:string[];rows:unknown[][];rawRows?:unknown[][];firstRow:number};
type Columns=Record<string,number>;
type Result={row:number;locationId:string;status:"Update"|"Unchanged"|"Unmatched"|"Duplicate"|"Invalid";message:string;spaceId?:string;before?:Space;after?:Space};
const fields:Field[]=["locationId","lastName","firstName","boatDescription","trailerDetails"];
const labels:Record<Field,string>={locationId:"Location ID",lastName:"Last Name",firstName:"First Name",boatDescription:"Boat",trailerDetails:"Trailer"};
const normalize=(value:string)=>value.trim().toLowerCase();
const headerKey=(value:string)=>normalize(value).replace(/[^\p{L}\p{N}]/gu,"");
const aliases:Record<Field,string[]>={locationId:["locationid","location","unit","unitid","unitlabel","space","spaceid","label","id"],lastName:["lastname","surname"],firstName:["firstname","givenname"],boatDescription:["boat","boatdescription","boatdesc"],trailerDetails:["trailer","trailerdetails","trailerdescription"]};
function guess(headers:string[],definitions:MappingColumn[]=defaultColumns):Columns{
 return Object.fromEntries([{id:"locationId",label:"Location ID"},...definitions].map(field=>{
  const exact=headers.flatMap((h,i)=>headerKey(h)===headerKey(field.label)?[i]:[]);
  const matches=exact.length?exact:headers.flatMap((h,i)=>(aliases[field.id as Field]??[]).includes(headerKey(h))?[i]:[]);
  return [field.id,matches.length===1?matches[0]:-1];
 }));
}
function cell(value:unknown):string{
 if(value===null||value===undefined)return "";
 if(typeof value!=="string"&&typeof value!=="number")throw new Error("Use text or numbers, not nested objects or booleans.");
 if(typeof value==="number"&&!Number.isFinite(value))throw new Error("Invalid number.");
 return String(value).trim();
}
function fromJson(text:string):Table[]{
 let data:unknown;try{data=JSON.parse(text.replace(/^\uFEFF/,""));}catch{throw new Error("Invalid JSON. Use an array of location objects.");}
 if(data&&typeof data==="object"&&!Array.isArray(data)&&"locations" in data)data=(data as {locations:unknown}).locations;
 if(!Array.isArray(data)||!data.length)throw new Error("JSON must contain a nonempty array of location objects (or {locations: [...]}).");
 if(data.length>5000)throw new Error("Import up to 5,000 rows at a time.");
 const headers:string[]=[];
 for(const row of data){
  if(!row||typeof row!=="object"||Array.isArray(row))throw new Error("Each JSON row must be an object.");
  for(const key of Object.keys(row))if(!headers.includes(key))headers.push(key);
  if(headers.length>100)throw new Error("Import up to 100 columns.");
 }
 return [{name:"JSON",headers,rows:data.map(row=>headers.map(h=>Object.prototype.hasOwnProperty.call(row,h)?row[h]:null)),firstRow:1}];
}
async function parseFile(file:File):Promise<Table[]>{
 if(file.size>5*1024*1024)throw new Error("Choose a file smaller than 5 MB.");
 const ext=file.name.split(".").pop()?.toLowerCase();
 if(!["xls","xlsx","csv","json"].includes(ext??""))throw new Error("Choose an XLS, XLSX, CSV or JSON file.");
 if(ext==="json")return fromJson(await file.text());
 const XLSX=await import("xlsx");
 const data=ext==="csv"?await file.text():await file.arrayBuffer();
 const workbook=XLSX.read(data,{type:ext==="csv"?"string":"array",raw:true,cellHTML:false,cellFormula:false,sheetRows:5002});
 const tables:Table[]=[];
 for(const name of workbook.SheetNames){
  const sheet=workbook.Sheets[name];
  if(!sheet["!ref"])continue;
  const range=XLSX.utils.decode_range(sheet["!fullref"]||sheet["!ref"]);
  if(range.e.c>99||range.e.r>5000)throw new Error("Each worksheet may have up to 5,000 data rows and 100 columns.");
  const rows=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,raw:false,defval:"",blankrows:true,range:0});
  const first=rows.findIndex(row=>row.some(v=>String(v??"").trim()));
  if(first<0)continue;
  tables.push({name,headers:rows[first].map((v,i)=>String(v??"").trim()||"Column "+(i+1)),rows:rows.slice(first+1),rawRows:XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,raw:true,defval:"",blankrows:true,range:0}).slice(first+1),firstRow:first+2});
 }
 if(!tables.length)throw new Error("The file has no data. Include column headers and location rows.");
 return tables;
}
function preview(table:Table,columns:Columns,spaces:Space[],fillOnly:boolean,definitions:MappingColumn[]=defaultColumns):Result[]{
 const activeFields=["locationId",...definitions.map(c=>c.id)];
 const mapped=activeFields.filter(f=>columns[f]>=0);
 if(columns.locationId<0)throw new Error("Choose the Location ID column.");
 if(mapped.length<2)throw new Error("Choose at least one detail column.");
 if(new Set(mapped.map(f=>columns[f])).size!==mapped.length)throw new Error("Choose a different column for each field.");
 const index=new Map<string,Space[]>();
 for(const space of spaces){const key=normalize(space.label);index.set(key,[...(index.get(key)??[]),space]);}
 const counts=new Map<string,number>();
 for(const row of table.rows){try{const key=normalize(cell(row[columns.locationId]));if(key)counts.set(key,(counts.get(key)??0)+1);}catch{}}
 return table.rows.flatMap((row,i):Result[]=>{
  if(row.every(v=>v===null||v===undefined||v===""))return [];
  const result:Result={row:table.firstRow+i,locationId:"",status:"Invalid",message:""};
  try{
   result.locationId=cell(row[columns.locationId]);
   if(!result.locationId)throw new Error("Location ID is missing.");
   const key=normalize(result.locationId);
   if((counts.get(key)??0)>1)return [{...result,status:"Duplicate",message:"Repeated ID in the file; all rows with this ID are skipped."}];
   const matches=index.get(key)??[];
   if(matches.length===0)return [{...result,status:"Unmatched",message:"No Unit label matches this ID in the selected map."}];
   if(matches.length>1)return [{...result,status:"Duplicate",message:"More than one mapped location matches this ID."}];
   const before=matches[0],after={...before};
   for(const field of mapped){
    if(field==="locationId")continue;
    const definition=definitions.find(c=>c.id===field)!;
    const raw=(definition.type==="number"||definition.type==="boolean")?(table.rawRows?.[i]?.[columns[field]]??row[columns[field]]):row[columns[field]];
    const value=parseFieldValue(definition,raw);
    if(value&&(!fillOnly||!fieldValue(before,field).trim()))Object.assign(after,fieldPatch(after,field,value));
   }
   const valid=mappingModel.space.safeParse(after);
   if(!valid.success)throw new Error(valid.error.issues.map(e=>e.path.join(".")+": "+e.message).join("; "));
   const changed=activeFields.some(f=>f!=="locationId"&&fieldValue(before,f)!==fieldValue(after,f));
   return [{...result,status:changed?"Update":"Unchanged",message:changed?"Ready to apply":"No field changes.",spaceId:before.id,before,after}];
  }catch(error){return [{...result,message:error instanceof Error?error.message:"Invalid row."}];}
 });
}
function apply(spaces:Space[],results:Result[]):Space[]{
 const updates=new Map(results.filter(r=>r.status==="Update"&&r.after).map(r=>[r.spaceId,r.after!]));
 return spaces.map(space=>{
  const update=updates.get(space.id);
  return update?{...space,lastName:update.lastName,firstName:update.firstName,boatDescription:update.boatDescription,trailerDetails:update.trailerDetails,...(update.customFields?{customFields:update.customFields}:{})}:space;
 });
}
export const locationImport={fields,labels,guess,parseFile,fromJson,preview,apply};
