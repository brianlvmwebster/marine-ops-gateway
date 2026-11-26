import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { companyUrl, useCompanyWorkspace } from '../components/CompanyWorkspace';
import { NativeGatewayGuard } from '../components/NativeGatewayGuard';
import { maxCustomerExportBytes } from '../helpers/customerExport';
import { maxPartsExportBytes, type PartExportRow } from '../helpers/partsExport';
import Platform from './platform';
import './administration.css';

const datasets = {
  customers: 'Customers', parts: 'Parts Inventory', ros: 'ROs', units: 'Units',
} as const;
type Dataset = keyof typeof datasets;
type ImportArea = 'customers' | 'parts';
type WorkbookRows = string[][] | PartExportRow[];
const updateAreas = {
  customers: { file: 'Lightspeed Customer Bulk export', label: 'customer', tools: 'customers', bytes: maxCustomerExportBytes },
  parts: { file: 'Lightspeed Parts Inventory bulk export', label: 'parts inventory', tools: 'parts-inventory', bytes: maxPartsExportBytes },
} as const;
const statuses = {
  pending: 'Pending review', not_applied: 'Not applied', applied: 'Applied',
  partial: 'Partially applied', unchanged: 'No changes', failed: 'Failed',
} as const;
type Run = {
  id: string; dataset: Dataset; source: string; checked_at: string | null;
  applied_at: string | null; status: keyof typeof statuses;
  summary: Partial<Record<'compared' | 'excluded' | 'added' | 'updated' | 'missing' | 'conflicts' | 'alreadyCurrent' | 'stockReview' | 'applied' | 'omitted', number>> & { note?: string };
};
type Preview = { run: Run; preview: {
  number: string; name: string; outcome: 'add' | 'update' | 'conflict' | 'missing';
  differences?: { field: string; before: string; after: string; held?: boolean }[];
}[] };
type History = { runs: Run[]; next: string | null };
const easternTime = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  timeZone: 'America/New_York', timeZoneName: 'short',
});
const areaKeys = Object.keys(datasets) as Dataset[];

async function api<Result>(company: string, path = '', body?: object, signal?: AbortSignal): Promise<Result> {
  const response = await fetch(companyUrl('/_api/import-updates' + path, company), {
    signal,
    ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data;
}

function parseWorkbook(file: File, area: ImportArea) {
  const { bytes: maxBytes } = updateAreas[area];
  if (!/\.xlsx?$/i.test(file.name) || !file.size || file.size > maxBytes)
    throw new Error(`Choose an .xls or .xlsx file up to ${maxBytes / 1024 / 1024} MB.`);
  return new Promise<WorkbookRows>((resolve, reject) => {
    const worker = new Worker(new URL('../helpers/customerExport.worker.ts', import.meta.url), { type: 'module' });
    const timeout = window.setTimeout(() => fail(new Error('Reading the workbook took too long.')), 45_000);
    function cleanup() { window.clearTimeout(timeout); worker.terminate(); }
    function fail(error: Error) { cleanup(); reject(error); }
    worker.onmessage = ({ data }: MessageEvent<{ rows?: WorkbookRows; error?: string }>) => {
      cleanup();
      if (data.rows) resolve(data.rows);
      else reject(new Error(data.error || 'The workbook could not be read.'));
    };
    worker.onerror = () => fail(new Error('The workbook could not be read.'));
    file.arrayBuffer().then(bytes => worker.postMessage({ area, bytes }, [bytes])).catch(() => fail(new Error('The file could not be opened.')));
  });
}

function findings(summary: Run['summary']) {
  const labels = { compared: 'checked', added: 'new', updated: 'updates', conflicts: 'conflicts',
    missing: 'missing from file', alreadyCurrent: 'already current', excluded: 'unnamed rows excluded',
    stockReview: 'with stock quantities to review', applied: 'applied', omitted: 'outside preview size limit' } as const;
  const counts = (Object.keys(labels) as (keyof typeof labels)[]).filter(key => summary[key] !== undefined)
    .filter(key => ['compared', 'added', 'updated', 'conflicts'].includes(key) || !!summary[key])
    .map(key => `${summary[key]?.toLocaleString()} ${labels[key]}`);
  return [...counts, summary.note].filter(Boolean).join(' · ');
}

function RunList({ runs }: { runs: Run[] }) {
  if (!runs.length) return <p className="import-muted">No runs recorded.</p>;
  return <ol className="import-history">{runs.map(run => <li key={run.id}>
    <div className="import-run-heading">
      <strong>{run.checked_at ? <time dateTime={run.checked_at}>{easternTime.format(new Date(run.checked_at))}</time> : 'Check time unavailable'}</strong>
      <span className="import-status" data-status={run.status}>{statuses[run.status]}</span>
    </div>
    <p>{run.source}</p>
    <p className="import-muted">{findings(run.summary)}</p>
    {run.applied_at && <p className="import-muted">Applied <time dateTime={run.applied_at}>{easternTime.format(new Date(run.applied_at))}</time></p>}
  </li>)}</ol>;
}

function ChangePreview({ rows, area }: { rows: Preview['preview']; area: ImportArea }) {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? rows : rows.filter(row => row.outcome === filter || (filter === 'conflict' && row.differences?.some(change => change.held)));
  const labels = { add: 'New', update: 'Update', conflict: 'Conflict', missing: 'Missing from file' } as const;
  const pageSize = 25;
  const start = page * pageSize;
  return <details>
    <summary>Review {area === 'customers' ? 'customer' : 'parts inventory'} changes</summary>
    {area === 'parts' && <label className="import-preview-filter">Show
      <select value={filter} onChange={event => { setFilter(event.target.value); setPage(0); }}>
        <option value="all">All findings</option><option value="add">New parts</option>
        <option value="update">Updates</option><option value="conflict">Conflicts</option>
        <option value="missing">Missing from file</option>
      </select>
    </label>}
    {filtered.length ? <ul className="import-preview">{filtered.slice(start, start + pageSize).map(change => <li key={change.number}>
      <strong>{change.name} ({area === 'customers' ? '#' : ''}{change.number})</strong> · {labels[change.outcome]}
      {change.differences?.length ? <ul>{change.differences.map(value => <li key={value.field}>
        {value.field} · {value.before || 'Blank'} → {value.after || 'Blank'}{value.held && ' · Review only'}
      </li>)}</ul> : null}
    </li>)}</ul> : <p>No matching findings.</p>}
    {filtered.length > pageSize && <div className="import-preview-pagination">
      <button type="button" disabled={!page} onClick={() => setPage(value => value - 1)}>Previous</button>
      <span aria-live="polite">{start + 1}–{Math.min(start + pageSize, filtered.length)} of {filtered.length.toLocaleString()}</span>
      <button type="button" disabled={start + pageSize >= filtered.length} onClick={() => setPage(value => value + 1)}>Next</button>
    </div>}
    {area === 'customers' && rows.length === 50 && <p>The preview shows the first 50 affected customers.</p>}
  </details>;
}

function WorkbookUpdate({ company, area, onRun }: { company: string; area: ImportArea; onRun: () => void }) {
  const { file: fileLabel, label } = updateAreas[area];
  const isParts = area === 'parts';
  const [file, setFile] = useState<File | null>(null);
  const [review, setReview] = useState<{ result: Preview; rows: WorkbookRows } | null>(null);
  const [busy, setBusy] = useState<'check' | 'apply' | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function check(event: React.FormEvent) {
    event.preventDefault();
    if (!file || busy) return;
    setBusy('check');
    setError('');
    setMessage('');
    setReview(null);
    try {
      const rows = await parseWorkbook(file, area);
      const result = await api<Preview>(company, '/' + area + '/check', { rows });
      setReview({ result, rows });
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(null);
      onRun();
    }
  }

  async function apply() {
    if (!review || busy) return;
    setBusy('apply');
    setError('');
    try {
      const result = await api<{ applied: number }>(company, '/' + area + '/apply', { id: review.result.run.id, rows: review.rows });
      setMessage(`${result.applied.toLocaleString()} ${label} changes applied.`);
      setReview(null);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(null);
      onRun();
    }
  }

  return <div className="import-customer">
    <form className="import-upload" onSubmit={check}>
      <label htmlFor={area + '-update-file'}>{fileLabel} (.xls or .xlsx)
        <input id={area + '-update-file'} type="file" accept=".xls,.xlsx" disabled={busy !== null}
          onChange={event => { setFile(event.target.files?.[0] ?? null); setReview(null); setError(''); setMessage(''); }} />
      </label>
      <button type="submit" disabled={!file || busy !== null}>{busy === 'check' ? 'Checking…' : 'Check for changes'}</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {review && <section className="import-review" aria-label={isParts ? 'Parts Inventory check results' : 'Customer check results'}>
      <h3>Check results</h3>
      <p role="status">{findings(review.result.run.summary)}</p>
      {review.result.preview.length > 0 && <ChangePreview key={review.result.run.id} rows={review.result.preview} area={area} />}
      {!!review.result.run.summary.omitted && <p>The findings exceed the preview limit. Check a smaller export before applying changes.</p>}
      {review.result.run.status === 'pending' && <>
        <p>{isParts ? 'Changes marked Review only and parts missing from the file are left in place.' : 'Conflicting records and customers missing from the file are left in place.'}</p>
        <button type="button" className="workspace-primary" disabled={busy !== null} onClick={apply}>
          {busy === 'apply' ? 'Applying…' : `Apply ${label} changes`}
        </button>
      </>}
      {review.result.run.status === 'not_applied' && <p>No {label} records changed.</p>}
    </section>}
  </div>;
}

function RecentImports({ company, tools }: { company: string; tools: string[] }) {
  const [history, setHistory] = useState<History | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api<History>(company, '', undefined, controller.signal).then(value => { setHistory(value); setError(''); })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [company, revision]);
  return <>
    {error && <p role="alert">{error}</p>}
    <div className="import-sections">{areaKeys.map(area => <section key={area} className="import-panel" aria-labelledby={`import-${area}`}>
      <h2 id={`import-${area}`}>{datasets[area]}</h2>
      {(area === 'customers' || area === 'parts') && tools.includes(updateAreas[area].tools)
        ? <WorkbookUpdate company={company} area={area} onRun={() => setRevision(value => value + 1)} />
        : <p className="import-muted">File updates aren’t available for this section.</p>}
      <div className="import-run-heading">
        <h3>Recent runs</h3>
        <Link to={companyUrl('/company/admin?history=' + area, company)}>View full {datasets[area]} history</Link>
      </div>
      {history ? <RunList runs={history.runs.filter(run => run.dataset === area)} /> : !error && <p role="status">Loading run history…</p>}
    </section>)}</div>
  </>;
}

function FullHistory({ company, area }: { company: string; area: Dataset }) {
  const [history, setHistory] = useState<History | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const path = '?dataset=' + area;
  useEffect(() => {
    const controller = new AbortController();
    api<History>(company, path, undefined, controller.signal).then(setHistory)
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [company, path]);
  async function loadMore() {
    if (!history?.next || busy) return;
    setBusy(true);
    setError('');
    try {
      const page = await api<History>(company, path + '&before=' + history.next);
      setHistory({ runs: [...history.runs, ...page.runs], next: page.next });
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return <section className="import-panel">
    <h2>{datasets[area]} history</h2>
    {error && <p role="alert">{error}</p>}
    {history ? <RunList runs={history.runs} /> : !error && <p role="status">Loading run history…</p>}
    {history?.next && <button type="button" disabled={busy} onClick={loadMore}>{busy ? 'Loading…' : 'Load older runs'}</button>}
  </section>;
}

export default function Administration() {
  const workspace = useCompanyWorkspace();
  const [query] = useSearchParams();
  const requested = query.get('history') as Dataset | null;
  const area = requested && areaKeys.includes(requested) ? requested : null;
  const company = workspace?.company.id;
  return <NativeGatewayGuard>{workspace && company && <div className="import-administration">
    <header><h1>Administration</h1>
      {['owner', 'admin'].includes(workspace.role) && <nav aria-label="Administration sections">
        <Link to={companyUrl('/company/admin', company)} aria-current={!area && query.get('view') !== 'members' ? 'page' : undefined}>Import updates</Link>
        <Link to={companyUrl('/company/admin?view=members', company)} aria-current={query.get('view') === 'members' ? 'page' : undefined}>Company settings</Link>
      </nav>}
    </header>
    {!['owner', 'admin'].includes(workspace.role) ? <p role="alert">Company administrator access required.</p>
      : query.get('view') === 'members' ? <Platform key={company} administration />
      : area ? <FullHistory key={company + area} company={company} area={area} />
      : <RecentImports key={company} company={company} tools={workspace.tools.map(tool => tool.key)} />}
  </div>}</NativeGatewayGuard>;
}
