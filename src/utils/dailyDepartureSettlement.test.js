import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyDepartureSettlement} from './dailyDepartureSettlement.js';
import {calculateSalaries} from './salaryCalculator.js';
const departure={employeeId:'e',date:'2026-10-25',type:'مغادرة خاصة',status:'موافق',startTime:'07:30',endTime:'10:00',keepAsDepartureOnly:true,calculationMode:'departure_only'};
const attendance={employeeId:'e',date:'2026-10-25',timeIn:'09:54',timeOut:'18:33',status:'مداوم',lateMinutes:114};
const settle=leaves=>dailyDepartureSettlement({employeeId:'e',date:'2026-10-25',attendance,leaves});
test('Sultan: clip 30 minutes outside shift and count 114-minute overlap once',()=>assert.deepEqual(settle([departure]),{lateMins:0,earlyMins:0,departureMins:120,deficitMins:120}));
test('overlapping departures are unioned and rejected requests ignored',()=>{assert.equal(settle([departure,{...departure,startTime:'09:00',endTime:'10:30'}]).deficitMins,150);assert.equal(settle([{...departure,status:'مرفوض'}]).deficitMins,114)});
test('vacation-covered departure creates no second financial deficit',()=>assert.equal(settle([{...departure,deductFromVacationBalance:true}]).deficitMins,0));
const salary=(details)=>calculateSalaries({employees:[{id:'e',name:'Sultan',employmentStatus:'فعال',basicSalary:350,shiftStart:'08:00',shiftEnd:'16:00'}],hrSettings:{latenessHandling:'financial_deduction'},holidays:[],violations:[],bonuses:[],attendance:[attendance],leaves:[departure,...(details?[{employeeId:'e',date:'2026-10-25',type:'بدل عمل إضافي',status:'موافق',startTime:'16:30',endTime:'18:34',rateDetails:details}]:[])],advances:[],selectedMonth:'2026-10'})[0];
test('payroll: full overtime retains one 120-minute charge; waiver and split clear it',()=>{assert.ok(Math.abs(salary().lateDeduction-350/31/8*2)<1e-8);assert.equal(salary({compMins:120,extraMins:4,lateCoveredMins:0,departureCoveredMins:120}).lateDeduction,0);assert.equal(salary({compMins:0,extraMins:124,lateCoveredMins:0,departureCoveredMins:120,waiveDeficit:true}).lateDeduction,0);assert.ok(Math.abs(salary({compMins:0,extraMins:124,lateCoveredMins:0,departureCoveredMins:0}).lateDeduction-350/31/8*2)<1e-8)});

test('night shift keeps valid lateness across midnight',()=>assert.equal(dailyDepartureSettlement({attendance:{timeIn:'22:30',timeOut:'06:00'},shiftStart:'22:00',shiftEnd:'06:00',date:'2026-10-25',employeeId:'e'}).lateMins,30));

test('corrected Sultan shift at 07:30: 144-minute punch deficit overlaps 150-minute leave',()=>assert.deepEqual(dailyDepartureSettlement({employeeId:'e',date:'2026-10-25',attendance,leaves:[departure],shiftStart:'07:30',shiftEnd:'16:00'}),{lateMins:0,earlyMins:0,departureMins:150,deficitMins:150}));

test('07:30 shift: settling 124 overtime minutes leaves 26 departure minutes, without another lateness deduction',()=>{
const result=calculateSalaries({employees:[{id:'e',name:'Sultan',employmentStatus:'فعال',basicSalary:350,shiftStart:'07:30',shiftEnd:'16:00'}],hrSettings:{latenessHandling:'financial_deduction'},holidays:[],violations:[],bonuses:[],attendance:[{...attendance,lateMinutes:144}],leaves:[departure,{employeeId:'e',date:'2026-10-25',type:'بدل عمل إضافي',status:'موافق',startTime:'16:30',endTime:'18:34',rateDetails:{compMins:124,extraMins:0,lateCoveredMins:0,earlyCoveredMins:0,departureCoveredMins:124}}],advances:[],selectedMonth:'2026-10'})[0];
assert.ok(Math.abs(result.lateDeduction-26/60*(350/31/8.5))<1e-8);
});
