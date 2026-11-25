import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import {platformStore} from './store';
import {LAKEVIEW_ID,PlatformError,requireSameOrigin} from './policy';
import {schedulerContext} from '../scheduler/helpers/dockRecordDb';
import {createRecordJobs,translateRecord} from '../scheduler/helpers/dockRecordJobs';
import {listSchedules,saveSchedule,deleteSchedule,requireOpenSchedule,scheduleId} from '../scheduler/helpers/dockSchedules';
import {validateEntry,entrySource} from '../scheduler/helpers/dockEntry';
import {dockBookingWindow} from '../scheduler/helpers/dockBookingWindow';
import {waterbodies} from '../scheduler/helpers/dockWaterbodies';
dayjs.extend(utc);dayjs.extend(timezone);
const zone='America/New_York';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export async function schedulerBody(r:Request){
 if(!r.headers.get('content-type')?.startsWith('application/json'))throw new PlatformError(415,'Use a JSON request.');
 const reader=r.body?.getReader();if(!reader)throw new PlatformError(400,'Request body required.');const chunks=[];let size=0;
 try{while(true){const p=await reader.read();if(p.done)break;size+=p.value.length;if(size>120000){await reader.cancel();throw new PlatformError(413,'Request too large.');}chunks.push(p.value);}}finally{reader.releaseLock();}
 try{const value=JSON.parse(Buffer.concat(chunks).toString());if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch{throw new PlatformError(400,'Invalid JSON.');}
}
function fail(error:any){const status=Number(error?.status);if(![400,401,403,404,405,409,410,413,415,422,503].includes(status)){console.error('Scheduler request failed:',error?.name,error?.code,error?.constraint,error?.column);return json({error:'Scheduler unavailable. Try again.'},503);}return json({error:error.message},status);}
export function schedulerHandler(sql:any,auth:(r:Request)=>Promise<number>,schema='dock_scheduler_lakeview'){
 if(!/^[a-z][a-z0-9_]*$/.test(schema))throw Error('Invalid scheduler schema');
 const platform=platformStore(sql);
 const access=async(r:Request)=>{let actor;try{actor=await auth(r);}catch{throw new PlatformError(401,'Sign in to Marine Ops.');}if(!Number.isSafeInteger(actor)||actor<=0)throw new PlatformError(401,'Sign in to Marine Ops.');await platform.toolAccess(actor,LAKEVIEW_ID,'dock-scheduler');return actor;};
 return async(r:Request)=>{try{
  const actor=await access(r),url=new URL(r.url),path=url.pathname.split('/').at(-1);
  if(r.method!=='GET')requireSameOrigin(r);
  if(path==='events'&&r.method==='GET'){
   let stop:any,timer:ReturnType<typeof setTimeout>,closed=false;
   const stream=new ReadableStream({async start(controller){
    const close=()=>{if(closed)return;closed=true;clearTimeout(timer);stop?.unlisten();try{controller.close();}catch{}};
    stop=await sql.listen('dock_scheduler_changed',async()=>{try{await access(r);if(!closed)controller.enqueue(new TextEncoder().encode('event: change\ndata: {}\n\n'));}catch{close();}});
    controller.enqueue(new TextEncoder().encode(': connected\n\n'));timer=setTimeout(close,45000);r.signal.addEventListener('abort',close,{once:true});if(closed)stop.unlisten();
   },cancel(){closed=true;clearTimeout(timer);stop?.unlisten();}});
   return new Response(stream,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-store','X-Accel-Buffering':'no'}});
  }
  if(path==='session'&&r.method==='GET')return json({authenticated:true,mode:'marine-ops'});
  if(['session','sync','gateway_launch','address'].includes(path??''))throw new PlatformError(403,'This external integration is disabled in staging.');
  if(!['GET','POST'].includes(r.method))throw new PlatformError(405,'Method not allowed.');
  const input=r.method==='POST'?await schedulerBody(r):{},action=url.searchParams.get('_action');
  let mutated=false;
  const result=await sql.begin(async(tx:any)=>{
   await tx.unsafe(`SET LOCAL search_path=${schema},public`);
   return schedulerContext.run(tx,async()=>{
    const jobs=createRecordJobs({database:()=>tx});let data:any;
    const availability=async(schedule:any,date:string,duration:number)=>{
     if(!/^\d{4}-\d{2}-\d{2}$/.test(date??'')||!Number.isInteger(duration)||duration<30||duration>480||duration%30)throw new PlatformError(400,'Choose a date and a duration from 30 minutes to 8 hours.');
     const day=dayjs.tz(date+'T00:00:00',zone);if(!day.isValid()||day.format('YYYY-MM-DD')!==date)throw new PlatformError(400,'Invalid date.');
     const window=dockBookingWindow(schedule.booking_window);const rows=await tx`select * from scheduler_jobs where schedule_id=${schedule.id} and deleted_at is null`;
     const intervals=rows.map((row:any)=>{const job=translateRecord(row);if(!job.appointmentDate||!Number.isFinite(job.appointmentTimeMinutes))return null;const hours=String(Math.floor(job.appointmentTimeMinutes/60)).padStart(2,'0'),mins=String(job.appointmentTimeMinutes%60).padStart(2,'0');const start=dayjs.tz(job.appointmentDate+'T'+hours+':'+mins+':00',zone).valueOf();return {start,end:start+(Number(row.data._MarineOpsDuration)||120)*60000};}).filter(Boolean);
     const slots=[];if(window.days.includes(day.day())){const begin=dayjs.tz(date+'T'+window.start+':00',zone),end=dayjs.tz(date+'T'+window.end+':00',zone);for(let start=begin;start.add(duration,'minute').valueOf()<=end.valueOf();start=start.add(30,'minute')){const a=start.valueOf(),b=a+duration*60000;if(a>Date.now()&&!intervals.some((i:any)=>a<i.end&&b>i.start))slots.push({start:start.toISOString(),label:start.format('h:mm A')});}}
     return {slots,checkedAt:new Date().toISOString(),bookingWindow:window};
    };
    if(path==='jobs'&&r.method==='POST'){
     if(!Array.isArray(input.args)||input.args.length>5)throw new PlatformError(400,'Invalid action arguments.');
     if(input.action==='getLocations')data={...await jobs.getLocations(),migrationReview:false,calendarMode:'local'};
     else{const allowed:any={setNotes:()=>jobs.setNotes(input.identity,input.args[1]),setPhotos:()=>jobs.setPhotos(input.identity,input.args[1]),setBodyOfWater:()=>jobs.setBodyOfWater(input.identity,input.args[1]),setCompleted:()=>jobs.setCompleted(input.identity,input.args[1],input.args[2],input.args[3])};if(!allowed[input.action])throw new PlatformError(400,'Action unavailable. Address geocoding is disconnected in staging.');data=await allowed[input.action]();mutated=true;}
    }else if(path==='entries'){
     if(r.method==='GET')data=await jobs.getEntry(url.searchParams.get('jobId'));
     else if(action==='edit'){data=await jobs.editEntry(input.identity,input.fields,input.requestId);mutated=true;}
     else if(action==='delete'){if(input.confirmed!==true)throw new PlatformError(400,'Confirm Delete job.');const deletion=await jobs.beginDeletion(input.identity,input.requestId);data=deletion.alreadyDeleted?{deleted:true,alreadyDeleted:true,jobId:deletion.job.jobId}:await jobs.finishDeletion(deletion.job.jobId,input.requestId);mutated=true;}
     else if(action)throw new PlatformError(400,'Unknown action.');
     else{
      const entry=validateEntry(input),id=scheduleId(input.scheduleId);await tx`select id from scheduler_schedules where id=${id} for update`;const schedule=await requireOpenSchedule(id,tx);
      const start=dayjs(entry.start).tz(zone),source={...entrySource(entry,start.format('dddd, MMMM D, YYYY h:mm A')),_MarineOpsDuration:entry.duration,_MarineOpsAppointmentTitle:entry.appointmentTitle??''};
      const previous=await jobs.findEntry(source['Submission ID']);
      if(!previous){const available=await availability(schedule,start.format('YYYY-MM-DD'),entry.duration);if(!available.slots.some(s=>s.start===entry.start))throw new PlatformError(409,'This time is no longer available. Choose another time.');}
      const job=await jobs.addEntry(source,null,id);data={job,alreadySaved:!!previous,calendarMode:'local'};mutated=true;
     }
    }else if(path==='schedules'){
     if(r.method==='GET')data={schedules:await listSchedules(tx)};
     else{if(input.action==='calendar')throw new PlatformError(403,'Outlook settings are disabled in staging.');data=action==='delete'?await deleteSchedule(input,tx):{schedule:await saveSchedule(input,tx)};mutated=true;}
    }else if(path==='calendar'&&r.method==='GET'){
     if(url.searchParams.has('action')&&url.searchParams.get('action')!=='availability')throw new PlatformError(403,'Outlook is disconnected in staging.');
     const schedule=await requireOpenSchedule(url.searchParams.get('scheduleId'),tx);
     data=url.searchParams.get('action')==='availability'?await availability(schedule,url.searchParams.get('date')!,Number(url.searchParams.get('duration'))):{connected:true,mode:'local',name:schedule.name,timeZone:zone,mailbox:'Marine Ops local schedule',bookingWindow:dockBookingWindow(schedule.booking_window)};
    }else if(path==='outlook_settings'&&r.method==='POST'){
     const id=scheduleId(input.id),window=dockBookingWindow(input.bookingWindow);const [schedule]=await tx`update scheduler_schedules set booking_window=${tx.json(window)} where id=${id} and not archived and deleted_at is null returning *`;if(!schedule)throw new PlatformError(409,'Choose an active schedule.');data={schedule};mutated=true;
    }else if(path==='waterbodies'&&r.method==='GET')data={waterbodies:waterbodies.options};
    else if(path==='records'&&r.method==='GET')data=await jobs.exportRecords();
    else throw new PlatformError(403,'This integration or action is disabled in staging.');
    if(mutated){await tx`insert into platform_audit(actor_user_id,company_id,action,detail) values(${actor},${LAKEVIEW_ID},'scheduler.changed',${tx.json({path,action:input.action??action??'save'})})`;await tx`select pg_notify('dock_scheduler_changed','changed')`;}
    return data;
   });
  });
  const response=json(result);if(path==='records')response.headers.set('Content-Disposition','attachment; filename="dock-crew-records.json"');return response;
 }catch(error){return fail(error);}};
}
