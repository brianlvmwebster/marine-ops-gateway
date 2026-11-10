import React,{useEffect,useRef,useState} from 'react';
import {Button} from './Button';import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from './Select';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from './Dialog';
import {Plus,ChevronUp,ChevronDown,X} from 'lucide-react';
import type {Job} from '../helpers/jobModel';import {statusLabel} from '../helpers/workflowModel';
import {widgetLibrary,widgetTypes,defaultWidgets,matchingWidgetJobs,addServiceDays,type DashboardWidget,type WidgetType} from '../helpers/dashboardWidgets';
import {api} from '../helpers/api';import s from './DashboardWidgets.module.css';

export function DashboardWidgets({jobs,today,onOpenJob}:{jobs:Job[];today:string;onOpenJob:(id:string)=>void}){
 const [widgets,setWidgets]=useState<DashboardWidget[]>(defaultWidgets),[version,setVersion]=useState(0),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[library,setLibrary]=useState(false);const lock=useRef(false);
 const load=async()=>{setError('');try{const result=await api<{widgets:DashboardWidget[];version:number}>('dashboard/preferences');setWidgets(result.widgets);setVersion(result.version);setReady(true);}catch(e){setError(e instanceof Error?e.message:'Could not load your cards');}};
 useEffect(()=>{let ignore=false;api<{widgets:DashboardWidget[];version:number}>('dashboard/preferences').then(result=>{if(!ignore){setWidgets(result.widgets);setVersion(result.version);setReady(true);}}).catch(e=>{if(!ignore)setError(e.message);});return()=>{ignore=true;};},[]);
 const save=async(next:DashboardWidget[])=>{if(lock.current||!ready)return;lock.current=true;setBusy(true);setError('');try{const result=await api<{version:number}>('dashboard/preferences',{widgets:next,version});setWidgets(next);setVersion(result.version);}catch(e){setError(e instanceof Error?e.message:'Could not save your cards');}finally{lock.current=false;setBusy(false);}};
 const move=(index:number,amount:number)=>{const next=[...widgets];[next[index],next[index+amount]]=[next[index+amount],next[index]];void save(next);};
 const tomorrow=addServiceDays(today,1);
 return <section aria-label="Dashboard cards" className={s.dashboard}>
  <div className={s.heading}><div><h2>Your dashboard</h2><p>Tomorrow: {new Date(tomorrow+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'America/New_York',weekday:'long',month:'short',day:'numeric'})} · Eastern Time</p></div><Button disabled={!ready||busy||widgets.length>=12} onClick={()=>setLibrary(true)}><Plus size={16}/>Add card</Button></div>
  {error&&<div className={s.error} role="alert">{error}<Button variant="link" size="sm" onClick={()=>void load()}>Reload my cards</Button></div>}
  {!ready&&!error&&<p role="status">Loading your dashboard cards…</p>}
  {ready&&widgets.length===0&&<div className={s.empty}><h3>Build your daily view</h3><p>Add cards for tomorrow, pickups, deliveries, customer trailers, and upcoming jobs.</p><Button onClick={()=>setLibrary(true)}>Open widget library</Button></div>}
  <div className={s.grid}>{widgets.map((widget,index)=>{
   const definition=widgetLibrary[widget.type],matches=matchingWidgetJobs(widget.type,jobs,today);
   return <article className={s.widget} key={widget.id} style={{'--widget-accent':definition.accent} as React.CSSProperties} aria-label={definition.title+' card'}>
    <header><div><h3>{definition.title}</h3><p>{definition.description}</p></div><strong className={s.count}>{matches.length}</strong></header>
    <div className={s.tools}><label>Show<Select value={String(widget.limit)} onValueChange={value=>void save(widgets.map(w=>w.id===widget.id?{...w,limit:Number(value)}:w))} disabled={busy||!ready}><SelectTrigger aria-label={'Jobs shown in '+definition.title} className={s.limit}><SelectValue/></SelectTrigger><SelectContent>{[1,3,5,8,10,15,25,50].map(n=><SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent></Select></label><div><Button variant="ghost" size="icon-sm" aria-label={'Move '+definition.title+' earlier'} disabled={busy||index===0} onClick={()=>move(index,-1)}><ChevronUp size={15}/></Button><Button variant="ghost" size="icon-sm" aria-label={'Move '+definition.title+' later'} disabled={busy||index===widgets.length-1} onClick={()=>move(index,1)}><ChevronDown size={15}/></Button><Button variant="ghost" size="icon-sm" aria-label={'Remove '+definition.title+' card'} disabled={busy} onClick={()=>void save(widgets.filter(w=>w.id!==widget.id))}><X size={15}/></Button></div></div>
    <div className={s.jobs}>{matches.slice(0,widget.limit).map(job=><WidgetJob key={job.id} job={job} type={widget.type} onOpen={()=>onOpenJob(job.id)}/>)}</div>
    {!matches.length&&<p className={s.noJobs}>No matching jobs.</p>}<footer>Showing {Math.min(matches.length,widget.limit)} of {matches.length}</footer>
   </article>;
  })}</div>
  <Dialog open={library} onOpenChange={open=>{if(!busy)setLibrary(open);}}><DialogContent className={s.library}><DialogTitle>Widget library</DialogTitle><DialogDescription>Add a card, then choose how many jobs it shows. Your cards and their order are saved to your account.</DialogDescription><div className={s.libraryGrid}>{widgetTypes.map(type=><article key={type}><h3>{widgetLibrary[type].title}</h3><p>{widgetLibrary[type].description}</p><Button variant="outline" disabled={busy||widgets.length>=12} onClick={()=>void save([...widgets,{id:crypto.randomUUID(),type,limit:type==='tomorrow'?8:5}])}><Plus size={15}/>Add {widgetLibrary[type].title}</Button></article>)}</div></DialogContent></Dialog>
 </section>;
}

function WidgetJob({job,type,onOpen}:{job:Job;type:WidgetType;onOpen:()=>void}){
 const d=job.data;
 return <article className={s.job}><div className={s.jobTop}><small>#{String(job.jobNumber).padStart(4,'0')} · {d.serviceDate||'Unscheduled'}{d.time?' · '+d.time+' ET':''}</small><span>{statusLabel(d.status)}</span></div><Button variant="link" className={s.customer} onClick={onOpen}>{d.firstName} {d.lastName}</Button><p className={s.vessel}>{d.year} {d.make} · {d.model}</p><p>{d.services.join(' · ')}</p>{type==='road-pickups'&&<p className={s.location}><b>Pickup address</b>{d.pickupAddress||'Address not provided'}<b>Body of water</b>{d.lake||'Not provided'}</p>}{type==='deliveries'&&<p className={s.location}><b>Return address</b>{d.returnAddress||'Address not provided'}</p>}<div className={s.tags}><span>{d.pickup||'Pickup not specified'}</span><span>{d.trailer||'Trailer not specified'}</span></div>{type==='customer-trailers'&&d.trailerLocation&&<p>Trailer location: {d.trailerLocation}</p>}<small>Assigned: {d.technician||'Unassigned'}</small></article>;
}
