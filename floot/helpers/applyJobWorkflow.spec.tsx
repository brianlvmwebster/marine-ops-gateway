import {applyJobWorkflow} from './applyJobWorkflow';
import {emptyJob} from './jobModel';
import {workflowInput,nextStep} from './workflowModel';
import {mergeSheetJob} from './sheetMapping';
const id='11111111-1111-4111-8111-111111111111',groupId='22222222-2222-4222-8222-222222222222';
describe('Quick job workflow',()=>{
 const current={...emptyJob,status:'Scheduled' as const,notes:'Keep these notes',technician:'Existing technician',sourceSubmissionId:'123'};
 it('changes status without losing checklist, location, assignment or source identity',()=>{const updated=applyJobWorkflow(current,{id,version:1,status:'Onsite'},[]);expect(updated).toEqual({...current,status:'Onsite'});expect(current.status).toBe('Scheduled');expect(nextStep('Onsite').status).toBe('In progress');expect(nextStep('In progress').status).toBe('Done');});
 it('uses the saved directory name and clears an assignment explicitly',()=>{const assigned=applyJobWorkflow(current,{id,version:1,assignmentId:groupId},[{id:groupId,kind:'group',name:'Service crew',memberIds:[],version:1}]);expect(assigned.technician).toBe('Service crew');expect(assigned.assignmentKind).toBe('group');expect(assigned.status).toBe('Scheduled');expect(applyJobWorkflow(assigned,{id,version:2,assignmentId:null},[]).technician).toBe('Unassigned');});
 it('rejects unknown assignments, invalid statuses and attempts to overwrite unrelated fields',()=>{expect(()=>applyJobWorkflow(current,{id,version:1,assignmentId:groupId},[])).toThrow();expect(workflowInput.safeParse({id,version:0,status:'Onsite'}).success).toBeFalse();expect(workflowInput.safeParse({id,version:1,status:'Invented'}).success).toBeFalse();expect(workflowInput.safeParse({id,version:1,status:'Onsite',data:{notes:'Overwrite'}}).success).toBeFalse();});
 it('does not silently reopen a cancelled appointment or let an unchanged sheet overwrite onsite progress',()=>{expect(()=>applyJobWorkflow({...current,appointment:'Cancelled',cancelledBy:'AB'},{id,version:1,status:'Onsite'},[])).toThrow();const onsite={...current,status:'Onsite' as const};expect(mergeSheetJob(onsite,current,current).data.status).toBe('Onsite');});
});
