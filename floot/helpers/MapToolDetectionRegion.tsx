import {z} from "zod";
const schema=z.object({
 x:z.number().min(0).max(1),y:z.number().min(0).max(1),
 width:z.number().positive().max(1),height:z.number().positive().max(1)
}).refine(r=>r.x+r.width<=1.00000001&&r.y+r.height<=1.00000001,"Selected area must stay inside the image.");
type Region=z.infer<typeof schema>;
type Bounds={left:number;top:number;width:number;height:number};
export const detectionRegion={
 schema,
 pixels(region:Region|undefined,width:number,height:number):Bounds{
  if(!region)return {left:0,top:0,width,height};
  const r=schema.parse(region),left=Math.floor(r.x*width),top=Math.floor(r.y*height);
  return {left,top,width:Math.min(width,Math.ceil((r.x+r.width)*width))-left,height:Math.min(height,Math.ceil((r.y+r.height)*height))-top};
 },
 mapPoint(point:{x:number;y:number},bounds:Bounds,width:number,height:number){
  return {x:(bounds.left+point.x*bounds.width)/width,y:(bounds.top+point.y*bounds.height)/height};
 }
};