import {defaultColumns,exportTemplate,displayFieldValue,type MappingColumn} from "../helpers/MapToolMappingColumns";
import React,{useEffect,useMemo,useRef,useState} from "react";
import {Button} from "./MapToolButton";
import {Input} from "./MapToolInput";
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from "./MapToolSelect";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "./MapToolDialog";
import {locationImport} from "../helpers/MapToolLocationImport";
import type {Space} from "../endpoints/mapping/maps_GET.schema";
import styles from "./MapToolLocationImport.module.css";

type Table=Awaited<ReturnType<typeof locationImport.parseFile>>[number];
type Columns=ReturnType<typeof locationImport.guess>;
export function LocationImport({open=true,spaces,mapName,onClose,onApply,definitions=defaultColumns}:{definitions?:MappingColumn[];open?:boolean;spaces:Space[];mapName:string;onClose:()=>void;onApply:(spaces:Space[])=>void}){
 const [tables,setTables]=useState<Table[]>([]),[sheet,setSheet]=useState(0);
 const [columns,setColumns]=useState<Columns>(locationImport.guess([],definitions));
 const [filename,setFilename]=useState(""),[loading,setLoading]=useState(false),[error,setError]=useState("");
 const [fillOnly,setFillOnly]=useState(false);
 const request=useRef(0);
 useEffect(()=>()=>{request.current++;},[]);
 useEffect(()=>{if(!open){request.current++;setTables([]);setError("");setFilename("");setLoading(false);}},[open]);
 const table=tables[sheet];
 const review=useMemo(()=>{
  if(!table)return {rows:[],error:""};
  try{return {rows:locationImport.preview(table,columns,spaces,fillOnly,definitions),error:""};}
  catch(e){return {rows:[],error:e instanceof Error?e.message:"Unable to preview."};}
 },[table,columns,spaces,fillOnly,definitions]);
 const updates=review.rows.filter(r=>r.status==="Update").length;
 const skipped=review.rows.filter(r=>!["Update","Unchanged"].includes(r.status)).length;
 async function chooseFile(file:File|undefined){
  const id=++request.current;setTables([]);setError("");setFilename(file?.name??"");
  if(!file){setLoading(false);return;}
  setLoading(true);
  try{const parsed=await locationImport.parseFile(file);if(id!==request.current)return;setTables(parsed);setSheet(0);setColumns(locationImport.guess(parsed[0].headers,definitions));}
  catch(e){if(id===request.current)setError(e instanceof Error?e.message:"Could not read this file.");}
  finally{if(id===request.current)setLoading(false);}
 }
 async function template(){try{await exportTemplate(spaces,definitions);}catch(e){setError(e instanceof Error?e.message:"Could not export template.");}}
 const fields=["locationId",...definitions.map(c=>c.id)];
 const labels:Record<string,string>={locationId:"Location ID",...Object.fromEntries(definitions.map(c=>[c.id,c.label]))};
 return <Dialog open={open} onOpenChange={open=>{if(!open)onClose();}}><DialogContent className={styles.dialog}>
  <DialogHeader><DialogTitle>Import location details</DialogTitle><DialogDescription>Match your list to Unit labels in {mapName}. Review changes, apply them, then Save map.</DialogDescription></DialogHeader>
  <div className={styles.body}>
   <p className={styles.help}>IDs match exactly, ignoring letter case and surrounding spaces. Leading zeros and punctuation matter. Blank cells keep existing values. Marker positions, labels, notes, status and review flags stay unchanged.</p>
   <div className={styles.fileRow}><label className={styles.fileLabel}>Choose a location list<Input type="file" accept=".xls,.xlsx,.csv,.json" aria-label="Location import file" onChange={e=>chooseFile(e.target.files?.[0])}/></label><Button variant="outline" size="sm" onClick={template}>Excel template</Button></div>
   <p className={styles.help}>XLS, XLSX, CSV or JSON · up to 5 MB / 5,000 rows. Spreadsheets need a header row. The Excel template contains your configured columns and unit labels. JSON accepts an array of objects with matching column names.</p>
   {loading&&<p role="status">Reading {filename}…</p>}
   {error&&<p role="alert" className={styles.error}>{error}</p>}
   {table&&<>
    <div className={styles.options}><label>Worksheet<Select value={String(sheet)} onValueChange={v=>{const index=Number(v);setSheet(index);setColumns(locationImport.guess(tables[index].headers,definitions));}}><SelectTrigger aria-label="Worksheet"><SelectValue/></SelectTrigger><SelectContent>{tables.map((t,i)=><SelectItem key={i} value={String(i)}>{t.name}</SelectItem>)}</SelectContent></Select></label>
    <label>Existing details<Select value={fillOnly?"fill":"replace"} onValueChange={v=>setFillOnly(v==="fill")}><SelectTrigger aria-label="Existing details"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="replace">Replace with nonblank imported values</SelectItem><SelectItem value="fill">Fill empty fields only</SelectItem></SelectContent></Select></label></div>
    <div className={styles.mapping}>{fields.map(field=><label key={field}>{labels[field]}{field==="locationId"?" *":""}<Select value={String(columns[field])} onValueChange={v=>setColumns(c=>({...c,[field]:Number(v)}))}><SelectTrigger aria-label={labels[field]+" column"}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="-1">{field==="locationId"?"Choose a column":"Do not import"}</SelectItem>{table.headers.map((h,i)=><SelectItem key={i} value={String(i)}>{i+1}. {h}</SelectItem>)}</SelectContent></Select></label>)}</div>
    {review.error?<p role="alert" className={styles.error}>{review.error}</p>:<>
     <div className={styles.summary} role="status"><strong>{updates} {updates===1?"update":"updates"}</strong><span>{review.rows.filter(r=>r.status==="Unchanged").length} unchanged</span><span>{skipped} skipped</span><span>{review.rows.length} rows</span></div>
     {skipped>0&&<p className={styles.help}>Unmatched, duplicate and invalid rows are skipped. Correct these IDs in the file or the mapped Unit labels, then import again. No new markers are created.</p>}
     <div className={styles.tableWrap} tabIndex={0} aria-label="Import preview"><table><thead><tr><th>Row</th><th>Location ID</th><th>Result</th>{fields.slice(1).map(f=><th key={f}>{labels[f]}</th>)}</tr></thead><tbody>{review.rows.map(row=><tr key={row.row}><td>{row.row}</td><th scope="row">{row.locationId||"Missing ID"}</th><td><strong>{row.status}</strong><small>{row.message}</small></td>{fields.slice(1).map(field=>{if(field==="locationId")return null;const definition=definitions.find(c=>c.id===field)!;const before=displayFieldValue(row.before,definition),after=displayFieldValue(row.after,definition);return <td key={field}>{row.after?(before!==after?<><del>{before||"(empty)"}</del><ins>{after}</ins></>:before||"—"):"—"}</td>;})}</tr>)}</tbody></table>{!review.rows.length&&<p>No location rows found.</p>}</div>
    </>}
   </>}
  </div>
  <footer className={styles.footer}><span>Changes remain unsaved until you choose Save map.</span><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={loading||!!error||!!review.error||updates===0} onClick={()=>onApply(locationImport.apply(spaces,review.rows))}>Apply {updates} {updates===1?"update":"updates"}</Button></footer>
 </DialogContent></Dialog>;
}
