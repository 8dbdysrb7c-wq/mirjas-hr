import test from 'node:test';
import assert from 'node:assert/strict';
import { isActiveHREmployee, isActiveEmployee, belongsToHREmployees } from './employeeStatus.js';

test('HR requires explicit active status and respects stop flags', () => {
  assert.equal(isActiveHREmployee({ employmentStatus: 'فعال' }), true);
  assert.equal(isActiveHREmployee({ employmentStatus: 'فعّال' }), true);
  for (const employmentStatus of [undefined, '', 'موقوف', 'مستقيل', 'منتهي خدمات', 'غير فعال']) {
    assert.equal(isActiveHREmployee({ employmentStatus }), false);
  }
  assert.equal(isActiveHREmployee({ employmentStatus: 'فعال', isActive: false }), false);
  assert.equal(isActiveEmployee({}), true);
});

test('HR rows exclude inactive employees and never match a conflicting ID by name', () => {
  const employees = [{ id: '1', name: 'مشترك', employmentStatus: 'فعال' }, { id: '2', name: 'مشترك', employmentStatus: 'مستقيل' }].filter(isActiveHREmployee);
  assert.equal(belongsToHREmployees({ employeeId: 1 }, employees), true);
  assert.equal(belongsToHREmployees({ employeeId: 2, employeeName: 'مشترك' }, employees), false);
  assert.equal(belongsToHREmployees({ employeeName: 'مشترك' }, employees), true);
  assert.equal(belongsToHREmployees({}, employees), false);
});
