/** Source backup only. Never copies environments, databases, memberships or private assets. */
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const source=resolve(process.argv[2]||'../service-dashboard'),target=resolve('floot');
const commit=execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const paths=execFileSync('git',['-C',source,'ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean).filter(p=>/^(components|helpers|endpoints|pages|migrations|docs|static\/__dev\/notes)\//.test(p)||['App.tsx','index.tsx','index.html','base.css','package.json','package-lock.json','vite.config.ts','server.ts','loadEnv.ts','AGENTS.md','README.md','static/__dev/scheduled-jobs.json'].includes(p));
const files={};
for(const name of paths){const from=resolve(source,name),to=resolve(target,name);if(!from.startsWith(source+'/')&&!from.startsWith(source+'\\'))throw new Error('Source escaped');const bytes=await readFile(from);await mkdir(dirname(to),{recursive:true});await writeFile(to,bytes);files[name]=createHash('sha256').update(bytes).digest('hex');}
await cp(resolve(source,'public'),resolve(target,'public'),{recursive:true});
await writeFile(resolve(target,'SOURCE.json'),JSON.stringify({repository:'https://github.com/brianlvmwebster/service-dashboard',sourceCommit:commit,files},null,2)+'\n');
console.log('Backed up '+paths.length+' tracked Floot source files from '+commit+'.');
