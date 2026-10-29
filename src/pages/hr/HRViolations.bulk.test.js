import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateSalaries} from '../../utils/salaryCalculator.js';
const source=readFileSync(new URL('./HRViolations.jsx',import.meta.url),'utf8');
const body=source.slice(source.indexOf('  const handleBulk ='),source.indexOf('  const totalDeductions ='))+';return handleBulk;';
function fixture(rows,actionResponse='ملاحظة',failId=''){
 const calls=[];let selection=new Set(rows.map(r=>r.id));let busy=false;
 const api=new Function('bulkBusy','selectedRows','canDelete','canEdit','canApprove','Swal','setBulkBusy','createEmployeeAlert','user','deleteHRViolation','saveHRViolation','setSelectedIds','refreshVisibleData','refreshCounts',body)(false,rows,true,true,true,{fire:async()=>({isConfirmed:true,value:actionResponse})},v=>busy=v,async data=>calls.push(['note',data]),{id:'admin',name:'admin'},async id=>{if(id===failId)throw Error('locked');calls.push(['delete',id])},async data=>{if(data.id===failId)throw Error('locked');calls.push(['save',data])},fn=>selection=fn(selection),async()=>{},()=>{});
 return {api,calls,selection:()=>selection,busy:()=>busy};
}
test('bulk approval skips resolved rows, retains failures, and processes remaining rows',async()=>{const f=fixture([{id:'a',status:'معلق'},{id:'b',status:'موافق'},{id:'c',status:'معلق'},{id:'d',status:'معلق'}],'','c');await f.api('approve');assert.deepEqual(f.calls.map(c=>c[1].id),['a','d']);assert.deepEqual([...f.selection()],['b','c']);assert.equal(f.busy(),false)});
test('bulk deletion skips processed payroll and retains failed records',async()=>{const f=fixture([{id:'a'},{id:'b',processedInPeriod:'2026-10'},{id:'c'}],'','c');await f.api('delete');assert.deepEqual(f.calls,[['delete','a']]);assert.deepEqual([...f.selection()],['b','c'])});
test('notes are deduplicated per employee and include selected cases',async()=>{const f=fixture([{id:'a',employeeId:'e',date:'2026-10-20',type:'تأخير'},{id:'b',employeeId:'e',date:'2026-10-21',type:'تأخير'},{id:'c',employeeId:'f',date:'2026-10-22'}]);await f.api('note');assert.equal(f.calls.length,2);assert.match(f.calls[0][1].message,/2026-10-20/);assert.match(f.calls[0][1].message,/2026-10-21/);assert.equal(f.selection().size,0)});
test('rejected or deleted penalties have no financial deduction',()=>{const base={employees:[{id:'e',name:'Employee',employmentStatus:'فعال',basicSalary:300}],hrSettings:{},holidays:[],violations:[],bonuses:[],attendance:[],leaves:[],advances:[],selectedMonth:'2026-10'};const salary=status=>calculateSalaries({...base,violations:[{employeeId:'e',date:'2026-10-25',deductionAmount:5,status}]})[0];for(const status of ['مرفوض','محذوف','deleted'])assert.equal(salary(status).totalDeductions,salary('موافق').totalDeductions-5)});
