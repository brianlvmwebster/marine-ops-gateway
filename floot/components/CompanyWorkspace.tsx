import React,{createContext,useContext,useEffect,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {useAuth} from '../helpers/useAuth';
import './CompanyWorkspace.css';
import {CompanySidebar} from './CompanySidebar';
import styles from './ServiceDashboard.module.css';

type Tool={key:string;name:string;path:string;available:boolean;status:string;rollout_company_id:string|null};
type Company={id:string;name:string;status:string;membership_status:string};
type Workspace={company:Company;companies:Company[];tools:Tool[];role:string;operator:boolean};
const Context=createContext<Workspace|null>(null);
export const useCompanyWorkspace=()=>useContext(Context);
export const companyUrl=(path:string,id:string)=>path+(path.includes('?')?'&':'?')+'companyId='+encodeURIComponent(id);
export function CompanyWorkspace({children}:{children:React.ReactNode}){
 const {authState}=useAuth(),location=useLocation();
 const [workspace,setWorkspace]=useState<Workspace|null>(null),[error,setError]=useState('');
 const requested=new URLSearchParams(location.search).get('companyId');
 const standalone=location.pathname==='/platform'||location.pathname==='/login'||location.pathname==='/sign-in'||location.pathname.endsWith('/print');
 useEffect(()=>{
  if(authState.type!=='authenticated'||standalone){setWorkspace(null);return;}
  const controller=new AbortController();setWorkspace(null);setError('');
  async function read(path:string){const response=await fetch('/_api/platform'+path,{signal:controller.signal});const value=await response.json();if(!response.ok)throw Error(value.error||'Company access unavailable.');return value;}
  void (async()=>{
   const overview=await read('');const companies:Company[]=overview.companies.filter((c:Company)=>c.status==='active'&&c.membership_status==='active');
   let saved='';try{saved=sessionStorage.getItem('marineops.company')||'';}catch{}
   const company=requested?companies.find(c=>c.id===requested):companies.find(c=>c.id===saved)||companies[0];
   if(!company)throw Error('No active membership for this company. Contact your company administrator.');
   const detail=await read('/company?companyId='+company.id);
   if(!detail.activeMember)throw Error('Company access unavailable.');
   if(controller.signal.aborted)return;
   try{sessionStorage.setItem('marineops.company',company.id);}catch{}
   setWorkspace({company,companies,role:detail.role,operator:overview.operator,tools:detail.tools.filter((t:Tool)=>t.available&&t.status==='enabled'&&(!t.rollout_company_id||t.rollout_company_id===company.id))});
  })().catch(e=>{if(!controller.signal.aborted)setError(e.message);});
  return()=>controller.abort();
 },[authState.type,requested,standalone]);
 if(standalone||authState.type!=='authenticated')return <>{children}</>;
 if(error)return <main className="company-workspace-error"><h1>Company access</h1><p role="alert">{error}</p><a href="/">Choose your company</a> · <a href="/platform">Platform administration</a></main>;
 if(!workspace)return <p role="status">Loading company workspace…</p>;
 const {company,tools,role}=workspace,has=(key:string)=>tools.some(t=>t.key===key);
 const required=location.pathname.startsWith('/dockscheduler')?'dock-scheduler':['/maps','/mapping'].includes(location.pathname)?'mapping':location.pathname.startsWith('/customers')?'customers':location.pathname.startsWith('/inventory')?'parts-inventory':location.pathname.startsWith('/dock-builder')?'dock-builder':location.pathname.startsWith('/dashboard')?'service-desk':null;
 const page=required&&!has(required)?<main><h1>Tool unavailable</h1><p>This tool is not enabled for your company.</p></main>:children;
 const insideDashboard=['/customers','/inventory/parts','/company/admin','/dock-builder','/maps','/mapping','/dockscheduler','/dockscheduler/add-job'].includes(location.pathname);
 return <Context.Provider value={workspace}>{insideDashboard?<div className={styles.app+' company-dashboard-shell'}><CompanySidebar/><div className={styles.main+' company-content'}>{page}</div></div>:page}</Context.Provider>;
}
