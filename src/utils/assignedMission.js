export const isAssignedMission = (mission, user) => {
  if (mission?.previousSalesOrderNumber && !mission?.salesOrderNumber) return false;
  const assignedId = String(mission?.assignedEmployeeId || '').trim();
  const ids = [user?.id, user?.employeeId].filter(Boolean).map(id => String(id).trim());
  if (assignedId) return ids.includes(assignedId);
  const name = String(user?.name || '').trim();
  return Boolean(name && String(mission?.assignedEmployeeName || '').trim() === name);
};
export const employeeMissionStatuses = settings => {
  const defaults = ['بانتظار الاستلام', 'تم الاستلام', 'في الطريق', 'عند الموقع', 'تم الإنجاز', 'تم تأجيل التوصيل'];
  const configured = (settings?.missionStatuses || []).map(status => typeof status === 'string' ? { name: status } : status).filter(status => status?.name);
  return [...configured, ...defaults.filter(name => !configured.some(status => status.name === name)).map(name => ({ name }))];
};
