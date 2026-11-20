import {z} from 'zod';
export const layoutDocumentSchema=z.object({version:z.literal(1),booth:z.object({w:z.number().positive().finite(),h:z.number().positive().finite()}).passthrough(),labels:z.boolean(),items:z.array(z.object({id:z.string(),kind:z.string()}).passthrough()).max(500)}).passthrough();
export const layoutActionSchema=z.discriminatedUnion('action',[
z.object({action:z.literal('save'),id:z.string().uuid().optional(),revision:z.number().int().positive().optional(),name:z.string().trim().min(1).max(100),document:layoutDocumentSchema}),
z.object({action:z.literal('rename'),id:z.string().uuid(),revision:z.number().int().positive(),name:z.string().trim().min(1).max(100)}),
z.object({action:z.literal('delete'),id:z.string().uuid(),revision:z.number().int().positive()})
]);
export type SavedLayout={id:string;name:string;revision:number;updatedAt:Date|string;updatedBy:string};
export type LayoutDocument=z.infer<typeof layoutDocumentSchema>;
