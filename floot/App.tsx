import React,{useEffect} from 'react';
import {WorkspaceAppearance} from './components/WorkspaceAppearance';
import {BrowserRouter,Routes,Route,Navigate,useLocation,useNavigationType} from 'react-router-dom';
import {GlobalContextProviders} from './components/_globalContextProviders';
import {serviceBase} from './helpers/serviceRuntime';
import Layouts from './pages/layouts';
import Maps from './pages/maps';
import DockScheduler from './pages/dockscheduler';
import DockBuilder from './pages/dock-builder';
import GatewayHome from './pages/_index';
import CompanyLogin from './pages/login';
import GatewayAdmin from './pages/admin';
import GatewayUsers from './pages/admin.users';
import GatewayDestination from './pages/apps.$slug';
import NativeDashboard from './pages/dashboard';
import NativePrint from './pages/dashboard.jobs.$jobId.print';
import ServiceDashboard from './components/ServiceDashboard';
import JobPrint from './pages/jobs.$jobId.print';
import './base.css';
import Platform from './pages/platform';
import Customers from './pages/customers';
import PartsInventory from './pages/inventory-parts';
import StagingLogin from './pages/staging-login';
import './pages/workspace-design.css';
function ScrollManager(){const {pathname,search,hash}=useLocation(),type=useNavigationType();useEffect(()=>{if(type!=='POP'&&!hash)window.scrollTo({top:0,left:0,behavior:'instant'});},[pathname,search,hash,type]);return null;}
/** Floot is primary. The mount flag preserves the previous Vercel rollback build. */
export function App(){return <BrowserRouter basename={serviceBase||undefined} future={{v7_startTransition:false,v7_relativeSplatPath:false}}><ScrollManager/>{import.meta.env.VITE_APP_ENV==='staging'&&<WorkspaceAppearance/>}{import.meta.env.VITE_APP_ENV==='staging'&&<div className="staging-banner" role="status" style={{padding:12,background:"#f5d778",color:"#162c3c",textAlign:"center"}}>STAGING — Lakeview customer data · Test service jobs · Imports, Outlook and external integrations disabled</div>}<GlobalContextProviders>{serviceBase?<Routes><Route path="/" element={<ServiceDashboard/>}/><Route path="/jobs/:jobId/print" element={<JobPrint/>}/></Routes>:<Routes><Route path="/" element={<GatewayHome/>}/><Route path="/platform" element={<Platform/>}/><Route path="/customers" element={<Customers/>}/>{import.meta.env.VITE_APP_ENV==='staging'&&<Route path="/inventory/parts" element={<PartsInventory/>}/>}<Route path="/login" element={import.meta.env.VITE_APP_ENV==='staging'?<StagingLogin/>:<CompanyLogin/>}/><Route path="/sign-in" element={<Navigate to="/login" replace/>}/><Route path="/admin" element={<GatewayAdmin/>}/><Route path="/admin/users" element={<GatewayUsers/>}/><Route path="/apps/:slug" element={<GatewayDestination/>}/><Route path="/maps" element={<Maps/>}/><Route path="/layouts" element={<Layouts/>}/><Route path="/dockscheduler" element={<DockScheduler/>}/><Route path="/dock-builder" element={<DockBuilder/>}/><Route path="/dashboard" element={<NativeDashboard/>}/><Route path="/dashboard/jobs/:jobId/print" element={<NativePrint/>}/><Route path="/jobs/:jobId/print" element={<NativePrint/>}/><Route path="*" element={<main><h1>Page not found</h1><a href="/">Back to gateway</a></main>}/></Routes>}</GlobalContextProviders></BrowserRouter>;}
