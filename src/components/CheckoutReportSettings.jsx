import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { getEmployees } from '../store';
import { isActiveEmployee } from '../utils/employeeStatus';
import { requiresDailyReportForCheckout } from '../utils/checkoutReportPolicy';
import { loadCheckoutReportPolicy, saveCheckoutReportPolicy } from '../services/checkoutReportPolicy';

export default function CheckoutReportSettings({ user }) {
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([getEmployees(), loadCheckoutReportPolicy()]).then(([records, ids]) => {
      if (active) { setEmployees(records.filter(isActiveEmployee)); setSelected(ids); }
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const toggle = employee => setSelected(previous => {
    const ids = [employee.id, employee.employeeId].filter(Boolean).map(String);
    return requiresDailyReportForCheckout(previous, employee) ? previous.filter(id => !ids.includes(String(id)))
      : [...previous, String(employee.employeeId || employee.id)];
  });
  const save = async () => {
    setSaving(true);
    try { await saveCheckoutReportPolicy(selected, user); await Swal.fire('تم الحفظ', 'تم تحديث الموظفين الملزمين بتقديم تقرير اليوم قبل تسجيل الخروج.', 'success'); }
    catch { await Swal.fire('تعذر الحفظ', 'لم يتم حفظ التغييرات. أعد المحاولة.', 'error'); }
    finally { setSaving(false); }
  };
  const visible = employees.filter(employee => `${employee.name} ${employee.employeeId || employee.id} ${employee.department || ''}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="glass-card" dir="rtl" style={{ padding: 24 }}>
    <h3 style={{ fontWeight: 800, marginBottom: 8 }}>تقرير العمل اليومي قبل تسجيل الخروج</h3>
    <p style={{ color: '#64748b', marginBottom: 16 }}>الموظفون المحددون ملزمون بتقديم تقرير عمل اليوم قبل تسجيل الخروج. لا تُشترط موافقة المشرف.</p>
    {loading ? <p>جاري تحميل الموظفين...</p> : error ? <p role="alert">تعذر تحميل الإعدادات. أعد فتح هذه الصفحة للمحاولة مجددًا.</p> : <>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <input className="input-field" aria-label="بحث عن موظف" placeholder="بحث بالاسم أو الرقم الوظيفي أو القسم" value={search} onChange={event => setSearch(event.target.value)} style={{ maxWidth: 360, margin: 0 }} />
        <button type="button" className="btn btn-outline" disabled={saving} onClick={() => setSelected(previous => [...new Set([...previous, ...employees.map(employee => String(employee.employeeId || employee.id))])])}>تحديد الكل</button>
        <button type="button" className="btn btn-outline" disabled={saving} onClick={() => setSelected([])}>إلغاء الكل</button>
        <span>المحددون: {employees.filter(employee => requiresDailyReportForCheckout(selected, employee)).length} من {employees.length}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, maxHeight: 420, overflowY: 'auto', marginBottom: 18 }}>
        {visible.map(employee => <label key={employee.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer' }}>
          <input type="checkbox" disabled={saving} checked={requiresDailyReportForCheckout(selected, employee)} onChange={() => toggle(employee)} />
          <span><strong>{employee.name}</strong><small style={{ display: 'block', color: '#64748b' }}>{employee.employeeId || employee.id} · {employee.department || '—'}</small></span>
        </label>)}
        {!visible.length && <p>لا يوجد موظفون مطابقون للبحث.</p>}
      </div>
      <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}</button>
    </>}
  </section>;
}
