import {mergeSpaceSuggestions} from "./MapToolMergeSpaceSuggestions";
import type {Space} from "../endpoints/mapping/maps_GET.schema";
function space(id:string,label:string,x:number):Space{return {id,label,points:[{x,y:0},{x:x+.1,y:0},{x:x+.1,y:.1},{x,y:.1}],lastName:"",firstName:"",boatDescription:"",trailerDetails:"",notes:"",status:"occupied",reviewed:false};}
describe("merging regional detections",()=>{
 it("keeps existing records and skips overlapping redetections",()=>{
  const original={...space("a","S-001",0),lastName:"Owner",reviewed:true};
  const merged=mergeSpaceSuggestions([original],[space("b","S-001",.01),space("c","S-001",.3)]);
  expect(merged.added).toBe(1);expect(merged.skipped).toBe(1);
  expect(merged.spaces[0]).toBe(original);expect(merged.spaces[0].lastName).toBe("Owner");
  expect(merged.spaces[1].label).toBe("S-002");
 });
 it("does not mistake neighboring objects for the same space",()=>{
  const merged=mergeSpaceSuggestions([space("a","A",0)],[space("b","B",.11)]);
  expect(merged.spaces.length).toBe(2);
 });
 it("limits the map without replacing records",()=>{
  const existing=Array.from({length:500},(_,i)=>space(String(i),"A"+i,0));
  const merged=mergeSpaceSuggestions(existing,[space("extra","X",.5)]);
  expect(merged.spaces.length).toBe(500);expect(merged.limited).toBe(1);expect(merged.added).toBe(0);
 });
});

describe("dense marker merging",()=>{
 it("preserves adjacent markers even inside an older polygon",()=>{
  const existing={...space("old","S-001",0),lastName:"Owner",reviewed:true};
  const nearby={...space("new","S-002",0),points:[],marker:{x:.08,y:.05}};
  const merged=mergeSpaceSuggestions([existing],[nearby],2400,1800);
  expect(merged.added).toBe(1);expect(merged.spaces[0].lastName).toBe("Owner");
 });
 it("skips a nearly identical re-detection without dropping neighbors",()=>{
  const a={...space("a","S-001",0),points:[],marker:{x:.3,y:.3}};
  const copy={...a,id:"b",marker:{x:.301,y:.3}};
  const neighbor={...a,id:"c",marker:{x:.31,y:.3}};
  const merged=mergeSpaceSuggestions([a],[copy,neighbor],2400,1800);
  expect(merged.skipped).toBe(1);expect(merged.added).toBe(1);
 });
});

describe("re-detection of named boats",()=>{
 it("keeps the named record when the new center shifts more than six pixels",()=>{
  const a={...space("a","S-001",0),points:[],marker:{x:.3,y:.5},lastName:"Owner",reviewed:true};
  const b={...space("b","S-002",0),points:[],marker:{x:.34,y:.5}};
  const result=mergeSpaceSuggestions([a,b],[{...a,id:"c",marker:{x:.308,y:.5}},{...b,id:"d",marker:{x:.348,y:.5}}],1000,1000);
  expect(result.added).toBe(0);expect(result.skipped).toBe(2);expect(result.spaces[0]).toBe(a);
 });
});
