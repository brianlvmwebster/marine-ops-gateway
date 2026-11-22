import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LAKEVIEW_ID,requireTool,requireManager,validateMembershipChange} from '../platform/policy.ts';
import {platformHandler} from '../platform/http.ts';
const access={company_id:LAKEVIEW_ID,company_status:'active',status:'active',role:'member'};
const tool={available:true,status:'enabled',rollout_company_id:LAKEVIEW_ID};
test('tool requires active company, membership, entitlement and rollout match',()=>{
  assert.equal(requireTool(access,tool),access);
  for(const row of [undefined,{...access,status:'suspended'},{...access,company_status:'suspended'},{...access,company_id:'other'}])assert.throws(()=>requireTool(row,tool));
  for(const row of [undefined,{...tool,status:'disabled'},{...tool,available:false}])assert.throws(()=>requireTool(access,row));
});
test('members cannot manage; administrators cannot promote or edit owners',()=>{
  assert.throws(()=>requireManager(access));
  assert.throws(()=>validateMembershipChange('admin','owner','member'));
  assert.throws(()=>validateMembershipChange('admin','member','owner'));
  assert.throws(()=>validateMembershipChange('member','member','admin'));
  validateMembershipChange('owner','member','owner');
});
test('HTTP authenticates, checks origin and validates strict input before mutation',async()=>{
  let calls=0;
  const store={overview:async id=>({userId:id}),setMembership:async()=>{calls++;return {saved:true};}};
  const handler=platformHandler(store,async()=>7);
  const url='https://marine.example/_api/platform/memberships?companyId='+LAKEVIEW_ID;
  const payload={email:'person@example.invalid',role:'member',status:'active',version:0};
  const request=(data,origin='https://marine.example')=>new Request(url,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(data)});
  assert.equal((await handler(request(payload,'https://evil.example'))).status,403);
  assert.equal((await handler(request({...payload,actor:1}))).status,400);
  assert.equal((await handler(request({...payload,role:'operator'}))).status,400);
  assert.equal((await handler(request({...payload,email:'x'.repeat(9000)}))).status,413);
  assert.equal(calls,0);
  assert.equal((await handler(request(payload))).status,200);
  assert.equal(calls,1);
  const denied=platformHandler(store,async()=>{throw Error('private details');});
  const result=await denied(new Request('https://marine.example/_api/platform'));
  assert.equal(result.status,401);assert.equal(result.headers.get('cache-control'),'no-store');
  assert.equal((await result.json()).error,'Sign in to continue.');
});
