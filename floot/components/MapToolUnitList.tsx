import {MappingFieldInput} from "./MapToolMappingFieldInput";
import {defaultColumns,fieldValue,fieldPatch,displayFieldValue,type MappingColumn} from "../helpers/MapToolMappingColumns";
import React,{useEffect,useRef,useState} from "react";
import {X,GripHorizontal,Search,RotateCcw,ChevronDown,ChevronUp} from "lucide-react";
import {Button} from "./MapToolButton";
import {Input} from "./MapToolInput";
import type {Space} from "../endpoints/mapping/maps_GET.schema";
import styles from "./MapToolUnitList.module.css";
export type UnitFields=Pick<Space,"lastName"|"firstName"|"boatDescription"|"trailerDetails"|"customFields">;
type Props={columns?:MappingColumn[];onRename?:()=>void;open:boolean;spaces:Space[];selectedId?:string|null;hoveredId?:string|null;disabled?:boolean;onSelect:(id:string)=>void;onUpdate:(id:string,patch:Partial<UnitFields>)=>void;onHover:(id:string|null)=>void;onClose:()=>void};
export function UnitList({columns=defaultColumns,onRename,open,spaces,selectedId,hoveredId,disabled,onSelect,onUpdate,onHover,onClose}:Props){
 const [minimized,setMinimized]=useState(false),[editingId,setEditingId]=useState<string|null>(null);
 useEffect(()=>{if(open)setMinimized(false);},[open]);
 const [query,setQuery]=useState(""),[position,setPosition]=useState<{left:number;top:number}|null>(null);
 const panel=useRef<HTMLElement|null>(null),scroll=useRef<HTMLDivElement|null>(null),rows=useRef(new Map<string,HTMLTableRowElement>());
 const drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);
 useEffect(()=>{
  if(!open||!hoveredId||!scroll.current)return;
  const row=rows.current.get(hoveredId);if(!row)return;
  const r=row.getBoundingClientRect(),box=scroll.current.getBoundingClientRect();
  if(r.top<box.top+30)scroll.current.scrollTop+=r.top-box.top-30;
  else if(r.bottom>box.bottom)scroll.current.scrollTop+=r.bottom-box.bottom;
 },[hoveredId,open]);
 useEffect(()=>{
  const clamp=()=>setPosition(p=>p&&panel.current?{left:Math.max(0,Math.min(p.left,window.innerWidth-panel.current.offsetWidth)),top:Math.max(0,Math.min(p.top,window.innerHeight-panel.current.offsetHeight))}:p);
  window.addEventListener("resize",clamp);return()=>window.removeEventListener("resize",clamp);
 },[]);
 function selectUnit(id:string){onSelect(id);if(window.innerWidth<=700)setMinimized(true);}
 if(!open)return null;
 const term=query.trim().toLowerCase(),filtered=spaces.filter(s=>s.id===editingId||[s.label,s.lastName,s.firstName,s.boatDescription,s.trailerDetails,...columns.map(c=>displayFieldValue(s,c))].join(" ").toLowerCase().includes(term));
 return <section ref={panel} className={styles.panel+" "+(minimized?styles.minimized:"")} aria-label="Unit list" style={position?{left:position.left,top:position.top,right:"auto",bottom:"auto"}:undefined}>
 <header className={styles.header}><div className={styles.drag} title="Drag to move the unit list" onPointerDown={e=>{if(e.button!==0||!panel.current)return;const box=panel.current.getBoundingClientRect();drag.current={x:e.clientX,y:e.clientY,left:box.left,top:box.top};e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();}} onPointerMove={e=>{if(!drag.current||!panel.current)return;const p=drag.current;setPosition({left:Math.max(0,Math.min(window.innerWidth-panel.current.offsetWidth,p.left+e.clientX-p.x)),top:Math.max(0,Math.min(window.innerHeight-panel.current.offsetHeight,p.top+e.clientY-p.y))});}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}><GripHorizontal size={15}/><h2>Units</h2><span>{filtered.length} / {spaces.length}</span></div><Button size="icon-sm" variant="ghost" aria-label={minimized?"Expand unit list":"Minimize unit list"} onClick={()=>setMinimized(v=>!v)}>{minimized?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</Button><Button size="icon-sm" variant="ghost" aria-label="Reset unit list position" onClick={()=>setPosition(null)}><RotateCcw size={13}/></Button><Button size="icon-sm" variant="ghost" aria-label="Close unit list" onClick={()=>{onHover(null);onClose();}}><X size={15}/></Button></header>
 <div className={styles.search} hidden={minimized}><Search size={14}/><Input aria-label="Search unit list" placeholder="Find a name, boat, trailer or unit…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
 <div className={styles.scroll} hidden={minimized} ref={scroll}><table><thead><tr><th scope="col">Unit</th>{columns.filter(c=>!c.hidden).map(c=><th scope="col" key={c.id}>{c.label}</th>)}</tr></thead><tbody>{filtered.map(s=><tr key={s.id} ref={node=>{if(node)rows.current.set(s.id,node);else rows.current.delete(s.id);}} data-unit-id={s.id} data-highlighted={s.id===hoveredId} aria-selected={s.id===selectedId} className={(s.id===selectedId?styles.selected:"")+" "+(s.id===hoveredId?styles.highlighted:"")} onPointerEnter={()=>onHover(s.id)} onPointerLeave={()=>onHover(null)} onFocus={()=>onHover(s.id)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null)){onHover(null);setEditingId(id=>id===s.id?null:id);}}}><td><Button size="sm" variant="ghost" className={styles.unit} disabled={disabled} aria-label={"Edit unit "+s.label} onClick={e=>{e.stopPropagation();selectUnit(s.id);}}><i className={s.reviewed?styles.reviewed:styles.pending} aria-label={s.reviewed?"Reviewed":"Needs review"}/>{s.label}</Button></td>{columns.filter(c=>!c.hidden).map(column=><td key={column.id} className={styles.editCell}><MappingFieldInput column={column} label={column.label+" for "+s.label} value={fieldValue(s,column.id)} disabled={disabled} onFocus={()=>setEditingId(s.id)} onChange={value=>onUpdate(s.id,fieldPatch(s,column.id,value))}/></td>)}</tr>)}</tbody></table>{!filtered.length&&<p className={styles.emptyState}>{spaces.length?"No units match your search.":"Detect boats or place markers to build your unit list."}</p>}</div>
 <footer className={styles.footer} hidden={minimized}>{onRename&&<Button size="sm" variant="outline" disabled={disabled||!spaces.length} onClick={onRename}>Rename units</Button>} Edit cells · Tab between fields · Save map to keep changes · Unit label opens details</footer>
 </section>;
}
