import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { isAdmin } from '../../../lib/access';
import { validButtons } from '../../../lib/validation';
export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => Response.json(body, {status, headers: {'Cache-Control':'no-store'}});
export async function GET() {
  const row = await env.DB!.prepare('SELECT contents, version FROM gateway WHERE id = ?').bind('main').first<{contents:string;version:number}>();
  return json(row ? {buttons:JSON.parse(row.contents),version:row.version} : {buttons:[],version:0});
}
export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user || !isAdmin(user.email)) return json({error:'Administrator access required.'},403);
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({error:'Invalid request origin.'},403);
  let data; try { const body = await request.text(); if(body.length>300000) return json({error:'Request too large.'},413); data=JSON.parse(body); } catch { return json({error:'Invalid JSON.'},400); }
  if (!validButtons(data.buttons) || !Number.isSafeInteger(data.version) || data.version < 0) return json({error:'Check button names, URLs, and images. A maximum of 100 buttons is supported.'},400);
  const contents = JSON.stringify(data.buttons);
  const result = data.version === 0
    ? await env.DB!.prepare('INSERT OR IGNORE INTO gateway (id, contents, version) VALUES (?, ?, 1)').bind('main',contents).run()
    : await env.DB!.prepare('UPDATE gateway SET contents = ?, version = version + 1 WHERE id = ? AND version = ?').bind(contents,'main',data.version).run();
  if (!result.meta.changes) return json({error:'Another administrator saved changes. Reload before editing again.'},409);
  return json({version:data.version+1});
}
