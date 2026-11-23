import React,{useState} from 'react';
import {JobEditor} from './JobEditor';
import type {CustomerContact} from '../helpers/customerJobContact';

export function CustomerNewServiceJob({company,customerId,onSaved}:{company:string;customerId:string;onSaved:()=>void}){
 const [customer,setCustomer]=useState<CustomerContact|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 async function start(){setBusy(true);setError('');setMessage('');try{
  const response=await fetch('/_api/customers/job-context?companyId='+encodeURIComponent(company)+'&id='+encodeURIComponent(customerId));
  const body=await response.json();if(!response.ok)throw Error(body.error||'Unable to start service job.');setCustomer(body.customer);
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <div><button type="button" disabled={busy||!!customer} onClick={start}>{busy?'Loading customer details...':'New Service Job'}</button>
 <p>Uses saved customer contact details. Save any customer edits first. Choose one of their available units or enter vessel details manually.</p>
 {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 {customer&&<JobEditor job={null} open initialCustomer={customer} onClose={()=>setCustomer(null)} onSaved={()=>{setMessage('Service job saved and linked to this customer.');onSaved();}}/>}
 </div>;
}
