export const ARCHIVABLE_VOUCHER_TYPES = ['إدخال', 'إخراج', 'تحويل'];
export const isStockVoucherInHistory = voucher => !voucher.historyArchivedAt;
export const shouldArchiveStockVoucher = voucher => ARCHIVABLE_VOUCHER_TYPES.includes(voucher.type) && isStockVoucherInHistory(voucher);
