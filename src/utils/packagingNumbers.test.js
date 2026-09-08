import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planPackagingNumbers, packagingSequence, packagingNumber, isPackagingCategory } from './packagingNumbers.js';

test('Arabic alphabetical order, consecutive numbers, same item across locations', () => {
  const rows = [
    { id: '1', name: 'ورق تغليف', category: 'تغليف', itemNumber: 'PKG-00001' },
    { id: '2', name: 'أكياس', category: 'تغليف', itemNumber: 'PKG-00004' },
    { id: '3', name: 'أكياس', category: 'تغليف', itemNumber: 'PKG-00004', warehouse: 'آخر' },
    { id: '4', name: 'تغليف سحاب', category: 'تغليف', itemNumber: 'PKG-00002' }
  ];
  const plan = planPackagingNumbers(rows);
  assert.deepEqual(plan.map(row => row.name), ['أكياس', 'تغليف سحاب', 'ورق تغليف']);
  assert.deepEqual(plan.map(row => row.itemNumber), ['PKG-00001', 'PKG-00002', 'PKG-00003']);
  assert.deepEqual(plan[0].documentIds, ['2', '3']);
});

test('ambiguous old codes and collisions with other categories stop the plan', () => {
  const item = { id: '1', name: 'أكياس', category: 'تغليف', itemNumber: 'PKG-00002' };
  assert.throws(() => planPackagingNumbers([item, { ...item, id: '2', name: 'ورق' }]), /مشترك/);
  assert.throws(() => planPackagingNumbers([item, { id: '3', category: 'كرتون', itemNumber: 'PKG-00001' }]), /خارج/);
  assert.throws(() => planPackagingNumbers([{ ...item, name: '' }]), /دون اسم/);
});

test('future codes use numeric sequence with padding', () => {
  assert.equal(packagingNumber(packagingSequence('PKG-00060') + 1), 'PKG-00061');
  assert.equal(isPackagingCategory('التغليف'), true);
  assert.equal(isPackagingCategory('تغليف'), true);
  assert.equal(packagingSequence('FG-00060'), 0);
});
