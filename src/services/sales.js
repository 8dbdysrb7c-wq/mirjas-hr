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
    const docRef = customer.id ? doc(db, 'customers', customer.id) : doc(collection(db, 'customers'));
    const id = docRef.id;
    const fullCustomer = { createdAt: new Date().toISOString(), status: 'نشط', ...customer, id };
    await setDoc(docRef, fullCustomer);
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
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getOrders:", error);
    return [];
  }
};

export const saveOrder = async (order) => {
  try {
    let orderToSave = { ...order };
    
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
      await setDoc(doc(db, 'orders', orderToSave.id), orderToSave);
    }
    
    return orderToSave;
  } catch (error) {
    console.error("Error in saveOrder:", error);
    return null;
  }
};

export const deleteOrder = async (id) => {
  try {
    await deleteDoc(doc(db, 'orders', id));
  } catch (error) {
    console.error("Error in deleteOrder:", error);
  }
};

export const updateOrderStatus = async (orderId, status) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const docSnap = await getDoc(orderRef);
    if (docSnap.exists()) {
      await setDoc(orderRef, { 
        ...docSnap.data(), 
        status,
        statusUpdateDate: new Date().toISOString().split('T')[0]
      }, { merge: true });
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

export const saveSalesOrder = async (order) => {
  try {
    let orderToSave = { ...order };
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
      const docRef = doc(collection(db, 'sales_orders'));
      orderToSave.id = docRef.id;
      await setDoc(docRef, orderToSave);
    } else {
      await setDoc(doc(db, 'sales_orders', orderToSave.id), orderToSave);
    }
    return orderToSave;
  } catch (error) {
    console.error("Error in saveSalesOrder:", error);
    return null;
  }
};

export const deleteSalesOrder = async (id) => {
  try {
    await deleteDoc(doc(db, 'sales_orders', id));
  } catch (error) {
    console.error("Error in deleteSalesOrder:", error);
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
