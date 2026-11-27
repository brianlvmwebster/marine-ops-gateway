import React, { useEffect, useState } from 'react';
import { Button, Group, Loader, NativeSelect, Stack, Text, TextInput } from '@mantine/core';
import { customerDisplayName, type CustomerContact } from '../../helpers/customerJobContact';
import { LAKEVIEW_ID } from '../../platform/policy';

type Address = {
  label: 'primary' | 'alternate'; line1: string; line2: string; city: string; state: string; postal_code: string;
};
export type DockCustomer = CustomerContact & { addresses: Address[] };
export type DockCustomerAddress = { street: string; city: string; state: string; zip: string };

function singleLine(value: string) {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function jobAddress(address: Address): DockCustomerAddress {
  return {
    street: [address.line1, address.line2].map(singleLine).filter(Boolean).join(', '),
    city: singleLine(address.city), state: singleLine(address.state), zip: singleLine(address.postal_code),
  };
}

export function DockCustomerPicker({ disabled, selected, selectedAddress, onCustomer, onAddress }: {
  disabled: boolean;
  selected: DockCustomer | null;
  selectedAddress: string;
  onCustomer: (customer: DockCustomer | null) => void;
  onAddress: (id: string, address?: DockCustomerAddress) => void;
}) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState<{ query: string; page: number } | null>(null);
  const [results, setResults] = useState<{ rows: DockCustomer[]; total: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!search) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ companyId: LAKEVIEW_ID, status: 'active', q: search.query, page: String(search.page) });
    async function load() {
      try {
        const response = await fetch('/_api/customers?' + params, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error(response.status === 403 ? 'The shared Customers list is unavailable for your account.' : 'Customers could not be loaded.');
        const data = await response.json();
        if (!controller.signal.aborted) setResults(data);
      } catch (failure) {
        if (!controller.signal.aborted) setError((failure as Error).message);
      }
    }
    void load();
    return () => controller.abort();
  }, [search]);

  function runSearch(page = 0) {
    const term = page ? search?.query : query.trim();
    if (!term || disabled) return;
    setResults(null);
    setError('');
    setSearch({ query: term, page });
  }

  const addresses = (selected?.addresses ?? []).flatMap((saved, index) => {
    const fields = jobAddress(saved);
    const text = [fields.street, fields.city, [fields.state, fields.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    return text ? [{
      value: String(index), fields,
      label: `${saved.label === 'alternate' ? 'Alternate' : 'Primary'} · ${text}`,
    }] : [];
  });
  const busy = search !== null && results === null && !error;

  return <Stack gap="xs" aria-label="Shared customer picker">
    <Group align="end" gap="xs">
      <TextInput label="Find a customer" placeholder="Name, Lightspeed number, email or phone"
        value={query} maxLength={200} disabled={disabled} style={{ flex: '1 1 16rem' }}
        onChange={event => setQuery(event.currentTarget.value)}
        onKeyDown={event => {
          if (event.key === 'Enter') { event.preventDefault(); runSearch(); }
        }} />
      <Button type="button" variant="default" disabled={disabled || !query.trim() || busy} onClick={() => runSearch()}>
        Search customers
      </Button>
    </Group>
    {busy && <Group gap="xs" role="status"><Loader size="xs" /><Text size="sm">Searching customers…</Text></Group>}
    {error && <Text size="sm" c="red" role="alert">{error} You can enter contact information manually.</Text>}
    {results && (results.rows.length ? <>
      <Stack component="ul" gap={4} p={0} m={0} aria-label="Matching customers"
        style={{ listStyle: 'none', maxHeight: 220, overflowY: 'auto' }}>
        {results.rows.map(customer => <li key={customer.id}>
          <Button fullWidth type="button" variant="subtle" justify="space-between" disabled={disabled}
            aria-pressed={selected?.id === customer.id} styles={{ label: { whiteSpace: 'normal' }, root: { height: 'auto', minHeight: 36, textAlign: 'left' } }}
            onClick={() => {
              onCustomer(customer);
              setQuery('');
              setSearch(null);
              setResults(null);
            }}>
            {customerDisplayName(customer)}
            {customer.source_number && ` · #${customer.source_number}`}
          </Button>
        </li>)}
      </Stack>
      {search && results.total > 50 && <Group gap="xs">
        <Button type="button" variant="default" size="compact-sm" disabled={disabled || !search.page}
          onClick={() => {
            setResults(null);
            setSearch({ ...search, page: search.page - 1 });
          }}>Previous</Button>
        <Text size="sm">Page {search.page + 1} of {Math.ceil(results.total / 50)}</Text>
        <Button type="button" variant="default" size="compact-sm" disabled={disabled || (search.page + 1) * 50 >= results.total}
          onClick={() => runSearch(search.page + 1)}>Next</Button>
      </Group>}
    </> : <Text size="sm" role="status">No matching available customers.</Text>)}
    {selected && <>
      <Group justify="space-between" gap="xs">
        <Text size="sm"><strong>Selected:</strong> {customerDisplayName(selected)}</Text>
        <Button type="button" variant="subtle" size="compact-sm" disabled={disabled}
          onClick={() => onCustomer(null)}>Clear customer selection</Button>
      </Group>
      {addresses.length > 0 ? <NativeSelect label="Saved customer address" value={selectedAddress}
        disabled={disabled} data={[{ value: '', label: 'Enter job location manually' }, ...addresses.map(({ value, label }) => ({ value, label }))]}
        onChange={event => {
          const value = event.currentTarget.value;
          onAddress(value, addresses.find(address => address.value === value)?.fields);
        }} /> : <Text size="sm" c="dimmed">This customer has no saved address.</Text>}
    </>}
  </Stack>;
}
