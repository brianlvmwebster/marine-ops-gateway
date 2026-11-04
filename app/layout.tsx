import type {Metadata} from 'next';
import localFont from 'next/font/local';
import './globals.css';
const gatewayFont=localFont({
  src:'../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2',
  variable:'--font-gateway',
  weight:'200 800',
  display:'swap',
});
export const metadata:Metadata={title:'Marine Ops Gateway',description:'Your operations, one starting point.',referrer:'no-referrer'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body className={gatewayFont.variable}>{children}</body></html>;}
