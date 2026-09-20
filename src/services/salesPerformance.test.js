import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule } from 'node:vm';
import * as availability from '../utils/stockAvailability.js';

async function fixture() {
  const state = new Map([
    ['stock/a', { name: 'A', quantity: 10 }],
    ['stock/b', { name: 'B', quantity: 10 }],
    ['sales_orders/old', { orderNumber: 'ORD-0009', items: [{ productName: 'A', quantity: 3, itemStatus: 'جاهز' }] }]
  ]);
  const reads = [];
  let active = 0, peak = 0, id = 0;
  const snapshot = ref => ({ id: ref.id, exists: () => state.has(ref.path), data: () => state.get(ref.path) });
  const firestore = {
    collection: (_, path) => ({ path }),
    doc: (base, name, key) => base.path
      ? { path: `${base.path}/new${++id}`, id: `new${id}` }
      : { path: `${name}/${key}`, id: key },
    getDocs: async ref => {
      reads.push(ref.path);
      return { docs: [...state].filter(([path]) => path.startsWith(`${ref.path}/`)).map(([path, data]) => ({ id: path.split('/')[1], data: () => data })) };
    },
    getDoc: async ref => snapshot(ref),
    setDoc: () => {}, deleteDoc: () => {}, query: (ref) => ref || {}, where: () => {}, orderBy: () => {}, limit: () => {}, onSnapshot: () => {},
    runTransaction: async (_, operation) => {
      const writes = [];
      await operation({
        get: async ref => {
          active++; peak = Math.max(peak, active);
          await new Promise(resolve => setTimeout(resolve, 5));
          active--; return snapshot(ref);
        },
        set: (ref, data) => { assert.equal(active, 0, 'all reads finish before writes'); writes.push([ref.path, data]); }
      });
      writes.forEach(([path, data]) => state.set(path, data));
    }
  };
  const dependencies = {
    '../firebase': { db: {} }, 'firebase/firestore': firestore,
    './cascadeUpdates': { cascadeCustomerNameUpdate: () => {} },
    './whatsappRouter': { triggerWhatsAppRouting: () => {} },
    '../utils/stockAvailability': availability
  };
  const module = new SourceTextModule(await readFile(new URL('./sales.js', import.meta.url), 'utf8'));
  await module.link(specifier => {
    const values = dependencies[specifier];
    return new SyntheticModule(Object.keys(values), function () {
      for (const [key, value] of Object.entries(values)) this.setExport(key, value);
    });
  });
  await module.evaluate();
  return { save: module.namespace.saveSalesOrder, state, reads, peak: () => peak };
}

test('new order reads each collection once, overlaps reservation reads and preserves stock', async () => {
  const f = await fixture();
  const saved = await f.save({ items: ['A', 'B'].map(productName => ({ productName, quantity: 2, itemStatus: 'جاهز' })) });
  assert.equal(saved.orderNumber, 'ORD-0010');
  assert.deepEqual(f.reads, ['sales_orders', 'stock']);
  assert.equal(f.peak(), 2);
  assert.equal(f.state.get('stock_reservations/A').quantity, 5);
  assert.equal(f.state.get('stock_reservations/B').quantity, 2);
  assert.equal(f.state.get('stock/a').quantity, 10);
  assert.equal(f.state.get('stock/b').quantity, 10);
});

test('overbooking is rejected atomically with no stock or reservation changes', async () => {
  const f = await fixture();
  const before = JSON.stringify([...f.state]);
  const saved = await f.save({ items: [{ productName: 'A', quantity: 8, itemStatus: 'جاهز' }] });
  assert.equal(saved, null);
  assert.equal(JSON.stringify([...f.state]), before);
});

test('editing and cancellation adjust only this order reservation', async () => {
  const f = await fixture();
  f.state.set('stock_reservations/A', { quantity: 6 });
  const edited = await f.save({ id: 'old', orderNumber: 'ORD-0009', items: [{ productName: 'A', quantity: 5, itemStatus: 'جاهز' }] });
  assert.ok(edited);
  assert.equal(f.state.get('stock_reservations/A').quantity, 8);
  await f.save({ ...edited, status: 'ملغي' });
  assert.equal(f.state.get('stock_reservations/A').quantity, 3);
  assert.equal(f.state.get('stock/a').quantity, 10);
});

test('order with more than 30 items chunks stock queries in batches of 30', async () => {
  const f = await fixture();
  for (let i = 1; i <= 35; i++) {
    f.state.set(`stock/item${i}`, { name: `Item_${i}`, quantity: 50 });
  }
  const items = [];
  for (let i = 1; i <= 35; i++) {
    items.push({ productName: `Item_${i}`, quantity: 1, itemStatus: 'جاهز' });
  }
  const saved = await f.save({ items });
  assert.ok(saved);
  const stockReads = f.reads.filter(r => r === 'stock');
  assert.equal(stockReads.length, 2);
  assert.equal(f.state.get('stock_reservations/Item_35').quantity, 1);
});

