import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasDraftItems, mergeDrafts, readLocalDrafts, writeLocalDraft, removeLocalDraft } from './salesDrafts.js';

test('keeps multiple customers and migrates the legacy single draft without losing data', () => {
  let value = JSON.stringify({ id: 'a', updatedAt: '2026-09-20T08:00:00Z', formData: { customerName: 'A', items: [{ productName: "A", quantity: 4 }] } });
  const storage = { getItem: () => value, setItem: (_, next) => { value = next; } };
  writeLocalDraft(storage, 'drafts', { id: 'b', updatedAt: '2026-09-20T09:00:00Z', formData: { customerName: 'B', items: [{ productName: 'B' }] } });
  assert.equal(readLocalDrafts(storage, 'drafts').length, 2);
  assert.equal(readLocalDrafts(storage, 'drafts')[1].formData.items[0].quantity, 4);
  removeLocalDraft(storage, 'drafts', 'b');
  assert.equal(readLocalDrafts(storage, 'drafts')[0].id, 'a');
});

test('a stale cloud save cannot replace more recent local changes', () => {
  const old = { id: 'a', updatedAt: '2026-09-20T08:00:00Z', formData: { items: [{ productName: 'A' }], quantity: 1 } };
  const latest = { ...old, updatedAt: '2026-09-20T09:00:00Z', formData: { items: [{ productName: 'A' }], quantity: 5 } };
  assert.equal(mergeDrafts([latest], [old])[0].formData.quantity, 5);
  assert.equal(mergeDrafts([old], [latest])[0].formData.quantity, 5);
});


test('empty forms and blank product names are never drafts, including legacy entries', () => {
  for (const items of [undefined, [], [{}], [{ productName: '   ', quantity: 5 }]]) {
    const draft = { id: 'empty', formData: { customerName: 'Customer', items } };
    assert.equal(hasDraftItems(draft), false);
    assert.deepEqual(mergeDrafts([draft]), []);
  }
  assert.equal(hasDraftItems({ formData: { items: [{ productName: 'صنف' }] } }), true);
});

test('clearing the last product removes the local draft without touching another customer', () => {
  let value = '[]';
  const storage = { getItem: () => value, setItem: (_, next) => { value = next; } };
  for (const id of ['a', 'b']) writeLocalDraft(storage, 'drafts', { id, updatedAt: '1', formData: { items: [{ productName: id }] } });
  writeLocalDraft(storage, 'drafts', { id: 'a', updatedAt: '2', formData: { items: [] } });
  assert.deepEqual(readLocalDrafts(storage, 'drafts').map(d => d.id), ['b']);
});
