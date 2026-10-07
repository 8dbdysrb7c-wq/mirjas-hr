import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import { getTimedLeaveMinutes, timeToMinutes } from '../../../utils/attendancePolicy';
import './MonthlyReportsTab.css';

const approved = new Set(['موافق', 'موافق عليه', 'مقبول', 'تمت الموافقة', 'تم التسليم']);
const rejected = new Set(['مرفوض', 'مرفوضة', 'تم الرفض', 'غير موافق']);
const overtimeTypes = new Set(['بدل عمل إضافي', 'عمل إضافي']);
const localDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Amman', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const minutesLabel = minutes => Math.round(Number(minutes) || 0).toLocaleString('en-US');
const timeLabel = value => {
  const minutes = timeToMinutes(value);
  if (minutes == null) return 'غير مسجل';
  const hour = Math.floor(minutes / 60);
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${hour >= 12 ? 'م' : 'ص'}`;
};

const getRejectionReason = (request) => {
  if (request?.rejectionReason && String(request.rejectionReason).trim()) {
    return String(request.rejectionReason).trim();
  }
  if (request?.rejectReason && String(request.rejectReason).trim()) {
    return String(request.rejectReason).trim();
  }
  const notes = String(request?.notes || '').trim();
  if (notes) {
    const match1 = notes.match(/\(سبب الرفض:\s*([^\)]+)\)/i);
    if (match1 && match1[1]?.trim()) return match1[1].trim();

    const match2 = notes.match(/سبب الرفض[:\s]+([^\n\r]+)/i);
    if (match2 && match2[1]?.trim()) return match2[1].trim();
  }
  return '';
};

const renderOvertimeStatus = (request) => {
  const status = String(request?.status || '').trim();
  if (approved.has(status)) {
    return (
      <span
        style={{
          display: 'inline-block',
          color: '#15803d',
          backgroundColor: '#dcfce7',
          padding: '2px 8px',
          borderRadius: '9999px',
          fontWeight: 700,
          fontSize: '12px',
          lineHeight: 1.4
        }}
      >
        نعم
      </span>
    );
  }

  if (rejected.has(status)) {
    const reason = getRejectionReason(request);
    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px', maxWidth: '100%' }}>
        <span
          style={{
            display: 'inline-block',
            color: '#b91c1c',
            backgroundColor: '#fee2e2',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontWeight: 700,
            fontSize: '12px',
            lineHeight: 1.4
          }}
        >
          لا
        </span>
        {reason ? (
          <span
            style={{
              fontSize: '11px',
              color: '#991b1b',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              padding: '2px 6px',
              borderRadius: '6px',
              maxWidth: '180px',
              wordBreak: 'break-word',
              lineHeight: 1.3
            }}
            title={reason}
          >
            السبب: {reason}
          </span>
        ) : null}
      </div>
    );
  }

  // Pending approval ('معلق' or awaiting decision)
  return (
    <span
      style={{
        display: 'inline-block',
        color: '#b45309',
        backgroundColor: '#fef3c7',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontWeight: 600,
        fontSize: '11px',
        lineHeight: 1.4
      }}
    >
      بانتظار الموافقة
    </span>
  );
};

const renderAttendanceCell = (date, entry, exit, dayLeaves, today) => {
  const hasPunch = Boolean(entry || exit);

  if (hasPunch) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
          <span>{entry ? timeLabel(entry.timeIn) : '—'}</span>
          <span style={{ color: '#94a3b8' }}>–</span>
          <span>{exit ? timeLabel(exit.timeOut) : '—'}</span>
        </div>
        {dayLeaves.map(request => (
          <span className="attendance-leave-badge" key={request.id} style={{ marginTop: '2px' }}>
            {request.type}
          </span>
        ))}
      </div>
    );
  }

  // Not punched: if on leave (مجاز)
  if (dayLeaves.length > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
        {dayLeaves.map(request => (
          <span className="attendance-leave-badge" key={request.id}>
            {request.type}
          </span>
        ))}
      </div>
    );
  }

  // Not punched and no leave: (مش مداوم)
  const [y, m, d] = date.split('-').map(Number);
  const dayOfWeek = new Date(y, m - 1, d).getDay();
  const isFriday = dayOfWeek === 5;

  if (isFriday) {
    return <span className="attendance-weekend-badge">يوم الجمعة</span>;
  }

  if (date < today) {
    return <span className="attendance-absence-badge">غياب</span>;
  }

  return <span className="attendance-empty-badge">—</span>;
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
  return <section dir="rtl" className="employee-attendance-report">
    <div className="attendance-report-heading"><h2 className="section-title">تقرير الدوام</h2>
    <span className="attendance-report-month">{new Intl.DateTimeFormat('ar-JO', { month: 'long', year: 'numeric' }).format(new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 1))}</span></div>
    {error && <div role="alert" className="text-rose-600 mb-4">تعذر تحميل بعض السجلات. البيانات المعروضة قد تكون غير مكتملة.</div>}
    {loading ? <div role="status">جاري تحميل تقارير الشهر...</div> : <div className="table-responsive">
      <table className="table monthly-attendance-table"><thead><tr>
        <th style={{ textAlign: 'center' }}>التاريخ</th><th style={{ textAlign: 'center' }}>أوقات الدوام</th>
        <th style={{ textAlign: 'center' }}>العمل الإضافي<br /><span>بالدقائق</span></th><th style={{ textAlign: 'center' }}>حالة الاضافي</th>
      </tr></thead><tbody>{days.map(date => {
        const dayRecords = attends.filter(record => record.date === date && !record.isLeave)
          .sort((a, b) => Number(b.source === 'hr_attendance') - Number(a.source === 'hr_attendance') || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
        const entry = dayRecords.find(record => timeToMinutes(record.timeIn) != null);
        const exit = dayRecords.find(record => timeToMinutes(record.timeOut) != null);
        const dayLeaves = leaves.filter(request => covers(request, date) && approved.has(request.status) && !overtimeTypes.has(request.type)
          && String(request.type || '').match(/إجازة|اجازة|مغادرة/));
        const extras = leaves.filter(request => covers(request, date) && overtimeTypes.has(request.type));
        return <tr key={date}>
          <td data-label="التاريخ" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
            <span dir="ltr" className="attendance-date-text">{date}</span>
          </td>
          <td data-label="أوقات الدوام" style={{ textAlign: 'center', verticalAlign: 'middle', fontSize: '11px', lineHeight: 1.5 }}>
            {renderAttendanceCell(date, entry, exit, dayLeaves, today)}
          </td>
          <td data-label={'العمل الإضافي\nبالدقائق'} className="attendance-overtime-cell" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
            {extras.length ? extras.map(request => <div className="attendance-date-text" key={request.id}>{minutesLabel(getTimedLeaveMinutes(request))}</div>) : <span className="attendance-date-text">—</span>}
          </td>
          <td data-label="حالة الاضافي" className="attendance-overtime-status" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
            {extras.length ? (
              extras.map(request => (
                <div key={request.id} style={{ padding: '2px 0' }}>
                  {renderOvertimeStatus(request)}
                </div>
              ))
            ) : (
              <span className="attendance-empty-badge">—</span>
            )}
          </td>
        </tr>;
      })}</tbody></table>
    </div>}
  </section>;
};
