import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validButtons } from '../lib/validation.ts';
import { readLimitedBody, sameOrigin } from '../lib/http.ts';
import { imageContentType } from '../lib/image.ts';
const button={id:'example',title:'Example',url:'https://example.com',description:'',image:'',newTab:true};
test('only safe destinations and valid image references are accepted',()=>{
  assert.ok(validButtons([button]));
  for(const url of ['javascript:alert(1)','data:text/html,test','//example.com','https://name:password@example.com'])assert.equal(validButtons([{...button,url}]),false);
  for(const image of ['javascript:alert(1)','/api/images/../../secret','/elsewhere'])assert.equal(validButtons([{...button,image}]),false);
  assert.ok(validButtons([{...button,image:'/api/images/abc-123'}]));
  assert.equal(validButtons([button,button]),false);
  assert.equal(validButtons([{...button,title:' '}]),false);
  assert.equal(validButtons(Array.from({length:101},(_,i)=>({...button,id:String(i)}))),false);
});
test('request bodies are limited even without a content-length header',async()=>{
  await assert.rejects(()=>readLimitedBody(new Request('https://example.com/api',{method:'PUT',body:'abcdefgh'}),4),RangeError);
  assert.equal(new TextDecoder().decode(await readLimitedBody(new Request('https://example.com',{method:'POST',body:'abcd'}),4)),'abcd');
});
test('writes require an exact same-origin request',()=>{
  assert.equal(sameOrigin(new Request('https://example.com/api',{headers:{origin:'https://example.com'}})),true);
  assert.equal(sameOrigin(new Request('https://example.com/api',{headers:{origin:'https://evil.example'}})),false);
  assert.equal(sameOrigin(new Request('https://example.com/api')),false);
});
test('uploaded images are identified by bytes rather than file extensions',()=>{
  assert.equal(imageContentType(new Uint8Array([137,80,78,71,13,10,26,10])),'image/png');
  assert.equal(imageContentType(new Uint8Array([255,216,255])),'image/jpeg');
  assert.equal(imageContentType(new TextEncoder().encode('RIFF1234WEBP')),'image/webp');
  assert.equal(imageContentType(new TextEncoder().encode('<svg onload="alert(1)"></svg>')),null);
});
