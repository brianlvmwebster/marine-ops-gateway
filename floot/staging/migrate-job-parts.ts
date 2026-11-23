import {readFile} from 'node:fs/promises';
import {stagingOnly} from './config';
import {platformDatabase} from '../platform/database';
stagingOnly();const db=platformDatabase();
try{const c=await db.reserve();try{await c.unsafe(await readFile(new URL('../migrations/014-service-job-parts.sql',import.meta.url),'utf8'));}finally{c.release();}console.log('Staging job parts schema ready.');}finally{await db.end();}
