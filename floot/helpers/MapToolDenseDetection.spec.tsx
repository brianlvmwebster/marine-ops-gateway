import {denseDetection} from "./MapToolDenseDetection";
import {mappingModel} from "./MapToolMappingModel";
import {spacePresentation} from "./MapToolSpacePresentation";
describe("dense aerial detections",()=>{
 it("subdivides large images into bounded overlapping sections",()=>{
  const tiles=denseDetection.tiles({left:0,top:0,width:2400,height:1800});
  expect(tiles.length).toBe(6);expect(tiles[0].bounds.left+tiles[0].bounds.width>tiles[1].bounds.left).toBe(true);
  expect(denseDetection.tiles({left:100,top:200,width:600,height:500}).length).toBe(1);
 });
 it("maps crop centers and reconciles section edges without duplication",()=>{
  const area={left:100,top:200,width:2000,height:1600},tiles=denseDetection.tiles(area);
  const target={x:1100,y:1000};
  const markers=denseDetection.collect(tiles.map(t=>({...t,points:[{x:(target.x-t.bounds.left)/t.bounds.width,y:(target.y-t.bounds.top)/t.bounds.height}]})),area,2400,1800);
  expect(markers.length).toBe(1);expect(markers[0].x).toBeCloseTo(1100/2400,8);expect(markers[0].y).toBeCloseTo(1000/1800,8);
 });
 it("keeps neighboring object centers distinct",()=>{
  const area={left:0,top:0,width:1000,height:1000};
  const markers=denseDetection.collect([{core:area,bounds:area,points:[{x:.4,y:.4},{x:.4002,y:.4},{x:.404,y:.4},{x:.42,y:.4}]}],area,1000,1000);
  expect(markers.length).toBe(3);
 });
 it("round-trips a named point location without requiring a rectangle",()=>{
  const s=mappingModel.space.parse({id:"a543732b-173e-46fc-abaf-bafcb6e038ca",label:"S-001",marker:{x:.5,y:.25},points:[],lastName:"Smith",firstName:"Jo",boatDescription:"Blue boat",trailerDetails:"Attached",notes:"",status:"occupied",reviewed:false});
  expect(spacePresentation.label(s)).toBe("1");
  const saved=mappingModel.space.parse(JSON.parse(JSON.stringify({...s,reviewed:true})));
  expect(spacePresentation.label(saved)).toBe("Smith, Jo");expect(saved.label).toBe("S-001");expect(saved.boatDescription).toBe("Blue boat");expect(spacePresentation.anchor(saved)).toEqual({x:.5,y:.25});
  expect(mappingModel.space.safeParse({...s,marker:undefined}).success).toBe(false);
 });
});

describe("overlap recovery",()=>{
 it("retains a boat seen only outside a section's former ownership core",()=>{
  const area={left:0,top:0,width:1000,height:500};
  const markers=denseDetection.collect([
   {core:{left:0,top:0,width:500,height:500},bounds:{left:0,top:0,width:650,height:500},points:[{x:.9,y:.5}]},
   {core:{left:500,top:0,width:500,height:500},bounds:{left:350,top:0,width:650,height:500},points:[]}
  ],area,1000,500);
  expect(markers.length).toBe(1);expect(markers[0].x).toBeCloseTo(.585,8);
 });
 it("bounds the number of sections for large and narrow photos",()=>{
  for(const [width,height] of [[20000,5000],[500,10000],[10000,10000]])expect(denseDetection.tiles({left:0,top:0,width,height}).length).toBeLessThanOrEqual(6);
 });
});