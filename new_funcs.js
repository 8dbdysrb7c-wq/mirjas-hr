
export const getReportsByDateRange = async (dateFrom, dateTo) => {
  try {
    let q = collection(db, 'reports');
    if (dateFrom || dateTo) {
      let conditions = [];
      if (dateFrom) conditions.push(where('date', '>=', dateFrom));
      if (dateTo) conditions.push(where('date', '<=', dateTo));
      q = query(q, ...conditions);
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getReportsByDateRange:", error);
    return [];
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

export const getMissionsByDateRange = async (dateFrom, dateTo) => {
  try {
    let q = collection(db, 'delivery_missions');
    if (dateFrom || dateTo) {
      let conditions = [];
      if (dateFrom) conditions.push(where('createdAt', '>=', dateFrom));
      if (dateTo) conditions.push(where('createdAt', '<=', dateTo + 'T23:59:59'));
      q = query(q, ...conditions);
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getMissionsByDateRange:", error);
    return [];
  }
};
