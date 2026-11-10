import {z} from 'zod';
export const schema=z.object({});
export type CalendarOption={id:string;name:string;canEdit:boolean;isDefault:boolean;owner:string};
export type OutputType={email:string;selectedId:string;calendars:CalendarOption[]};