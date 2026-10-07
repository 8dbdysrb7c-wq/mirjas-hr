import React, { useEffect, useState } from 'react';
import { SalarySlip } from '../../hr/SalarySlip';
import { createSalaryPreview } from '../../hr/salarySlipPreview';
import { subscribeMySalarySlips } from '../../../services/salarySharing';

const monthLabel = value => {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('ar-JO', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
};

export const MySalarySlipsTab = ({ user }) => {
  const [slips, setSlips] = useState([]);
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    setSlips([]); setLoading(true); setError(false);
    return subscribeMySalarySlips(user.id, records => { setSlips(records); setLoading(false); }, () => { setError(true); setLoading(false); });
  }, [user.id]);
  const selected = slips.find(record => record.month === month) || slips[0];
  return <section dir="rtl" className="employee-salary-page">
    {loading ? <p>جاري تحميل القسائم...</p> : error ? <p role="alert">تعذر تحميل قسيمة الراتب</p> : !selected ? <p>لا توجد قسيمة متاحة لك حاليًا.</p> : <>
      <select aria-label="شهر قسيمة الراتب" className="input-field no-print" style={{ maxWidth: 220, marginBottom: 16 }} value={selected.month} onChange={event => setMonth(event.target.value)}>{slips.map(record => <option key={record.id} value={record.month}>{monthLabel(record.month)}</option>)}</select>
      <SalarySlip employee={selected.salary} monthLabel={monthLabel(selected.month)} previewButton={createSalaryPreview(selected.salary, selected.month)} formatVal={value => Number(value || 0).toFixed(2)} />
    </>}
  </section>;
};
