import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEmployeeDepartment } from './employeeDepartment.js';
const departments = [{ id: 'sewing', name: 'الخياطة' }, { id: 'sales', name: 'المبيعات' }];
test('uses organization assignment even when old field is empty or outdated', () => {
  assert.equal(getEmployeeDepartment({ organizationDepartmentId: 'sewing', department: '', roles: ['الخياطة'] }, departments), 'الخياطة');
  assert.equal(getEmployeeDepartment({ organizationDepartmentId: 'sales', department: 'قديم' }, departments), 'المبيعات');
});
test('resolves legacy departments without displaying permission roles as departments', () => {
  assert.equal(getEmployeeDepartment({ department: 'logistics' }, departments, { logistics: 'اللوجستي' }), 'اللوجستي');
  assert.equal(getEmployeeDepartment({ roles: ['admin', 'المبيعات'] }, departments), 'المبيعات');
  assert.equal(getEmployeeDepartment({ roles: ['admin'] }, departments), '');
  assert.equal(getEmployeeDepartment({ department: 'اللوجستي' }, departments), 'اللوجستي');
});
