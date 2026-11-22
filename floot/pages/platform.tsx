import React, {useEffect, useState} from 'react';
import './platform.css';

type Company = {id:string; name:string; status:string};
type Member = {user_id:number; email:string; role:string; status:string; version:number};
type Tool = {key:string; name:string; path:string; available:boolean; rollout_company_id:string|null; status:string; version:number};
type Detail = {company:Company; role:string|null; activeMember:boolean; canManage:boolean; operator:boolean; members:Member[]; tools:Tool[]};
async function api(path:string, data?:unknown, signal?:AbortSignal) {
  const response=await fetch('/_api/platform'+path,{credentials:'same-origin',signal,...(data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})});
  const result=await response.json();
  if(!response.ok) throw new Error(result.error || 'Request failed.');
  return result;
}
export default function Platform() {
  const [overview,setOverview]=useState<{operator:boolean;companies:Company[]}|null>(null);
  const [companyId,setCompanyId]=useState('');
  const [error,setError]=useState('');
  const [revision,setRevision]=useState(0);
  useEffect(()=>{const controller=new AbortController();api('',undefined,controller.signal).then(value=>{setOverview(value);setCompanyId(id=>id||value.companies[0]?.id||'');}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[revision]);
  return <main className="platform-page"><nav><a href="/">MarineOps home</a> · <a href="/login">Sign in</a></nav><h1>Company workspace</h1>
    <p>Manage your company’s people and tools.</p>{error && <p role="alert">{error}</p>}
    {!overview && !error && <p role="status">Loading companies…</p>}
    {overview && <><label>Company <select value={companyId} onChange={e=>setCompanyId(e.target.value)}><option value="" disabled>Select a company</option>{overview.companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    {!overview.companies.length && <p>No company memberships yet. Contact your company administrator.</p>}
    {companyId && <CompanyPanel key={companyId} companyId={companyId}/>}
    {overview.operator && <section><h2>Add a customer company</h2><CreateCompany onCreated={()=>setRevision(n=>n+1)}/></section>}</>}
  </main>;
}
function CreateCompany({onCreated}:{onCreated:()=>void}) {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  return <form onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;const data=new FormData(form);setBusy(true);setMessage('');try{await api('/companies',{name:data.get('name'),slug:data.get('slug')});form.reset();setMessage('Company created. Select it to add its first owner.');onCreated();}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}}>
    <label>Company name<input name="name" required maxLength={120}/></label><label>Company address<input name="slug" required maxLength={60} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="example-marina"/></label><button disabled={busy}>Create company</button><p role="status">{message}</p>
  </form>;
}
function CompanyPanel({companyId}:{companyId:string}) {
  const [detail,setDetail]=useState<Detail|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
  useEffect(()=>{const controller=new AbortController();setDetail(null);api('/company?companyId='+companyId,undefined,controller.signal).then(setDetail).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[companyId,revision]);
  async function save(path:string,data:unknown){setBusy(true);setError('');try{await api(path+'?companyId='+companyId,data);setRevision(n=>n+1);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <section aria-busy={busy}><p role="alert">{error}</p><button type="button" disabled={busy} onClick={()=>{setError('');setRevision(n=>n+1);}}>Refresh</button>{!detail ? <p role="status">{error?'Unable to load company.':'Loading company…'}</p> : <>
    <h2>{detail.company.name}</h2><p>Company status: {detail.company.status}</p><h3>Tools</h3>
    {detail.tools.map(tool=>{const ready=tool.available&&(!tool.rollout_company_id||tool.rollout_company_id===companyId);return <article key={tool.key}><h4>{tool.name}</h4><p>{ready?tool.status:'Not available for this company yet'}</p>
      {ready&&tool.status==='enabled'&&detail.activeMember&&<a href={tool.path}>Open {tool.name}</a>}
      {detail.operator&&<button disabled={busy||(!ready&&tool.status!=='enabled')} onClick={()=>save('/entitlements',{toolKey:tool.key,status:tool.status==='enabled'?'disabled':'enabled',version:tool.version})}>{tool.status==='enabled'?'Disable':'Enable'} {tool.name}</button>}</article>;})}
    {detail.canManage && <><h3>Members</h3><p>Add people who have already registered. Owners manage administrators; only platform operators enable tools.</p>
      {detail.members.map(member=><MemberForm key={member.user_id+':'+member.version} member={member} busy={busy} canOwn={detail.operator||detail.role==='owner'} save={save}/>)}
      <h4>Add member</h4><MemberForm busy={busy} canOwn={detail.operator||detail.role==='owner'} save={save}/></>}
  </>}</section>;
}
function MemberForm({member,busy,canOwn,save}:{member?:Member;busy:boolean;canOwn:boolean;save:(path:string,data:unknown)=>Promise<void>}) {
  return <form onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);void save('/memberships',{email:data.get('email'),role:data.get('role'),status:data.get('status'),version:member?.version||0});}}><fieldset disabled={busy||(!canOwn&&member?.role==='owner')}>
    <legend>{member?.email||'New member'}</legend><label>Email<input name="email" type="email" required maxLength={254} defaultValue={member?.email||''} readOnly={!!member}/></label>
    <label>Role<select name="role" defaultValue={member?.role||'member'}><option value="member">Member</option><option value="admin">Administrator</option>{(canOwn||member?.role==='owner')&&<option value="owner">Owner</option>}</select></label>
    <label>Status<select name="status" defaultValue={member?.status||'active'}><option value="active">Active</option><option value="suspended">Suspended</option></select></label><button>Save member</button>
  </fieldset></form>;
}
