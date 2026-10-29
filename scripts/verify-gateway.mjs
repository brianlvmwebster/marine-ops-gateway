import assert from 'node:assert/strict';
const base='http://127.0.0.1:5173';
const login=await fetch(base+'/signin-with-chatgpt?return_to=/admin',{redirect:'manual'});
const cookie=login.headers.get('set-cookie')?.split(';')[0];
assert.ok(cookie,'Local sign-in cookie');
const headers={cookie,origin:base,'content-type':'application/json'};
const initial=await (await fetch(base+'/api/buttons')).json();
const write=(body,extra=headers)=>fetch(base+'/api/buttons',{method:'PUT',headers:extra,body:JSON.stringify(body)});
assert.equal((await write({buttons:[],version:initial.version},{})).status,403);
assert.equal((await write({buttons:[],version:initial.version},{...headers,origin:'https://untrusted.example'})).status,403);
const fixture={id:'integration-test',title:'Test tool',url:'https://example.com',description:'Test',image:'',newTab:true};
assert.equal((await write({buttons:[{...fixture,url:'javascript:alert(1)'}],version:initial.version})).status,400);
let version=initial.version;
try {
  let r=await write({buttons:[fixture],version});assert.equal(r.status,200);version=(await r.json()).version;
  assert.equal((await write({buttons:[],version:version-1})).status,409);
  let read=await (await fetch(base+'/api/buttons')).json();assert.equal(read.buttons[0].title,fixture.title);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  assert.equal((await fetch(base+'/api/images',{method:'POST',body:png})).status,403);
  assert.equal((await fetch(base+'/api/images',{method:'POST',headers,body:'<svg/>'})).status,400);
  r=await fetch(base+'/api/images',{method:'POST',headers,body:png});assert.equal(r.status,200);const {image}=await r.json();
  r=await fetch(base+image);assert.equal(r.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await r.arrayBuffer()),png);
  r=await write({buttons:[{...fixture,title:'Updated tool',image}],version});assert.equal(r.status,200);version=(await r.json()).version;
  read=await (await fetch(base+'/api/buttons')).json();assert.equal(read.buttons[0].image,image);assert.equal(read.buttons[0].title,'Updated tool');
  r=await write({buttons:[],version});assert.equal(r.status,200);version=(await r.json()).version;
  assert.equal((await (await fetch(base+'/api/buttons')).json()).buttons.length,0);
  console.log('PASS: authentication, origin checks, URL validation, create/read/update/delete, conflict protection, image upload and retrieval.');
} finally {assert.equal((await write({buttons:initial.buttons,version})).status,200);}
