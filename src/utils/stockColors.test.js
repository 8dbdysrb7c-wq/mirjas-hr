import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_STOCK_COLORS, stockColorKey, compareStockColors, stockColorOptions } from './stockColors.js';

test('comparison rejects duplicate spelling without changing saved stock values', () => {
  assert.equal(stockColorKey('أوف وايت'), stockColorKey('اوفوايت'));
  assert.equal(stockColorKey('أخضر'), stockColorKey('اخضر'));
  assert.equal(stockColorKey(' أزرق '), stockColorKey('ازرق'));
  assert.notEqual(stockColorKey('أبيض سادة'), stockColorKey('أبيض سترايب'));
});

test('editing keeps the current specification even if removed from settings', () => {
  assert.deepEqual(stockColorOptions(['أبيض', 'أزرق'], 'ازرق').filter(c => c === 'ازرق'), ['ازرق']);
  assert.equal(stockColorOptions(['أبيض'], 'أبيض').length, 1);
  assert.deepEqual(stockColorOptions(undefined, 'لون قديم'), ['لون قديم']);
});

test('models and packaging codes sort consistently after adding or editing', () => {
  assert.deepEqual(['B10', 'موديل 18 سكني سادة', 'B2', 'أبيض', 'موديل 2 أبيض سترايب'].sort(compareStockColors), ['موديل 2 أبيض سترايب', 'موديل 18 سكني سادة', 'أبيض', 'B2', 'B10']);
});

test('catalog restores the previous list and retains both existing blue spellings', () => {
  assert.equal(DEFAULT_STOCK_COLORS.some(c => /^موديل\s+\d+$/.test(c)), false);
  assert(DEFAULT_STOCK_COLORS.includes('أزرق'));
  assert(DEFAULT_STOCK_COLORS.includes('ازرق'));
  assert(DEFAULT_STOCK_COLORS.includes('اوفوايت'));
  assert.equal(new Set(DEFAULT_STOCK_COLORS).size, DEFAULT_STOCK_COLORS.length);
});
