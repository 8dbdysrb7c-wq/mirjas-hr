import { db } from '../firebase';
import { hasDraftItems } from '../utils/salesDrafts';
import { 
  collection, 
  getDocs, 
  getDoc,
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  runTransaction,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { cascadeCustomerNameUpdate } from './cascadeUpdates';
import { triggerWhatsAppRouting } from './whatsappRouter';
import { buildReservedQuantityMap, cleanStockProductName, isCancelledOrder, isReservableSalesItem } from '../utils/stockAvailability';

export const getCustomers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'customers'));
    const customers = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        city: data.city || 'عمان',
        id: doc.id
      };
    });
    return customers;
  } catch (error) {
    console.error("Error in getCustomers:", error);
    return [];
  }
};

export const saveCustomer = async (customer) => {
  try {
    let oldName = null;
    const docRef = customer.id ? doc(db, 'customers', customer.id) : doc(collection(db, 'customers'));
    
    if (customer.id) {
      const existingDoc = await getDoc(docRef);
      if (existingDoc.exists()) {
        oldName = existingDoc.data().name;
      }
    }

    const id = docRef.id;
    let finalCustomerNumber = customer.customerNumber;

    if (!customer.id) {
      // Force generate ID for new customers to prevent duplicates from frontend
      const type = customer.type || 'عميل';
      const prefix = type === 'مورد' ? 'SUP-' : 'CLI-';
      const allCusts = await getDocs(collection(db, 'customers'));
      let maxNum = 0;
      allCusts.forEach(d => {
        const c = d.data();
        if (c.customerNumber && c.customerNumber.startsWith(prefix)) {
          const num = parseInt(c.customerNumber.replace(prefix, ''), 10);
          if (num > maxNum) maxNum = num;
        }
      });
      finalCustomerNumber = `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
    }

    const fullCustomer = { createdAt: new Date().toISOString(), status: 'نشط', ...customer, customerNumber: finalCustomerNumber, id };
    await setDoc(docRef, fullCustomer);

    // Trigger cascade update if name changed
    if (oldName && oldName !== customer.name) {
      cascadeCustomerNameUpdate(oldName, customer.name); // Async fire-and-forget
    }

    return fullCustomer;
  } catch (error) {
    console.error("Error in saveCustomer:", error);
    return null;
  }
};

export const deleteCustomer = async (id) => {
  try {
    await deleteDoc(doc(db, 'customers', id));
  } catch (error) {
    console.error("Error in deleteCustomer:", error);
  }
};

export const getOrders = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'orders'));
    return querySnapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id }))
      // Legacy preparation cards were copied into both collections. Keep them
      // available in preparation_orders, but never expose them as sewing or
      // packaging production orders.
      .filter(order => !String(order.orderNumber || '').trim().toUpperCase().startsWith('PREP-'));
  } catch (error) {
    console.error("Error in getOrders:", error);
    return [];
  }
};

export const syncProductionStatusToSalesOrder = async (prodOrPrepOrder, orderType = 'auto') => {
  if (!prodOrPrepOrder) return false;
  try {
    const isPrep = orderType === 'preparation' || 
      String(prodOrPrepOrder.orderNumber || '').toUpperCase().startsWith('PREP-') ||
      !!prodOrPrepOrder.hasPreparationDetails;

    let salesOrderDoc = null;
    if (prodOrPrepOrder.salesOrderId) {
      const snap = await getDoc(doc(db, 'sales_orders', prodOrPrepOrder.salesOrderId));
      if (snap.exists()) {
        salesOrderDoc = { ...snap.data(), id: snap.id };
      }
    }

    if (!salesOrderDoc && prodOrPrepOrder.salesOrderNumber) {
      const q = query(collection(db, 'sales_orders'), where('orderNumber', '==', prodOrPrepOrder.salesOrderNumber), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        salesOrderDoc = { ...snap.docs[0].data(), id: snap.docs[0].id };
      }
    }

    if (!salesOrderDoc && prodOrPrepOrder.orderNotes) {
      const match = prodOrPrepOrder.orderNotes.match(/ORD-\d+/);
      if (match) {
        const q = query(collection(db, 'sales_orders'), where('orderNumber', '==', match[0]), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          salesOrderDoc = { ...snap.docs[0].data(), id: snap.docs[0].id };
        }
      }
    }

    if (!salesOrderDoc || !Array.isArray(salesOrderDoc.items) || salesOrderDoc.items.length === 0) {
      return false;
    }

    const normalize = str => String(str || '').replace(/أ|إ|آ/g, 'ا').replace(/ى/g, 'ي').trim().replace(/\s+/g, ' ');
    const cardStatus = prodOrPrepOrder.status || '';
    const cardItems = Array.isArray(prodOrPrepOrder.items) && prodOrPrepOrder.items.length > 0 
      ? prodOrPrepOrder.items 
      : [{ productName: prodOrPrepOrder.productName, quantity: prodOrPrepOrder.quantity, status: cardStatus }];

    let hasChanged = false;
    const updatedSalesItems = salesOrderDoc.items.map(salesItem => {
      const sName = normalize(salesItem.productName);
      const matchedCardItem = cardItems.find(ci => {
        const cName = normalize(ci.productName);
        return cName === sName || cName.includes(sName) || sName.includes(cName);
      }) || (cardItems.length === 1 && salesOrderDoc.items.length === 1 ? cardItems[0] : null);

      if (!matchedCardItem) {
        return salesItem;
      }

      let newStatus = salesItem.itemStatus;

      if (isPrep) {
        const isFinished = cardStatus === 'منتهي' || matchedCardItem.status === 'منتهي' || matchedCardItem.status === 'جاهز';
        const isCancelled = cardStatus === 'ملغي' || matchedCardItem.status === 'ملغي';

        if (isFinished) {
          newStatus = 'جاهز';
        } else if (isCancelled) {
          newStatus = 'ملغي';
        } else {
          newStatus = 'قيد التحضير';
        }
      } else {
        const isFinished = cardStatus === 'منتهي' || matchedCardItem.status === 'منتهي' || matchedCardItem.status === 'جاهز';
        const isCancelled = cardStatus === 'ملغي' || matchedCardItem.status === 'ملغي';

        if (isFinished) {
          newStatus = 'جاهز';
        } else if (isCancelled) {
          newStatus = 'ملغي';
        } else if (matchedCardItem.stageQuantities) {
          const sq = matchedCardItem.stageQuantities;
          const sewing = Number(sq.sewing || 0);
          const pending = Number(sq.pendingPackaging || 0);
          const pkg = Number(sq.packaging || 0);
          const fin = Number(sq.finished || 0);
          const tot = Number(matchedCardItem.quantity || (sewing + pending + pkg + fin) || 0);

          if (tot > 0 && fin >= tot) {
            newStatus = 'جاهز';
          } else if (pending > 0 || pkg > 0 || (fin > 0 && sewing === 0)) {
            newStatus = 'إنتاج قيد التغليف';
          } else {
            newStatus = 'إنتاج قيد الخياطة';
          }
        } else {
          const cItemStatus = matchedCardItem.status || cardStatus;
          if (['مرحلة التغليف', 'بانتظار استلام التغليف', 'تحويل جزئي للتغليف', 'تغليف جزئي', 'تم التحويل إلى قسم التغليف'].includes(cItemStatus)) {
            newStatus = 'إنتاج قيد التغليف';
          } else {
            newStatus = 'إنتاج قيد الخياطة';
          }
        }
      }

      if (newStatus && newStatus !== salesItem.itemStatus) {
        hasChanged = true;
        let itemToReturn = { ...salesItem, itemStatus: newStatus };
        if (newStatus === 'ملغي') {
          const noteText = isPrep ? '(تم إلغاء الصنف في التحضير)' : '(تم إلغاء الصنف في الإنتاج)';
          const currNotes = itemToReturn.notes || '';
          if (!currNotes.includes(noteText)) {
            itemToReturn.notes = currNotes ? `${currNotes} ${noteText}` : noteText;
          }
        }
        return itemToReturn;
      }
      return salesItem;
    });

    if (hasChanged) {
      const orderRef = doc(db, 'sales_orders', salesOrderDoc.id);
      await setDoc(orderRef, {
        items: updatedSalesItems,
        lastActionBy: isPrep ? 'نظام التحضير' : 'نظام الإنتاج',
        statusUpdateDate: new Date().toISOString().split('T')[0]
      }, { merge: true });
      return true;
    }
    return false;
  } catch (err) {
    console.error("Error in syncProductionStatusToSalesOrder:", err);
    return false;
  }
};

export const saveOrder = async (order) => {
  try {
    let orderToSave = { ...order };
    let isNew = !orderToSave.id;
    let oldStatus = null;
    if (!isNew) {
      try {
        const oldSnap = await getDoc(doc(db, 'orders', orderToSave.id));
        if (oldSnap.exists()) {
          oldStatus = oldSnap.data().status;
        }
      } catch (e) {}
    }
    
    if (!orderToSave.id) {
      const orders = await getOrders();
      const maxNum = orders.reduce((max, o) => {
        const match = String(o.orderNumber || '').match(/\d+/);
        return match ? Math.max(max, parseInt(match[0], 10)) : max;
      }, 0);
      orderToSave.orderNumber = `PRO-${String(maxNum + 1).padStart(4, '0')}`;
      
      const docRef = doc(collection(db, 'orders'));
      orderToSave.id = docRef.id;
      await setDoc(docRef, orderToSave);
    } else {
      if (oldStatus !== orderToSave.status) {
        orderToSave.statusHistory = [
          ...(Array.isArray(orderToSave.statusHistory) ? orderToSave.statusHistory : []),
          {
            from: oldStatus || '',
            to: orderToSave.status,
            changedAt: new Date().toISOString(),
            changedBy: orderToSave.lastActionBy || orderToSave.updatedBy || 'النظام'
          }
        ];
      }
      await setDoc(doc(db, 'orders', orderToSave.id), orderToSave);
    }
    
    // Trigger WhatsApp notification
    if (isNew) {
      triggerWhatsAppRouting('production_sewing', 'create', {
        orderNumber: orderToSave.orderNumber,
        productName: orderToSave.productName || (orderToSave.items && orderToSave.items[0]?.productName) || 'صنف غير محدد',
        quantity: orderToSave.quantity || (orderToSave.items && orderToSave.items[0]?.quantity) || '1',
        employeeId: orderToSave.responsibleEmployeeId || ''
      });
    } else if (oldStatus !== orderToSave.status) {
      triggerWhatsAppRouting('production_sewing', 'update', {
        orderNumber: orderToSave.orderNumber,
        status: orderToSave.status,
        employeeId: orderToSave.responsibleEmployeeId || ''
      });
    }

    try {
      await syncProductionStatusToSalesOrder(orderToSave, 'production');
    } catch (e) {
      console.error("Error syncing production order to sales:", e);
    }

    return orderToSave;
  } catch (error) {
    console.error("Error in saveOrder:", error);
    return null;
  }
};

export const deleteOrder = async (id, actor = null) => {
  try {
    const docRef = doc(db, 'orders', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const order = docSnap.data();
      // Safely archive before deleting
      try {
        await setDoc(doc(collection(db, 'production_order_archives')), {
          ...order,
          originalId: id,
          deletedBy: actor?.name || actor?.id || 'admin',
          deletedAt: new Date().toISOString()
        });
      } catch (archErr) {
        console.warn("Archive write error:", archErr);
      }

      // Trigger cancel notification
      triggerWhatsAppRouting('production_sewing', 'delete', {
        orderNumber: order.orderNumber,
        employeeId: order.responsibleEmployeeId || ''
      });
    }
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error in deleteOrder:", error);
    throw error;
  }
};

export const getPreparationOrders = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'preparation_orders'));
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getPreparationOrders:", error);
    return [];
  }
};

export const getPreparationOrdersByDateRange = async (dateFrom, dateTo) => {
  try {
    let conditions = [];
    if (dateFrom) conditions.push(where('createdAt', '>=', dateFrom));
    if (dateTo) {
      const nextDay = new Date(dateTo);
      nextDay.setDate(nextDay.getDate() + 1);
      conditions.push(where('createdAt', '<', nextDay.toISOString()));
    }
    const q = query(collection(db, 'preparation_orders'), ...conditions, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getPreparationOrdersByDateRange:", error);
    return [];
  }
};

export const savePreparationOrder = async (order) => {
  try {
    let orderToSave = { ...order };
    let isNew = !orderToSave.id;
    let oldOrder = null;
    if (!isNew) {
      const docSnap = await getDoc(doc(db, 'preparation_orders', orderToSave.id));
      if (docSnap.exists()) {
        oldOrder = docSnap.data();
      }
    }
    
    if (!orderToSave.id) {
      const orders = await getPreparationOrders();
      const maxNum = orders.reduce((max, o) => {
        const match = String(o.orderNumber || '').match(/\d+/);
        return match ? Math.max(max, parseInt(match[0], 10)) : max;
      }, 0);
      orderToSave.orderNumber = `PREP-${String(maxNum + 1).padStart(4, '0')}`;
      
      const docRef = doc(collection(db, 'preparation_orders'));
      orderToSave.id = docRef.id;
      await setDoc(docRef, orderToSave);
    } else {
      await setDoc(doc(db, 'preparation_orders', orderToSave.id), orderToSave);
    }
    
    // Trigger WhatsApp notification for preparation production
    if (isNew) {
      triggerWhatsAppRouting('production_preparation', 'create', {
        orderNumber: orderToSave.orderNumber,
        productName: orderToSave.productName || (orderToSave.items && orderToSave.items[0]?.productName) || 'صنف غير محدد',
        quantity: orderToSave.quantity || (orderToSave.items && orderToSave.items[0]?.quantity) || '1',
        employeeId: orderToSave.responsibleEmployeeId || ''
      });
    } else if (oldOrder && oldOrder.status !== orderToSave.status) {
      triggerWhatsAppRouting('production_preparation', 'update', {
        orderNumber: orderToSave.orderNumber,
        status: orderToSave.status,
        employeeId: orderToSave.responsibleEmployeeId || ''
      });
    }

    try {
      await syncProductionStatusToSalesOrder(orderToSave, 'preparation');
    } catch (e) {
      console.error("Error syncing preparation order to sales:", e);
    }

    return orderToSave;
  } catch (error) {
    console.error("Error in savePreparationOrder:", error);
    return null;
  }
};

export const deletePreparationOrder = async (id) => {
  try {
    const docRef = doc(db, 'preparation_orders', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const order = docSnap.data();
      // Trigger cancel notification for preparation production
      triggerWhatsAppRouting('production_preparation', 'delete', {
        orderNumber: order.orderNumber,
        employeeId: order.responsibleEmployeeId || ''
      });
    }
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error in deletePreparationOrder:", error);
  }
};

export const updateOrderStatus = async (orderId, status) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const docSnap = await getDoc(orderRef);
    if (docSnap.exists()) {
      const oldOrder = docSnap.data();
      const updatedOrder = { 
        ...oldOrder, 
        status,
        statusUpdateDate: new Date().toISOString().split('T')[0],
        statusHistory: oldOrder.status === status ? (oldOrder.statusHistory || []) : [
          ...(Array.isArray(oldOrder.statusHistory) ? oldOrder.statusHistory : []),
          {
            from: oldOrder.status || '',
            to: status,
            changedAt: new Date().toISOString(),
            changedBy: 'النظام'
          }
        ]
      };
      await setDoc(orderRef, updatedOrder, { merge: true });
      // Trigger status change notification
      if (oldOrder.status !== status) {
        triggerWhatsAppRouting('production_sewing', 'update', {
          orderNumber: oldOrder.orderNumber,
          status,
          employeeId: oldOrder.responsibleEmployeeId || ''
        });
      }
    }
  } catch (error) {
    console.error("Error in updateOrderStatus:", error);
  }
};

export const getSalesOrders = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'sales_orders'));
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getSalesOrders:", error);
    return [];
  }
};

export const getActiveSalesOrders = async () => {
  try {
    const q = query(collection(db, 'sales_orders'), where('status', 'not-in', ['منتهي', 'تم التسليم', 'ملغي']));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getActiveSalesOrders:", error);
    return [];
  }
};

export const getActiveOrders = async () => {
  try {
    const q = query(collection(db, 'orders'), where('status', 'not-in', ['منتهي', 'تم التسليم', 'تم التوصيل', 'تم التسليم للتوصيل', 'ملغي', 'جاهز']));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id }))
      .filter(order => !String(order.orderNumber || '').trim().toUpperCase().startsWith('PREP-'));
  } catch (error) {
    console.error("Error in getActiveOrders:", error);
    return [];
  }
};

export const getActivePreparationOrders = async () => {
  try {
    const q = query(collection(db, 'preparation_orders'), where('status', 'not-in', ['منتهي', 'تم التسليم', 'تم التوصيل', 'تم التسليم للتوصيل', 'ملغي', 'جاهز']));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getActivePreparationOrders:", error);
    return [];
  }
};

export const subscribeToSalesOrders = (onOrders, onError = console.error, orderLimit = 50) => {
  let activeDocs = new Map();
  let recentDocs = new Map();

  const emit = () => {
    const merged = new Map([...recentDocs, ...activeDocs]);
    const sorted = Array.from(merged.values()).sort((a, b) => {
      return String(b.orderNumber || '').localeCompare(String(a.orderNumber || ''));
    });
    onOrders(sorted);
  };

  let unsubActive = () => {};
  let unsubRecent = () => {};

  // If orderLimit is null (fetch all), we only need ONE subscription to fetch everything.
  // This prevents overlapping reads.
  if (orderLimit === null) {
    const qAll = collection(db, 'sales_orders');
    unsubRecent = onSnapshot(qAll, (snapshot) => {
      recentDocs.clear();
      snapshot.docs.forEach(doc => recentDocs.set(doc.id, { ...doc.data(), id: doc.id }));
      emit();
    }, onError);
  } else {
    // Query 1: All active orders (strictly not in closed statuses)
    const qActive = query(collection(db, 'sales_orders'), where('status', 'not-in', ['منتهي', 'تم التسليم', 'ملغي']));
    unsubActive = onSnapshot(qActive, (snapshot) => {
      activeDocs.clear();
      snapshot.docs.forEach(doc => activeDocs.set(doc.id, { ...doc.data(), id: doc.id }));
      emit();
    }, onError);

    // Query 2: Closed orders limited (strictly in closed statuses - 0% overlap with Query 1)
    const qClosed = query(collection(db, 'sales_orders'), where('status', 'in', ['منتهي', 'تم التسليم', 'ملغي']), limit(orderLimit));
    unsubRecent = onSnapshot(qClosed, (snapshot) => {
      recentDocs.clear();
      snapshot.docs.forEach(doc => recentDocs.set(doc.id, { ...doc.data(), id: doc.id }));
      emit();
    }, onError);
  }

  return () => {
    unsubActive();
    unsubRecent();
  };
};

// Final approval changes workflow metadata only, never item quantities or stock reservations.
export const approveSalesOrder = async (orderId, approval, allowIncomplete = false) => {
  const ref = doc(db, 'sales_orders', orderId);
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('الطلبية غير موجودة');
    const current = snapshot.data();
    if (current.status === 'منتهي') return { ...current, id: orderId };
    if (!allowIncomplete && current.deliveryStatus !== 'تم الإنجاز') throw new Error('يجب إنجاز التسليم قبل الموافقة النهائية');
    const updates = {
      status: 'منتهي', managerApprovedAt: new Date().toISOString(),
      managerApprovedById: approval.userId || '', managerApprovedBy: approval.userName || 'المدير',
      managerApprovalOverride: allowIncomplete && current.deliveryStatus !== 'تم الإنجاز',
      lastActionBy: approval.userName || 'المدير', statusUpdateDate: approval.date
    };
    transaction.update(ref, updates);
    return { ...current, ...updates, id: orderId };
  });
};

export const saveSalesOrder = async (order, { preserveStatus = false } = {}) => {
  try {
    let orderToSave = { ...order };
    let isNew = !orderToSave.id;
    let oldStatus = null;
    let previousOrder = null;
    if (!isNew) {
      try {
        const oldSnap = await getDoc(doc(db, 'sales_orders', orderToSave.id));
        if (oldSnap.exists()) {
          previousOrder = { ...oldSnap.data(), id: oldSnap.id };
          oldStatus = oldSnap.data().status;
        }
      } catch (e) {}
    }

    const oldReservations = previousOrder ? buildReservedQuantityMap([previousOrder]) : {};
    const newReservations = (!orderToSave.stockDeducted && !isCancelledOrder(orderToSave))
      ? buildReservedQuantityMap([orderToSave])
      : {};
    const reservationKeys = [...new Set([...Object.keys(oldReservations), ...Object.keys(newReservations)])];

    // Collect candidate stock product names to query only what this order needs
    const candidateNames = [...new Set([
      ...reservationKeys,
      ...reservationKeys.map(k => k.split(' - ')[0].trim()),
      ...(orderToSave.items || []).map(i => cleanStockProductName(i.productName || i.name)),
      ...(previousOrder?.items || []).map(i => cleanStockProductName(i.productName || i.name))
    ])].filter(Boolean);

    // Targeted reads: fetch relevant orders and only relevant stock items in parallel
    const ordersPromise = (async () => {
      try {
        if (!orderToSave.id) {
          const recentSnap = await getDocs(query(collection(db, 'sales_orders'), orderBy('orderNumber', 'desc'), limit(10)));
          return recentSnap.docs.map(d => ({ ...d.data(), id: d.id }));
        } else {
          const activeSnap = await getDocs(query(
            collection(db, 'sales_orders'),
            where('status', 'in', ['جديد', 'قيد التجهيز', 'قيد التنفيذ', 'جاهز', 'قيد الإنتاج', 'قيد التحضير', 'جاهز للتسليم', 'جاهز للتسليم للتوصيل'])
          ));
          return activeSnap.docs.map(d => ({ ...d.data(), id: d.id }));
        }
      } catch (err) {
        console.error("Error fetching targeted sales orders:", err);
        throw new Error('تعذر قراءة بيانات الطلبيات للتحقق من الترقيم والحجز. تم إلغاء العملية لمنع استنزاف الحصة.');
      }
    })();

    const stockPromise = (async () => {
      if (candidateNames.length === 0) {
        return { docs: [] };
      }
      try {
        // Chunk candidate product names in batches of 30 to satisfy Firestore 'in' limit without omitting any items
        const chunks = [];
        for (let i = 0; i < candidateNames.length; i += 30) {
          chunks.push(candidateNames.slice(i, i + 30));
        }
        const snapshots = await Promise.all(
          chunks.map(chunk => getDocs(query(collection(db, 'stock'), where('name', 'in', chunk))))
        );
        const docs = [];
        snapshots.forEach(snap => {
          (snap?.docs || []).forEach(d => docs.push(d));
        });
        return { docs };
      } catch (err) {
        console.error("Error fetching targeted stock items:", err);
        throw new Error('تعذر قراءة بيانات المخزون المحددة للتحقق من الكميات. تم إلغاء العملية لمنع استنزاف الحصة.');
      }
    })();

    const [relevantOrders, stockSnapshot] = await Promise.all([ordersPromise, stockPromise]);

    if (!orderToSave.id) {
      const maxNum = relevantOrders.reduce((max, o) => {
        const str = String(o.orderNumber || '');
        if (str.startsWith('ORD-')) {
          const match = str.match(/ORD-(\d+)/);
          return match ? Math.max(max, parseInt(match[1], 10)) : max;
        }
        return max;
      }, 0);
      orderToSave.orderNumber = `ORD-${String(maxNum + 1).padStart(4, '0')}`;
      orderToSave.id = doc(collection(db, 'sales_orders')).id;
    }

    // Promote the whole sales order as soon as every line is ready. Never move
    // delivered or cancelled orders backwards when they are edited later.
    const items = Array.isArray(orderToSave.items) ? orderToSave.items : [];
    const allItemsReady = items.length > 0 && items.every(item => String(item.itemStatus || '').trim() === 'جاهز');
    const terminalOrderStatuses = ['منتهي', 'تم التسليم', 'تم التسليم للتوصيل', 'تم تسليمها للتوصيل', 'تم التوصيل', 'ملغي', 'ملغى'];
    if (!preserveStatus && allItemsReady && !terminalOrderStatuses.includes(String(orderToSave.status || '').trim())) {
      orderToSave.status = 'جاهز للتسليم للتوصيل';
      orderToSave.readyForDeliveryAt = orderToSave.readyForDeliveryAt || new Date().toISOString();
      orderToSave.readyForDeliveryBy = orderToSave.lastActionBy || orderToSave.updatedBy || orderToSave.createdBy || 'النظام';
    }

    const existingReservations = buildReservedQuantityMap(relevantOrders, orderToSave.id);
    const physicalByProduct = {};
    stockSnapshot.docs.forEach(stockDoc => {
      const item = stockDoc.data();
      const key = cleanStockProductName(`${String(item.name || '').trim()}${item.spec ? ` - ${String(item.spec).trim()}` : ''}`);
      physicalByProduct[key] = (physicalByProduct[key] || 0) + Number(item.quantity || 0);
      const rawName = cleanStockProductName(item.name);
      if (rawName && physicalByProduct[rawName] === undefined) {
        physicalByProduct[rawName] = Number(item.quantity || 0);
      }
    });

    await runTransaction(db, async transaction => {
      const reservationSnapshots = new Map();
      await Promise.all(reservationKeys.map(async key => {
        const reservationRef = doc(db, 'stock_reservations', encodeURIComponent(key));
        reservationSnapshots.set(key, { ref: reservationRef, snap: await transaction.get(reservationRef) });
      }));

      for (const key of reservationKeys) {
        const entry = reservationSnapshots.get(key);
        const storedTotal = entry.snap.exists()
          ? Number(entry.snap.data().quantity || 0)
          : Number(existingReservations[key] || 0) + Number(oldReservations[key] || 0);
        const nextTotal = Math.max(0, storedTotal - Number(oldReservations[key] || 0) + Number(newReservations[key] || 0));
        const hasReservableItem = (orderToSave.items || []).some(item => cleanStockProductName(item.productName || item.name) === key && isReservableSalesItem(item));
        if (hasReservableItem && nextTotal > Number(physicalByProduct[key] || 0)) {
          throw new Error(`الكمية المتاحة للصنف ${key} لا تكفي بسبب حجز طلبية أخرى في نفس الوقت`);
        }
        transaction.set(entry.ref, {
          productKey: key,
          quantity: nextTotal,
          updatedAt: new Date().toISOString(),
          lastOrderNumber: orderToSave.orderNumber || ''
        });
      }

      transaction.set(doc(db, 'sales_orders', orderToSave.id), orderToSave);
    });

    // Trigger WhatsApp notification
    if (isNew) {
      triggerWhatsAppRouting('orders', 'create', {
        orderNumber: orderToSave.orderNumber,
        totalPrice: orderToSave.totalPrice || '0',
        customerName: orderToSave.customerName || 'غير محدد',
        employeeId: orderToSave.salespersonId || ''
      });
    } else if (oldStatus !== orderToSave.status) {
      triggerWhatsAppRouting('orders', 'update', {
        orderNumber: orderToSave.orderNumber,
        status: orderToSave.status,
        totalPrice: orderToSave.totalPrice || '0',
        employeeId: orderToSave.salespersonId || ''
      });
    }

    saveSalesOrder.lastError = null;
    return orderToSave;
  } catch (error) {
    console.error("Error in saveSalesOrder:", error);
    saveSalesOrder.lastError = error;
    return null;
  }
};
saveSalesOrder.lastError = null;

export const deleteSalesOrder = async (id) => {
  try {
    const docRef = doc(db, 'sales_orders', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const order = docSnap.data();
      triggerWhatsAppRouting('orders', 'delete', {
        orderNumber: order.orderNumber,
        employeeId: order.salespersonId || ''
      });
    }
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error in deleteSalesOrder:", error);
  }
};

// Drafts are intentionally stored outside sales_orders so they never receive an
// official order number or enter production/stock workflows.
export const getSalesOrderDrafts = async (userId) => {
  if (!userId) return [];
  try {
    const snapshot = await getDocs(query(collection(db, 'sales_order_drafts'), where('userId', '==', String(userId))));
    return snapshot.docs
      .map(d => ({ ...d.data(), id: d.id }))
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  } catch (error) {
    console.error('Error fetching sales order drafts:', error);
    return [];
  }
};

export const saveSalesOrderDraft = async (draft) => {
  try {
    if (!draft?.id || !draft?.userId || !hasDraftItems(draft)) return null;
    const cleanDraft = JSON.parse(JSON.stringify({
      ...draft,
      userId: String(draft.userId),
      updatedAt: draft.updatedAt || new Date().toISOString()
    }));
    await setDoc(doc(db, 'sales_order_drafts', cleanDraft.id), cleanDraft);
    return cleanDraft;
  } catch (error) {
    console.error('Error saving sales order draft:', error);
    return null;
  }
};

export const deleteSalesOrderDraft = async (id) => {
  if (!id) return false;
  try {
    await deleteDoc(doc(db, 'sales_order_drafts', id));
    return true;
  } catch (error) {
    console.error('Error deleting sales order draft:', error);
    return false;
  }
};

export const getProductionLogs = async () => {
  try {
    const q = query(collection(db, 'production_logs'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching production logs:", error);
    return [];
  }
};

export const saveProductionLog = async (logData) => {
  try {
    if (logData.id) {
      await setDoc(doc(db, 'production_logs', logData.id), logData, { merge: true });
    } else {
      const logs = await getProductionLogs();
      const maxNum = logs.reduce((max, o) => {
        const str = String(o.productionNumber || '');
        if (str.startsWith('PRO-')) {
          const match = str.match(/PRO-(\d+)/);
          return match ? Math.max(max, parseInt(match[1], 10)) : max;
        }
        return max;
      }, 0);
      const productionNumber = `PRO-${String(maxNum + 1).padStart(4, '0')}`;
      
      const newRef = doc(collection(db, 'production_logs'));
      await setDoc(newRef, { ...logData, id: newRef.id, productionNumber, createdAt: new Date().toISOString() });
    }
  } catch (error) {
    console.error("Error saving production log:", error);
  }
};

export const deleteProductionLog = async (id) => {
  try {
    await deleteDoc(doc(db, 'production_logs', id));
  } catch (error) {
    console.error("Error deleting production log:", error);
  }
};

export const getSalesOrdersByDateRange = async (dateFrom, dateTo) => {
  try {
    let q = collection(db, 'sales_orders');
    if (dateFrom || dateTo) {
      let conditions = [];
      if (dateFrom) conditions.push(where('orderDate', '>=', dateFrom));
      if (dateTo) conditions.push(where('orderDate', '<=', dateTo));
      q = query(q, ...conditions);
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getSalesOrdersByDateRange:", error);
    return [];
  }
};

export const getOrdersByDateRange = async (dateFrom, dateTo) => {
  try {
    let q = collection(db, 'orders');
    if (dateFrom || dateTo) {
      let conditions = [];
      if (dateFrom) conditions.push(where('orderDate', '>=', dateFrom));
      if (dateTo) conditions.push(where('orderDate', '<=', dateTo));
      q = query(q, ...conditions);
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getOrdersByDateRange:", error);
    return [];
  }
};

export const getRepVisits = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'rep_visits'));
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getRepVisits:", error);
    return [];
  }
};

export const getRepVisitsForUser = async (employeeId) => {
  try {
    const q = query(collection(db, 'rep_visits'), where('employeeId', '==', String(employeeId)));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getRepVisitsForUser:", error);
    return [];
  }
};

export const saveRepVisit = async (visit) => {
  try {
    const docRef = visit.id ? doc(db, 'rep_visits', visit.id) : doc(collection(db, 'rep_visits'));
    const fullVisit = { createdAt: new Date().toISOString(), ...visit, id: docRef.id };
    await setDoc(docRef, fullVisit);
    return fullVisit;
  } catch (error) {
    console.error("Error in saveRepVisit:", error);
    return null;
  }
};

export const deleteRepVisit = async (id) => {
  try {
    await deleteDoc(doc(db, 'rep_visits', id));
  } catch (error) {
    console.error("Error in deleteRepVisit:", error);
  }
};

export const getRepVisitsByDateRange = async (dateFrom, dateTo) => {
  try {
    let q = collection(db, 'rep_visits');
    if (dateFrom || dateTo) {
      let conditions = [];
      if (dateFrom) conditions.push(where('date', '>=', dateFrom));
      if (dateTo) conditions.push(where('date', '<=', dateTo));
      q = query(q, ...conditions);
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getRepVisitsByDateRange:", error);
    return [];
  }
};
