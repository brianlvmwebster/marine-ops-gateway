import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { companyUrl, useCompanyWorkspace } from '../components/CompanyWorkspace';
import { JobCustomerPicker } from '../components/JobCustomerPicker';
import { JobUnitPicker } from '../components/JobUnitPicker';
import {
  defaultRepairOrderSort, promisedDateLabel, repairLineStatuses, repairOrderPageSize, repairOrderSorts, repairOrdersPath,
  type RepairLine, type RepairOrder, type RepairOrderRow,
} from '../helpers/repairOrders';
import { jobStatuses } from '../helpers/workflowModel';
import { serviceTime } from '../helpers/serviceTime';
import styles from './repair-orders.module.css';

async function request<T>(company: string, params: URLSearchParams, options?: RequestInit, action = ''): Promise<T> {
  const response = await fetch(companyUrl('/_api/repair-orders' + action + '?' + params, company), options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Repair Orders request failed.');
  return result;
}

const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'America/New_York' });
const dateLabel = (date: string) => date ? dateFormat.format(new Date(date)) : '—';
const sortNames = {
  promisedLatest: 'Latest promised first', promisedSoonest: 'Earliest promised first',
  newest: 'Newest created first', oldest: 'Oldest created first', updated: 'Recently updated', customer: 'Customer name',
};

export default function RepairOrders({ create = false }: { create?: boolean }) {
  const workspace = useCompanyWorkspace();
  const { orderId } = useParams();
  if (!workspace) return null;
  const company = workspace.company.id;
  const canCreate = workspace.tools.some(tool => tool.key === 'customers');
  return <main className={styles.page}>
    {create ? <>
      <Link to={companyUrl(repairOrdersPath, company)}>Back to repair orders</Link>
      <h1>New repair order</h1>
      {canCreate
        ? <OrderForm key={company} company={company}/>
        : <p>New orders require access to the shared Customers directory.</p>}
    </> : orderId
      ? <OrderDetail key={company + orderId} company={company} id={orderId}/>
      : <OrderList key={company} company={company} canCreate={canCreate}/>}
  </main>;
}

function OrderList({ company, canCreate }: { company: string; canCreate: boolean }) {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [result, setResult] = useState<{ rows: RepairOrderRow[]; total: number } | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const q = params.get('q') || '';
  const status = jobStatuses.find(value => value === params.get('status')) || 'all';
  const sort = repairOrderSorts.find(value => value === params.get('sort')) || defaultRepairOrderSort;
  const requestedPage = Number(params.get('page'));
  const page = Number.isInteger(requestedPage) && requestedPage >= 0 && requestedPage <= 100000 ? requestedPage : 0;
  useEffect(() => { setQuery(q); }, [q]);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError('');
    request<{ rows: RepairOrderRow[]; total: number }>(company, new URLSearchParams({ q, status, sort, page: String(page) }), { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setResult(value); })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [company, page, q, sort, status, revision]);

  function filter(changes: Record<string, string>) {
    setParams({ companyId: company, q, status, sort, page: '0', ...changes });
  }

  return <>
    <header className={styles.header}>
      <h1>Repair Orders</h1>
      {canCreate && <Button asChild><Link to={companyUrl(repairOrdersPath + '/new', company)}>New repair order</Link></Button>}
    </header>
    <form className={styles.filters} onSubmit={event => { event.preventDefault(); filter({ q: query.trim() }); }}>
      <label className={styles.search}>Search repair orders
        <input type="search" value={query} maxLength={200} onChange={event => setQuery(event.target.value)}
          placeholder="RO number, customer, unit or VIN"/>
      </label>
      <Button type="submit" variant="outline">Search</Button>
      <label>Status
        <select value={status} onChange={event => filter({ status: event.target.value, q: query.trim() })}>
          <option value="all">All statuses</option>
          {jobStatuses.map(value => <option key={value}>{value}</option>)}
        </select>
      </label>
      <label>Sort by
        <select value={sort} onChange={event => filter({ sort: event.target.value, q: query.trim() })}>
          {repairOrderSorts.map(value => <option key={value} value={value}>{sortNames[value]}</option>)}
        </select>
      </label>
    </form>
    {!result && !error && <p role="status">Loading repair orders…</p>}
    {error && <div><p role="alert">{error}</p><Button onClick={() => setRevision(value => value + 1)}>Retry</Button></div>}
    {result && <>
      <p role="status">{result.total.toLocaleString()} {result.total === 1 ? 'repair order' : 'repair orders'}</p>
      {result.rows.length > 0 && <div className={styles.table}>
        <table aria-label="Repair Orders">
          <thead><tr>{['Order', 'Customer', 'Unit', 'Status', 'Jobs', 'Promised (Eastern)'].map(heading => <th key={heading} scope="col">{heading}</th>)}</tr></thead>
          <tbody>{result.rows.map(row => <tr key={row.id}>
            <td><Link to={companyUrl(repairOrdersPath + '/' + row.id, company)}>{row.number}</Link></td>
            <td>{row.customer_name || '—'}</td>
            <td>{row.unit_description || '—'}{row.unit_serial && <small>{row.unit_serial}</small>}</td>
            <td>{row.status}</td><td>{row.line_count}</td><td>{promisedDateLabel(row.promised_at)}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      {(page > 0 || result.total > repairOrderPageSize) && <nav className={styles.actions} aria-label="Repair order pages">
        <Button type="button" variant="outline" disabled={page === 0} onClick={() => filter({ page: String(page - 1) })}>Previous</Button>
        <span>Page {page + 1} of {Math.max(1, Math.ceil(result.total / repairOrderPageSize))}</span>
        <Button type="button" variant="outline" disabled={(page + 1) * repairOrderPageSize >= result.total}
          onClick={() => filter({ page: String(page + 1) })}>Next</Button>
      </nav>}
    </>}
  </>;
}

function OrderDetail({ company, id }: { company: string; id: string }) {
  const [order, setOrder] = useState<RepairOrder | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    request<RepairOrder>(company, new URLSearchParams({ id }), { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setOrder(value); })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [company, id, revision]);

  function reload() { setOrder(null); setError(''); setRevision(value => value + 1); }
  return <>
    <Link to={companyUrl(repairOrdersPath, company)}>Back to repair orders</Link>
    {error && <div><p role="alert">{error}</p><Button onClick={reload}>Retry</Button></div>}
    {!order && !error && <p role="status">Loading repair order…</p>}
    {order && <>
      <h1>Repair order {order.number}</h1>
      <dl className={styles.details}>
        <div><dt>Customer</dt><dd>{order.customer_id
          ? <Link to={companyUrl('/customers?customerId=' + order.customer_id, company)}>{order.customer_name || 'Open customer'}</Link>
          : order.customer_name || 'Unlinked'}</dd></div>
        <div><dt>Unit</dt><dd>{order.unit_description || '—'}{order.unit_serial && <small>{order.unit_serial}</small>}</dd></div>
        <div><dt>Status</dt><dd>{order.status}</dd></div>
        <div><dt>Promised (Eastern)</dt><dd>{promisedDateLabel(order.promised_at)}</dd></div>
        <div><dt>Created</dt><dd>{dateLabel(order.created_at)}</dd></div>
      </dl>
      {notice && <p role="status">{notice}</p>}
      <OrderForm company={company} order={order} reload={reload} onSaved={() => { setNotice('Repair order saved.'); reload(); }}/>
    </>}
  </>;
}

const newLine = (): RepairLine => ({ id: crypto.randomUUID(), title: '', notes: '', status: 'Pending' });
const ignoreLink = () => {};
const promisedInput = (date: string | null | undefined) => {
  if (!date) return '';
  const { serviceDate, time } = serviceTime.fromUtc(date);
  return serviceDate + 'T' + time;
};

function OrderForm({ company, order, reload, onSaved }: {
  company: string; order?: RepairOrder; reload?: () => void; onSaved?: () => void;
}) {
  const navigate = useNavigate();
  const [submissionId] = useState(() => crypto.randomUUID());
  const [customerId, setCustomerId] = useState<string>();
  const [unitId, setUnitId] = useState<string>();
  const [customerBusy, setCustomerBusy] = useState(false);
  const [unitBusy, setUnitBusy] = useState(false);
  const [notes, setNotes] = useState(order?.notes || '');
  const initialPromised = promisedInput(order?.promised_at);
  const [promised, setPromised] = useState(initialPromised);
  const [lines, setLines] = useState(() => order?.lines || [newLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const locked = order?.locked ?? false;
  const ready = order || (customerId && unitId && lines.length > 0);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || saving || locked || customerBusy || unitBusy) return;
    setSaving(true);
    setError('');
    try {
      const fields = { notes, lines, ...(promised !== initialPromised ? { promised: promised || null } : {}) };
      const value = order ? { id: order.id, version: order.version, ...fields }
        : { id: submissionId, customerId, unitId, ...fields };
      const result = await request<{ id: string }>(company, new URLSearchParams(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value),
      }, order ? '/update' : '/create');
      if (order) onSaved?.();
      else navigate(companyUrl(repairOrdersPath + '/' + result.id, company), { replace: true });
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function updateLine(id: string, changes: Partial<RepairLine>) {
    setLines(current => current.map(line => line.id === id ? { ...line, ...changes } : line));
  }

  return <form className={styles.form} onSubmit={save}>
    <fieldset disabled={saving || locked}>
      <legend>Order details</legend>
      {!order && <div className={styles.pickers}>
        <JobCustomerPicker disabled={saving} requiredSelection onBusyChange={setCustomerBusy} onLinkedCustomer={ignoreLink}
          onSelect={id => { setCustomerId(id); setUnitId(undefined); }}/>
        <JobUnitPicker key={customerId} disabled={saving || customerBusy} requiredSelection customerId={customerId}
          onBusyChange={setUnitBusy} onSelect={setUnitId}/>
      </div>}
      <label>Promised date and time (Eastern)<input type="datetime-local" value={promised}
        onChange={event => setPromised(event.target.value)}/></label>
      <label>Order notes<textarea rows={3} maxLength={10000} value={notes} onChange={event => setNotes(event.target.value)}/></label>
    </fieldset>
    <section className={styles.lines} aria-labelledby="repair-lines">
      <h2 id="repair-lines">Jobs</h2>
      {locked && <p>This completed order is locked after Service Admin review.</p>}
      {lines.length === 0 && <p>No job lines on this repair order.</p>}
      {lines.map((line, index) => <fieldset className={styles.line} key={line.id} disabled={saving || locked}>
        <legend>Job {index + 1}</legend>
        <label>Work requested<input required maxLength={250} value={line.title}
          onChange={event => updateLine(line.id, { title: event.target.value })}/></label>
        <label>Status<select value={line.status} onChange={event => updateLine(line.id, { status: event.target.value as RepairLine['status'] })}>
          {repairLineStatuses.map(status => <option key={status}>{status}</option>)}
        </select></label>
        <label className={styles.lineNotes}>Job notes<textarea rows={2} maxLength={4000} value={line.notes}
          onChange={event => updateLine(line.id, { notes: event.target.value })}/></label>
        {!order?.lines.some(saved => saved.id === line.id) && (order || lines.length > 1) && <Button type="button" size="sm" variant="outline"
          onClick={() => setLines(current => current.filter(item => item.id !== line.id))}>Remove job {index + 1}</Button>}
      </fieldset>)}
      {!locked && <Button type="button" variant="outline" disabled={saving || lines.length >= 50}
        onClick={() => setLines(current => [...current, newLine()])}>Add job line</Button>}
    </section>
    {error && <p role="alert">{error}</p>}
    {!locked && <div className={styles.actions}>
      <Button type="submit" disabled={!ready || saving || customerBusy || unitBusy}>{saving ? 'Saving…' : order ? 'Save changes' : 'Create repair order'}</Button>
      {error && reload && <Button type="button" variant="outline" onClick={reload}>Reload saved order</Button>}
    </div>}
  </form>;
}
