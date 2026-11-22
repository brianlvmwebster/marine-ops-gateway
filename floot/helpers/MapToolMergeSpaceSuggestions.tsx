import {markerMatching} from "./MapToolMarkerMatching";
import {spacePresentation} from "./MapToolSpacePresentation";
import type {Space} from "../endpoints/mapping/maps_GET.schema";
type Point={x:number;y:number};
function center(points:Point[]){return {x:points.reduce((s,p)=>s+p.x,0)/points.length,y:points.reduce((s,p)=>s+p.y,0)/points.length};}
function contains(p:Point,polygon:Point[]){
 let inside=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[i],b=polygon[j];
  if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }
 return inside;
}
export function mergeSpaceSuggestions(existing:Space[],suggested:Space[],imageWidth=1000,imageHeight=1000){
 const spaces=[...existing],labels=new Set(existing.map(s=>s.label.toLowerCase()));
 const duplicateMarkers=new Set(markerMatching.pairs(existing.map(spacePresentation.anchor),suggested.map(spacePresentation.anchor),imageWidth,imageHeight).filter(p=>existing[p.existingIndex].marker||suggested[p.incomingIndex].marker).map(p=>p.incomingIndex));
 let skipped=0,limited=0,added=0,index=1;
 for(const [candidateIndex,suggestion] of suggested.entries()){
  if(duplicateMarkers.has(candidateIndex)||spaces.some(s=>s.id===suggestion.id||((s.marker||suggestion.marker)?Math.hypot((spacePresentation.anchor(s).x-spacePresentation.anchor(suggestion).x)*imageWidth,(spacePresentation.anchor(s).y-spacePresentation.anchor(suggestion).y)*imageHeight)<.75:contains(center(suggestion.points),s.points)||contains(center(s.points),suggestion.points)))){skipped++;continue;}
  if(spaces.length>=500){limited++;continue;}
  let label=suggestion.label;
  while(labels.has(label.toLowerCase()))label="S-"+String(index++).padStart(3,"0");
  labels.add(label.toLowerCase());spaces.push({...suggestion,label});added++;
 }
 return {spaces,added,skipped,limited};
}