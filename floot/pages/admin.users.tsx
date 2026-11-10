import React from 'react';import GatewayMembers from '../components/GatewayMembers';import {NativeGatewayGuard} from '../components/NativeGatewayGuard';
export default function Page(){return <NativeGatewayGuard admin><GatewayMembers/></NativeGatewayGuard>;}
