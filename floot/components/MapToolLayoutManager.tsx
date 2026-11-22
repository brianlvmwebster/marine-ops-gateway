import React,{useEffect,useState} from "react";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "./MapToolDialog";
import {Button} from "./MapToolButton";
import {Input} from "./MapToolInput";
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from "./MapToolSelect";
import {getMaps,type OutputType,type StorageMap,type LayoutSection} from "../endpoints/mapping/maps_GET.schema";
import {postLayouts} from "../endpoints/mapping/layouts_POST.schema";
import {layoutModel} from "../helpers/MapToolLayoutModel";
import styles from "./MapToolLayoutManager.module.css";
type Row={id:string;name:string;revision:number;sectionId:string|null;sortOrder:number;archived:boolean;count:number};
export function LayoutManager({open,data,onClose,onSaved,onNewMap}:{open:boolean;data:OutputType;onClose:()=>void;onSaved:(data:OutputType)=>void;onNewMap:(sectionId:string|null)=>void}){
 const [rows,setRows]=useState<Row[]>([]),[sections,setSections]=useState<LayoutSection[]>([]),[name,setName]=useState("");
 const [filter,setFilter]=useState("all"),[query,setQuery]=useState(""),[showArchived,setShowArchived]=useState(false);
 const [changed,setChanged]=useState(false),[saving,setSaving]=useState(false),[committed,setCommitted]=useState(false),[error,setError]=useState("");
 useEffect(()=>{if(open){setRows(data.maps.map(m=>({id:m.id,name:m.name,revision:m.revision,sectionId:m.sectionId??null,sortOrder:m.sortOrder??0,archived:!!m.archived,count:m.spaces.length})));setSections(data.sections??[]);setName("");setFilter("all");setQuery("");setChanged(false);setCommitted(false);setError("");}},[open,data]);
 const visible=rows.filter(r=>(showArchived||!r.archived)&&(filter==="all"||(filter==="none"?!r.sectionId:r.sectionId===filter))&&r.name.toLowerCase().includes(query.toLowerCase()));
 function edit(id:string,patch:Partial<Row>){setRows(old=>old.map(r=>r.id===id?{...r,...patch}:r));setChanged(true);}
 function orderMaps(next:Row[]){setRows(next.map((r,i)=>({...r,sortOrder:i})));setChanged(true);}
 function move(id:string,direction:number){const i=visible.findIndex(r=>r.id===id),other=visible[i+direction];if(!other)return;const next=[...rows],a=next.findIndex(r=>r.id===id),b=next.findIndex(r=>r.id===other.id);[next[a],next[b]]=[next[b],next[a]];orderMaps(next);}
 function moveSection(index:number,direction:number){const next=[...sections],other=index+direction;if(other<0||other>=next.length)return;[next[index],next[other]]=[next[other],next[index]];setSections(next);setChanged(true);}
 function close(){if(saving)return;if(changed&&!committed&&!window.confirm("Discard unsaved layout organization changes?"))return;onClose();}
 async function save(createMap=false){
  setSaving(true);setError("");
  try{
   if(changed&&!committed){
    const payload=layoutModel.schema.parse({revision:data.organizationRevision??0,sections,maps:rows.map(({count,...r})=>r)});
    await postLayouts(payload);setCommitted(true);
   }
   const fresh=await getMaps();onSaved(fresh);
   if(createMap)onNewMap(filter==="all"||filter==="none"?null:filter);
  }catch(e){setError(e instanceof Error?e.message:"Could not save layouts.");}
  finally{setSaving(false);}
 }
 return <Dialog open={open} onOpenChange={value=>{if(!value)close();}}><DialogContent className={styles.dialog}>
 <DialogHeader><DialogTitle>Layout manager</DialogTitle><DialogDescription>Organize your maps into sections. Rename, reorder, archive or restore layouts. Changes here do not alter markers or location details.</DialogDescription></DialogHeader>
 <div className={styles.body}><fieldset disabled={saving||committed} className={styles.fields}>
 <section className={styles.sections}><h3>Sections / locations</h3><p>Rename a section by editing its name below. To move a map, choose its destination in Move to section, then Save organization.</p><div className={styles.add}><Input aria-label="New section name" placeholder="e.g. North yard or Webster location" maxLength={120} value={name} onChange={e=>setName(e.target.value)}/><Button disabled={!name.trim()||sections.length>=100} onClick={()=>{if(sections.some(s=>s.name.trim().toLowerCase()===name.trim().toLowerCase())){setError("That section name already exists.");return;}const id=crypto.randomUUID();setSections(s=>[...s,{id,name:name.trim()}]);setName("");setChanged(true);setError("");setFilter("all");setQuery("");}}>Add section</Button></div>
 {sections.map((s,i)=><div className={styles.sectionRow} key={s.id}><Input aria-label={"Section name "+(i+1)} title="Rename section" value={s.name} maxLength={120} onChange={e=>{setSections(old=>old.map(item=>item.id===s.id?{...item,name:e.target.value}:item));setChanged(true);}}/><Button size="sm" variant="outline" aria-label={"Move section "+s.name+" up"} disabled={i===0} onClick={()=>moveSection(i,-1)}>↑</Button><Button size="sm" variant="outline" aria-label={"Move section "+s.name+" down"} disabled={i===sections.length-1} onClick={()=>moveSection(i,1)}>↓</Button></div>)}
 {!sections.length&&<p>No sections yet. Existing maps are in Ungrouped.</p>}
 </section>
 <div className={styles.filters}><Input aria-label="Search layouts" placeholder="Search maps…" value={query} onChange={e=>setQuery(e.target.value)}/><Select value={filter} onValueChange={setFilter}><SelectTrigger aria-label="Filter layouts by section"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All sections</SelectItem><SelectItem value="none">Ungrouped</SelectItem>{sections.map(s=><SelectItem key={s.id} value={s.id}>{s.name||"Unnamed section"}</SelectItem>)}</SelectContent></Select><Button variant={showArchived?"secondary":"outline"} aria-pressed={showArchived} onClick={()=>setShowArchived(v=>!v)}>Show archived</Button><Button variant="outline" onClick={()=>orderMaps([...rows].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:"base"})))}>Sort maps A–Z</Button></div>
 <div className={styles.table} tabIndex={0} aria-label="Layouts"><table><thead><tr><th>Map name</th><th>Move to section</th><th>Units</th><th>Order</th><th>Status</th></tr></thead><tbody>{visible.map((r,i)=><tr key={r.id}><td><Input aria-label={"Map name "+r.name} value={r.name} maxLength={120} onChange={e=>edit(r.id,{name:e.target.value})}/></td><td><Select disabled={saving||committed} value={r.sectionId??"none"} onValueChange={v=>edit(r.id,{sectionId:v==="none"?null:v})}><SelectTrigger aria-label={"Section for "+r.name}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Ungrouped</SelectItem>{sections.map(s=><SelectItem key={s.id} value={s.id}>{s.name||"Unnamed section"}</SelectItem>)}</SelectContent></Select></td><td>{r.count}</td><td><div className={styles.order}><Button size="sm" variant="outline" aria-label={"Move map "+r.name+" up"} disabled={i===0||!!query} onClick={()=>move(r.id,-1)}>↑</Button><Button size="sm" variant="outline" aria-label={"Move map "+r.name+" down"} disabled={i===visible.length-1||!!query} onClick={()=>move(r.id,1)}>↓</Button></div></td><td><Button size="sm" variant="outline" onClick={()=>edit(r.id,{archived:!r.archived})}>{r.archived?"Restore":"Archive"}</Button></td></tr>)}</tbody></table>{!visible.length&&<p>No maps in this view. Create a map or change the filter.</p>}</div>
 <p>Archived maps are hidden from navigation but keep their images and unit details. Use Show archived to restore them. Arrows reorder the visible maps; Sort maps A–Z orders the complete list.</p>
 </fieldset>
 {error&&<p role="alert" className={styles.error}>{error}</p>}
 {committed&&<p role="status">Organization saved. Refreshing maps… If refreshing failed, use Reload saved layouts.</p>}
 </div>
 <footer className={styles.footer}><Button variant="outline" disabled={saving} onClick={close}>Close</Button><Button variant="outline" disabled={saving} onClick={()=>save(true)}>{changed?"Save & new map":"New map"}</Button><Button disabled={saving||(!changed&&!committed)} onClick={()=>save()}>{saving?"Saving…":committed?"Reload saved layouts":"Save organization"}</Button></footer>
 </DialogContent></Dialog>;
}
