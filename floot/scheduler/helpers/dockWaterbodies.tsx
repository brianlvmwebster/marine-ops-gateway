// @ts-nocheck
// Migrated from waterbodies.js; source behavior retained.
import { createHash } from 'node:crypto';
import { waters } from './dockWaterbodyData';

export function createWaterbodyCatalog(records) {
  const counts = new Map();
  for (const water of records) {
    const key = `${water.state}:${water.name}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const catalog = records.map(water => ({
    ...water,
    id: createHash('sha256').update(JSON.stringify([water.state, water.name, water.latitude, water.longitude])).digest('hex').slice(0, 24),
    label: `${water.name} · ${water.state}${counts.get(`${water.state}:${water.name}`) > 1 ? ` (${water.latitude}, ${water.longitude})` : ''}`,
  }));
  return {
    options: catalog.map(({ id, name, state, label }) => ({ id, name, state, label })),
    match(location, state) {
      const { latitude, longitude } = location || {};
      if (!['MA', 'CT', 'RI'].includes(state) || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return { suggestedId: null, nearby: [], reason: 'unavailable' };
      // Reference points are not shorelines. Include cross-border candidates.
      const nearby = catalog.map(water => ({ ...water, distance: distanceMeters(latitude, longitude, water.latitude, water.longitude) }))
        .filter(water => water.distance <= 5000).sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id)).slice(0, 5);
      const [first, second] = nearby;
      const distinct = !second || (second.distance - first.distance >= 500 && second.distance >= first.distance * 1.5);
      const suggestedId = first && first.distance <= 2000 && distinct ? first.id : null;
      return {
        suggestedId,
        nearby: nearby.map(({ id, name, label, distance }) => ({ id, name, label, distanceMeters: Math.round(distance) })),
        reason: suggestedId ? 'nearest' : first ? 'uncertain' : 'none',
      };
    },
  };
}

export function distanceMeters(latA, lngA, latB, lngB) {
  const rad = degrees => degrees * Math.PI / 180;
  const a = Math.sin(rad(latB - latA) / 2) ** 2 + Math.cos(rad(latA)) * Math.cos(rad(latB)) * Math.sin(rad(lngB - lngA) / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
}

export const waterbodies = createWaterbodyCatalog(waters);
