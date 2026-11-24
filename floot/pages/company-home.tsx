import React from 'react';
import {NativeGatewayGuard} from '../components/NativeGatewayGuard';
import {useCompanyWorkspace,companyUrl} from '../components/CompanyWorkspace';
import Dashboard from './dashboard';
export default function CompanyHome(){const workspace=useCompanyWorkspace();return <NativeGatewayGuard>{workspace&&<><section className="company-home-intro"><h1>Home Dashboard</h1><p>{workspace.company.name} · Shared customers, service, sales, inventory and company administration.</p></section>{workspace.tools.some(t=>t.key==='service-desk')?<Dashboard/>:<main className="company-home-intro"><h2>Available tools</h2>{workspace.tools.map(t=><p key={t.key}><a href={companyUrl(t.path,workspace.company.id)}>{t.name}</a></p>)}{!workspace.tools.length&&<p>No tools are enabled yet. Contact your company administrator.</p>}</main>}</>}</NativeGatewayGuard>;}

export function CompanyTools(){const workspace=useCompanyWorkspace();return <NativeGatewayGuard><main className="company-home-intro"><h1>Company tools</h1>{workspace?.tools.map(t=><p key={t.key}><a href={companyUrl(t.path,workspace.company.id)}>{t.key==='service-desk'?'Service':t.name}</a></p>)}<p>Mapping, layouts and dock scheduling are pending standalone migration. Customer records remain centralized in Customers.</p></main></NativeGatewayGuard>;}
