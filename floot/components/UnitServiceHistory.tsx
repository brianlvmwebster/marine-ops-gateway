import React, {useEffect, useState} from 'react';

type ServiceEntry = {id:string;job_number:number;service_date:string|null;status:string|null;services:string[]|null};
export function UnitServiceHistory({company,unitId}:{company:string;unitId:string}) {
  const [page,setPage]=useState(0),[retry,setRetry]=useState(0);
  const [result,setResult]=useState<{rows:ServiceEntry[];total:number}|null>(null),[error,setError]=useState('');
  useEffect(()=>{
    const controller=new AbortController();setResult(null);setError('');
    async function load(){
      try{
        const response=await fetch('/_api/units/history?companyId='+encodeURIComponent(company)+'&id='+encodeURIComponent(unitId)+'&page='+page,{signal:controller.signal});
        const body=await response.json();
        if(!response.ok)throw Error(body.error||'Service history unavailable.');
        if(!controller.signal.aborted)setResult(body);
      }catch(e){if(!controller.signal.aborted)setError((e as Error).message);}
    }
    void load();return()=>controller.abort();
  },[company,unitId,page,retry]);
  return <section aria-label="Unit service history">
    <h3>Service history</h3>
    <p>Service Desk jobs linked to this unit, newest service date first. Includes completed and cancelled jobs. History stays with the unit when its customer assignment changes.</p>
    {error?<div role="alert"><p>{error}</p><button type="button" onClick={()=>setRetry(n=>n+1)}>Retry service history</button></div>:!result?<p role="status">Loading service history…</p>:<>
      <p role="status">{result.total} linked {result.total===1?'job':'jobs'}</p>
      {!result.rows.length?<p>No linked Service Desk jobs for this unit.</p>:<div className="customer-table"><table>
        <thead><tr><th>Job</th><th>Service date</th><th>Status</th><th>Requested work</th></tr></thead>
        <tbody>{result.rows.map(job=><tr key={job.id}><td><a href={'/dashboard/jobs/'+job.id+'/print'} target="_blank" rel="noopener noreferrer">Open job #{job.job_number} (service sheet, new tab)</a></td><td>{job.service_date||'Unscheduled'}</td><td>{job.status||'Not specified'}</td><td>{job.services?.join(' · ')||'Not specified'}</td></tr>)}</tbody>
      </table></div>}
      {result.total>50&&<div><button type="button" disabled={page===0} onClick={()=>setPage(n=>n-1)}>Previous service jobs</button><span> Page {page+1} of {Math.ceil(result.total/50)} </span><button type="button" disabled={(page+1)*50>=result.total} onClick={()=>setPage(n=>n+1)}>Next service jobs</button></div>}
    </>}
  </section>;
}
