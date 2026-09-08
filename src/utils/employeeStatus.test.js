import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isActiveEmployee } from './employeeStatus.js';
import { calculateSalaries } from './salaryCalculator.js';

test('stopped employment overrides active values in other fields', () => {
  for (const field of ['employmentStatus', 'status', 'employeeStatus']) {
    for (const status of ['غير فعال', 'مستقيل', 'منتهي خدمات', 'موقوف', 'مفصول', 'terminated']) {
      assert.equal(isActiveEmployee({ employmentStatus: 'فعال', [field]: status }), false);
    }
  }
  assert.equal(isActiveEmployee({ employmentStatus: 'فعال', isActive: false }), false);
  assert.equal(isActiveEmployee({ employmentStatus: 'فعال', active: 'false' }), false);
  assert.equal(isActiveEmployee({ employmentStatus: '  غير   فعال ' }), false);
  assert.equal(isActiveEmployee({ employmentStatus: 'فعال' }), true);
  assert.equal(isActiveEmployee({ id: 'legacy' }), true);
});

test('new payroll calculations exclude stopped employees', () => {
  const employees = ['فعال', 'مستقيل', 'منتهي خدمات', 'غير فعال', 'موقوف'].map((employmentStatus, id) => ({
    id: String(id), employmentStatus, basicSalary: 300
  }));
  const salaries = calculateSalaries({
    employees, hrSettings: {}, holidays: [], violations: [], bonuses: [],
    attendance: [], leaves: [], advances: [], selectedMonth: '2026-09'
  });
  assert.deepEqual(salaries.map(employee => employee.id), ['0']);
  assert.equal(employees.length, 5);
});
