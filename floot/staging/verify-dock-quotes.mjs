import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const origin=process.env.STAGING_URL;assert.equal(origin,'https://marine-ops-staging-7esxar6tqa-ue.a.run.app');
const company='00000000-0000-4000-8000-000000000001';
const login=await fetch(origin+'/staging/login',{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password:process.env.STAGING_LOGIN_SECRET})});assert.equal(login.status,303);
const headers={Cookie:login.headers.get('set-cookie').split(';')[0],Origin:origin,'Content-Type':'application/json'};
async function api(path,data,status=200){const r=await fetch(origin+'/_api/'+path,{headers,...(data?{method:'POST',body:JSON.stringify(data)}:{})});const v=await r.json();assert.equal(r.status,status,v.error);return v;}
try{
 const found=await api('customers?companyId='+company+'&q=picker-qa%40example.invalid');assert.equal(found.rows.length,1);
 const customer=(await api('customers/detail?companyId='+company+'&id='+found.rows[0].id)).customer;
 if(process.argv.includes('--verify-customer-launch')){
  const context=await api('customers/quote-context?companyId='+company+'&id='+customer.id);assert.equal(context.customer.email,customer.email);
  await api('customers/quote-context?companyId='+company+'&id='+randomUUID(),undefined,404);
  const quotes=(await api('dock-quotes?q=Customer%20Record%20Dock%20Quote%20QA')).quotes;assert.equal(quotes.length,1);
  const quote=await api('dock-quotes?id='+quotes[0].id);
  assert.equal(quote.customer_id,customer.id);assert.equal(quote.contact.email,customer.email);assert.equal(quote.contact.phone,customer.mobile_phone);
  assert.equal(quote.contact.name,[customer.first_name,customer.last_name].filter(Boolean).join(' '));assert.equal(quote.document.configuration.customerName,quote.contact.name);
  assert.ok((await api('customers/detail?companyId='+company+'&id='+customer.id)).quotes.some(q=>q.id===quote.id));
  console.log('PASS: customer-launched quote retains customer link, autofilled contact snapshot and document name, and appears on the customer record.');
 }else if(process.argv.includes('--verify-browser')){
  const quotes=(await api('dock-quotes?q=Browser%20Dock%20QA')).quotes;assert.ok(quotes.length);
  const quote=await api('dock-quotes?id='+quotes[0].id);
  assert.equal(quote.customer_id,customer.id);assert.equal(quote.contact.email,customer.email);assert.equal(quote.contact.phone,customer.mobile_phone);
  assert.ok(quote.document.configuration.items.length>0,'Browser quote retains layout components');
  assert.ok(quote.document.configuration.worksheet,'Browser quote retains worksheet');
  assert.ok((await api('customers/detail?companyId='+company+'&id='+customer.id)).quotes.some(q=>q.id===quote.id));
  console.log('PASS: browser-created quote preserves customer link, contact snapshot, layout and worksheet and appears on customer record.');
 }else{
  const name=[customer.first_name,customer.last_name].filter(Boolean).join(' ');
  const input={id:randomUUID(),version:0,customerId:customer.id,name:'Synthetic API Dock QA',contact:{name,email:customer.email,phone:customer.mobile_phone,address:''},document:{schemaVersion:1,widthIn:480,heightIn:840,shoreline:'natural',customerName:name,items:[]}};
  assert.equal((await api('dock-quotes',input)).version,1);
  assert.equal((await api('dock-quotes?id='+input.id)).customer_id,customer.id);
  assert.equal((await api('dock-quotes',{...input,version:1})).version,2);
  await api('dock-quotes',{...input,version:1},409);
  await api('dock-quotes',{...input,id:randomUUID(),customerId:randomUUID()},404);
  const r=await fetch(origin+'/_api/dock_builder/asset?file=index.html',{headers});assert.equal(r.status,200);assert.equal(r.headers.get('x-frame-options'),'SAMEORIGIN');assert.match(await r.text(),/customer-quotes.js/);
  assert.equal((await fetch(origin+'/_api/dock-quotes')).status,401);
  console.log('PASS: shared quote save/reload/update, stale-write and invalid-customer rejection, authenticated same-origin editor.');
 }
}finally{await fetch(origin+'/_api/auth/logout',{method:'POST',headers,body:'{}'});}
