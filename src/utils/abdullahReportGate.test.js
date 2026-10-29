import test from 'node:test';
import assert from 'node:assert/strict';
import {pendingAbdullahReports, reportDeadlineDate} from './abdullahReportGate.js';
const attendance=[{employeeId:'EMP-0006',date:'2026-10-25',timeIn:'08:00'}];
const pending=(reports,now)=>pendingAbdullahReports(reports,[],[],attendance,new Date(now));
test('Jordan deadline activates at 21:00 exactly',()=>{
 assert.deepEqual(pending([],'2026-10-25T17:59:59Z'),[]);
 assert.deepEqual(pending([],'2026-10-25T18:00:00Z'),['2026-10-25']);
});
test('missing report remains required next morning',()=>assert.deepEqual(pending([],'2026-10-26T05:00:00Z'),['2026-10-25']));
test('submission unlocks without approval or every employee evaluation',()=>assert.deepEqual(pending([{supervisorId:'EMP-0006',date:'2026-10-25',status:'قيد المراجعة',employeeEvaluations:[{employeeId:'worker',rating:'جيد'}]}],'2026-10-26T05:00:00Z'),[]));
test('draft, deleted and another supervisor cannot unlock',()=>{
 for(const status of ['مسودة','محذوف','deleted']) assert.equal(pending([{supervisorId:'EMP-0006',date:'2026-10-25',status,employeeEvaluations:[{}]}],'2026-10-26T05:00:00Z').length,1);
});
test('no retroactive dates or days without work evidence',()=>{
 assert.deepEqual(pendingAbdullahReports([],[],[],[{employeeId:'EMP-0006',date:'2026-10-24',timeIn:'08:00'}],new Date('2026-10-26T05:00:00Z')),[]);
 assert.deepEqual(pendingAbdullahReports([],[],[],[],new Date('2026-10-26T05:00:00Z')),[]);
});
test('team reports require supervisor submission after the deadline',()=>assert.deepEqual(pendingAbdullahReports([],[{userId:'worker',date:'2026-10-25'}],['worker'],[],new Date('2026-10-25T18:00:00Z')),['2026-10-25']));
