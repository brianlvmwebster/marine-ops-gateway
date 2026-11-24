import React,{useState} from "react";
import {Button} from "./MapToolButton";
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from "./MapToolSelect";
import type {Space} from "../endpoints/mapping/maps_GET.schema";
import {Input} from "./MapToolInput";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "./MapToolDialog";
import {columnsSchema,defaultColumns,normalizeFieldValues,type MappingColumn} from "../helpers/MapToolMappingColumns";
import styles from "./MapToolMappingColumns.module.css";

export function MappingColumns({columns,spaces=[],onApply,onClose}:{spaces?:Space[];columns:MappingColumn[];onApply:(columns:MappingColumn[])=>void;onClose:()=>void}){
 const [draft,setDraft]=useState(()=>columns.filter(c=>!c.hidden).map(c=>({...c}))),[hidden,setHidden]=useState<MappingColumn[]>(()=>columns.filter(c=>c.hidden));
 const validation=columnsSchema.safeParse([...draft,...hidden.filter(c=>c.label.trim()).map(c=>({...c,hidden:true}))]);
 let valueError="";if(validation.success)try{normalizeFieldValues(spaces,validation.data);}catch(e){valueError=e instanceof Error?e.message:"Existing values do not match this format.";}
 function update(id:string,patch:Partial<MappingColumn>){setDraft(current=>current.map(c=>c.id===id?{...c,...patch}:c));}
 function move(index:number,offset:number){setDraft(current=>{const next=[...current];[next[index],next[index+offset]]=[next[index+offset],next[index]];return next;});}
 return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent className={styles.dialog}>
  <DialogHeader><DialogTitle>Customize columns</DialogTitle><DialogDescription>Choose the fields for this map’s entries and spreadsheet template. Location ID always identifies the unit. Choose Text, Number or Boolean. Boolean fields have two custom labels and may be left unset.</DialogDescription></DialogHeader>
  <div className={styles.body}><p>Rename, reorder or hide columns. Hidden values stay stored. Apply, then Save map to keep your format.</p>
   {draft.map((column,index)=><div className={styles.column} key={column.id}><div className={styles.row}><Input aria-label={"Column "+(index+1)+" name"} maxLength={60} value={column.label} onChange={e=>setDraft(current=>current.map(c=>c.id===column.id?{...c,label:e.target.value}:c))}/><Select value={column.type??"text"} onValueChange={type=>update(column.id,{type:type as MappingColumn["type"]})}><SelectTrigger className={styles.type} aria-label={"Column "+(index+1)+" type"}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="text">Text</SelectItem><SelectItem value="number">Number</SelectItem><SelectItem value="boolean">Boolean</SelectItem></SelectContent></Select><Button variant="outline" size="sm" aria-label={"Move "+column.label+" up"} disabled={index===0} onClick={()=>move(index,-1)}>↑</Button><Button variant="outline" size="sm" aria-label={"Move "+column.label+" down"} disabled={index===draft.length-1} onClick={()=>move(index,1)}>↓</Button><Button variant="outline" size="sm" onClick={()=>{setHidden(current=>[...current,column]);setDraft(current=>current.filter(c=>c.id!==column.id));}}>Hide</Button></div>{column.type==="boolean"&&<div className={styles.labels}><label>True label<Input aria-label={"Column "+(index+1)+" true label"} maxLength={60} value={column.trueLabel??"Yes"} onChange={e=>update(column.id,{trueLabel:e.target.value})}/></label><label>False label<Input aria-label={"Column "+(index+1)+" false label"} maxLength={60} value={column.falseLabel??"No"} onChange={e=>update(column.id,{falseLabel:e.target.value})}/></label></div>}</div>)}
   <Button variant="outline" disabled={draft.length+hidden.length>=50} onClick={()=>setDraft(current=>[...current,{id:crypto.randomUUID(),label:""}])}>Add column</Button>
   {[...hidden,...defaultColumns.filter(c=>!hidden.some(h=>h.id===c.id))].filter(c=>!draft.some(d=>d.id===c.id)).map(c=><Button key={c.id} variant="ghost" disabled={!hidden.some(h=>h.id===c.id)&&draft.length+hidden.length>=50} onClick={()=>{setDraft(current=>[...current,{...c,hidden:false}]);setHidden(current=>current.filter(h=>h.id!==c.id));}}>Restore {c.label||"unnamed column"}</Button>)}
   {!validation.success&&<p role="alert">{validation.error.issues[0].message}</p>}
   {valueError&&<p role="alert">{valueError} Correct the existing value or keep its current type.</p>}
  </div><div className={styles.footer}><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!validation.success||!!valueError} onClick={()=>{if(validation.success&&!valueError)onApply(validation.data);}}>Apply columns</Button></div>
 </DialogContent></Dialog>;
}
