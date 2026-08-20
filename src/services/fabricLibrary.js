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

export const getFabrics = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'fabricLibrary'));
    return querySnapshot.docs.map(d => ({ ...d.data(), id: d.id }));
  } catch (error) {
    console.error("Error in getFabrics:", error);
    try {
      const local = localStorage.getItem('local_fabrics');
      return local ? JSON.parse(local) : [];
    } catch (e) {
      return [];
    }
  }
};

export const saveFabric = async (fabric) => {
  try {
    const docRef = fabric.id ? doc(db, 'fabricLibrary', fabric.id) : doc(collection(db, 'fabricLibrary'));
    const id = docRef.id;

    const payload = {
      ...fabric,
      id,
      updatedAt: new Date().toISOString()
    };

    await setDoc(docRef, payload, { merge: true });

    // Sync local backup
    try {
      const local = localStorage.getItem('local_fabrics');
      let fabrics = local ? JSON.parse(local) : [];
      const idx = fabrics.findIndex(f => f.id === id);
      if (idx >= 0) {
        fabrics[idx] = payload;
      } else {
        fabrics.push(payload);
      }
      localStorage.setItem('local_fabrics', JSON.stringify(fabrics));
    } catch (e) {}

    return payload;
  } catch (error) {
    console.error("Error in saveFabric:", error);
    throw error;
  }
};

export const deleteFabric = async (id) => {
  try {
    await deleteDoc(doc(db, 'fabricLibrary', id));
    try {
      const local = localStorage.getItem('local_fabrics');
      let fabrics = local ? JSON.parse(local) : [];
      fabrics = fabrics.filter(f => f.id !== id);
      localStorage.setItem('local_fabrics', JSON.stringify(fabrics));
    } catch (e) {}
    return true;
  } catch (error) {
    console.error("Error in deleteFabric:", error);
    throw error;
  }
};
