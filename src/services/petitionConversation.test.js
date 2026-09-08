import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule } from 'node:vm';
import { petitionTransition } from '../utils/petitionConversation.js';

// Exercise the real service with an isolated transactional store, never production.
async function fixture({ notification = {}, fail = false } = {}) {
  let row = { employeeId: 'employee', title: 'طلب', status: 'معلق', messages: [] };
  let writes = 0, reads = 0, notices = 0;
  const firestore = {
    collection: (_, name) => ({ collection: name }),
    doc: (_, name, id) => ({ id: id || name || 'generated' }),
    query: source => source, where: () => {}, onSnapshot: () => () => {},
    runTransaction: async (_, callback) => {
      reads++;
      if (fail) throw Object.assign(new Error('Quota exceeded.'), { code: 'resource-exhausted' });
      let changes;
      const result = await callback({ get: async () => ({ exists: () => true, data: () => structuredClone(row) }), update: (_, value) => { changes = value; } });
      if (changes) { row = { ...row, ...changes }; writes++; }
      return result;
    }
  };
  const dependencies = {
    'firebase/firestore': firestore, '../firebase': { db: {} },
    '../utils/permissions': { hasPermission: user => user.id === 'admin' },
    '../utils/petitionConversation': { petitionTransition },
    './settings': { createNotification: async () => { notices++; if (notification instanceof Error) throw notification; return notification; } }
  };
  const source = await readFile(new URL('./petitionConversation.js', import.meta.url), 'utf8');
  const module = new SourceTextModule(source);
  await module.link(specifier => {
    const exports = dependencies[specifier];
    assert.ok(exports, specifier);
    return new SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); });
  });
  await module.evaluate();
  return { service: module.namespace, state: () => ({ row, writes, reads, notices }) };
}
const admin = { id: 'admin', name: 'الإدارة' };

test('close commits resolution and reply atomically, retry does not duplicate', async () => {
  const { service, state } = await fixture();
  const result = await service.sendPetitionMessage('p', admin, 'close', 'تم الحل', true, 'request-1');
  assert.equal(result.petition.conversationStatus, 'مغلق');
  assert.equal(state().row.resolution, 'تم الحل');
  assert.equal(state().row.messages.length, 1);
  await service.sendPetitionMessage('p', admin, 'close', 'تم الحل', true, 'request-1');
  assert.equal(state().writes, 1);
  assert.equal(state().notices, 1);
  await service.markPetitionRead('p', admin, true, result.petition);
  assert.equal(state().reads, 2, 'own message must not trigger another read transaction');
});

test('quota failure changes neither the request nor notifications', async () => {
  const { service, state } = await fixture({ fail: true });
  await assert.rejects(service.sendPetitionMessage('p', admin, 'close', 'تم', true, 'r'), { code: 'resource-exhausted' });
  assert.equal(state().writes, 0);
  assert.equal(state().notices, 0);
  assert.equal(state().row.messages.length, 0);
});

test('null or thrown notification failure does not turn saved closure into failure', async () => {
  for (const notification of [null, new Error('notification unavailable')]) {
    const { service, state } = await fixture({ notification });
    const result = await service.sendPetitionMessage('p', admin, 'close', 'تم', true, 'r');
    assert.equal(result.notificationFailed, true);
    assert.equal(state().row.conversationStatus, 'مغلق');
    assert.equal(state().writes, 1);
  }
});

test('employee cannot close and another employee cannot reply', async () => {
  const { service, state } = await fixture();
  await assert.rejects(service.sendPetitionMessage('p', { id: 'employee' }, 'close', 'تم', false, 'r'));
  await assert.rejects(service.sendPetitionMessage('p', { id: 'other' }, 'reply', 'رد', false, 'r'));
  assert.equal(state().writes, 0);
});
