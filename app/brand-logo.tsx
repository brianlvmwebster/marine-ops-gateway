'use client';
import {createContext, useContext, useState} from 'react';
import {motBranding, type Branding} from '../lib/branding';

const BrandingContext = createContext<Branding>(motBranding);

export function BrandingProvider({branding, children}: {branding: Branding; children: React.ReactNode}) {
  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

export default function BrandLogo() {
  const branding = useContext(BrandingContext);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const current = failedUrl === branding.logoUrl ? motBranding : branding;
  return <img className="mot-logo" src={current.logoUrl} alt={current.name}
    width="240" height="36" onError={() => setFailedUrl(branding.logoUrl)} />;
}
