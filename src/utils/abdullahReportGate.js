export const ABDULLAH_ID = 'EMP-0006';
export const REQUIRED_SUPERVISOR_DATES = ['2026-10-01', '2026-10-13', '2026-10-14'];
export function pendingAbdullahReports(reports, employeeReports, teamIds) {
  return REQUIRED_SUPERVISOR_DATES.filter(date => {
    const report = reports.find(row => row.supervisorId === ABDULLAH_ID && row.date === date && !['محذوف', 'deleted', 'مسودة'].includes(row.status));
    if (!report?.employeeEvaluations?.length) return true;
    const evaluated = new Set(report.employeeEvaluations.filter(row => row.rating).map(row => String(row.employeeId)));
    return employeeReports.some(row => row.date === date && !['محذوف', 'deleted'].includes(row.status) &&
      teamIds.includes(String(row.userId || row.employeeId)) && !evaluated.has(String(row.userId || row.employeeId)));
  });
}
