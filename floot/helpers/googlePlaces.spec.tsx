import {suggestAddresses,selectAddress,PlacesUnavailable} from './googlePlaces';
describe('Google address search',()=>{
 it('keeps the key server-side and shares the session token through search and selection',async()=>{
  const request=jasmine.createSpy('fetch').and.callFake(async(url:string,init:any)=>({ok:true,json:async()=>url.includes('autocomplete')?{suggestions:[{placePrediction:{placeId:'place_123',text:{text:'123 Test Street, Webster, MA'}}}]}:{id:'place_123',formattedAddress:'123 Test Street, Webster, MA'}}));
  const token='7f04d55d-2adf-46b4-ae59-4c56419f1888';
  const suggestions=await suggestAddresses('123 Test',token,'test-key',request as any);const place=await selectAddress(suggestions[0].placeId,token,'test-key',request as any);
  expect(JSON.parse(request.calls.argsFor(0)[1].body).sessionToken).toBe(token);
  expect(request.calls.argsFor(0)[1].headers['X-Goog-Api-Key']).toBe('test-key');
  expect(request.calls.argsFor(0)[1].headers['X-Goog-FieldMask']).not.toContain('*');
  expect(new URL(request.calls.argsFor(1)[0]).searchParams.get('sessionToken')).toBe(token);
  expect(place.address).toBe('123 Test Street, Webster, MA');expect(JSON.stringify(place)).not.toContain('test-key');
 });
 it('makes no provider request when the connection is absent',async()=>{
  const request=jasmine.createSpy('fetch');
  await expectAsync(suggestAddresses('123 Test','token','',request as any)).toBeRejectedWithError(PlacesUnavailable);
  expect(request).not.toHaveBeenCalled();
 });
 it('handles provider failure without exposing provider payloads or the key',async()=>{
  const request=jasmine.createSpy('fetch').and.resolveTo({ok:false,status:403,json:async()=>({secret:'must not be exposed'})});
  await expectAsync(selectAddress('place','token','test-key',request as any)).toBeRejectedWithError(/Google address search is unavailable/);
 });
});
