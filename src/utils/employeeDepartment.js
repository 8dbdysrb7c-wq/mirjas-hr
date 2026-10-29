// Resolve actual department assignments before legacy display fields.
export const getEmployeeDepartment = (employee, organizationDepartments = [], legacyDepartments = {}) => {
  const linked = organizationDepartments.find(department => department.id === employee?.organizationDepartmentId);
  if (linked?.name) return linked.name;
  const department = String(employee?.department || '').trim();
  if (department) return legacyDepartments[department] || department;
  const knownNames = new Set([...organizationDepartments.map(row => row.name), ...Object.values(legacyDepartments)]);
  for (const role of employee?.roles || []) {
    if (legacyDepartments[role]) return legacyDepartments[role];
    if (knownNames.has(role)) return role;
  }
  return '';
};
