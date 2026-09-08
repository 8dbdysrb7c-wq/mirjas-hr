import { db } from '../firebase';
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
  onSnapshot
} from 'firebase/firestore';
import { cascadeCustomerNameUpdate } from './cascadeUpdates';
import { triggerWhatsAppRouting } from './whatsappRouter';
import { buildReservedQuantityMap, cleanStockProductName, isCancelledOrder, isReservableSalesItem } from '../utils/stockAvailability';

export const getCustomers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'customers'));
    const customers = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    
    for (let c of customers) {
      if (!c.city) {
        c.city = 'عمان';
        await setDoc(doc(db, 'customers', c.id), c);
      }
    }
    
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

    return orderToSave;
  } catch (error) {
    console.error("Error in saveOrder:", error);
    return null;
  }
};

export const deleteOrder = async (id) => {
  try {
    const docRef = doc(db, 'orders', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const order = docSnap.data();
      // Trigger cancel notification
      triggerWhatsAppRouting('production_sewing', 'delete', {
        orderNumber: order.orderNumber,
        employeeId: order.responsibleEmployeeId || ''
      });
    }
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error in deleteOrder:", error);
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

export const subscribeToSalesOrders = (onOrders, onError = console.error) => onSnapshot(
  collection(db, 'sales_orders'),
  snapshot => onOrders(snapshot.docs.map(orderDoc => ({ ...orderDoc.data(), id: orderDoc.id }))),
  onError
);

export const saveSalesOrder = async (order) => {
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

    if (!orderToSave.id) {
      const orders = await getSalesOrders();
      const maxNum = orders.reduce((max, o) => {
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
    const terminalOrderStatuses = ['تم التسليم للتوصيل', 'تم تسليمها للتوصيل', 'تم التوصيل', 'ملغي', 'ملغى'];
    if (allItemsReady && !terminalOrderStatuses.includes(String(orderToSave.status || '').trim())) {
      orderToSave.status = 'جاهز للتسليم للتوصيل';
      orderToSave.readyForDeliveryAt = orderToSave.readyForDeliveryAt || new Date().toISOString();
      orderToSave.readyForDeliveryBy = orderToSave.lastActionBy || orderToSave.updatedBy || orderToSave.createdBy || 'النظام';
    }

    const allOrders = await getSalesOrders();
    const existingReservations = buildReservedQuantityMap(allOrders, orderToSave.id);
    const oldReservations = previousOrder ? buildReservedQuantityMap([previousOrder]) : {};
    const newReservations = (!orderToSave.stockDeducted && !isCancelledOrder(orderToSave))
      ? buildReservedQuantityMap([orderToSave])
      : {};
    const reservationKeys = [...new Set([...Object.keys(oldReservations), ...Object.keys(newReservations)])];
    const stockSnapshot = await getDocs(collection(db, 'stock'));
    const physicalByProduct = {};
    stockSnapshot.docs.forEach(stockDoc => {
      const item = stockDoc.data();
      const key = cleanStockProductName(`${String(item.name || '').trim()}${item.spec ? ` - ${String(item.spec).trim()}` : ''}`);
      physicalByProduct[key] = (physicalByProduct[key] || 0) + Number(item.quantity || 0);
    });

    await runTransaction(db, async transaction => {
      const reservationSnapshots = new Map();
      for (const key of reservationKeys) {
        const reservationRef = doc(db, 'stock_reservations', encodeURIComponent(key));
        reservationSnapshots.set(key, { ref: reservationRef, snap: await transaction.get(reservationRef) });
      }

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

    return orderToSave;
  } catch (error) {
    console.error("Error in saveSalesOrder:", error);
    return null;
  }
};

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
    if (!draft?.id || !draft?.userId) return null;
    const cleanDraft = JSON.parse(JSON.stringify({
      ...draft,
      userId: String(draft.userId),
      updatedAt: new Date().toISOString()
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
