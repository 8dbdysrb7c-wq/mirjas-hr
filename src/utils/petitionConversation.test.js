import { test } from 'node:test';
import assert from 'node:assert/strict';
import { petitionStatus, awaitsPetitionAdmin, petitionTransition } from './petitionConversation.js';

test('legacy decisions remain closed; unprocessed requests await administration', () => {
  for (const status of ['مقبول', 'موافق', 'مرفوض']) assert.equal(petitionStatus({ status }), 'مغلق');
  assert.equal(awaitsPetitionAdmin({ status: 'معلق' }), true);
  assert.equal(awaitsPetitionAdmin({ conversationStatus: 'بانتظار الموظف' }), false);
  assert.equal(awaitsPetitionAdmin({ status: 'محذوف' }), false);
  assert.equal(awaitsPetitionAdmin({ status: 'deleted' }), false);
  assert.throws(() => petitionTransition({ status: 'deleted' }, 'reply', true, 'رد'));
});
test('conversation workflow, closure and reopening permissions', () => {
  let row = { status: 'معلق' };
  row = { ...row, ...petitionTransition(row, 'reply', true, 'يرجى التوضيح') };
  assert.equal(awaitsPetitionAdmin(row), false);
  row = { ...row, ...petitionTransition(row, 'reply', false, 'التوضيح') };
  assert.equal(awaitsPetitionAdmin(row), true);
  assert.throws(() => petitionTransition(row, 'close', false, 'تم'));
  assert.throws(() => petitionTransition(row, 'close', true, '   '));
  row = { ...row, ...petitionTransition(row, 'close', true, 'تم الحل') };
  assert.equal(awaitsPetitionAdmin(row), false);
  for (const admin of [true, false]) assert.throws(() => petitionTransition(row, 'reply', admin, 'رد'));
  row = { ...row, ...petitionTransition(row, 'request-reopen', false, 'المشكلة مستمرة') };
  assert.equal(awaitsPetitionAdmin(row), true);
  assert.equal(petitionStatus(row), 'مغلق');
  assert.throws(() => petitionTransition(row, 'request-reopen', false, 'تكرار'));
  assert.throws(() => petitionTransition(row, 'reopen', false, 'فتح'));
  row = { ...row, ...petitionTransition(row, 'reopen', true, 'يرجى التوضيح') };
  assert.equal(petitionStatus(row), 'بانتظار الموظف');
});
