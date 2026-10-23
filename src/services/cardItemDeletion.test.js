import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isUnstartedProduction } from '../utils/productionSafety.js';
const source = readFileSync(new URL('./cardItemDeletion.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export async function', 'async function');
const item = { productName: 'واقي', sizeCm: '120*60', quantity: 2, status: 'لم يتم التنفيذ' };
function harness({ stock = false, changed = false, preparation = false, reorderedFields = false, moved = false, saleItems = null, missingSale = false } = {}) {
  const order = { id: 'card', orderNumber: 'PRO-1', status: 'لم يتم التنفيذ', items: [item, { ...item, sizeCm: '138*67' }] };
  const records = new Map([[`${preparation ? 'preparation_orders' : 'orders'}/card`, { ...order, items: changed ? [] : moved ? [...order.items].reverse() : reorderedFields ? order.items.map(row => Object.fromEntries(Object.entries(row).reverse().concat([['updatedAt', 'later']]))): order.items }]]);
  if (saleItems || missingSale) order.salesOrderId = 'sale';
  if (saleItems && !missingSale) records.set('sales_orders/sale', { items: saleItems });
  const writes = [];
  const collection = (_, name) => name;
  const doc = (...args) => args.length === 1 ? `${args[0]}/archive` : args.slice(1).join('/');
  const runTransaction = async (_, callback) => {
    const result = await callback({
      get: async ref => ({ exists: () => records.has(ref), data: () => records.get(ref) }),
      set: (ref, data) => writes.push([ref, data]),
      update: (ref, data) => writes.push([ref, data])
    });
    return result;
  };
  const remove = new Function('collection', 'doc', 'getDocs', 'query', 'where', 'runTransaction', 'db', 'isAdmin', 'isUnstartedProduction', source + '\nreturn deleteCardItem;')(collection, doc, async () => ({ empty: !stock, docs: stock ? [{ id: 'voucher-1' }] : [] }), (...args) => args, () => null, runTransaction, null, user => user?.role === 'admin', isUnstartedProduction);
  return { order, writes, remove: (actor = { id: 'manager', role: 'admin' }) => remove(order, 0, actor, preparation) };
}
for (const preparation of [false, true]) test(`delete one row and archive it, preparation=${preparation}`, async () => {
  const h = harness({ preparation });
  const result = await h.remove();
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].sizeCm, '138*67');
  assert.equal(h.writes.length, 2);
  assert.equal(h.writes[0][1].item.sizeCm, '120*60');
});
test('non-admin cannot delete', async () => { const h = harness(); await assert.rejects(h.remove({ role: 'employee' })); assert.equal(h.writes.length, 0); });
test('admin deletes stock-linked row without changing stock vouchers', async () => { const h = harness({ stock: true }); const result = await h.remove(); assert.equal(result.items.length, 1); assert.equal(h.writes.length, 2); assert.deepEqual(h.writes[0][1].linkedVoucherIds, ['voucher-1']); assert.equal(h.writes[0][1].stockVouchersPreserved, true); });
test('stale row cannot delete a different item', async () => { const h = harness({ changed: true }); await assert.rejects(h.remove()); assert.equal(h.writes.length, 0); });
test('admin can remove a started item and archive its progress', async () => { const h = harness(); h.order.items[0] = { ...item, status: 'مرحلة الخياطة' }; await h.remove(); assert.equal(h.writes[0][1].item.status, 'مرحلة الخياطة'); assert.equal(h.writes[0][1].adminOverride, true); });

test('field order and movement metadata do not block admin deletion', async () => { const h = harness({ reorderedFields: true }); const result = await h.remove(); assert.equal(result.items.length, 1); assert.equal(h.writes[0][1].item.updatedAt, 'later'); });
test('row moved by concurrent change deletes only matching item', async () => { const h = harness({ moved: true }); const result = await h.remove(); assert.equal(result.items[0].sizeCm, '138*67'); assert.equal(h.writes[0][1].originalIndex, 1); });

for (const preparation of [false, true]) {
 test('unmatched sale row does not block admin deletion, prep=' + preparation, async () => { const original = [{ ...item, productName: 'اسم مختلف' }]; const h = harness({ saleItems: original, preparation }); const result = await h.remove(); assert.equal(result.items.length, 1); assert.equal(h.writes.length, 2); assert.equal(h.writes[0][1].salesSync, 'item-not-uniquely-matched'); assert.ok(h.writes.every(([ref]) => !ref.startsWith('sales_orders/'))); });
 test('ambiguous sale rows remain unchanged, prep=' + preparation, async () => { const h = harness({ saleItems: [{ ...item }, { ...item }], preparation }); await h.remove(); assert.equal(h.writes.length, 2); assert.equal(h.writes[0][1].salesSync, 'item-not-uniquely-matched'); });
 test('unique sale row is reset without changing other rows, prep=' + preparation, async () => { const h = harness({ saleItems: [{ ...item }, { ...item, productName: 'آخر', itemStatus: 'جاهز' }], preparation }); await h.remove(); const sale = h.writes.find(([ref]) => ref === 'sales_orders/sale')[1]; assert.equal(sale.items[0].itemStatus, 'قيد التجهيز'); assert.equal(sale.items[1].itemStatus, 'جاهز'); });
}
test('missing linked sale does not prevent card row deletion', async () => { const h = harness({ missingSale: true }); await h.remove(); assert.equal(h.writes[0][1].salesSync, 'order-missing'); });
