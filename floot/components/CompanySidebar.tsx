import React, { useId, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Menu } from 'lucide-react';
import { useCompanyWorkspace, companyUrl } from './CompanyWorkspace';
import { useAuth } from '../helpers/useAuth';
import AccountMenu from './GatewayAccountMenu';

type Destination = { label: string; path: string; active: boolean; select?: () => void };

export function CompanySidebar({ tab, onTab }: { tab?: string; onTab?: (tab: string) => void }) {
  const workspace = useCompanyWorkspace();
  const location = useLocation();
  const { authState } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const navId = useId();
  if (!workspace) return null;
  const { company, tools, role } = workspace;
  const has = (key: string) => tools.some(tool => tool.key === key);
  const query = new URLSearchParams(location.search);
  const destination = (label: string, path: string, active = location.pathname === path): Destination => ({ label, path, active });
  const groups: { label: string; links: Destination[] }[] = [
    { label: 'Service', links: has('service-desk') ? ['Overview', 'Job queue', 'Schedule'].map(name => ({
      label: name, path: '/dashboard?tab=' + encodeURIComponent(name),
      active: location.pathname === '/dashboard' && (tab ?? query.get('tab') ?? 'Overview') === name,
      select: onTab ? () => onTab(name) : undefined,
    })) : [] },
    { label: 'Customers & sales', links: [
      ...(has('customers') ? [
        destination('Customers', '/customers', location.pathname === '/customers' && query.get('view') !== 'units'),
        destination('Units', '/customers?view=units', location.pathname === '/customers' && query.get('view') === 'units'),
      ] : []),
      ...(has('dock-builder') ? [destination('Sales / Dock Builder', '/dock-builder')] : []),
    ] },
    { label: 'Operations', links: [
      ...(has('parts-inventory') ? [destination('Inventory', '/inventory/parts')] : []),
    ] },
  ].filter(group => group.links.length);
  const admin = ['owner', 'admin'].includes(role) ? destination('Administration', '/company/admin') : undefined;
  function selected(event: React.MouseEvent<HTMLElement>, entry: Destination) {
    const dropdown = event.currentTarget.closest<HTMLDetailsElement>('.company-top-nav details');
    if (dropdown) dropdown.open = false;
    setExpanded(false);
    entry.select?.();
  }
  function link(entry: Destination) {
    return entry.select
      ? <button key={entry.label} type="button" className="company-nav-link" aria-current={entry.active ? 'page' : undefined}
          onClick={event => selected(event, entry)}>{entry.label}</button>
      : <Link key={entry.label} to={companyUrl(entry.path, company.id)} className="company-nav-link"
          aria-current={entry.active ? 'page' : undefined} onClick={event => selected(event, entry)}>{entry.label}</Link>;
  }
  function topMenuKeys(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Escape') return;
    const dropdown = (event.target as HTMLElement).closest<HTMLDetailsElement>('details[open]');
    if (!dropdown) return;
    dropdown.open = false;
    dropdown.querySelector('summary')?.focus();
  }
  return <aside className="company-sidebar" aria-label="Company navigation">
    <div className="company-nav-head">
      <Link className="company-nav-title" to={companyUrl('/', company.id)}>{company.name}</Link>
      <button type="button" className="company-nav-toggle workspace-button" aria-expanded={expanded}
        aria-controls={navId} onClick={() => setExpanded(value => !value)}><Menu size={16} aria-hidden="true" /> Menu</button>
    </div>
    <div id={navId} className="company-nav-content" data-expanded={expanded}>
      <nav className="company-side-nav" aria-label="Dashboard sections">
        {groups.map(group => <details key={group.label} open={group.links.some(item => item.active) || group.label === groups[0]?.label}>
          <summary>{group.label}<ChevronDown size={16} aria-hidden="true" /></summary>
          <div className="company-nav-items">{group.links.map(link)}</div>
        </details>)}
        {admin && link(admin)}
      </nav>
      <nav className="company-top-nav" aria-label="Dashboard sections" onKeyDown={topMenuKeys}>
        {groups.map(group => <details key={group.label} name={navId}
          onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.open = false;
          }}>
          <summary data-current={group.links.some(item => item.active)}>{group.label}<ChevronDown size={16} aria-hidden="true" /></summary>
          <div className="company-nav-items">{group.links.map(link)}</div>
        </details>)}
        {admin && link(admin)}
      </nav>
      <div className="company-nav-account">
        {link(destination('Back to gateway', '/'))}
        <AccountMenu email={authState.type === 'authenticated' ? authState.user.email : undefined} />
      </div>
    </div>
  </aside>;
}
