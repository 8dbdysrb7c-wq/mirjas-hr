import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule } from 'node:vm';
import * as numbers from '../utils/packagingNumbers.js';
import * as finishedGoodsNumbers from '../utils/finishedGoodsNumbers.js';
import * as sewingConsumablesNumbers from '../utils/sewingConsumablesNumbers.js';

test('simultaneous new packaging items reserve different numbers; copies retain identity', async () => {
  const state = new Map([['stock_sequences/PKG', { lastNumber: 60 }]]);
  let serial = Promise.resolve();
  let nextId = 0;
  const snapshot = ref => ({ exists: () => state.has(ref.path), data: () => state.get(ref.path) });
  const firestore = {
    collection: (_, path) => ({ path }),
    doc: (base, name, id) => ({ path: base.path ? `${base.path}/new${++nextId}` : `${name}/${id}`, id: id || `new${nextId}` }),
    getDoc: async ref => snapshot(ref), getDocs: async () => ({ docs: [] }),
    query: () => {}, where: () => {}, setDoc: () => {}, deleteDoc: () => {},
    runTransaction: (_, operation) => {
      const result = serial.then(() => operation({ get: async ref => snapshot(ref), set: (ref, data) => state.set(ref.path, data) }));
      serial = result.catch(() => {});
      return result;
    }
  };
  const dependencies = {
    '../firebase': { db: {} },
    'firebase/firestore': firestore,
    './cascadeUpdates': { cascadeStockItemUpdate: () => {} },
    '../utils/packagingNumbers': numbers,
    '../utils/finishedGoodsNumbers': finishedGoodsNumbers,
    '../utils/sewingConsumablesNumbers': sewingConsumablesNumbers
  };
  const module = new SourceTextModule(await readFile(new URL('./stock.js', import.meta.url), 'utf8'));
  await module.link(specifier => {
    const exports = dependencies[specifier];
    return new SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); });
  });
  await module.evaluate();
  const save = module.namespace.saveStockItem;
  const [first, second] = await Promise.all([
    save({ name: 'أكياس جديدة', category: 'تغليف', itemNumber: 'PKG-00061' }),
    save({ name: 'ورق جديد', category: 'تغليف', itemNumber: 'PKG-00061' })
  ]);
  assert.equal(first.itemNumber, 'PKG-00061');
  assert.equal(second.itemNumber, 'PKG-00062');
  const copy = await save({ name: first.name, category: 'تغليف', warehouse: 'آخر' }, { sourceItemId: first.id });
  assert.equal(copy.itemNumber, first.itemNumber);
  const edited = await save({ ...first, itemNumber: 'PKG-00001', quantity: 12 });
  assert.equal(edited.itemNumber, first.itemNumber, 'stale browser must not replace canonical number');
  assert.equal(state.get('stock_sequences/PKG').lastNumber, 62);
});
