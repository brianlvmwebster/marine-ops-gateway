import React from 'react';import {useAuth} from '../helpers/useAuth';import Gateway from '../components/Gateway';import {NativeGatewayGuard} from '../components/NativeGatewayGuard';
function Content(){const {authState}=useAuth();return authState.type==='authenticated'?<Gateway admin canManage email={authState.user.email}/>:null;}
export default function Page(){return <NativeGatewayGuard admin><Content/></NativeGatewayGuard>;}
