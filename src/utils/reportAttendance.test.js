import test from 'node:test';
import assert from 'node:assert/strict';
import { reportAttendanceFields } from './reportAttendance.js';
test('report can remain pending checkout without fabricated hours', () => {
  assert.deepEqual(reportAttendanceFields({}, { timeIn: '08:00' }), { timeIn: '08:00', timeOut: '', actualHours: null, attendancePending: true });
});
test('checkout fills actual punch and hours and preserves task and approval fields', () => {
  const report = { timeIn: '08:00', status: 'معلق', tasks: [{ name: 'task' }], breakTimeFrom: '12:00', breakTimeTo: '12:30' };
  const fields = reportAttendanceFields(report, { timeIn: '08:00', timeOut: '17:00' });
  assert.equal(fields.actualHours, 8.5);
  assert.equal(fields.timeOut, '17:00');
  assert.equal(fields.attendancePending, false);
  assert.equal({ ...report, ...fields }.status, 'معلق');
  assert.deepEqual({ ...report, ...fields }.tasks, report.tasks);
});
test('overnight checkout and AM PM punches calculate correctly', () => {
  assert.equal(reportAttendanceFields({}, { timeIn: '22:00', timeOut: '06:00' }).actualHours, 8);
  assert.equal(reportAttendanceFields({}, { timeIn: '7:27 AM', timeOut: '6:00 PM' }).actualHours, 10.55);
});
