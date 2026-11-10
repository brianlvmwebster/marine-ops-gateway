import {serviceApiUrl} from '../helpers/serviceRuntime';
import React,{useEffect,useRef,useState} from 'react';
import {Button} from './Button';
import {Dialog,DialogContent,DialogTitle,DialogDescription,DialogFooter} from './Dialog';
import {toast} from '../helpers/toast';
type Props={feature:'calendar';onConnected?:()=>void;className?:string;changingAccount?:boolean;disabled?:boolean};
export function ConnectMicrosoftButton({feature,onConnected,className,changingAccount=false,disabled=false}:Props){
 const [busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false);
 const cleanupRef=useRef<(()=>void)|null>(null);
 useEffect(()=>()=>cleanupRef.current?.(),[]);
 const openFlow=()=>{
  const popup=window.open('about:blank','microsoft_integrations','width=480,height=720');
  if(!popup){toast.error('Allow popups to connect Outlook');return;}
  setConfirm(false);setBusy(true);
  let timeout:ReturnType<typeof setTimeout>;
  let closed:ReturnType<typeof setInterval>;
  const cleanup=()=>{window.removeEventListener('message',listener);clearTimeout(timeout);clearInterval(closed);setBusy(false);cleanupRef.current=null;};
  const listener=(event:MessageEvent)=>{
   if(event.origin!==window.location.origin||event.source!==popup)return;
   const data=event.data;
   if(data?.type==='MICROSOFT_INTEGRATION_SUCCESS'){cleanup();toast(changingAccount?'Outlook account updated':'Outlook connected');onConnected?.();}
   else if(data?.type==='MICROSOFT_INTEGRATION_ERROR'){cleanup();toast.error(data.message||data.error||'Connection failed');}
  };
  cleanupRef.current=cleanup;window.addEventListener('message',listener);
  timeout=setTimeout(cleanup,180000);
  closed=setInterval(()=>{if(popup.closed)cleanup();},1000);
  fetch(serviceApiUrl('auth/microsoft_integrations_authorize')+'?feature='+feature)
   .then(async res=>{const data=await res.json();if(!res.ok||!data.authorize_url)throw new Error(data.error||'Could not start Microsoft connection');popup.location.href=data.authorize_url;})
   .catch(e=>{cleanup();popup.close();toast.error(e.message);});
 };
 return <><Button className={className} variant="outline" disabled={disabled||busy} onClick={()=>changingAccount?setConfirm(true):openFlow()}>{busy?'Connecting…':changingAccount?'Change Outlook account':'Connect Outlook'}</Button>
 <Dialog open={confirm} onOpenChange={setConfirm}><DialogContent><DialogTitle>Change Outlook account?</DialogTitle><DialogDescription>Choose another Microsoft account in the sign-in window. Jobs will sync to that account’s default calendar. Existing events in the previous calendar will remain there and stop syncing. Live notifications will need to be enabled again.</DialogDescription><DialogFooter><Button variant="outline" onClick={()=>setConfirm(false)}>Cancel</Button><Button onClick={openFlow}>Choose Microsoft account</Button></DialogFooter></DialogContent></Dialog></>;
}