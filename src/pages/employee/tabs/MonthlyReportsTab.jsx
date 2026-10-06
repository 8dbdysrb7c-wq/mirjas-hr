import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import { getTimedLeaveMinutes, timeToMinutes } from '../../../utils/attendancePolicy';

const approved = new Set(['موافق', 'موافق عليه', 'مقبول', 'تمت الموافقة', 'تم التسليم']);
const overtimeTypes = new Set(['بدل عمل إضافي', 'عمل إضافي']);
const localDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Amman', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const hoursLabel = minutes => Number((minutes / 60).toFixed(2)).toLocaleString('en-US');
const timeLabel = value => {
  const minutes = timeToMinutes(value);
  if (minutes == null) return 'غير مسجل';
  const hour = Math.floor(minutes / 60);
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${hour >= 12 ? 'م' : 'ص'}`;
};

export const MonthlyReportsTab = ({ user }) => {
  const [today, setToday] = useState(localDate);
  const month = today.slice(0, 7);
  const [sources, setSources] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setToday(localDate()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setSources({}); setLoading(true); setError(false);
    const ids = [...new Set([user.id, user.employeeId].filter(Boolean).map(String))];
    const requests = ids.flatMap(id => [
      ['hr_attendance', 'employeeId', id], ['hr_attendance', 'userId', id],
      ['attendance_logs', 'employeeId', id], ['attendance_logs', 'userId', id],
      ['hr_leaves', 'employeeId', id]
    ]);
    let live = true;
    const finished = new Set();
    const complete = key => { finished.add(key); if (finished.size === requests.length) setLoading(false); };
    if (!requests.length) setLoading(false);
    const unsubscribe = requests.map(([name, field, id], index) => onSnapshot(
      query(collection(db, name), where(field, '==', id)), snapshot => {
        if (!live) return;
        const records = snapshot.docs.map(record => ({ ...record.data(), id: record.id, source: name }))
          .filter(record => !['محذوف', 'deleted'].includes(record.status))
          .filter(record => name === 'hr_leaves'
            ? (record.date?.startsWith(month) || (record.startDate && record.startDate <= `${month}-31` && (record.endDate || record.startDate) >= `${month}-01`))
            : record.date?.startsWith(month));
        setSources(previous => ({ ...previous, [index]: records }));
        complete(index);
      }, failure => {
        if (!live) return;
        console.error('Personal monthly report subscription failed:', failure);
        setError(true); complete(index);
      }
    ));
    return () => { live = false; unsubscribe.forEach(stop => stop()); };
  }, [user.id, user.employeeId, month]);

  const records = [...new Map(Object.values(sources).flat().map(record => [`${record.source}/${record.id}`, record])).values()];
  const leaves = records.filter(record => record.source === 'hr_leaves');
  const attends = records.filter(record => record.source !== 'hr_leaves');
  const covers = (request, date) => request.date ? request.date === date
    : request.startDate && request.startDate <= date && (request.endDate || request.startDate) >= date;
  const days = Array.from({ length: new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate() }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`);
  return <section dir="rtl">
    <h2 className="section-title">تقرير الدوام — الشهر الحالي</h2>
    <p className="text-muted mb-4">{user.name} · {month} · الحضور والإجازات والمغادرات والعمل الإضافي</p>
    {error && <div role="alert" className="text-rose-600 mb-4">تعذر تحميل بعض السجلات. البيانات المعروضة قد تكون غير مكتملة.</div>}
    {loading ? <div role="status">جاري تحميل تقارير الشهر...</div> : <div className="table-responsive">
      <table className="table"><thead><tr>
        <th style={{ textAlign: 'center' }}>التاريخ</th><th style={{ textAlign: 'center' }}>الدخول والخروج</th>
        <th style={{ textAlign: 'center' }}>الإجازات والمغادرات المعتمدة</th><th style={{ textAlign: 'center' }}>ساعات العمل الإضافي المقدمة</th><th style={{ textAlign: 'center' }}>الموافقة على العمل الإضافي</th>
      </tr></thead><tbody>{days.map(date => {
        const dayRecords = attends.filter(record => record.date === date && !record.isLeave)
          .sort((a, b) => Number(b.source === 'hr_attendance') - Number(a.source === 'hr_attendance') || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
        const entry = dayRecords.find(record => timeToMinutes(record.timeIn) != null);
        const exit = dayRecords.find(record => timeToMinutes(record.timeOut) != null);
        const dayLeaves = leaves.filter(request => covers(request, date) && approved.has(request.status) && !overtimeTypes.has(request.type)
          && String(request.type || '').match(/إجازة|اجازة|مغادرة/));
        const extras = leaves.filter(request => covers(request, date) && overtimeTypes.has(request.type));
        return <tr key={date}>
          <td dir="ltr" style={{ textAlign: 'center', verticalAlign: 'middle' }}>{date}</td>
          <td style={{ textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', lineHeight: 1.6, whiteSpace: 'nowrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span>{entry ? timeLabel(entry.timeIn) : '—'}</span>
              <span style={{ color: '#94a3b8' }}>–</span>
              <span>{exit ? timeLabel(exit.timeOut) : '—'}</span>
            </div>
          </td>
          <td style={{ minWidth: 180, whiteSpace: 'normal', textAlign: 'center', verticalAlign: 'middle' }}>{dayLeaves.length ? dayLeaves.map(request => <div key={request.id}>{request.type}</div>) : '—'}</td>
          <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{extras.length ? extras.map(request => <div key={request.id}>{hoursLabel(getTimedLeaveMinutes(request))}</div>) : '—'}</td>
          <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{extras.length ? extras.map(request => <div key={request.id}>{approved.has(request.status) ? 'نعم' : 'لا'}</div>) : '—'}</td>
        </tr>;
      })}</tbody></table>
    </div>}
  </section>;
};
