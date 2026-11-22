import {markerMatching} from "./MapToolMarkerMatching";
describe("one-to-one adaptive marker matching",()=>{
 it("matches shifted views of two boats without merging the neighbors",()=>{
  const pairs=markerMatching.pairs([{x:.3,y:.4},{x:.34,y:.4}],[{x:.308,y:.4},{x:.348,y:.4}],1000,1000);
  expect(pairs).toEqual([{existingIndex:0,incomingIndex:0},{existingIndex:1,incomingIndex:1}]);
 });
 it("does not assign one new marker to both existing boats",()=>{
  const pairs=markerMatching.pairs([{x:.3,y:.5},{x:.32,y:.5}],[{x:.302,y:.5}],1000,1000);
  expect(pairs.length).toBe(1);expect(pairs[0].existingIndex).toBe(0);
 });
 it("shrinks the match radius for tightly packed neighbors",()=>{
  expect(markerMatching.pairs([{x:.3,y:.5},{x:.31,y:.5}],[{x:.305,y:.5}],1000,1000).length).toBe(0);
 });
 it("uses original pixel dimensions on non-square images",()=>{
  expect(markerMatching.pairs([{x:.5,y:.5}],[{x:.503,y:.5}],2400,1800).length).toBe(0);
  expect(markerMatching.pairs([{x:.5,y:.5}],[{x:.502,y:.5}],2400,1800).length).toBe(1);
 });
});
