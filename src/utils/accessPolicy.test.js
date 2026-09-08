import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccessDraft, evaluateDraft, setAccessMode, describeDraftChanges } from './accessPolicy.js';

test('draft migration preserves legacy checks without changing the employee', () => {
  const employee = { id: 'test', hasStockAccess: true };
  const before = structuredClone(employee);
  const policy = createAccessDraft(employee);
  assert.equal(evaluateDraft(policy, 'inventory', 'stock_view', 'view'), true);
  assert.deepEqual(employee, before);
  assert.equal(policy.status, 'draft');
  assert.equal(policy.sections.inventory.fields.cost, false);
});
test('hidden and read-only modes cannot grant mutation access', () => {
  let policy = createAccessDraft({ id: 'test' }, false);
  assert.equal(evaluateDraft(policy, 'inventory', 'stock_view', 'view'), false);
  policy = setAccessMode(policy, 'inventory', 'view');
  assert.equal(evaluateDraft(policy, 'inventory', 'stock_view', 'view'), true);
  assert.equal(evaluateDraft(policy, 'inventory', 'stock_view', 'edit'), false);
  assert.equal(evaluateDraft(policy, 'inventory', 'nonexistent', 'view'), false);
});
test('expired, invalid, and exact-boundary expiry denies access', () => {
  const policy = setAccessMode(createAccessDraft({ id: 'test' }, false), 'inventory', 'use');
  const expires = '2026-09-15T12:00:00Z';
  policy.sections.inventory.expiresAt = expires;
  assert.equal(evaluateDraft(policy, 'inventory', 'stock_view', 'view', Date.parse(expires) - 1), true);
  assert.equal(evaluateDraft(policy, 'inventory', 'stock_view', 'view', Date.parse(expires)), false);
  policy.sections.inventory.expiresAt = 'invalid';
  assert.equal(evaluateDraft(policy, 'inventory', 'stock_view', 'view'), false);
});
test('an allowed action cannot bypass a denied screen', () => {
  const policy = setAccessMode(createAccessDraft({ id: 'test' }, false), 'inventory', 'use');
  policy.sections.inventory.screens.stock_view.view = false;
  assert.equal(evaluateDraft(policy, 'inventory', 'stock_view', 'edit'), false);
});
test('preset restrictions cannot be bypassed by inconsistent action flags', () => {
  const policy = setAccessMode(createAccessDraft({ id: 'test' }, false), 'inventory', 'view');
  policy.sections.inventory.screens.stock_view.delete = true;
  assert.equal(evaluateDraft(policy, 'inventory', 'stock_view', 'delete'), false);
  policy.sections.inventory.mode = 'unknown';
  assert.equal(evaluateDraft(policy, 'inventory', 'stock_view', 'view'), false);
});
test('change history records additions, removals and before/after values', () => {
  assert.deepEqual(describeDraftChanges({ a: true, b: 1 }, { a: false, c: 2 }), [
    { key: 'a', before: true, after: false }, { key: 'b', before: 1, after: null }, { key: 'c', before: null, after: 2 },
  ]);
});
