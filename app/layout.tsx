import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
export const metadata: Metadata = {title:'Marine Ops Gateway',description:'Your operations, one starting point.'};
export default function Layout({children}:{children:React.ReactNode}) {return <ClerkProvider><html lang="en"><body>{children}</body></html></ClerkProvider>;}
