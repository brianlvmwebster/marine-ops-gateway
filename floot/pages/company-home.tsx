import React from 'react';
import {Link} from 'react-router-dom';
import {NativeGatewayGuard} from '../components/NativeGatewayGuard';
import {useCompanyWorkspace,companyUrl} from '../components/CompanyWorkspace';
import AccountMenu from '../components/GatewayAccountMenu';
import {useAuth} from '../helpers/useAuth';
import {isGatewayOnlyTool} from '../helpers/gatewayToolDestinations';
export default function CompanyHome(){
 const workspace=useCompanyWorkspace(),{authState}=useAuth();
 const has=(key:string)=>workspace?.tools.some(t=>t.key===key);
 return <NativeGatewayGuard>{workspace&&<main className="company-gateway"><header><div><h1>{workspace.company.name} gateway</h1><p>Choose a tool to get started.</p></div><AccountMenu email={authState.type==='authenticated'?authState.user.email:undefined}/></header>
 {workspace.companies.length>1&&<label>Company<select value={workspace.company.id} onChange={e=>{window.location.href=companyUrl('/',e.target.value);}}>{workspace.companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
 <nav className="gateway-tool-grid" aria-label="Gateway tools">
 {has('service-desk')&&<Link className="gateway-tool-card" to={companyUrl('/dashboard',workspace.company.id)}><strong>Company Dashboard</strong><span>Your customizable home for customers, service, sales and inventory.</span><span>Open dashboard →</span></Link>}
 {has('dock-builder')&&<Link className="gateway-tool-card" to={companyUrl('/dock-builder',workspace.company.id)}><strong>Dock Builder</strong><span>Design docks and manage customer quotes.</span><span>Open Dock Builder →</span></Link>}
 {has('dock-scheduler')&&<Link className="gateway-tool-card" to={companyUrl('/dockscheduler',workspace.company.id)}><strong>Dock Crew Scheduler</strong><span>Book crew appointments and track job progress.</span><span>Open scheduler →</span></Link>}
 {has('mapping')?<Link className="gateway-tool-card" to={companyUrl('/mapping',workspace.company.id)}><strong>Mapping Tool</strong><span>Maps, locations and spreadsheet templates.</span><span>Open mapping →</span></Link>:<div className="gateway-tool-card gateway-tool-unavailable" aria-disabled="true"><strong>Mapping Tool</strong><span>Not enabled for this company.</span></div>}
 {workspace.tools.filter(t=>!isGatewayOnlyTool(t.key)&&!['service-desk','customers','parts-inventory'].includes(t.key)).map(t=><Link className="gateway-tool-card" key={t.key} to={companyUrl(t.path,workspace.company.id)}><strong>{t.name}</strong><span>Open tool →</span></Link>)}
 </nav>{!has('service-desk')&&<p>Company Dashboard is not enabled for this company.</p>}</main>}</NativeGatewayGuard>;
}
export const CompanyTools=CompanyHome;
