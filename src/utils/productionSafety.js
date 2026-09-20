export const canSafelyDeleteProduction = user => user?.id === 'admin';

export const sameProductionSale = (a, b) => Boolean(
  (a.salesOrderId && b.salesOrderId && a.salesOrderId === b.salesOrderId) ||
  (a.salesOrderNumber && b.salesOrderNumber && a.salesOrderNumber === b.salesOrderNumber)
);

export const isUnstartedProduction = order => {
  const pending = value => !value || ['لم يتم التنفيذ', 'معلق', 'جديد'].includes(value);
  return !order.stockDeducted && !order.stockReceived && pending(order.status) &&
    pending(order.executionStatus) && !(order.statusHistory || []).length &&
    (order.items || []).every(item => pending(item.status) &&
      !item.stockDeducted && !item.stockReceived &&
      !Number(item.receivedQuantity) && !Number(item.completedQuantity) &&
      !Number(item.stageQuantities?.finished) && !Number(item.stageQuantities?.packaging) &&
      !Number(item.stageQuantities?.pendingPackaging));
};
