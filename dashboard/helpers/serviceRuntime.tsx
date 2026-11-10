declare global {interface Window {__LAKEVIEW_SERVICE_BASE__?:string;}}
export const serviceBase=typeof window!=='undefined'&&window.__LAKEVIEW_SERVICE_BASE__==='/dashboard'?'/dashboard':'';
export const serviceApiUrl=(route:string)=>serviceBase+'/_api/'+route;
