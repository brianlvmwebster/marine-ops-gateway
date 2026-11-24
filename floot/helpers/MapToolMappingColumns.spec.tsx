import {columnsSchema,defaultColumns,templateRows,fieldValue} from "./MapToolMappingColumns";
import {locationImport} from "./MapToolLocationImport";
import {schema} from "../endpoints/mapping/maps_POST.schema";
import type {Space} from "../endpoints/mapping/maps_GET.schema";
import * as XLSX from "xlsx";

const id="10000000-0000-4000-8000-000000000002";
const space:Space={id:"10000000-0000-4000-8000-000000000001",label:"001",points:[],marker:{x:.2,y:.3},firstName:"",lastName:"York",boatDescription:"",trailerDetails:"",notes:"Keep",status:"reserved",reviewed:true};
const columns=[{id,label:"Registration"},...defaultColumns];
describe("custom mapping columns",()=>{
 it("round trips an Excel template through preview, apply and save validation",async()=>{
  const rows=templateRows([space],columns);rows[1][1]="NY-001";
  const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(rows),"Locations");
  const bytes=XLSX.write(book,{type:"array",bookType:"xlsx"});
  const file=new File([bytes],"filled.xlsx");Object.defineProperty(file,"arrayBuffer",{value:async()=>bytes});
  const [table]=await locationImport.parseFile(file);
  expect(table.rows[0][0]).toBe("001");
  const preview=locationImport.preview(table,locationImport.guess(table.headers,columns),[space],false,columns);
  expect(preview[0].status).toBe("Update");
  const [updated]=locationImport.apply([space],preview);
  expect(updated).toEqual({...space,customFields:{[id]:"NY-001"}});
  const saved=schema.parse({action:"save",id:space.id,revision:0,name:"Map",columns,spaces:[updated]});
  expect(saved.action==="save"&&saved.columns).toEqual(columns);
  expect(saved.action==="save"&&saved.spaces[0].customFields).toEqual({[id]:"NY-001"});
 });
 it("keeps values through renaming and hiding; exports only visible columns",()=>{
  const updated={...space,customFields:{[id]:"NY-001"}};
  expect(fieldValue(updated,id)).toBe("NY-001");
  expect(templateRows([updated],[{id,label:"Renamed",hidden:true},defaultColumns[0]])).toEqual([["Location ID","Last Name"],["001",""]]);
 });
 it("preserves blanks and fill-only values and rejects oversized values",()=>{
  const existing={...space,customFields:{[id]:"Keep"}};
  const table={name:"Data",headers:["Location ID","Registration"],rows:[["001","Replace"]],firstRow:2};
  const mapping=locationImport.guess(table.headers,columns);
  expect(locationImport.preview(table,mapping,[existing],true,columns)[0].status).toBe("Unchanged");
  table.rows[0][1]="";
  expect(locationImport.preview(table,mapping,[existing],false,columns)[0].status).toBe("Unchanged");
  table.rows[0][1]="x".repeat(2001);
  expect(locationImport.preview(table,mapping,[existing],false,columns)[0].status).toBe("Invalid");
 });
 it("rejects duplicate or reserved names and ambiguous spreadsheet headers",()=>{
  expect(columnsSchema.safeParse([{id,label:"Location ID"}]).success).toBe(false);
  expect(columnsSchema.safeParse([...defaultColumns,{id,label:"Last-Name"}]).success).toBe(false);
  expect(locationImport.guess(["Location ID","Registration","Registration"],columns)[id]).toBe(-1);
 });
});
