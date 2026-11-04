// Use only a local export from the old Sites app. Does not modify the old site.
import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';
const path=process.argv[2];
if(!path)throw new Error('Usage: node --env-file=.env.local scripts/import-sites.mjs <export-folder>');
const {buttons}=JSON.parse(await readFile(path+'/buttons.json','utf8'));
if(!Array.isArray(buttons))throw new Error('Invalid export.');
const sql=neon(process.env.DATABASE_URL);
if((await sql`SELECT id FROM gateway WHERE id='main'`).length)throw new Error('Gateway already has data; import refused to avoid overwriting it.');
let images=0;
for(const button of buttons){
  if(!button.image.startsWith('/api/images/'))continue;
  const id=button.image.slice('/api/images/'.length);
  if(!/^[\w-]{1,80}$/.test(id))throw new Error('Invalid exported image ID.');
  await put('images/'+id,await readFile(path+'/'+id),{access:'private',contentType:(await readFile(path+'/'+id+'.type','utf8')).trim(),addRandomSuffix:false});
  images++;
}
if(buttons.length)await sql`INSERT INTO gateway (id,contents,version) VALUES ('main',${JSON.stringify(buttons)}::jsonb,1)`;
console.log(JSON.stringify({importedButtons:buttons.length,importedImages:images}));
