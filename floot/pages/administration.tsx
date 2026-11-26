import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { companyUrl, useCompanyWorkspace } from '../components/CompanyWorkspace';
import { NativeGatewayGuard } from '../components/NativeGatewayGuard';
import { maxCustomerExportBytes } from '../helpers/customerExport';
import Platform from './platform';
import './administration.css';

const datasets = {
  customers: 'Customers', parts: 'Parts Inventory', ros: 'ROs', units: 'Units',
} as const;
type Dataset = keyof typeof datasets;
const statuses = {
  pending: 'Pending review', not_applied: 'Not applied', applied: 'Applied',
  partial: 'Partially applied', unchanged: 'No changes', failed: 'Failed',
} as const;
type Run = {
  id: string; dataset: Dataset; source: string; checked_at: string | null;
  applied_at: string | null; status: keyof typeof statuses;
  summary: Partial<Record<'compared' | 'excluded' | 'added' | 'updated' | 'missing' | 'conflicts' | 'alreadyCurrent' | 'applied', number>> & { note?: string };
};
type Preview = { run: Run; preview: {
  number: string; name: string; outcome: 'add' | 'update' | 'conflict';
  differences?: { field: string; before: string; after: string }[];
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

function parseWorkbook(file: File) {
  if (!/\.xlsx?$/i.test(file.name) || !file.size || file.size > maxCustomerExportBytes)
    throw new Error('Choose an .xls or .xlsx file up to 12 MB.');
  return new Promise<string[][]>((resolve, reject) => {
    const worker = new Worker(new URL('../helpers/customerExport.worker.ts', import.meta.url), { type: 'module' });
    const timeout = window.setTimeout(() => fail(new Error('Reading the workbook took too long.')), 20_000);
    function cleanup() { window.clearTimeout(timeout); worker.terminate(); }
    function fail(error: Error) { cleanup(); reject(error); }
    worker.onmessage = ({ data }: MessageEvent<{ rows?: string[][]; error?: string }>) => {
      cleanup();
      if (data.rows) resolve(data.rows);
      else reject(new Error(data.error || 'The workbook could not be read.'));
    };
    worker.onerror = () => fail(new Error('The workbook could not be read.'));
    file.arrayBuffer().then(bytes => worker.postMessage(bytes, [bytes])).catch(() => fail(new Error('The file could not be opened.')));
  });
}

function findings(summary: Run['summary']) {
  const labels = { compared: 'checked', added: 'new', updated: 'updates', conflicts: 'conflicts',
    missing: 'missing from file', alreadyCurrent: 'already current', excluded: 'unnamed rows excluded', applied: 'applied' } as const;
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

function CustomerUpdate({ company, onRun }: { company: string; onRun: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [review, setReview] = useState<{ result: Preview; rows: string[][] } | null>(null);
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
      const rows = await parseWorkbook(file);
      const result = await api<Preview>(company, '/customers/check', { rows });
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
      const result = await api<{ applied: number }>(company, '/customers/apply', { id: review.result.run.id, rows: review.rows });
      setMessage(`${result.applied.toLocaleString()} customer changes applied.`);
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
      <label htmlFor="customer-update-file">Lightspeed Customer Bulk export (.xls or .xlsx)
        <input id="customer-update-file" type="file" accept=".xls,.xlsx" disabled={busy !== null}
          onChange={event => { setFile(event.target.files?.[0] ?? null); setReview(null); setError(''); setMessage(''); }} />
      </label>
      <button type="submit" disabled={!file || busy !== null}>{busy === 'check' ? 'Checking…' : 'Check for changes'}</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {review && <section className="import-review" aria-label="Customer check results">
      <h3>Check results</h3>
      <p role="status">{findings(review.result.run.summary)}</p>
      {review.result.preview.length > 0 && <details>
        <summary>Review customer changes</summary>
        <ul className="import-preview">{review.result.preview.map(change => <li key={change.number}>
          <strong>{change.name} (#{change.number})</strong> · {change.outcome === 'add' ? 'New' : change.outcome === 'update' ? 'Update' : 'Conflict'}
          {change.differences?.length ? <ul>{change.differences.map(value => <li key={value.field}>
            {value.field} · {value.before || 'Blank'} → {value.after || 'Blank'}
          </li>)}</ul> : null}
        </li>)}</ul>
        {review.result.preview.length === 50 && <p>The preview shows the first 50 affected customers.</p>}
      </details>}
      {review.result.run.status === 'pending' && <>
        <p>Conflicting records and customers missing from the file are left in place.</p>
        <button type="button" disabled={busy !== null} onClick={apply}>
          {busy === 'apply' ? 'Applying…' : 'Apply customer changes'}
        </button>
      </>}
      {review.result.run.status === 'not_applied' && <p>No customer records changed. Review the flagged records before applying updates.</p>}
    </section>}
  </div>;
}

function RecentImports({ company, canUpdateCustomers }: { company: string; canUpdateCustomers: boolean }) {
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
    {areaKeys.map(area => <section key={area} className="import-panel" aria-labelledby={`import-${area}`}>
      <h2 id={`import-${area}`}>{datasets[area]}</h2>
      {area === 'customers' && canUpdateCustomers
        ? <CustomerUpdate company={company} onRun={() => setRevision(value => value + 1)} />
        : <p className="import-muted">{area === 'customers' ? 'Customer updates require the Customers tool.' : 'File updates aren’t available for this section yet.'}</p>}
      <div className="import-run-heading">
        <h3>Recent runs</h3>
        <Link to={companyUrl('/company/admin?history=' + area, company)}>View full {datasets[area]} history</Link>
      </div>
      {history ? <RunList runs={history.runs.filter(run => run.dataset === area)} /> : !error && <p role="status">Loading run history…</p>}
    </section>)}
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
      : <RecentImports key={company} company={company} canUpdateCustomers={workspace.tools.some(tool => tool.key === 'customers')} />}
  </div>}</NativeGatewayGuard>;
}
