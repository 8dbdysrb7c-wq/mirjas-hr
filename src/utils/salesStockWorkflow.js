export const linkedMaterialCards = (order, production = [], preparation = []) => [
  ...production.map(card => ({ ...card, productionType: 'sewing', isProduction: true })),
  ...preparation.map(card => ({ ...card, productionType: 'preparation', isProduction: true }))
].filter(card => !['ملغي', 'ملغى'].includes(card.status) && (card.salesOrderId ? card.salesOrderId === order.id : card.salesOrderNumber === order.orderNumber));

export const stockWorkflowState = (order, production, preparation) => {
  const needsStock = (order.items || []).some(item => ['جاهز', 'قيد التجهيز', 'جاهز للتسليم', 'تم التجهيز', 'تم التسليم'].includes(item.itemStatus));
  const cards = linkedMaterialCards(order, production, preparation);
  const needsCards = (order.items || []).some(item => ['قيد الإنتاج', 'إنتاج قيد الخياطة', 'إنتاج قيد التغليف', 'قيد التحضير', 'إنتاج قيد التحضير', 'تحضير وإنتاج'].includes(item.itemStatus));
  return {
    stockDone: !needsStock || order.stockDeducted || order.ignoredAudit,
    stockLabel: order.ignoredAudit ? 'تم التجاهل' : order.stockDeducted ? 'تم الخصم' : needsStock ? 'بانتظار التدقيق' : 'لا يوجد خصم بضاعة جاهزة',
    materialsDone: (cards.length > 0 || !needsCards) && cards.every(card => card.stockDeducted || card.ignoredMaterialAudit),
    cards
  };
};
