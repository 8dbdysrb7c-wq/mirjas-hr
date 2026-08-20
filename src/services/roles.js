import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc 
} from 'firebase/firestore';

const COLLECTION_NAME = 'roles';

export const getRoles = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting roles: ", error);
    return [];
  }
};

export const getRoleById = async (roleId) => {
  try {
    if (!roleId) return null;
    const docRef = doc(db, COLLECTION_NAME, roleId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting role: ", error);
    return null;
  }
};

export const saveRole = async (role) => {
  try {
    const roleId = role.id || Date.now().toString();
    const roleToSave = { ...role };
    if (!roleToSave.id) {
      roleToSave.id = roleId;
    }
    const docRef = doc(db, COLLECTION_NAME, roleId);
    await setDoc(docRef, roleToSave);
    return roleId;
  } catch (error) {
    console.error("Error saving role: ", error);
    throw error;
  }
};

export const deleteRole = async (roleId) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, roleId));
  } catch (error) {
    console.error("Error deleting role: ", error);
    throw error;
  }
};
