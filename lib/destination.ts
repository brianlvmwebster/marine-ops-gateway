import type {ButtonLink} from './validation';
export function destinationPath(button:ButtonLink){return button.slug?'/apps/'+encodeURIComponent(button.slug):button.url;}
export function safeReturnPath(value:unknown){return typeof value==='string'&&/^\/apps\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)?value:'/';}
