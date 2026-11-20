import {gunzipSync} from 'node:zlib';
import {dockBuilderData0} from './dockBuilderData0';
import {dockBuilderData1} from './dockBuilderData1';
import {dockBuilderData2} from './dockBuilderData2';
import {dockBuilderData3} from './dockBuilderData3';
import {dockBuilderData4} from './dockBuilderData4';
import {dockBuilderData5} from './dockBuilderData5';
import {dockBuilderData6} from './dockBuilderData6';
import {dockBuilderData7} from './dockBuilderData7';
import {dockBuilderData8} from './dockBuilderData8';
const data:Record<string,string>=JSON.parse(gunzipSync(Buffer.from([dockBuilderData0,dockBuilderData1,dockBuilderData2,dockBuilderData3,dockBuilderData4,dockBuilderData5,dockBuilderData6,dockBuilderData7,dockBuilderData8].join(''),'base64')).toString('utf8'));
export function dockBuilderAssets(name:string):{body:Uint8Array;type:string}|null{
 if(!Object.prototype.hasOwnProperty.call(data,name))return null;
 const types:Record<string,string>={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',json:'application/json; charset=utf-8',png:'image/png',svg:'image/svg+xml'};
 return{body:new Uint8Array(Buffer.from(data[name],'base64')),type:types[name.split('.').pop()!]||'application/octet-stream'};
}
