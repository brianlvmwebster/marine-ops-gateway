import {z} from 'zod';export const schema=z.object({contentType:z.enum(['image/png','image/jpeg','image/webp']),sizeBytes:z.number().int().min(1).max(2097152)}).strict();
