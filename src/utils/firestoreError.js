export function firestoreErrorMessage(error, operation = 'الحفظ') {
  const code = String(error?.code || '').replace('firestore/', '');
  if (code === 'resource-exhausted' || /quota exceeded|quota.*exceed/i.test(error?.message || '')) {
    return `تعذر ${operation} لأن قاعدة البيانات تجاوزت حصة الاستخدام. يلزم مراجعة استخدام Firebase. احتفظ بنص الرد وحاول مجددًا بعد استعادة الخدمة.`;
  }
  if (['unavailable', 'deadline-exceeded'].includes(code)) return `تعذر تأكيد ${operation} بسبب الاتصال بالخادم. احتفظ بالنص وأعد المحاولة.`;
  if (code === 'permission-denied') return `تعذر ${operation}: لا توجد صلاحية كافية لدى قاعدة البيانات.`;
  return error?.message || `تعذر ${operation}. حاول مجددًا.`;
}
