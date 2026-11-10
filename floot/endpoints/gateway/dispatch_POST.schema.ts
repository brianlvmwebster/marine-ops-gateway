import {z} from 'zod';
export const schema=z.object({method:z.enum(['GET','POST']),route:z.string().max(100),query:z.string().max(4096),body:z.string().max(1024*1024)}).strict();
