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

test('evaluateAccessPolicy correctly evaluates section and screen level permissions', async () => {
  const { evaluateAccessPolicy, syncLegacyPermissionsFromPolicy } = await import('./accessPolicy.js');
  const { hasPermission } = await import('./permissions.js');

  let policy = createAccessDraft({ id: 'emp1' }, false);
  policy = setAccessMode(policy, 'inventory', 'hidden');
  policy = setAccessMode(policy, 'sales', 'use');

  // Hidden section
  assert.equal(evaluateAccessPolicy(policy, 'stock', 'view'), false);
  assert.equal(evaluateAccessPolicy(policy, 'inventory', 'view'), false);
  assert.equal(evaluateAccessPolicy(policy, 'stock_view', 'view'), false);

  // 'use' section
  assert.equal(evaluateAccessPolicy(policy, 'sales', 'view'), true);
  assert.equal(evaluateAccessPolicy(policy, 'orders', 'view'), true);
  assert.equal(evaluateAccessPolicy(policy, 'orders', 'create'), true);
  assert.equal(evaluateAccessPolicy(policy, 'orders', 'add'), true);
  assert.equal(evaluateAccessPolicy(policy, 'orders', 'delete'), false);

  // Integration via hasPermission
  const employee = { id: 'emp1', role: 'employee', accessPolicy: policy };
  assert.equal(hasPermission(employee, 'stock'), false);
  assert.equal(hasPermission(employee, 'stock_view'), false);
  assert.equal(hasPermission(employee, 'orders', 'view'), true);
  assert.equal(hasPermission(employee, 'orders', 'delete'), false);

  // Synchronization to legacy flags
  const synced = syncLegacyPermissionsFromPolicy(policy);
  assert.equal(synced.hasStockAccess, false);
  assert.equal(synced.hasSalesAccess, true);
  assert.equal(synced.permissions.orders.view, true);
  assert.equal(synced.permissions.orders.add, true);
  assert.equal(synced.permissions.orders.delete, false);
});
