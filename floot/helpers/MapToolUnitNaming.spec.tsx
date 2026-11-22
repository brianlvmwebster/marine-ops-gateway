import {unitNaming} from "./MapToolUnitNaming";
import {locationImport} from "./MapToolLocationImport";
import type {Space} from "../endpoints/mapping/maps_GET.schema";
const space=(n:number,label:string):Space=>({id:"10000000-0000-4000-8000-"+String(n).padStart(12,"0"),label,marker:{x:n/10,y:.4},points:[],firstName:"Owner "+n,lastName:"Example",boatDescription:"Boat "+n,trailerDetails:"Trailer "+n,notes:"Notes",status:"reserved",reviewed:true});
describe("unit naming",()=>{
 it("preserves UUIDs, geometry, details, status and reviews while naming in list order",()=>{
  const input=[space(2,"Old-20"),space(1,"Old-10")];
  const result=unitNaming.rename(input,{template:"North-{n}-A",start:7,padding:3,mode:"sequence"});
  expect(result).toEqual([{...input[0],label:"North-007-A"},{...input[1],label:"North-008-A"}]);
  expect(input[0].label).toBe("Old-20");
 });
 it("keeps existing numeric identity across reordered lists and gaps",()=>{
  const input=[space(2,"S-020"),space(1,"S-003")];
  const output=unitNaming.rename(input,{template:"Bay {n}",start:1,padding:0,mode:"existing"});
  expect(output.map(s=>s.label)).toEqual(["Bay 20","Bay 3"]);
 });
 it("rejects bad templates, duplicates, ambiguous IDs, invalid widths and starts",()=>{
  const entries=[{key:"a",label:"A-1"},{key:"b",label:"B-1"}];
  expect(()=>unitNaming.preview(entries,{...unitNaming.defaults,template:"No number"})).toThrow();
  expect(()=>unitNaming.preview(entries,{...unitNaming.defaults,template:"{n}-{n}"})).toThrow();
  expect(()=>unitNaming.preview(entries,{...unitNaming.defaults,start:1.5})).toThrow();
  expect(()=>unitNaming.preview(entries,{...unitNaming.defaults,padding:13})).toThrow();
  expect(unitNaming.preview(entries,unitNaming.defaults).every(r=>!!r.error)).toBeTrue();
  expect(()=>unitNaming.rename([space(1,"A-1"),space(2,"B-1")],unitNaming.defaults)).toThrow();
  expect(unitNaming.preview([{key:"a",label:"Row2-Unit3"}],unitNaming.defaults)[0].error).toBeTruthy();
  expect(unitNaming.preview([{key:"a",label:"No number"}],unitNaming.defaults)[0].error).toBeTruthy();
 });
 it("handles zero, numbering overflow of width and maximum labels without truncating numbers",()=>{
  expect(unitNaming.preview([{key:"a",label:""}],{template:"{n}",start:0,padding:3,mode:"sequence"})[0].after).toBe("000");
  expect(unitNaming.preview([{key:"a",label:""}],{template:"U-{n}",start:1000,padding:2,mode:"sequence"})[0].after).toBe("U-1000");
  expect(unitNaming.preview([{key:"a",label:"1"}],{...unitNaming.defaults,template:"X".repeat(60)+"{n}"})[0].error).toBeTruthy();
 });
 it("matches a manually prepared upload to renamed locations by label, not row order",()=>{
  const renamed=unitNaming.rename([space(1,"S-001"),space(2,"S-002")],{...unitNaming.defaults,template:"Dock-{n}"});
  const [table]=locationImport.fromJson('[{"Location ID":"Dock-002","Last Name":"Second"},{"Location ID":"Dock-001","Last Name":"First"}]');
  const imported=locationImport.apply(renamed,locationImport.preview(table,locationImport.guess(table.headers),renamed,false));
  expect(imported[0]).toEqual({...renamed[0],lastName:"First"});expect(imported[1]).toEqual({...renamed[1],lastName:"Second"});
 });
});