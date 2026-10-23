const idsFor = employee => [employee?.id, employee?.employeeId].filter(Boolean).map(value => String(value).trim());
export const requiresDailyReportForCheckout = (selectedIds, employee) =>
  idsFor(employee).some(id => (selectedIds || []).map(String).includes(id));
export const hasSubmittedCheckoutReport = (reports, employee, date) => reports.some(report =>
  report.date === date && !['محذوف', 'deleted', 'مسودة', 'draft'].includes(report.status)
  && [report.userId, report.employeeId].filter(Boolean).some(id => idsFor(employee).includes(String(id).trim())));
