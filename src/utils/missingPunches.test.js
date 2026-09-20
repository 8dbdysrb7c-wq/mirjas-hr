import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getMissingPunches } from './missingPunches.js';

test('attendance marked present without times needs both punches', () => {
  for (const value of [undefined, null, '', ' ', '--:--']) {
    assert.deepEqual(getMissingPunches({ status: 'حضور', timeIn: value, timeOut: value }), { missingIn: true, missingOut: true });
  }
  assert.deepEqual(getMissingPunches(undefined), { missingIn: true, missingOut: true });
});

test('actual times determine the remaining missing punch, regardless of stale status', () => {
  assert.deepEqual(getMissingPunches({ timeOut: '17:00', status: 'حضور' }), { missingIn: true, missingOut: false });
  assert.deepEqual(getMissingPunches({ timeIn: '08:00', status: 'لم يسجل دخول' }), { missingIn: false, missingOut: true });
  assert.deepEqual(getMissingPunches({ timeIn: '00:00', timeOut: '08:00', status: 'لم يسجل دخول' }), { missingIn: false, missingOut: false });
});

test('resolved absence and leave are not reopened as missing punches', () => {
  for (const record of [{ isLeave: true }, ...['غائب', 'غياب غير مبرر', 'مغادرة مبكرة', 'إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'].map(status => ({ status }))]) {
    assert.deepEqual(getMissingPunches(record), { missingIn: false, missingOut: false });
  }
});
