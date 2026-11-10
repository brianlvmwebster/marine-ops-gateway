import Login from '../../login';
import {microsoftSettings} from '../../../lib/microsoft-auth.mjs';
import {safeReturnPath} from '../../../lib/destination';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{next?:string}>}){const settings=microsoftSettings();const {next}=await searchParams;return <Login microsoftEnabled={settings.configured} microsoftOnly={settings.only} returnTo={safeReturnPath(next)}/>;}
