import { doc, getDocFromServer, getDocsFromServer, collection, query, where, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { isAdmin, invalidateGlobalSettingsCache } from './settings';
import { requiresDailyReportForCheckout, hasSubmittedCheckoutReport } from '../utils/checkoutReportPolicy';

export const loadCheckoutReportPolicy = async () => {
  const snapshot = await getDocFromServer(doc(db, 'settings', 'globalSettings'));
  return snapshot.data()?.checkoutReportRequiredEmployeeIds || [];
};
export const saveCheckoutReportPolicy = async (employeeIds, user) => {
  if (!isAdmin(user)) throw new Error('هذا الإعداد متاح للإدارة فقط');
  await setDoc(doc(db, 'settings', 'globalSettings'), {
    checkoutReportRequiredEmployeeIds: [...new Set(employeeIds.map(String))],
    checkoutReportPolicyUpdatedAt: new Date().toISOString(),
    checkoutReportPolicyUpdatedBy: user.id || user.employeeId
  }, { merge: true });
  invalidateGlobalSettingsCache();
};
export const canCheckoutAfterDailyReport = async (employee, date) => {
  const ids = await loadCheckoutReportPolicy();
  if (!requiresDailyReportForCheckout(ids, employee)) return true;
  const employeeIds = [...new Set([employee.id, employee.employeeId].filter(Boolean).map(String))];
  const snapshots = await Promise.all(employeeIds.flatMap(id => ['userId', 'employeeId'].map(field =>
    getDocsFromServer(query(collection(db, 'reports'), where(field, '==', id), where('date', '==', date))))));
  return hasSubmittedCheckoutReport(snapshots.flatMap(snapshot => snapshot.docs.map(record => record.data())), employee, date);
};

const checkoutAttemptRef = (employee, date) => doc(db, 'checkout_attempts', `${employee.id || employee.employeeId}_${date}`);
export const savePendingCheckoutAttempt = async (employee, date) => {
  await setDoc(checkoutAttemptRef(employee, date), {
    userId: employee.id || employee.employeeId,
    employeeId: employee.employeeId || employee.id,
    employeeName: employee.name || '', date,
    status: 'awaiting_report', attemptedAt: new Date().toISOString(), locationVerified: true
  }, { merge: true });
};
export const hasPendingCheckoutAttempt = async (employee, date) => {
  const snapshot = await getDocFromServer(checkoutAttemptRef(employee, date));
  return snapshot.exists() && snapshot.data().status === 'awaiting_report' && snapshot.data().date === date;
};
export const completeCheckoutAttempt = async (employee, date) => {
  const ref = checkoutAttemptRef(employee, date);
  const snapshot = await getDocFromServer(ref);
  if (snapshot.exists()) await setDoc(ref, { status: 'completed', completedAt: new Date().toISOString() }, { merge: true });
};
