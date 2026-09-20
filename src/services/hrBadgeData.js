import { collection, getDocs, getCountFromServer, query, where, or, and } from 'firebase/firestore';
import { db } from '../firebase';

const rows = async (name, filter) => {
  try {
    const snapshot = await getDocs(query(collection(db, name), filter));
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (err) {
    console.warn(`[HRBadge] Failed to fetch rows for ${name}:`, err);
    return [];
  }
};

const getCount = async (name, filter) => {
  try {
    const res = await getCountFromServer(query(collection(db, name), filter));
    return res?.data?.()?.count ?? 0;
  } catch (err) {
    console.warn(`[HRBadge] Failed to count ${name}:`, err);
    return 0;
  }
};

// Keep historical records only when needed to resolve this month's attendance.
export async function getHRBadgeData(from, to, includeAttendance) {
  const inMonth = and(where('date', '>=', from), where('date', '<=', to));
  const pending = where('status', '==', 'معلق');
  const [leaves, mps, advances, assets, violations, employeeAlerts, bonuses] = await Promise.all([
    rows('hr_leaves', includeAttendance ? or(pending, inMonth, where('endDate', '>=', from), and(where('startDate', '>=', from), where('startDate', '<=', to))) : pending),
    rows('missing_punches', includeAttendance ? or(where('status', 'in', ['معلق', 'قيد المراجعة']), inMonth) : where('status', 'in', ['معلق', 'قيد المراجعة'])),
    getCount('hr_advances', pending),
    getCount('hr_assets', where('status', '==', 'نشطة')),
    rows('hr_violations', includeAttendance ? or(pending, inMonth) : pending),
    rows('employee_alerts', where('status', '==', 'pending')),
    rows('hr_bonuses', pending),
  ]);
  return { leaves, mps, advances, assets, violations, employeeAlerts, bonuses };
}
