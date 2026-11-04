import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Marine Ops Gateway',description:'Your operations, one starting point.',referrer:'no-referrer'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
