import {denseDetection} from "./MapToolDenseDetection";
import {z} from "zod";
const point=z.object({x:z.number().min(0).max(1),y:z.number().min(0).max(1)});
const correction=z.object({message:z.string().max(1500),remove:z.array(z.number().int().min(1)).max(200),move:z.array(z.object({id:z.number().int().min(1),x:z.number().min(0).max(1),y:z.number().min(0).max(1)})).max(200),add:z.array(point).max(100)});
export const boatAudit={
 schema:correction,
 apply(points:{x:number;y:number}[],input:z.infer<typeof correction>){
  const audit=correction.parse(input),removed=new Set(audit.remove),moved=new Map(audit.move.map(p=>[p.id,{x:p.x,y:p.y}]));
  if(removed.size!==audit.remove.length||moved.size!==audit.move.length)throw new Error("Audit repeated an object ID.");
  for(const id of [...removed,...moved.keys()])if(id>points.length||removed.has(id)&&moved.has(id))throw new Error("Audit referenced an invalid or conflicting object ID.");
  const result=points.flatMap((p,i)=>removed.has(i+1)?[]:[moved.get(i+1)??p]);
  return [...result,...audit.add];
 },
 reconcile(points:{x:number;y:number}[],views:{bounds:{left:number;top:number;width:number;height:number};indices:number[];corrections:z.infer<typeof correction>}[],area:{left:number;top:number;width:number;height:number},width:number,height:number){
  let removed=0,moved=0;
  const retained=points.flatMap((p,index)=>{
   const x=p.x*width,y=p.y*height;
   const candidates=views.map(view=>({view,local:view.indices.indexOf(index),quality:Math.min(x-view.bounds.left,y-view.bounds.top,view.bounds.left+view.bounds.width-x,view.bounds.top+view.bounds.height-y)})).filter(v=>v.local>=0).sort((a,b)=>b.quality-a.quality);
   const owner=candidates[0];if(!owner)return [p];
   if(owner.view.corrections.remove.includes(owner.local+1)){removed++;return [];}
   const change=owner.view.corrections.move.find(m=>m.id===owner.local+1);
   if(!change)return [p];
   moved++;return [{x:(owner.view.bounds.left+change.x*owner.view.bounds.width)/width,y:(owner.view.bounds.top+change.y*owner.view.bounds.height)/height}];
  });
  const layers=[{bounds:area,core:area,points:retained.map(p=>({x:(p.x*width-area.left)/area.width,y:(p.y*height-area.top)/area.height}))},...views.map(v=>({bounds:v.bounds,core:v.bounds,points:v.corrections.add}))];
  const markers=denseDetection.collect(layers,area,width,height);
  return {markers,removed,moved,added:Math.max(0,markers.length-retained.length)};
 }
};