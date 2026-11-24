export const workspaceThemes = [
 {id:'paper',name:'Paper',mode:'light',background:'#eef1f4',card:'#ffffff',surface:'#f5f7f9',foreground:'#172632',muted:'#506170',border:'#bcc8d2',primary:'#155c91',primaryText:'#ffffff'},
 {id:'mist',name:'Mist',mode:'light',background:'#e8efef',card:'#fbfdfd',surface:'#eff5f4',foreground:'#193332',muted:'#4a6663',border:'#afc5c1',primary:'#17685e',primaryText:'#ffffff'},
 {id:'sand',name:'Sand',mode:'light',background:'#eeeae2',card:'#fffdf8',surface:'#f6f1e8',foreground:'#342e25',muted:'#6b5e4b',border:'#cbbfae',primary:'#805321',primaryText:'#ffffff'},
 {id:'midnight',name:'Midnight',mode:'dark',background:'#0d1725',card:'#152237',surface:'#1c2c42',foreground:'#edf3fb',muted:'#b0bfd2',border:'#425775',primary:'#8fc9ff',primaryText:'#10263c'},
 {id:'graphite',name:'Graphite',mode:'dark',background:'#17191d',card:'#22252b',surface:'#2b2f36',foreground:'#f0f1f3',muted:'#b8bec8',border:'#555c68',primary:'#bacbff',primaryText:'#202940'},
 {id:'pine',name:'Pine',mode:'dark',background:'#101d1b',card:'#192b27',surface:'#233932',foreground:'#edf6f1',muted:'#adc7bb',border:'#49695c',primary:'#8cdbb6',primaryText:'#143327'},
] as const;
export type WorkspaceThemeId=typeof workspaceThemes[number]['id'];
export const workspaceThemeKey='marineops.appearance.v1';
export function resolveWorkspaceTheme(value:string|null){return workspaceThemes.find(t=>t.id===value)||workspaceThemes[0];}
export function applyWorkspaceTheme(value:string|null){
 const t=resolveWorkspaceTheme(value),root=document.documentElement;
 root.dataset.workspaceTheme=t.id;root.dataset.workspaceMode=t.mode;
 const vars={background:t.background,card:t.card,surface:t.surface,foreground:t.foreground,'muted-foreground':t.muted,border:t.border,primary:t.primary,'primary-foreground':t.primaryText};
 for(const [key,v] of Object.entries(vars))root.style.setProperty('--'+key,v);
 return t.id;
}
export function initializeWorkspaceAppearance(){let saved=null;try{saved=localStorage.getItem(workspaceThemeKey);}catch{}return applyWorkspaceTheme(saved);}
