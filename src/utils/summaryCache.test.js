import test from 'node:test';
import assert from 'node:assert/strict';
import { readSummary } from './summaryCache.js';
test('summary shares in-flight reads and cached results, force refreshes', async () => {
  let calls = 0, clock = 1;
  const load = async () => ++calls;
  const options = { now: () => clock, ttl: 100 };
  assert.deepEqual(await Promise.all([readSummary('test', load, options), readSummary('test', load, options)]), [1, 1]);
  assert.equal(await readSummary('test', load, options), 1);
  assert.equal(await readSummary('test', load, { ...options, force: true }), 2);
  clock = 102;
  assert.equal(await readSummary('test', load, options), 3);
});
test('failed summary is not cached and keys isolate accounts', async () => {
  await assert.rejects(readSummary('failed', async () => { throw Error('quota'); }));
  assert.equal(await readSummary('failed', async () => 'recovered'), 'recovered');
  assert.equal(await readSummary('other-account', async () => 'other'), 'other');
});
