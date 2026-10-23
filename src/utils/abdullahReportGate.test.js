import test from 'node:test';
import assert from 'node:assert/strict';
import { pendingAbdullahReports, REQUIRED_SUPERVISOR_DATES } from './abdullahReportGate.js';
const complete = date => ({ supervisorId: 'EMP-0006', date, status: 'قيد المراجعة', employeeEvaluations: [{ employeeId: 'worker', rating: 'جيد' }] });
test('all three dates remain required including annual leave day', () => {
  assert.deepEqual(pendingAbdullahReports([], [], []), REQUIRED_SUPERVISOR_DATES);
});
test('submitted evaluations unlock even while awaiting approval', () => {
  assert.deepEqual(pendingAbdullahReports(REQUIRED_SUPERVISOR_DATES.map(complete), [], []), []);
});
test('another supervisor, deleted report or empty evaluations cannot unlock', () => {
  assert.equal(pendingAbdullahReports([{ ...complete('2026-10-01'), supervisorId: 'other' }], [], []).length, 3);
  assert.equal(pendingAbdullahReports([{ ...complete('2026-10-01'), status: 'محذوف' }], [], []).length, 3);
  assert.equal(pendingAbdullahReports([{ ...complete('2026-10-01'), employeeEvaluations: [] }], [], []).length, 3);
});
test('missing evaluation for a submitted team report keeps the date locked', () => {
  const reports = REQUIRED_SUPERVISOR_DATES.map(complete);
  assert.deepEqual(pendingAbdullahReports(reports, [{ date: '2026-10-13', userId: 'second' }], ['worker', 'second']), ['2026-10-13']);
  assert.deepEqual(pendingAbdullahReports(reports, [{ date: '2026-10-13', userId: 'outsider' }], ['worker']), []);
});
