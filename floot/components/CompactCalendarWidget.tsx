import React,{useState} from 'react';
import {SlidersHorizontal} from 'lucide-react';
import {Button} from './Button';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from './Select';
import type {Job} from '../helpers/jobModel';
import type {AssignmentOption} from '../helpers/workflowModel';
import {jobStatuses} from '../helpers/workflowModel';
import {pickupCategory} from '../helpers/calendarDisplay';
import {calendarWidgetDays,defaultCalendarSettings,matchingCalendarJobs,type CalendarWidgetSettings,type DashboardWidget} from '../helpers/dashboardWidgets';
import s from './CompactCalendarWidget.module.css';

type Props={widget:DashboardWidget;jobs:Job[];today:string;assignments:AssignmentOption[];disabled:boolean;onChange:(settings:CalendarWidgetSettings)=>void;onOpenJob:(id:string)=>void;onOpenSchedule:()=>void};
const dayLabel=(day:string,options:Intl.DateTimeFormatOptions)=>new Date(day+'T12:00:00Z').toLocaleDateString('en-US',{...options,timeZone:'America/New_York'});
const unique=(values:string[])=>[...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b));

export function CompactCalendarWidget({widget,jobs,today,assignments,disabled,onChange,onOpenJob,onOpenSchedule}:Props){
 const [filtersOpen,setFiltersOpen]=useState(false);
 const settings=widget.calendar||defaultCalendarSettings;
 const days=calendarWidgetDays(today,settings),matches=matchingCalendarJobs(jobs,today,settings);
 const update=(patch:Partial<CalendarWidgetSettings>)=>onChange({...settings,...patch});
 const filterCount=['pickup','trailer','assignment','priority','service','returnType'].filter(key=>!!settings[key as keyof CalendarWidgetSettings]).length+(settings.status==='active'?0:1);
 const choose=(key:'pickup'|'trailer'|'priority'|'service'|'returnType',label:string,values:string[])=><FilterSelect label={label} value={settings[key]} options={unique([...values,settings[key]]).map(v=>({value:v,label:v}))} disabled={disabled} onChange={value=>update({[key]:value})}/>;
 const assignmentValues=[...assignments.map(a=>({value:a.id,label:a.name+(a.kind==='group'?' (group)':'')})),...unique(jobs.filter(j=>!j.data.assignmentId&&j.data.technician!=='Unassigned').map(j=>j.data.technician)).map(v=>({value:v,label:v}))];
 if(settings.assignment&&settings.assignment!=='__unassigned'&&!assignmentValues.some(a=>a.value===settings.assignment))assignmentValues.push({value:settings.assignment,label:'Previous assignment'});
 return <div className={s.calendar}>
  <div className={s.rangeTools}>
   <label>Days<Select value={String(settings.days)} disabled={disabled} onValueChange={value=>update({days:Number(value),range:'rolling'})}><SelectTrigger className={s.days} aria-label="Compact calendar days"><SelectValue/></SelectTrigger><SelectContent>{Array.from({length:14},(_,i)=>i+1).map(n=><SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent></Select></label>
   <Button variant={settings.range==='week'?'secondary':'outline'} size="sm" disabled={disabled} aria-pressed={settings.range==='week'} onClick={()=>update({range:'week',days:7})}>This Week</Button>
   {settings.range==='week'&&<Button variant="ghost" size="sm" disabled={disabled} onClick={()=>update({range:'rolling'})}>From today</Button>}
   <Button variant="ghost" size="sm" aria-expanded={filtersOpen} aria-controls={'calendar-filters-'+widget.id} onClick={()=>setFiltersOpen(v=>!v)}><SlidersHorizontal size={13}/>Filters{filterCount>0?' ('+filterCount+')':''}</Button>
  </div>
  <div className={s.rangeLabel} role="status">{dayLabel(days[0],{month:'short',day:'numeric'})}–{dayLabel(days[days.length-1],{month:'short',day:'numeric',year:'numeric'})} · Eastern · {matches.length} jobs</div>
  {filtersOpen&&<div id={'calendar-filters-'+widget.id} className={s.filters}>
   {choose('pickup','Pickup / Drop-off',jobs.map(j=>j.data.pickup))}
   <FilterSelect label="Status" value={settings.status} allLabel="All statuses" options={[{value:'active',label:'Active jobs'},...jobStatuses.map(v=>({value:v,label:v}))]} disabled={disabled} onChange={value=>update({status:(value||'all') as CalendarWidgetSettings['status']})}/>
   {choose('trailer','Trailer',jobs.map(j=>j.data.trailer))}
   <FilterSelect label="Assignment" value={settings.assignment} options={[{value:'__unassigned',label:'Unassigned'},...assignmentValues]} disabled={disabled} onChange={assignment=>update({assignment})}/>
   {choose('priority','Priority',['Normal','High','Urgent'])}
   {choose('service','Service',jobs.flatMap(j=>j.data.services))}
   {choose('returnType','Return / storage',jobs.map(j=>j.data.returnType))}
   <Button variant="ghost" size="sm" disabled={disabled||filterCount===0} onClick={()=>update({...defaultCalendarSettings,range:settings.range,days:settings.days})}>Reset filters</Button>
  </div>}
  <div className={s.agenda} role="region" aria-label="Compact calendar appointments" tabIndex={0}>{days.map(day=>{
   const entries=matches.filter(j=>j.data.serviceDate===day);
   return <section key={day} className={day===today?s.today:s.day} aria-label={dayLabel(day,{weekday:'long',month:'long',day:'numeric'})}>
    <div className={s.dayHeading}><time dateTime={day}><strong>{day.slice(5,7)}/{day.slice(8,10)}</strong><span>{dayLabel(day,{weekday:'short'})}{day===today?' · Today':''}</span></time><small>{entries.length}</small></div>
    {entries.length?<div className={s.cards}>{entries.slice(0,widget.limit).map(job=><Button key={job.id} variant="ghost" className={s.entry} style={{'--category-color':pickupCategory(job.data.pickup).color} as React.CSSProperties} onClick={()=>onOpenJob(job.id)}>
     <span className={s.cardTop}><span className={s.statusDate}><span className={s.status}>{job.data.status}</span><time className={s.date} dateTime={day}>{day.slice(5,7)}/{day.slice(8,10)}</time></span><span className={s.time}>{job.data.time||'TBD'} ET · #{String(job.jobNumber).padStart(4,'0')}</span></span>
     <strong className={s.customer}>{job.data.firstName} {job.data.lastName}</strong>
     <span className={s.vessel}>{job.data.make} {job.data.model}</span>
     <span className={s.tags}><span>{job.data.pickup||'Pickup not specified'}</span><span>{job.data.trailer||'Trailer not specified'}</span></span>
     {job.data.pickup==='Road Pickup'&&<span className={s.location}><span title={job.data.pickupAddress||'Address not provided'}><b>Pickup</b> {(job.data.pickupAddress||'Address not provided').replace(/\s+/g,' ')}</span><span><b>Water</b> {job.data.lake||'Body of water not provided'}</span></span>}
     <span className={s.assignment}>Assigned: {job.data.technician||'Unassigned'}</span>
    </Button>)}</div>:<p className={s.noJobs}>No matching jobs</p>}
    {entries.length>widget.limit&&<p className={s.more}>+{entries.length-widget.limit} more · increase “Per day” to see more</p>}
   </section>;
  })}</div>
  <div className={s.footer}><span>Showing up to {widget.limit} jobs per day</span><Button variant="link" size="sm" onClick={onOpenSchedule}>Full calendar</Button></div>
 </div>;
}

function FilterSelect({label,value,options,allLabel='All',disabled,onChange}:{label:string;value:string;options:{value:string;label:string}[];allLabel?:string;disabled:boolean;onChange:(value:string)=>void}){
 const selected=value==='all'?'':value;
 return <label className={s.filter}><span>{label}</span><Select value={selected||'__all'} disabled={disabled} onValueChange={v=>onChange(v==='__all'?'':v)}><SelectTrigger aria-label={'Compact calendar '+label}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="__all">{allLabel}</SelectItem>{options.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></label>;
}
