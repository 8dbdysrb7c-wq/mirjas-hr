export const cleanStockProductName = (value) => {
  let result = String(value || '');
  let prev;
  do {
    prev = result;
    result = result
      .replace(/\s*\(المتوفر:\s*[-+]?\d+(?:\.\d+)?\)\s*$/, '')
      .replace(/\s*\(الموجود:\s*[-+]?\d+(?:\.\d+)?\s*\|\s*المحجوز:\s*[-+]?\d+(?:\.\d+)?\s*\|\s*المتاح:\s*[-+]?\d+(?:\.\d+)?\)\s*$/, '')
      .replace(/\s*\(مستودع:\s*[^\)]+\)\s*$/, '')
      .trim();
  } while (result !== prev);
  return result;
};

export const isCancelledOrder = (order) => {
  const status = String(order?.status || '').trim();
  return status === 'ملغي' || status === 'ملغى' || Boolean(order?.ignoredAudit);
};

export const isReservableSalesItem = (item) => {
  const status = String(item?.itemStatus || '').trim();
  return ['جاهز', 'قيد التجهيز', 'جاهز للتسليم', 'تم التجهيز', 'تم التسليم'].includes(status);
};

export const isReadyStockSalesItem = (item) => {
  const status = String(item?.itemStatus || '').trim();
  return ['جاهز', 'جاهز للتسليم', 'تم الإنتاج', 'تم التحضير', 'تم التجهيز', 'تم التسليم', 'منتهي'].includes(status);
};

export const buildReservedQuantityMap = (orders = [], excludedOrderId = '') => {
  const reserved = {};
  orders.forEach(order => {
    if (order?.stockDeducted || isCancelledOrder(order) || (excludedOrderId && order?.id === excludedOrderId)) return;
    (order?.items || []).forEach(item => {
      const immediateReservation = isReservableSalesItem(item) ? Number(item.quantity) || 0 : 0;
      const receivedReservation = Math.min(Number(item.quantity) || 0, Number(item.receivedReservedQuantity) || 0);
      const quantity = Math.max(immediateReservation, receivedReservation);
      if (quantity <= 0) return;
      const key = cleanStockProductName(item.productName || item.name);
      if (key && quantity > 0) reserved[key] = (reserved[key] || 0) + quantity;
    });
  });
  return reserved;
};

export const getAvailableQuantity = (physical, reserved) => Math.max(0, Number(physical || 0) - Number(reserved || 0));
