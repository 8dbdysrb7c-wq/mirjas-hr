import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

const ALL_COLLECTIONS = [
  'globalSettings',
  'users',
  'logs',
  'employees',
  'attendance',
  'advances',
  'leaves',
  'holidays',
  'salaries',
  'stock',
  'stock_vouchers',
  'customers',
  'sales_orders',
  'orders',
  'preparation_orders',
  'production_logs',
  'productionBatches',
  'productionTasks',
  'deliveryTrips',
  'deliveryManifests',
  'missions',
  // Operations & Supervisor
  'supervisor_reports',
  'reports',
  'operations_log',
  'smoking_logs',
  'attendance_logs',
  'supervisor_tasks',
  // HR Collections
  'hr_attendance',
  'hr_advances',
  'hr_bonuses',
  'hr_leaves',
  'hr_violations',
  'hr_assets',
  'hr_holidays',
  'hr_salary_periods',
  'hr_salary_archives',
  'missing_punches',
  'hr_audit_logs'
];

export const exportDatabase = async () => {
  try {
    const backupData = {};
    for (const colName of ALL_COLLECTIONS) {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      const colData = {};
      snapshot.forEach(doc => {
        colData[doc.id] = doc.data();
      });
      backupData[colName] = colData;
    }
    return backupData;
  } catch (error) {
    console.error('Error exporting database:', error);
    throw error;
  }
};

export const importDatabase = async (backupData) => {
  try {
    // We process collections one by one
    for (const [colName, docs] of Object.entries(backupData)) {
      if (!ALL_COLLECTIONS.includes(colName)) {
        console.warn(`Skipping unknown collection: ${colName}`);
        continue;
      }
      
      const colRef = collection(db, colName);
      
      // Delete existing documents first
      const snapshot = await getDocs(colRef);
      
      if (snapshot.size > 0) {
         const deleteChunks = [];
         let currentDeleteBatch = writeBatch(db);
         let count = 0;
         snapshot.forEach(document => {
           currentDeleteBatch.delete(document.ref);
           count++;
           if (count === 490) {
             deleteChunks.push(currentDeleteBatch.commit());
             currentDeleteBatch = writeBatch(db);
             count = 0;
           }
         });
         if (count > 0) {
           deleteChunks.push(currentDeleteBatch.commit());
         }
         await Promise.all(deleteChunks);
      }
      
      // Insert new documents
      const docsEntries = Object.entries(docs);
      if (docsEntries.length > 0) {
        const addChunks = [];
        let currentAddBatch = writeBatch(db);
        let count = 0;
        for (const [docId, docData] of docsEntries) {
          const docRef = doc(db, colName, docId);
          currentAddBatch.set(docRef, docData);
          count++;
          if (count === 490) {
            addChunks.push(currentAddBatch.commit());
            currentAddBatch = writeBatch(db);
            count = 0;
          }
        }
        if (count > 0) {
          addChunks.push(currentAddBatch.commit());
        }
        await Promise.all(addChunks);
      }
    }
    return true;
  } catch (error) {
    console.error('Error importing database:', error);
    throw error;
  }
};

export const resetCollection = async (colName) => {
  try {
    const colRef = collection(db, colName);
    const snapshot = await getDocs(colRef);
    if (snapshot.size === 0) return true;
    
    const deleteChunks = [];
    let currentDeleteBatch = writeBatch(db);
    let count = 0;
    
    snapshot.forEach(document => {
      currentDeleteBatch.delete(document.ref);
      count++;
      if (count === 490) {
        deleteChunks.push(currentDeleteBatch.commit());
        currentDeleteBatch = writeBatch(db);
        count = 0;
      }
    });
    
    if (count > 0) {
      deleteChunks.push(currentDeleteBatch.commit());
    }
    await Promise.all(deleteChunks);
    return true;
  } catch (error) {
    console.error(`Error resetting collection ${colName}:`, error);
    throw error;
  }
};
