import React from 'react';
import {Link,useLocation} from 'react-router-dom';
import {useCompanyWorkspace,companyUrl} from './CompanyWorkspace';
import {useAuth} from '../helpers/useAuth';
import AccountMenu from './GatewayAccountMenu';
import {Button} from './Button';
import s from './ServiceDashboard.module.css';
export function CompanySidebar({tab,onTab}:{tab?:string;onTab?:(tab:string)=>void}){
 const workspace=useCompanyWorkspace(),location=useLocation(),{authState}=useAuth();
 if(!workspace)return null;
 const {company,tools,role}=workspace,has=(key:string)=>tools.some(t=>t.key===key);
 const link=(label:string,path:string)=><Button key={label} asChild variant="ghost" className={location.pathname===path.split('?')[0]&&(path.includes('view=units')?location.search.includes('view=units'):path==='/customers'?!location.search.includes('view=units'):true)?s.active:s.nav}><Link to={companyUrl(path,company.id)}>{label}</Link></Button>;
 return <aside className={s.side} aria-label="Company Dashboard navigation"><div className={s.brand}><div>Company Dashboard<small>{company.name}</small></div></div><nav aria-label="Dashboard sections">
 {has('service-desk')&&['Overview','Job queue','Schedule'].map(name=>onTab?<Button key={name} variant="ghost" className={tab===name?s.active:s.nav} onClick={()=>onTab(name)}>{name}</Button>:link(name,'/dashboard?tab='+encodeURIComponent(name)))}
 {has('customers')&&<>{link('Customers','/customers')}{link('Units','/customers?view=units')}</>}
 {has('mapping')&&link('Mapping & Storage','/mapping')}
 {has('dock-builder')&&link('Sales / Dock Builder','/dock-builder')}
 {has('parts-inventory')&&link('Inventory','/inventory/parts')}
 {['owner','admin'].includes(role)&&link('Company administration','/company/admin')}
 </nav><div className={s.sideBottom}>{link('Back to gateway','/')}<AccountMenu email={authState.type==='authenticated'?authState.user.email:undefined}/></div></aside>;
}
