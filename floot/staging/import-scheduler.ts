import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {stagingOnly} from './config';
import {platformDatabase} from '../platform/database';
stagingOnly();
const object=process.env.SCHEDULER_IMPORT_OBJECT;
if(object!=='marine-ops-staging-build-source-914300457968/migrations/scheduler-20261125.json.gz')throw Error('Unexpected private import object');
const tokenResponse=await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',{headers:{'Metadata-Flavor':'Google'}});if(!tokenResponse.ok)throw Error('Runtime identity unavailable');
const {access_token}=await tokenResponse.json() as any;
const bucket=object.split('/')[0],name=object.slice(bucket.length+1);
const response=await fetch('https://storage.googleapis.com/storage/v1/b/'+bucket+'/o/'+encodeURIComponent(name)+'?alt=media',{headers:{Authorization:'Bearer '+access_token}});if(!response.ok)throw Error('Private import download failed');
const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>10000000||createHash('sha256').update(bytes).digest('hex')!==process.env.SCHEDULER_IMPORT_SHA256)throw Error('Import checksum mismatch');
const bundle=JSON.parse(gunzipSync(bytes,{maxOutputLength:20000000}).toString());
const tables=['scheduler_imports','scheduler_schedules','scheduler_jobs','scheduler_record_state'];
for(const table of tables)if(!Array.isArray(bundle.tables[table])||!/^[a-f0-9]{32}$/.test(bundle.hashes[table]))throw Error('Invalid source snapshot');
const db=platformDatabase();try{
 await db.begin(async tx=>{
  await tx.unsafe('SET LOCAL search_path=dock_scheduler_lakeview,public');
  await tx.unsafe('LOCK TABLE scheduler_jobs,scheduler_imports,scheduler_schedules,scheduler_record_state IN ACCESS EXCLUSIVE MODE');
  for(const table of tables){const [count]=await tx.unsafe('select count(*)::int n from '+table);if(count.n)throw Error('Target contains records; refusing overwrite');}
  for(const table of tables){await tx`insert into ${tx(table)} select * from jsonb_populate_recordset(null::${tx(table)},${tx.json(bundle.tables[table])})`;
   const order=table==='scheduler_record_state'?'singleton':'id';
   const [verified]=await tx.unsafe('select md5(jsonb_agg(to_jsonb(t) order by '+order+')::text) as hash from '+table+' t');
   if(verified.hash!==bundle.hashes[table])throw Error('Stored row checksum mismatch: '+table);
  }
  await tx`select setval(pg_get_serial_sequence('scheduler_jobs','sequence_id'),(select max(sequence_id) from scheduler_jobs),true)`;
  await tx`insert into public.platform_audit(actor_user_id,company_id,action,detail) select id,'00000000-0000-4000-8000-000000000001','scheduler.imported',${tx.json({counts:Object.fromEntries(tables.map(t=>[t,bundle.tables[t].length])),hashes:bundle.hashes})} from public.users where email='owner@staging.example.invalid'`;
 });
 console.log(JSON.stringify({verified:true,counts:Object.fromEntries(tables.map(t=>[t,bundle.tables[t].length])),hashes:bundle.hashes}));
}catch(error){console.error('Scheduler import failed:',error instanceof Error?error.name:'unknown');throw new Error('Scheduler import failed; transaction rolled back.');}finally{await db.end();}
