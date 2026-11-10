import {z} from 'zod';
import type {Job} from './jobModel';

export const widgetTypes=['tomorrow','road-pickups','deliveries','customer-trailers','upcoming','today','calendar'] as const;
export type WidgetType=typeof widgetTypes[number];
export const widgetLibrary:Record<WidgetType,{title:string;description:string;accent:string}>={
 tomorrow:{title:"Tomorrow's jobs",description:'The next calendar day in Eastern Time.',accent:'#007b99'},
 'road-pickups':{title:'Coming road pickups',description:'Road Pickup jobs from today onward, earliest first.',accent:'#a35c12'},
 deliveries:{title:'Coming customer deliveries',description:'Deliver to Customer, ordered by service date for now.',accent:'#7e22ce'},
 'customer-trailers':{title:'Customer trailers',description:'Customer Trailer jobs excluding Road Pickup; includes Done jobs awaiting review.',accent:'#0f766e'},
 upcoming:{title:'Upcoming jobs',description:'Active appointments from today onward.',accent:'#075985'},
 today:{title:"Today's jobs",description:'Active appointments scheduled for today in Eastern Time.',accent:'#be185d'},
 calendar:{title:'Compact calendar',description:'A short agenda with saved day range and job filters.',accent:'#0369a1'}
};
const filterText=z.string().max(500);
export const calendarWidgetSchema=z.object({range:z.enum(['rolling','week']),days:z.number().int().min(1).max(14),pickup:filterText,trailer:filterText,status:z.enum(['active','all','New','Scheduled','Onsite','In progress','Awaiting parts','Ready','Done','Completed','Cancelled']),assignment:filterText,priority:z.enum(['','Normal','High','Urgent']),service:filterText,returnType:filterText}).strict();
export type CalendarWidgetSettings=z.infer<typeof calendarWidgetSchema>;
export const defaultCalendarSettings:CalendarWidgetSettings={range:'rolling',days:5,pickup:'',trailer:'',status:'active',assignment:'',priority:'',service:'',returnType:''};
export const widgetSchema=z.object({id:z.string().min(1).max(80).regex(/^[\w-]+$/),type:z.enum(widgetTypes),limit:z.number().int().min(1).max(50),calendar:calendarWidgetSchema.optional()}).strict();
export const widgetLayoutSchema=z.array(widgetSchema).max(12).refine(items=>new Set(items.map(w=>w.id)).size===items.length,{message:'Each card must have a unique ID'});
export type DashboardWidget=z.infer<typeof widgetSchema>;
export const defaultWidgets:DashboardWidget[]=[{id:'tomorrow',type:'tomorrow',limit:8},{id:'road-pickups',type:'road-pickups',limit:5},{id:'deliveries',type:'deliveries',limit:5},{id:'customer-trailers',type:'customer-trailers',limit:5},{id:'upcoming',type:'upcoming',limit:5}];
export const layoutInput=z.object({version:z.number().int().nonnegative(),widgets:widgetLayoutSchema,columns:z.number().int().min(1).max(4).optional()}).strict();
export function addServiceDays(day:string,amount:number){const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+amount);return date.toISOString().slice(0,10);}
export function calendarWidgetDays(today:string,settings:CalendarWidgetSettings){
 const weekday=new Date(today+'T12:00:00Z').getUTCDay();
 const start=settings.range==='week'?addServiceDays(today,-((weekday+6)%7)):today;
 return Array.from({length:settings.range==='week'?7:settings.days},(_,i)=>addServiceDays(start,i));
}
export function matchingCalendarJobs(jobs:Job[],today:string,settings:CalendarWidgetSettings){
 const days=new Set(calendarWidgetDays(today,settings));
 return jobs.filter(({data:d})=>days.has(d.serviceDate)
  &&(settings.status==='all'||(settings.status==='active'?!['Done','Completed','Cancelled'].includes(d.status)&&d.appointment!=='Cancelled':d.status===settings.status))
  &&(!settings.pickup||d.pickup===settings.pickup)&&(!settings.trailer||d.trailer===settings.trailer)
  &&(!settings.assignment||(settings.assignment==='__unassigned'?!d.assignmentId&&(!d.technician||d.technician==='Unassigned'):d.assignmentId===settings.assignment||(!d.assignmentId&&d.technician===settings.assignment)))
  &&(!settings.priority||d.priority===settings.priority)&&(!settings.service||d.services.includes(settings.service))&&(!settings.returnType||d.returnType===settings.returnType)
 ).sort((a,b)=>(a.data.serviceDate+' '+a.data.time).localeCompare(b.data.serviceDate+' '+b.data.time)||String(a.jobNumber).localeCompare(String(b.jobNumber),undefined,{numeric:true}));
}
export function matchingWidgetJobs(type:WidgetType,jobs:Job[],today:string){
 const active=(j:Job)=>!['Done','Completed','Cancelled'].includes(j.data.status)&&j.data.appointment!=='Cancelled';
 const notClosed=(j:Job)=>!['Completed','Cancelled'].includes(j.data.status)&&j.data.appointment!=='Cancelled';
 return jobs.filter(j=>{
  const d=j.data;
  if(type==='customer-trailers')return notClosed(j)&&d.trailer==='Customer Trailer'&&d.pickup!=='Road Pickup';
  if(type==='deliveries')return notClosed(j)&&d.returnType==='Deliver to Customer'&&!!d.serviceDate&&d.serviceDate>=today;
  if(!active(j))return false;
  if(type==='tomorrow')return d.serviceDate===addServiceDays(today,1);
  if(type==='today')return d.serviceDate===today;
  return !!d.serviceDate&&d.serviceDate>=today&&(type!=='road-pickups'||d.pickup==='Road Pickup');
 }).sort((a,b)=>{
  if(!a.data.serviceDate!==!b.data.serviceDate)return a.data.serviceDate?-1:1;
  return (a.data.serviceDate+' '+a.data.time).localeCompare(b.data.serviceDate+' '+b.data.time)||String(a.jobNumber).localeCompare(String(b.jobNumber),undefined,{numeric:true});
 });
}
