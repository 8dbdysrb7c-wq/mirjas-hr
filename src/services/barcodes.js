import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const getBarcodes = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'barcodes'));
    const barcodes = [];
    querySnapshot.forEach((doc) => {
      barcodes.push({ id: doc.id, ...doc.data() });
    });
    return barcodes;
  } catch (error) {
    console.error("Error fetching barcodes:", error);
    return [];
  }
};

export const saveBarcode = async (barcodeData) => {
  try {
    const id = barcodeData.id || Date.now().toString();
    const ref = doc(db, 'barcodes', id);
    await setDoc(ref, {
      ...barcodeData,
      id,
      updatedAt: new Date().toISOString(),
      createdAt: barcodeData.createdAt || new Date().toISOString()
    }, { merge: true });
    return id;
  } catch (error) {
    console.error("Error saving barcode:", error);
    throw error;
  }
};

export const deleteBarcode = async (id) => {
  try {
    await deleteDoc(doc(db, 'barcodes', id));
  } catch (error) {
    console.error("Error deleting barcode:", error);
    throw error;
  }
};
