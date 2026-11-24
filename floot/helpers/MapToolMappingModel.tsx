import {z} from "zod";
const point=z.object({x:z.number().min(0).max(1),y:z.number().min(0).max(1)});
const space=z.object({
 customFields:z.record(z.string().uuid(),z.string().max(2000)).refine(v=>Object.keys(v).length<=100,"Too many custom values").optional(),
 id:z.string().uuid(),label:z.string().trim().min(1).max(60),
 points:z.array(point).max(16),marker:point.optional(),
 firstName:z.string().max(100),lastName:z.string().max(100),boatDescription:z.string().max(500),
 trailerDetails:z.string().max(500),notes:z.string().max(2000),
 status:z.enum(["available","occupied","reserved"]),reviewed:z.boolean()
}).superRefine((s,ctx)=>{if(!s.marker&&(s.points.length<3||Math.abs(s.points.reduce((a,v,i)=>a+v.x*s.points[(i+1)%s.points.length].y-s.points[(i+1)%s.points.length].x*v.y,0))<=0.000002))ctx.addIssue({code:"custom",path:["points"],message:"A space needs a marker or a boundary with a visible area."});});
export const mappingModel={point,space,spaces:z.array(space).max(500).refine(s=>new Set(s.map(v=>v.id)).size===s.length,"Duplicate space IDs").refine(s=>new Set(s.map(v=>v.label.toLowerCase())).size===s.length,"Space labels must be unique")};
