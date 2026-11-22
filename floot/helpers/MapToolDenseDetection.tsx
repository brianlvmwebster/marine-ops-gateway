import {markerMatching} from "./MapToolMarkerMatching";
type Bounds={left:number;top:number;width:number;height:number};
type Point={x:number;y:number};
export const denseDetection={
 tiles(area:Bounds){
  let columns=Math.max(1,Math.ceil(area.width/1000)),rows=Math.max(1,Math.ceil(area.height/1000));
  if(columns*rows>6){
   let best=Infinity;
   for(let c=1;c<=6;c++)for(let r=1;r<=Math.floor(6/c);r++){
    const score=Math.max(area.width/c,area.height/r);
    if(score<best){best=score;columns=c;rows=r;}
   }
  }
  const margin=Math.min(160,Math.round(Math.min(area.width/columns,area.height/rows)*.2));
  return Array.from({length:rows*columns},(_,i)=>{
   const column=i%columns,row=Math.floor(i/columns);
   const left=area.left+Math.floor(column*area.width/columns),top=area.top+Math.floor(row*area.height/rows);
   const right=area.left+Math.floor((column+1)*area.width/columns),bottom=area.top+Math.floor((row+1)*area.height/rows);
   const x=Math.max(area.left,left-margin),y=Math.max(area.top,top-margin);
   return {core:{left,top,width:right-left,height:bottom-top},bounds:{left:x,top:y,width:Math.min(area.left+area.width,right+margin)-x,height:Math.min(area.top+area.height,bottom+margin)-y}};
  });
 },
 collect(tiles:{bounds:Bounds;core:Bounds;points:Point[]}[],area:Bounds,width:number,height:number){
  const clusters:{point:Point;quality:number}[]=[];
  for(const tile of tiles){
   const observations:{point:Point;quality:number}[]=[];
   for(const p of tile.points){
    const x=tile.bounds.left+p.x*tile.bounds.width,y=tile.bounds.top+p.y*tile.bounds.height;
    if(x<area.left||x>area.left+area.width||y<area.top||y>area.top+area.height)continue;
    // Suppress exact repeated coordinates only. Nearby boats in the same view stay distinct.
    if(observations.some(o=>Math.hypot(o.point.x*width-x,o.point.y*height-y)<.75))continue;
    observations.push({point:{x:x/width,y:y/height},quality:Math.min(x-tile.bounds.left,y-tile.bounds.top,tile.bounds.left+tile.bounds.width-x,tile.bounds.top+tile.bounds.height-y)});
   }
   const pairs=markerMatching.pairs(clusters.map(c=>c.point),observations.map(o=>o.point),width,height);
   const matched=new Set(pairs.map(p=>p.incomingIndex));
   for(const pair of pairs)if(observations[pair.incomingIndex].quality>clusters[pair.existingIndex].quality)clusters[pair.existingIndex]=observations[pair.incomingIndex];
   observations.forEach((o,i)=>{if(!matched.has(i))clusters.push(o);});
  }
  return clusters.map(c=>c.point).sort((a,b)=>a.y-b.y||a.x-b.x);
 }
};