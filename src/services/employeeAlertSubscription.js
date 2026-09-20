import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export const subscribeToPendingEmployeeAlerts = (employeeId, next, error) => {
  if (employeeId == null || String(employeeId).trim() === '') {
    next([]);
    return () => {};
  }
  const source = query(collection(db, 'employee_alerts'),
    where('employeeId', '==', String(employeeId)),
    where('status', '==', 'pending'));
  return onSnapshot(source, snapshot => {
    next(snapshot.docs.map(row => ({ ...row.data(), id: row.id }))
      .filter(alert => !alert.archived)
      .sort((a, b) => String(b.sentAt || '').localeCompare(String(a.sentAt || ''))));
  }, error);
};
