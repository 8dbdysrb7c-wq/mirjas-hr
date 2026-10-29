const normalizeStatus = value => String(value ?? '').normalize('NFKC')
  .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
  .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim().toLowerCase();

const inactiveStatuses = new Set([
  'غير فعال', 'غير نشط', 'موقوف', 'مستقيل', 'استقال', 'منتهي خدمات',
  'منتهي الخدمة', 'منتهي الخدمه', 'منتهي خدمة', 'منتهي', 'مفصول',
  'inactive', 'disabled', 'suspended', 'resigned', 'terminated'
].map(normalizeStatus));

// Any explicit stop flag wins over a stale active value in another field.
// Legacy employees with no status remain active.
export const isActiveEmployee = employee => {
  if (!employee) return false;
  if ([employee.isActive, employee.active].some(value =>
    value === false || value === 0 || ['false', '0'].includes(String(value).toLowerCase()))) return false;
  return ![employee.employmentStatus, employee.status, employee.employeeStatus]
    .some(value => inactiveStatuses.has(normalizeStatus(value)));
};

// HR screens require an explicit active employment status.
export const isActiveHREmployee = employee =>
  isActiveEmployee(employee) && normalizeStatus(employee?.employmentStatus) === 'فعال';

// An existing employee ID is authoritative; name fallback is for legacy rows only.
export const belongsToHREmployees = (record, employees) => {
  const id = String(record?.employeeId ?? record?.userId ?? '').trim();
  return employees.some(employee => id
    ? String(employee.id).trim() === id
    : Boolean(record?.employeeName && String(employee.name).trim() === String(record.employeeName).trim()));
};
