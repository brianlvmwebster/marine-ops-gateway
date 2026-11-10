import React,{useEffect} from 'react';
import {BrowserRouter,Routes,Route,Navigate,useLocation,useNavigationType} from 'react-router-dom';
import {GlobalContextProviders} from './components/_globalContextProviders';
import {serviceBase} from './helpers/serviceRuntime';
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
function ScrollManager(){const {pathname,search,hash}=useLocation(),type=useNavigationType();useEffect(()=>{if(type!=='POP'&&!hash)window.scrollTo({top:0,left:0,behavior:'instant'});},[pathname,search,hash,type]);return null;}
/** Floot is primary. The mount flag preserves the previous Vercel rollback build. */
export function App(){return <BrowserRouter basename={serviceBase||undefined} future={{v7_startTransition:false,v7_relativeSplatPath:false}}><ScrollManager/><GlobalContextProviders>{serviceBase?<Routes><Route path="/" element={<ServiceDashboard/>}/><Route path="/jobs/:jobId/print" element={<JobPrint/>}/></Routes>:<Routes><Route path="/" element={<GatewayHome/>}/><Route path="/login" element={<CompanyLogin/>}/><Route path="/sign-in" element={<Navigate to="/login" replace/>}/><Route path="/admin" element={<GatewayAdmin/>}/><Route path="/admin/users" element={<GatewayUsers/>}/><Route path="/apps/:slug" element={<GatewayDestination/>}/><Route path="/dashboard" element={<NativeDashboard/>}/><Route path="/dashboard/jobs/:jobId/print" element={<NativePrint/>}/><Route path="/jobs/:jobId/print" element={<NativePrint/>}/><Route path="*" element={<main><h1>Page not found</h1><a href="/">Back to gateway</a></main>}/></Routes>}</GlobalContextProviders></BrowserRouter>;}
