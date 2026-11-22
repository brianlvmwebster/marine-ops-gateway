import React from "react";
import {render,fireEvent,waitFor,cleanup,within} from "@testing-library/react";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import superjson from "superjson";
import MappingUtility from "../components/MapToolWorkspace";
import {UnitNamingEditor} from "../components/MapToolUnitNamingEditor";
import {unitNaming} from "./MapToolUnitNaming";
import type {Space} from "../endpoints/mapping/maps_GET.schema";
const space:Space={id:"10000000-0000-4000-8000-000000000001",label:"S-001",marker:{x:.2,y:.3},points:[],firstName:"Test",lastName:"Owner",boatDescription:"Boat",trailerDetails:"Trailer",notes:"Keep",status:"reserved",reviewed:true};
describe("unit naming UI",()=>{
 const nativeEvents={Event:globalThis.Event,CustomEvent:globalThis.CustomEvent};let resize:typeof ResizeObserver;
 beforeEach(()=>{globalThis.Event=window.Event;globalThis.CustomEvent=window.CustomEvent;resize=globalThis.ResizeObserver;globalThis.ResizeObserver=class implements ResizeObserver{constructor(_callback:ResizeObserverCallback){}observe(){}unobserve(){}disconnect(){}};});
 afterEach(()=>{cleanup();globalThis.ResizeObserver=resize;Object.assign(globalThis,nativeEvents);});
 it("previews sequential names, requires order review, resets confirmation on edits",()=>{
  const apply=jasmine.createSpy("apply");
  const view=render(<UnitNamingEditor entries={[{key:"one",label:"Old"}]} initialOptions={{...unitNaming.defaults,mode:"sequence"}} onApply={apply}/>);
  expect(view.getByText("S-001")).toBeTruthy();
  const button=view.getByRole("button",{name:"Apply unit names"});
  expect(button.hasAttribute("disabled")).toBeTrue();
  fireEvent.click(view.getByLabelText("I reviewed the new unit names"));
  expect(button.hasAttribute("disabled")).toBeFalse();
  fireEvent.change(view.getByLabelText("Starting number"),{target:{value:"7"}});
  expect(view.getByText("S-007")).toBeTruthy();expect(button.hasAttribute("disabled")).toBeTrue();
  fireEvent.click(view.getByLabelText("I reviewed the new unit names"));fireEvent.click(button);
  expect(apply).toHaveBeenCalledOnceWith({...unitNaming.defaults,mode:"sequence",start:7});
 });
 it("cancels without edits, renames only labels and persists through Save map",async()=>{
  const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
  const map={id:"20000000-0000-4000-8000-000000000001",name:"Naming test",revision:3,spaces:[space],imageUrl:"/test.png",imageWidth:100,imageHeight:100,sourceKind:"plan"};
  client.setQueryData(["storage-maps"],{maps:[map]});
  const requests:any[]=[];const errors=spyOn(console,"error");
  spyOn(globalThis,"fetch").and.callFake(async(_url,init)=>{requests.push(superjson.parse(String(init?.body)));return new Response(superjson.stringify({id:map.id,revision:4}),{status:200});});
  try{
   const view=render(<QueryClientProvider client={client}><MappingUtility/></QueryClientProvider>);
   fireEvent.click(view.getByRole("button",{name:"Rename units"}));
   fireEvent.change(view.getByLabelText("Unit name template"),{target:{value:"Discard-{n}"}});
   fireEvent.click(within(view.getByRole("dialog",{name:"Rename mapped units"})).getByRole("button",{name:"Close"}));
   await waitFor(()=>{if(view.queryByRole("dialog",{name:"Rename mapped units"}))throw Error("still open");});
   expect(view.getByText("All changes saved")).toBeTruthy();expect(requests.length).toBe(0);
   fireEvent.click(view.getByRole("button",{name:"Rename units"}));
   expect((view.getByLabelText("Unit name template") as HTMLInputElement).value).toBe("S-{n}");
   fireEvent.change(view.getByLabelText("Unit name template"),{target:{value:"Dock-{n}"}});
   fireEvent.click(view.getByRole("button",{name:"Apply unit names"}));
   await waitFor(()=>{if(view.queryByRole("dialog",{name:"Rename mapped units"}))throw Error("still open");});
   expect(view.getByText("Unsaved changes")).toBeTruthy();expect(requests.length).toBe(0);
   fireEvent.click(view.getByRole("button",{name:"Save map"}));
   await waitFor(()=>expect(view.getByText("All changes saved")).toBeTruthy());
   expect(requests[0]).toEqual({action:"save",id:map.id,revision:3,name:map.name,spaces:[{...space,label:"Dock-001"}]});
   expect(errors.calls.allArgs().some(args=>args.some(a=>String(a).includes("same key")))).toBeFalse();
  }finally{cleanup();client.clear();}
 });
});