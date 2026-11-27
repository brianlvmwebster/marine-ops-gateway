import { customerDisplayName, type CustomerContact } from '../helpers/customerJobContact';
import React, { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, PackageSearch, UsersRound } from 'lucide-react';
import { Button } from './Button';
import { companyUrl, useCompanyWorkspace } from './CompanyWorkspace';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './Dialog';
import { Input } from './Input';
import './GatewayToolWorkspace.css';

type LookupKind = 'customers' | 'parts';
type CustomerResult = CustomerContact;
type PartResult = {
  id: string;
  data: { part_number: string; supplier_code: string; description: string; on_hand: string; available: string; active: boolean };
};
type Item = { id: string; title: string; details: string[] };
const lookups = {
  customers: { label: 'Customers', icon: UsersRound, entitlement: 'customers', placeholder: 'Name, customer number, email or phone' },
  parts: { label: 'Parts Inventory', icon: PackageSearch, entitlement: 'parts-inventory', placeholder: 'Part number, description, supplier, UPC or bin' },
};

function customerItem(row: CustomerResult): Item {
  const phone = row.mobile_phone || row.home_phone || row.work_phone;
  return {
    id: row.id,
    title: customerDisplayName(row),
    details: [row.source_number ? 'Lightspeed #' + row.source_number : '', phone, row.email].filter(Boolean),
  };
}

function partItem(row: PartResult): Item {
  const part = row.data;
  return {
    id: row.id,
    title: part.part_number + ' · ' + part.description,
    details: [
      'Supplier ' + part.supplier_code,
      'On hand ' + part.on_hand,
      'Available ' + part.available,
      ...(part.active ? [] : ['Inactive']),
    ],
  };
}

function SharedLookup({ company, kind }: { company: string; kind: LookupKind }) {
  const config = lookups[kind];
  const id = useId();
  const [text, setText] = useState('');
  const [search, setSearch] = useState<{ term: string } | null>(null);
  const [result, setResult] = useState<{ items: Item[]; total: number } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!search) return;
    const abort = new AbortController();
    const status = kind === 'customers' ? 'active' : 'all';
    const query = new URLSearchParams({ q: search.term, status });
    void (async () => {
      try {
        const response = await fetch(companyUrl('/_api/' + kind + '?' + query, company), { signal: abort.signal });
        if (!response.ok) throw new Error('Unable to load ' + config.label.toLowerCase() + '.');
        const body = await response.json();
        if (abort.signal.aborted) return;
        const rows = kind === 'customers'
          ? (body.rows as CustomerResult[]).slice(0, 12).map(customerItem)
          : (body.rows as PartResult[]).slice(0, 12).map(partItem);
        setResult({ items: rows, total: body.total });
      } catch (failure) {
        if (!abort.signal.aborted) setError((failure as Error).message);
      } finally {
        if (!abort.signal.aborted) setBusy(false);
      }
    })();
    return () => abort.abort();
  }, [search, kind, company, config.label]);

  return <DialogContent className="gateway-lookup-dialog">
    <DialogHeader>
      <DialogTitle>{config.label}</DialogTitle>
      <DialogDescription>Look up records in the shared company directory.</DialogDescription>
    </DialogHeader>
    <form className="gateway-lookup-form" onSubmit={event => {
      event.preventDefault();
      const term = text.trim();
      if (!term || busy) return;
      setError('');
      setResult(null);
      setBusy(true);
      setSearch({ term });
    }}>
      <label htmlFor={id} className="gateway-lookup-field">
        Search {config.label.toLowerCase()}
      </label>
      <Input id={id} type="search" maxLength={200} value={text} onChange={event => setText(event.target.value)} placeholder={config.placeholder} />
      <Button type="submit" disabled={busy || !text.trim()}>Search</Button>
    </form>
    {error && <p role="alert">{error}</p>}
    {busy && <p role="status">Searching…</p>}
    {result && <>
      <p role="status">{result.total === 0 ? 'No matches.' : result.total > result.items.length
        ? `Showing ${result.items.length} of ${result.total.toLocaleString()} matches. Narrow your search to see others.`
        : `${result.total} ${result.total === 1 ? 'match' : 'matches'}.`}</p>
      <ul className="gateway-lookup-results">{result.items.map(item => <li key={item.id}>
        <strong>{item.title}</strong>
        {item.details.length > 0 && <p>{item.details.join(' · ')}</p>}
      </li>)}</ul>
    </>}
  </DialogContent>;
}

export function GatewayToolWorkspace({ children, showSharedLookups = true }: { children: React.ReactNode; showSharedLookups?: boolean }) {
  const workspace = useCompanyWorkspace();
  if (import.meta.env.VITE_APP_ENV !== 'staging' || !workspace) return <>{children}</>;

  return <div className="gateway-tool-workspace">
    <header className="gateway-tool-bar" aria-label="Gateway tool controls">
      <Button variant="outline" asChild><Link to={companyUrl('/', workspace.company.id)}>
        <ArrowLeft aria-hidden="true" /> Back to gateway
      </Link></Button>
      {showSharedLookups && <div className="gateway-tool-lookups" role="group" aria-label="Shared data">
        {(['customers', 'parts'] as const).filter(kind => workspace.tools.some(tool => tool.key === lookups[kind].entitlement))
          .map(kind => {
            const { label, icon: Icon } = lookups[kind];
            return <Dialog key={kind}>
              <DialogTrigger asChild><Button variant="secondary"><Icon aria-hidden="true" /> {label}</Button></DialogTrigger>
              <SharedLookup company={workspace.company.id} kind={kind} />
            </Dialog>;
          })}
      </div>}
    </header>
    {children}
  </div>;
}
