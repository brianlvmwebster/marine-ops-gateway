import type {Space} from "../endpoints/mapping/maps_GET.schema";
import {mappingModel} from "./MapToolMappingModel";
type Options={template:string;start:number;padding:number;mode:"existing"|"sequence"};
type Entry={key:string;label:string;description?:string};
type Preview={key:string;before:string;after:string;description?:string;error:string};
const defaults:Options={template:"S-{n}",start:1,padding:3,mode:"existing"};
function preview(entries:Entry[],options:Options):Preview[]{
 if(options.template.split("{n}").length!==2||/[{}]/.test(options.template.replace("{n}","")))throw new Error("Use exactly one {n} in the template, for example S-{n}.");
 if(!Number.isSafeInteger(options.start)||options.start<0||options.start>1000000000)throw new Error("Starting number must be a whole number between 0 and 1,000,000,000.");
 if(!Number.isInteger(options.padding)||options.padding<0||options.padding>12)throw new Error("Number width must be a whole number from 0 to 12.");
 if(!["existing","sequence"].includes(options.mode))throw new Error("Choose a numbering mode.");
 if(new Set(entries.map(e=>e.key)).size!==entries.length)throw new Error("Duplicate internal row identifiers.");
 const rows=entries.map((entry,i):Preview=>{
  const matches=entry.label.match(/\d+/g)??[];
  if(options.mode==="existing"&&matches.length!==1)return {key:entry.key,before:entry.label,after:"",description:entry.description,error:"ID must contain exactly one number. Use consecutive numbering only after checking the row order."};
  const number=options.mode==="sequence"?options.start+i:Number(matches[0]);
  if(!Number.isSafeInteger(number)||number<0)return {key:entry.key,before:entry.label,after:"",description:entry.description,error:"Number is too large."};
  const label=options.template.replace("{n}",String(number).padStart(options.padding,"0")).trim();
  return {key:entry.key,before:entry.label,after:label,description:entry.description,error:!label||label.length>60?"Unit names must be 1–60 characters.":""};
 });
 const counts=new Map<string,number>();
 for(const row of rows)if(!row.error){const key=row.after.toLowerCase();counts.set(key,(counts.get(key)??0)+1);}
 return rows.map(row=>!row.error&&(counts.get(row.after.toLowerCase())??0)>1?{...row,error:"This template would create duplicate unit names."}:row);
}
function rename(spaces:Space[],options:Options):Space[]{
 const rows=preview(spaces.map(s=>({key:s.id,label:s.label})),options);
 if(rows.some(r=>r.error))throw new Error("Resolve all naming errors before applying.");
 const labels=new Map(rows.map(r=>[r.key,r.after]));
 return mappingModel.spaces.parse(spaces.map(s=>({...s,label:labels.get(s.id)!})));
}
export const unitNaming={defaults,preview,rename};
