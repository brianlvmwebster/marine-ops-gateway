import {locationImport} from "./MapToolLocationImport";
import type {Space} from "../endpoints/mapping/maps_GET.schema";
import * as XLSX from "xlsx";
const space:Space={id:"10000000-0000-4000-8000-000000000001",label:"001",marker:{x:.2,y:.3},points:[],firstName:"Old",lastName:"Owner",boatDescription:"",trailerDetails:"Keep trailer",notes:"Keep notes",status:"reserved",reviewed:true};
const headers=["Location ID","Last Name","First Name","Boat","Trailer"];
const table=(rows:unknown[][])=>({name:"test",headers,rows,firstRow:2});
const preview=(rows:unknown[][],fill=false)=>locationImport.preview(table(rows),locationImport.guess(headers),[space],fill);
describe("location import matching",()=>{
 it("preserves IDs, markers, review, notes, status and blanks",()=>{
  const results=preview([[" 001 ","Smith","","New boat",""]]);
  const [updated]=locationImport.apply([space],results);
  expect(updated).toEqual({...space,lastName:"Smith",boatDescription:"New boat"});
  expect(space.lastName).toBe("Owner");
 });
 it("does not collapse leading zeros or invent markers",()=>{
  expect(preview([["1","Smith"]])[0].status).toBe("Unmatched");
  expect(locationImport.apply([space],preview([["missing","Smith"]]))).toEqual([space]);
 });
 it("skips all duplicate IDs, invalid and missing IDs",()=>{
  expect(preview([["001","A"],[" 001 ","B"]]).map(r=>r.status)).toEqual(["Duplicate","Duplicate"]);
  expect(preview([["","A"]])[0].status).toBe("Invalid");
  expect(preview([["001","x".repeat(101)]])[0].status).toBe("Invalid");
 });
 it("fills empty fields without overwriting",()=>{
  expect(preview([["001","New","New first","Boat","Trailer"]],true)[0].after).toEqual({...space,boatDescription:"Boat"});
 });
 it("matches labels case-insensitively and skips ambiguous map labels",()=>{
  const t=table([[" s-001 ","Smith"]]),columns=locationImport.guess(headers);
  expect(locationImport.preview(t,columns,[{...space,label:"S-001"}],false)[0].status).toBe("Update");
  expect(locationImport.preview(t,columns,[{...space,label:"S-001"},{...space,label:"s-001"}],false)[0].status).toBe("Duplicate");
 });
 it("recognizes aliases and validates mapping",()=>{
  expect(locationImport.guess(["location_id","lastName","first_name","boatDescription","trailerDetails"])).toEqual({locationId:0,lastName:1,firstName:2,boatDescription:3,trailerDetails:4});
  expect(()=>locationImport.preview(table([]),{...locationImport.guess(headers),lastName:0},[space],false)).toThrow();
 });
 it("parses JSON and rejects malformed, nested and oversized records",()=>{
  const [t]=locationImport.fromJson(JSON.stringify([{locationId:"001",lastName:"Smith"}]));
  expect(locationImport.preview(t,locationImport.guess(t.headers),[space],false)[0].status).toBe("Update");
  expect(()=>locationImport.fromJson("bad")).toThrow();
  const [nested]=locationImport.fromJson('[{"Location ID":"001","Last Name":{"name":"bad"}}]');
  expect(locationImport.preview(nested,locationImport.guess(nested.headers),[space],false)[0].status).toBe("Invalid");
  expect(()=>locationImport.fromJson(JSON.stringify(Array(5001).fill({id:"1"})))).toThrow();
 });
});
describe("location file formats",()=>{
 const file=(name:string,data:string|ArrayBuffer)=>({name,size:typeof data==="string"?data.length:data.byteLength,text:async()=>data as string,arrayBuffer:async()=>data as ArrayBuffer}) as File;
 it("reads quoted CSV, BOM, commas, newlines and leading zeros",async()=>{
  const [t]=await locationImport.parseFile(file("list.csv",'\uFEFFLocation ID,Last Name,First Name,Boat,Trailer\r\n001,"Smith, Jr.",Jane,"Boat\nBlue",\r\n'));
  const result=locationImport.preview(t,locationImport.guess(t.headers),[space],false)[0];
  expect(result.locationId).toBe("001");expect(result.after?.lastName).toBe("Smith, Jr.");expect(result.after?.boatDescription).toBe("Boat\nBlue");
 });
 for(const bookType of ["biff8","xlsx"] as const)it("reads "+bookType+" and multiple worksheets",async()=>{
  const workbook=XLSX.utils.book_new();
  const sheet=XLSX.utils.aoa_to_sheet([headers,["001","Smith","Jane","Boat",""]]);
  XLSX.utils.book_append_sheet(workbook,sheet,"Locations");
  XLSX.utils.book_append_sheet(workbook,XLSX.utils.aoa_to_sheet([headers,["002","Other"]]),"Other");
  const data=XLSX.write(workbook,{type:"array",bookType});
  const tables=await locationImport.parseFile(file(bookType==="biff8"?"list.xls":"list.xlsx",data));
  expect(tables.length).toBe(2);
  expect(locationImport.preview(tables[0],locationImport.guess(tables[0].headers),[space],false)[0].after?.lastName).toBe("Smith");
 });
 it("rejects unsupported and oversized files",async()=>{
  await expectAsync(locationImport.parseFile(file("list.txt","text"))).toBeRejected();
  await expectAsync(locationImport.parseFile({...file("list.csv",""),size:6000000})).toBeRejected();
 });
});
