import { collection, doc, getDocs, query, where, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { isAdmin } from './settings';

// Stock vouchers belong to the whole card: never reverse them for a single row.
const rowIdentity = item => JSON.stringify([
  'id', 'salesItemId', 'salesOrderItemId', 'itemNumber', 'productName',
  'sizeCm', 'thickness', 'colorModel', 'packagingType', 'quantity'
].map(key => String(item?.[key] ?? '').trim()));

export async function deleteCardItem(order, index, actor, preparation = false) {
  if (!isAdmin(actor)) throw new Error('حذف الأصناف متاح للإدارة فقط.');
  if (!Array.isArray(order.items) || !order.items[index]) throw new Error('حدّث الكرت ثم حاول مجددًا.');
  const vouchers = await getDocs(query(collection(db, 'stock_vouchers'), where('orderNumber', '==', order.orderNumber)));
  let saleRef = order.salesOrderId ? doc(db, 'sales_orders', order.salesOrderId) : null;
  let salesResolution = 'not-linked';
  if (!saleRef && order.salesOrderNumber) {
    const sales = await getDocs(query(collection(db, 'sales_orders'), where('orderNumber', '==', order.salesOrderNumber)));
    if (sales.docs.length === 1) saleRef = sales.docs[0].ref;
    else salesResolution = 'order-not-uniquely-matched';
  }
  const cardRef = doc(db, preparation ? 'preparation_orders' : 'orders', order.id);
  const archiveRef = doc(collection(db, 'card_item_deletion_archives'));
  return runTransaction(db, async transaction => {
    const cardSnap = await transaction.get(cardRef);
    const saleSnap = saleRef ? await transaction.get(saleRef) : null;
    if (!cardSnap.exists()) throw new Error('الكرت غير موجود.');
    const current = cardSnap.data();
    const expectedIdentity = rowIdentity(order.items[index]);
    let currentIndex = index;
    if (!current.items?.[currentIndex] || rowIdentity(current.items[currentIndex]) !== expectedIdentity) {
      const matches = (current.items || []).map((row, i) => rowIdentity(row) === expectedIdentity ? i : -1).filter(i => i >= 0);
      if (matches.length !== 1) throw new Error('الصنف لم يعد موجودًا بنفس المواصفات والكمية. أعد فتح الكرت.');
      currentIndex = matches[0];
    }
    const item = current.items[currentIndex];
    const items = current.items.filter((_, i) => i !== currentIndex);
    let salesSync = saleRef ? 'order-missing' : salesResolution;
    if (saleSnap?.exists()) {
      const sale = saleSnap.data();
      const norm = value => String(value || '').trim();
      const matches = (sale.items || []).map((candidate, i) => ({ candidate, i })).filter(({ candidate }) =>
        ['productName', 'sizeCm', 'thickness', 'colorModel', 'packagingType'].every(key => norm(candidate[key]) === norm(item[key])) &&
        (!item.itemNumber || !candidate.itemNumber || item.itemNumber === candidate.itemNumber));
      const saleIndex = matches.length === 1 ? matches[0].i : -1;
      salesSync = saleIndex < 0 ? 'item-not-uniquely-matched' : 'identical-row-remains';
      // A second identical row still needs its existing sales status.
      const remains = items.some(row => ['productName', 'sizeCm', 'thickness', 'colorModel', 'packagingType'].every(key => norm(row[key]) === norm(item[key])));
      if (saleIndex >= 0 && !remains) {
        salesSync = 'matched';
        transaction.update(saleRef, {
        items: sale.items.map((row, i) => i === saleIndex ? { ...row, itemStatus: (preparation ? row.hasProductionDetails || row.hasPrepAndProdDetails : row.hasPreparationDetails || row.hasPrepAndProdDetails) ? (row.itemStatus || 'قيد التجهيز') : 'قيد التجهيز' } : row),
        updatedAt: new Date().toISOString()
      });
      }
    }
    const updated = { ...current, id: order.id, items, ...(items.length ? {} : { status: 'ملغي' }), lastActionBy: actor.name || actor.id, updatedAt: new Date().toISOString() };
    transaction.set(archiveRef, { cardId: order.id, orderNumber: current.orderNumber, section: preparation ? 'preparation' : 'production', item, originalIndex: currentIndex, deletedBy: actor.id || actor.employeeId || actor.name, deletedAt: updated.updatedAt, adminOverride: true, stockVouchersPreserved: true, linkedVoucherIds: vouchers.docs.map(voucher => voucher.id), salesSync, salesOrderId: saleRef?.id || order.salesOrderId || '', salesOrderNumber: order.salesOrderNumber || '' });
    transaction.update(cardRef, { items: updated.items, status: updated.status || 'لم يتم التنفيذ', lastActionBy: updated.lastActionBy, updatedAt: updated.updatedAt });
    return updated;
  });
}
