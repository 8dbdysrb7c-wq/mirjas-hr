import React, { useEffect, useState } from 'react';
import { isAdmin } from '../../services/settings';
import { shareSalarySlip, shareSalarySlips, subscribeSharedSalaryMonth } from '../../services/salarySharing';

export const SalarySharingControl = ({ user, salaryData, month, selectedEmployeeId }) => {
  const [shared, setShared] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!isAdmin(user)) return;
    setShared([]); setReady(false); setError('');
    return subscribeSharedSalaryMonth(month, records => { setShared(records); setReady(true); }, () => setError('تعذر تحميل إعدادات إتاحة القسائم'));
  }, [month, user.id]);
  if (!isAdmin(user)) return null;
  const selected = salaryData.find(employee => employee.id === selectedEmployeeId);
  const visible = id => shared.some(record => record.employeeId === String(id) && record.visible);
  const change = async (employee, value) => {
    setBusy(employee.id); setError('');
    try { await shareSalarySlip(user, employee, month, value); }
    catch (failure) { setError(failure.message || 'تعذر حفظ الإتاحة'); }
    finally { setBusy(''); }
  };
  const changeAll = async value => {
    setBusy('all'); setError('');
    try { await shareSalarySlips(user, salaryData.filter(employee => visible(employee.id) !== value), month, value); }
    catch (failure) { setError(failure.message || 'تعذر حفظ إتاحة القسائم للجميع'); }
    finally { setBusy(''); }
  };
  return <div className="no-print" dir="rtl" style={{ maxWidth: 800, margin: '0 auto 14px', padding: '12px 16px', border: '1px solid #99f6e4', borderRadius: 12, background: '#f0fdfa', fontSize: 13 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
      <strong>إتاحة قسيمة {month} للموظفين</strong>
      {selected && <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" disabled={!ready || Boolean(busy)} checked={visible(selected.id)} onChange={event => change(selected, event.target.checked)} />إظهارها لـ {selected.name}</label>}
      {selected && visible(selected.id) && <button type="button" className="btn btn-outline" disabled={!ready || Boolean(busy)} onClick={() => change(selected, true)}>تحديث النسخة المتاحة</button>}
      <button type="button" className="btn btn-outline" onClick={() => setExpanded(!expanded)}>تحديد الموظفين</button>
      <button type="button" className="btn btn-outline" disabled={!ready || Boolean(busy) || !salaryData.some(employee => !visible(employee.id))} onClick={() => changeAll(true)}>تحديد الكل</button>
      <button type="button" className="btn btn-outline" disabled={!ready || Boolean(busy) || !salaryData.some(employee => visible(employee.id))} onClick={() => changeAll(false)}>إلغاء تحديد الكل</button>
    </div>
    {error && <p role="alert" style={{ color: '#be123c' }}>{error}</p>}
    {expanded && <div style={{ maxHeight: 240, overflow: 'auto', marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 8 }}>
      {salaryData.map(employee => <label key={employee.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'white', borderRadius: 8 }}>
        <input type="checkbox" disabled={!ready || Boolean(busy)} checked={visible(employee.id)} onChange={event => change(employee, event.target.checked)} />{employee.name}
      </label>)}
    </div>}
    <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 12 }}>التحديد يتيح نسخة القسيمة الحالية لهذا الشهر. إزالة التحديد تخفيها من حساب الموظف.</p>
  </div>;
};
