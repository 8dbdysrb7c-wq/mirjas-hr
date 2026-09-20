import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldArchiveStockVoucher, isStockVoucherInHistory } from './stockVoucherHistory.js';

test('only input, output and transfer history is selected; damage and adjustment remain', () => {
  for (const type of ['إدخال', 'إخراج', 'تحويل']) assert.equal(shouldArchiveStockVoucher({ type }), true);
  for (const type of ['إتلاف', 'تسوية', 'خصم', '', undefined]) assert.equal(shouldArchiveStockVoucher({ type }), false);
});
test('archive is idempotent and does not change voucher quantities or ledger references', () => {
  const record = { type: 'إخراج', status: 'معتمد', orderNumber: 'ORDER-1', items: [{ stockId: 'stock-1', quantity: 20 }], historyArchivedAt: '2026-09-09T17:00:00Z' };
  const before = structuredClone(record);
  assert.equal(shouldArchiveStockVoucher(record), false);
  assert.equal(isStockVoucherInHistory(record), false);
  assert.deepEqual(record, before);
  const ledger = [record].filter(v => v.orderNumber === 'ORDER-1' && v.status === 'معتمد');
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].items[0].quantity, 20);
});
test('newly created vouchers remain visible after the historical archive', () => {
  assert.equal(isStockVoucherInHistory({ type: 'إدخال', items: [{ quantity: 5 }] }), true);
});
