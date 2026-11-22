import React from "react";
import {render,fireEvent,waitFor,cleanup} from "@testing-library/react";
import {LocationImport} from "../components/MapToolLocationImport";
import type {Space} from "../endpoints/mapping/maps_GET.schema";
const space:Space={id:"10000000-0000-4000-8000-000000000001",label:"S-001",marker:{x:.2,y:.3},points:[],firstName:"",lastName:"",boatDescription:"",trailerDetails:"",notes:"Keep",status:"reserved",reviewed:false};
function file(rows:unknown[]){
 const f=new File([JSON.stringify(rows)],"locations.json",{type:"application/json"});
 Object.defineProperty(f,"text",{value:async()=>JSON.stringify(rows)});return f;
}
describe("location import dialog",()=>{
 const nativeEvents={Event:globalThis.Event,CustomEvent:globalThis.CustomEvent};let resize:typeof ResizeObserver;
 beforeEach(()=>{globalThis.Event=window.Event;globalThis.CustomEvent=window.CustomEvent;resize=globalThis.ResizeObserver;globalThis.ResizeObserver=class implements ResizeObserver{constructor(_callback:ResizeObserverCallback){}observe(){}unobserve(){}disconnect(){}};});
 afterEach(()=>{cleanup();globalThis.ResizeObserver=resize;Object.assign(globalThis,nativeEvents);});
 it("previews changes before applying and preserves mapped properties",async()=>{
  const apply=jasmine.createSpy("apply"),close=jasmine.createSpy("close");
  const view=render(<LocationImport spaces={[space]} mapName="Test map" onApply={apply} onClose={close}/>);
  fireEvent.change(view.getByLabelText("Location import file"),{target:{files:[file([{locationId:"S-001",lastName:"Smith",boat:"Blue boat"},{locationId:"missing",lastName:"Other"}])]}});
  await waitFor(()=>expect(view.getByRole("button",{name:"Apply 1 update"}).hasAttribute("disabled")).toBeFalse());
  expect(apply).not.toHaveBeenCalled();expect(view.getByText("1 skipped")).toBeTruthy();
  fireEvent.click(view.getByRole("button",{name:"Apply 1 update"}));
  expect(apply).toHaveBeenCalledOnceWith([{...space,lastName:"Smith",boatDescription:"Blue boat"}]);
 });
 it("cancels without applying and invalid files cannot apply old results",async()=>{
  const apply=jasmine.createSpy("apply"),close=jasmine.createSpy("close");
  const view=render(<LocationImport spaces={[space]} mapName="Test" onApply={apply} onClose={close}/>);
  const input=view.getByLabelText("Location import file");
  fireEvent.change(input,{target:{files:[file([{locationId:"S-001",lastName:"Smith"}])]}});
  await waitFor(()=>expect(view.getByRole("button",{name:"Apply 1 update"}).hasAttribute("disabled")).toBeFalse());
  fireEvent.change(input,{target:{files:[new File(["bad"],"bad.txt")]}});
  await waitFor(()=>expect(view.getByRole("alert").textContent).toContain("Choose an XLS"));
  expect(view.getByRole("button",{name:"Apply 0 updates"}).hasAttribute("disabled")).toBeTrue();
  fireEvent.click(view.getByRole("button",{name:"Cancel"}));
  expect(close).toHaveBeenCalled();expect(apply).not.toHaveBeenCalled();
 });
 it("skips duplicate IDs rather than applying a last-row winner",async()=>{
  const apply=jasmine.createSpy("apply");
  const view=render(<LocationImport spaces={[space]} mapName="Test" onApply={apply} onClose={()=>{}}/>);
  fireEvent.change(view.getByLabelText("Location import file"),{target:{files:[file([{locationId:"S-001",lastName:"First"},{locationId:"s-001",lastName:"Second"}])]}});
  await waitFor(()=>expect(view.getByText("2 skipped")).toBeTruthy());
  expect(view.getByRole("button",{name:"Apply 0 updates"}).hasAttribute("disabled")).toBeTrue();expect(apply).not.toHaveBeenCalled();
 });
});