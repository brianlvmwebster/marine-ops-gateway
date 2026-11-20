import {initializeLayout} from './layoutEngine';
import {layoutDocument} from './layoutDocument';
describe('layout workspace persistence',()=>{
 let frame:HTMLIFrameElement;
 beforeEach(()=>{frame=document.createElement('iframe');document.body.appendChild(frame);const d=frame.contentDocument!;d.open();d.write(layoutDocument);d.close();(frame.contentWindow as any).matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});(frame.contentWindow as any).ResizeObserver=class{observe(){} disconnect(){}};});
 afterEach(()=>{frame.remove();localStorage.clear();});
 it('starts blank while retaining a previous browser draft and can load it',()=>{
 const draft={version:1,booth:{w:960,h:600},labels:true,items:[{id:'obstacle-1',kind:'obstacle',label:'Entrance',shape:'rectangle',x:0,y:0,w:120,h:60,angle:0}]};
 frame.contentWindow!.localStorage.setItem('lvm-show-layout-v1',JSON.stringify(draft));
 const editor:{getState:()=>typeof draft;getRecovery:()=>unknown;loadState:(next:unknown)=>void}=initializeLayout(frame.contentDocument,frame.contentWindow,{onChange:()=>{}});
 expect(editor.getState().items).toEqual([]);
 expect(editor.getRecovery()).toEqual(draft);
 editor.loadState(draft);
 expect(editor.getState()).toEqual(draft);
 const exported=editor.getState();exported.items[0].label='changed outside';
 expect(editor.getState().items[0].label).toBe('Entrance');
 expect(()=>editor.loadState({version:100})).toThrow();
 });
});
