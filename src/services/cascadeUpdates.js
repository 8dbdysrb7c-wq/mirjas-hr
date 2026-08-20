import { db } from '../firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

const chunkArray = (arr, size) => {
  return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );
};

export const cascadeCustomerNameUpdate = async (oldName, newName) => {
  if (!oldName || !newName || oldName === newName) return;

  console.log(`Starting cascade update for customer: ${oldName} -> ${newName}`);
  const collectionsToUpdate = [
    { name: 'orders', field: 'customerName' },
    { name: 'sales_orders', field: 'customerName' },
    { name: 'rep_visits', field: 'customerName' }
  ];

  let updates = [];

  try {
    for (const coll of collectionsToUpdate) {
      const snapshot = await getDocs(collection(db, coll.name));
      snapshot.forEach((document) => {
        const data = document.data();
        if (data[coll.field] === oldName) {
          updates.push({ ref: document.ref, data: { [coll.field]: newName } });
        }
      });
    }

    // Missions
    const missionsSnapshot = await getDocs(collection(db, 'missions'));
    missionsSnapshot.forEach((document) => {
      const data = document.data();
      let modified = false;
      let newData = {};
      if (data.customerName === oldName) {
        newData.customerName = newName;
        modified = true;
      }
      if (data.targetEntity === oldName) {
        newData.targetEntity = newName;
        modified = true;
      }
      if (modified) {
        updates.push({ ref: document.ref, data: newData });
      }
    });

    // Stock Vouchers
    const vouchersSnapshot = await getDocs(collection(db, 'stock_vouchers'));
    vouchersSnapshot.forEach((document) => {
      const data = document.data();
      if (data.recipient === oldName) {
        updates.push({ ref: document.ref, data: { recipient: newName } });
      }
    });

    if (updates.length === 0) {
      console.log('No documents found to cascade update for customer name.');
      return;
    }

    const batches = chunkArray(updates, 500);
    for (const batchUpdates of batches) {
      const batch = writeBatch(db);
      batchUpdates.forEach(update => {
        batch.update(update.ref, update.data);
      });
      await batch.commit();
    }
    console.log(`Successfully updated ${updates.length} documents for customer name change.`);
  } catch (error) {
    console.error("Error in cascadeCustomerNameUpdate:", error);
  }
};

export const cascadeStockItemUpdate = async (itemNumber, oldName, newName) => {
  if (!itemNumber || !oldName || !newName || oldName === newName) return;

  console.log(`Starting cascade update for stock item [${itemNumber}]: ${oldName} -> ${newName}`);
  let updates = [];

  const updateItemsArray = (itemsArray) => {
    let modified = false;
    const newItems = itemsArray.map(item => {
      const itemName = String(item.name || '').trim();
      const itemProductName = String(item.productName || '').trim();
      const oldTrimmed = String(oldName).trim();
      const newTrimmed = String(newName).trim();
      
      let isMatch = false;
      let suffixToKeep = '';
      let targetField = '';

      if (item.itemNumber && item.itemNumber === itemNumber) {
        if (itemName.startsWith(oldTrimmed)) {
          isMatch = true; targetField = 'name'; suffixToKeep = itemName.substring(oldTrimmed.length);
        } else if (itemProductName.startsWith(oldTrimmed)) {
          isMatch = true; targetField = 'productName'; suffixToKeep = itemProductName.substring(oldTrimmed.length);
        }
      } else {
        if (itemName === oldTrimmed) {
          isMatch = true; targetField = 'name';
        } else if (itemProductName === oldTrimmed) {
          isMatch = true; targetField = 'productName';
        } else if (itemName.startsWith(oldTrimmed + ' - ')) {
          isMatch = true; targetField = 'name'; suffixToKeep = itemName.substring(oldTrimmed.length);
        } else if (itemProductName.startsWith(oldTrimmed + ' - ')) {
          isMatch = true; targetField = 'productName'; suffixToKeep = itemProductName.substring(oldTrimmed.length);
        } else if (itemName.startsWith(oldTrimmed + ' ')) {
          isMatch = true; targetField = 'name'; suffixToKeep = itemName.substring(oldTrimmed.length);
        } else if (itemProductName.startsWith(oldTrimmed + ' ')) {
          isMatch = true; targetField = 'productName'; suffixToKeep = itemProductName.substring(oldTrimmed.length);
        }
      }

      if (isMatch) {
        modified = true;
        const mappedItem = { ...item };
        if (targetField === 'name') {
           mappedItem.name = newTrimmed + suffixToKeep;
        } else if (targetField === 'productName') {
           mappedItem.productName = newTrimmed + suffixToKeep;
        }
        
        if (targetField === 'name' && itemProductName === oldTrimmed) {
           mappedItem.productName = newTrimmed;
        } else if (targetField === 'productName' && itemName === oldTrimmed) {
           mappedItem.name = newTrimmed;
        }

        return mappedItem;
      }
      return item;
    });
    return { modified, newItems };
  };

  const collectionsWithItems = [
    'orders',
    'sales_orders',
    'preparation_orders',
    'stock_vouchers',
    'stocktakes',
    'missions'
  ];

  try {
    for (const coll of collectionsWithItems) {
      const snapshot = await getDocs(collection(db, coll));
      snapshot.forEach((document) => {
        const data = document.data();
        if (data.items && Array.isArray(data.items)) {
          const { modified, newItems } = updateItemsArray(data.items);
          if (modified) {
            updates.push({ ref: document.ref, data: { items: newItems } });
          }
        }
      });
    }

    if (updates.length === 0) {
      console.log('No documents found to cascade update for stock item name.');
      return;
    }

    const batches = chunkArray(updates, 500);
    for (const batchUpdates of batches) {
      const batch = writeBatch(db);
      batchUpdates.forEach(update => {
        batch.update(update.ref, update.data);
      });
      await batch.commit();
    }
    console.log(`Successfully updated ${updates.length} documents for stock item name change.`);
  } catch (error) {
    console.error("Error in cascadeStockItemUpdate:", error);
  }
};
