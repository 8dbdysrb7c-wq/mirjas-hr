import React from 'react';
import { Eye } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import {getTimedLeaveMinutes,timeToMinutes} from '../../utils/attendancePolicy';
import {distributePreviewAmount} from '../../utils/salaryPreviewAmounts';
const MySwal=withReactContent(Swal);
const formatVal = (val, showZeroAsDash = true) => {
  if (val === undefined || val === null || val === '') return '-';
  const num = Number(val);
  if (isNaN(num)) return val;
  if (num === 0) return showZeroAsDash ? '-' : '0.00';
  return num.toFixed(2);
};
export const createSalaryPreview = (employee, selectedMonth) => {
  const showSalaryPreview = (kind, title, total) => {

    if (!employee) return;
    const details = employee.salaryDetails || {};
    const minuteText = value => Number.isFinite(Number(value)) && value != null
      ? `${Math.floor(Number(value) / 60)} س ${Number(value) % 60} د` : '—';
    const attendanceByDate = new Map((details.attendance || []).map(row => [row.date, row]));
    let rows = [];
    if (kind === 'violations') rows = (employee.violationsList || []).map(row => {
      const attendanceRow = attendanceByDate.get(row.date);
      const recordedMinutes = String(row.reason || row.notes || '').match(/(\d+(?:\.\d+)?)\s*دقيقة/);
      const minutes = row.minutes ?? row.durationMinutes ?? (recordedMinutes ? Number(recordedMinutes[1]) : (/تأخير/.test(row.type || '') ? attendanceRow?.lateMinutes : null));
      return { date: row.date, label: row.type, duration: minuteText(minutes), amount: row.deductionAmount };
    });
    if (kind === 'attendance' || kind === 'late') rows = (details.attendance || [])
      .filter(row => kind === 'attendance' || Number(row.lateMinutes) > 0)
      .map(row => {
        const start = timeToMinutes(row.timeIn);
        const end = timeToMinutes(row.timeOut);
        return { date: row.date, label: `${row.timeIn || '—'} إلى ${row.timeOut || '—'}`,
          duration: kind === 'late' ? minuteText(row.lateMinutes) : (start != null && end != null ? minuteText((end - start + 1440) % 1440) : '—') };
      });
    if (kind === 'late' || kind === 'late-combined') {
      rows = (details.attendance || []).filter(row => !(details.unpaidDates || []).includes(row.date))
        .map(row => ({ date: row.date, label: 'تأخير', minutes: Math.max(0, Number(row.lateMinutes || 0) - Number(details.coveredLateMinutesByDate?.[row.date] || 0)) }))
        .filter(row => row.minutes > 0);
      rows.push(...(details.leaves || []).filter(row => ['مغادرة خاصة', 'مغادرة عمل', 'مغادرة الدخان'].includes(row.type) && !(details.automaticUnpaidDates || []).includes(row.date || row.startDate))
        .map(row => ({ date: row.date || row.startDate, label: row.type, minutes: getTimedLeaveMinutes(row) }))
        .filter(row => row.minutes > 0));
      rows = distributePreviewAmount(rows, employee.lateDeduction || 0, row => row.minutes).map(row => ({ ...row, duration: `${row.minutes} دقيقة` }));
      if (kind === 'late-combined') rows.push(...(employee.violationsList || []).map(row => {
        const recordedMinutes = String(row.reason || row.notes || '').match(/(\d+(?:\.\d+)?)\s*دقيقة/);
        const minutes = row.minutes ?? row.durationMinutes ?? (recordedMinutes ? Number(recordedMinutes[1]) : (/تأخير/.test(row.type || '') ? attendanceByDate.get(row.date)?.lateMinutes : null));
        return { date: row.date, label: row.type || 'مخالفة', duration: minutes == null ? '—' : `${Number(minutes)} دقيقة`, amount: Number(row.deductionAmount) || 0 };
      }));
    }
    if (kind === 'overtime') rows = (details.overtime || []).map(row => ({
      date: row.date || row.startDate, label: `${row.startTime || '—'} إلى ${row.endTime || '—'}`,
      duration: minuteText(row.rateDetails?.extraMins ?? getTimedLeaveMinutes(row))
    }));
    if (kind === 'absence') rows = [
      ...distributePreviewAmount((details.unpaidDates || []).map(date => ({ date, label: 'إجازة غير مدفوعة', duration: 'يوم' })), employee.unpaidLeaveDeduction || 0),
      ...distributePreviewAmount((details.absenceDates || []).map(date => ({ date, label: 'غياب', duration: 'يوم' })), employee.unexcusedAbsenceDeduction || 0)
    ];
    if (kind === 'advances') rows = (details.advances || []).filter(row => row.month === selectedMonth)
      .map(row => ({ date: row.date, label: row.label, amount: row.amount }));
    if (kind === 'bonuses') rows = (details.bonuses || []).map(row => ({ date: row.date, label: row.type || 'مكافأة', amount: row.amount }));
    if (kind === 'fixed') rows = [{ date: selectedMonth, label: title, amount: total }];
    rows.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    MySwal.fire({
      title,
      width: 760,
      showCloseButton: true,
      confirmButtonText: 'إغلاق',
      confirmButtonColor: '#0f766e',
      html: <div dir="rtl" style={{ textAlign: 'right' }}>
        <div style={{ padding: '12px 16px', background: '#f0fdfa', borderRadius: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span>{employee.name} · {selectedMonth}</span>
          <strong>{formatVal(total, false)} د.أ</strong>
        </div>
        <div style={{ maxHeight: '55vh', overflow: 'auto' }}>
          <table className="table" style={{ width: '100%', fontSize: 13 }}><thead><tr>
            <th style={{ textAlign: 'center' }}>التاريخ</th><th style={{ textAlign: 'center' }}>التفاصيل</th><th style={{ textAlign: 'center' }}>المدة</th><th style={{ textAlign: 'center' }}>القيمة (د.أ)</th>
          </tr></thead><tbody>{rows.map((row, index) => <tr key={index}>
            <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{row.date || '—'}</td><td style={{ textAlign: 'center' }}>{row.label}</td><td style={{ textAlign: 'center' }}>{row.duration || '—'}</td><td style={{ textAlign: 'center' }}>{row.amount == null ? '—' : formatVal(row.amount, false)}</td>
          </tr>)}</tbody></table>
          {!rows.length && <p style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>لا تتوفر تفاصيل يومية لهذا البند.</p>}
        </div>
      </div>
    });
  };
  const previewButton = (kind, title, total) => <button type="button" className="no-print" title={`معاينة ${title}`} aria-label={`معاينة ${title}`} onClick={() => showSalaryPreview(kind, title, total)}
    style={{ width: 27, height: 27, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #99f6e4', borderRadius: 8, background: '#f0fdfa', color: '#0f766e', padding: 0, cursor: 'pointer' }}><Eye size={15} /></button>;


return previewButton;
};
