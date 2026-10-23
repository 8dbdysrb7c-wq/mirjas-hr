import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

export async function getLiveSmokingLogs(day) {
  const start = new Date(`${day}T00:00:00+03:00`).toISOString();
  const end = new Date(`${day}T23:59:59.999+03:00`).toISOString();
  const result = await getDocs(query(collection(db, 'smoking_logs'), where('timestamp', '>=', start), where('timestamp', '<=', end), orderBy('timestamp', 'desc'), limit(25)));
  return result.docs.map(doc => ({ ...doc.data(), id: doc.id }));
}
export async function getLinkedLiveMissions(orderNumber) {
  const result = await getDocs(query(collection(db, 'missions'), where('salesOrderNumber', '==', orderNumber)));
  return result.docs.map(doc => ({ ...doc.data(), id: doc.id }));
}
