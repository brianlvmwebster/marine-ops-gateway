import React from 'react';import ServiceDashboard from '../components/ServiceDashboard';import {NativeGatewayGuard} from '../components/NativeGatewayGuard';
export default function Dashboard(){return <NativeGatewayGuard><ServiceDashboard/></NativeGatewayGuard>;}
