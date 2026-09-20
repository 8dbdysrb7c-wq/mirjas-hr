import test from 'node:test';
import assert from 'node:assert/strict';
import { employeeLoginKey, normalizeEmployeeId, removePasswordFields, directoryProfile } from './freeAuthIdentity.js';
test('login aliases match the old case-insensitive ID behavior', async () => {
  assert.equal(await employeeLoginKey(' EMP-1 '), await employeeLoginKey('emp-1'));
  assert.notEqual(await employeeLoginKey('emp-1'), await employeeLoginKey('emp-2'));
  assert.throws(() => normalizeEmployeeId(''));
});
test('profiles remove passwords and the employee directory excludes private data', () => {
  const profile = { id: '1', name: 'test', password: 'secret', passwordHash: 'secret', basicSalary: 100, permissions: { view: true } };
  assert.equal(removePasswordFields(profile).password, undefined);
  assert.deepEqual(directoryProfile(profile), { id: '1', name: 'test' });
  assert.equal(profile.password, 'secret');
});
