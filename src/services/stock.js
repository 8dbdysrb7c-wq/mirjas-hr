import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where
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

export const saveStockItem = async (item) => {
  try {
    const docRef = item.id ? doc(db, 'stock', item.id) : doc(collection(db, 'stock'));
    const id = docRef.id;
    const fullItem = { ...item, id, updatedAt: new Date().toISOString() };
    await setDoc(docRef, fullItem);
    return fullItem;
  } catch (error) {
    console.error("Error in saveStockItem:", error);
    return null;
  }
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
      
      const sourceDoc = sourceSnapshot.docs.find(docSnap => {
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
                 (data.location || '') === (voucherItem.location || '') &&
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
            location: voucherItem.location || '',
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

    const promises = snapshot.docs.map(async (docSnap) => {
      const voucher = docSnap.data();
      voucher.id = docSnap.id;
      voucher.status = 'معتمد';
      voucher.updatedAt = new Date().toISOString();
      await setDoc(doc(db, 'stock_vouchers', voucher.id), voucher);
      
      // Update stock quantities for this voucher
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
    await deleteDoc(doc(db, 'stock_vouchers', id));
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

    const promises = snapshot.docs.map(async (docSnap) => {
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
