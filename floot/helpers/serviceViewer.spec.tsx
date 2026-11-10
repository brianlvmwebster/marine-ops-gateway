import {requireViewer,withServiceViewer} from './serviceViewer';
describe('verified gateway request context',()=>{
 it('keeps concurrent identities isolated through async work',async()=>{
  const results=await Promise.all(['first','second'].map(userId=>withServiceViewer({userId,email:userId+'@example.test'},async()=>{await new Promise(resolve=>setTimeout(resolve,5));return (await requireViewer()).userId;})));
  expect(results).toEqual(['first','second']);
 });
});
