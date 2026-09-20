const key = value => String(value || '').trim();
export function getDirectReports(manager, employees) {
  const assigned = new Set((manager?.assignedEmployees || []).map(key));
  const managerIds = [key(manager?.id), key(manager?.employeeId)].filter(Boolean);
  return employees.filter(employee => {
    const ids = [key(employee.id), key(employee.employeeId)].filter(Boolean);
    if (ids.some(id => managerIds.includes(id))) return false;
    if (employee.id === 'admin' || ['admin', 'إدارة'].includes(employee.level) || employee.role === 'admin' || employee.name === 'المدير العام') return false;
    const directManager = key(employee.directManager);
    return ids.some(id => assigned.has(id)) || (directManager && (
      managerIds.includes(directManager) || (key(manager?.name) && directManager === key(manager.name))
    ));
  });
}

export function canReviewSubordinateReport(user, subordinateIds, report) {
  const author = key(report?.supervisorId);
  return Boolean(author && ![key(user?.id), key(user?.employeeId)].includes(author) && subordinateIds.includes(author));
}
