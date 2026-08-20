import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, getDoc } from 'firebase/firestore';

export const getCustomerTransactions = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'customer_transactions'));
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getCustomerTransactions:", error);
    return [];
  }
};

export const saveCustomerTransaction = async (transaction) => {
  try {
    let txToSave = { ...transaction };
    if (!txToSave.id) {
      const docRef = doc(collection(db, 'customer_transactions'));
      txToSave.id = docRef.id;
      txToSave.createdAt = new Date().toISOString();
      await setDoc(docRef, txToSave);
    } else {
      txToSave.updatedAt = new Date().toISOString();
      await setDoc(doc(db, 'customer_transactions', txToSave.id), txToSave, { merge: true });
    }
    return txToSave;
  } catch (error) {
    console.error("Error in saveCustomerTransaction:", error);
    return null;
  }
};

export const deleteCustomerTransaction = async (id) => {
  try {
    await deleteDoc(doc(db, 'customer_transactions', id));
    return true;
  } catch (error) {
    console.error("Error in deleteCustomerTransaction:", error);
    return false;
  }
};

