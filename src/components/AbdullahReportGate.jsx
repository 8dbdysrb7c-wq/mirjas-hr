import React, { useEffect, useState } from 'react';
import { collection, getDocsFromServer, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { getEmployees } from '../store';
import { getDirectReports } from '../utils/supervisorHierarchy';
import { ABDULLAH_ID, pendingAbdullahReports } from '../utils/abdullahReportGate';
import { firestoreErrorMessage } from '../utils/firestoreError';
const AdminSupervisorReports = React.lazy(() => import('../pages/admin/AdminSupervisorReports'));

export default function AbdullahReportGate({ user, onLogout, children }) {
  const targeted = [user?.id, user?.employeeId].includes(ABDULLAH_ID);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [retry, setRetry] = useState(0);
  const refresh = () => setRetry(value => value + 1);
  useEffect(() => {
    if (!targeted) return;
    let active = true;
    setChecking(true); setError('');
    const rows = snap => snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    Promise.all([
      getDocsFromServer(query(collection(db, 'supervisor_reports'), where('supervisorId', '==', ABDULLAH_ID))),
      getDocsFromServer(query(collection(db, 'reports'), where('date', 'in', ['2026-10-01', '2026-10-13', '2026-10-14']))),
      getEmployees(true)
    ]).then(([supervisor, employeesReports, employees]) => {
      if (!active) return;
      const manager = employees.find(row => row.id === ABDULLAH_ID) || user;
      const team = getDirectReports(manager, employees).map(row => String(row.id));
      setPending(pendingAbdullahReports(rows(supervisor), rows(employeesReports), team));
    }).catch(err => { if (active) setError(firestoreErrorMessage(err, 'التحقق من التقارير المطلوبة')); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [targeted, retry, user?.id]);
  if (!targeted) return children;
  if (pending?.length === 0 && !error && !checking) return children;
  return <main dir="rtl" style={{ minHeight: '100vh', background: '#f8fafc', padding: 20 }}>
    <section style={{ maxWidth: 1400, margin: 'auto' }}>
      <div style={{ padding: 20, background: '#fff', border: '1px solid #fed7aa', borderRadius: 14, marginBottom: 16 }}>
        <h2>استكمال تقارير المشرف المطلوبة</h2>
        <p>عبد الله، يلزم حفظ تقييمات موظفيك عن الأيام التالية قبل استخدام بقية النظام. الإجازة السنوية لا تلغي هذه التقييمات.</p>
        {pending?.map(date => <span key={date} style={{ display: 'inline-block', margin: 6, padding: '7px 12px', background: '#fff7ed', borderRadius: 8 }}>{date}</span>)}
        {checking && <p role="status">جارٍ التحقق من التقارير…</p>}
        {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}><button className="btn btn-primary" disabled={checking} onClick={refresh}>تحقق من اكتمال التقييمات</button><button className="btn btn-outline" onClick={onLogout}>تسجيل الخروج من الحساب</button></div>
      </div>
      {!checking && !error && pending?.length > 0 && <React.Suspense fallback={<p>جارٍ تحميل التقييمات…</p>}><AdminSupervisorReports key={pending[0]} user={user} requiredDate={pending[0]} onReportSaved={refresh} /></React.Suspense>}
    </section>
  </main>;
}
