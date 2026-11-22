import {useState} from "react";
import type {CSSProperties} from "react";
const storageKey="lvm.mapHighlightColors.v1";
const defaultColor="#ffca3a";
const valid=(value:unknown):value is string=>typeof value==="string"&&/^#[0-9a-f]{6}$/i.test(value);
function read():Record<string,string>{
 try{
  const value=JSON.parse(localStorage.getItem(storageKey)??"{}");
  if(!value||typeof value!=="object"||Array.isArray(value))return {};
  return Object.fromEntries(Object.entries(value).filter((entry):entry is [string,string]=>/^[a-f0-9-]{36}$/i.test(entry[0])&&valid(entry[1])));
 }catch{return {};}
}
export function useMapHighlight(mapId?:string){
 const [colors,setColors]=useState<Record<string,string>>(read);
 const color=mapId?colors[mapId]??defaultColor:defaultColor;
 function setColor(value:string){
  if(!mapId||!valid(value))return;
  const next={...colors,[mapId]:value.toLowerCase()};
  setColors(next);
  try{localStorage.setItem(storageKey,JSON.stringify({...read(),[mapId]:value.toLowerCase()}));}catch{}
 }
 const style={"--linked-highlight":color,"--linked-highlight-tint":color+"26","--linked-highlight-selected":color+"3d"} as CSSProperties;
 return {color,setColor,style,reset:()=>setColor(defaultColor)};
}