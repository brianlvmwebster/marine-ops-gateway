import React,{useEffect,useState} from 'react';
import {useLocation} from 'react-router-dom';
import {applyWorkspaceTheme,resolveWorkspaceTheme,workspaceThemeKey,workspaceThemes,type WorkspaceThemeId} from '../helpers/workspaceAppearance';
export function WorkspaceAppearance(){
 const [theme,setTheme]=useState<WorkspaceThemeId>(()=>resolveWorkspaceTheme(document.documentElement.dataset.workspaceTheme||null).id);
 const {pathname}=useLocation();
 useEffect(()=>{const sync=(e:StorageEvent)=>{if(e.key===workspaceThemeKey||e.key===null)setTheme(applyWorkspaceTheme(e.newValue));};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[]);
 function change(value:string){const next=applyWorkspaceTheme(value);setTheme(next);try{localStorage.setItem(workspaceThemeKey,next);}catch{}}
 if(pathname.endsWith('/print'))return null;
 return <div className="workspace-appearance"><a href="/platform" className="workspace-wordmark">MARINE OPS <span>WORKSPACE</span></a><div className="workspace-appearance-actions"><span className="workspace-environment">STAGING</span><label htmlFor="workspace-theme">Theme</label><select id="workspace-theme" value={theme} onChange={e=>change(e.target.value)}>{(['light','dark'] as const).map(mode=><optgroup key={mode} label={mode==='light'?'Light themes':'Dark themes'}>{workspaceThemes.filter(t=>t.mode===mode).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>)}</select></div></div>;
}
