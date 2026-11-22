import {defineScreens} from '@floot/examples';
import {emptyJob,type Job} from '../helpers/jobModel';
import type {OutputType} from '../endpoints/jobs_GET.schema';

const job:Job={id:'00000000-0000-4000-8000-000000000001',jobNumber:'1234',version:1,eventId:null,syncedVersion:0,syncError:null,remoteEtag:null,updatedAt:new Date('2026-11-14T12:00:00Z'),data:{...emptyJob,ro:'RO-12345',returnType:'Deliver to Customer',returnAddress:"Street name: Main Street\r\nHouse number: 123\r\nCity: Webster\r\nState: MA\r\nZip: 01570",firstName:'Sample',lastName:'Customer',phone:'555-0100',email:'sample@example.com',year:'2024',make:'Sample Marine',model:'Cruiser',engine:'Outboard',serviceDate:'2026-11-14',services:['Winterization'],checklist:[{label:'Inspect vessel and record condition',done:false},{label:'Complete requested winterization',done:false}]}};
const jobs:OutputType={jobs:[job]};
export default defineScreens({
 backend:{jobs_GET:jobs,'auth/session_GET':{error:'Not signed in'}},
 screens:[
  {title:'Job sheet',route:'/jobs/'+job.id+'/print'},
  {title:'Service checklist',route:'/jobs/'+job.id+'/print?mode=checklist'}
 ]
});