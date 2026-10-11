import { timeToMinutes } from './attendancePolicy.js';

const normalizeId = value => String(value || '').trim().toUpperCase().replace(/^EMP-0*/, 'EMP-');
const normalizeName = value => String(value || '').trim().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ');

// Use the same employee/day and complete punches before falling back to partial records.
export const resolveOvertimeAttendance = (records, leave, employee) => {
  const date = leave.date || leave.startDate;
  const ids = [leave.employeeId, employee?.id, employee?.employeeId].filter(Boolean).map(normalizeId);
  const names = [leave.employeeName, employee?.name].filter(Boolean).map(normalizeName);
  const matches = records.filter(record => {
    if (record.date !== date || record.isLeave || record.status === 'محذوف') return false;
    const recordIds = [record.employeeId, record.userId, record.supervisorId].filter(Boolean).map(normalizeId);
    if (recordIds.some(id => ids.includes(id))) return true;
    return names.includes(normalizeName(record.employeeName || record.userName || record.supervisorName || record.name));
  });
  const valid = value => timeToMinutes(value) != null;
  const rank = record => (valid(record.timeIn || record.time) && valid(record.timeOut) ? 100 : 0)
    + ({ hr_attendance: 4, attendance_logs: 3, employee_reports: 2, supervisor_reports: 1 }[record.attendanceSource] || 0);
  matches.sort((a, b) => rank(b) - rank(a) || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  if (!matches.length) return null;
  const merged = { ...matches[0] };
  merged.timeIn = matches.map(record => record.timeIn || record.time).find(valid) || '';
  merged.timeOut = matches.map(record => record.timeOut).find(valid) || '';
  return merged;
};
