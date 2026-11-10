import {parseSheetCsv,mergeSheetJob,stableJson} from './sheetMapping';import {emptyJob} from './jobModel';
const header='Submission ID,First Name,Last Name,Completed,Service Date,Requested Services,Year,Trailer,Return/Store,Additional Information';
const sample=header+'\n6616630340558015027,Alex,Smith,1,\"Wednesday, Sep 30, 2026 07:30 AM-08:00 AM\",\"Winterize; Storage - Outdoor\",20189,,,\"Line one\nLine two\"';
describe('Sheet import safety',()=>{
 it('preserves long IDs, unusual years, additional services and quoted multiline notes',()=>{
  const [r]=parseSheetCsv(sample);expect(r.sourceKey).toBe('jotform:6616630340558015027');expect(r.data.year).toBe('20189');expect(r.data.status).toBe('Done');expect(r.data.services).toEqual(['Winterize','Storage - Outdoor']);expect(r.data.notes).toBe('Line one\nLine two');expect(r.data.time).toBe('07:30');expect(r.data.duration).toBe(30);
 });
 it('keeps missing appointments unscheduled without inventing a time',()=>{
  const [r]=parseSheetCsv(header+'\n999,Alex,Smith,0,,Winterize,2019,,,');expect(r.data.serviceDate).toBe('');expect(r.data.time).toBe('');expect(r.data.status).toBe('New');
 });
 it('rejects duplicate identities and changed headers before any writes',()=>{
  expect(()=>parseSheetCsv(sample+'\n6616630340558015027,Alex,Smith,0,,Winterize,2019,,,')).toThrowError(/Duplicate/);
  expect(()=>parseSheetCsv('Name,ID\nAlex,123')).toThrowError(/expected job columns/);
 });
 it('skips otherwise empty rows without treating them as jobs',()=>{
  expect(parseSheetCsv(sample+'\n,,,0,,,,,,').length).toBe(1);
 });
 const b={...emptyJob,sourceSubmissionId:'123',firstName:'Alex',notes:'original',status:'Scheduled' as const};
 it('merges source-only changes while preserving local assignments and checklists',()=>{
  const local={...b,technician:'Pat',checklist:[{label:'Check',done:true}]};const r=mergeSheetJob(local,b,{...b,notes:'source edit'});expect(r.data.notes).toBe('source edit');expect(r.data.technician).toBe('Pat');expect(r.data.checklist[0].done).toBeTrue();expect(r.conflicts.length).toBe(0);
 });
 it('preserves a dashboard edit and keeps simultaneous edits unresolved across repeat imports',()=>{
  const local={...b,notes:'dashboard edit'},incoming={...b,notes:'sheet edit'};const r=mergeSheetJob(local,b,incoming);expect(r.data.notes).toBe('dashboard edit');expect(r.conflicts[0].field).toBe('notes');const again=mergeSheetJob(r.data,incoming,incoming,r.conflicts);expect(again.conflicts.length).toBe(1);expect(again.data.notes).toBe('dashboard edit');
  expect(mergeSheetJob(local,b,b).data.notes).toBe('dashboard edit');
 });
 it('does not silently reopen completed jobs and compares object key order consistently',()=>{
  const done={...b,status:'Done' as const};expect(mergeSheetJob(done,done,b).conflicts[0].field).toBe('status');expect(stableJson({a:1,b:2})).toBe(stableJson({b:2,a:1}));
 });
});