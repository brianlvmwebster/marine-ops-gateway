import React from "react";
import {render,fireEvent,cleanup} from "@testing-library/react";
import {MappingColumns} from "../components/MapToolMappingColumns";
import {UnitDetails} from "../components/MapToolUnitDetails";
import {defaultColumns,type MappingColumn} from "./MapToolMappingColumns";
import type {Space} from "../endpoints/mapping/maps_GET.schema";

describe("mapping column editor",()=>{
 const nativeEvents={Event:globalThis.Event,CustomEvent:globalThis.CustomEvent};
 beforeEach(()=>{globalThis.Event=window.Event;globalThis.CustomEvent=window.CustomEvent;});
 afterEach(()=>{cleanup();Object.assign(globalThis,nativeEvents);});
 it("adds and renames a field, restores it after reopening, and edits its existing value",()=>{
  let columns:MappingColumn[]=[];
  const editor=render(<MappingColumns columns={defaultColumns} onClose={()=>{}} onApply={value=>{columns=value;}}/>);
  fireEvent.click(editor.getByRole("button",{name:"Add column"}));
  fireEvent.change(editor.getByLabelText("Column 5 name"),{target:{value:"Registration"}});
  fireEvent.click(editor.getByRole("button",{name:"Apply columns"}));
  const id=columns[4].id;
  fireEvent.change(editor.getByLabelText("Column 5 name"),{target:{value:"Permit"}});
  fireEvent.click(editor.getAllByRole("button",{name:"Hide"})[4]);
  fireEvent.click(editor.getByRole("button",{name:"Apply columns"}));
  expect(columns[4]).toEqual({id,label:"Permit",hidden:true});
  editor.unmount();
  const reopened=render(<MappingColumns columns={columns} onClose={()=>{}} onApply={value=>{columns=value;}}/>);
  fireEvent.click(reopened.getByRole("button",{name:"Restore Permit"}));
  fireEvent.click(reopened.getByRole("button",{name:"Apply columns"}));
  expect(columns[4]).toEqual({id,label:"Permit",hidden:false});
  reopened.unmount();
  const space:Space={id:"10000000-0000-4000-8000-000000000001",label:"001",points:[],marker:{x:.2,y:.3},firstName:"",lastName:"",boatDescription:"",trailerDetails:"",notes:"",status:"available",reviewed:false,customFields:{[id]:"Original"}};
  let patch:Partial<Space>={};
  const details=render(<UnitDetails columns={columns} space={space} onRemove={()=>{}} onChange={value=>{patch=value;}}/>);
  expect((details.getByLabelText("Permit") as HTMLInputElement).value).toBe("Original");
  fireEvent.change(details.getByLabelText("Permit"),{target:{value:"Renewed"}});
  expect(patch.customFields).toEqual({[id]:"Renewed"});
 });
});
