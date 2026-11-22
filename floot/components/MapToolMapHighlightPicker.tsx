import React from "react";
import {Input} from "./MapToolInput";
import {Button} from "./MapToolButton";
import styles from "./MapToolMapHighlightPicker.module.css";
export function MapHighlightPicker({value,onChange}:{value:string;onChange:(value:string)=>void}){
 return <div className={styles.picker} title="Linked map/list highlight. Remembered for this map in this browser."><label>Highlight<Input type="color" aria-label="Linked highlight color" value={value} onChange={event=>onChange(event.target.value)} className={styles.swatch}/></label><Button variant="ghost" size="sm" aria-label="Reset highlight color" onClick={()=>onChange("#ffca3a")}>Reset</Button></div>;
}
