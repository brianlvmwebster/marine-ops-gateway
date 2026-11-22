import React,{useState} from 'react';
import {Helmet} from 'react-helmet';
import {Link,useLocation} from 'react-router-dom';
import {NativeGatewayGuard} from '../components/NativeGatewayGuard';
import styles from './dock-builder.module.css';
export default function Page(){
 const search=useLocation().search;const quote=new URLSearchParams(search).get('quote');
 const [loading,setLoading]=useState(true);
 return <NativeGatewayGuard><Helmet><title>DockBuilder | Marine Ops</title></Helmet><main className={styles.workspace}>
  <nav className={styles.navigation} aria-label="Gateway navigation"><Link to="/">← Gateway</Link><strong>DockBuilder</strong></nav>
  {loading&&<p role="status">Opening DockBuilder…</p>}
  <iframe className={styles.editor} src={'/_api/dock_builder/asset?file=index.html'+(import.meta.env.VITE_APP_ENV==='staging'&&quote?'&quote='+encodeURIComponent(quote):'')} title="DockBuilder layout and pricing workspace" allow="fullscreen" onLoad={()=>setLoading(false)}/>
 </main></NativeGatewayGuard>;
}
