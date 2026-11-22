import React,{useRef} from "react";
import {Button} from "./MapToolButton";
import {spacePresentation} from "../helpers/MapToolSpacePresentation";
import type {Space} from "../endpoints/mapping/maps_GET.schema";
import styles from "./MapToolSpaceMarkers.module.css";
type Point={x:number;y:number};
type Props={spaces:Space[];className?:string;selectedId?:string|null;disabled?:boolean;preview?:boolean;previewIds?:ReadonlySet<string>;hoveredId?:string|null;onHover?:(id:string|null)=>void;onDragStart?:(id:string)=>void;onSelect?:(id:string)=>void;onMove?:(id:string,point:Point)=>void};
export function SpaceMarkers({spaces,className,selectedId,disabled=false,preview=false,previewIds,hoveredId,onHover,onDragStart,onSelect,onMove}:Props){
 const node=useRef<HTMLDivElement|null>(null);
 const drag=useRef<string|null>(null);
 function position(e:{clientX:number;clientY:number}):Point{const r=node.current!.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};}
 return <div ref={node} className={styles.layer+" "+(className??"")} aria-label={preview?"Detection preview markers":"Storage location markers"}>{spaces.map(s=>{
  const point=spacePresentation.anchor(s),label=spacePresentation.label(s);
  return <Button key={s.id} variant="ghost" size="sm" className={styles.pin+" "+(s.reviewed?styles.named:"")+" "+(s.id===selectedId?styles.selected:"")+" "+(s.id===hoveredId?styles.highlighted:"")+" "+(preview||previewIds?.has(s.id)?styles.preview:"")} style={{left:point.x*100+"%",top:point.y*100+"%"}} disabled={disabled||!onSelect} tabIndex={onSelect?0:-1} data-unit-id={s.id} data-highlighted={s.id===hoveredId} aria-pressed={s.id===selectedId} onPointerEnter={()=>onHover?.(s.id)} onPointerLeave={()=>onHover?.(null)} onFocus={()=>onHover?.(s.id)} onBlur={()=>onHover?.(null)} aria-label={"Location "+s.label+": "+label+(s.reviewed?", reviewed":", needs review")} onClick={e=>{e.stopPropagation();onSelect?.(s.id);}} onPointerDown={e=>{if(!onMove||disabled)return;e.preventDefault();e.stopPropagation();drag.current=s.id;(onDragStart??onSelect)?.(s.id);e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(drag.current===s.id&&onMove)onMove(s.id,position(e));}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onKeyDown={e=>{if(!onMove||disabled)return;const step=e.shiftKey?.01:.002,dx=e.key==="ArrowRight"?step:e.key==="ArrowLeft"?-step:0,dy=e.key==="ArrowDown"?step:e.key==="ArrowUp"?-step:0;if(dx||dy){e.preventDefault();onMove(s.id,{x:Math.max(0,Math.min(1,point.x+dx)),y:Math.max(0,Math.min(1,point.y+dy))});}}}/>;
 })}</div>;
}
