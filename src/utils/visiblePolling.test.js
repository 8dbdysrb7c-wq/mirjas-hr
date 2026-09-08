import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startVisiblePolling } from './visiblePolling.js';
import { firestoreErrorMessage } from './firestoreError.js';

test('polling pauses while hidden, never overlaps, and stops on cleanup', async () => {
  const timers = new Map();
  let visibility;
  let calls = 0;
  let finish;
  const document = { hidden: true, addEventListener: (_, fn) => { visibility = fn; }, removeEventListener: () => { visibility = null; } };
  const stop = startVisiblePolling(() => { calls++; return new Promise(resolve => { finish = resolve; }); }, 300000, {
    document, setTimeout: fn => { timers.set(fn, fn); return fn; }, clearTimeout: id => timers.delete(id)
  });
  assert.equal(calls, 0);
  document.hidden = false; visibility(); visibility();
  assert.equal(calls, 1);
  finish(); await Promise.resolve();
  assert.equal(timers.size, 1);
  document.hidden = true; visibility();
  assert.equal(timers.size, 0);
  document.hidden = false; visibility();
  assert.equal(calls, 2);
  stop(); finish(); await Promise.resolve();
  assert.equal(timers.size, 0);
  assert.equal(visibility, null);
});

test('quota, connection and permission errors have distinct explanations', () => {
  assert.match(firestoreErrorMessage({ code: 'resource-exhausted' }), /حصة الاستخدام/);
  assert.match(firestoreErrorMessage({ message: 'Quota exceeded.' }), /حصة الاستخدام/);
  assert.match(firestoreErrorMessage({ code: 'unavailable' }), /تعذر تأكيد/);
  assert.match(firestoreErrorMessage({ code: 'permission-denied' }), /صلاحية/);
});
