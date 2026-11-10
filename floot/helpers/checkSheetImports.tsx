import {importSheetJobs} from './importSheetJobs';
// User requested ongoing imports. User-selected 15-minute checks also catch formula/form-feed changes
// that do not emit an editable-sheet webhook. Open/focus imports cover active use.
export async function checkSheetImports(){await importSheetJobs({force:true});}
