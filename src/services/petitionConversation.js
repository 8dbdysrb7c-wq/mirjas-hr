import { collection, doc, onSnapshot, query, where, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { hasPermission } from '../utils/permissions';
import { petitionTransition } from '../utils/petitionConversation';
import { createNotification } from './settings';

export const canManagePetitions = user => hasPermission(user, 'hr_petitions', 'approve');
export async function markPetitionRead(id, user, adminView, knownPetition) {
  const knownLast = knownPetition?.messages?.at(-1)?.id;
  if (knownPetition && (!knownLast || knownPetition.readBy?.[String(user.id)] === knownLast)) return;
  const ref = doc(db, 'hr_petitions', id);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) return;
    const row = snapshot.data();
    if (adminView ? !hasPermission(user, 'hr_petitions', 'view') : String(row.employeeId) !== String(user.id)) throw new Error('غير مصرح');
    const last = row.messages?.at(-1)?.id;
    if (!last || row.readBy?.[String(user.id)] === last) return;
    transaction.update(ref, { readBy: { ...(row.readBy || {}), [String(user.id)]: last } });
  });
}
export function watchPetition(id, user, adminView, next, error) {
  if (adminView && !hasPermission(user, 'hr_petitions', 'view')) {
    error(new Error('لا تملك صلاحية عرض الاستدعاءات')); return () => {};
  }
  return onSnapshot(doc(db, 'hr_petitions', id), snapshot => {
    const row = snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } : null;
    if (row && !adminView && String(row.employeeId) !== String(user.id)) {
      error(new Error('هذا الطلب ليس لك')); return;
    }
    next(row && !['محذوف', 'deleted'].includes(row.status) ? row : null);
  }, error);
}
export function watchPetitions(user, adminView, next, error, dateFrom = null, dateTo = null) {
  if (adminView && !hasPermission(user, 'hr_petitions', 'view')) {
    error(new Error('لا تملك صلاحية عرض الاستدعاءات')); return () => {};
  }
  
  let q = collection(db, 'hr_petitions');
  
  if (adminView) {
    // If a date range is provided, use it to limit reads. We filter out 'deleted' locally to avoid index issues.
    if (dateFrom && dateTo) {
      q = query(q, where('createdAt', '>=', dateFrom), where('createdAt', '<=', dateTo + 'T23:59:59'));
    } else {
      q = query(q, where('status', '!=', 'محذوف'));
    }
  } else {
    q = query(q, where('employeeId', 'in', [...new Set([user.id, String(user.id)])]));
  }
    
  return onSnapshot(q, snapshot => next(snapshot.docs.map(row => ({ ...row.data(), id: row.id })).filter(row => !['محذوف', 'deleted'].includes(row.status))), error);
}

export async function sendPetitionMessage(id, user, action, text, adminView, requestId) {
  const admin = adminView && canManagePetitions(user);
  const ref = doc(db, 'hr_petitions', id);
  const messageId = requestId || doc(collection(db, 'hr_petitions')).id;
  const result = await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('الاستدعاء غير موجود');
    const petition = snapshot.data();
    if (adminView && !admin) throw new Error('لا تملك صلاحية متابعة الاستدعاءات');
    if (!admin && String(petition.employeeId) !== String(user.id)) throw new Error('هذا الطلب ليس لك');
    // A retry after an uncertain response must not add or close twice.
    const existingMessage = (petition.messages || []).find(message => message.id === messageId);
    if (existingMessage) {
      if (existingMessage.senderId !== String(user.id) || existingMessage.action !== action || existingMessage.text !== text.trim()) throw new Error('تعذر إعادة استخدام محاولة الإرسال');
      return { petition, alreadySaved: true };
    }
    const changes = petitionTransition(petition, action, admin, text);
    const now = new Date().toISOString();
    const message = { id: messageId, text: text.trim(), senderId: String(user.id), senderName: user.name || '', role: admin ? 'admin' : 'employee', action, sentAt: now };
    const update = { ...changes, messages: [...(petition.messages || []), message], updatedAt: now,
      readBy: { ...(petition.readBy || {}), [String(user.id)]: messageId },
      lastMessageRole: message.role, ...(action === 'close' ? { closedBy: message.senderName, closedAt: now } : {}) };
    transaction.update(ref, update);
    return { petition: { ...petition, ...update }, alreadySaved: false };
  });
  if (result.alreadySaved) return { notificationFailed: false, petition: result.petition, alreadySaved: true };
  // A notification failure must not make the user resend an already committed message.
  let notificationFailed = false;
  try {
    const notification = await createNotification({ targetEmployeeId: admin ? result.petition.employeeId : '', visibleUserIds: admin ? [result.petition.employeeId] : [], visibleRoles: admin ? [] : ['management'], createdById: String(user.id), createdByName: user.name, moduleKey: 'hr', moduleLabel: 'الموارد البشرية',
      title: action === 'close' ? 'تم إغلاق الاستدعاء' : 'تحديث محادثة الاستدعاء', message: `${result.petition.title}: ${text.trim()}`,
      target: admin ? { tab: 'hr_requests' } : { tab: 'hr', subTab: 'petitions' } });
    notificationFailed = !notification;
  } catch { notificationFailed = true; }
  return { notificationFailed, petition: result.petition };
}
