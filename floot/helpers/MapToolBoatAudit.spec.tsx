import {boatAudit} from "./MapToolBoatAudit";
describe("visual audit corrections",()=>{
 it("removes a duplicate, moves an off-center marker, and adds a missed boat without replacing others",()=>{
  const p=[{x:.1,y:.1},{x:.12,y:.1},{x:.5,y:.5}];
  expect(boatAudit.apply(p,{message:"",remove:[2],move:[{id:3,x:.51,y:.52}],add:[{x:.8,y:.8}]})).toEqual([{x:.1,y:.1},{x:.51,y:.52},{x:.8,y:.8}]);
 });
 it("rejects conflicting, duplicate and nonexistent IDs rather than silently changing the wrong boat",()=>{
  const p=[{x:.5,y:.5}];
  expect(()=>boatAudit.apply(p,{message:"",remove:[1],move:[{id:1,x:.4,y:.4}],add:[]})).toThrow();
  expect(()=>boatAudit.apply(p,{message:"",remove:[2],move:[],add:[]})).toThrow();
  expect(()=>boatAudit.apply(p,{message:"",remove:[1,1],move:[],add:[]})).toThrow();
 });
 it("audits the combined markers and uses the clearer overlapping view",()=>{
  const area={left:0,top:0,width:1000,height:1000};
  const p=[{x:.48,y:.5},{x:.49,y:.5}];
  const result=boatAudit.reconcile(p,[
   {bounds:{left:0,top:0,width:600,height:1000},indices:[0,1],corrections:{message:"",remove:[2],move:[],add:[]}},
   {bounds:{left:400,top:0,width:600,height:1000},indices:[0,1],corrections:{message:"",remove:[],move:[],add:[]}}
  ],area,1000,1000);
  expect(result.markers.length).toBe(1);expect(result.removed).toBe(1);expect(result.markers[0]).toEqual(p[0]);
 });
 it("retains an omission recovered in only one overlapping view",()=>{
  const area={left:0,top:0,width:1000,height:1000};
  const result=boatAudit.reconcile([],[
   {bounds:{left:0,top:0,width:600,height:1000},indices:[],corrections:{message:"",remove:[],move:[],add:[]}},
   {bounds:{left:400,top:0,width:600,height:1000},indices:[],corrections:{message:"",remove:[],move:[],add:[{x:.1,y:.5}]}}
  ],area,1000,1000);
  expect(result.markers.length).toBe(1);expect(result.markers[0].x).toBeCloseTo(.46,8);
 });
});