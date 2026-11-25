// @ts-nocheck
// Existing scheduler interface preserved for migration.
// Keep deliberate crew choices; address changes invalidate automatic guesses.
export function updateAddressField(draft, key, value) {
  return { ...draft, [key]: value, waterbodyMatch: null,
    ...(draft.waterbodyOrigin === 'auto' ? { bodyOfWater: '', waterbodyId: null, waterbodyOrigin: null } : {}) };
}

export function applyAddress(draft, address, waterbodyMatch) {
  const result = { ...draft, ...address, waterbodyMatch: waterbodyMatch || null };
  if (draft.waterbodyOrigin === 'other' || (draft.bodyOfWater && draft.waterbodyOrigin !== 'auto')) return result;
  const candidate = waterbodyMatch?.nearby?.find(item => item.id === waterbodyMatch.suggestedId);
  return { ...result, bodyOfWater: candidate?.name || '', waterbodyId: candidate?.id || null, waterbodyOrigin: candidate ? 'auto' : null };
}
