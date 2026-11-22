import {readFile} from 'node:fs/promises';
import {stagingOnly} from './config.ts';
import {platformDatabase} from '../platform/database.ts';
import {emptyJob,jobModel} from '../helpers/jobModel';
stagingOnly();
const db=platformDatabase();
try {
 const connection=await db.reserve();
 try {
  await connection.unsafe(await readFile(new URL('./000-baseline.sql',import.meta.url),'utf8'));
  for(const name of ['001-assignment-directory','002-dashboard-cards-admin-review','003-gateway-service-access','004-native-floot-gateway','005-dashboard-columns'])
   await connection.unsafe(await readFile(new URL('../migrations/'+name+'.sql',import.meta.url),'utf8'));
  await connection`insert into users(email,display_name,role) values('owner@staging.example.invalid','Lakeview Test Owner','admin'),('member@staging.example.invalid','Lakeview Test Member','user') on conflict(email) do nothing`;
  await connection`insert into native_gateway_members(email,role,enabled,service_user_id,auth_user_id) select email,role,true,'staging:'||id,id from users on conflict(email) do nothing`;
  await connection.unsafe(await readFile(new URL('../migrations/007-platform-foundation.sql',import.meta.url),'utf8'));
  await connection`insert into platform_operators(user_id) select id from users where email='owner@staging.example.invalid' on conflict do nothing`;
  await connection`insert into service_access_roles(user_id,role) select 'staging:'||id,'service_admin' from users where email='owner@staging.example.invalid' on conflict do nothing`;
  await connection`insert into native_gateway_links(id,contents) values(1,'[{"id":"service-desk","title":"Service Desk","url":"/dashboard/","description":"Synthetic staging jobs only","image":"","newTab":false,"slug":"service-management"}]') on conflict do nothing`;
  const sample=jobModel.parse({...emptyJob,firstName:'Sample',lastName:'Customer',phone:'202-555-0142',email:'sample@example.invalid',year:'2024',make:'Test Marine',model:'Demo 20',engine:'Test engine',serviceDate:'2026-12-01',services:['Winterization'],notes:'SYNTHETIC STAGING RECORD — not a real customer or work order.'});
  await connection`insert into service_jobs(id,data,calendar_eligible) values('00000000-0000-4000-8000-000000000101',${connection.json(sample)},false) on conflict(id) do nothing`;
 }finally{connection.release();}
 console.log('Synthetic staging schema and Lakeview test identities ready. No production data imported.');
}finally{await db.end();}
