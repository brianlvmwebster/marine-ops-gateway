import type {Metadata} from 'next';
import localFont from 'next/font/local';
import './globals.css';
import {getBranding} from '../lib/branding-settings';
import {BrandingProvider} from './brand-logo';
const gatewayFont=localFont({
  src:'../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2',
  variable:'--font-gateway',
  weight:'200 800',
  display:'swap',
});
export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return {title:'Marine Ops Gateway',description:'Your operations, one starting point.',referrer:'no-referrer',
    icons:{icon:branding.faviconUrl,apple:branding.appleTouchIconUrl}};
}
export default async function Layout({children}:{children:React.ReactNode}) {
  const branding = await getBranding();
  return <html lang="en"><body className={gatewayFont.variable}><BrandingProvider branding={branding}>{children}</BrandingProvider></body></html>;
}
