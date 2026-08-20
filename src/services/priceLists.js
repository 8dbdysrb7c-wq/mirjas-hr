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
import { masterPriceListCatalog } from '../data/masterPriceListCatalog';

export const getPriceLists = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'priceLists'));
    return querySnapshot.docs.map(d => ({ ...d.data(), id: d.id }));
  } catch (error) {
    console.error("Error in getPriceLists:", error);
    try {
      const local = localStorage.getItem('local_price_lists');
      return local ? JSON.parse(local) : [];
    } catch (e) {
      return [];
    }
  }
};

export const savePriceList = async (priceList) => {
  try {
    const docRef = priceList.id ? doc(db, 'priceLists', priceList.id) : doc(collection(db, 'priceLists'));
    const id = docRef.id;

    let code = priceList.code;
    if (!code) {
      const now = new Date();
      const yr = now.getFullYear().toString().slice(-2);
      const rand = Math.floor(1000 + Math.random() * 9000);
      code = `PL${yr}-${rand}`;
    }

    const payload = {
      ...priceList,
      id,
      code,
      updatedAt: new Date().toISOString()
    };

    await setDoc(docRef, payload, { merge: true });

    // Sync local backup
    try {
      const local = localStorage.getItem('local_price_lists');
      let lists = local ? JSON.parse(local) : [];
      const idx = lists.findIndex(l => l.id === id);
      if (idx >= 0) {
        lists[idx] = payload;
      } else {
        lists.push(payload);
      }
      localStorage.setItem('local_price_lists', JSON.stringify(lists));
    } catch (e) {}

    return payload;
  } catch (error) {
    console.error("Error in savePriceList:", error);
    throw error;
  }
};

export const deletePriceList = async (id) => {
  try {
    await deleteDoc(doc(db, 'priceLists', id));
    try {
      const local = localStorage.getItem('local_price_lists');
      let lists = local ? JSON.parse(local) : [];
      lists = lists.filter(l => l.id !== id);
      localStorage.setItem('local_price_lists', JSON.stringify(lists));
    } catch (e) {}
    return true;
  } catch (error) {
    console.error("Error in deletePriceList:", error);
    throw error;
  }
};

export const convertQuoteToPriceList = async (quote) => {
  if (!quote) return null;

  const customerName = quote.customerName || quote.customer || 'زبون عام';
  const customerId = quote.customerId || '';
  const quoteItems = quote.items || [];

  // Transform quote items to price list items
  const priceListItems = quoteItems.map(item => {
    const priceAfterDiscount = parseFloat(item.unitPrice || item.price || item.total || 0);
    const catalogMatch = masterPriceListCatalog.find(c => c.name.trim() === String(item.name || item.description || '').trim());
    
    let basePrice = catalogMatch ? catalogMatch.basePrice : priceAfterDiscount;
    let discountPercent = catalogMatch ? catalogMatch.defaultDiscount : 0;

    if (basePrice > priceAfterDiscount) {
      discountPercent = parseFloat((((basePrice - priceAfterDiscount) / basePrice) * 100).toFixed(2));
    } else if (discountPercent > 0 && priceAfterDiscount > 0) {
      basePrice = parseFloat((priceAfterDiscount / (1 - (discountPercent / 100))).toFixed(2));
    } else {
      basePrice = priceAfterDiscount;
      discountPercent = 0;
    }

    return {
      id: item.id || `pli-${Math.random().toString(36).substr(2, 9)}`,
      name: item.name || item.description || 'بند غير مسمى',
      basePrice: basePrice,
      discountPercent: discountPercent,
      discountedPrice: priceAfterDiscount,
      notes: item.notes || item.descriptionNotes || catalogMatch?.notes || ''
    };
  });

  // Check if this customer already has a price list
  const existingLists = await getPriceLists();
  const existingForCustomer = existingLists.find(l => 
    (customerId && String(l.customerId) === String(customerId)) ||
    (l.customerName && l.customerName.trim() === customerName.trim())
  );

  const priceListData = {
    id: existingForCustomer ? existingForCustomer.id : null,
    customerName,
    customerId,
    customerPhone: quote.customerPhone || quote.phone || '',
    notes: `تم إنشاء قائمة الأسعار تحويلاً من عرض السعر رقم (${quote.quoteNumber || quote.id || ''})`,
    items: priceListItems,
    sourceQuoteId: quote.id || '',
    sourceQuoteNumber: quote.quoteNumber || ''
  };

  return await savePriceList(priceListData);
};

// ==========================================
// MASTER PRODUCTS CATALOG SERVICES
// ==========================================

export const getMasterProducts = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'masterProducts'));
    if (querySnapshot.empty) {
      // If empty, we might want to return empty array and handle migration in UI
      return [];
    }
    return querySnapshot.docs.map(d => ({ ...d.data(), id: d.id }));
  } catch (error) {
    console.error("Error in getMasterProducts:", error);
    try {
      const local = localStorage.getItem('local_master_products');
      return local ? JSON.parse(local) : [];
    } catch (e) {
      return [];
    }
  }
};

export const saveMasterProduct = async (product) => {
  try {
    const docRef = product.id ? doc(db, 'masterProducts', product.id) : doc(collection(db, 'masterProducts'));
    const id = docRef.id;

    const payload = {
      ...product,
      id,
      updatedAt: new Date().toISOString()
    };

    await setDoc(docRef, payload, { merge: true });

    // Sync local backup
    try {
      const local = localStorage.getItem('local_master_products');
      let lists = local ? JSON.parse(local) : [];
      const idx = lists.findIndex(l => l.id === id);
      if (idx >= 0) {
        lists[idx] = payload;
      } else {
        lists.push(payload);
      }
      localStorage.setItem('local_master_products', JSON.stringify(lists));
    } catch (e) {}

    return payload;
  } catch (error) {
    console.error("Error in saveMasterProduct:", error);
    throw error;
  }
};

export const deleteMasterProduct = async (id) => {
  try {
    await deleteDoc(doc(db, 'masterProducts', id));
    try {
      const local = localStorage.getItem('local_master_products');
      let lists = local ? JSON.parse(local) : [];
      lists = lists.filter(l => l.id !== id);
      localStorage.setItem('local_master_products', JSON.stringify(lists));
    } catch (e) {}
    return true;
  } catch (error) {
    console.error("Error in deleteMasterProduct:", error);
    throw error;
  }
};
