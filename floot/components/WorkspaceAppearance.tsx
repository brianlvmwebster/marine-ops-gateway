import React,{useEffect,useState} from 'react';
import {useLocation} from 'react-router-dom';
import {
 applyWorkspaceLayout,applyWorkspaceTheme,resolveWorkspaceLayout,resolveWorkspaceTheme,
 workspaceLayouts,workspaceLayoutKey,workspaceThemeGroups,workspaceThemeKey,
 type WorkspaceLayoutId,type WorkspaceThemeId,
} from '../helpers/workspaceAppearance';
export function WorkspaceAppearance(){
 const [theme,setTheme]=useState<WorkspaceThemeId>(()=>resolveWorkspaceTheme(document.documentElement.dataset.workspaceTheme||null).id);
 const [layout,setLayout]=useState<WorkspaceLayoutId>(()=>resolveWorkspaceLayout(document.documentElement.dataset.workspaceLayout||null).id);
 const {pathname}=useLocation();
 useEffect(()=>{
  const sync=(event:StorageEvent)=>{
   if(event.key===workspaceThemeKey||event.key===null)setTheme(applyWorkspaceTheme(event.newValue));
   if(event.key===workspaceLayoutKey||event.key===null)setLayout(applyWorkspaceLayout(event.newValue));
  };
  window.addEventListener('storage',sync);
  return()=>window.removeEventListener('storage',sync);
 },[]);
 function changeTheme(value:string){const next=applyWorkspaceTheme(value);setTheme(next);try{localStorage.setItem(workspaceThemeKey,next);}catch{}}
 function changeLayout(value:string){const next=applyWorkspaceLayout(value);setLayout(next);try{localStorage.setItem(workspaceLayoutKey,next);}catch{}}
 if(pathname.endsWith('/print'))return null;
 return <div className="workspace-appearance">
  <a href="/" className="workspace-wordmark">MARINE OPS <span>WORKSPACE</span></a>
  <div className="workspace-appearance-actions">
   <span className="workspace-environment">STAGING</span>
   <label>Theme
   <select id="workspace-theme" value={theme} onChange={e=>changeTheme(e.target.value)}>
    {workspaceThemeGroups.map(group=><optgroup key={group.label} label={group.label}>
     {group.themes.map(option=><option key={option.id} value={option.id}>{option.name}</option>)}
    </optgroup>)}
   </select></label>
   <label>Layout
    <select id="workspace-layout" value={layout} onChange={event=>changeLayout(event.target.value)}>
     {workspaceLayouts.map(option=><option key={option.id} value={option.id}>{option.name}</option>)}
    </select>
   </label>
  </div>
 </div>;
}
