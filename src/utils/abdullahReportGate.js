export const ABDULLAH_ID = 'EMP-0006';
export const ABDULLAH_POLICY_START = '2026-10-25';
export function reportDeadlineDate(now = new Date()) {
 const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Amman', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(p => [p.type,p.value]));
 const today = parts.year + '-' + parts.month + '-' + parts.day;
 return Number(parts.hour) >= 21 ? today : new Date(Date.parse(today + 'T12:00:00Z') - 86400000).toISOString().slice(0,10);
}
export function pendingAbdullahReports(reports, employeeReports, teamIds, attendance = [], now = new Date()) {
 const deadline = reportDeadlineDate(now);
 const dates = new Set([
 ...employeeReports.filter(r => !['محذوف','deleted','مسودة'].includes(r.status) && teamIds.includes(String(r.userId || r.employeeId))).map(r => r.date),
 ...attendance.filter(r => [r.employeeId,r.userId].includes(ABDULLAH_ID) && !r.isLeave && [r.timeIn,r.timeOut].some(t => t && !['--:--','--','-'].includes(t))).map(r => r.date)
 ]);
 return [...dates].filter(date => date >= ABDULLAH_POLICY_START && date <= deadline && !reports.some(r => r.supervisorId === ABDULLAH_ID && r.date === date && !['محذوف','deleted','مسودة'].includes(r.status) && r.employeeEvaluations?.length)).sort();
}
