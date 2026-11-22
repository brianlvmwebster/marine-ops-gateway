import React from "react";
import {render,fireEvent,waitFor,cleanup,within} from "@testing-library/react";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import MappingUtility from "../components/MapToolWorkspace";
import {useMapHighlight} from "./MapToolUseMapHighlight";
import type {Space} from "../endpoints/mapping/maps_GET.schema";
const id="10000000-0000-4000-8000-000000000001",otherId="20000000-0000-4000-8000-000000000002";
const space:Space={id:"30000000-0000-4000-8000-000000000003",label:"S-001",marker:{x:.2,y:.3},points:[],firstName:"Test",lastName:"Owner",boatDescription:"Boat",trailerDetails:"",notes:"",status:"occupied",reviewed:true};
const storageKey="lvm.mapHighlightColors.v1";
function Harness({mapId=id}:{mapId?:string}){const h=useMapHighlight(mapId);return <><output>{h.color}</output><button onClick={()=>h.setColor("#ff00ff")}>Color</button><button onClick={()=>h.setColor("bad")}>Invalid</button></>;}
describe("linked highlight color",()=>{
 const nativeEvents={Event:globalThis.Event,CustomEvent:globalThis.CustomEvent};let resize:typeof ResizeObserver;
 beforeEach(()=>{localStorage.removeItem(storageKey);globalThis.Event=window.Event;globalThis.CustomEvent=window.CustomEvent;resize=globalThis.ResizeObserver;globalThis.ResizeObserver=class implements ResizeObserver{constructor(_callback:ResizeObserverCallback){}observe(){}unobserve(){}disconnect(){}};});
 afterEach(()=>{cleanup();localStorage.removeItem(storageKey);globalThis.ResizeObserver=resize;Object.assign(globalThis,nativeEvents);});
 it("ignores malformed saved values and invalid colors",()=>{
  localStorage.setItem(storageKey,JSON.stringify({[id]:"red;display:none"}));
  const view=render(<Harness/>);expect(view.getByText("#ffca3a")).toBeTruthy();
  fireEvent.click(view.getByText("Invalid"));expect(view.getByText("#ffca3a")).toBeTruthy();
  fireEvent.click(view.getByText("Color"));expect(view.getByText("#ff00ff")).toBeTruthy();
 });
 it("shares the color with the full image, keeps linked hover, isolates maps and remembers reloads without edits",async()=>{
  const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
  const map={id,name:"Map one",revision:3,spaces:[space],imageUrl:"/test.png",imageWidth:100,imageHeight:100,sourceKind:"plan"};
  client.setQueryData(["storage-maps"],{maps:[map,{...map,id:otherId,name:"Map two"}]});
  const fetchSpy=spyOn(globalThis,"fetch").and.rejectWith(new Error("No API writes expected"));
  try{
   let view=render(<QueryClientProvider client={client}><MappingUtility/></QueryClientProvider>);
   fireEvent.change(view.getByLabelText("Linked highlight color"),{target:{value:"#ff00ff"}});
   expect((view.container.querySelector("main") as HTMLElement).style.getPropertyValue("--linked-highlight")).toBe("#ff00ff");
   expect(view.getByText("All changes saved")).toBeTruthy();
   fireEvent.click(view.getByRole("button",{name:"Unit list"}));
   const row=view.container.querySelector('tr[data-unit-id="'+space.id+'"]')!;
   fireEvent.pointerEnter(row);
   const marker=view.container.querySelector('button[data-unit-id="'+space.id+'"]')!;
   expect(marker.getAttribute("data-highlighted")).toBe("true");
   fireEvent.pointerLeave(row);fireEvent.pointerEnter(marker);
   expect(row.getAttribute("data-highlighted")).toBe("true");
   fireEvent.click(view.getByRole("button",{name:"Full image"}));
   const dialog=view.getByRole("dialog"),ui=within(dialog);
   expect((ui.getByLabelText("Linked highlight color") as HTMLInputElement).value).toBe("#ff00ff");
   expect(dialog.style.getPropertyValue("--linked-highlight")).toBe("#ff00ff");
   fireEvent.change(ui.getByLabelText("Linked highlight color"),{target:{value:"#00ffff"}});
   expect(dialog.style.getPropertyValue("--linked-highlight")).toBe("#00ffff");
   fireEvent.click(ui.getByRole("button",{name:"Close"}));
   await waitFor(()=>{if(view.queryByRole("dialog"))throw Error("dialog still open");});
   expect((view.getByLabelText("Linked highlight color") as HTMLInputElement).value).toBe("#00ffff");
   fireEvent.click(view.getByRole("button",{name:"Map two"}));
   expect((view.getByLabelText("Linked highlight color") as HTMLInputElement).value).toBe("#ffca3a");
   fireEvent.change(view.getByLabelText("Linked highlight color"),{target:{value:"#ff0000"}});
   fireEvent.click(view.getByRole("button",{name:"Map one"}));
   expect((view.getByLabelText("Linked highlight color") as HTMLInputElement).value).toBe("#00ffff");
   cleanup();
   view=render(<QueryClientProvider client={client}><MappingUtility/></QueryClientProvider>);
   expect((view.getByLabelText("Linked highlight color") as HTMLInputElement).value).toBe("#00ffff");
   fireEvent.click(view.getByLabelText("Reset highlight color"));
   expect((view.getByLabelText("Linked highlight color") as HTMLInputElement).value).toBe("#ffca3a");
   expect(fetchSpy).not.toHaveBeenCalled();
  }finally{cleanup();client.clear();}
 });
});