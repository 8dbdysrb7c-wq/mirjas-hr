export const UNPAID_ABSENCE_POLICY_START_DATE = '2026-08-17';
export const MAX_PARTIAL_ABSENCE_MINUTES = 180;

export const timeToMinutes = value => {
  const text = String(value || '').trim();
  if (!text || text === '--:--') return null;
  const match = text.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if ((text.includes('م') || /pm/i.test(text)) && hour < 12) hour += 12;
  if ((text.includes('ص') || /am/i.test(text)) && hour === 12) hour = 0;
  return (hour * 60) + minute;
};

export const getOfficialAbsenceMinutes = ({ timeIn, timeOut, shiftStart, shiftEnd }) => {
  const inMinutes = timeToMinutes(timeIn);
  const outMinutes = timeToMinutes(timeOut);
  const startMinutes = timeToMinutes(shiftStart);
  let endMinutes = timeToMinutes(shiftEnd);
  if (inMinutes == null || startMinutes == null || endMinutes == null) return 0;
  if (endMinutes <= startMinutes) endMinutes += 1440;

  let normalizedIn = inMinutes;
  if (normalizedIn < startMinutes && endMinutes > 1440) normalizedIn += 1440;
  const lateMinutes = Math.max(0, Math.min(normalizedIn, endMinutes) - startMinutes);

  // Staying after the official shift never offsets absence within the shift.
  if (outMinutes == null) return lateMinutes;
  let normalizedOut = outMinutes;
  if (normalizedOut < normalizedIn) normalizedOut += 1440;
  const earlyMinutes = Math.max(0, endMinutes - Math.max(startMinutes, Math.min(normalizedOut, endMinutes)));
  return Math.min(endMinutes - startMinutes, lateMinutes + earlyMinutes);
};

export const getTimedLeaveMinutes = leave => {
  const start = timeToMinutes(leave?.startTime);
  let end = timeToMinutes(leave?.endTime);
  if (start == null || end == null) return 0;
  if (end < start) end += 1440;
  return Math.max(0, end - start);
};

export const isPolicyEffective = date => String(date || '') >= UNPAID_ABSENCE_POLICY_START_DATE;

export const isLongApprovedDeparture = leave => {
  if (leave?.deductFromVacationBalance) return false;
  const approved = ['موافق', 'موافق عليه', 'مقبول', 'تمت الموافقة', 'تم التسليم'].includes(leave?.status);
  const departure = ['مغادرة خاصة', 'مغادرة عمل', 'مغادرة الدخان'].includes(leave?.type);
  const date = leave?.date || leave?.startDate;
  return approved && departure && isPolicyEffective(date) && getTimedLeaveMinutes(leave) > MAX_PARTIAL_ABSENCE_MINUTES;
};
