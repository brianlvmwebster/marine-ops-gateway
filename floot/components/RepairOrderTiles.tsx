import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './Button';
import { companyUrl } from './CompanyWorkspace';
import { RepairOrderChecklist } from './RepairOrderChecklist';
import {
  defaultRepairOrderSort, promisedDateLabel, repairOrderPageSize, repairOrderSortLabels,
  repairOrderSorts, repairOrdersPath, type RepairOrderTile,
} from '../helpers/repairOrders';
import { jobStatuses } from '../helpers/workflowModel';
import styles from './RepairOrderTiles.module.css';

const emptyFilters = { q: '', status: 'all', priority: 'all', sort: defaultRepairOrderSort as string, page: 0 };

export function RepairOrderTiles({ company }: { company: string }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(emptyFilters);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ rows: RepairOrderTile[]; total: number } | null>(null);
  const [error, setError] = useState('');
  const { q, status, priority, sort, page } = filters;

  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError('');
    async function load() {
      try {
        const params = new URLSearchParams({ view: 'tiles', q, status, priority, sort, page: String(page) });
        const response = await fetch(companyUrl('/_api/repair-orders?' + params, company), { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw Error(data.error || 'Unable to load repair orders.');
        if (!controller.signal.aborted) setResult(data);
      } catch (failure) {
        if (!controller.signal.aborted) setError((failure as Error).message);
      }
    }
    void load();
    return () => controller.abort();
  }, [company, q, status, priority, sort, page, retry]);

  function refine(change: Partial<typeof emptyFilters>) {
    setFilters(current => ({ ...current, q: search.trim(), page: 0, ...change }));
  }

  return <section className={styles.board} aria-labelledby="overview-repair-orders">
    <header><h2 id="overview-repair-orders">Repair Orders</h2>
      <Link to={companyUrl(repairOrdersPath, company)}>Open Repair Orders list</Link>
    </header>
    <form className={styles.filters} onSubmit={event => { event.preventDefault(); refine({}); }}>
      <label className={styles.search}>Search repair orders
        <input type="search" maxLength={200} value={search} onChange={event => setSearch(event.target.value)}
          placeholder="RO number, customer, unit or job title"/>
      </label>
      <Button variant="outline" type="submit">Search</Button>
      <label>Status<select value={status} onChange={event => refine({ status: event.target.value })}>
        <option value="all">All statuses</option><option value="open">Open orders</option>
        {jobStatuses.map(value => <option key={value}>{value}</option>)}
      </select></label>
      <label>Priority<select value={priority} onChange={event => refine({ priority: event.target.value })}>
        <option value="all">All priorities</option>
        {['Normal', 'High', 'Urgent'].map(value => <option key={value}>{value}</option>)}
      </select></label>
      <label>Sort by<select value={sort} onChange={event => refine({ sort: event.target.value })}>
        {repairOrderSorts.map(value => <option value={value} key={value}>{repairOrderSortLabels[value]}</option>)}
      </select></label>
      <Button variant="ghost" type="button" onClick={() => { setSearch(''); setFilters(emptyFilters); }}>Reset</Button>
    </form>
    {error && <p role="alert">{error} <Button variant="outline" onClick={() => setRetry(value => value + 1)}>Retry</Button></p>}
    {!result && !error && <p role="status">Loading repair orders…</p>}
    {result && <>
      <p role="status">{result.total.toLocaleString()} {result.total === 1 ? 'repair order' : 'repair orders'} found</p>
      {result.rows.length > 0 && <div className={styles.grid}>
        {result.rows.map(order => <article key={order.id} className={styles.tile} aria-label={order.number}>
          <div className={styles.tileHeading}>
            <Link to={companyUrl(repairOrdersPath + '/' + order.id, company)}>{order.number}</Link>
            <span>{order.status}</span>
          </div>
          <strong>{order.customer_name || 'Customer unspecified'}</strong>
          {order.unit_description && <p>{order.unit_description}</p>}
          <RepairOrderChecklist items={order.checklist}/>
          <footer>
            <span>{order.promised_at ? 'Promised ' : ''}{promisedDateLabel(order.promised_at)}</span>
            {[order.pickup, order.trailer, order.technician].filter(Boolean).length > 0 &&
              <span>{[order.pickup, order.trailer, order.technician].filter(Boolean).join(' · ')}</span>}
          </footer>
        </article>)}
      </div>}
      {(page > 0 || result.total > repairOrderPageSize) && <nav className={styles.pagination} aria-label="Overview repair order pages">
        <Button variant="outline" disabled={page === 0} onClick={() => setFilters(value => ({ ...value, page: page - 1 }))}>Previous</Button>
        <span>Page {page + 1} of {Math.max(1, Math.ceil(result.total / repairOrderPageSize))}</span>
        <Button variant="outline" disabled={(page + 1) * repairOrderPageSize >= result.total}
          onClick={() => setFilters(value => ({ ...value, page: page + 1 }))}>Next</Button>
      </nav>}
    </>}
  </section>;
}
