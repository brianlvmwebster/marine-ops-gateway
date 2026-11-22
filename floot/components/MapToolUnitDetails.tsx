import React from "react";
import {Check,Trash2} from "lucide-react";
import {Button} from "./MapToolButton";
import {Input} from "./MapToolInput";
import {Textarea} from "./MapToolTextarea";
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from "./MapToolSelect";
import type {Space} from "../endpoints/mapping/maps_GET.schema";
import styles from "./MapToolUnitDetails.module.css";
type Props={space?:Space;disabled?:boolean;className?:string;onChange:(patch:Partial<Space>)=>void;onRemove:()=>void;lastNameRef?:React.Ref<HTMLInputElement>;onReviewSubmit?:()=>void};
export function UnitDetails({space,disabled=false,className,onChange,onRemove,lastNameRef,onReviewSubmit}:Props){
 if(!space)return <p className={styles.hint+" "+(className??"")}>Select a marker to edit its name and details, or use Place markers to add a missed boat.</p>;
 return <div className={styles.root+" "+(className??"")} onKeyDown={e=>{
  if(!onReviewSubmit||e.key!=="Enter"||e.defaultPrevented||e.nativeEvent.isComposing||e.keyCode===229||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||!(e.target instanceof HTMLInputElement))return;
  e.preventDefault();if(!disabled&&!e.repeat)onReviewSubmit();
 }}><span className={styles.badge}>{space.reviewed?"Reviewed":"Needs review"}</span><fieldset disabled={disabled} className={styles.fields} aria-label="Unit fields">
 <label>Unit label<Input value={space.label} maxLength={60} onChange={e=>onChange({label:e.target.value})}/></label>
 <label>Status<Select value={space.status} onValueChange={value=>onChange({status:value as Space["status"]})}><SelectTrigger aria-label="Unit status"><SelectValue/></SelectTrigger><SelectContent>{["available","occupied","reserved"].map(status=><SelectItem key={status} value={status}>{status[0].toUpperCase()+status.slice(1)}</SelectItem>)}</SelectContent></Select></label>
 <div className={styles.names}><label>Last Name<Input ref={lastNameRef} value={space.lastName} maxLength={100} onChange={e=>onChange({lastName:e.target.value})}/></label><label>First Name<Input value={space.firstName} maxLength={100} onChange={e=>onChange({firstName:e.target.value})}/></label></div>
 <label>Boat description<Textarea value={space.boatDescription} maxLength={500} rows={2} placeholder="Make, model, color, length…" onChange={e=>onChange({boatDescription:e.target.value})}/></label>
 <label>Trailer details (if applicable)<Input value={space.trailerDetails} maxLength={500} onChange={e=>onChange({trailerDetails:e.target.value})}/></label>
 <label>Notes<Textarea value={space.notes} maxLength={2000} rows={2} onChange={e=>onChange({notes:e.target.value})}/></label>
 <div className={styles.actions}><Button size="sm" variant="outline" onClick={()=>onChange({reviewed:!space.reviewed})}><Check size={14}/>{space.reviewed?"Reopen review":"Mark reviewed"}</Button><Button size="sm" variant="destructive" onClick={onRemove} aria-label="Remove selected marker"><Trash2 size={14}/> Remove marker</Button></div>
 </fieldset></div>;
}
