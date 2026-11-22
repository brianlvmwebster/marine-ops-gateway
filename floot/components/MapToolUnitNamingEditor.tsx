import React,{useMemo,useState} from "react";
import {Input} from "./MapToolInput";
import {Button} from "./MapToolButton";
import {Checkbox} from "./MapToolCheckbox";
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from "./MapToolSelect";
import {unitNaming} from "../helpers/MapToolUnitNaming";
import styles from "./MapToolUnitNamingEditor.module.css";
type Options=typeof unitNaming.defaults;
type Entry=Parameters<typeof unitNaming.preview>[0][number];
export function UnitNamingEditor({entries,initialOptions=unitNaming.defaults,onApply,applyLabel="Apply unit names"}:{entries:Entry[];initialOptions?:Options;onApply:(options:Options)=>void;applyLabel?:string}){
 const [options,setOptions]=useState<Options>(()=>({...initialOptions})),[confirmed,setConfirmed]=useState(false);
 const result=useMemo(()=>{try{return {rows:unitNaming.preview(entries,options),error:""};}catch(e){return {rows:[],error:e instanceof Error?e.message:"Invalid settings."};}},[entries,options]);
 const errors=result.rows.filter(r=>r.error).length;
 function update(patch:Partial<Options>){setOptions(o=>({...o,...patch}));setConfirmed(false);}
 return <section className={styles.editor} aria-label="Unit naming template">
 <div className={styles.fields}>
 <label>Template<Input aria-label="Unit name template" value={options.template} maxLength={70} onChange={e=>update({template:e.target.value})} placeholder="S-{n}"/></label>
 <label>Numbering<Select value={options.mode} onValueChange={mode=>update({mode:mode as Options["mode"]})}><SelectTrigger aria-label="Numbering mode"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="existing">Keep existing numbers</SelectItem><SelectItem value="sequence">Consecutive numbers in list order</SelectItem></SelectContent></Select></label>
 <label>Starting number<Input aria-label="Starting number" type="number" min={0} max={1000000000} step={1} disabled={options.mode==="existing"} value={Number.isNaN(options.start)?"":options.start} onChange={e=>update({start:e.target.value===""?NaN:Number(e.target.value)})}/></label>
 <label>Number width<Input aria-label="Number width" type="number" min={0} max={12} step={1} value={Number.isNaN(options.padding)?"":options.padding} onChange={e=>update({padding:e.target.value===""?NaN:Number(e.target.value)})}/></label>
 </div>
 <p>Use <code>{"{n}"}</code> for the number. Width 3 gives 001; width 0 gives 1. Keep existing numbers preserves numbering even when lists have different orders or gaps.</p>
 {options.mode==="sequence"&&<p className={styles.warning}>Consecutive numbering uses the complete list order shown below, not a search filter or position on the map. Each new name stays attached to its current marker and owner details. Update your upload file to match these names before importing.</p>}
 {result.error&&<p role="alert">{result.error}</p>}
 {errors>0&&<p role="alert">{errors} naming errors. Nothing will be renamed until all are resolved.</p>}
 <div className={styles.preview} tabIndex={0} aria-label="Unit naming preview"><table><thead><tr><th>Order</th><th>Current ID</th><th>New ID</th><th>Location details / issue</th></tr></thead><tbody>{result.rows.map((row,i)=><tr key={row.key}><td>{i+1}</td><td>{row.before||"(empty)"}</td><td>{row.after||"—"}</td><td>{row.error||row.description||"—"}</td></tr>)}</tbody></table></div>
 {options.mode==="sequence"&&<label className={styles.confirm}><Checkbox checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} aria-label="I reviewed the new unit names"/>I reviewed the order and new unit names.</label>}
 <Button disabled={!entries.length||!!result.error||errors>0||(options.mode==="sequence"&&!confirmed)} onClick={()=>onApply(options)}>{applyLabel}</Button>
 </section>;
}