import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveOvertimeAttendance } from './overtimeAttendance.js';
import { getOfficialAbsenceMinutes } from './attendancePolicy.js';
const leave = { employeeId: 'EMP-0006', date: '2026-10-10' };
const employee = { id: 'login-id', employeeId: 'EMP-0006' };
const stale = { employeeId: 'login-id', date: leave.date, timeIn: '08:14', timeOut: '', attendanceSource: 'hr_attendance' };
const complete = { employeeId: 'EMP-0006', date: leave.date, timeIn: '08:26', timeOut: '17:25', attendanceSource: 'attendance_logs' };
test('complete punches replace a stale partial HR record regardless of source order', () => {
  for (const records of [[stale, complete], [complete, stale]]) {
    const attendance = resolveOvertimeAttendance(records, leave, employee);
    assert.equal(attendance.timeIn, '08:26');
    assert.equal(attendance.timeOut, '17:25');
    const deficit = getOfficialAbsenceMinutes({ ...attendance, shiftStart: '08:00', shiftEnd: '17:00' });
    assert.equal(deficit, 26);
    assert.equal(170 - deficit, 144);
  }
});
test('ignores other employees, other dates, deleted and leave records', () => {
  const invalid = [
    { ...complete, employeeId: 'EMP-0007' }, { ...complete, date: '2026-10-11' },
    { ...complete, status: 'محذوف' }, { ...complete, isLeave: true }
  ];
  assert.equal(resolveOvertimeAttendance(invalid, leave, employee), null);
});
test('fills missing checkout from another matching source and supports startDate', () => {
  const attendance = resolveOvertimeAttendance([stale, { ...complete, timeIn: '', timeOut: '5:25 PM' }], { employeeId: leave.employeeId, startDate: leave.date }, employee);
  assert.equal(attendance.timeIn, '08:14');
  assert.equal(attendance.timeOut, '5:25 PM');
});
test('a complete HR correction takes priority over a complete fingerprint record', () => {
  assert.equal(resolveOvertimeAttendance([{ ...stale, timeOut: '18:00' }, complete], leave, employee).timeIn, '08:14');
});
