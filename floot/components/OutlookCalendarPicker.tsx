import React,{useCallback,useEffect,useState} from 'react';
import {Button} from './Button';import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from './Select';
import {Dialog,DialogContent,DialogTitle,DialogDescription,DialogFooter} from './Dialog';
import {api} from '../helpers/api';import {toast} from '../helpers/toast';import type {OutputType} from '../endpoints/calendar/list_GET.schema';
import s from './OutlookCalendarPicker.module.css';
type Props={email:string;calendarId:string;disabled?:boolean;onChanged:()=>Promise<void>;className?:string};
export function OutlookCalendarPicker({email,calendarId,disabled=false,onChanged,className}:Props){
 const [result,setResult]=useState<OutputType|null>(null),[choice,setChoice]=useState(calendarId),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[confirm,setConfirm]=useState(false);
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{const r=await api<OutputType>('calendar/list');if(r.email!==email)throw new Error('The Outlook account changed. Refresh the dashboard to load its calendars.');setResult(r);setChoice(r.selectedId);}
  catch(e){setResult(null);setError((e as Error).message);}finally{setLoading(false);}
 },[email,calendarId]);
 useEffect(()=>{let active=true;setLoading(true);setError('');setResult(null);
  api<OutputType>('calendar/list').then(r=>{if(!active)return;if(r.email!==email)throw new Error('The Outlook account changed. Refresh the dashboard to load its calendars.');setResult(r);setChoice(r.selectedId);}).catch(e=>{if(active)setError((e as Error).message);}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[email,calendarId]);
 const selected=result?.calendars.find(c=>c.id===choice);
 const current=result?.calendars.find(c=>c.id===result.selectedId);
 const apply=async()=>{if(!result)return;setSaving(true);setError('');try{
  const saved=await api('calendar/select',{calendarId:choice,expectedEmail:email,expectedCalendarId:result.selectedId});
  setResult({...result,selectedId:saved.calendarId});setChoice(saved.calendarId);setConfirm(false);
  toast('Jobs will sync to '+saved.name);await onChanged();
 }catch(e){const message=(e as Error).message;setError(message);toast.error(message);}finally{setSaving(false);}};
 return <div className={s.picker+' '+(className||'')}>
 <label className={s.label} htmlFor="outlook-calendar">Job sync calendar</label>
 <div className={s.controls}><Select value={choice} onValueChange={setChoice} disabled={disabled||saving||loading||!result}>
 <SelectTrigger id="outlook-calendar" aria-label="Job sync calendar" className={s.select}><SelectValue placeholder={loading?'Loading Outlook calendars…':'Choose an Outlook calendar'}/></SelectTrigger>
 <SelectContent>{result?.calendars.map(c=><SelectItem key={c.id} value={c.id} disabled={!c.canEdit}>{c.name}{c.isDefault?' (default)':''}{c.owner&&c.owner.toLowerCase()!==email.toLowerCase()?' · '+c.owner:''}{!c.canEdit?' — read-only':''}</SelectItem>)}{result&&!result.calendars.some(c=>c.id===choice)&&<SelectItem value={choice} disabled>Selected calendar unavailable</SelectItem>}</SelectContent>
 </Select>
 <Button variant="outline" size="sm" disabled={disabled||loading||saving||!selected?.canEdit||choice===result?.selectedId} onClick={()=>setConfirm(true)}>{saving?'Saving…':'Use calendar'}</Button>
 <Button variant="ghost" size="sm" disabled={loading||saving} onClick={load}>{loading?'Loading…':'Refresh'}</Button></div>
 {result&&<small className={s.current}>Currently syncing to: {current?.name||'Selected calendar unavailable'}. Read-only calendars cannot receive jobs.</small>}
 {error&&<p role="alert" className={s.error}>{error}</p>}
 <Dialog open={confirm} onOpenChange={v=>{if(!saving)setConfirm(v);}}><DialogContent><DialogTitle>Sync jobs to {selected?.name}?</DialogTitle><DialogDescription>Jobs will sync to this calendar instead of {current?.name||'the previous calendar'}. Existing events in the previous calendar will remain there and stop syncing. All job details and checklists will be kept.</DialogDescription><DialogFooter><Button variant="outline" disabled={saving} onClick={()=>setConfirm(false)}>Cancel</Button><Button disabled={saving} onClick={apply}>{saving?'Saving…':'Use this calendar and sync'}</Button></DialogFooter></DialogContent></Dialog>
 </div>;
}