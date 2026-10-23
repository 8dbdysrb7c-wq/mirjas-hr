import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, inScope, projectStock, credentialId } from './security.mjs';
test('passwords use salted hashes and invalid credentials are rejected', async () => {
  const a = await hashPassword('example-password');
  const b = await hashPassword('example-password');
  assert.notEqual(a, b);
  assert.equal(await verifyPassword('example-password', a), true);
  assert.equal(await verifyPassword('wrong', a), false);
  assert.equal(await verifyPassword('example-password', undefined), false);
  assert.equal(credentialId(' EMP-1 '), credentialId('emp-1'));
});
test('missing scope identifiers and unauthorized factories are denied', () => {
  assert.equal(inScope({ scope: 'team' }, {}, {}), false);
  assert.equal(inScope({ scope: 'all', warehouses: ['مصنع المخدة'] }, {}, { warehouse: 'مصنع البياضات' }), false);
  assert.equal(inScope({ scope: 'self' }, { employeeId: '1' }, { ownerId: '2' }), false);
  assert.equal(inScope({ scope: 'department' }, { departmentId: '1' }, { departmentId: '1' }), true);
});
test('sensitive and unknown nested stock fields never leak through projection', () => {
  const record = { id: '1', name: 'صنف', quantity: 20, cost: 100, purchasePrice: 80, details: { password: 'secret' }, newSensitiveField: 'secret' };
  assert.deepEqual(projectStock(record, { quantity: true }), { id: '1', name: 'صنف', quantity: 20 });
  assert.equal(projectStock(record, { cost: true }).cost, 100);
});
