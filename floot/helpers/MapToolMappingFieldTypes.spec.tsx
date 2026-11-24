import React from "react";
import {render,fireEvent,cleanup} from "@testing-library/react";
import {MappingColumns} from "../components/MapToolMappingColumns";
import {MappingFieldInput} from "../components/MapToolMappingFieldInput";
import {columnsSchema,parseFieldValue,normalizeFieldValues,displayFieldValue,templateGuide,type MappingColumn} from "./MapToolMappingColumns";
import {locationImport} from "./MapToolLocationImport";
import {schema} from "../endpoints/mapping/maps_POST.schema";
import type {Space} from "../endpoints/mapping/maps_GET.schema";
import * as XLSX from "xlsx";

const numberId="10000000-0000-4000-8000-000000000002",booleanId="10000000-0000-4000-8000-000000000003";
const numberColumn:MappingColumn={id:numberId,label:"Length",type:"number"};
const booleanColumn:MappingColumn={id:booleanId,label:"Payment",type:"boolean",trueLabel:"Paid",falseLabel:"Unpaid"};
const columns=[numberColumn,booleanColumn];
const space:Space={id:"10000000-0000-4000-8000-000000000001",label:"001",points:[],marker:{x:.2,y:.3},firstName:"",lastName:"",boatDescription:"",trailerDetails:"",notes:"Keep",status:"reserved",reviewed:true};
describe("mapping field types",()=>{
 const nativeEvents={Event:globalThis.Event,CustomEvent:globalThis.CustomEvent};
 beforeEach(()=>{globalThis.Event=window.Event;globalThis.CustomEvent=window.CustomEvent;});
 afterEach(()=>{cleanup();Object.assign(globalThis,nativeEvents);});
 it("validates numbers, distinct Boolean labels and backward-compatible text columns",()=>{
  expect(parseFieldValue(numberColumn,"-12.50")).toBe("-12.5");
  expect(parseFieldValue(numberColumn,0)).toBe("0");
  for(const value of [true,"12ft","NaN","Infinity","1,200","9007199254740993"])expect(()=>parseFieldValue(numberColumn,value)).toThrow();
  expect(parseFieldValue(booleanColumn,false)).toBe("false");
  expect(parseFieldValue(booleanColumn," PAID ")).toBe("true");
  expect(parseFieldValue(booleanColumn,"")).toBe("");
  expect(columnsSchema.safeParse([{...booleanColumn,falseLabel:"paid"}]).success).toBe(false);
  expect(columnsSchema.safeParse([{...booleanColumn,trueLabel:"false"}]).success).toBe(false);
  expect(parseFieldValue({id:numberId,label:"Legacy"},"001")).toBe("001");
 });
 it("imports zero and false, preserves blanks and respects fill-only",()=>{
  const table=locationImport.fromJson(JSON.stringify([{"Location ID":"001",Length:0,Payment:false}]))[0];
  const mapping=locationImport.guess(table.headers,columns);
  const review=locationImport.preview(table,mapping,[space],false,columns);
  expect(review[0].status).toBe("Update");
  const updated=locationImport.apply([space],review)[0];
  expect(updated.customFields).toEqual({[numberId]:"0",[booleanId]:"false"});
  expect(displayFieldValue(updated,booleanColumn)).toBe("Unpaid");
  const fill={...table,rows:[["001",25,"Paid"]]};
  expect(locationImport.preview(fill,mapping,[updated],true,columns)[0].status).toBe("Unchanged");
  const blank={...table,rows:[["001","",""]]};
  expect(locationImport.preview(blank,mapping,[updated],false,columns)[0].status).toBe("Unchanged");
  const invalid={...table,rows:[["001","twelve","maybe"]]};
  expect(locationImport.preview(invalid,mapping,[updated],false,columns)[0].status).toBe("Invalid");
 });
 it("uses numeric Excel values despite display formatting and preserves text IDs",async()=>{
  const sheet=XLSX.utils.aoa_to_sheet([["Location ID","Length","Payment"],["001",1200,false]]);
  sheet.B2.z="#,##0.00";
  const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,"Locations");
  const bytes=XLSX.write(book,{type:"array",bookType:"xlsx"});
  const file=new File([bytes],"filled.xlsx");Object.defineProperty(file,"arrayBuffer",{value:async()=>bytes});
  const [table]=await locationImport.parseFile(file);
  const result=locationImport.preview(table,locationImport.guess(table.headers,columns),[space],false,columns)[0];
  expect(result.locationId).toBe("001");expect(result.after?.customFields).toEqual({[numberId]:"1200",[booleanId]:"false"});
  expect(templateGuide(columns)[3][2]).toContain("Paid / Unpaid");
 });
 it("validates existing data before type changes and keeps truth stable when labels change",()=>{
  const original={...space,customFields:{[numberId]:"twelve",[booleanId]:"true"}};
  expect(()=>normalizeFieldValues([original],columns)).toThrow();
  expect(original.customFields[numberId]).toBe("twelve");
  const renamed={...booleanColumn,trueLabel:"Complete",falseLabel:"Pending"};
  expect(displayFieldValue(original,renamed)).toBe("Complete");
  const saved=schema.parse({action:"save",id:space.id,revision:0,name:"Map",columns,spaces:[space]});
  expect(saved.action==="save"&&saved.columns?.[1].trueLabel).toBe("Paid");
  const editor=render(<MappingColumns columns={columns} spaces={[original]} onClose={()=>{}} onApply={()=>{}}/>);
  expect((editor.getByRole("button",{name:"Apply columns"}) as HTMLButtonElement).disabled).toBe(true);
  expect(editor.getByRole("alert").textContent).toContain("001");
 });
 it("shows type selectors and custom Boolean label controls",()=>{
  let saved:MappingColumn[]=[];
  const editor=render(<MappingColumns columns={columns} onClose={()=>{}} onApply={c=>{saved=c;}}/>);
  expect(editor.getByLabelText("Column 1 type").textContent).toContain("Number");
  expect(editor.getByLabelText("Column 2 type").textContent).toContain("Boolean");
  fireEvent.change(editor.getByLabelText("Column 2 true label"),{target:{value:"Complete"}});
  fireEvent.click(editor.getByRole("button",{name:"Apply columns"}));
  expect(saved[1].trueLabel).toBe("Complete");
 });
 it("renders false with its custom label and flags invalid numeric entry",()=>{
  const view=render(<MappingFieldInput column={booleanColumn} label="Payment" value="false" onChange={()=>{}}/>);
  expect(view.getByLabelText("Payment").textContent).toContain("Unpaid");
  view.rerender(<MappingFieldInput column={numberColumn} label="Length" value="oops" onChange={()=>{}}/>);
  expect(view.getByLabelText("Length").getAttribute("aria-invalid")).toBe("true");
  expect(view.getByRole("alert").textContent).toContain("valid number");
 });
});
