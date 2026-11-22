import {z} from "zod";
const section=z.object({id:z.string().uuid(),name:z.string().trim().min(1).max(120)});
const sections=z.array(section).max(100).refine(rows=>new Set(rows.map(r=>r.id)).size===rows.length,"Duplicate section IDs").refine(rows=>new Set(rows.map(r=>r.name.toLowerCase())).size===rows.length,"Section names must be unique");
const map=z.object({id:z.string().uuid(),revision:z.number().int().min(0),name:z.string().trim().min(1).max(120),sectionId:z.string().uuid().nullable(),sortOrder:z.number().int().min(0).max(10000),archived:z.boolean()});
const schema=z.object({revision:z.number().int().min(0),sections,maps:z.array(map).max(100).refine(rows=>new Set(rows.map(r=>r.id)).size===rows.length,"Duplicate map IDs")});
type MapMeta=z.infer<typeof map>;
function plan(current:{revision:number;sections:z.infer<typeof sections>;maps:MapMeta[]},input:z.infer<typeof schema>){
 if(current.revision!==input.revision)throw Object.assign(new Error("Layout organization changed in another session. Close and reload before retrying."),{status:409});
 const sectionIds=new Set(input.sections.map(s=>s.id));
 if(current.sections.some(s=>!sectionIds.has(s.id)))throw new Error("Sections cannot be removed. Rename them or move their maps instead.");
 const owned=new Map(current.maps.map(m=>[m.id,m]));
 const changes:MapMeta[]=[];
 for(const next of input.maps){
  const old=owned.get(next.id);
  if(!old)throw Object.assign(new Error("Map not found."),{status:404});
  if(next.sectionId&&!sectionIds.has(next.sectionId))throw new Error("Choose an existing section for each map.");
  const changed=old.name!==next.name||old.sectionId!==next.sectionId||old.sortOrder!==next.sortOrder||old.archived!==next.archived;
  if(changed){
   if(old.revision!==next.revision)throw Object.assign(new Error("A map changed in another session. Close and reload before retrying."),{status:409});
   changes.push(next);
  }
 }
 return changes;
}
export const layoutModel={sections,schema,plan};
