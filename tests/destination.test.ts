import assert from 'node:assert/strict';
import {test} from 'node:test';
import {destinationPath,safeReturnPath} from '../lib/destination.ts';
import {validButtons} from '../lib/validation.ts';
const button={id:'service',title:'Service Management',url:'https://example.com/dashboard',description:'',image:'',newTab:true,slug:'service-management'};
test('permanent paths survive title and destination changes',()=>{
 assert.equal(destinationPath(button),'/dashboard/');
 assert.equal(destinationPath({...button,title:'Renamed',url:'https://new.example.com'}),'/dashboard/');
 assert.equal(destinationPath({...button,slug:'other-app'}),'/apps/other-app');
 assert.equal(destinationPath({...button,slug:undefined}),button.url);
});
test('permanent names are unique bounded lowercase path segments',()=>{
 assert.equal(validButtons([button]),true);
 for(const slug of ['../admin','service/manage','Service','service--management','a'.repeat(61),'//evil.example'])assert.equal(validButtons([{...button,slug}]),false);
 assert.equal(validButtons([button,{...button,id:'duplicate'}]),false);
 assert.equal(validButtons([{...button,slug:undefined}]),true);
});
test('login return destinations cannot redirect outside the app',()=>{
 assert.equal(safeReturnPath('/apps/service-management'),'/apps/service-management');
 assert.equal(safeReturnPath('/dashboard/'),'/dashboard/');
 assert.equal(safeReturnPath('/dashboard'),'/dashboard/');
 assert.equal(safeReturnPath('/dashboard/jobs/12345678-1234-1234-1234-123456789abc/print?mode=checklist'),'/dashboard/jobs/12345678-1234-1234-1234-123456789abc/print?mode=checklist');
 for(const path of ['/dashboard//evil','/dashboard/../admin','/dashboard/?next=https://evil.example','/dashboard/jobs/x/print','/dashboard/jobs/12345678-1234-1234-1234-123456789abc/print?next=https://evil.example'])assert.equal(safeReturnPath(path),'/');
 for(const path of ['https://evil.example','//evil.example','/\\evil.example','/apps/../admin','/apps/a?next=https://evil.example','/apps/%2f%2fevil.example',undefined])assert.equal(safeReturnPath(path),'/');
});
