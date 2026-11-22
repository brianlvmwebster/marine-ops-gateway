import React from "react";
import {render,fireEvent,waitFor,cleanup} from "@testing-library/react";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import superjson from "superjson";
import {LayoutManager} from "../components/MapToolLayoutManager";
import MappingUtility from "../components/MapToolWorkspace";
import type {OutputType} from "../endpoints/mapping/maps_GET.schema";
const id="20000000-0000-4000-8000-000000000001";
const data:OutputType={organizationRevision:3,sections:[],maps:[{id,name:"Test",revision:2,spaces:[],imageUrl:"/test.png",imageWidth:100,imageHeight:100,sourceKind:"plan"}]};
describe("layout management controls",()=>{
 const nativeEvents={Event:globalThis.Event,CustomEvent:globalThis.CustomEvent};let resize:typeof ResizeObserver;
 beforeEach(()=>{globalThis.Event=window.Event;globalThis.CustomEvent=window.CustomEvent;resize=globalThis.ResizeObserver;globalThis.ResizeObserver=class implements ResizeObserver{constructor(_callback:ResizeObserverCallback){}observe(){}unobserve(){}disconnect(){}};});
 afterEach(()=>{cleanup();globalThis.ResizeObserver=resize;Object.assign(globalThis,nativeEvents);});
 it("saves folder and archive metadata without marker or image fields",async()=>{
  const requests:any[]=[];const saved=jasmine.createSpy("saved");
  spyOn(globalThis,"fetch").and.callFake(async(url,init)=>{if(init?.body)requests.push(superjson.parse(String(init.body)));return new Response(superjson.stringify(init?.body?{revision:4}:data));});
  const v=render(<LayoutManager open data={data} onClose={()=>{}} onSaved={saved} onNewMap={()=>{}}/>);
  fireEvent.change(v.getByLabelText("Map name Test"),{target:{value:"North map"}});
  fireEvent.click(v.getByRole("button",{name:"Archive"}));
  fireEvent.change(v.getByLabelText("New section name"),{target:{value:"North yard"}});
  fireEvent.click(v.getByRole("button",{name:"Add section"}));
  fireEvent.click(v.getByRole("button",{name:"Save organization"}));
  await waitFor(()=>{if(v.queryByRole("alert"))throw new Error(v.getByRole("alert").textContent??"error");if(!saved.calls.count())throw new Error("Waiting for save");});
  expect(requests.length).toBe(1);expect(requests[0].revision).toBe(3);
  expect(requests[0].sections[0].name).toBe("North yard");
  expect(requests[0].maps[0]).toEqual({id,revision:2,name:"North map",archived:true,sectionId:null,sortOrder:0});
 });
 it("keeps maps available after adding a section and saves renaming and a move",async()=>{
  const requests:any[]=[];const saved=jasmine.createSpy("saved");
  spyOn(globalThis,"fetch").and.callFake(async(url,init)=>{if(init?.body)requests.push(superjson.parse(String(init.body)));return new Response(superjson.stringify(init?.body?{revision:4}:data));});
  const v=render(<LayoutManager open data={data} onClose={()=>{}} onSaved={saved} onNewMap={()=>{}}/>);
  fireEvent.change(v.getByLabelText("New section name"),{target:{value:"North yard"}});
  fireEvent.click(v.getByRole("button",{name:"Add section"}));
  expect(v.getByLabelText("Map name Test")).toBeTruthy();
  fireEvent.change(v.getByLabelText("Section name 1"),{target:{value:"South yard"}});
  fireEvent.keyDown(v.getByLabelText("Section for Test"),{key:"Enter"});
  fireEvent.click(await v.findByRole("option",{name:"South yard"}));
  fireEvent.click(v.getByRole("button",{name:"Save organization"}));
  await waitFor(()=>{if(v.queryByRole("alert"))throw new Error(v.getByRole("alert").textContent??"error");if(!saved.calls.count())throw new Error("Waiting for save");});
  expect(requests[0].sections[0].name).toBe("South yard");
  expect(requests[0].maps[0].sectionId).toBe(requests[0].sections[0].id);
  expect(requests[0].maps[0].id).toBe(id);
 });
 it("protects dirty unit edits when starting another map",async()=>{
  const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
  client.setQueryData(["storage-maps"],{...data,maps:[{...data.maps[0],spaces:[{id:"10000000-0000-4000-8000-000000000001",label:"U-1",points:[],marker:{x:.5,y:.5},lastName:"Original",firstName:"",boatDescription:"",trailerDetails:"",notes:"",status:"occupied",reviewed:false}]}]});
  const network=spyOn(globalThis,"fetch").and.resolveTo(new Response(superjson.stringify({id,revision:3})));
  try{
   const v=render(<QueryClientProvider client={client}><MappingUtility/></QueryClientProvider>);
   fireEvent.click(v.getByRole("button",{name:"Unit list"}));
   fireEvent.change(v.getByLabelText("Last Name for U-1"),{target:{value:"Edited"}});
   fireEvent.click(v.getByRole("button",{name:"New map"}));
   expect(v.getByRole("dialog",{name:"Save changes before continuing?"})).toBeTruthy();
   fireEvent.click(v.getByRole("button",{name:"Cancel"}));
   expect((v.getByLabelText("Last Name for U-1") as HTMLInputElement).value).toBe("Edited");
   expect(network).not.toHaveBeenCalled();
   fireEvent.click(v.getByRole("button",{name:"New map"}));
   fireEvent.click(v.getByRole("button",{name:"Save and continue"}));
   await waitFor(()=>{if(!v.queryByLabelText("New map section"))throw new Error("Waiting for new map");});
   const cached=client.getQueryData<OutputType>(["storage-maps"])!;
   expect(cached.maps[0].spaces[0].lastName).toBe("Edited");expect(cached.organizationRevision).toBe(3);
  }finally{cleanup();client.clear();}
 });
 it("opens explicit new-map and folder management controls",async()=>{
  const client=new QueryClient({defaultOptions:{queries:{retry:false}}});client.setQueryData(["storage-maps"],data);
  try{
   const v=render(<QueryClientProvider client={client}><MappingUtility/></QueryClientProvider>);
   fireEvent.click(v.getByRole("button",{name:"New map"}));
   expect(v.getByLabelText("New map section")).toBeTruthy();
   fireEvent.click(v.getByRole("button",{name:"Cancel new map"}));
   fireEvent.click(v.getByRole("button",{name:"New section"}));
   expect(v.getByRole("dialog",{name:"Layout manager"})).toBeTruthy();
   expect(v.getByLabelText("New section name")).toBeTruthy();
  }finally{cleanup();client.clear();}
 });
});

