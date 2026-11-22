import {layoutModel} from "./MapToolLayoutModel";
const id="10000000-0000-4000-8000-000000000001",sid="20000000-0000-4000-8000-000000000001";
const map={id,revision:2,name:"Map",sectionId:null,sortOrder:0,archived:false};
describe("layout organization safety",()=>{
 it("moves, renames and archives only metadata",()=>{const next={...map,name:"North",sectionId:sid,archived:true};expect(layoutModel.plan({revision:0,sections:[],maps:[map]},{revision:0,sections:[{id:sid,name:"Yard"}],maps:[next]})).toEqual([next]);});
 it("rejects stale organization revisions",()=>{expect(()=>layoutModel.plan({revision:1,sections:[],maps:[map]},{revision:0,sections:[],maps:[map]})).toThrowError(/another session/);});
 it("rejects stale changed maps",()=>{expect(()=>layoutModel.plan({revision:0,sections:[],maps:[map]},{revision:0,sections:[],maps:[{...map,revision:1,name:"Changed"}]})).toThrowError(/another session/);});
 it("ignores untouched stale maps and preserves newly created maps",()=>{expect(layoutModel.plan({revision:0,sections:[],maps:[map]},{revision:0,sections:[],maps:[{...map,revision:1}]})).toEqual([]);expect(layoutModel.plan({revision:0,sections:[],maps:[map]},{revision:0,sections:[],maps:[]})).toEqual([]);});
 it("rejects foreign maps and missing folders",()=>{expect(()=>layoutModel.plan({revision:0,sections:[],maps:[]},{revision:0,sections:[],maps:[map]})).toThrowError("Map not found.");expect(()=>layoutModel.plan({revision:0,sections:[],maps:[map]},{revision:0,sections:[],maps:[{...map,sectionId:sid}]})).toThrowError(/existing section/);});
 it("prevents removing folders and duplicate names",()=>{expect(()=>layoutModel.plan({revision:0,sections:[{id:sid,name:"Yard"}],maps:[]},{revision:0,sections:[],maps:[]})).toThrowError(/cannot be removed/);expect(layoutModel.sections.safeParse([{id:sid,name:"Yard"},{id,name:"yard"}]).success).toBeFalse();});
});