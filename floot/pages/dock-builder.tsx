import React,{useState} from 'react';
import {Helmet} from 'react-helmet';
import {Link} from 'react-router-dom';
import {NativeGatewayGuard} from '../components/NativeGatewayGuard';
import styles from './dock-builder.module.css';
export default function Page(){
 const [loading,setLoading]=useState(true);
 return <NativeGatewayGuard><Helmet><title>DockBuilder | Marine Ops</title></Helmet><main className={styles.workspace}>
  <nav className={styles.navigation} aria-label="Gateway navigation"><Link to="/">← Gateway</Link><strong>DockBuilder</strong></nav>
  {loading&&<p role="status">Opening DockBuilder…</p>}
  <iframe className={styles.editor} src="/_api/dock_builder/asset?file=index.html" title="DockBuilder layout and pricing workspace" allow="fullscreen" onLoad={()=>setLoading(false)}/>
 </main></NativeGatewayGuard>;
}
