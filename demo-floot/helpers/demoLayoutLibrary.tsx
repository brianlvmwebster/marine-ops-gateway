import {layoutActionSchema,LayoutDocument,SavedLayout} from './savedLayoutTypes';
type Row=SavedLayout&{document:LayoutDocument};
const key='mot-demo-layouts-v1';
export function demoLayoutLibrary(storage:Pick<Storage,'getItem'|'setItem'>){
return async function api<T>(route:string,body?:unknown):Promise<T>{
const rows:Row[]=JSON.parse(storage.getItem(key)||'[]');if(!Array.isArray(rows))throw Error('Demo storage could not be read.');
if(route==='layouts/list')return rows.map(({document,...row})=>row) as T;
if(route.startsWith('layouts/load?')){const id=new URLSearchParams(route.split('?')[1]).get('id');const row=rows.find(r=>r.id===id);if(!row)throw Error('Layout no longer exists.');return structuredClone(row) as T;}
if(route!=='layouts/manage')throw Error('Unknown demo operation.');
const input=layoutActionSchema.parse(body);const id=input.id||crypto.randomUUID();const index=rows.findIndex(r=>r.id===id);
if(input.id&&(index<0||rows[index].revision!==input.revision))throw Error('Layout changed in another tab. Load it again or save a new copy.');
let result:Row|{id:string};
if(input.action==='delete'){rows.splice(index,1);result={id};}
else {result={id,name:input.name,revision:index<0?1:rows[index].revision+1,updatedAt:new Date().toISOString(),updatedBy:'This browser',document:input.action==='save'?input.document:rows[index].document};if(index<0)rows.unshift(result);else rows[index]=result;}
try{storage.setItem(key,JSON.stringify(rows));}catch{throw Error('Browser storage is full or unavailable. Export your layout to keep it.');}
return structuredClone(result) as T;
};}
export async function api<T>(route:string,body?:unknown):Promise<T>{return demoLayoutLibrary(window.localStorage)<T>(route,body);}
