export const deliveryAssignment = (selection, employees = []) => {
  const deliveryMethod = selection === '__pickup' ? 'pickup' : selection === '__courier' ? 'courier' : selection ? 'employee' : 'unassigned';
  const employee = employees.find(item => item.id === selection);
  return { deliveryMethod, assignedEmployeeId: deliveryMethod === 'employee' ? selection : '', assignedEmployeeName: deliveryMethod === 'employee' ? employee?.name || '' : '' };
};
export const deliverySelection = mission => mission.deliveryMethod === 'pickup' ? '__pickup' : mission.deliveryMethod === 'courier' ? '__courier' : mission.assignedEmployeeId || '';
export const deliveryLabel = mission => mission.deliveryMethod === 'pickup' ? 'استلام من الشركة (الزبون)' : mission.deliveryMethod === 'courier' ? 'شركة توصيل' : mission.assignedEmployeeName || 'بدون سائق';
export const orderDeliveryMission = order => ({
  type: 'تسليم طلبية', deliveryMethod: order.deliveryMethod || 'unassigned',
  sourceEntity: 'مرجاس للتجارة - قسم الاثاث', targetEntity: order.customerName || 'العميل',
  salesOrderNumber: order.orderNumber, assignedEmployeeId: order.deliveryDriverId || '',
  assignedEmployeeName: order.deliveryDriverName || '', dueDate: order.deliveryDate || order.orderDate || '',
  status: order.deliveryStatus || 'بانتظار الاستلام', details: 'تسليم طلبية رقم ' + order.orderNumber
});

export const allDeliveryItemsReady = order => Array.isArray(order?.items) && order.items.length > 0 && order.items.every(item => item.itemStatus === 'جاهز');
