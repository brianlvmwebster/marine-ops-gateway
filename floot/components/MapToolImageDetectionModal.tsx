import React,{useEffect,useMemo,useRef,useState} from "react";
import {ChevronLeft,ChevronRight,Maximize,ZoomIn,ZoomOut,Crop,Sparkles,Check,MapPin,Save,Undo2,List,SlidersHorizontal} from "lucide-react";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "./MapToolDialog";
import {Button} from "./MapToolButton";
import {Input} from "./MapToolInput";
import {MapHighlightPicker} from "./MapToolMapHighlightPicker";
import {UnitList,type UnitFields} from "./MapToolUnitList";
import {UnitDetails} from "./MapToolUnitDetails";
import {Tabs,TabsList,TabsTrigger,TabsContent} from "./MapToolTabs";
import {SpaceMarkers} from "./MapToolSpaceMarkers";
import {Progress} from "./MapToolProgress";
import {spacePresentation} from "../helpers/MapToolSpacePresentation";
import type {StorageMap,Space} from "../endpoints/mapping/maps_GET.schema";
import type {DetectionArea} from "../endpoints/mapping/analyze_POST.schema";
import styles from "./MapToolImageDetectionModal.module.css";
type Props={
 highlightColor?:string;onHighlightColorChange?:(value:string)=>void;
 onRenameUnits?:()=>void;
 className?:string;open:boolean;onOpenChange:(open:boolean)=>void;map:StorageMap;
 pending:boolean;canDetect:boolean;coolingDown:boolean;analysis:{spaces:Space[];message:string}|null;
 merge:{added:number;skipped:number;limited:number};
 selectedId:string|null;candidates:Space[];dirty:boolean;saving:boolean;canUndoRemove:boolean;
 onChange:(patch:Partial<Space>)=>void;onUpdateUnit:(id:string,patch:Partial<UnitFields>)=>void;onAdd:(point:{x:number;y:number})=>void;onMove:(id:string,point:{x:number;y:number})=>void;onRemove:()=>void;onUndoRemove:()=>void;onSave:()=>void;onReviewAndSave:()=>Promise<boolean>;
 onSelect:(id:string)=>void;onDetect:(region?:DetectionArea)=>void;onAccept:()=>void;onDismiss:()=>void;
};
export function ImageDetectionModal({highlightColor="#ffca3a",onHighlightColorChange,onRenameUnits,className,open,onOpenChange,map,pending,canDetect,coolingDown,analysis,merge,onDetect,onAccept,onDismiss,onSelect,selectedId,candidates,dirty,saving,onChange,onUpdateUnit,onAdd,onMove,onRemove,onUndoRemove,canUndoRemove,onSave,onReviewAndSave}:Props){
 const [viewport,setViewport]=useState<HTMLDivElement|null>(null);
 const [size,setSize]=useState({width:1,height:1}),[zoom,setZoom]=useState(1);
 const [boundaries,setBoundaries]=useState(false);
 const [controlsCollapsed,setControlsCollapsed]=useState(true);
 const [unitListOpen,setUnitListOpen]=useState(false),[hoveredId,setHoveredId]=useState<string|null>(null),[toolsOpen,setToolsOpen]=useState(false);
 const [panel,setPanel]=useState("unit"),[placing,setPlacing]=useState(false);
 const locked=pending||saving;
 const active=map.spaces.find(s=>s.id===selectedId);
 const displayed=useMemo(()=>[...map.spaces,...candidates],[map.spaces,candidates]);
 const [reviewHistory,setReviewHistory]=useState<{mapId:string;ids:string[];cursor:number}>({mapId:map.id,ids:[],cursor:-1});
 useEffect(()=>{
  setReviewHistory(old=>{
   const sameMap=old.mapId===map.id,ids=sameMap?old.ids:[],cursor=sameMap?old.cursor:-1;
   if(!selectedId)return sameMap?old:{mapId:map.id,ids,cursor};
   if(ids[cursor]===selectedId)return old;
   const branch=[...ids.slice(0,cursor+1),selectedId];
   return {mapId:map.id,ids:branch,cursor:branch.length-1};
  });
 },[map.id,selectedId]);
 const availableIds=new Set(displayed.map(s=>s.id));
 function historyIndex(direction:-1|1){
  if(reviewHistory.mapId!==map.id)return -1;
  for(let i=reviewHistory.cursor+direction;i>=0&&i<reviewHistory.ids.length;i+=direction){
   if(availableIds.has(reviewHistory.ids[i])&&reviewHistory.ids[i]!==selectedId)return i;
  }
  return -1;
 }
 const previousIndex=historyIndex(-1),nextIndex=historyIndex(1);
 const unreviewedCount=displayed.filter(s=>!s.reviewed).length;
 const frame=useRef<HTMLDivElement|null>(null);
 const [reveal,setReveal]=useState<{point:{x:number;y:number};mapId:string}|null>(null);
 const lastNameInput=useRef<HTMLInputElement|null>(null);
 const [focusRequest,setFocusRequest]=useState<{id:string;mapId:string}|null>(null);
 useEffect(()=>{
  if(open&&!locked&&panel==="unit"&&!controlsCollapsed&&focusRequest?.mapId===map.id&&focusRequest.id===active?.id)lastNameInput.current?.focus();
 },[open,locked,panel,controlsCollapsed,focusRequest,map.id,active?.id]);
 const previewIds=useMemo(()=>new Set(candidates.map(s=>s.id)),[candidates]);
 const [region,setRegion]=useState<DetectionArea|undefined>(),[selecting,setSelecting]=useState(false),[overlays,setOverlays]=useState(true);
 const start=useRef<{x:number;y:number}|null>(null),svg=useRef<SVGSVGElement|null>(null);
 useEffect(()=>{if(!viewport)return;const measure=()=>setSize({width:viewport.clientWidth,height:viewport.clientHeight});measure();const observer=new ResizeObserver(measure);observer.observe(viewport);return()=>observer.disconnect();},[viewport]);
 useEffect(()=>{setRegion(undefined);setZoom(1);setSelecting(false);setPlacing(false);},[map.id]);
 useEffect(()=>{if(!open)setPlacing(false);},[open]);
 const fit=Math.max(.005,Math.min((size.width-32)/map.imageWidth,(size.height-32)/map.imageHeight,1)),scale=fit*zoom;
 useEffect(()=>{
  if(!open||!viewport||!reveal||reveal.mapId!==map.id)return;
  const handle=requestAnimationFrame(()=>{
   if(!frame.current)return;
   const point=reveal.point,image=frame.current.getBoundingClientRect(),view=viewport.getBoundingClientRect();
   viewport.scrollTo({left:viewport.scrollLeft+image.left-view.left-viewport.clientLeft+point.x*image.width-viewport.clientWidth/2,top:viewport.scrollTop+image.top-view.top-viewport.clientTop+point.y*image.height-viewport.clientHeight/2,behavior:"instant"});
  });
  return()=>cancelAnimationFrame(handle);
 },[open,viewport,reveal,map.id,scale,size.width,size.height]);
 const tiny=!!region&&(region.width*map.imageWidth<32||region.height*map.imageHeight<32);
 function position(event:{clientX:number;clientY:number}){
  const box=svg.current!.getBoundingClientRect();
  return {x:Math.max(0,Math.min(1,(event.clientX-box.left)/box.width)),y:Math.max(0,Math.min(1,(event.clientY-box.top)/box.height))};
 }
 function updateArea(key:keyof DetectionArea,value:string){
  const n=Number(value)/100;if(!Number.isFinite(n))return;
  setRegion(old=>{const r={...(old??{x:.25,y:.25,width:.5,height:.5})};r[key]=Math.max(key==="width"||key==="height"?.001:0,Math.min(key==="x"||key==="y"?.999:1,n));
   r.width=Math.min(r.width,1-r.x);r.height=Math.min(r.height,1-r.y);return r;
  });
 }
 function selectMarker(id:string){setReveal(null);onSelect(id);setPanel("unit");setControlsCollapsed(false);}
 function revealMarker(space:Space){
  setPlacing(false);setSelecting(false);setOverlays(true);selectMarker(space.id);
  setReveal({point:spacePresentation.anchor(space),mapId:map.id});setFocusRequest({id:space.id,mapId:map.id});
 }
 function navigateHistory(index:number){
  if(locked||index<0)return;
  const boat=displayed.find(s=>s.id===reviewHistory.ids[index]);
  if(!boat)return;
  setReviewHistory(old=>({...old,cursor:index}));
  revealMarker(boat);
 }
 function nextUnreviewed(excludeId?:string){
  const current=displayed.findIndex(s=>s.id===selectedId);
  for(let step=1;step<=displayed.length;step++){
   const next=displayed[(current+step)%displayed.length];
   if(!next.reviewed&&next.id!==excludeId){revealMarker(next);return;}
  }
 }
 const reviewClickInFlight=useRef(false);
 async function markReviewedAndNext(){
  if(!active||locked||reviewClickInFlight.current)return;
  reviewClickInFlight.current=true;
  try{if(await onReviewAndSave())nextUnreviewed(active.id);}
  finally{reviewClickInFlight.current=false;}
 }
 function historyShortcut(e:React.KeyboardEvent){
  if(!open||!e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.nativeEvent.isComposing||e.keyCode===229||(e.key!=="ArrowLeft"&&e.key!=="ArrowRight"))return;
  e.preventDefault();e.stopPropagation();
  if(locked||e.repeat)return;
  navigateHistory(e.key==="ArrowLeft"?previousIndex:nextIndex);
 }
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent style={{"--linked-highlight":highlightColor,"--linked-highlight-tint":highlightColor+"26","--linked-highlight-selected":highlightColor+"3d"} as React.CSSProperties} onKeyDownCapture={historyShortcut} className={styles.modal+" "+(className??"")}>
 <DialogHeader className={styles.header}><DialogTitle>{map.name} · Full image</DialogTitle><DialogDescription className={styles.srOnly}>Select a marker to edit its name, drag to reposition, or place missed boats without leaving the image.</DialogDescription></DialogHeader>
 <div className={styles.toolbar}>
 {onHighlightColorChange&&<MapHighlightPicker value={highlightColor} onChange={onHighlightColorChange}/>}
  <Button size="sm" variant="outline" disabled={locked||previousIndex<0} onClick={()=>navigateHistory(previousIndex)} title="Previous boat (Alt + Left Arrow)" aria-keyshortcuts="Alt+ArrowLeft"><ChevronLeft size={14}/> Previous boat <kbd aria-hidden="true" className={styles.shortcut}>Alt+←</kbd></Button>
  <Button size="sm" variant="outline" disabled={locked||nextIndex<0} onClick={()=>navigateHistory(nextIndex)} title="Next boat (Alt + Right Arrow)" aria-keyshortcuts="Alt+ArrowRight"><ChevronRight size={14}/> Next boat <kbd aria-hidden="true" className={styles.shortcut}>Alt+→</kbd></Button>
  <Button size="sm" disabled={locked||unreviewedCount===0} onClick={()=>nextUnreviewed()}><ChevronRight size={14}/> Next unreviewed boat</Button>
  <Button size="sm" variant={unitListOpen?"secondary":"outline"} aria-pressed={unitListOpen} onClick={()=>setUnitListOpen(v=>!v)}><List size={14}/> Unit list</Button>
  <Button size="sm" variant="outline" onClick={()=>{setPanel("detect");setControlsCollapsed(false);}}><Sparkles size={14}/> Detect</Button>
  <Button size="sm" variant={placing?"secondary":"outline"} aria-pressed={placing} disabled={locked||map.spaces.length>=500} onClick={()=>{setPlacing(v=>!v);setSelecting(false);setOverlays(true);setPanel("unit");}}><MapPin size={14}/>{placing?"Done placing":"Place markers"}</Button>
  {canUndoRemove&&<Button size="sm" variant="outline" disabled={locked} onClick={onUndoRemove}><Undo2 size={14}/> Undo removal</Button>}
  <Button size="sm" variant={toolsOpen?"secondary":"outline"} aria-expanded={toolsOpen} onClick={()=>setToolsOpen(v=>!v)}><SlidersHorizontal size={14}/> Image tools</Button>
  <div className={styles.imageTools} hidden={!toolsOpen}>
  <Button size="sm" variant="outline" onClick={()=>setZoom(1)}><Maximize size={14}/> Fit image</Button>
  <Button size="sm" variant="outline" onClick={()=>setZoom(1/fit)}>Original pixels</Button>
  <Button size="icon-sm" variant="ghost" aria-label="Zoom out full image" disabled={zoom<=1} onClick={()=>setZoom(z=>Math.max(1,z/1.4))}><ZoomOut size={16}/></Button>
  <span>{Math.round(scale*100)}%</span>
  <Button size="icon-sm" variant="ghost" aria-label="Zoom in full image" disabled={zoom>=Math.max(8,2/fit)} onClick={()=>setZoom(z=>Math.min(Math.max(8,2/fit),z*1.4))}><ZoomIn size={16}/></Button>
  <Button size="sm" variant={selecting?"secondary":"outline"} disabled={locked} onClick={()=>{setSelecting(v=>!v);setPlacing(false);setPanel("detect");setControlsCollapsed(false);}}><Crop size={14}/> Select area</Button>
  <Button size="sm" variant="ghost" disabled={pending} onClick={()=>{setRegion({x:.25,y:.25,width:.5,height:.5});setSelecting(false);setPlacing(false);setPanel("detect");setControlsCollapsed(false);}}>Center area</Button>
  {region&&<Button size="sm" variant="ghost" disabled={pending} onClick={()=>{setRegion(undefined);setSelecting(false);}}>Clear area</Button>}
  <Button size="sm" variant={overlays?"secondary":"ghost"} onClick={()=>setOverlays(v=>!v)} aria-pressed={overlays}>Markers</Button><Button size="sm" variant={boundaries?"secondary":"ghost"} onClick={()=>setBoundaries(v=>!v)} aria-pressed={boundaries}>Boundaries</Button></div>
 <div className={styles.saveGroup}><span role="status">{saving?"Saving…":dirty?"Unsaved changes":"All changes saved"}</span><Button size="sm" disabled={!dirty||locked} onClick={onSave}><Save size={14}/>{saving?"Saving…":"Save map"}</Button></div>
 </div>
 {pending&&controlsCollapsed&&<div className={styles.collapsedProgress} role="status">Detecting spaces…<Progress value={null} aria-label="Detecting spaces"/></div>}
 {placing&&<div className={styles.reviewHint} role="status">Click a missed boat to place a marker. Choose Done placing to select or drag markers.</div>}
 <div className={styles.workspace+" "+(controlsCollapsed?styles.controlsClosed:"")}>
 <div className={styles.viewport} ref={setViewport}><div className={styles.canvasOuter}><div ref={frame} className={styles.imageFrame} style={{width:map.imageWidth*scale,height:map.imageHeight*scale}}>
 <img src={map.imageUrl} crossOrigin="anonymous" alt={map.name+" at original upload resolution"} draggable={false}/>
 <svg ref={svg} viewBox={"0 0 "+map.imageWidth+" "+map.imageHeight} className={selecting||placing?styles.selectCanvas:styles.canvas} onClick={e=>{if(placing&&!locked){onAdd(position(e));setPanel("unit");setControlsCollapsed(false);}}} aria-label="Full image detection area" onPointerDown={e=>{if(!selecting||locked)return;e.preventDefault();start.current=position(e);e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(!start.current)return;const p=position(e),a=start.current;setRegion({x:Math.min(a.x,p.x),y:Math.min(a.y,p.y),width:Math.abs(a.x-p.x),height:Math.abs(a.y-p.y)});}} onPointerUp={e=>{if(!start.current)return;const p=position(e),a=start.current;start.current=null;const r={x:Math.min(a.x,p.x),y:Math.min(a.y,p.y),width:Math.abs(a.x-p.x),height:Math.abs(a.y-p.y)};setRegion(r.width>0&&r.height>0?r:undefined);setSelecting(false);}} onPointerCancel={()=>{start.current=null;setSelecting(false);}}>
 {boundaries&&map.spaces.filter(s=>!s.marker).map(s=><polygon key={s.id} points={s.points.map(p=>p.x*map.imageWidth+","+p.y*map.imageHeight).join(" ")} className={styles.existing}><title>{s.label}</title></polygon>)}
 {boundaries&&analysis?.spaces.filter(s=>!s.marker).map(s=><polygon key={s.id} points={s.points.map(p=>p.x*map.imageWidth+","+p.y*map.imageHeight).join(" ")} className={styles.suggestion}><title>{s.label+" · suggestion"}</title></polygon>)}
 {region&&<rect x={region.x*map.imageWidth} y={region.y*map.imageHeight} width={region.width*map.imageWidth} height={region.height*map.imageHeight} className={styles.selection}/>}
 </svg>{overlays&&<SpaceMarkers spaces={displayed} selectedId={selectedId} previewIds={previewIds} hoveredId={hoveredId} onHover={setHoveredId} disabled={selecting||placing||locked} onSelect={selectMarker} onDragStart={onSelect} onMove={onMove}/>}</div></div></div>
 <aside className={styles.controls+" "+(controlsCollapsed?styles.controlsCollapsed:"")} aria-label="Detection controls"><div className={styles.controlsHeader}>{!controlsCollapsed&&<h3>{panel==="unit"?"Unit Details":"Detection controls"}</h3>}<Button variant="ghost" size="icon-sm" aria-label={controlsCollapsed?"Expand detection sidebar":"Collapse detection sidebar"} title={controlsCollapsed?"Expand detection controls":"Collapse detection controls"} aria-expanded={!controlsCollapsed} aria-controls="image-detection-controls" onClick={()=>setControlsCollapsed(v=>!v)}>{controlsCollapsed?<ChevronLeft size={17}/>:<ChevronRight size={17}/>}</Button></div><div id="image-detection-controls" className={styles.controlsBody} hidden={controlsCollapsed}><Tabs value={panel} onValueChange={setPanel} className={styles.tabRoot}><TabsList className={styles.tabList}><TabsTrigger value="unit">Edit unit</TabsTrigger><TabsTrigger value="detect">Detect</TabsTrigger></TabsList><TabsContent value="unit" className={styles.tabContent}><p className={styles.reviewCount} role="status">{unreviewedCount>0?unreviewedCount+" boats to review":displayed.length>0?"All boats reviewed":"No boats to review"}{candidates.length>0?" · "+candidates.length+" suggestions":""}</p><UnitDetails space={active} disabled={locked} onChange={onChange} onRemove={onRemove} lastNameRef={lastNameInput} onReviewSubmit={markReviewedAndNext}/><Button size="sm" disabled={locked||!active} onClick={markReviewedAndNext}><Check size={14}/>{saving?"Saving…":"Mark reviewed and next"}</Button><p className={styles.reviewCount}>Enter in a single-line field saves, marks reviewed, and moves to the next boat.</p>{candidates.length>0&&<Button size="sm" variant="outline" disabled={locked} onClick={()=>{onAccept();setPanel("unit");}}>Review suggestions</Button>}</TabsContent><TabsContent value="detect" className={styles.tabContent}>
 {region&&<div className={styles.areaFields}>{(["x","y","width","height"] as const).map((key,i)=><label key={key}>{["Left %","Top %","Width %","Height %"][i]}<Input type="number" aria-label={"Detection area "+["left","top","width","height"][i]+" percent"} min={key==="width"||key==="height"?.1:0} max={100} step={.1} disabled={pending} value={Math.round(region[key]*1000)/10} onChange={e=>updateArea(key,e.target.value)}/></label>)}<span>{Math.round(region.width*map.imageWidth)} × {Math.round(region.height*map.imageHeight)} pixels</span></div>}
 {pending&&<div className={styles.progress}><div role="status">Detecting spaces from {region?"the selected area":"the full image"}… Checking individual boats and duplicate markers; this can take a few minutes. Keep this page open.</div><Progress value={null} aria-label="Detecting spaces in full image viewer"/></div>}
 {analysis&&<div className={styles.results}><div><strong>{merge.added} new suggestions</strong>{merge.skipped>0&&<span> · {merge.skipped} overlaps skipped</span>}{merge.limited>0&&<span> · {merge.limited} exceed the 500-space limit</span>}<p>{analysis.message}</p></div><Button size="sm" disabled={!merge.added||locked} onClick={()=>{onAccept();setPanel("unit");}}><Check size={14}/> Review suggestions</Button><Button size="sm" variant="ghost" onClick={onDismiss}>Dismiss</Button></div>}
 <div className={styles.footer}><div><strong>{map.imageWidth} × {map.imageHeight} original pixels</strong><span>{selecting?"Drag a rectangle on the image, or use Center area and the percentage fields.":region?"Only the selected area will be analyzed. Suggestions return to the full map.":"The full uploaded image will be analyzed in high detail."}</span>{coolingDown&&!pending&&<span>Wait one minute between detection runs.</span>}{map.spaces.length>=500&&<span>This map has reached the 500-space limit.</span>}{tiny&&<span className={styles.error}>Select an area at least 32 × 32 pixels.</span>}<span>Select a suggestion to start an editable review of the batch. Save map keeps your corrections.</span></div><Button disabled={!canDetect||locked||tiny} onClick={()=>{setPlacing(false);setPanel("detect");onDetect(region);}}><Sparkles size={16}/>{pending?"Detecting spaces…":region?"Detect selected area":"Detect full image"}</Button></div>
</TabsContent></Tabs></div></aside></div>
 <UnitList onRename={candidates.length?undefined:onRenameUnits} key={map.id} open={unitListOpen} spaces={displayed} onUpdate={onUpdateUnit} selectedId={selectedId} hoveredId={hoveredId} onHover={setHoveredId} disabled={locked} onClose={()=>setUnitListOpen(false)} onSelect={id=>{const unit=displayed.find(s=>s.id===id);if(unit)revealMarker(unit);}}/>
 </DialogContent></Dialog>;
}
