import React,{useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {initializeLayout} from '../helpers/layoutEngine';
import {layoutDocument} from '../helpers/layoutDocument';
import {api} from '../helpers/demoLayoutLibrary';
import {SavedLayout,LayoutDocument} from '../helpers/savedLayoutTypes';
import {Button} from './Button';
import {Input} from './Input';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from './Dialog';
import s from './LayoutWorkspace.module.css';
type Editor={getState:()=>LayoutDocument;getRecovery:()=>LayoutDocument|null;loadState:(document:LayoutDocument)=>void};
export function LayoutWorkspace(){
 const editor=useRef<Editor|null>(null),baseline=useRef('');
 const [error,setError]=useState(''),[dirty,setDirty]=useState(false),[ready,setReady]=useState(false),[busy,setBusy]=useState(false);
 const [active,setActive]=useState<SavedLayout|null>(null),[library,setLibrary]=useState(false),[name,setName]=useState(''),[naming,setNaming]=useState<'save'|'copy'|'rename'|null>(null),[target,setTarget]=useState<SavedLayout|null>(null),[recovery,setRecovery]=useState(false);
 const cache=useQueryClient();
 const plans=useQuery({queryKey:['saved-layouts'],queryFn:()=>api<SavedLayout[]>('layouts/list'),enabled:library});
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 const discard=()=>!dirty||window.confirm('Discard unsaved changes to this layout? Choose Cancel to save first.');
 const run=async(action:()=>Promise<void>)=>{setBusy(true);setError('');try{await action();}catch(e){setError(e instanceof Error?e.message:'Unable to complete the request.');}finally{setBusy(false);}};
 const replace=(document:LayoutDocument,row:SavedLayout|null)=>{editor.current!.loadState(document);baseline.current=JSON.stringify(editor.current!.getState());setDirty(false);setActive(row);};
 const save=async(copy=false,saveName=active?.name)=>{if(!editor.current||!saveName)return;const document=editor.current.getState();const snapshot=JSON.stringify(document);const row=await api<SavedLayout>('layouts/manage',{action:'save',...(!copy&&active?{id:active.id,revision:active.revision}:{}),name:saveName,document});setActive(row);baseline.current=snapshot;setDirty(JSON.stringify(editor.current.getState())!==snapshot);setNaming(null);await cache.invalidateQueries({queryKey:['saved-layouts']});};
 const openName=(mode:'save'|'copy'|'rename',row:SavedLayout|null=active)=>{setTarget(row);setName(mode==='copy'?(row?row.name+' copy':''):row?.name||'');setNaming(mode);};
 return <main className={s.workspace}>
 <nav className={s.navigation}><Link to="/" onClick={e=>{if(!discard())e.preventDefault();}}>← Demo gateway</Link><strong>Show Layouts · DEMO</strong><span>{active?.name||'Untitled layout'}{dirty?' • Unsaved changes':''}</span>
 <Button size="sm" variant="outline" disabled={!ready||busy} onClick={()=>{if(discard())replace({version:1,booth:{w:720,h:480},labels:true,items:[]},null);}}>New blank</Button>
 <Button size="sm" disabled={!ready||busy} onClick={()=>active?void run(()=>save()):openName('save')}>Save</Button>
 <Button size="sm" variant="outline" disabled={!ready||busy} onClick={()=>openName('copy')}>Save as…</Button>
 <Button size="sm" variant="outline" disabled={!ready||busy} onClick={()=>setLibrary(true)}>Saved layouts</Button>
 {recovery&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>{if(discard()){const draft=editor.current?.getRecovery();if(draft){replace(draft,null);setDirty(true);}}}}>Recover browser draft</Button>}
 </nav>
 {error&&<p className={s.error} role="alert">{error}</p>}
 <iframe inert={busy} className={s.editor} title="Marine Ops Technology Show Layouts demo editor" srcDoc={layoutDocument} sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-downloads allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation" onLoad={event=>{const frame=event.currentTarget;const document=frame.contentDocument;const window=frame.contentWindow;if(!document||!window||document.documentElement.dataset.initialized)return;document.documentElement.dataset.initialized='true';try{const engine=initializeLayout(document,window,{onChange:(next:LayoutDocument)=>setDirty(JSON.stringify(next)!==baseline.current)}) as Editor;editor.current=engine;baseline.current=JSON.stringify(engine.getState());setRecovery(!!engine.getRecovery());setReady(true);}catch(e){setError('The layout editor could not start. Refresh to retry.');console.error(e);}}}/>
 <Dialog open={library} onOpenChange={setLibrary}><DialogContent className={s.dialog}><DialogHeader><DialogTitle>Saved layouts</DialogTitle><DialogDescription>Saved only in this browser. No account or production data is used. Export a layout to keep a portable copy.</DialogDescription></DialogHeader>
 {plans.isPending&&<p>Loading layouts…</p>}{plans.isError&&<p role="alert">{plans.error.message}<Button onClick={()=>void plans.refetch()}>Retry</Button></p>}{plans.data?.length===0&&<p>No saved layouts yet. Create a plan and choose Save.</p>}
 <div className={s.list}>{plans.data?.map(row=><div className={s.row} key={row.id}><div><strong>{row.name}</strong><small>Updated {new Date(row.updatedAt).toLocaleString()} by {row.updatedBy}</small></div><div className={s.actions}>
 <Button size="sm" disabled={busy} onClick={()=>{if(discard())void run(async()=>{const result=await api<SavedLayout&{document:LayoutDocument}>('layouts/load?id='+encodeURIComponent(row.id));replace(result.document,result);setLibrary(false);});}}>Load</Button>
 <Button size="sm" variant="outline" disabled={busy} onClick={()=>openName('rename',row)}>Rename</Button>
 <Button size="sm" variant="destructive" disabled={busy} onClick={()=>{if(window.confirm('Delete saved layout “'+row.name+'”? This cannot be undone.'))void run(async()=>{await api('layouts/manage',{action:'delete',id:row.id,revision:row.revision});if(active?.id===row.id){setActive(null);setDirty(true);}await cache.invalidateQueries({queryKey:['saved-layouts']});});}}>Delete</Button></div></div>)}</div>
 {error&&<p role="alert">{error}</p>}
 </DialogContent></Dialog>
 <Dialog open={naming!==null} onOpenChange={open=>{if(!open&&!busy)setNaming(null);}}><DialogContent><DialogHeader><DialogTitle>{naming==='rename'?'Rename layout':naming==='copy'?'Save a new copy':'Save layout'}</DialogTitle><DialogDescription>Give this plan a name you can recognize.</DialogDescription></DialogHeader><form onSubmit={e=>{e.preventDefault();void run(async()=>{if(naming==='rename'&&target){const row=await api<SavedLayout>('layouts/manage',{action:'rename',id:target.id,revision:target.revision,name});if(active?.id===row.id)setActive(active.revision===target.revision?row:{...active,name:row.name});setNaming(null);await cache.invalidateQueries({queryKey:['saved-layouts']});}else await save(naming==='copy',name);});}}><label htmlFor="layout-name">Layout name</label><Input id="layout-name" value={name} onChange={e=>setName(e.target.value)} maxLength={100} required autoFocus/><Button type="submit" disabled={busy||!name.trim()}>{busy?'Saving…':'Save'}</Button></form>{error&&<p role="alert">{error}</p>}</DialogContent></Dialog>
 </main>;
}
