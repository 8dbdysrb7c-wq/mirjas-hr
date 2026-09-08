import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSewingConsumablesCategory, sewingConsumablesNumber, sewingConsumablesSequence, planSewingConsumablesNumbers } from './sewingConsumablesNumbers.js';

test('isSewingConsumablesCategory identifies sewing consumables correctly', () => {
  assert.equal(isSewingConsumablesCategory('مستهلكات الخياطة'), true);
  assert.equal(isSewingConsumablesCategory('مستهلكات خياطة'), true);
  assert.equal(isSewingConsumablesCategory('مستهلكات'), true);
  assert.equal(isSewingConsumablesCategory('أقمشة'), false);
  assert.equal(isSewingConsumablesCategory('تغليف'), false);
});

test('sewingConsumablesNumber generates correct 5-digit format', () => {
  assert.equal(sewingConsumablesNumber(1), 'CON-00001');
  assert.equal(sewingConsumablesNumber(122), 'CON-00122');
});

test('sewingConsumablesSequence parses CON codes', () => {
  assert.equal(sewingConsumablesSequence('CON-00001'), 1);
  assert.equal(sewingConsumablesSequence('CON-00122'), 122);
});

test('planSewingConsumablesNumbers sorts items alphabetically in Arabic', () => {
  const stock = [
    { id: '1', name: 'مقص 10 انش', category: 'مستهلكات خياطة', itemNumber: 'CON-00050' },
    { id: '2', name: 'ابرة ماكينة', category: 'مستهلكات خياطة', itemNumber: 'CON-00002' },
    { id: '3', name: 'ابرة ماكينة', category: 'مستهلكات خياطة', itemNumber: 'CON-00002', warehouse: 'مستودع 2' }
  ];

  const plan = planSewingConsumablesNumbers(stock);
  assert.deepEqual(plan.map(r => r.name), ['ابرة ماكينة', 'مقص 10 انش']);
  assert.deepEqual(plan.map(r => r.itemNumber), ['CON-00001', 'CON-00002']);
  assert.equal(plan[0].documentIds.length, 2);
});
