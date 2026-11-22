import {gatewayReturnPath,gatewayDestination,requireGatewayOrigin} from './gatewayPolicy';
describe('maps gateway integration',()=>{
 it('returns to maps after company login without accepting external redirects',()=>{
  expect(gatewayReturnPath('/maps')).toBe('/maps');expect(gatewayReturnPath('/maps/')).toBe('/maps/');
  for(const path of ['//evil.test/maps','/maps/../admin','/maps?next=https://evil.test','/maps-other'])expect(gatewayReturnPath(path)).toBe('/');
 });
 it('launches the native route from its permanent gateway destination',()=>{
  expect(gatewayDestination({id:'maps',title:'Maps',url:'https://example.test/maps',slug:'maps',description:'',image:'',newTab:false})).toBe('/maps');
 });
 it('rejects cross-origin map saves',()=>{
  expect(()=>requireGatewayOrigin(new Request('https://example.test/_api/mapping/maps',{method:'POST',headers:{Origin:'https://evil.test'}}))).toThrow();
 });
});