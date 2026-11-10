// US Letter with 0.35in margins, leaving a small rounding safety margin.
export const CHECKLIST_PRINT_WIDTH=740;
export const CHECKLIST_PRINT_HEIGHT=980;
export function checklistPrintScale(width:number,height:number){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return 1;
 return Math.min(1,Math.floor(Math.min(CHECKLIST_PRINT_WIDTH/width,CHECKLIST_PRINT_HEIGHT/height)*10000)/10000);
}
