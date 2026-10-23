import test from 'node:test';
import assert from 'node:assert/strict';
import { requiresDailyReportForCheckout, hasSubmittedCheckoutReport } from './checkoutReportPolicy.js';
const employee = { id: 'login-10', employeeId: 'EMP-0010' };
const date = '2026-10-12';
test('only selected employees require a report, supporting login and employee IDs', () => {
  assert.equal(requiresDailyReportForCheckout([], employee), false);
  assert.equal(requiresDailyReportForCheckout(['EMP-0011'], employee), false);
  assert.equal(requiresDailyReportForCheckout(['login-10'], employee), true);
  assert.equal(requiresDailyReportForCheckout(['EMP-0010'], employee), true);
});
test('a submitted pending report permits checkout without supervisor approval', () => {
  assert.equal(hasSubmittedCheckoutReport([{ userId: 'login-10', date, status: 'معلق' }], employee, date), true);
  assert.equal(hasSubmittedCheckoutReport([{ employeeId: 'EMP-0010', date, status: 'موافق' }], employee, date), true);
});
test('other days and other employees cannot satisfy the requirement', () => {
  assert.equal(hasSubmittedCheckoutReport([{ userId: 'login-10', date: '2026-10-11', status: 'معلق' }], employee, date), false);
  assert.equal(hasSubmittedCheckoutReport([{ userId: 'login-11', date, status: 'معلق' }], employee, date), false);
});
test('drafts and deleted reports do not permit checkout', () => {
  for (const status of ['محذوف', 'deleted', 'مسودة', 'draft']) {
    assert.equal(hasSubmittedCheckoutReport([{ userId: 'login-10', date, status }], employee, date), false);
  }
  assert.equal(hasSubmittedCheckoutReport([], employee, date), false);
});
