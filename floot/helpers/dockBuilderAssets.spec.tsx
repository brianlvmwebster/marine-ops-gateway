import {dockBuilderAssets} from './dockBuilderAssets';
import {gatewayDestination,gatewayReturnPath} from './gatewayPolicy';
describe('Microsoft-protected DockBuilder workspace',()=>{
 const text=(file:string)=>new TextDecoder().decode(dockBuilderAssets(file)!.body);
 it('serves only bundled files',()=>{for(const p of ['../env.json','/index.html','constructor','__proto__','https://evil.test'])expect(dockBuilderAssets(p)).toBeNull();expect(dockBuilderAssets('index.html')!.type).toContain('text/html');});
 it('routes nested worksheet assets through the protected endpoint',()=>{expect(text('index.html')).toContain('/_api/dock_builder/asset?file=dock-quotes%2Findex.html');expect(text('dock-quotes/index.html')).toContain('/_api/dock_builder/asset?file=dock-quotes%2Fstyles.css');expect(text('dock-quotes/index.html')).toContain('/_api/dock_builder/asset?file=layout-core.js');});
 it('includes current boats, background controls, camera and size fixes',()=>{expect(text('layout-core.js')).toContain('22′ Generic Pontoon');expect(text('layout-app.js')).toContain('syncCanvasDimensions');expect(text('layout-app.js')).toContain('view.zoomCamera');expect(text('index.html')).toContain('Solid boat background');expect(text('index.html')).not.toContain('action="/logout"');});
 it('keeps sign-in returns and gateway links on the canonical route',()=>{expect(gatewayReturnPath('/dock-builder')).toBe('/dock-builder');expect(gatewayReturnPath('//evil.test')).toBe('/');expect(gatewayDestination({id:'dock',title:'DockBuilder',url:'https://dockbuilder.lakeviewwebster.com',description:'',image:'',newTab:false,slug:'dock-builder'})).toBe('/dock-builder');});
});
