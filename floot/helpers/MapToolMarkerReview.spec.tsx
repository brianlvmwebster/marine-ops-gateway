import React from "react";
import {render,fireEvent,cleanup} from "@testing-library/react";
import {SpaceMarkers} from "../components/MapToolSpaceMarkers";
import type {Space} from "../endpoints/mapping/maps_GET.schema";
const unit:Space={id:"a543732b-173e-46fc-abaf-bafcb6e038ca",label:"S-001",points:[],marker:{x:.5,y:.5},firstName:"Jo",lastName:"Example",boatDescription:"Boat",trailerDetails:"",notes:"",status:"occupied",reviewed:true};
describe("marker pointer review",()=>{
 let resize:typeof ResizeObserver,pointer:PropertyDescriptor|undefined,capture:PropertyDescriptor|undefined;
 beforeEach(()=>{
  resize=globalThis.ResizeObserver;
  globalThis.ResizeObserver=class implements ResizeObserver{constructor(_callback:ResizeObserverCallback){}observe(){}unobserve(){}disconnect(){}};
  pointer=Object.getOwnPropertyDescriptor(window,"PointerEvent");
  Object.defineProperty(window,"PointerEvent",{configurable:true,value:MouseEvent});
  capture=Object.getOwnPropertyDescriptor(HTMLElement.prototype,"setPointerCapture");
  Object.defineProperty(HTMLElement.prototype,"setPointerCapture",{configurable:true,value:()=>{}});
 });
 afterEach(()=>{
  cleanup();globalThis.ResizeObserver=resize;
  if(pointer)Object.defineProperty(window,"PointerEvent",pointer);else Reflect.deleteProperty(window,"PointerEvent");
  if(capture)Object.defineProperty(HTMLElement.prototype,"setPointerCapture",capture);else Reflect.deleteProperty(HTMLElement.prototype,"setPointerCapture");
 });
 it("forwards drag coordinates and stops moving after release without requiring a modal close",()=>{
  const move=jasmine.createSpy("move"),start=jasmine.createSpy("drag start"),select=jasmine.createSpy("select");
  const rendered=render(<SpaceMarkers spaces={[unit]} onMove={move} onDragStart={start} onSelect={select}/>);
  const layer=rendered.getByLabelText("Storage location markers"),button=rendered.getByRole("button");
  spyOn(layer,"getBoundingClientRect").and.returnValue({x:0,y:0,left:0,top:0,right:100,bottom:100,width:100,height:100,toJSON:()=>({})});
  fireEvent.pointerDown(button,{clientX:50,clientY:50,button:0});
  fireEvent.pointerMove(button,{clientX:60,clientY:70,buttons:1});
  fireEvent.pointerUp(button,{clientX:60,clientY:70});
  fireEvent.pointerMove(button,{clientX:90,clientY:90});
  expect(start).toHaveBeenCalledWith(unit.id);expect(move).toHaveBeenCalledTimes(1);expect(move).toHaveBeenCalledWith(unit.id,{x:.6,y:.7});
  expect(select).not.toHaveBeenCalled();
 });
});
