import 'server-only';
import {headers} from 'next/headers';
import {cache} from 'react';
import {getAuth} from './auth';
import {getPool} from './auth-config.mjs';
import {microsoftSettings} from './microsoft-auth.mjs';
export const getAccess=cache(async()=>{
 const microsoft=microsoftSettings();
 if(microsoft.only&&!microsoft.configured)return {signedIn:false,canView:false,isAdmin:false,email:'',userId:''};
 const session=await getAuth().api.getSession({headers:await headers()});
 if(!session)return {signedIn:false,canView:false,isAdmin:false,email:'',userId:''};
 const email=session.user.email.toLowerCase();
 const {rows}=await getPool().query('SELECT role FROM gateway_access WHERE email=$1 AND enabled',[email]);
 return {signedIn:true,canView:rows.length>0,isAdmin:rows[0]?.role==='admin',email,userId:session.user.id};
});
