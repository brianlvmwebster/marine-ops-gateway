// @ts-nocheck
// Existing scheduler interface preserved for migration.
import React, { useMemo } from 'react';
import { Button, Group, Select, Stack, Text, TextInput } from '@mantine/core';

export function WaterbodyInput({ draft, setDraft, waters, error, loading, onRetry, disabled, required }) {
  const matching = waters.filter(water => water.name === draft.bodyOfWater);
  const selected = waters.find(water => water.id === draft.waterbodyId && water.name === draft.bodyOfWater) || (matching.length === 1 ? matching[0] : null);
  const custom = draft.waterbodyOrigin === 'other';
  const saved = draft.bodyOfWater && !selected && !custom;
  const value = custom ? 'other' : selected?.id || (saved ? 'saved' : null);
  const nearby = draft.waterbodyMatch?.nearby || [];
  const nearbyKey = nearby.map(water => water.id).join(',');
  const data = useMemo(() => {
    const close = new Set(nearbyKey.split(','));
    const groups = [];
    if (nearbyKey) groups.push({ group: 'Nearby the selected address', items: waters.filter(water => close.has(water.id)).sort((a, b) => nearbyKey.indexOf(a.id) - nearbyKey.indexOf(b.id)).map(water => ({ value: water.id, label: water.label })) });
    if (saved) groups.push({ group: 'Saved job value', items: [{ value: 'saved', label: `${draft.bodyOfWater} · saved value` }] });
    groups.push({ group: 'All waterbodies · MA, CT, RI', items: waters.filter(water => !close.has(water.id)).map(water => ({ value: water.id, label: water.label })) });
    return [{ value: 'other', label: 'Other / not listed' }, ...groups];
  }, [waters, nearbyKey, saved, draft.bodyOfWater]);
  const choose = id => {
    if (id === 'saved') return;
    const water = waters.find(item => item.id === id);
    setDraft(previous => ({ ...previous, bodyOfWater: water?.name || '', waterbodyId: water?.id || null, waterbodyOrigin: id === 'other' ? 'other' : 'manual' }));
  };
  const automatic = draft.waterbodyOrigin === 'auto' && selected;
  return <Stack gap="xs">
    <Select label="Body of water" placeholder={loading ? 'Loading waterbodies…' : 'Search or select a body of water'} description="Search lakes, ponds and reservoirs in MA, CT and RI." data={data} value={value} onChange={choose} searchable clearable clearButtonProps={{ 'aria-label': 'Clear body of water', 'aria-hidden': false, tabIndex: 0 }} limit={50} maxDropdownHeight={300} nothingFoundMessage="No matches. Clear the search and choose Other / not listed." disabled={disabled} required={required} comboboxProps={{ zIndex: 1250 }} />
    {custom && <TextInput label="Other body of water" value={draft.bodyOfWater} onChange={event => { const bodyOfWater = event.currentTarget.value; setDraft(previous => ({ ...previous, bodyOfWater })); }} required={required} disabled={disabled} maxLength={200} />}
    {error && <Group gap="xs"><Text size="xs" c="orange">The waterbody list could not load. Use Other / not listed or retry.</Text><Button variant="subtle" size="compact-xs" onClick={onRetry} disabled={disabled}>Retry waterbody list</Button></Group>}
    {automatic && <Text size="xs" c="dimmed">Suggested from the address: {selected.label}. Confirm this selection; distances are to recorded waterbody points, not shorelines.</Text>}
    {!automatic && draft.waterbodyMatch?.reason === 'uncertain' && <Text size="xs" c="dimmed">The nearest waterbody is uncertain. Review the nearby options or search the full list.</Text>}
    {!automatic && draft.waterbodyMatch?.reason === 'none' && <Text size="xs" c="dimmed">No waterbody reference point was found within 5 km. Choose one from the list.</Text>}
    {nearby.length > 0 && <Text size="xs" c="dimmed">Nearest reference point: {nearby[0].name}, {(nearby[0].distanceMeters / 1000).toFixed(1)} km away. Nearby choices appear first in the dropdown.</Text>}
  </Stack>;
}
