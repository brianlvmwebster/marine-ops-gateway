export function resizedWidgetWidth(start:number,delta:number,trackWidth:number,max:number){
 const bound=Math.max(1,Math.min(4,Math.floor(max)));
 if(!Number.isFinite(delta)||!Number.isFinite(trackWidth)||trackWidth<=0)return Math.max(1,Math.min(bound,start));
 return Math.max(1,Math.min(bound,Math.round(start+delta/trackWidth)));
}
