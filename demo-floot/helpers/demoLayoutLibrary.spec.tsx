import {demoLayoutLibrary} from './demoLayoutLibrary';
describe('isolated demo layouts',()=>{
const blank={version:1,booth:{w:720,h:480},labels:true,items:[]};
function storage(){const data=new Map<string,string>();return {getItem:(k:string)=>data.get(k)||null,setItem:(k:string,v:string)=>{data.set(k,v);}};}
it('saves, loads, renames and deletes without exposing plans to another visitor',async()=>{
const a=demoLayoutLibrary(storage()),b=demoLayoutLibrary(storage());
const row=await a<any>('layouts/manage',{action:'save',name:'Sample event',document:blank});
expect((await a<any[]>('layouts/list')).length).toBe(1);
expect(await b('layouts/list')).toEqual([]);
expect((await a<any>('layouts/load?id='+row.id)).document).toEqual(blank);
const renamed=await a<any>('layouts/manage',{action:'rename',id:row.id,revision:row.revision,name:'Renamed'});
expect(renamed.revision).toBe(2);
await expectAsync(a('layouts/manage',{action:'save',id:row.id,revision:1,name:'Stale',document:blank})).toBeRejected();
await a('layouts/manage',{action:'delete',id:row.id,revision:2});
expect(await a('layouts/list')).toEqual([]);
});
it('reports storage failures instead of claiming a save',async()=>{
const api=demoLayoutLibrary({getItem:()=>null,setItem:()=>{throw Error('quota');}});
await expectAsync(api('layouts/manage',{action:'save',name:'Test',document:blank})).toBeRejectedWithError(/storage is full/);
});
});