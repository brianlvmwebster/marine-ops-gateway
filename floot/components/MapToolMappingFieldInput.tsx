import React from "react";
import {Input} from "./MapToolInput";
import {Textarea} from "./MapToolTextarea";
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from "./MapToolSelect";
import {fieldLimit,parseFieldValue,type MappingColumn} from "../helpers/MapToolMappingColumns";

export function MappingFieldInput({column,value,onChange,label,disabled,inputRef,onFocus,multiline=false}:{column:MappingColumn;value:string;onChange:(value:string)=>void;label:string;disabled?:boolean;inputRef?:React.Ref<HTMLInputElement>;onFocus?:()=>void;multiline?:boolean}){
 let error="",normalized=value;try{normalized=parseFieldValue(column,value);}catch(e){error=e instanceof Error?e.message:"Invalid value.";}
 if(column.type==="boolean")return <Select disabled={disabled} value={error?"invalid":normalized||"unset"} onValueChange={v=>onChange(v==="unset"?"":v)}><SelectTrigger aria-label={label} aria-invalid={!!error} onFocus={onFocus}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="unset">Unset</SelectItem>{error&&<SelectItem value="invalid" disabled>{value} (invalid)</SelectItem>}<SelectItem value="true">{column.trueLabel??"Yes"}</SelectItem><SelectItem value="false">{column.falseLabel??"No"}</SelectItem></SelectContent></Select>;
 return <>{multiline&&(!column.type||column.type==="text")?<Textarea aria-label={label} value={value} rows={2} disabled={disabled} maxLength={fieldLimit(column.id)} onChange={e=>onChange(e.target.value)}/>:<Input ref={inputRef} aria-label={label} aria-invalid={!!error} title={error||undefined} value={value} inputMode={column.type==="number"?"decimal":undefined} maxLength={fieldLimit(column.id)} placeholder={column.type==="number"?"e.g. 12.5":"—"} disabled={disabled} autoComplete="off" onFocus={onFocus} onChange={e=>onChange(e.target.value)}/>} {error&&<small role="alert">{error}</small>}</>;
}
