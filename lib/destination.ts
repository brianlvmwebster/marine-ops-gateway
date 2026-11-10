import type {ButtonLink} from './validation';
export function destinationPath(button:ButtonLink){return button.slug==='service-management'?'/dashboard/':button.slug?'/apps/'+encodeURIComponent(button.slug):button.url;}
export function safeReturnPath(value:unknown){if(typeof value==='string'&&(/^\/dashboard\/?$/.test(value)||/^\/dashboard\/jobs\/[a-f0-9-]{36}\/print(?:\?mode=checklist)?$/.test(value)))return value==='/dashboard'?'/dashboard/':value;return typeof value==='string'&&/^\/apps\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)?value:'/';}
