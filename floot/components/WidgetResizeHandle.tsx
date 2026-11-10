import React,{useRef} from 'react';
import {MoveHorizontal} from 'lucide-react';
import {Button} from './Button';
import {resizedWidgetWidth} from '../helpers/widgetResize';
import s from './WidgetResizeHandle.module.css';

type Drag={pointerId:number;x:number;start:number;current:number;trackWidth:number;max:number};
type Props={title:string;width:number;max:number;disabled:boolean;onPreview:(width:number|null)=>void;onCommit:(width:number)=>Promise<boolean>};

export function WidgetResizeHandle({title,width,max,disabled,onPreview,onCommit}:Props){
 const drag=useRef<Drag|null>(null);
 const cancel=()=>{drag.current=null;onPreview(null);};
 const commit=async(next:number)=>{try{await onCommit(next);}finally{onPreview(null);}};
 const pointerDown=(event:React.PointerEvent<HTMLButtonElement>)=>{
  if(disabled||event.button!==0)return;
  const grid=event.currentTarget.closest('[data-dashboard-grid]');
  if(!grid)return;
  const style=getComputedStyle(grid),count=style.gridTemplateColumns.split(/\s+/).filter(Boolean).length;
  const visibleMax=Math.min(max,count),gap=parseFloat(style.columnGap)||0;
  if(visibleMax<2)return;
  const trackWidth=(grid.getBoundingClientRect().width+gap)/count;
  event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);
  const start=Math.min(width,visibleMax);
  drag.current={pointerId:event.pointerId,x:event.clientX,start,current:start,trackWidth,max:visibleMax};
  onPreview(start);
 };
 const pointerMove=(event:React.PointerEvent<HTMLButtonElement>)=>{
  const state=drag.current;if(!state||state.pointerId!==event.pointerId)return;
  const next=resizedWidgetWidth(state.start,event.clientX-state.x,state.trackWidth,state.max);
  if(next!==state.current){state.current=next;onPreview(next);}
 };
 const pointerUp=(event:React.PointerEvent<HTMLButtonElement>)=>{
  const state=drag.current;if(!state||state.pointerId!==event.pointerId)return;
  drag.current=null;
  event.currentTarget.releasePointerCapture(event.pointerId);
  if(state.current===state.start){onPreview(null);return;}
  void commit(state.current);
 };
 const keyDown=(event:React.KeyboardEvent<HTMLButtonElement>)=>{
  if(event.key==='Escape'&&drag.current){event.preventDefault();cancel();return;}
  const next=event.key==='ArrowLeft'?Math.max(1,width-1):event.key==='ArrowRight'?Math.min(max,width+1):event.key==='Home'?1:event.key==='End'?max:null;
  if(next===null||disabled)return;event.preventDefault();
  if(next!==width){onPreview(next);void commit(next);}
 };
 return <div className={s.row}><span>{width} column{width===1?'':'s'} wide</span><Button variant="ghost" type="button" role="slider" aria-label={'Resize '+title+' widget'} aria-valuemin={1} aria-valuemax={max} aria-valuenow={width} aria-valuetext={width+' columns wide'} title="Drag to resize. Arrow keys change width; Home/End choose minimum/maximum; Escape cancels dragging." disabled={disabled} className={s.handle} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={cancel} onLostPointerCapture={()=>{if(drag.current)cancel();}} onKeyDown={keyDown}><MoveHorizontal size={16}/><span>Resize</span></Button></div>;
}
