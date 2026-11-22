import type {Space} from "../endpoints/mapping/maps_GET.schema";
export const spacePresentation={
 anchor(space:Space){return space.marker??{x:space.points.reduce((sum,p)=>sum+p.x,0)/Math.max(1,space.points.length),y:space.points.reduce((sum,p)=>sum+p.y,0)/Math.max(1,space.points.length)};},
 label(space:Space){return space.reviewed?([space.lastName,space.firstName].map(s=>s.trim()).filter(Boolean).join(", ")||space.label):space.label.replace(/^S-0*(\d+)$/,"$1");}
};