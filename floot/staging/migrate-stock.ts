import {readFile} from 'node:fs/promises';
import {stagingOnly} from './config';
import {platformDatabase} from '../platform/database';
stagingOnly();const db=platformDatabase();
try{const c=await db.reserve();try{await c.unsafe(await readFile(new URL('../migrations/013-part-stock-movements.sql',import.meta.url),'utf8'));}finally{c.release();}console.log('Staging stock movement schema ready.');}finally{await db.end();}
