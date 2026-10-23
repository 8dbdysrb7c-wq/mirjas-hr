import { timeToMinutes } from './attendancePolicy.js';
export const reportAttendanceFields = (report, attendance) => {
  const timeIn = attendance.timeIn || report.timeIn || '';
  const timeOut = attendance.timeOut || '';
  const start = timeToMinutes(timeIn);
  let end = timeToMinutes(timeOut);
  if (start == null || end == null) return { timeIn, timeOut, actualHours: null, attendancePending: true };
  if (end < start) end += 1440;
  const breakStart = timeToMinutes(report.breakTimeFrom);
  let breakEnd = timeToMinutes(report.breakTimeTo);
  if (breakStart != null && breakEnd != null && breakEnd < breakStart) breakEnd += 1440;
  const breakMinutes = breakStart != null && breakEnd != null ? breakEnd - breakStart : 0;
  return { timeIn, timeOut, actualHours: Math.max(0, end - start - breakMinutes) / 60, attendancePending: false };
};
