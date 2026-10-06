// Supervisors use the employee dashboard even when their department is management.
// This controls the landing interface only; action permissions are checked separately.
export const usesAdminDashboard = (user, isAdmin) => {
  if (!user) return false;
  if (String(user.level || '').trim() === 'مشرف') return false;
  return isAdmin(user);
};
