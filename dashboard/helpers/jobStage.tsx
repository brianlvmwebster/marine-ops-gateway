import type {JobData} from './jobModel';
// Before admin review existed, Completed was the stored value displayed as Done.
// Interpret those records without rewriting historical jobs or the source sheet.
export function normalizeJobStage(data:JobData):JobData{return data.status==='Completed'&&!data.adminReview?{...data,status:'Done'}:data;}
