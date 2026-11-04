export function imageContentType(bytes:Uint8Array) {
  const matches=(at:number,signature:number[])=>signature.every((b,i)=>bytes[at+i]===b);
  return matches(0,[137,80,78,71,13,10,26,10]) ? 'image/png' : matches(0,[255,216,255]) ? 'image/jpeg' : matches(0,[82,73,70,70]) && matches(8,[87,69,66,80]) ? 'image/webp' : null;
}
