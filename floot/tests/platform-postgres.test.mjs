import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import postgres from 'postgres';
import {platformStore} from '../platform/store.ts';
import {LAKEVIEW_ID} from '../platform/policy.ts';

test('PostgreSQL foundation: isolation, revocation, roles, concurrency and audit', {skip:!process.env.TEST_DATABASE_URL},async()=>{
  // Dedicated disposable CI database only; never use DATABASE_URL or production credentials.
  const sql=postgres(process.env.TEST_DATABASE_URL,{max:5,onnotice:()=>{}});
  const schema='test_platform_'+Date.now();
  try{
    await sql.unsafe(`create schema ${schema}`);
    await sql.end();
    const db=postgres(process.env.TEST_DATABASE_URL,{max:5,connection:{search_path:schema},onnotice:()=>{}});
    try{
      await db`create table users(id integer primary key,email text,display_name text)`;
      await db`create table native_gateway_members(auth_user_id integer,role text,enabled boolean,service_user_id text)`;
      await db`insert into users values(1,'owner@example.invalid','Owner'),(2,'admin@example.invalid','Admin'),(3,'member@example.invalid','Member'),(4,'operator@example.invalid','Operator'),(5,'other@example.invalid','Other')`;
      await db`insert into native_gateway_members values(1,'admin',true,'legacy-owner'),(2,'user',true,'legacy-admin'),(3,'user',true,'legacy-member')`;
      const migration=await readFile(new URL('../migrations/007-platform-foundation.sql',import.meta.url),'utf8');
      async function migrate(){const connection=await db.reserve();try{await connection.unsafe(migration);}finally{connection.release();}}
      await migrate();await migrate();
      const store=platformStore(db);
      assert.equal((await store.overview(1)).operator,false);
      assert.equal((await store.company(1,LAKEVIEW_ID)).members.length,3);
      await store.legacyServiceAccess('legacy-owner');
      await assert.rejects(store.createCompany(1,{slug:'blocked',name:'Blocked'}),{status:403});
      await db`insert into platform_operators(user_id) values(4)`;
      const other=await store.createCompany(4,{slug:'other',name:'Other'});
      await assert.rejects(store.company(1,other.id),{status:403});
      await assert.rejects(store.toolAccess(4,LAKEVIEW_ID,'service-desk'),{status:403});
      await assert.rejects(store.setEntitlement(4,other.id,{toolKey:'service-desk',status:'enabled',version:0}),{status:409});
      await store.setMembership(1,LAKEVIEW_ID,{email:'admin@example.invalid',role:'admin',status:'active',version:1});
      await assert.rejects(store.setMembership(2,LAKEVIEW_ID,{email:'member@example.invalid',role:'owner',status:'active',version:1}),{status:403});
      await assert.rejects(store.setMembership(2,LAKEVIEW_ID,{email:'owner@example.invalid',role:'member',status:'active',version:1}),{status:403});
      await assert.rejects(store.setMembership(3,other.id,{email:'other@example.invalid',role:'owner',status:'active',version:0}),{status:403});
      await assert.rejects(store.setEntitlement(1,LAKEVIEW_ID,{toolKey:'service-desk',status:'disabled',version:1}),{status:403});
      await store.setEntitlement(4,LAKEVIEW_ID,{toolKey:'service-desk',status:'disabled',version:1});
      await assert.rejects(store.legacyServiceAccess('legacy-owner'),{status:403});
      await store.setEntitlement(4,LAKEVIEW_ID,{toolKey:'service-desk',status:'enabled',version:2});
      await store.setMembership(1,LAKEVIEW_ID,{email:'member@example.invalid',role:'member',status:'suspended',version:1});
      await assert.rejects(store.legacyServiceAccess('legacy-member'),{status:403});
      const count=Number((await db`select count(*) from platform_audit`)[0].count);
      await assert.rejects(store.setMembership(1,LAKEVIEW_ID,{email:'member@example.invalid',role:'member',status:'active',version:1}),{status:409});
      assert.equal(Number((await db`select count(*) from platform_audit`)[0].count),count);
      await assert.rejects(store.setMembership(1,LAKEVIEW_ID,{email:'owner@example.invalid',role:'member',status:'active',version:1}),{status:409});
      await store.setMembership(1,LAKEVIEW_ID,{email:'admin@example.invalid',role:'owner',status:'active',version:2});
      const results=await Promise.allSettled([
        store.setMembership(4,LAKEVIEW_ID,{email:'owner@example.invalid',role:'member',status:'active',version:1}),
        store.setMembership(4,LAKEVIEW_ID,{email:'admin@example.invalid',role:'member',status:'active',version:3})]);
      assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
      assert.equal(Number((await db`select count(*) from platform_memberships where role='owner' and status='active'`)[0].count),1);
      await db`update platform_companies set status='suspended' where id=${LAKEVIEW_ID}`;
      await assert.rejects(store.legacyServiceAccess('legacy-owner'),{status:403});
      await migrate();
      assert.equal((await db`select status from platform_memberships where user_id=3`)[0].status,'suspended');
    }finally{await db.end();}
  }finally{
    const cleanup=postgres(process.env.TEST_DATABASE_URL,{onnotice:()=>{}});
    await cleanup.unsafe(`drop schema if exists ${schema} cascade`);await cleanup.end();
  }
});
