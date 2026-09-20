import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule } from 'node:vm';

async function fixture() {
  const data = {
    hr_leaves: [
      { id: 'pending-old', status: 'معلق', date: '2026-01-01' },
      { id: 'approved-month', status: 'موافق', date: '2026-09-10' },
      { id: 'spanning', status: 'موافق', startDate: '2026-08-20', endDate: '2026-09-25' },
      { id: 'old', status: 'موافق', date: '2026-01-01' },
    ],
    missing_punches: [
      { id: 'resolved', status: 'موافق عليه', date: '2026-09-10' },
      { id: 'pending', status: 'قيد المراجعة', date: '2026-01-01' },
      { id: 'old', status: 'موافق عليه', date: '2026-01-01' },
    ],
    hr_violations: [{ id: 'resolved', status: 'موافق', date: '2026-09-10' }, { id: 'pending', status: 'معلق', date: '2026-01-01' }],
    hr_bonuses: [{ id: 'pending', status: 'معلق' }, { id: 'approved', status: 'موافق' }],
    hr_advances: [{ status: 'معلق' }, { status: 'موافق' }],
    hr_assets: [{ status: 'نشطة' }, { status: 'مستلمة' }],
    employee_alerts: [{ id: 'pending', status: 'pending' }, { id: 'resolved', status: 'resolved' }],
  };
  const documentReads = [], aggregateReads = [];
  const firestore = {
    collection: (_, name) => name,
    where: (field, op, value) => row => {
      if (row[field] === undefined) return false;
      if (op === '==') return row[field] === value;
      if (op === 'in') return value.includes(row[field]);
      return op === '>=' ? row[field] >= value : row[field] <= value;
    },
    and: (...filters) => row => filters.every(f => f(row)),
    or: (...filters) => row => filters.some(f => f(row)),
    query: (name, filter) => ({ name, filter }),
    getDocs: async ({ name, filter }) => {
      documentReads.push(name);
      return { docs: data[name].filter(filter).map(row => ({ id: row.id, data: () => row })) };
    },
    getCountFromServer: async ({ name, filter }) => {
      aggregateReads.push(name);
      return { data: () => ({ count: data[name].filter(filter).length }) };
    },
  };
  const module = new SourceTextModule(await readFile(new URL('./hrBadgeData.js', import.meta.url), 'utf8'));
  await module.link(name => {
    const exports = name === 'firebase/firestore' ? firestore : { db: {} };
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    });
  });
  await module.evaluate();
  return { load: module.namespace.getHRBadgeData, documentReads, aggregateReads };
}

test('attendance counters retain approved and spanning leave and resolved punches without old history', async () => {
  const f = await fixture();
  const result = await f.load('2026-09-01', '2026-09-19', true);
  assert.deepEqual(result.leaves.map(r => r.id), ['pending-old', 'approved-month', 'spanning']);
  assert.deepEqual(result.mps.map(r => r.id), ['resolved', 'pending']);
  assert.deepEqual(result.violations.map(r => r.id), ['resolved', 'pending']);
  assert.equal(result.assets, 1);
  assert.equal(result.advances, 1);
  assert.deepEqual(f.aggregateReads, ['hr_advances', 'hr_assets']);
  assert.ok(!f.documentReads.includes('hr_assets') && !f.documentReads.includes('hr_advances'));
});

test('lightweight refresh only fetches pending requests and no historical approval records', async () => {
  const f = await fixture();
  const result = await f.load('2026-09-01', '2026-09-19', false);
  assert.deepEqual(result.leaves.map(r => r.id), ['pending-old']);
  for (const key of ['mps', 'violations', 'bonuses', 'employeeAlerts']) assert.deepEqual(result[key].map(r => r.id), ['pending']);
});
