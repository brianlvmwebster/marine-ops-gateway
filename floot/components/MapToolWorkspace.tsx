import {Helmet} from "react-helmet";
import {Link} from "react-router-dom";
import {MappingColumns} from "./MapToolMappingColumns";
import {defaultColumns,exportTemplate,normalizeFieldValues,displayFieldValue} from "../helpers/MapToolMappingColumns";
import React,{useEffect,useMemo,useRef,useState} from "react";
import {useMutation,useQuery,useQueryClient} from "@tanstack/react-query";
import {Map,Upload,RefreshCw,ChevronLeft,ChevronRight,Maximize,MapPin,MousePointer2,Sparkles,Plus,Save,ZoomIn,ZoomOut,Undo2,List} from "lucide-react";
import {Button} from "./MapToolButton";
import {SpaceMarkers} from "./MapToolSpaceMarkers";
import {spacePresentation} from "../helpers/MapToolSpacePresentation";
import {UnitList,type UnitFields} from "./MapToolUnitList";
import {LocationImport} from "./MapToolLocationImport";
import {UnitRename} from "./MapToolUnitRename";
import {unitNaming} from "../helpers/MapToolUnitNaming";
import {MapHighlightPicker} from "./MapToolMapHighlightPicker";
import {useMapHighlight} from "../helpers/MapToolUseMapHighlight";
import {LayoutManager} from "./MapToolLayoutManager";
import {LayoutNavigation} from "./MapToolLayoutNavigation";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "./MapToolDialog";
import {UnitDetails} from "./MapToolUnitDetails";
import {ImageDetectionModal} from "./MapToolImageDetectionModal";
import {mergeSpaceSuggestions} from "../helpers/MapToolMergeSpaceSuggestions";
import {Progress} from "./MapToolProgress";
import {Input} from "./MapToolInput";
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from "./MapToolSelect";
import {FileDropzone} from "./MapToolFileDropzone";
import {toast} from "../helpers/toast";
import {mappingModel} from "../helpers/MapToolMappingModel";
import {getMaps,type OutputType as MapsOutput,type Space,type StorageMap} from "../endpoints/mapping/maps_GET.schema";
import {postMaps} from "../endpoints/mapping/maps_POST.schema";
import {postAnalyze,type DetectionArea} from "../endpoints/mapping/analyze_POST.schema";
import styles from "./MapToolWorkspace.module.css";
type Point={x:number;y:number};
type Navigation={kind:"map";id:string}|{kind:"newMap";sectionId?:string|null}|{kind:"manager"}|{kind:"createMap"};
export default function MappingUtility(){
 const client=useQueryClient();
 const mapsQuery=useQuery({queryKey:["storage-maps"],queryFn:getMaps,staleTime:Infinity,refetchOnWindowFocus:false,retry:false});
 const [draft,setDraft]=useState<StorageMap|null>(null),[dirty,setDirty]=useState(false);
 const [managerOpen,setManagerOpen]=useState(false),[pendingNavigation,setPendingNavigation]=useState<Navigation|null>(null),[navigationError,setNavigationError]=useState("");
 const [newSectionId,setNewSectionId]=useState<string|null>(null);
 const detectionEnabled=mapsQuery.data?.capabilities?.detection!==false;
 const activeMaps=useMemo(()=>[...(mapsQuery.data?.maps??[])].filter(m=>!m.archived).sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0)),[mapsQuery.data]);
 const sections=mapsQuery.data?.sections??[];
 const highlight=useMapHighlight(draft?.id);
 const [selected,setSelected]=useState<string|null>(null),[search,setSearch]=useState("");
 const [lastRemoved,setLastRemoved]=useState<{mapId:string;space:Space;index:number}|null>(null);
 const [showImport,setShowImport]=useState(false),[sourceKind,setSourceKind]=useState<"plan"|"aerial">("plan");
 const [file,setFile]=useState<File|null>(null),[mapName,setMapName]=useState("");
 const [drawing,setDrawing]=useState(false),[points,setPoints]=useState<Point[]>([]);
 const [zoom,setZoom]=useState(1),[analysis,setAnalysis]=useState<{spaces:Space[];message:string}|null>(null);
 const [cooldown,setCooldown]=useState(0);
 const [imageOpen,setImageOpen]=useState(false);
 const [columnsOpen,setColumnsOpen]=useState(false);
 const [locationImportOpen,setLocationImportOpen]=useState(false);
 const [renameOpen,setRenameOpen]=useState(false);
 const [namingOptions,setNamingOptions]=useState(unitNaming.defaults);
 const [leftCollapsed,setLeftCollapsed]=useState(false),[rightCollapsed,setRightCollapsed]=useState(true);
 const [unitListOpen,setUnitListOpen]=useState(false),[hoveredId,setHoveredId]=useState<string|null>(null);
 const [showBoundaries,setShowBoundaries]=useState(false),[placingMarker,setPlacingMarker]=useState(false);
 const mainNameInput=useRef<HTMLInputElement|null>(null),[listFocusId,setListFocusId]=useState<string|null>(null);
 const drag=useRef<{id:string;index:number}|null>(null),svgRef=useRef<SVGSVGElement|null>(null);
 useEffect(()=>{if(!cooldown)return;const timer=setTimeout(()=>setCooldown(0),Math.max(0,cooldown-Date.now()));return()=>clearTimeout(timer);},[cooldown]);
 const dirtyRef=useRef(dirty);dirtyRef.current=dirty;
 useEffect(()=>{if(activeMaps.length)setDraft(old=>old??activeMaps[0]);},[activeMaps]);
 useEffect(()=>{const before=(e:BeforeUnloadEvent)=>{if(dirtyRef.current){e.preventDefault();e.returnValue="";}};window.addEventListener("beforeunload",before);return()=>window.removeEventListener("beforeunload",before);},[]);
 const change=(patch:Partial<StorageMap>)=>{setDraft(d=>d?{...d,...patch}:d);setDirty(true);};
 const updateSpace=(patch:Partial<Space>)=>{setDraft(d=>d?{...d,spaces:d.spaces.map(s=>s.id===selected?{...s,...patch}:s)}:d);setDirty(true);};
 const active=draft?.spaces.find(s=>s.id===selected);
 useEffect(()=>{
  if(!active||active.id!==listFocusId||rightCollapsed)return;
  mainNameInput.current?.focus();
  const handle=requestAnimationFrame(()=>{
   const image=svgRef.current?.parentElement,view=image?.parentElement;if(!image||!view)return;
   const point=spacePresentation.anchor(active),r=image.getBoundingClientRect(),v=view.getBoundingClientRect();
   view.scrollTo({left:view.scrollLeft+r.left-v.left+point.x*r.width-view.clientWidth/2,top:view.scrollTop+r.top-v.top+point.y*r.height-view.clientHeight/2,behavior:"instant"});
  });return()=>cancelAnimationFrame(handle);
 },[listFocusId,active?.id,rightCollapsed,zoom]);
 const busy=()=>importMutation.isPending||saveMutation.isPending||analyzeMutation.isPending;
 const importMutation=useMutation({
  mutationFn:async()=>{
   if(!file)throw new Error("Choose an image first.");
   const image=await createImageBitmap(file);
   const width=image.width,height=image.height;image.close();
   const prepared=await postMaps({action:"prepare",sectionId:newSectionId,name:mapName.trim()||file.name.replace(/\.[^.]+$/,""),sourceKind,contentType:file.type as "image/png"|"image/jpeg"|"image/webp",sizeBytes:file.size,imageWidth:width,imageHeight:height});
   const put=await fetch(prepared.presignedUrl!,{method:"PUT",headers:prepared.headers,body:file});
   if(!put.ok)throw new Error("Image upload failed. Please try again.");
   await postMaps({action:"complete",id:prepared.id});
   const data=await getMaps();client.setQueryData(["storage-maps"],data);
   return data.maps.find(m=>m.id===prepared.id)!;
  },
  onSuccess:map=>{setLastRemoved(null);setDraft(map);setDirty(false);setSelected(null);setShowImport(false);setFile(null);setMapName("");setAnalysis(null);setZoom(1);setDrawing(false);setPlacingMarker(false);setPoints([]);toast.success("Image imported. Detect spaces or draw your own.");},
  onError:e=>toast.error(e.message)
 });
 const saveMutation=useMutation({
  mutationFn:async(snapshot:StorageMap|undefined)=>{
   const map=snapshot??draft;
   if(!map)throw new Error("Choose a map first.");
   return postMaps({action:"save",id:map.id,revision:map.revision,name:map.name,columns:map.columns??defaultColumns,spaces:normalizeFieldValues(mappingModel.spaces.parse(map.spaces),map.columns??defaultColumns)});
  },
  onSuccess:(r,snapshot)=>{const map=snapshot??draft;if(!map)return;const saved={...map,revision:r.revision};setDraft(saved);client.setQueryData<MapsOutput>(["storage-maps"],old=>({...old,maps:(old?.maps??[]).map(m=>m.id===saved.id?saved:m)}));setDirty(false);setLastRemoved(null);toast.success("Map and location details saved.");},
  onError:e=>toast.error(e.message)
 });
 const reviewSaveInFlight=useRef(false);
 async function reviewAndSave(){
  if(!draft||!active||busy()||reviewSaveInFlight.current)return false;
  reviewSaveInFlight.current=true;
  const snapshot={...draft,spaces:draft.spaces.map(s=>s.id===active.id?{...s,reviewed:true}:s)};
  setDraft(snapshot);setDirty(true);
  try{await saveMutation.mutateAsync(snapshot);return true;}
  catch{return false;}
  finally{reviewSaveInFlight.current=false;}
 }
 const analyzeMutation=useMutation({
  mutationFn:(region:DetectionArea|undefined)=>postAnalyze({id:draft!.id,region}),
  onMutate:()=>setAnalysis(null),
  onSuccess:data=>{setAnalysis(data);setCooldown(Date.now()+60000);},
  onError:(e:Error&{code?:string;status?:number})=>{if(e.status===429)setCooldown(Date.now()+60000);if(e.code!=="OUT_OF_CREDITS")toast.error(e.message);}
 });
 function activateMap(map:StorageMap|null){
  setDraft(map);setDirty(false);setLastRemoved(null);setSelected(null);setAnalysis(null);setDrawing(false);setPlacingMarker(false);setPoints([]);setZoom(1);setImageOpen(false);setLocationImportOpen(false);setRenameOpen(false);setShowImport(false);
 }
 async function reloadMaps(){
  if(dirty&&!window.confirm("Discard unsaved changes and reload maps?"))return;
  const result=await mapsQuery.refetch();
  if(result.data){const maps=result.data.maps.filter(m=>!m.archived);activateMap(maps.find(m=>m.id===draft?.id)??maps[0]??null);}
 }
 function performNavigation(intent:Navigation){
  if(intent.kind==="map"){
   const map=mapsQuery.data?.maps.find(m=>m.id===intent.id&&!m.archived);if(map)activateMap(map);
  }else if(intent.kind==="createMap"){
   const saved=client.getQueryData<MapsOutput>(["storage-maps"])?.maps.find(m=>m.id===draft?.id&&!m.archived)??null;activateMap(saved);setShowImport(true);importMutation.mutate();
  }else if(intent.kind==="newMap"){
   const saved=client.getQueryData<MapsOutput>(["storage-maps"])?.maps.find(m=>m.id===draft?.id&&!m.archived)??null;
   activateMap(saved);setFile(null);setMapName("");setSourceKind("plan");setNewSectionId(intent.sectionId===undefined?(saved?.sectionId??null):intent.sectionId);setShowImport(true);
  }else{
   const saved=client.getQueryData<MapsOutput>(["storage-maps"])?.maps.find(m=>m.id===draft?.id&&!m.archived)??null;
   activateMap(saved);setManagerOpen(true);
  }
 }
 function requestNavigation(intent:Navigation){
  if(busy())return;
  if(dirty){setNavigationError("");setPendingNavigation(intent);}else performNavigation(intent);
 }
 function chooseMap(id:string){if(id!==draft?.id)requestNavigation({kind:"map",id});}
 async function saveAndNavigate(){
  if(!pendingNavigation||!draft||busy())return;
  try{await saveMutation.mutateAsync(draft);const intent=pendingNavigation;setPendingNavigation(null);performNavigation(intent);}
  catch(e){setNavigationError(e instanceof Error?e.message:"Could not save. Your edits are still here.");}
 }
 function organizationSaved(data:MapsOutput){
  client.setQueryData(["storage-maps"],data);setManagerOpen(false);
  const maps=data.maps.filter(m=>!m.archived);activateMap(maps.find(m=>m.id===draft?.id)??maps[0]??null);
 }
 function pos(e:{clientX:number;clientY:number}):Point{
  const r=svgRef.current!.getBoundingClientRect();
  return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};
 }
 function finishDrawing(){
  if(!draft||points.length<3)return;
  let i=draft.spaces.length+1,label="S-"+String(i).padStart(3,"0");
  while(draft.spaces.some(s=>s.label===label))label="S-"+String(++i).padStart(3,"0");
  const space:Space={id:crypto.randomUUID(),label,points,firstName:"",lastName:"",boatDescription:"",trailerDetails:"",notes:"",status:"available",reviewed:true};
  const parsed=mappingModel.space.safeParse(space);
  if(!parsed.success){toast.error("Draw a boundary with a visible area.");return;}
  change({spaces:[...draft.spaces,space]});setSelected(space.id);setDrawing(false);setPoints([]);
 }
 const suggestions=useMemo(()=>mergeSpaceSuggestions(draft?.spaces??[],analysis?.spaces??[],draft?.imageWidth,draft?.imageHeight),[draft?.spaces,analysis]);
 function updateUnitFields(id:string,patch:Partial<UnitFields>){
  if(!draft||busy())return;
  const existing=draft.spaces.some(s=>s.id===id);
  if(!existing&&!suggestions.spaces.some(s=>s.id===id))return;
  setDraft(current=>current?{...current,spaces:(existing?current.spaces:suggestions.spaces).map(s=>s.id===id?{...s,...patch}:s)}:current);
  setDirty(true);
  if(!existing)setAnalysis(null);
 }
 function acceptSuggestions(){
  if(!suggestions.added)return;
  change({spaces:suggestions.spaces});setSelected(suggestions.spaces[draft?.spaces.length??0]?.id??null);setAnalysis(null);
  toast.success(suggestions.added+" suggestions added. Save the map to keep them.");
 }
 function selectModalMarker(id:string){
  if(!draft)return;
  if(!draft.spaces.some(s=>s.id===id)){
   if(!suggestions.spaces.some(s=>s.id===id))return;
   acceptSuggestions();
  }
  setSelected(id);
 }
 function moveModalMarker(id:string,point:Point){
  if(!draft?.spaces.some(s=>s.id===id))selectModalMarker(id);
  moveMarker(id,point);
 }
 function removeSelectedMarker(){
  if(!draft||!active)return;
  setLastRemoved({mapId:draft.id,space:active,index:draft.spaces.findIndex(s=>s.id===active.id)});
  change({spaces:draft.spaces.filter(s=>s.id!==active.id)});setSelected(null);
 }
 function undoRemovedMarker(){
  if(!draft||!lastRemoved||lastRemoved.mapId!==draft.id)return;
  if(draft.spaces.length>=500){toast.error("The map is at its 500-marker limit.");return;}
  if(draft.spaces.some(s=>s.id===lastRemoved.space.id))return;
  if(draft.spaces.some(s=>s.label.toLowerCase()===lastRemoved.space.label.toLowerCase())){toast.error("That unit label is in use. Rename it before undoing the removal.");return;}
  const spaces=[...draft.spaces];spaces.splice(Math.min(lastRemoved.index,spaces.length),0,lastRemoved.space);
  change({spaces});setSelected(lastRemoved.space.id);setLastRemoved(null);
 }
 function moveMarker(id:string,point:Point){
  setDraft(d=>{if(!d)return d;return {...d,spaces:d.spaces.map(s=>{
   if(s.id!==id)return s;
   if(s.marker)return {...s,marker:point,reviewed:false};
   const anchor=spacePresentation.anchor(s),dx=Math.max(-Math.min(...s.points.map(p=>p.x)),Math.min(1-Math.max(...s.points.map(p=>p.x)),point.x-anchor.x)),dy=Math.max(-Math.min(...s.points.map(p=>p.y)),Math.min(1-Math.max(...s.points.map(p=>p.y)),point.y-anchor.y));
   return {...s,points:s.points.map(p=>({x:p.x+dx,y:p.y+dy})),reviewed:false};
  })};});setDirty(true);
 }
 function addMarker(point:Point){
  if(!draft||draft.spaces.length>=500)return;
  let i=1,label="S-001";while(draft.spaces.some(s=>s.label===label)||(lastRemoved?.mapId===draft.id&&lastRemoved.space.label===label))label="S-"+String(++i).padStart(3,"0");
  const space:Space={id:crypto.randomUUID(),label,marker:point,points:[],firstName:"",lastName:"",boatDescription:"",trailerDetails:"",notes:"",status:"occupied",reviewed:false};
  change({spaces:[...draft.spaces,space]});setSelected(space.id);
 }
 function openRename(){if(!draft||busy()||drawing)return;setImageOpen(false);setRenameOpen(true);}
 function applyUnitNames(options:typeof unitNaming.defaults){
  if(!draft||busy())return;
  try{const spaces=unitNaming.rename(draft.spaces,options);change({spaces});setNamingOptions(options);setRenameOpen(false);setLastRemoved(null);setUnitListOpen(true);toast.success("Unit names updated. Save map to keep these changes.");}
  catch(e){toast.error(e instanceof Error?e.message:"Could not rename units.");}
 }
 const filtered=draft?.spaces.filter(s=>[s.label,s.firstName,s.lastName,s.boatDescription,s.trailerDetails,...(draft.columns??defaultColumns).map(c=>displayFieldValue(s,c))].join(" ").toLowerCase().includes(search.toLowerCase()))??[];
 return <main className={styles.app} style={highlight.style}><Helmet><title>Lakeview Marine Mapping &amp; Storage</title><link rel="icon" type="image/png" href="/_cdn/static/da54d13f-9143-4e16-9285-b6df3f4b6493-mot-favicon.png"/><meta name="description" content="Map and manage boat and trailer storage spaces."/></Helmet>
 {draft&&<UnitRename key={"unit-rename-"+draft.id} open={renameOpen} spaces={draft.spaces} mapName={draft.name} options={namingOptions} onClose={()=>setRenameOpen(false)} onApply={applyUnitNames}/>}
 {draft&&columnsOpen&&<MappingColumns spaces={draft.spaces} columns={draft.columns??defaultColumns} onClose={()=>setColumnsOpen(false)} onApply={columns=>{change({columns,spaces:normalizeFieldValues(draft.spaces,columns)});setColumnsOpen(false);}}/>}
 {draft&&<LocationImport definitions={(draft.columns??defaultColumns).filter(c=>!c.hidden)} open={locationImportOpen} key={"location-import-"+draft.id} spaces={draft.spaces} mapName={draft.name} onClose={()=>setLocationImportOpen(false)} onApply={spaces=>{if(busy())return;change({spaces});setLocationImportOpen(false);setUnitListOpen(true);toast.success("Location details imported. Save map to keep these changes.");}}/>}

 {mapsQuery.data&&<LayoutManager open={managerOpen} data={mapsQuery.data} onClose={()=>setManagerOpen(false)} onSaved={organizationSaved} onNewMap={sectionId=>{setManagerOpen(false);setFile(null);setMapName("");setSourceKind("plan");setNewSectionId(sectionId);setShowImport(true);}}/>}
 <Dialog open={!!pendingNavigation} onOpenChange={open=>{if(!open&&!saveMutation.isPending)setPendingNavigation(null);}}><DialogContent><DialogHeader><DialogTitle>Save changes before continuing?</DialogTitle><DialogDescription>Your current map has unsaved changes. Save them, discard them, or stay here.</DialogDescription></DialogHeader>{navigationError&&<p role="alert">{navigationError}</p>}<Button disabled={saveMutation.isPending} onClick={saveAndNavigate}>{saveMutation.isPending?"Saving…":"Save and continue"}</Button><Button variant="outline" disabled={saveMutation.isPending} onClick={()=>{if(!pendingNavigation)return;const intent=pendingNavigation;setPendingNavigation(null);performNavigation(intent);}}>Discard and continue</Button><Button variant="ghost" disabled={saveMutation.isPending} onClick={()=>setPendingNavigation(null)}>Cancel</Button></DialogContent></Dialog>
 <aside aria-label="Storage map navigation" className={styles.sidebar+" "+(leftCollapsed?styles.sidebarCollapsed:"")}>
 <div className={styles.sidebarHeader}>{!leftCollapsed&&<div className={styles.brand}><Link to="/" className={styles.gatewayLink}>← Marine Ops</Link></div>}<Button variant="ghost" size="icon-sm" className={styles.sidebarToggle} aria-label={leftCollapsed?"Expand left sidebar":"Collapse left sidebar"} title={leftCollapsed?"Expand maps":"Collapse maps"} aria-expanded={!leftCollapsed} aria-controls="map-navigation" onClick={()=>setLeftCollapsed(v=>!v)}>{leftCollapsed?<ChevronRight size={17}/>:<ChevronLeft size={17}/>}</Button></div>
 <div id="map-navigation" className={styles.sidebarContent} hidden={leftCollapsed}><div className={styles.nav}><Map size={18}/> Storage maps</div><div className={styles.mapList}><LayoutNavigation maps={activeMaps} sections={sections} selectedId={draft?.id} disabled={busy()} onSelect={chooseMap} onNewMap={sectionId=>requestNavigation({kind:"newMap",sectionId})}/></div><div className={styles.sideNote}><Button variant="ghost" size="sm" className={styles.mapLink} disabled={busy()||mapsQuery.isFetching} onClick={reloadMaps}><RefreshCw size={14}/> Reload maps</Button></div></div></aside>
 <section className={styles.main}>{!detectionEnabled&&<p className={styles.notice}>Manual mapping is available. AI detection will be connected in a later migration step.</p>}<header className={styles.header}><h1><img className={styles.workspaceLogo} src="/_cdn/static/marine-ops-mapping.png" alt="Lakeview Marine Mapping & Storage" width={2172} height={724}/></h1>{activeMaps.length>0&&<div className={styles.mapPicker}><Select value={draft?.id} onValueChange={chooseMap} disabled={busy()}><SelectTrigger aria-label="Choose storage map"><SelectValue placeholder="Choose storage map"/></SelectTrigger><SelectContent>{activeMaps.map(m=><SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select><Button variant="outline" size="icon-sm" aria-label="Reload maps" disabled={busy()||mapsQuery.isFetching} onClick={reloadMaps}><RefreshCw size={14}/></Button></div>}<Button variant="outline" disabled={!draft||busy()} onClick={()=>setColumnsOpen(true)}>Customize columns</Button><Button variant="outline" disabled={!draft||busy()} onClick={async()=>{if(draft)try{await exportTemplate(draft.spaces,draft.columns??defaultColumns);}catch(e){toast.error(e instanceof Error?e.message:"Could not export template.");}}}>Export template</Button><Button variant="outline" disabled={!draft?.spaces.length||busy()||drawing} onClick={()=>setLocationImportOpen(true)}><Upload size={16}/> Import locations</Button><Button variant="outline" disabled={busy()||!mapsQuery.data} onClick={()=>requestNavigation({kind:"manager"})}>Manage layouts</Button><Button variant="outline" disabled={busy()||!mapsQuery.data} onClick={()=>requestNavigation({kind:"manager"})}>New section</Button><Button disabled={busy()||!mapsQuery.data} onClick={()=>requestNavigation({kind:"newMap"})}><Plus size={16}/> New map</Button></header>
 {mapsQuery.isFetching&&!draft&&<p role="status">Loading your storage maps…</p>}
 {mapsQuery.isError&&<div className={styles.notice} role="alert">{mapsQuery.error.message} <Button variant="outline" onClick={()=>mapsQuery.refetch()}>Retry</Button></div>}
 {showImport&&<section className={styles.importBox}><h2>New map</h2><p>Upload a new image to start a separate map. Existing maps and their locations are kept.</p><div className={styles.importFields}><label>Section<Select value={newSectionId??"none"} onValueChange={value=>setNewSectionId(value==="none"?null:value)}><SelectTrigger aria-label="New map section"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Ungrouped</SelectItem>{sections.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></label><label>Map name<Input value={mapName} maxLength={120} onChange={e=>setMapName(e.target.value)} placeholder="e.g. North storage yard"/></label><label>Image type<Select value={sourceKind} onValueChange={v=>setSourceKind(v as "plan"|"aerial")}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="plan">Plan / drawing</SelectItem><SelectItem value="aerial">Aerial photo</SelectItem></SelectContent></Select></label></div><FileDropzone accept="image/png,image/jpeg,image/webp" maxFiles={1} maxSize={10485760} disabled={importMutation.isPending} onFilesSelected={files=>{setFile(files[0]);if(!mapName)setMapName(files[0].name.replace(/\.[^.]+$/,""));}} title={file?file.name:"Choose a site plan or aerial photo"} subtitle="PNG, JPG or WebP · up to 10 MB"/><Button disabled={!file||busy()} onClick={()=>{if(dirty){requestNavigation({kind:"createMap"});return;}importMutation.mutate();}}>{importMutation.isPending?"Uploading image…":"Create map"}</Button><Button variant="ghost" disabled={busy()} onClick={()=>{setShowImport(false);setFile(null);setMapName("");}}>Cancel new map</Button></section>}
 <div className={styles.stats}><div><strong>{draft?.spaces.length??"—"}</strong><span>Mapped spaces</span></div><div><strong>{draft?.spaces.filter(s=>s.status==="occupied").length??"—"}</strong><span>Occupied</span></div><div><strong>{draft?.spaces.filter(s=>s.status==="available").length??"—"}</strong><span>Available</span></div><div><strong>{draft?.spaces.filter(s=>!s.reviewed).length??"—"}</strong><span>To review</span></div></div>
 <div className={styles.workspace+" "+(rightCollapsed?styles.detailsClosed:"")}><section className={styles.mapPanel}><div className={styles.panelHeader}><h2>{draft?.name??"Storage map"}</h2><span>{dirty?"Unsaved changes":draft?"All changes saved":"Start with an image"}</span></div>
 {draft?<><div className={styles.toolbar}><Button size="sm" variant="outline" disabled={!detectionEnabled||busy()||draft.spaces.length>0||Date.now()<cooldown} onClick={()=>analyzeMutation.mutate(undefined)}><Sparkles size={14}/>{analyzeMutation.isPending?"Detecting spaces…":"Detect spaces"}</Button><Button size="sm" variant={placingMarker?"secondary":"outline"} disabled={busy()||draft.spaces.length>=500} onClick={()=>{setPlacingMarker(v=>!v);setDrawing(false);setPoints([]);}}><MapPin size={14}/> Place markers</Button><Button size="sm" variant={showBoundaries?"secondary":"outline"} aria-pressed={showBoundaries} onClick={()=>setShowBoundaries(v=>!v)}>Boundaries</Button><Button size="sm" variant={drawing?"secondary":"outline"} disabled={busy()||draft.spaces.length>=500} onClick={()=>{setDrawing(v=>!v);setShowBoundaries(true);setPlacingMarker(false);setPoints([]);setSelected(null);}}><Plus size={14}/> Draw space</Button><Button size="sm" variant={unitListOpen?"secondary":"outline"} aria-pressed={unitListOpen} onClick={()=>setUnitListOpen(v=>!v)}><List size={14}/> Unit list</Button><Button size="sm" variant="outline" disabled={busy()||drawing||!draft.spaces.length} onClick={openRename}>Rename units</Button><Button size="sm" variant="outline" disabled={drawing} onClick={()=>setImageOpen(true)}><Maximize size={14}/> Full image</Button><MapHighlightPicker value={highlight.color} onChange={highlight.setColor}/><div className={styles.zoom}><Button size="icon-sm" variant="ghost" aria-label="Zoom out" disabled={zoom<=1} onClick={()=>setZoom(v=>Math.max(1,v-.25))}><ZoomOut size={16}/></Button><span>{Math.round(zoom*100)}%</span><Button size="icon-sm" variant="ghost" aria-label="Zoom in" disabled={zoom>=4} onClick={()=>setZoom(v=>Math.min(4,v+.25))}><ZoomIn size={16}/></Button></div><Button size="sm" disabled={!dirty||busy()||drawing} onClick={()=>saveMutation.mutate(undefined)}><Save size={14}/>{saveMutation.isPending?"Saving…":"Save map"}</Button></div>
 {analyzeMutation.isPending&&<div className={styles.detectionProgress}><div role="status" aria-live="polite"><strong>Detecting spaces…</strong><p>Inspecting boats, checking for missed or duplicate markers, and reconciling overlapping views. This can take a few minutes. Keep this page open.</p></div><Progress value={null} aria-label="Detecting storage spaces"/></div>}
 {drawing&&<div className={styles.drawHelp}><span>Click corners around a space. Add 3–16 points.</span><Button size="sm" variant="ghost" disabled={!points.length} onClick={()=>setPoints(p=>p.slice(0,-1))}><Undo2 size={14}/> Undo</Button><Button size="sm" disabled={points.length<3} onClick={finishDrawing}>Finish space</Button><Button size="sm" variant="ghost" onClick={()=>{setDrawing(false);setPoints([]);}}>Cancel</Button></div>}
 {analysis&&<div className={styles.notice}><strong>{suggestions.added} new suggested spaces</strong><p>{analysis.message}</p>{suggestions.skipped>0&&<p>{suggestions.skipped} overlapping suggestions skipped to preserve existing spaces.</p>}{suggestions.limited>0&&<p>{suggestions.limited} suggestions exceed the 500-space limit.</p>}{suggestions.added>0&&<Button size="sm" onClick={acceptSuggestions}>Add suggestions for review</Button>}<Button size="sm" variant="ghost" onClick={()=>setAnalysis(null)}>Dismiss</Button></div>}
 <div className={styles.mapStage}><div className={styles.imageWrap} style={{width:zoom*100+"%"}}><img crossOrigin="anonymous" src={draft.imageUrl} alt={draft.name+" source image"} className={styles.sourceImage} draggable={false}/><svg ref={svgRef} viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{pointerEvents:busy()?"none":undefined}} className={drawing||placingMarker?styles.drawingCanvas:styles.canvas} aria-label="Editable storage map" onClick={e=>{if(placingMarker){addMarker(pos(e));return;}if(drawing&&points.length<16)setPoints(p=>[...p,pos(e)]);}} onPointerMove={e=>{if(!drag.current)return;const point=pos(e),{id,index}=drag.current;setDraft(d=>d?{...d,spaces:d.spaces.map(s=>s.id===id?{...s,reviewed:false,points:s.points.map((p,i)=>i===index?point:p)}:s)}:d);setDirty(true);}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
 {showBoundaries&&draft.spaces.filter(s=>!s.marker).map(s=>{return <g key={s.id}><polygon points={s.points.map(p=>p.x*1000+","+p.y*1000).join(" ")} className={s.id===selected?styles.selectedRegion:!s.reviewed?styles.suggestedRegion:s.status==="occupied"?styles.occupiedRegion:styles.region} role="button" tabIndex={drawing?-1:0} aria-label={s.label+" "+s.status+(!s.reviewed?", needs review":"")} onClick={e=>{if(!drawing){e.stopPropagation();setSelected(s.id);}}} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setSelected(s.id);}}}/>{s.id===selected&&!drawing&&s.points.map((p,i)=><circle key={i} cx={p.x*1000} cy={p.y*1000} r={6/zoom} className={styles.vertex} onPointerDown={e=>{e.preventDefault();e.stopPropagation();drag.current={id:s.id,index:i};e.currentTarget.setPointerCapture(e.pointerId);}}/>)}</g>;})}
 {drawing&&<><polyline points={points.map(p=>p.x*1000+","+p.y*1000).join(" ")} className={styles.drawLine}/>{points.map((p,i)=><circle key={i} cx={p.x*1000} cy={p.y*1000} r="4" className={styles.vertex}/>)}</>}
 </svg><SpaceMarkers spaces={showBoundaries?draft.spaces.filter(s=>!!s.marker):draft.spaces} selectedId={selected} hoveredId={hoveredId} onHover={setHoveredId} disabled={busy()||drawing||placingMarker} onSelect={id=>{setSelected(id);setRightCollapsed(false);}} onMove={moveMarker}/></div></div><div className={styles.mapFooter}><MousePointer2 size={16}/>{placingMarker?"Click missed objects to add markers. Click Place markers again to finish.":"Select a marker to assign a name. Drag it to reposition, or use arrow keys. Open Unit list for names and boat details."}</div></>:<div className={styles.demoMap}><Map size={42} strokeWidth={1}/><h2>Bring your storage area into view.</h2><p>Import a drawing, site plan or aerial photo.<br/>Then detect spaces or draw their boundaries yourself.</p><Button onClick={()=>requestNavigation({kind:"newMap"})}><Upload size={16}/> Import your first image</Button></div>}</section>
 <aside aria-label="Unit Details" className={styles.details+" "+(rightCollapsed?styles.detailsCollapsed:"")}><div className={styles.detailsHeader}>{!rightCollapsed&&<h2>Unit Details</h2>}<Button variant="ghost" size="icon-sm" aria-label={rightCollapsed?"Expand unit details sidebar":"Collapse unit details sidebar"} title={rightCollapsed?"Expand unit details":"Collapse unit details"} aria-expanded={!rightCollapsed} aria-controls="unit-details-content" onClick={()=>setRightCollapsed(v=>!v)}>{rightCollapsed?<ChevronLeft size={17}/>:<ChevronRight size={17}/>}</Button></div><div id="unit-details-content" hidden={rightCollapsed} className={styles.detailsContent}><UnitDetails columns={draft?.columns??defaultColumns} space={active} disabled={busy()} onChange={updateSpace} onRemove={removeSelectedMarker} lastNameRef={mainNameInput}/>
 <div className={styles.locationSection}><label>Find a unit<Input placeholder="Name, boat or unit label" value={search} onChange={e=>setSearch(e.target.value)}/></label><div className={styles.locationList}>{filtered.map(s=><Button key={s.id} variant="ghost" className={styles.locationRow} onClick={()=>{setSelected(s.id);setDrawing(false);setPoints([]);}}><span><strong>{s.label}</strong><small>{[s.lastName,s.firstName].filter(Boolean).join(", ")||s.status}</small></span>{!s.reviewed&&<span className={styles.reviewDot} aria-label="Needs review"/>}</Button>)}{!filtered.length&&<div className={styles.empty}>{draft?"No locations found. Detect or draw a space to begin.":"Your locations will appear here after importing a map."}</div>}</div></div></div></aside></div></section>{draft&&<UnitList columns={draft.columns} onRename={openRename} key={draft.id} open={unitListOpen&&!imageOpen} spaces={draft.spaces} onUpdate={updateUnitFields} selectedId={selected} hoveredId={hoveredId} onHover={setHoveredId} disabled={busy()} onClose={()=>setUnitListOpen(false)} onSelect={id=>{setListFocusId(id);setSelected(id);setRightCollapsed(false);setDrawing(false);setPlacingMarker(false);setPoints([]);}}/>}{draft&&<ImageDetectionModal highlightColor={highlight.color} onHighlightColorChange={highlight.setColor} onRenameUnits={openRename} open={imageOpen} onOpenChange={setImageOpen} map={draft} pending={analyzeMutation.isPending} coolingDown={Date.now()<cooldown} canDetect={detectionEnabled&&!busy()&&Date.now()>=cooldown&&draft.spaces.length<500} analysis={analysis} merge={suggestions} onDetect={region=>analyzeMutation.mutate(region)} onAccept={acceptSuggestions} onSelect={selectModalMarker} selectedId={selected} candidates={suggestions.spaces.slice(draft.spaces.length)} dirty={dirty} saving={saveMutation.isPending} onChange={updateSpace} onUpdateUnit={updateUnitFields} onAdd={addMarker} onMove={moveModalMarker} onRemove={removeSelectedMarker} onUndoRemove={undoRemovedMarker} canUndoRemove={!!lastRemoved&&lastRemoved.mapId===draft.id} onSave={()=>saveMutation.mutate(undefined)} onReviewAndSave={reviewAndSave} onDismiss={()=>setAnalysis(null)}/>}</main>;
}
