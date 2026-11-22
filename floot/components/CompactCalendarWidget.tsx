import React,{useState} from 'react';
import {SlidersHorizontal,ChevronLeft,ChevronRight} from 'lucide-react';
import {Button} from './Button';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from './Select';
import type {Job} from '../helpers/jobModel';
import type {AssignmentOption} from '../helpers/workflowModel';
import {jobStatuses} from '../helpers/workflowModel';
import {compactCalendarWeek} from '../helpers/compactCalendarWeek';
import {pickupCategory,pickupCategories} from '../helpers/calendarDisplay';
import {defaultCalendarSettings,matchingCalendarJobs,type CalendarWidgetSettings,type DashboardWidget} from '../helpers/dashboardWidgets';
import s from './CompactCalendarWidget.module.css';

type Props={widget:DashboardWidget;jobs:Job[];today:string;assignments:AssignmentOption[];disabled:boolean;onChange:(settings:CalendarWidgetSettings)=>void;onOpenJob:(id:string)=>void;onOpenSchedule:()=>void};
const dayLabel=(day:string,options:Intl.DateTimeFormatOptions)=>new Date(day+'T12:00:00Z').toLocaleDateString('en-US',{...options,timeZone:'America/New_York'});
const unique=(values:string[])=>[...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b));

export function CompactCalendarWidget({widget,jobs,today,assignments,disabled,onChange,onOpenJob,onOpenSchedule}:Props){
 const [weekOffset,setWeekOffset]=useState(0);
 const [filtersOpen,setFiltersOpen]=useState(false);
 const settings=widget.calendar||defaultCalendarSettings;
 const days=compactCalendarWeek(today,weekOffset),matches=matchingCalendarJobs(jobs,days[0],{...settings,range:'rolling',days:5});
 const update=(patch:Partial<CalendarWidgetSettings>)=>onChange({...settings,...patch});
 const filterCount=['pickup','trailer','assignment','priority','service','returnType'].filter(key=>!!settings[key as keyof CalendarWidgetSettings]).length+(settings.status==='active'?0:1);
 const choose=(key:'pickup'|'trailer'|'priority'|'service'|'returnType',label:string,values:string[])=><FilterSelect label={label} value={settings[key]} options={unique([...values,settings[key]]).map(v=>({value:v,label:v}))} disabled={disabled} onChange={value=>update({[key]:value})}/>;
 const assignmentValues=[...assignments.map(a=>({value:a.id,label:a.name+(a.kind==='group'?' (group)':'')})),...unique(jobs.filter(j=>!j.data.assignmentId&&j.data.technician!=='Unassigned').map(j=>j.data.technician)).map(v=>({value:v,label:v}))];
 if(settings.assignment&&settings.assignment!=='__unassigned'&&!assignmentValues.some(a=>a.value===settings.assignment))assignmentValues.push({value:settings.assignment,label:'Previous assignment'});
 return <div className={s.calendar}>
  <div className={s.rangeTools}>
   <Button variant="outline" size="sm" aria-label="Previous week" onClick={()=>setWeekOffset(v=>v-1)}><ChevronLeft size={14}/>Previous</Button>
   <Button variant="outline" size="sm" onClick={()=>setWeekOffset(0)} disabled={weekOffset===0}>This Week</Button>
   <Button variant="outline" size="sm" aria-label="Next week" onClick={()=>setWeekOffset(v=>v+1)}>Next<ChevronRight size={14}/></Button>
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
  <div className={s.legend} aria-label="Pickup and drop-off colors">{pickupCategories.map(category=><span key={category.label}><i style={{background:category.color}} aria-hidden="true"/>{category.label}</span>)}</div>
  <div className={s.agenda} role="region" aria-label="Compact calendar appointments" tabIndex={0}>{days.map(day=>{
   const entries=matches.filter(j=>j.data.serviceDate===day);
   return <section key={day} className={day===today?s.today:s.day} aria-label={dayLabel(day,{weekday:'long',month:'long',day:'numeric'})}>
    <div className={s.dayHeading}><time dateTime={day}><strong>{dayLabel(day,{weekday:'short'})}</strong><span>{dayLabel(day,{month:'short',day:'numeric'})}{day===today?' · Today':''}</span></time><small>{entries.length}</small></div>
    {entries.length?<div className={s.cards}>{entries.slice(0,widget.limit).map(job=><Button key={job.id} variant="ghost" className={s.entry} style={{'--category-color':pickupCategory(job.data.pickup).color} as React.CSSProperties} onClick={()=>onOpenJob(job.id)}>
     <span className={s.cardTop}><span className={s.time}>{job.data.time||'Time TBD'}</span><span className={s.category} title={pickupCategory(job.data.pickup).label}>{pickupCategory(job.data.pickup).label}</span></span>
     <strong className={s.customer}>{[job.data.firstName,job.data.lastName].filter(Boolean).join(' ')||'Unnamed customer'}</strong>
     <span className={s.vessel}>{[job.data.year,job.data.make,job.data.model].filter(Boolean).join(' ')||'Boat not specified'}</span>
     {(job.data.lake?.trim()||job.data.pickup.includes('Webster Lake'))&&<span className={s.location}>{job.data.lake?.trim()||'Webster Lake'}</span>}
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
