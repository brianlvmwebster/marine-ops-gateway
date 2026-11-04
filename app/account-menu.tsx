'use client';
import {useState} from 'react';
export default function AccountMenu({email}:{email?:string}){
 const [busy,setBusy]=useState(false);
 return <div className="account-menu">{email?<span>{email}</span>:null}<button disabled={busy} onClick={async()=>{setBusy(true);try{const response=await fetch('/api/auth/sign-out',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(response.ok)window.location.assign('/sign-in');else setBusy(false);}catch{setBusy(false);}}}>{busy?'Signing out…':'Sign out'}</button></div>;
}
