import {readFile} from 'node:fs/promises';
import {dockBuilderAssets} from '../helpers/dockBuilderAssets';
import {nativeGatewayAccess} from '../helpers/nativeGatewayAccess';
import {platformStore} from '../platform/store';
import {platformDatabase} from '../platform/database';
import {LAKEVIEW_ID,PlatformError} from '../platform/policy';
const script=await readFile(new URL('./dock-customers.js',import.meta.url),'utf8');
export async function stagingDockAsset(r:Request){try{const viewer=await nativeGatewayAccess(r);await platformStore(platformDatabase()).toolAccess(viewer.authUserId,LAKEVIEW_ID,'dock-builder');
 const name=new URL(r.url).searchParams.get('file')||'index.html';
 if(name==='customer-quotes.js')return new Response(script,{headers:{'Content-Type':'text/javascript; charset=utf-8'}});
 const asset=dockBuilderAssets(name);if(!asset)return new Response('Not found',{status:404});
 if(name==='index.html'){const html=new TextDecoder().decode(asset.body).replace('</body>','<script src="/_api/dock_builder/asset?file=customer-quotes.js"></script></body>');return new Response(html,{headers:{'Content-Type':asset.type}});}
 return new Response(new Uint8Array(asset.body).buffer,{headers:{'Content-Type':asset.type}});
 }catch(e){return new Response('Dock Builder access unavailable.',{status:e instanceof PlatformError?e.status:(e as any)?.status||503});}}
