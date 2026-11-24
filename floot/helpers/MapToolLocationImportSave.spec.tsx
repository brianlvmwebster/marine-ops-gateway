import {defaultColumns} from "./MapToolMappingColumns";
import React from "react";
import {render,fireEvent,waitFor,cleanup} from "@testing-library/react";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import superjson from "superjson";
import MappingUtility from "../components/MapToolWorkspace";
import type {Space} from "../endpoints/mapping/maps_GET.schema";
const space:Space={id:"10000000-0000-4000-8000-000000000001",label:"S-001",marker:{x:.2,y:.3},points:[],firstName:"",lastName:"",boatDescription:"",trailerDetails:"",notes:"Keep",status:"reserved",reviewed:false};
function file(rows:unknown[]){
 const f=new File([JSON.stringify(rows)],"locations.json",{type:"application/json"});
 Object.defineProperty(f,"text",{value:async()=>JSON.stringify(rows)});return f;
}

describe("location import save flow",()=>{
 const nativeEvents={Event:globalThis.Event,CustomEvent:globalThis.CustomEvent};let resize:typeof ResizeObserver;
 beforeEach(()=>{globalThis.Event=window.Event;globalThis.CustomEvent=window.CustomEvent;resize=globalThis.ResizeObserver;globalThis.ResizeObserver=class implements ResizeObserver{constructor(_callback:ResizeObserverCallback){}observe(){}unobserve(){}disconnect(){}};});
 afterEach(()=>{cleanup();globalThis.ResizeObserver=resize;Object.assign(globalThis,nativeEvents);});
 it("applies to the shared draft and saves through the existing endpoint",async()=>{
  const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
  const map={id:"20000000-0000-4000-8000-000000000001",name:"Test",revision:3,spaces:[space],imageUrl:"/test.png",imageWidth:100,imageHeight:100,sourceKind:"plan"};
  client.setQueryData(["storage-maps"],{maps:[map]});
  const consoleErrors=spyOn(console,"error");
  const requests:any[]=[];
  spyOn(globalThis,"fetch").and.callFake(async(url,init)=>{
   requests.push({url:String(url),body:superjson.parse(String(init?.body))});
   return new Response(superjson.stringify({id:map.id,revision:4}),{status:200});
  });
  try{
   const view=render(<QueryClientProvider client={client}><MappingUtility/></QueryClientProvider>);
   fireEvent.click(view.getByRole("button",{name:"Import locations"}));
   fireEvent.change(view.getByLabelText("Location import file"),{target:{files:[file([{locationId:"S-001",lastName:"Imported",boat:"Blue"}])]}});
   await waitFor(()=>expect(view.getByRole("button",{name:"Apply 1 update"}).hasAttribute("disabled")).toBeFalse());
   expect(requests.length).toBe(0);
   fireEvent.click(view.getByRole("button",{name:"Apply 1 update"}));
   expect(view.getByText("Unsaved changes")).toBeTruthy();
   expect(requests.length).toBe(0);
   await waitFor(()=>expect(view.queryByRole("dialog",{name:"Import location details"})).toBeNull());
   fireEvent.click(view.getByRole("button",{name:"Save map"}));
   await waitFor(()=>expect(view.getByText("All changes saved")).toBeTruthy());
   expect(consoleErrors.calls.allArgs().some(args=>args.some(a=>String(a).includes("same key")))).toBeFalse();
   expect(requests.length).toBe(1);
   expect(requests[0].url).toBe("/_api/mapping/maps");
   expect(requests[0].body).toEqual({action:"save",id:map.id,revision:3,name:"Test",columns:defaultColumns,spaces:[{...space,lastName:"Imported",boatDescription:"Blue"}]});
   expect((client.getQueryData(["storage-maps"]) as any).maps[0].revision).toBe(4);
  }finally{cleanup();client.clear();}
 });

});
