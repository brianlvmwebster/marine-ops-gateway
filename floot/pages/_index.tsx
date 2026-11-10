import React from 'react';
import {useAuth} from '../helpers/useAuth';
import Gateway from '../components/Gateway';
import {NativeGatewayGuard} from '../components/NativeGatewayGuard';
function Content(){const {authState}=useAuth();return authState.type==='authenticated'?<Gateway admin={false} canManage={authState.user.role==='admin'} email={authState.user.email}/>:null;}
export default function Home(){return <NativeGatewayGuard><Content/></NativeGatewayGuard>;}
