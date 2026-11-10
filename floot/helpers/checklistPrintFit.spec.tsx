import {checklistPrintScale,CHECKLIST_PRINT_WIDTH,CHECKLIST_PRINT_HEIGHT} from './checklistPrintFit';import {mergeSheetJob} from './sheetMapping';import {emptyJob} from './jobModel';
describe('Single-page checklist fitting',()=>{
 it('keeps normal checklists at full size',()=>{expect(checklistPrintScale(740,650)).toBe(1);});
 it('fits long and wide checklists within the printable Letter area without discarding content',()=>{
  for(const [width,height] of [[740,1500],[900,2500],[740,20000]]){
   const scale=checklistPrintScale(width,height);expect(scale).toBeGreaterThan(0);expect(width*scale).toBeLessThanOrEqual(CHECKLIST_PRINT_WIDTH);expect(height*scale).toBeLessThanOrEqual(CHECKLIST_PRINT_HEIGHT);
  }
 });
 it('does not produce an invalid CSS scale from an unmeasured element',()=>{expect(checklistPrintScale(0,0)).toBe(1);expect(checklistPrintScale(NaN,10)).toBe(1);});
 it('clears stale Google place IDs when a source import changes the address',()=>{
  const baseline={...emptyJob,sourceSubmissionId:'123',pickupAddress:'Old address'},local={...baseline,pickupPlaceId:'old-place'};
  const result=mergeSheetJob(local,baseline,{...baseline,pickupAddress:'New address'});
  expect(result.data.pickupAddress).toBe('New address');expect(result.data.pickupPlaceId).toBeUndefined();
 });
});
