import {z} from 'zod';
export const schema=z.object({file:z.string().max(120).optional()});
export type InputType=z.infer<typeof schema>;
export type OutputType=never; // This authenticated endpoint serves HTML and runtime assets, not JSON.
