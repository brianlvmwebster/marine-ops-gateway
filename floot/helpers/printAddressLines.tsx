const states=new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));
const stateNames=/^(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|District of Columbia|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)$/i;
function stateName(value:string):string|null{
 const state=value.replace(/\s+\d{5}(?:-\d{4})?$/,'').trim();
 return states.has(state.toUpperCase())?state.toUpperCase():stateNames.test(state)?state:null;
}
// Format the printed address only. Preserve free-form text when its parts are uncertain.
export function printAddressLines(value:string):string[]{
 const address=value.trim();
 if(!address)return ['—'];
 // Older form imports store each address component with a visible field label.
 const labels=/(?:^|[\r\n,;])[ \t]*(house[ \t]+number|street[ \t]+name|city|state|zip(?:[ \t]+code)?|postal[ \t]+code|country)[ \t]*:[ \t]*/gi;
 const matches=Array.from(address.matchAll(labels));
 if(matches.length){
  const fields:Record<string,string>={};
  matches.forEach((match,index)=>{
   const key=match[1].toLowerCase().replace(/\s+/g,' ');
   fields[key]=address.slice(match.index!+match[0].length,matches[index+1]?.index??address.length).trim().replace(/[,;]+$/,'').trim().replace(/\s+/g,' ');
  });
  const street=[fields['house number'],fields['street name']].filter(Boolean).join(' ');
  const cityState=[fields.city,fields.state&&(stateName(fields.state)||fields.state)].filter(Boolean).join(', ');
  return [street,cityState].filter(Boolean).length?[street,cityState].filter(Boolean):['—'];
 }
 const parts=address.split(/[,\r\n]+/).map(part=>part.trim().replace(/\s+/g,' ')).filter(Boolean);
 const location=[...parts];
 if(/^(USA|US|United States(?: of America)?)$/i.test(location.at(-1)||''))location.pop();
 if(location.length>=3){
  const state=stateName(location.at(-1)!);
  if(state)return [location.slice(0,-2).join(', '),location.at(-2)+', '+state];
 }
 // A manually entered second line may combine the city and two-letter state.
 if(location.length===2){
  const cityState=location[1].match(/^(.+?)\s+([A-Za-z]{2})(?:\s+\d{5}(?:-\d{4})?)?$/);
  if(cityState&&states.has(cityState[2].toUpperCase()))return [location[0],cityState[1]+', '+cityState[2].toUpperCase()];
 }
 return address.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
}
