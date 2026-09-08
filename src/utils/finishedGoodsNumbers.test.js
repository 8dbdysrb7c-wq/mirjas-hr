import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isFinishedGoodsCategory, finishedGoodsNumber, finishedGoodsSequence, planFinishedGoodsNumbers } from './finishedGoodsNumbers.js';

test('isFinishedGoodsCategory identifies finished goods correctly', () => {
  assert.equal(isFinishedGoodsCategory('بضاعة جاهزة'), true);
  assert.equal(isFinishedGoodsCategory('البضاعة الجاهزة'), true);
  assert.equal(isFinishedGoodsCategory('جاهز'), true);
  assert.equal(isFinishedGoodsCategory('أقمشة'), false);
  assert.equal(isFinishedGoodsCategory('تغليف'), false);
});

test('finishedGoodsNumber generates correct 5-digit format', () => {
  assert.equal(finishedGoodsNumber(1), 'FG-00001');
  assert.equal(finishedGoodsNumber(25), 'FG-00025');
  assert.equal(finishedGoodsNumber(250), 'FG-00250');
});

test('finishedGoodsSequence parses FG codes', () => {
  assert.equal(finishedGoodsSequence('FG-00001'), 1);
  assert.equal(finishedGoodsSequence('FG-00250'), 250);
  assert.equal(finishedGoodsSequence('PKG-00001'), 0);
});

test('planFinishedGoodsNumbers sorts items alphabetically in Arabic', () => {
  const stock = [
    { id: '1', name: 'وجه مخدة', category: 'بضاعة جاهزة', itemNumber: 'FG-00050' },
    { id: '2', name: 'أرضية بوفي', category: 'بضاعة جاهزة', itemNumber: 'FG-00002' },
    { id: '3', name: 'أرضية بوفي', category: 'بضاعة جاهزة', itemNumber: 'FG-00002', warehouse: 'مستودع 2' },
    { id: '4', name: 'بيت لحاف', category: 'بضاعة جاهزة', itemNumber: 'FG-00010' }
  ];

  const plan = planFinishedGoodsNumbers(stock);
  assert.deepEqual(plan.map(r => r.name), ['أرضية بوفي', 'بيت لحاف', 'وجه مخدة']);
  assert.deepEqual(plan.map(r => r.itemNumber), ['FG-00001', 'FG-00002', 'FG-00003']);
  assert.equal(plan[0].documentIds.length, 2);
});
