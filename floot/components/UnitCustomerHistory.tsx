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

  return <details className="customer-section">
    <summary>Customer history</summary>
    <div className="customer-section-body">
      {error && <><p role="alert">{error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Retry history</button></>}
      {!error && !history && <p role="status">Loading customer history…</p>}
      {history && <>
        <h3>Recorded assignments</h3>
        {history.assignments.length ? <div className="customer-table"><table>
          <thead><tr><th scope="col">Customer</th><th scope="col">Started</th><th scope="col">Ended</th></tr></thead>
          <tbody>{history.assignments.map(row => <tr key={row.id}>
            <td>{row.customer_name}</td><td>{assignmentDate(row.started_at, 'Unknown')}</td>
            <td>{assignmentDate(row.ended_at, 'Current')}</td>
          </tr>)}</tbody>
        </table></div> : <p>No customer assignments recorded.</p>}
        {history.observations.length > 0 && <>
          <h3>Customer links recorded on Repair Orders</h3>
          <p>These dates show when a customer and unit appeared together on an order.</p>
          <div className="customer-table"><table>
            <thead><tr><th scope="col">Customer</th><th scope="col">First order</th><th scope="col">Latest order</th><th scope="col">Orders</th></tr></thead>
            <tbody>{history.observations.map(row => <tr key={row.customer_id}>
              <td>{row.customer_name}</td><td>{observedDate(row.first_order)}</td>
              <td>{observedDate(row.last_order)}</td><td>{row.order_count}</td>
            </tr>)}</tbody>
          </table></div>
        </>}
      </>}
    </div>
  </details>;
}
