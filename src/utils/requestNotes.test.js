import test from 'node:test';
import assert from 'node:assert/strict';
import { requestDecisionNote, supportsRequestNote } from './requestNotes.js';
test('rejected requests expose structured reason and missing punches expose admin note', () => {
 assert.equal(requestDecisionNote({status:'مرفوض', rejectionReason:'الوقت غير صحيح'}), 'الوقت غير صحيح');
 assert.equal(requestDecisionNote({status:'مرفوض', adminNote:'البصمة موجودة'}), 'البصمة موجودة');
});
test('approval uses current note and ignores old rejection and explicitly cleared notes', () => {
 assert.equal(requestDecisionNote({status:'موافق', approvalReason:'تم اعتماد ساعتين', rejectionReason:'قديم'}), 'تم اعتماد ساعتين');
 assert.equal(requestDecisionNote({status:'موافق', approvalReason:'', notes:'(ملاحظات الإدارة: قديم)'}), '');
});
test('legacy notes use the latest matching decision and preserve multiple lines', () => {
 assert.equal(requestDecisionNote({status:'مرفوض', notes:'سبب الموظف\n(سبب الرفض: قديم)\n(سبب الرفض: الوقت\nغير مطابق)'}), 'الوقت\nغير مطابق');
 assert.equal(requestDecisionNote({status:'موافق', notes:'(سبب الرفض: قديم)\n(ملاحظات الإدارة: موافق)'}), 'موافق');
});
test('status note placement applies only to requested types', () => {
 for(const type of ['إجازة سنوية','مغادرة خاصة','بدل عمل إضافي']) assert.equal(supportsRequestNote(type,'leave'), true);
 assert.equal(supportsRequestNote('ختمة ناقصة (دخول)','punch'),true);
 for(const model of ['report','advance','petition']) assert.equal(supportsRequestNote('طلب',model),false);
});
