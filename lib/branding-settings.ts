import 'server-only';
import {cache} from 'react';
import {motBranding, parseBranding} from './branding';

// The future MOT Administration service owns this public, read-only JSON contract.
export const getBranding = cache(async () => {
  const endpoint = process.env.MOT_BRANDING_SETTINGS_URL;
  if (!endpoint) return motBranding;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid endpoint');
    const response = await fetch(url, {next: {revalidate: 60}, signal: AbortSignal.timeout(2000)});
    if (!response.ok) throw new Error('Settings unavailable');
    const branding = parseBranding(await response.json());
    if (!branding) throw new Error('Invalid branding');
    return branding;
  } catch {
    console.warn('MOT branding settings unavailable; using bundled MOT assets.');
    return motBranding;
  }
});
