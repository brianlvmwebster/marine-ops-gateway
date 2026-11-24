import React,{useState} from "react";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {NativeGatewayGuard} from "../components/NativeGatewayGuard";
import MappingUtility from "../components/MapToolWorkspace";
function Workspace(){const [client]=useState(()=>new QueryClient({defaultOptions:{queries:{staleTime:60000}}}));return <QueryClientProvider client={client}><MappingUtility/></QueryClientProvider>;}
export default function Page(){return <NativeGatewayGuard>{import.meta.env.VITE_APP_ENV==='staging'?<main className="company-home-intro"><h1>Mapping</h1><p>Mapping is not yet enabled in standalone staging. Shared Customers and Units are available from the company navigation above.</p></main>:<Workspace/>}</NativeGatewayGuard>;}