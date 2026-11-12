export type Branding = {
  name: string;
  logoUrl: string;
  faviconUrl: string;
  appleTouchIconUrl: string;
};

// Bundled MOT assets remain available before Administration exists or if it is offline.
export const motBranding: Branding = {
  name: 'Marine Ops Technology',
  logoUrl: '/marine-ops-light.svg',
  faviconUrl: '/favicon.svg?v=mot-boat-1',
  appleTouchIconUrl: '/apple-touch-icon.png?v=mot-boat-1',
};

export function parseBranding(value: unknown): Branding | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 120) return null;
  for (const key of ['logoUrl', 'faviconUrl', 'appleTouchIconUrl']) {
    if (typeof data[key] !== 'string' || data[key].length > 2048) return null;
    try {
      const url = new URL(data[key]);
      if (url.protocol !== 'https:' || url.username || url.password) return null;
    } catch { return null; }
  }
  return {name: data.name.trim(), logoUrl: data.logoUrl as string,
    faviconUrl: data.faviconUrl as string, appleTouchIconUrl: data.appleTouchIconUrl as string};
}
