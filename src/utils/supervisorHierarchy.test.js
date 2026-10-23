import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDirectReports, canReviewSubordinateReport } from './supervisorHierarchy.js';

test('assigned supervisors and direct reports are included, peers and self are excluded', () => {
  const manager = { id: 'M', name: 'المدير', assignedEmployees: ['S'] };
  const employees = [manager, { id: 'S', level: 'مشرف' }, { id: 'D', directManager: 'المدير' }, { id: 'P', level: 'مشرف' }, { id: 'admin', directManager: 'المدير' }];
  assert.deepEqual(getDirectReports(manager, employees).map(e => e.id), ['S', 'D']);
  assert.equal(canReviewSubordinateReport(manager, ['S', 'D'], { supervisorId: 'S' }), true);
  assert.equal(canReviewSubordinateReport(manager, ['M', 'S'], { supervisorId: 'M' }), false);
  assert.equal(canReviewSubordinateReport(manager, ['S', 'D'], { supervisorId: 'P' }), false);
});

test('removing assignment removes approval and empty manager names never match', () => {
  assert.deepEqual(getDirectReports({ id: 'M' }, [{ id: 'S', directManager: '' }]), []);
  assert.equal(canReviewSubordinateReport({ id: 'M' }, [], { supervisorId: 'S' }), false);
});

test('assigned employee with administrative access remains reviewable by manager', () => {
  const manager = { id: 'EMP-0025', name: 'عماد', assignedEmployees: ['EMP-0006'] };
  const abdullah = { id: 'EMP-0006', name: 'عبد الله', level: 'إدارة', role: 'admin', directManager: 'عماد' };
  const unrelatedAdmin = { id: 'EMP-0099', level: 'إدارة', role: 'admin' };
  const owner = { id: 'admin', name: 'المدير العام', directManager: 'عماد' };
  const result = getDirectReports(manager, [manager, abdullah, unrelatedAdmin, owner]);
  assert.deepEqual(result.map(employee => employee.id), ['EMP-0006']);
  assert.equal(canReviewSubordinateReport(manager, result.map(employee => employee.id), { supervisorId: 'EMP-0006' }), true);
  assert.equal(abdullah.role, 'admin');
});
