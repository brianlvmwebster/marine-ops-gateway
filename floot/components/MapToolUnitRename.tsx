import React from "react";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "./MapToolDialog";
import {UnitNamingEditor} from "./MapToolUnitNamingEditor";
import {unitNaming} from "../helpers/MapToolUnitNaming";
import type {Space} from "../endpoints/mapping/maps_GET.schema";
import styles from "./MapToolUnitRename.module.css";
export function UnitRename({open,spaces,mapName,options,onClose,onApply}:{open:boolean;spaces:Space[];mapName:string;options:typeof unitNaming.defaults;onClose:()=>void;onApply:(options:typeof unitNaming.defaults)=>void}){
 return <Dialog open={open} onOpenChange={value=>{if(!value)onClose();}}><DialogContent className={styles.dialog}><DialogHeader><DialogTitle>Rename mapped units</DialogTitle><DialogDescription>Rename all {spaces.length} units in {mapName}. Markers and owner details stay attached to the same locations. Save map to keep the changes.</DialogDescription></DialogHeader>{open&&<UnitNamingEditor initialOptions={options} entries={spaces.map(s=>({key:s.id,label:s.label,description:[s.lastName,s.firstName,s.boatDescription].filter(Boolean).join(" · ")}))} onApply={onApply}/>}</DialogContent></Dialog>;
}
