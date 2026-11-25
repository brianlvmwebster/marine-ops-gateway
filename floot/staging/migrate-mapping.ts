import {readFile} from 'node:fs/promises';
import {stagingOnly} from './config';
import {platformDatabase} from '../platform/database';
stagingOnly();const db=platformDatabase();
try{const c=await db.reserve();try{await c.unsafe(await readFile(new URL('../migrations/015-mapping.sql',import.meta.url),'utf8'));await c.unsafe(await readFile(new URL('../migrations/016-mapping-route.sql',import.meta.url),'utf8'));}finally{c.release();}console.log('Standalone mapping schema ready. No Floot data imported.');}finally{await db.end();}
