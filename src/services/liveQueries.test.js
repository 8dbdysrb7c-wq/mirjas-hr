import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('./liveQueries.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replaceAll('export async function', 'async function');
function fixture() {
  const queries = [];
  const service = new Function('collection', 'getDocs', 'query', 'where', 'orderBy', 'limit', 'db', source + '\nreturn {getLiveSmokingLogs,getLinkedLiveMissions};')(
    (_, name) => name, async q => { queries.push(q); return { docs: [{ id: '1', data: () => ({ status: 'ok' }) }] }; },
    (...parts) => parts, (...parts) => parts, (...parts) => ['orderBy', ...parts], n => ['limit', n], null);
  return { queries, service };
}
test('smoking reads only today in Amman and caps returned records', async () => {
  const { queries, service } = fixture();
  assert.equal((await service.getLiveSmokingLogs('2026-10-18'))[0].id, '1');
  assert.deepEqual(queries[0], ['smoking_logs', ['timestamp', '>=', '2026-10-17T21:00:00.000Z'], ['timestamp', '<=', '2026-10-18T20:59:59.999Z'], ['orderBy', 'timestamp', 'desc'], ['limit', 25]]);
});
test('delivery check reads missions only for the selected sales order', async () => {
  const { queries, service } = fixture();
  await service.getLinkedLiveMissions('ORD-12');
  assert.deepEqual(queries, [['missions', ['salesOrderNumber', '==', 'ORD-12']]]);
});
