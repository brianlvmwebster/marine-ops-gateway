import assert from 'node:assert/strict';
const origin=process.env.STAGING_URL;
assert.equal(origin,'https://marine-ops-staging-7esxar6tqa-ue.a.run.app');
const login=await fetch(origin+'/staging/login',{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password:process.env.STAGING_LOGIN_SECRET})});
assert.equal(login.status,303);assert.equal(login.headers.get('location'),'/');
const headers={Cookie:login.headers.get('set-cookie').split(';')[0],Origin:origin,'Content-Type':'application/json'};
async function api(path,data,status=200){const r=await fetch(origin+'/_api/'+path,{headers,...(data?{method:'POST',body:JSON.stringify(data)}:{})});const v=await r.json();assert.equal(r.status,status,v.error);return v;}
try{
 const overview=await api('platform');const company=overview.companies.find(c=>c.slug==='lakeview');assert.equal(company.membership_status,'active');
 const detail=await api('platform/company?companyId='+company.id);assert.equal(detail.activeMember,true);
 for(const key of ['service-desk','customers','dock-builder','parts-inventory'])assert.equal(detail.tools.find(t=>t.key===key).status,'enabled');
 assert.equal((await api('platform/operator')).operator,true);
 const customers=await api('customers?companyId='+company.id);assert.ok(customers.total>0);
 const tools=detail.tools.filter(t=>t.status==='enabled').map(t=>t.key);
 let testCompany=overview.companies.find(c=>c.slug==='home-dashboard-qa');
 if(!testCompany)testCompany=await api('platform/companies',{slug:'home-dashboard-qa',name:'Synthetic Home Dashboard QA'},201);
 const update='platform/company-status?companyId='+testCompany.id;
 await api(update,{status:'suspended',version:testCompany.version});
 await api(update,{status:'active',version:testCompany.version},409);
 const changed=await api('platform/company?companyId='+testCompany.id);assert.equal(changed.company.status,'suspended');assert.equal(changed.activeMember,false);
 await api('customers?companyId='+testCompany.id,undefined,403);
 console.log(JSON.stringify({verified:true,loginDestination:'/',tools,sharedCustomersAvailable:true,operatorControls:true,staleCompanyUpdateRejected:true,otherCompanyDenied:true}));
}finally{await fetch(origin+'/staging/logout',{method:'POST',headers,redirect:'manual'});}
