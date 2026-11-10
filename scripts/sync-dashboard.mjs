/** Run after a verified service-dashboard change, before committing the gateway snapshot. */
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,relative} from 'node:path';
const source=resolve(process.argv[2]||'../service-dashboard'),target=resolve('dashboard');
const queue=['index.tsx','App.tsx','index.html','package.json','package-lock.json','vite.config.ts'],seen=new Set(),manifest={};
const exists=async p=>{try{await readFile(p);return true;}catch{return false;}};
while(queue.length){
 const name=queue.shift();if(seen.has(name))continue;seen.add(name);
 const from=resolve(source,name);if(!from.startsWith(source+'/')&&!from.startsWith(source+'\\'))throw new Error('Source path escaped');
 const content=await readFile(from);const to=resolve(target,name);
 await mkdir(dirname(to),{recursive:true});await writeFile(to,content);manifest[name]=createHash('sha256').update(content).digest('hex');
 if(!/\.[cm]?[jt]sx?$/.test(name))continue;
 for(const match of content.toString().matchAll(/(?:from\s*|import\s*\()\s*['"](\.[^'"]+)['"]|import\s*['"](\.[^'"]+)['"]/g)){
  const base=resolve(dirname(from),match[1]||match[2]);let dependency;
  for(const candidate of [base,base+'.tsx',base+'.ts',base+'.css',base+'/index.tsx'])if(await exists(candidate)){dependency=candidate;break;}
  if(!dependency)throw new Error('Missing source import '+match[0]+' from '+name);
  queue.push(relative(source,dependency).replaceAll('\\','/'));
 }
}
await cp(resolve(source,'public'),resolve(target,'public'),{recursive:true});
const sourceCommit=process.argv[3]||'working-tree';
await writeFile(resolve(target,'SOURCE.json'),JSON.stringify({repository:'https://github.com/brianlvmwebster/service-dashboard',sourceCommit,files:manifest},null,2)+'\n');
console.log('Synced '+seen.size+' dashboard frontend files.');
