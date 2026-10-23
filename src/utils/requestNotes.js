export function requestDecisionNote(request) {
 const rejected = request.status === 'مرفوض';
 const direct = rejected ? request.rejectionReason : request.approvalReason;
 if (direct !== undefined) return String(direct || '').trim();
 if (request.adminNote !== undefined) return String(request.adminNote || '').trim();
 const label = rejected ? 'سبب الرفض' : 'ملاحظات الإدارة';
 const matches = [...String(request.notes || '').matchAll(/\((سبب الرفض|ملاحظات الإدارة):\s*([\s\S]*?)\)(?=\s*(?:\n|$))/g)];
 return matches.filter(m => m[1] === label).at(-1)?.[2].trim() || '';
}
export const supportsRequestNote = (type, modelType) => modelType === 'punch' || (modelType === 'leave' && /إجازة|مغادرة|عمل إضافي/.test(type || ''));
