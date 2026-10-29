import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export const getOrganizationDepartments = async () => {
  const snapshot = await getDocs(collection(db, 'hrOrganizationDepartments'));
  return snapshot.docs.map(row => ({ ...row.data(), id: row.id }));
};
