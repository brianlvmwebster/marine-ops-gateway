import {detectionRegion} from "./MapToolDetectionRegion";
describe("detection region coordinates",()=>{
 it("maps cropped normalized points into the original image",()=>{
  const b=detectionRegion.pixels({x:.25,y:.1,width:.5,height:.4},4000,2000);
  expect(b).toEqual({left:1000,top:200,width:2000,height:800});
  expect(detectionRegion.mapPoint({x:0,y:0},b,4000,2000)).toEqual({x:.25,y:.1});
  expect(detectionRegion.mapPoint({x:1,y:1},b,4000,2000)).toEqual({x:.75,y:.5});
 });
 it("uses the full image when no crop is selected",()=>{
  const b=detectionRegion.pixels(undefined,3000,1000);
  expect(detectionRegion.mapPoint({x:.6,y:.3},b,3000,1000)).toEqual({x:.6,y:.3});
 });
 it("includes fractional edge pixels and stays in bounds",()=>{
  const b=detectionRegion.pixels({x:.333,y:.222,width:.667,height:.778},1001,503);
  expect(b.left).toBe(333);expect(b.top).toBe(111);
  expect(b.left+b.width).toBe(1001);expect(b.top+b.height).toBe(503);
 });
 it("rejects an area outside the image",()=>{
  expect(detectionRegion.schema.safeParse({x:.8,y:0,width:.4,height:1}).success).toBe(false);
  expect(detectionRegion.schema.safeParse({x:0,y:0,width:0,height:1}).success).toBe(false);
 });
});