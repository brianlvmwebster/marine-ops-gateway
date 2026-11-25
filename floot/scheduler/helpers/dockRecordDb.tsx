import {AsyncLocalStorage} from 'node:async_hooks';
import {AppError} from './dockErrors';
export const schedulerContext=new AsyncLocalStorage<any>();
export function recordDb(){const db=schedulerContext.getStore();if(!db)throw new AppError('Scheduler request context required.',503);return db;}
export async function requireRecordStore(sql=recordDb()){const [r]=await sql`select active_import from scheduler_record_state where singleton`;if(!r?.active_import)throw new AppError('Scheduler data migration is incomplete.',503);}
