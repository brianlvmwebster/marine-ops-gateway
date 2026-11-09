import Login from '../../login';
import {microsoftSettings} from '../../../lib/microsoft-auth.mjs';
export const dynamic='force-dynamic';
export default function Page(){const settings=microsoftSettings();return <Login microsoftEnabled={settings.configured} microsoftOnly={settings.only}/>;}
