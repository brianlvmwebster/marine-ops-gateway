import React, { useEffect, useId, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { NativeGatewayGuard } from '../components/NativeGatewayGuard';
import { Button } from '../components/Button';
import { postGatewaySchedulerLaunch } from '../endpoints/gateway/scheduler_launch_POST.schema';
import styles from './dockscheduler.module.css';

function Workspace() {
  const frameName='scheduler-'+useId().replace(/:/g,'');
  const form=useRef<HTMLFormElement>(null);
  const submitted=useRef(false);
  const [attempt,setAttempt]=useState(0);
  const [ticket,setTicket]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    let active=true;submitted.current=false;setTicket('');setError('');setLoading(true);
    const controller=new AbortController();
    const timeout=window.setTimeout(()=>{
      if(!active)return;
      active=false;controller.abort();setTicket('');setLoading(false);
      setError('The scheduler did not open. Select Reopen scheduler to try again.');
    },20000);
    postGatewaySchedulerLaunch({}, {signal:controller.signal}).then(result=>{if(active)setTicket(result.ticket);}).catch(error=>{if(active){window.clearTimeout(timeout);setError(error instanceof Error?error.message:'Unable to open scheduler.');setLoading(false);}});
    const loaded=()=>{if(submitted.current){window.clearTimeout(timeout);}};
    const frame=document.getElementsByName(frameName)[0];
    frame?.addEventListener('load',loaded);
    return()=>{active=false;controller.abort();window.clearTimeout(timeout);frame?.removeEventListener('load',loaded);};
  },[attempt]);
  useEffect(()=>{if(ticket&&form.current&&!submitted.current){submitted.current=true;form.current.submit();}},[ticket]);
  return <main className={styles.workspace}>
    <nav className={styles.navigation} aria-label="Gateway navigation">
      <Link to="/">← Gateway</Link><span>Dock Crew Scheduler</span>
      <Button size="sm" variant="secondary" disabled={loading} onClick={()=>setAttempt(value=>value+1)}>Reopen scheduler</Button>
    </nav>
    {loading&&<p role="status">Opening your crew workspace with Microsoft sign-in…</p>}
    {error&&<p role="alert">{error}</p>}
    <form ref={form} method="post" action="https://dockscheduler.marineopstech.net/_api/dock/gateway_launch" target={frameName} hidden>
      <input type="hidden" name="ticket" value={ticket} readOnly />
    </form>
    <iframe name={frameName} className={styles.scheduler} title="Lakeview Dock Crew Scheduler"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"
      allow="geolocation https://dockscheduler.marineopstech.net; fullscreen https://dockscheduler.marineopstech.net"
      referrerPolicy="no-referrer"
      onLoad={()=>{if(submitted.current){setLoading(false);setTicket('');setError('');}}}
    />
  </main>;
}
export default function Page() {
  return <NativeGatewayGuard><Helmet><title>Dock Crew Scheduler | Lakeview</title></Helmet><Workspace /></NativeGatewayGuard>;
}
