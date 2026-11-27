import React, { useEffect, useState } from 'react';

type Person = { customer_id: string; customer_name: string };
type Assignment = Person & { id: string; started_at: string | null; ended_at: string | null };
type Observation = Person & { first_order: string | null; last_order: string | null; order_count: number };
type History = { assignments: Assignment[]; observations: Observation[] };

const easternDate = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York',
});
const orderDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const assignmentDate = (value: string | null, fallback: string) => value ? easternDate.format(new Date(value)) : fallback;
const observedDate = (value: string | null) => value ? orderDate.format(new Date(value + 'T00:00:00Z')) : 'Unknown';

function summarizeCustomers(history: History) {
  const customers = new Map<string, Person & {
    assignment: 'Current' | 'Previous' | null; observation?: Observation;
  }>();
  for (const row of history.assignments) {
    const previous = customers.get(row.customer_id);
    if (previous?.assignment === 'Current') continue;
    customers.set(row.customer_id, { ...row, assignment: row.ended_at ? 'Previous' : 'Current' });
  }
  for (const row of history.observations) {
    customers.set(row.customer_id, { ...row, assignment: customers.get(row.customer_id)?.assignment ?? null, observation: row });
  }
  return [...customers.values()].sort((a, b) =>
    Number(b.assignment === 'Current') - Number(a.assignment === 'Current') ||
    a.customer_name.localeCompare(b.customer_name) || a.customer_id.localeCompare(b.customer_id));
}

export function UnitCustomerHistory({ company, unitId, revision }: { company: string; unitId: string; revision: number }) {
  const [history, setHistory] = useState<History | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setHistory(null);
    setError('');
    async function load() {
      try {
        const response = await fetch('/_api/units/customer-history?' + new URLSearchParams({ companyId: company, id: unitId }),
          { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw Error(data.error || 'Customer history could not be loaded.');
        if (!controller.signal.aborted) setHistory(data);
      } catch (failure) {
        if (!controller.signal.aborted) setError((failure as Error).message);
      }
    }
    void load();
    return () => controller.abort();
  }, [company, unitId, revision, attempt]);

  const customers = history ? summarizeCustomers(history) : [];
  return <details className="customer-section">
    <summary>Customer history</summary>
    <div className="customer-section-body">
      {error && <><p role="alert">{error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Retry history</button></>}
      {!error && !history && <p role="status">Loading customer history…</p>}
      {history && (customers.length ? <div className="customer-table"><table aria-label="Unit customers">
        <thead><tr><th scope="col">Customer</th><th scope="col">Assignment</th><th scope="col">Repair orders</th>
          <th scope="col">First RO</th><th scope="col">Latest RO</th></tr></thead>
        <tbody>{customers.map(row => <tr key={row.customer_id}>
          <td>{row.customer_name}</td><td>{row.assignment ?? 'Recorded on RO'}</td>
          <td>{row.observation?.order_count ?? '—'}</td>
          <td>{row.observation ? observedDate(row.observation.first_order) : '—'}</td>
          <td>{row.observation ? observedDate(row.observation.last_order) : '—'}</td>
        </tr>)}</tbody>
      </table></div> : <p>No customer history recorded.</p>)}
      {!!history?.assignments.length && <details>
        <summary>Assignment dates</summary>
        <div className="customer-table"><table aria-label="Assignment dates">
          <thead><tr><th scope="col">Customer</th><th scope="col">Started</th><th scope="col">Ended</th></tr></thead>
          <tbody>{history.assignments.map(row => <tr key={row.id}>
            <td>{row.customer_name}</td><td>{assignmentDate(row.started_at, 'Unknown')}</td>
            <td>{assignmentDate(row.ended_at, 'Current')}</td>
          </tr>)}</tbody>
        </table></div>
      </details>}
    </div>
  </details>;
}
