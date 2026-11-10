export type AddressSuggestion={placeId:string;description:string};
export type AddressSelection={placeId:string;address:string};
export class PlacesUnavailable extends Error {}
type Requester=typeof fetch;
async function googleRequest(url:string,init:RequestInit,key:string,request:Requester){
 if(!key)throw new PlacesUnavailable('Address suggestions are not connected. You can type the address manually.');
 const response=await request(url,{...init,signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,...init.headers}});
 if(!response.ok)throw new PlacesUnavailable(response.status===429?'Address search is temporarily busy. Please type the address or try again.':'Google address search is unavailable. Check the Places API connection, or type the address manually.');
 return response.json();
}
export async function suggestAddresses(input:string,sessionToken:string,key:string,request:Requester=fetch):Promise<AddressSuggestion[]>{
 const data=await googleRequest('https://places.googleapis.com/v1/places:autocomplete',{method:'POST',headers:{'X-Goog-FieldMask':'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text'},body:JSON.stringify({input,sessionToken,languageCode:'en',regionCode:'us',locationBias:{circle:{center:{latitude:42.05,longitude:-71.86},radius:50000}}})},key,request);
 return (data.suggestions||[]).filter((s:any)=>s.placePrediction?.placeId&&s.placePrediction?.text?.text).slice(0,5).map((s:any)=>({placeId:s.placePrediction.placeId,description:s.placePrediction.text.text}));
}
export async function selectAddress(placeId:string,sessionToken:string,key:string,request:Requester=fetch):Promise<AddressSelection>{
 const url=new URL('https://places.googleapis.com/v1/places/'+encodeURIComponent(placeId));url.searchParams.set('sessionToken',sessionToken);
 const data=await googleRequest(url.toString(),{method:'GET',headers:{'X-Goog-FieldMask':'id,formattedAddress'}},key,request);
 if(!data.id||!data.formattedAddress)throw new PlacesUnavailable('This location has no address. Please enter it manually.');
 return {placeId:data.id,address:data.formattedAddress};
}

// The key is optional until the owner's secure credential connection completes.
export function googlePlacesApiKey(){return (process.env as unknown as Record<string,string|undefined>).GOOGLE_MAPS_API_KEY||'';}
