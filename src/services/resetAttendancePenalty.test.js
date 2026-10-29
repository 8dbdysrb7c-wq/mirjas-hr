import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateSalaries} from '../utils/salaryCalculator.js';
const source=readFileSync(new URL('./hr.js',import.meta.url),'utf8');
const body=source.slice(source.indexOf('export const resetAttendancePenalty'),source.indexOf('export const saveHRViolation')).replace('export const ','const ');
function fixture({locked=false, allowed=true}={}) {
 const rows=new Map([['v1',{employeeId:'e',date:'2026-10-25',type:'تأخير',action:'خصم مالي',deductionAmount:5}],['v2',{employeeId:'other',date:'2026-10-25',type:'تأخير',action:'خصم مالي',deductionAmount:9}]]);let writes=0;
 const snap=(id,ref=id)=>({id,ref,exists:()=>rows.has(id),data:()=>rows.get(id)});
 const api=new Function('hasPermission','getDocsFromServer','collection','db','query','where','getGlobalSettings','runTransaction','doc',body+';return resetAttendancePenalty;')(()=>allowed,async q=>q==='hr_salary_periods'?{docs:locked?[{id:'2026-10',data:()=>({status:'locked'})}]:[]}:{docs:[snap('v1'),snap('v2')]},(_,c)=>c,{},(...a)=>a,(...a)=>a,async()=>({hrSettings:{}}),async(_,fn)=>{const queue=[];const result=await fn({get:async ref=>snap(ref),update:(ref,data)=>queue.push(()=>{rows.set(ref,{...rows.get(ref),...data});writes++}),set:()=>queue.push(()=>writes++)});queue.forEach(f=>f());return result;},(_,c,id)=>id||'audit');
 return {api,rows,writes:()=>writes};
}
const target={employeeId:'e',employeeName:'Employee',date:'2026-10-25',type:'تأخير'};const user={id:'admin',name:'admin'};
test('reset clears only the target deduction, audits once and is repeat safe',async()=>{const f=fixture();await f.api(target,user);assert.equal(f.rows.get('v1').deductionAmount,0);assert.equal(f.rows.get('v1').action,'معلق');assert.equal(f.rows.get('v2').deductionAmount,9);assert.equal(f.writes(),2);await f.api(target,user);assert.equal(f.writes(),2)});
test('locked payroll and unauthorized users never write',async()=>{for(const opts of [{locked:true},{allowed:false}]){const f=fixture(opts);await assert.rejects(f.api(target,user));assert.equal(f.writes(),0)}});
test('payroll removes exactly the reversed financial penalty',()=>{
 const input={employees:[{id:'e',name:'Employee',employmentStatus:'فعال',basicSalary:300}],hrSettings:{},holidays:[],violations:[{employeeId:'e',date:'2026-10-25',type:'تأخير',deductionAmount:5},{employeeId:'e',date:'2026-10-25',type:'أخرى',deductionAmount:7}],bonuses:[],attendance:[],leaves:[],advances:[],selectedMonth:'2026-10'};
 const before=calculateSalaries(input)[0];input.violations[0]={...input.violations[0],action:'معلق',deductionAmount:0};const after=calculateSalaries(input)[0];assert.equal(before.totalDeductions-after.totalDeductions,5);assert.equal(after.netSalary-before.netSalary,5);
});
