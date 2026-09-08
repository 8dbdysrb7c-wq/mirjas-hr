export const petitionStatus = petition => {
  if (petition.conversationStatus) return petition.conversationStatus;
  return ['مقبول', 'موافق', 'مرفوض', 'مغلق'].includes(petition.status) ? 'مغلق' : 'جديد';
};

export const awaitsPetitionAdmin = petition => !['محذوف', 'deleted'].includes(petition.status) &&
  (petition.reopenRequested || ['جديد', 'بانتظار الإدارة'].includes(petitionStatus(petition)));

export function petitionTransition(petition, action, isAdmin, text) {
  if (!String(text || '').trim()) throw new Error('اكتب الرسالة أو نتيجة المعالجة أولاً');
  if (text.length > 5000) throw new Error('الحد الأقصى للرسالة 5000 حرف');
  const closed = petitionStatus(petition) === 'مغلق';
  if (['محذوف', 'deleted'].includes(petition.status)) throw new Error('الطلب محذوف');
  if (action === 'reply') {
    if (closed) throw new Error('المحادثة مغلقة');
    return { conversationStatus: isAdmin ? 'بانتظار الموظف' : 'بانتظار الإدارة' };
  }
  if (action === 'close' && isAdmin && !closed) return { conversationStatus: 'مغلق', reopenRequested: false, resolution: text.trim() };
  if (action === 'reopen' && isAdmin && closed) return { conversationStatus: 'بانتظار الموظف', reopenRequested: false };
  if (action === 'request-reopen' && !isAdmin && closed && !petition.reopenRequested) return { reopenRequested: true };
  if (action === 'decline-reopen' && isAdmin && closed && petition.reopenRequested) return { reopenRequested: false };
  throw new Error('هذا الإجراء غير متاح لحالة الطلب أو صلاحياتك');
}
