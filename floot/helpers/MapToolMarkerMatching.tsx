type Point={x:number;y:number};
export const markerMatching={
 pairs(existing:Point[],incoming:Point[],width:number,height:number){
  const distance=(a:Point,b:Point)=>Math.hypot((a.x-b.x)*width,(a.y-b.y)*height);
  const spacing=(points:Point[])=>points.map((p,i)=>points.reduce((d,q,j)=>i===j?d:Math.min(d,distance(p,q)),Infinity));
  const aSpacing=spacing(existing),bSpacing=spacing(incoming);
  const aNearest=existing.map(a=>incoming.reduce((best,b,j)=>{const d=distance(a,b);return d<best.distance?{index:j,distance:d}:best;},{index:-1,distance:Infinity}));
  const bNearest=incoming.map(b=>existing.reduce((best,a,i)=>{const d=distance(a,b);return d<best.distance?{index:i,distance:d}:best;},{index:-1,distance:Infinity}));
  const pairs:{existingIndex:number;incomingIndex:number}[]=[];
  for(let i=0;i<existing.length;i++){
   const match=aNearest[i],j=match.index;if(j<0||bNearest[j].index!==i)continue;
   const localSpacing=Math.min(aSpacing[i],bSpacing[j]);
   const radius=Number.isFinite(localSpacing)?Math.max(1.5,Math.min(localSpacing*.42,Math.min(width,height)*.015)):6;
   if(match.distance<=radius)pairs.push({existingIndex:i,incomingIndex:j});
  }
  return pairs;
 }
};
