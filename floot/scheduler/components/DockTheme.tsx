// @ts-nocheck
// Existing scheduler interface preserved for migration.
import React, { useEffect, useState } from 'react';
import { MantineProvider, createTheme, rem, Badge } from '@mantine/core';

const theme = createTheme({
  // Shade 6 is sampled directly from the Dock & Lift Services badge wave.
  colors: { lakeview: ['#edf5fc', '#d7e9f8', '#acd0ef', '#7db5e4', '#4c98d4', '#227bbd', '#00589e', '#00477f', '#002f5d', '#001d3d'] },
  primaryColor: 'lakeview',
  primaryShade: { light: 6, dark: 3 },
  defaultRadius: 'md',
  fontFamily: 'Calibri, Candara, Segoe UI, Arial, sans-serif',
  fontSizes: Object.fromEntries(Object.entries({ xs: 12, sm: 14, md: 16, lg: 18, xl: 20 }).map(([size, pixels]) => [size, rem(pixels * 0.9)])),
  headings: {
    fontFamily: 'Calibri, Candara, Segoe UI, Arial, sans-serif',
    sizes: Object.fromEntries([34, 26, 22, 18, 16, 14].map((pixels, index) => [`h${index + 1}`, { fontSize: rem(pixels * 0.9) }])),
  },
  components: { Badge: Badge.extend({ styles: { root: { fontSize: 'calc(var(--badge-fz) * 0.9)' } } }) },
});
const listeners = new Set();
let currentTheme = 'light';
try { currentTheme = localStorage.getItem('dockCrewMapperTheme') || 'light'; } catch { /* Storage may be unavailable. */ }
export function Provider({ children }) {
  const [scheme, setScheme] = useState(currentTheme);
  useEffect(() => { listeners.add(setScheme); return () => listeners.delete(setScheme); }, []);
  return <MantineProvider theme={theme} forceColorScheme={scheme}>{children}</MantineProvider>;
}


export function setAppTheme(scheme) {
  currentTheme = scheme;
  document.documentElement.dataset.mantineColorScheme = scheme;
  document.body.classList.toggle('dark', scheme === 'dark');
  listeners.forEach(listener => listener(scheme));
  try { localStorage.setItem('dockCrewMapperTheme', scheme); } catch {}
}
