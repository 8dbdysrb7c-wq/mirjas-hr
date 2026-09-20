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
