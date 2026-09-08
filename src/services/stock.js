import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  getDoc,
  runTransaction
} from 'firebase/firestore';

export const getStock = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'stock'));
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getStock:", error);
    return [];
  }
};

import { cascadeStockItemUpdate } from './cascadeUpdates';
import { isPackagingCategory, packagingNumber, packagingSequence } from '../utils/packagingNumbers';
import { isFinishedGoodsCategory, finishedGoodsNumber, finishedGoodsSequence } from '../utils/finishedGoodsNumbers';
import { isSewingConsumablesCategory, sewingConsumablesNumber, sewingConsumablesSequence } from '../utils/sewingConsumablesNumbers';

export const saveStockItem = async (item, options = {}) => {
  try {
    let oldName = null;
    const docRef = item.id ? doc(db, 'stock', item.id) : doc(collection(db, 'stock'));
    if (isFinishedGoodsCategory(item.category)) {
      const counterRef = doc(db, 'stock_sequences', 'FG');
      const counterSnapshot = await getDoc(counterRef);
      let initialLast = 0;
      if (!counterSnapshot.exists()) {
        const existing = await getDocs(query(collection(db, 'stock'), where('itemNumber', '>=', 'FG-'), where('itemNumber', '<', 'FG.')));
        initialLast = Math.max(0, ...existing.docs.map(row => finishedGoodsSequence(row.data().itemNumber)));
      }
      const savedFGItem = await runTransaction(db, async transaction => {
        const counter = await transaction.get(counterRef);
        const existing = item.id ? await transaction.get(docRef) : null;
        const source = options.sourceItemId ? await transaction.get(doc(db, 'stock', options.sourceItemId)) : null;
        if (item.id && !existing?.exists()) throw new Error('الصنف لم يعد موجودًا؛ حدّث القائمة');
        oldName = existing?.exists() ? existing.data().name : null;
        if (options.sourceItemId && !source?.exists()) throw new Error('الصنف الأصلي لم يعد موجودًا؛ حدّث القائمة');
        let last = Math.max(initialLast, Number(counter.data()?.lastNumber) || 0);
        let number;
        if (existing?.exists() && isFinishedGoodsCategory(existing.data().category) && existing.data().itemNumber) {
          number = existing.data().itemNumber;
        } else if (source?.exists()) {
          if (!isFinishedGoodsCategory(source.data().category)) throw new Error('تصنيف الصنف الأصلي تغيّر؛ حدّث القائمة');
          number = source.data().itemNumber;
        } else {
          // Check if item with identical clean name already exists
          const cleanName = String(item.name || '').replace(/\s+/g, ' ').trim();
          const existingSameNameSnap = await getDocs(query(collection(db, 'stock'), where('name', '==', cleanName)));
          const matchingDoc = existingSameNameSnap.docs.find(d => isFinishedGoodsCategory(d.data().category) && d.data().itemNumber);
          if (matchingDoc) {
            number = matchingDoc.data().itemNumber;
          } else {
            number = finishedGoodsNumber(++last);
          }
        }
        last = Math.max(last, finishedGoodsSequence(number));
        const saved = { ...item, id: docRef.id, itemNumber: number, updatedAt: new Date().toISOString() };
        transaction.set(counterRef, { lastNumber: last }, { merge: true });
        transaction.set(docRef, saved);
        return saved;
      });
      if (oldName && oldName !== item.name) cascadeStockItemUpdate(savedFGItem.itemNumber, oldName, item.name);
      return savedFGItem;
    }

    if (isPackagingCategory(item.category)) {
      const counterRef = doc(db, 'stock_sequences', 'PKG');
      const counterSnapshot = await getDoc(counterRef);
      let initialLast = 0;
      if (!counterSnapshot.exists()) {
        const existing = await getDocs(query(collection(db, 'stock'), where('itemNumber', '>=', 'PKG-'), where('itemNumber', '<', 'PKG.')));
        initialLast = Math.max(0, ...existing.docs.map(row => packagingSequence(row.data().itemNumber)));
      }
      const savedPackagingItem = await runTransaction(db, async transaction => {
        const counter = await transaction.get(counterRef);
        const existing = item.id ? await transaction.get(docRef) : null;
        const source = options.sourceItemId ? await transaction.get(doc(db, 'stock', options.sourceItemId)) : null;
        if (item.id && !existing?.exists()) throw new Error('الصنف لم يعد موجودًا؛ حدّث القائمة');
        oldName = existing?.exists() ? existing.data().name : null;
        if (options.sourceItemId && !source?.exists()) throw new Error('الصنف الأصلي لم يعد موجودًا؛ حدّث القائمة');
        let last = Math.max(initialLast, Number(counter.data()?.lastNumber) || 0);
        let number;
        if (existing?.exists() && isPackagingCategory(existing.data().category) && existing.data().itemNumber) {
          number = existing.data().itemNumber;
        } else if (source?.exists()) {
          if (!isPackagingCategory(source.data().category)) throw new Error('تصنيف الصنف الأصلي تغيّر؛ حدّث القائمة');
          number = source.data().itemNumber;
        } else {
          // Check if item with identical clean name already exists
          const cleanName = String(item.name || '').replace(/\s+/g, ' ').trim();
          const existingSameNameSnap = await getDocs(query(collection(db, 'stock'), where('name', '==', cleanName)));
          const matchingDoc = existingSameNameSnap.docs.find(d => isPackagingCategory(d.data().category) && d.data().itemNumber);
          if (matchingDoc) {
            number = matchingDoc.data().itemNumber;
          } else {
            number = packagingNumber(++last);
          }
        }
        last = Math.max(last, packagingSequence(number));
        const saved = { ...item, id: docRef.id, itemNumber: number, updatedAt: new Date().toISOString() };
        transaction.set(counterRef, { lastNumber: last }, { merge: true });
        transaction.set(docRef, saved);
        return saved;
      });
      if (oldName && oldName !== item.name) cascadeStockItemUpdate(savedPackagingItem.itemNumber, oldName, item.name);
      return savedPackagingItem;
    }

    if (isSewingConsumablesCategory(item.category)) {
      const counterRef = doc(db, 'stock_sequences', 'CON');
      const counterSnapshot = await getDoc(counterRef);
      let initialLast = 0;
      if (!counterSnapshot.exists()) {
        const existing = await getDocs(query(collection(db, 'stock'), where('itemNumber', '>=', 'CON-'), where('itemNumber', '<', 'CON.')));
        initialLast = Math.max(0, ...existing.docs.map(row => sewingConsumablesSequence(row.data().itemNumber)));
      }
      const savedCONItem = await runTransaction(db, async transaction => {
        const counter = await transaction.get(counterRef);
        const existing = item.id ? await transaction.get(docRef) : null;
        const source = options.sourceItemId ? await transaction.get(doc(db, 'stock', options.sourceItemId)) : null;
        if (item.id && !existing?.exists()) throw new Error('الصنف لم يعد موجودًا؛ حدّث القائمة');
        oldName = existing?.exists() ? existing.data().name : null;
        if (options.sourceItemId && !source?.exists()) throw new Error('الصنف الأصلي لم يعد موجودًا؛ حدّث القائمة');
        let last = Math.max(initialLast, Number(counter.data()?.lastNumber) || 0);
        let number;
        if (existing?.exists() && isSewingConsumablesCategory(existing.data().category) && existing.data().itemNumber) {
          number = existing.data().itemNumber;
        } else if (source?.exists()) {
          if (!isSewingConsumablesCategory(source.data().category)) throw new Error('تصنيف الصنف الأصلي تغيّر؛ حدّث القائمة');
          number = source.data().itemNumber;
        } else {
          // Check if item with identical clean name already exists
          const cleanName = String(item.name || '').replace(/\s+/g, ' ').trim();
          const existingSameNameSnap = await getDocs(query(collection(db, 'stock'), where('name', '==', cleanName)));
          const matchingDoc = existingSameNameSnap.docs.find(d => isSewingConsumablesCategory(d.data().category) && d.data().itemNumber);
          if (matchingDoc) {
            number = matchingDoc.data().itemNumber;
          } else {
            number = sewingConsumablesNumber(++last);
          }
        }
        last = Math.max(last, sewingConsumablesSequence(number));
        const saved = { ...item, id: docRef.id, itemNumber: number, updatedAt: new Date().toISOString() };
        transaction.set(counterRef, { lastNumber: last }, { merge: true });
        transaction.set(docRef, saved);
        return saved;
      });
      if (oldName && oldName !== item.name) cascadeStockItemUpdate(savedCONItem.itemNumber, oldName, item.name);
      return savedCONItem;
    }
    
    if (item.id) {
      const existingDoc = await getDoc(docRef);
      if (existingDoc.exists()) {
        oldName = existingDoc.data().name;
      }
    }

    const id = docRef.id;
    const fullItem = { ...item, id, updatedAt: new Date().toISOString() };
    await setDoc(docRef, fullItem);

    if (oldName && oldName !== item.name) {
      cascadeStockItemUpdate(item.itemNumber, oldName, item.name); // Async fire-and-forget
    }

    return fullItem;
  } catch (error) {
    console.error("Error in saveStockItem:", error);
    return null;
  }
};

// The bill of materials belongs to the inventory item, independently from the
// temporary costing calculator. Keep it identical across all locations/colors
// that share the same item number.
export const saveStockItemComponents = async (itemNumber, materials = []) => {
  if (!itemNumber) throw new Error('ITEM_NUMBER_REQUIRED');
  const snapshot = await getDocs(query(collection(db, 'stock'), where('itemNumber', '==', itemNumber)));
  const safeMaterials = materials.map(material => ({
    itemNumber: material.itemNumber || '',
    name: material.name || '',
    spec: material.spec || '',
    quantityPerUnit: Number(material.quantityPerUnit) || 0,
    unit: material.unit || '',
    wastePercent: Number(material.wastePercent) || 0
  }));
  await Promise.all(snapshot.docs.map(document => setDoc(document.ref, {
    materials: safeMaterials,
    componentsUpdatedAt: new Date().toISOString()
  }, { merge: true })));
  return safeMaterials;
};

export const deleteStockItem = async (id) => {
  try {
    await deleteDoc(doc(db, 'stock', id));
  } catch (error) {
    console.error("Error in deleteStockItem:", error);
  }
};

export const deleteMultipleStockItems = async (ids) => {
  try {
    const promises = ids.map(id => deleteDoc(doc(db, 'stock', id)));
    await Promise.all(promises);
  } catch (error) {
    console.error("Error in deleteMultipleStockItems:", error);
  }
};

export const getStockVouchers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'stock_vouchers'));
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getStockVouchers:", error);
    return [];
  }
};

export const saveStockVoucher = async (voucher) => {
  try {
    let voucherToSave = { ...voucher };
    const existingVoucher = voucherToSave.id
      ? await getDoc(doc(db, 'stock_vouchers', voucherToSave.id))
      : null;

    // Keep the voucher ledger explicit and prevent accidental double application.
    voucherToSave.status = voucherToSave.status || 'معتمد';
    voucherToSave.items = Array.isArray(voucherToSave.items) ? voucherToSave.items : [];
    if (voucherToSave.items.length === 0) {
      throw new Error('لا يمكن حفظ سند مخزون بدون أصناف');
    }
    for (const item of voucherToSave.items) {
      if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) {
        throw new Error(`كمية غير صحيحة للصنف ${item.name || item.itemNumber || ''}`);
      }
    }

    // Editing an applied voucher is metadata-only. Quantity corrections must use
    // the existing revert flow followed by a new voucher.
    if (existingVoucher?.exists() && existingVoucher.data().status !== 'مسودة') {
      const updatedVoucher = {
        ...existingVoucher.data(),
        notes: voucherToSave.notes || existingVoucher.data().notes || '',
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'stock_vouchers', voucherToSave.id), updatedVoucher);
      return { ...updatedVoucher, id: voucherToSave.id };
    }

    // Validate the complete outgoing voucher before saving or changing balances.
    if (voucherToSave.status !== 'مسودة' && voucherToSave.type !== 'إدخال' && !(voucherToSave.type === 'تسوية' && voucherToSave.adjustmentType === 'زيادة')) {
      const requestedByStockId = new Map();
      for (const voucherItem of voucherToSave.items) {
        const qSource = query(collection(db, 'stock'), where('itemNumber', '==', voucherItem.itemNumber));
        const sourceSnapshot = await getDocs(qSource);
        const sourceDoc = voucherItem.stockId
          ? sourceSnapshot.docs.find(d => d.id === voucherItem.stockId)
          : sourceSnapshot.docs.find(d => {
              const data = d.data();
              return data.warehouse === voucherToSave.warehouse &&
                (data.location || '') === (voucherItem.location || '') &&
                (data.spec || '') === (voucherItem.spec || '');
            });
        if (!sourceDoc) throw new Error(`الصنف ${voucherItem.name || voucherItem.itemNumber} غير موجود في المستودع المحدد`);
        const requested = (requestedByStockId.get(sourceDoc.id) || 0) + Number(voucherItem.quantity);
        requestedByStockId.set(sourceDoc.id, requested);
        if (requested > Number(sourceDoc.data().quantity || 0)) {
          throw new Error(`الكمية المتوفرة للصنف ${voucherItem.name || voucherItem.itemNumber} لا تكفي لإتمام الصرف`);
        }
      }
    }
    if (!voucherToSave.id) {
      const vouchers = await getStockVouchers();
      if (!voucherToSave.voucherNumber) {
        const prefixMap = {
          'إدخال': 'STK-IN',
          'إخراج': 'STK-OUT',
          'إتلاف': 'STK-DMG',
          'تحويل': 'STK-TRF',
          'تسوية': 'STK-ADJ'
        };
        const prefix = prefixMap[voucherToSave.type] || 'STK-UNK';
        const typedVouchers = vouchers.filter(v => v.type === voucherToSave.type && v.voucherNumber?.startsWith(prefix));
        const maxNum = typedVouchers.reduce((max, v) => {
          const match = v.voucherNumber?.match(/\d+/);
          return match ? Math.max(max, parseInt(match[0])) : max;
        }, 0);
        voucherToSave.voucherNumber = `${prefix}-${String(maxNum + 1).padStart(4, '0')}`;
      }
      
      const docRef = doc(collection(db, 'stock_vouchers'));
      voucherToSave.id = docRef.id;
      voucherToSave.createdAt = new Date().toISOString();
      await setDoc(docRef, voucherToSave);
    } else {
      await setDoc(doc(db, 'stock_vouchers', voucherToSave.id), voucherToSave);
    }
    
    // Update stock quantities ONLY IF not a draft
    if (voucherToSave.status !== 'مسودة') {
      for (const voucherItem of voucherToSave.items) {
      // 1. Handle source warehouse (deduct for out/damage/transfer, add for in)
      const qSource = query(collection(db, 'stock'), where('itemNumber', '==', voucherItem.itemNumber));
      const sourceSnapshot = await getDocs(qSource);
      
      const sourceDoc = voucherItem.stockId
        ? sourceSnapshot.docs.find(docSnap => docSnap.id === voucherItem.stockId)
        : sourceSnapshot.docs.find(docSnap => {
        const data = docSnap.data();
        return data.warehouse === voucherToSave.warehouse &&
               (data.location || '') === (voucherItem.location || '') &&
               (data.spec || '') === (voucherItem.spec || '');
      });
      
      if (sourceDoc) {
        const existingData = sourceDoc.data();
        let newQty = Number(existingData.quantity || 0);
        if (voucherToSave.type === 'إدخال' || (voucherToSave.type === 'تسوية' && voucherToSave.adjustmentType === 'زيادة')) {
          newQty += Number(voucherItem.quantity);
        } else {
          // إخراج, إتلاف, تحويل, تسوية (عجز) all deduct from the source
          newQty -= Number(voucherItem.quantity);
        }
        
        await setDoc(doc(db, 'stock', sourceDoc.id), {
          ...existingData,
          quantity: newQty,
          lastMovement: voucherToSave.type,
          lastMovementDate: voucherToSave.date,
          lastRecipient: voucherToSave.recipient || '',
          notes: voucherToSave.notes || '',
          updatedAt: new Date().toISOString()
        });
      } else {
        if (voucherToSave.type === 'إدخال') {
          const newStockDocRef = doc(collection(db, 'stock'));
          await setDoc(newStockDocRef, {
            id: newStockDocRef.id,
            itemNumber: voucherItem.itemNumber,
            name: voucherItem.name,
            category: voucherItem.category || '',
            warehouse: voucherToSave.warehouse,
            location: voucherItem.location || '',
            spec: voucherItem.spec || '',
            quantity: Number(voucherItem.quantity),
            unit: voucherItem.unit || '',
            minLimit: Number(voucherItem.minLimit || 0),
            lastMovement: voucherToSave.type,
            lastMovementDate: voucherToSave.date,
            lastRecipient: voucherToSave.recipient || '',
            notes: voucherToSave.notes || '',
            updatedAt: new Date().toISOString()
          });
        }
      }

      // 2. Handle destination warehouse for transfers
      if (voucherToSave.type === 'تحويل' && voucherToSave.destinationWarehouse) {
        const destDoc = sourceSnapshot.docs.find(docSnap => {
          const data = docSnap.data();
          return data.warehouse === voucherToSave.destinationWarehouse &&
                 (data.spec || '') === (voucherItem.spec || '');
        });

        if (destDoc) {
          const existingDestData = destDoc.data();
          const newDestQty = Number(existingDestData.quantity || 0) + Number(voucherItem.quantity);
          await setDoc(doc(db, 'stock', destDoc.id), {
            ...existingDestData,
            quantity: newDestQty,
            lastMovement: 'وارد من تحويل',
            lastMovementDate: voucherToSave.date,
            lastRecipient: voucherToSave.warehouse || '',
            notes: `محول من: ${voucherToSave.warehouse}`,
            updatedAt: new Date().toISOString()
          });
        } else {
          // Create new item in destination warehouse if it doesn't exist
          const newDestDocRef = doc(collection(db, 'stock'));
          let sourceData = sourceDoc ? sourceDoc.data() : null;
          await setDoc(newDestDocRef, {
            id: newDestDocRef.id,
            itemNumber: voucherItem.itemNumber,
            name: voucherItem.name,
            category: voucherItem.category || (sourceData?.category || ''),
            warehouse: voucherToSave.destinationWarehouse,
            location: '', // Transfer creates item with no specific location initially
            spec: voucherItem.spec || '',
            quantity: Number(voucherItem.quantity),
            unit: voucherItem.unit || (sourceData?.unit || ''),
            minLimit: Number(voucherItem.minLimit || (sourceData?.minLimit || 0)),
            lastMovement: 'وارد من تحويل',
            lastMovementDate: voucherToSave.date,
            lastRecipient: voucherToSave.warehouse || '',
            notes: `محول من: ${voucherToSave.warehouse}`,
            updatedAt: new Date().toISOString()
          });
        }
      }
    }
    }
    
    return voucherToSave;
  } catch (error) {
    console.error("Error in saveStockVoucher:", error);
    return null;
  }
};

export const approveAuditVouchers = async (orderNumber) => {
  try {
    const qDrafts = query(collection(db, 'stock_vouchers'), where('orderNumber', '==', orderNumber), where('status', '==', 'مسودة'));
    const snapshot = await getDocs(qDrafts);
    if (snapshot.empty) return false;

    // Resolve and validate all lines first. Approval is refused as a whole when
    // one material is missing or insufficient, so managers do not get a partly
    // deducted order that looks completed in the UI.
    const requestedByStockId = new Map();
    for (const draftDoc of snapshot.docs) {
      const voucher = draftDoc.data();
      for (const voucherItem of (voucher.items || [])) {
        const quantity = Number(voucherItem.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) return false;
        const qSource = query(collection(db, 'stock'), where('itemNumber', '==', voucherItem.itemNumber));
        const sourceSnapshot = await getDocs(qSource);
        const sourceDoc = voucherItem.stockId
          ? sourceSnapshot.docs.find(d => d.id === voucherItem.stockId)
          : sourceSnapshot.docs.find(d => {
              const data = d.data();
              return data.warehouse === voucher.warehouse &&
                (data.location || '') === (voucherItem.location || '') &&
                (data.spec || '') === (voucherItem.spec || '');
            });
        if (!sourceDoc) return false;
        const requested = (requestedByStockId.get(sourceDoc.id) || 0) + quantity;
        requestedByStockId.set(sourceDoc.id, requested);
        if (requested > Number(sourceDoc.data().quantity || 0)) return false;
      }
    }

    const outgoingVoucherDocs = snapshot.docs.filter(docSnap => ['إخراج', 'إتلاف'].includes(docSnap.data().type));
    if (outgoingVoucherDocs.length === 0) return true;
    const promises = outgoingVoucherDocs.map(async (docSnap) => {
      const voucher = docSnap.data();
      voucher.id = docSnap.id;
      voucher.status = 'معتمد';
      voucher.updatedAt = new Date().toISOString();
      await setDoc(doc(db, 'stock_vouchers', voucher.id), voucher);
      
      // Update stock quantities for this voucher
      for (const voucherItem of voucher.items) {
        const qSource = query(collection(db, 'stock'), where('itemNumber', '==', voucherItem.itemNumber));
        const sourceSnapshot = await getDocs(qSource);
        const sourceDoc = voucherItem.stockId
          ? sourceSnapshot.docs.find(d => d.id === voucherItem.stockId)
          : sourceSnapshot.docs.find(d => {
          const data = d.data();
          return data.warehouse === voucher.warehouse &&
                 (data.location || '') === (voucherItem.location || '') &&
                 (data.spec || '') === (voucherItem.spec || '');
        });

        if (sourceDoc) {
          const existingData = sourceDoc.data();
          let newQty = Number(existingData.quantity || 0) - Number(voucherItem.quantity);
          await setDoc(doc(db, 'stock', sourceDoc.id), {
            ...existingData,
            quantity: newQty,
            lastMovement: voucher.type,
            lastMovementDate: voucher.date,
            lastRecipient: voucher.recipient || '',
            notes: voucher.notes || '',
            updatedAt: new Date().toISOString()
          });
        }
      }
    });

    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error("Error in approveAuditVouchers:", error);
    return false;
  }
};

export const deleteDraftVouchers = async (orderNumber) => {
  try {
    const qDrafts = query(collection(db, 'stock_vouchers'), where('orderNumber', '==', orderNumber), where('status', '==', 'مسودة'));
    const snapshot = await getDocs(qDrafts);
    if (snapshot.empty) return false;

    const promises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'stock_vouchers', docSnap.id)));
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error("Error in deleteDraftVouchers:", error);
    return false;
  }
};

export const getStocktakes = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'stocktakes'));
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getStocktakes:", error);
    return [];
  }
};

export const saveStocktake = async (report) => {
  try {
    const docRef = report.id ? doc(db, 'stocktakes', report.id) : doc(collection(db, 'stocktakes'));
    const id = docRef.id;
    const fullReport = { ...report, id, createdAt: new Date().toISOString() };
    await setDoc(docRef, fullReport);
    return fullReport;
  } catch (error) {
    console.error("Error in saveStocktake:", error);
    return null;
  }
};

export const deleteStockVoucher = async (id) => {
  try {
    const docRef = doc(db, 'stock_vouchers', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const voucher = docSnap.data();
      
      // If the voucher was applied, we must revert its effects on the stock
      if (voucher.status !== 'مسودة') {
        for (const voucherItem of voucher.items) {
          const qSource = query(collection(db, 'stock'), where('itemNumber', '==', voucherItem.itemNumber));
          const sourceSnapshot = await getDocs(qSource);
          
          // 1. Revert source warehouse
          const sourceDoc = sourceSnapshot.docs.find(d => {
            const data = d.data();
            return data.warehouse === voucher.warehouse &&
                   (data.location || '') === (voucherItem.location || '') &&
                   (data.spec || '') === (voucherItem.spec || '');
          });
          
          if (sourceDoc) {
            const existingData = sourceDoc.data();
            let newQty = Number(existingData.quantity || 0);
            
            // Reverse the original operation
            if (voucher.type === 'إدخال' || (voucher.type === 'تسوية' && voucher.adjustmentType === 'زيادة')) {
              newQty -= Number(voucherItem.quantity); // Was added, so subtract
            } else {
              newQty += Number(voucherItem.quantity); // Was subtracted, so add back
            }
            
            await setDoc(doc(db, 'stock', sourceDoc.id), {
              ...existingData,
              quantity: newQty,
              lastMovement: 'إلغاء السند',
              notes: 'تم استرجاع الكمية بسبب إلغاء السند',
              updatedAt: new Date().toISOString()
            });
          }
          
          // 2. Revert destination warehouse for transfers
          if (voucher.type === 'تحويل' && voucher.destinationWarehouse) {
            const destDoc = sourceSnapshot.docs.find(d => {
              const data = d.data();
              return data.warehouse === voucher.destinationWarehouse &&
                     (data.spec || '') === (voucherItem.spec || '');
            });
            
            if (destDoc) {
              const existingDestData = destDoc.data();
              // Transfer added to destination, so we subtract
              const newDestQty = Number(existingDestData.quantity || 0) - Number(voucherItem.quantity);
              await setDoc(doc(db, 'stock', destDoc.id), {
                ...existingDestData,
                quantity: newDestQty,
                lastMovement: 'إلغاء التحويل',
                notes: 'تم خصم الكمية بسبب إلغاء سند التحويل',
                updatedAt: new Date().toISOString()
              });
            }
          }
        }
      }
    }

    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error in deleteStockVoucher:", error);
    return false;
  }
};

export const approveStocktake = async (stocktakeData, surplusVoucher, deficitVoucher) => {
  try {
    const voucherIds = [];
    
    // 1. Save surplus voucher if exists (this also updates stock)
    if (surplusVoucher) {
      const savedSurplus = await saveStockVoucher(surplusVoucher);
      if (savedSurplus) voucherIds.push(savedSurplus.id);
    }
    
    // 2. Save deficit voucher if exists (this also updates stock)
    if (deficitVoucher) {
      const savedDeficit = await saveStockVoucher(deficitVoucher);
      if (savedDeficit) voucherIds.push(savedDeficit.id);
    }

    // 3. Update stocktake status to approved
    const docRef = doc(db, 'stocktakes', stocktakeData.id);
    const updatedStocktake = {
      ...stocktakeData,
      status: 'معتمد',
      approvedAt: new Date().toISOString(),
      voucherIds: voucherIds
    };
    await setDoc(docRef, updatedStocktake);
    
    return updatedStocktake;
  } catch (error) {
    console.error("Error in approveStocktake:", error);
    return null;
  }
};

export const deleteStocktakeAndRevert = async (stocktakeData) => {
  try {
    if (stocktakeData.status === 'معتمد') {
      // 1. Revert stock quantities
      // We need to fetch current stock to safely update
      const stockSnapshot = await getDocs(collection(db, 'stock'));
      
      for (const item of stocktakeData.items) {
        const diff = (item.physicalQuantity !== '' ? Number(item.physicalQuantity) : 0) - Number(item.bookQuantity);
        if (diff !== 0) {
          // Find the exact item in stock
          const stockDoc = stockSnapshot.docs.find(d => {
            const data = d.data();
            return data.itemNumber === item.itemNumber && 
                   data.warehouse === stocktakeData.warehouse && 
                   (data.spec || '') === (item.spec || '') && 
                   (data.location || '') === (item.location || '');
          });
          
          if (stockDoc) {
            const currentQty = Number(stockDoc.data().quantity || 0);
            // If diff was +5 (surplus), we subtract 5. If diff was -2 (deficit), we subtract -2 (which adds 2).
            const revertedQty = currentQty - diff; 
            await setDoc(doc(db, 'stock', stockDoc.id), {
              ...stockDoc.data(),
              quantity: revertedQty,
              updatedAt: new Date().toISOString()
            });
          }
        }
      }

      // 2. Delete generated vouchers
      if (stocktakeData.voucherIds && stocktakeData.voucherIds.length > 0) {
        for (const vId of stocktakeData.voucherIds) {
          await deleteDoc(doc(db, 'stock_vouchers', vId));
        }
      }
    }

    // 3. Delete the stocktake record itself
    await deleteDoc(doc(db, 'stocktakes', stocktakeData.id));
    return true;
  } catch (error) {
    console.error("Error in deleteStocktakeAndRevert:", error);
    return false;
  }
};

export const revertAuditVouchers = async (orderNumber) => {
  try {
    // 1. Find the approved vouchers for this order
    const qVouchers = query(collection(db, 'stock_vouchers'), where('orderNumber', '==', orderNumber), where('status', '==', 'معتمد'));
    const snapshot = await getDocs(qVouchers);
    if (snapshot.empty) return true; // Nothing to revert

    const outgoingVoucherDocs = snapshot.docs.filter(docSnap => ['إخراج', 'إتلاف'].includes(docSnap.data().type));
    if (outgoingVoucherDocs.length === 0) return true;
    const promises = outgoingVoucherDocs.map(async (docSnap) => {
      const voucher = docSnap.data();
      
      // 2. Revert the stock quantities (add back the deducted items)
      for (const voucherItem of voucher.items) {
        const qSource = query(collection(db, 'stock'), where('itemNumber', '==', voucherItem.itemNumber));
        const sourceSnapshot = await getDocs(qSource);
        const sourceDoc = sourceSnapshot.docs.find(d => {
          const data = d.data();
          return data.warehouse === voucher.warehouse &&
                 (data.location || '') === (voucherItem.location || '') &&
                 (data.spec || '') === (voucherItem.spec || '');
        });

        if (sourceDoc) {
          const existingData = sourceDoc.data();
          // Add back the quantity that was previously deducted
          let revertedQty = Number(existingData.quantity || 0) + Number(voucherItem.quantity);
          await setDoc(doc(db, 'stock', sourceDoc.id), {
            ...existingData,
            quantity: revertedQty,
            updatedAt: new Date().toISOString()
          });
        }
      }

      // 3. Delete the voucher document
      await deleteDoc(doc(db, 'stock_vouchers', docSnap.id));
    });

    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error("Error in revertAuditVouchers:", error);
    return false;
  }
};

export const revertReceiptVouchers = async (orderNumber) => {
  try {
    const qVouchers = query(collection(db, 'stock_vouchers'), where('orderNumber', '==', orderNumber), where('type', '==', 'إدخال'));
    const snapshot = await getDocs(qVouchers);
    if (snapshot.empty) return true;

    const promises = snapshot.docs.map(async (docSnap) => {
      const voucher = docSnap.data();
      
      for (const voucherItem of voucher.items) {
        const qSource = query(collection(db, 'stock'), where('itemNumber', '==', voucherItem.itemNumber));
        const sourceSnapshot = await getDocs(qSource);
        const sourceDoc = sourceSnapshot.docs.find(d => {
          const data = d.data();
          return data.warehouse === voucher.warehouse &&
                 (data.location || '') === (voucherItem.location || '') &&
                 (data.spec || '') === (voucherItem.spec || '');
        });

        if (sourceDoc) {
          const existingData = sourceDoc.data();
          let revertedQty = Number(existingData.quantity || 0) - Number(voucherItem.quantity);
          await setDoc(doc(db, 'stock', sourceDoc.id), {
            ...existingData,
            quantity: revertedQty < 0 ? 0 : revertedQty,
            updatedAt: new Date().toISOString()
          });
        }
      }

      await deleteDoc(doc(db, 'stock_vouchers', docSnap.id));
    });

    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error("Error in revertReceiptVouchers:", error);
    return false;
  }
};
