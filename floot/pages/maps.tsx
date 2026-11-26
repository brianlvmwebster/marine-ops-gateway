import React,{useState} from "react";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {NativeGatewayGuard} from "../components/NativeGatewayGuard";
import {GatewayToolWorkspace} from "../components/GatewayToolWorkspace";
import MappingUtility from "../components/MapToolWorkspace";
function Workspace(){const [client]=useState(()=>new QueryClient({defaultOptions:{queries:{staleTime:60000}}}));return <QueryClientProvider client={client}><MappingUtility/></QueryClientProvider>;}
export default function Page(){return <NativeGatewayGuard><GatewayToolWorkspace><Workspace/></GatewayToolWorkspace></NativeGatewayGuard>;}
