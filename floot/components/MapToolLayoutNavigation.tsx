import React from "react";
import {Button} from "./MapToolButton";
import type {StorageMap,LayoutSection} from "../endpoints/mapping/maps_GET.schema";
import styles from "./MapToolLayoutNavigation.module.css";
export function LayoutNavigation({maps,sections,selectedId,disabled,onSelect,onNewMap}:{maps:StorageMap[];sections:LayoutSection[];selectedId?:string;disabled:boolean;onSelect:(id:string)=>void;onNewMap:(sectionId:string|null)=>void}){
 const groups=[{id:"",name:"Ungrouped"},...sections];
 return <div className={styles.groups}>{groups.map(group=>{
 const children=maps.filter(m=>(m.sectionId??"")===group.id);
 if(!group.id&&!children.length&&sections.length)return null;
 return <section key={group.id||"ungrouped"}><div className={styles.heading}><span>{group.name}</span><Button size="icon-sm" variant="ghost" disabled={disabled} aria-label={"New map in "+group.name} onClick={()=>onNewMap(group.id||null)}>+</Button></div>{children.map(m=><Button key={m.id} variant="ghost" disabled={disabled} className={styles.map+(selectedId===m.id?" "+styles.active:"")} onClick={()=>onSelect(m.id)}>{m.name}</Button>)}{!children.length&&<p>No maps yet</p>}</section>;
 })}</div>;
}