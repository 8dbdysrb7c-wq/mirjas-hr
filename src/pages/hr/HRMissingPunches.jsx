import { isActiveEmployee } from '../../utils/employeeStatus';
import React, { useState, useEffect, useMemo } from 'react';
import { Bell, Clock, Check, X, Search, Filter, Fingerprint, Undo2, Trash2, User, ArrowUpDown, ArrowUp, ArrowDown, MessageCircle, Plus, Eye, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { getMissingPunches, updateMissingPunchStatus, deleteMissingPunch, saveHRAuditLog, getEmployees, saveHRViolation, saveMissingPunch, getHRAttendance, saveHRAttendance, saveEmployee, getHRLeaves, saveHRLeave } from '../../store';
import Swal from 'sweetalert2';
import { sendWhatsAppNotification, sendTemplatedWhatsAppNotification } from '../../utils/whatsappService';
import Select from '../../components/SearchSelect';
import Flatpickr from 'react-flatpickr';
import { Arabic } from 'flatpickr/dist/l10n/ar.js';
import 'flatpickr/dist/themes/light.css';
import { promptEmployeeAlert } from '../../utils/employeeAlerts';
const MonthPicker = ({ selectedMonth, setSelectedMonth }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [year, setYear] = useState(() => parseInt(selectedMonth.split('-')[0]) || new Date().getFullYear());

  const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const getLabel = () => {
    const [y, m] = selectedMonth.split('-');
    const idx = parseInt(m, 10) - 1;
    return `${arabicMonths[idx] || ''} ${y}`;
  };

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.custom-month-picker-container')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <div className="custom-month-picker-container" style={{ position: 'relative', direction: 'rtl' }}>
      <div
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '9px 14px',
          cursor: 'pointer',
          minWidth: '130px',
          height: '44px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          fontSize: '13px',
          fontWeight: '700',
          color: '#1e293b'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} style={{ color: '#0ea5e9' }} />
          <span>{getLabel()}</span>
        </div>
        <ChevronDown size={14} style={{ color: '#64748b' }} />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: '260px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            zIndex: 99999,
            padding: '12px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
            <button
              type="button"
              onClick={() => setYear(y => y - 1)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', fontWeight: 'bold' }}
            >
              &lt;
            </button>
            <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '15px' }}>{year}</span>
            <button
              type="button"
              onClick={() => setYear(y => y + 1)}
              disabled={year >= currentYear}
              style={{ border: 'none', background: 'transparent', cursor: year >= currentYear ? 'not-allowed' : 'pointer', color: year >= currentYear ? '#cbd5e1' : '#64748b', fontWeight: 'bold' }}
            >
              &gt;
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {arabicMonths.map((m, idx) => {
              const monthStr = `${year}-${String(idx + 1).padStart(2, '0')}`;
              const isSelected = selectedMonth === monthStr;
              const isCurrent = currentYear === year && (idx + 1) === currentMonth;
              const isFuture = year > currentYear || (year === currentYear && (idx + 1) > currentMonth);

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isFuture}
                  onClick={() => {
                    setSelectedMonth(monthStr);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isSelected ? '#e0f2fe' : 'transparent',
                    color: isSelected ? '#0284c7' : isFuture ? '#cbd5e1' : '#475569',
                    fontWeight: isSelected ? 'bold' : 'normal',
                    cursor: isFuture ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    transition: 'all 0.15s'
                  }}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;

  let cleanStr = timeStr.trim();
  const isPM = cleanStr.includes('م') || cleanStr.toLowerCase().includes('pm');
  const isAM = cleanStr.includes('ص') || cleanStr.toLowerCase().includes('am');

  let digits = cleanStr.replace(/[^0-9:]/g, '');
  const parts = digits.split(':');
  if (parts.length < 2) return 0;

  let hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;

  if (isPM || isAM) {
    if (isPM && hours !== 12) {
      hours += 12;
    }
    if (isAM && hours === 12) {
      hours = 0;
    }
  }

  return hours * 60 + minutes;
};

const formatTime12h = (timeStr) => {
  if (!timeStr || timeStr === '--:--') return '--:--';
  if (timeStr.includes('ص') || timeStr.includes('م') || timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) {
    return timeStr;
  }
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return timeStr;
  const suffix = hours >= 12 ? 'م' : 'ص';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${suffix}`;
};

const HRMissingPunches = ({ user, refreshCounts }) => {
  const [punches, setPunches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPunch, setNewPunch] = useState({ employeeId: '', date: '', time: '', type: 'دخول', reason: '' });
  const [filterStatus, setFilterStatus] = useState('معلق');
  const getLocalDateStr = (d) => {
    if (!d) return '';
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return getLocalDateStr(d);
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getLocalDateStr(d);
  });
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [inlineTimes, setInlineTimes] = useState({});

  // 1. Add dateMode filter states for the redesign
  const [dateMode, setDateMode] = useState('range');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateStr(new Date()));
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return getLocalDateStr(d);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getLocalDateStr(d);
  });

  // 2. Sync dateFrom and dateTo based on dateMode
  useEffect(() => {
    if (dateMode === 'day') {
      setDateFrom(selectedDate);
      setDateTo(selectedDate);
    } else if (dateMode === 'month') {
      const parts = selectedMonth.split('-');
      const y = parseInt(parts[0]) || new Date().getFullYear();
      const m = parseInt(parts[1]) - 1;
      const firstDay = getLocalDateStr(new Date(y, m, 1));
      const lastDay = getLocalDateStr(new Date(y, m + 1, 0));
      setDateFrom(firstDay);
      setDateTo(lastDay);
    } else if (dateMode === 'range') {
      setDateFrom(startDate);
      setDateTo(endDate);
    }
  }, [dateMode, selectedMonth, selectedDate, startDate, endDate]);

  const handleInlineTimeChange = (punchId, val) => {
    setInlineTimes(prev => ({ ...prev, [punchId]: val }));
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ col }) => {
    if (sortConfig.key !== col) return <ArrowUpDown size={13} style={{ color: '#cbd5e1' }} />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={13} style={{ color: '#0f5c6e' }} /> : <ArrowDown size={13} style={{ color: '#0f5c6e' }} />;
  };

  useEffect(() => {
    fetchPunches();
  }, [dateFrom, dateTo]);

  const fetchPunches = async () => {
    setLoading(true);
    const data = await getMissingPunches();
    const allEmps = await getEmployees();
    const emps = allEmps.filter(e => e.name !== 'المدير العام' && e.id !== 'admin' && e.level !== 'admin' && isActiveEmployee(e));
    const attendance = await getHRAttendance();
    const leaves = await getHRLeaves();

    const virtualPunches = [];
    const todayStr = new Date().toLocaleDateString('en-CA');
    const dFrom = new Date(dateFrom);
    const dTo = new Date(dateTo);

    // 1. Detect Missing Check-in (No record exists) & Missing Both
    for (let d = new Date(dFrom); d <= dTo; d.setDate(d.getDate() + 1)) {
      const dateStr = getLocalDateStr(d);
      if (dateStr > todayStr) continue; // Skip future dates

      // Assuming Friday is weekend for now to avoid spam

      const isWeekend = d.getDay() === 5;
      if (isWeekend) continue;

      emps.forEach(emp => {
        const hasManual = data.some(p => String(p.employeeId) === String(emp.id) && p.date === dateStr);
        if (hasManual) return;

        const rec = attendance.find(a => String(a.employeeId) === String(emp.id) && a.date === dateStr);

        const hasLeave = leaves.some(l =>
          String(l.employeeId) === String(emp.id) &&
          (l.status === 'موافق' || l.status === 'مقبول') &&
          l.type && l.type.startsWith('إجازة') &&
          ((l.date === dateStr) || (l.startDate <= dateStr && l.endDate >= dateStr))
        );
        if (hasLeave) return;

        if (!rec || rec.status === 'لم يسجل دخول') {
          virtualPunches.push({
            id: `virtual_in_${emp.id}_${dateStr}`,
            isVirtual: true,
            attendanceId: rec ? rec.id : `${emp.id}_${dateStr}`,
            employeeId: emp.id,
            employeeName: emp.name,
            date: dateStr,
            type: 'دخول',
            time: '--:--',
            reason: !rec ? 'بصمة دخول وخروج' : 'بصمة دخول',
            status: 'معلق',
            createdAt: new Date(`${dateStr}T23:59:59`).toISOString(),
            attendanceRecord: rec || { status: 'لم يسجل دخول', date: dateStr }
          });
        }
      });
    }

    // 2. Detect Missing Check-out
    attendance.forEach(rec => {
      if (rec.isLeave) return;
      const hasManual = data.some(p => String(p.employeeId) === String(rec.employeeId) && p.date === rec.date && p.type === 'خروج');
      if (hasManual) return;

      const hasLeave = leaves.some(l =>
        String(l.employeeId) === String(rec.employeeId) &&
        (l.status === 'موافق' || l.status === 'موافق عليه' || l.status === 'مقبول') &&
        l.type && l.type.startsWith('إجازة') &&
        ((l.date === rec.date) || (l.startDate <= rec.date && l.endDate >= rec.date))
      );

      if (rec.timeIn && (!rec.timeOut || rec.timeOut === '--:--') && rec.date >= dateFrom && rec.date <= dateTo) {
        if (!['غائب', 'غياب غير مبرر', 'مغادرة مبكرة', 'إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'].includes(rec.status) && !hasLeave) {
          virtualPunches.push({
            id: `virtual_out_${rec.id}`,
            isVirtual: true,
            attendanceId: rec.id,
            employeeId: rec.employeeId,
            employeeName: rec.employeeName || (emps.find(e => String(e.id) === String(rec.employeeId))?.name || 'مجهول'),
            date: rec.date,
            type: 'خروج',
            time: '--:--',
            reason: 'بصمة خروج',
            status: 'معلق',
            createdAt: new Date(`${rec.date}T23:59:59`).toISOString(),
            attendanceRecord: rec
          });
        }
      }
    });

    const combined = [...data, ...virtualPunches].filter(p => p.employeeName !== 'المدير العام' && p.employeeId !== 'admin');
    setPunches(combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    setEmployees(emps.filter(e => e.name !== 'المدير العام' && e.jobTitle !== 'المدير العام' && e.role !== 'المدير العام' && isActiveEmployee(e)));
    setLoading(false);
  };

  const handleUpdateStatus = async (punch, newStatus) => {
    try {
      let adminNote = '';
      let isConfirmed = false;

      if (!punch.isVirtual) {
        const res = await Swal.fire({
          title: 'تأكيد',
          html: `
            <p>هل أنت متأكد من ${newStatus === 'موافق عليه' ? 'اعتماد' : 'رفض'} طلب الختمة الناقصة؟</p>
            <div style="margin-top: 15px; text-align: right;">
              <label style="display:block; margin-bottom: 8px; font-weight: bold; color: #1e293b;">ملاحظة للموظف (اختياري):</label>
              <textarea id="swal-admin-note" class="swal2-textarea" style="margin:0; width:100%; font-size: 14px;" placeholder="اكتب ملاحظتك هنا..."></textarea>
            </div>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'تأكيد',
          cancelButtonText: 'إلغاء',
          customClass: {
            container: 'premium-modal-container',
            popup: 'premium-modal-popup',
            confirmButton: 'btn-premium-cancel',
            cancelButton: 'btn-premium-cancel'
          },
          buttonsStyling: false,
          preConfirm: () => {
            return document.getElementById('swal-admin-note').value;
          }
        });
        adminNote = res.value;
        isConfirmed = res.isConfirmed;
      } else {
        const res = await Swal.fire({
          title: 'تأكيد',
          text: `هل أنت متأكد من ${newStatus === 'موافق عليه' ? 'اعتماد' : 'رفض'} هذه الختمة الناقصة؟`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'تأكيد',
          cancelButtonText: 'إلغاء',
          customClass: {
            container: 'premium-modal-container',
            popup: 'premium-modal-popup',
            confirmButton: 'btn-premium-cancel',
            cancelButton: 'btn-premium-cancel'
          },
          buttonsStyling: false
        });
        isConfirmed = res.isConfirmed;
      }

      if (isConfirmed) {
        Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false });
        Swal.showLoading();

        try {
          const adminName = user?.name || 'الإدارة';
          const adminId = user?.id || 'admin';
          const updatedPunchData = { ...punch, adminNote: adminNote || '' };
          await updateMissingPunchStatus(punch.id, newStatus, adminName, updatedPunchData);
          await saveHRAuditLog({
            user: adminName,
            action: newStatus === 'موافق عليه' ? 'اعتماد طلب ختمة ناقصة' : 'رفض طلب ختمة ناقصة',
            module: 'الختمات الناقصة',
            description: `الموظف: ${punch.employeeName} | التاريخ: ${punch.date} ${adminNote ? '| ملاحظة: ' + adminNote : ''}`,
            timestamp: new Date().toISOString()
          });

          setPunches(prev => prev.map(p => p.id === punch.id ? { ...p, status: newStatus, adminNote: adminNote || '' } : p));
          await fetchPunches();
          if (refreshCounts) refreshCounts();

          // Send WhatsApp notification
          try {
            const allEmployees = await getEmployees();
            const selectedEmp = allEmployees.find(e => String(e.id || '').trim() === String(punch.employeeId || '').trim() || String(e.name || '').trim() === String(punch.employeeName || '').trim());
            if (selectedEmp && selectedEmp.phone) {
              const action = newStatus === 'موافق عليه' ? 'approve' : 'reject';
              const notesVar = adminNote ? `الملاحظات: ${adminNote}` : '';
              await sendTemplatedWhatsAppNotification(selectedEmp.phone, 'missing_punches', action, {
                employeeName: selectedEmp.name,
                date: punch.date || '',
                notes: notesVar
              });
            }
          } catch (err) {
            console.error("Failed to send WhatsApp message:", err);
          }

          Swal.fire({
            title: 'تم!',
            text: 'تم تحديث حالة الطلب بنجاح',
            icon: 'success',
            confirmButtonText: 'إغلاق',
            customClass: {
              container: 'premium-modal-container',
              popup: 'premium-modal-popup',
              confirmButton: 'btn-premium-cancel'
            },
            buttonsStyling: false
          });
        } catch (innerErr) {
          console.error(innerErr);
          Swal.fire('خطأ', 'حدث خطأ أثناء تحديث حالة الطلب', 'error');
        }
      }
    } catch (error) {
      console.error("Error in update status modal:", error);
    }
  };

  const handleDropdownAction = async (punch, action) => {
    if (!action) return;

    const emp = employees.find(e => String(e.id) === String(punch.employeeId));
    if (!emp) {
      Swal.fire('خطأ', 'لم يتم العثور على بيانات الموظف', 'error');
      return;
    }

    const vacBal = Number(emp.vacationBalance) || 0;
    const sickBal = Number(emp.sickLeaveBalance) || 0;
    const isMissingIn = punch.type === 'دخول' || punch.reason === 'بصمة دخول وخروج';

    let violationAmount = 0;
    const outTimeIn = inlineTimes[`${punch.id}_in`];
    const outTimeOut = inlineTimes[`${punch.id}_out`];
    if (action === 'time') {
      if (punch.reason === 'بصمة دخول وخروج') {
        if (!outTimeIn && !outTimeOut) {
          Swal.fire('تنبيه', 'الرجاء إدخال وقت الدخول أو الخروج', 'warning');
          return;
        }
      } else if (isMissingIn) {
        if (!outTimeIn) {
          Swal.fire('تنبيه', 'الرجاء إدخال وقت الدخول', 'warning');
          return;
        }
      } else {
        if (!outTimeOut) {
          Swal.fire('تنبيه', 'الرجاء إدخال وقت الخروج', 'warning');
          return;
        }
      }

      let finalIn = outTimeIn || punch.attendanceRecord?.timeIn;
      let finalOut = outTimeOut || punch.attendanceRecord?.timeOut;
      if (finalIn && finalOut && finalIn !== '--:--' && finalOut !== '--:--') {
        if (timeToMinutes(finalOut) < timeToMinutes(finalIn)) {
          Swal.fire('خطأ', 'لا يمكن أن يكون وقت الخروج قبل وقت الدخول!', 'error');
          return;
        }
      }
    } else if (action === 'violation') {
      const { value: vAmt } = await Swal.fire({
        title: 'قيمة الخصم',
        input: 'number',
        inputLabel: 'أدخل مبلغ الخصم (د.أ)',
        inputAttributes: { min: 0, step: 0.5 },
        showCancelButton: true,
        confirmButtonText: 'تأكيد',
        cancelButtonText: 'إلغاء',
        inputValidator: (val) => {
          if (!val || parseFloat(val) <= 0) return 'الرجاء إدخال مبلغ صحيح';
        }
      });
      if (!vAmt) return;
      violationAmount = vAmt;
    } else if (action === 'vacation' && vacBal <= 0) {
      Swal.fire('عذراً', 'رصيد الإجازات السنوية لا يكفي', 'warning');
      return;
    } else if (action === 'sick' && sickBal <= 0) {
      Swal.fire('عذراً', 'رصيد الإجازات المرضية لا يكفي', 'warning');
      return;
    } else {
      // Confirm other actions
      const actionText = {
        early: 'مغادرة مبكرة',
        vacation: 'إجازة سنوية',
        sick: 'إجازة مرضية',
        unpaid: 'إجازة غير مدفوعة'
      }[action];

      let leaveInfo = '';
      if (action === 'vacation') {
        leaveInfo = `<div style="margin-top: 15px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px; text-align: right;">
                        <span style="color: #475569; font-weight: bold;">رصيد الإجازات السنوية المتبقي للموظف:</span> 
                        <span style="color: #16a34a; font-weight: bold; font-size: 16px; margin-right: 8px;">${vacBal} يوم</span>
                      </div>`;
      } else if (action === 'sick') {
        leaveInfo = `<div style="margin-top: 15px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px; text-align: right;">
                        <span style="color: #475569; font-weight: bold;">رصيد الإجازات المرضية المتبقي للموظف:</span> 
                        <span style="color: #16a34a; font-weight: bold; font-size: 16px; margin-right: 8px;">${sickBal} يوم</span>
                      </div>`;
      }

      const { isConfirmed } = await Swal.fire({
        title: 'تأكيد الإجراء',
        html: `<p style="text-align: right;">هل أنت متأكد من تسجيل (${actionText}) للموظف؟</p>${leaveInfo}`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'نعم، حفظ',
        cancelButtonText: 'إلغاء',
        confirmButtonColor: '#0f5c6e'
      });
      if (!isConfirmed) return;
    }

    setLoading(true);
    try {
      let updateData = {
        id: punch.attendanceId,
        employeeId: punch.employeeId,
        employeeName: punch.employeeName,
        date: punch.date,
      };
      const oldRec = punch.attendanceRecord;
      const notesPrefix = (oldRec.notes ? oldRec.notes + ' | ' : '');

      let shouldUpdateEmp = false;
      let newEmpData = { ...emp };

      if (action === 'time') {
        if (punch.reason === 'بصمة دخول وخروج') {
          if (outTimeIn) updateData.timeIn = outTimeIn;
          if (outTimeOut) updateData.timeOut = outTimeOut;
          updateData.status = (outTimeIn && outTimeOut) ? 'مكتمل الدوام' : (!outTimeOut ? 'لم يسجل خروج' : 'لم يسجل دخول');
          updateData.notes = notesPrefix + 'أُدخلت أوقات يدوية';
        } else if (isMissingIn) {
          updateData.timeIn = outTimeIn;
          updateData.status = (oldRec.timeOut && oldRec.timeOut !== '--:--') ? 'مكتمل الدوام' : 'لم يسجل خروج';
          updateData.notes = notesPrefix + 'أُدخل وقت دخول يدوي';
        } else {
          updateData.timeOut = outTimeOut;
          updateData.status = 'مكتمل الدوام';
          updateData.notes = notesPrefix + 'أُدخل وقت خروج يدوي';
        }
      } else if (action === 'early') {
        updateData.status = 'مغادرة مبكرة';
        updateData.timeOut = '--:--';
        updateData.notes = notesPrefix + 'سُجلت مغادرة مبكرة لعدم إكمال البصمة';
      } else if (action === 'vacation') {
        updateData.status = 'إجازة سنوية';
        updateData.timeIn = '--:--';
        updateData.timeOut = '--:--';
        updateData.notes = notesPrefix + 'حُسب كإجازة سنوية لاكتشاف غياب البصمة';
        shouldUpdateEmp = true;
        newEmpData.vacationBalance = vacBal - 1;

        await saveHRLeave({
          employeeId: punch.employeeId,
          employeeName: punch.employeeName,
          department: emp.department || 'غير محدد',
          type: 'إجازة سنوية',
          date: punch.date,
          status: 'موافق',
          notes: `تسوية بصمة ناقصة: حُسب كإجازة سنوية لاكتشاف غياب البصمة`,
          createdAt: new Date().toISOString()
        });
      } else if (action === 'sick') {
        updateData.status = 'إجازة مرضية';
        updateData.timeIn = '--:--';
        updateData.timeOut = '--:--';
        updateData.notes = notesPrefix + 'حُسب كإجازة مرضية لاكتشاف غياب البصمة';
        shouldUpdateEmp = true;
        newEmpData.sickLeaveBalance = sickBal - 1;

        await saveHRLeave({
          employeeId: punch.employeeId,
          employeeName: punch.employeeName,
          department: emp.department || 'غير محدد',
          type: 'إجازة مرضية',
          date: punch.date,
          status: 'موافق',
          notes: `تسوية بصمة ناقصة: حُسب كإجازة مرضية لاكتشاف غياب البصمة`,
          createdAt: new Date().toISOString()
        });
      } else if (action === 'unpaid') {
        updateData.status = 'إجازة غير مدفوعة';
        updateData.timeIn = '--:--';
        updateData.timeOut = '--:--';
        updateData.notes = notesPrefix + 'حُسب كإجازة غير مدفوعة لاكتشاف غياب البصمة';

        await saveHRLeave({
          employeeId: punch.employeeId,
          employeeName: punch.employeeName,
          department: emp.department || 'غير محدد',
          type: 'إجازة غير مدفوعة',
          date: punch.date,
          status: 'موافق',
          notes: `تسوية بصمة ناقصة: حُسب كإجازة غير مدفوعة لاكتشاف غياب البصمة`,
          createdAt: new Date().toISOString()
        });
      } else if (action === 'violation') {
        updateData.status = 'غياب غير مبرر';
        updateData.timeIn = '--:--';
        updateData.timeOut = '--:--';
        updateData.notes = notesPrefix + 'حُسب غياب وسُجلت مخالفة مالية لتجاهل البصمة';

        await saveHRViolation({
          employeeId: punch.employeeId,
          employeeName: punch.employeeName,
          department: emp?.department || 'غير محدد',
          type: 'عدم الالتزام بالبصمة',
          date: punch.date,
          action: 'خصم من الراتب',
          deductionAmount: violationAmount,
          notes: `تجاهل الموظف بصمة الـ(${punch.type}) بتاريخ ${punch.date}. تم تحويلها لمخالفة مالية.`
        });
      }

      await saveHRAttendance(updateData);
      if (shouldUpdateEmp) {
        await saveEmployee(newEmpData);
      }

      const adminName = user?.name || 'الإدارة';
      let actionDesc = action === 'time' ? 'معالجة بإدخال وقت يدوي' :
        action === 'early' ? 'تسجيل كمغادرة مبكرة' :
          action === 'vacation' ? 'إجازة سنوية' :
            action === 'sick' ? 'إجازة مرضية' :
              action === 'unpaid' ? 'إجازة غير مدفوعة' : 'مخالفة مالية';

      // Update missing punch record so it appears in the approved/rejected list
      const finalStatus = action === 'violation' ? 'مرفوض' : 'موافق عليه';
      if (punch.isVirtual) {
        await saveMissingPunch({
          employeeId: punch.employeeId,
          employeeName: punch.employeeName,
          date: punch.date,
          time: punch.time || '--:--',
          type: punch.type,
          reason: punch.reason || 'بصمة تلقائية',
          status: finalStatus,
          adminNote: actionDesc,
          createdAt: new Date().toISOString()
        });
      } else {
        await updateMissingPunchStatus(punch.id, finalStatus, adminName, { ...punch, adminNote: actionDesc });
      }

      await saveHRAuditLog({
        user: adminName,
        action: 'معالجة ختمة ناقصة (آلي)',
        module: 'الختمات الناقصة',
        description: `الموظف: ${punch.employeeName} | التاريخ: ${punch.date} | الإجراء: ${actionDesc}`,
        timestamp: new Date().toISOString()
      });

      await fetchPunches();
      if (refreshCounts) refreshCounts();

      setInlineTimes(prev => {
        const n = { ...prev };
        delete n[`${punch.id}_in`];
        delete n[`${punch.id}_out`];
        return n;
      });
      Swal.fire('تم بنجاح', 'تم معالجة الختمة الناقصة بنجاح وانعكس ذلك على سجل الحضور', 'success');
    } catch (e) {
      console.error(e);
      Swal.fire('خطأ', 'حدث خطأ أثناء الحفظ', 'error');
    }
    setLoading(false);
  };

  const handleRegisterViolation = async (punch) => {
    const { value: deductionAmount } = await Swal.fire({
      title: 'تحويل إلى مخالفة مالية',
      html: `
        <div style="text-align: right; margin-top: 10px;">
          <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 15px;">
            سيتم <strong>رفض</strong> طلب الختمة الناقصة لتاريخ ${punch.date} وتسجيل مخالفة مالية لخصمها من الراتب لتجاوز الحد المسموح (3 ختمات).
          </p>
          <label style="display:block; margin-bottom: 8px; font-weight: bold; color: #1e293b;">قيمة الخصم (د.أ):</label>
          <input type="number" id="swal-deduction" class="input-field" style="width: 100%; text-align: center; font-size: 1.25rem; font-weight: bold;" min="0" step="0.5" placeholder="أدخل مبلغ الخصم">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'تسجيل الخصم',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#e11d48',
      preConfirm: () => {
        const val = document.getElementById('swal-deduction').value;
        if (!val || parseFloat(val) <= 0) {
          Swal.showValidationMessage('الرجاء إدخال مبلغ صحيح أكبر من الصفر');
          return false;
        }
        return val;
      }
    });

    if (deductionAmount) {
      Swal.showLoading();

      // 1. Reject the request
      await updateMissingPunchStatus(punch.id, 'مرفوض', user?.name || 'الإدارة', punch);

      // 2. Create violation
      const allEmployees = await getEmployees();
      const emp = allEmployees.find(e => String(e.id || '').trim() === String(punch.employeeId || '').trim() || String(e.name || '').trim() === String(punch.employeeName || '').trim());

      await saveHRViolation({
        employeeId: punch.employeeId,
        employeeName: punch.employeeName,
        department: emp?.department || 'غير محدد',
        type: 'تجاوز حد الختمات الناقصة',
        date: punch.date,
        action: 'خصم من الراتب',
        deductionAmount: deductionAmount,
        notes: `تجاوز الموظف الحد المسموح (3 مرات) للختمات الناقصة. تم تحويل طلب الختمة (${punch.type}) المرفوض بتاريخ ${punch.date} إلى مخالفة مالية.`
      });

      await fetchPunches();
      if (refreshCounts) refreshCounts();
      Swal.fire('نجاح', 'تم رفض الطلب وتسجيل الخصم بنجاح', 'success');
    }
  };

  const handleDelete = async (punchId) => {
    try {
      const result = await Swal.fire({
        title: 'تأكيد الحذف',
        text: 'هل أنت متأكد من رغبتك في حذف هذا الطلب نهائياً؟',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'نعم، احذف',
        cancelButtonText: 'إلغاء',
        confirmButtonColor: '#ef4444'
      });

      if (result.isConfirmed) {
        Swal.fire({ title: 'جاري الحذف...', allowOutsideClick: false });
        Swal.showLoading();

        const resultDelete = await deleteMissingPunch(punchId, user);

        if (resultDelete && resultDelete.success) {
          Swal.fire({
            icon: 'success',
            title: 'تم الحذف',
            text: 'تم حذف الطلب بنجاح',
            timer: 1500,
            showConfirmButton: false
          });
          await fetchPunches();
          if (refreshCounts) refreshCounts();
        } else {
          console.error(resultDelete?.error);
          Swal.fire('خطأ', 'حدث خطأ أثناء الحذف', 'error');
        }
      }
    } catch (error) {
      console.error("Error deleting punch:", error);
      Swal.fire('خطأ', 'حدث خطأ أثناء حذف الطلب', 'error');
    }
  };

  const handlePreviewPunch = (punch) => {
    let htmlContent = `
      <style>
        .swal-table-preview { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 0.95rem; text-align: right; direction: rtl; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .swal-table-preview th, .swal-table-preview td { padding: 12px 15px; border-bottom: 1px solid #e2e8f0; }
        .swal-table-preview th { width: 35%; color: #475569; font-weight: 600; background-color: #f8fafc; border-left: 1px solid #e2e8f0; }
        .swal-table-preview td { color: #1e293b; font-weight: 500; background-color: #ffffff; }
        .swal-table-preview tr:last-child th, .swal-table-preview tr:last-child td { border-bottom: none; }
        .swal-notes-box { background: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 15px; border: 1px solid #e2e8f0; text-align: right; direction: rtl; font-size: 0.95rem; line-height: 1.6; color: #334155; }
      </style>
      <table class="swal-table-preview">
        <tr><th>الموظف</th><td>${punch.employeeName}</td></tr>
        <tr><th>النوع</th><td><span style="color:var(--primary); font-weight:bold;">ختمة ناقصة (${punch.type})</span></td></tr>
        <tr><th>التاريخ</th><td>${punch.date || '-'}</td></tr>
        <tr><th>الوقت</th><td dir="ltr">${punch.time || '-'}</td></tr>
      </table>
      <div class="swal-notes-box"><strong>السبب / الملاحظات:</strong><br><div style="margin-top: 8px;">${punch.reason ? punch.reason.replace(/\n/g, '<br>') : '<span style="color:#94a3b8; font-style:italic;">لا يوجد ملاحظات</span>'}</div></div>
    `;

    Swal.fire({
      title: 'تفاصيل الطلب',
      html: htmlContent,
      icon: 'info',
      confirmButtonText: 'إغلاق',
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-cancel'
      },
      buttonsStyling: false
    });
  };

  const handleAddPunch = async (e) => {
    e.preventDefault();
    if (!newPunch.employeeId || !newPunch.date || !newPunch.time || !newPunch.reason) {
      return Swal.fire('تنبيه', 'يرجى تعبئة جميع الحقول', 'warning');
    }

    const selectedDate = new Date(newPunch.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (selectedDate > today) {
      return Swal.fire('خطأ', 'لا يمكن تقديم طلب ختمة ناقصة لتاريخ لاحق!', 'error');
    }
    const emp = employees.find(e => String(e.id || '').trim() === String(newPunch.employeeId || '').trim());

    const isDuplicate = punches.some(p => String(p.employeeId || '').trim() === String(newPunch.employeeId || '').trim() && p.date === newPunch.date && p.type === newPunch.type && p.status !== 'مرفوض');
    if (isDuplicate) {
      const { isConfirmed } = await Swal.fire({
        title: 'تنبيه: طلب مكرر',
        text: 'يوجد طلب ختمة ناقصة مسبقاً لهذا الموظف في نفس التاريخ ونفس النوع! هل تريد إضافة الطلب الجديد على أي حال؟',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'نعم، أضف على أي حال',
        cancelButtonText: 'إلغاء',
        customClass: {
          confirmButton: 'btn btn-primary',
          cancelButton: 'btn btn-outline'
        }
      });
      if (!isConfirmed) return;
    }

    Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false });
    Swal.showLoading();

    const success = await saveMissingPunch({
      employeeId: emp.id,
      employeeName: emp.name,
      date: newPunch.date,
      time: newPunch.time,
      type: newPunch.type,
      reason: newPunch.reason,
      status: 'معلق',
      createdAt: new Date().toISOString()
    });

    if (success) {
      Swal.fire('نجاح', 'تمت إضافة الختمة الناقصة بنجاح', 'success');
      setShowAddModal(false);
      setNewPunch({ employeeId: '', date: '', time: '', type: 'دخول', reason: '' });
      fetchPunches();
    } else {
      Swal.fire('خطأ', 'حدث خطأ أثناء الحفظ', 'error');
    }
  };

  const filteredPunches = punches.filter(p => {
    const matchSearch = searchTerm ? String(p.employeeId) === String(searchTerm) : true;

    let matchStatus = false;
    if (filterStatus === 'الكل') matchStatus = true;
    else if (filterStatus === 'معلق') matchStatus = (p.status === 'معلق' || p.status === 'قيد المراجعة');
    else matchStatus = p.status === filterStatus;

    let matchMonth = true;
    if (p.date && (p.date < dateFrom || p.date > dateTo)) matchMonth = false;

    return matchSearch && matchStatus && matchMonth;
  }).sort((a, b) => {
    let vA = a[sortConfig.key] ?? '';
    let vB = b[sortConfig.key] ?? '';
    if (sortConfig.key === 'employeeName') { vA = String(vA).toLowerCase(); vB = String(vB).toLowerCase(); }
    if (sortConfig.key === 'date' || sortConfig.key === 'createdAt') { vA = new Date(vA).getTime(); vB = new Date(vB).getTime(); }

    if (vA < vB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (vA > vB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  if (loading) return <div className="text-center p-8">جاري التحميل...</div>;

  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      cursor: 'pointer',
      minHeight: '42px',
      height: '42px',
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: '0 8px',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#1e293b',
      fontWeight: 'bold',
      fontSize: '0.9rem',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#94a3b8',
      fontSize: '0.9rem',
    }),
    menuPortal: base => ({ ...base, zIndex: 9999 }),
    menu: (provided) => ({
      ...provided,
      borderRadius: '12px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
      zIndex: 9999,
      width: 'max-content',
      minWidth: '100%',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#1a8d9b' : state.isFocused ? '#f1f5f9' : 'white',
      color: state.isSelected ? 'white' : '#1e293b',
      cursor: 'pointer',
      padding: '10px 16px',
      fontSize: '0.9rem',
      fontWeight: state.isSelected ? 'bold' : 'normal',
      textAlign: 'right',
      whiteSpace: 'nowrap',
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: '#94a3b8',
      '&:hover': { color: '#1a8d9b' }
    })
  };

  const employeeNameOptions = [...employees]
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map(emp => ({ value: emp.id, label: emp.name }));

  const employeeIdOptions = [...employees]
    .sort((a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0))
    .map(emp => ({ value: emp.id, label: String(emp.id) }));

  const statsPunches = punches.filter(p => {
    const matchSearch = searchTerm ? String(p.employeeId) === String(searchTerm) : true;
    let matchMonth = true;
    if (p.date && (p.date < dateFrom || p.date > dateTo)) matchMonth = false;
    return matchSearch && matchMonth;
  });

  const totalCount = statsPunches.length;
  const pendingCount = statsPunches.filter(p => p.status === 'معلق' || p.status === 'قيد المراجعة').length;
  const approvedCount = statsPunches.filter(p => p.status === 'موافق عليه' || p.status === 'موافق' || p.status === 'مكتمل الدوام').length;
  const rejectedCount = statsPunches.filter(p => p.status === 'مرفوض' || ['غياب غير مبرر', 'مغادرة مبكرة', 'إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'].includes(p.status)).length;

  return (
    <div style={{ fontFamily: 'Rubik, Tajawal, sans-serif', padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', direction: 'rtl' }}>

      {/* Title Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', justifyContent: 'flex-start' }}>
        <Fingerprint className="text-[#0ea5e9]" size={24} strokeWidth={2} />
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', margin: 0 }}>طلبات الختمات الناقصة</h2>
      </div>

      {/* Filters Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>

        {/* Right Side: Filters Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>

          {/* 1. Mode Toggle */}
          <div style={{ display: 'flex', backgroundColor: '#ffffff', borderRadius: '10px', padding: '4px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', height: '44px', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setDateMode('day')}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 'bold',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: dateMode === 'day' ? '#e0f2fe' : 'transparent',
                color: dateMode === 'day' ? '#0284c7' : '#64748b',
                transition: 'all 0.2s'
              }}
            >
              يومي
            </button>
            <button
              type="button"
              onClick={() => setDateMode('month')}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 'bold',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: dateMode === 'month' ? '#e0f2fe' : 'transparent',
                color: dateMode === 'month' ? '#0284c7' : '#64748b',
                transition: 'all 0.2s'
              }}
            >
              شهري
            </button>
            <button
              type="button"
              onClick={() => setDateMode('range')}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 'bold',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: dateMode === 'range' ? '#e0f2fe' : 'transparent',
                color: dateMode === 'range' ? '#0284c7' : '#64748b',
                transition: 'all 0.2s'
              }}
            >
              فترة
            </button>
          </div>

          {/* 2. Month/Date Picker */}
          {dateMode === 'month' && (
            <MonthPicker selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />
          )}
          {dateMode === 'day' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0 12px', height: '44px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <Calendar size={16} style={{ color: '#0ea5e9' }} />
              <Flatpickr
                value={selectedDate}
                onChange={(dates, dateStr) => setSelectedDate(dateStr)}
                options={{ dateFormat: 'Y-m-d' }}
                placeholder="اختر التاريخ"
                style={{ border: 'none', outline: 'none', width: '100px', fontSize: '13px', fontWeight: '700', color: '#334155', backgroundColor: 'transparent' }}
              />
            </div>
          )}
          {dateMode === 'range' && (
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0 12px', height: '44px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8' }}>من</span>
                <Flatpickr
                  value={startDate}
                  onChange={(dates, dateStr) => setStartDate(dateStr)}
                  options={{ dateFormat: 'Y-m-d' }}
                  style={{ width: '85px', border: 'none', outline: 'none', fontWeight: '700', fontSize: '12px', textAlign: 'center', color: '#334155' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderRight: '1px solid #f1f5f9', paddingRight: '8px', marginRight: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8' }}>إلى</span>
                <Flatpickr
                  value={endDate}
                  onChange={(dates, dateStr) => setEndDate(dateStr)}
                  options={{ dateFormat: 'Y-m-d' }}
                  style={{ width: '85px', border: 'none', outline: 'none', fontWeight: '700', fontSize: '12px', textAlign: 'center', color: '#334155' }}
                />
              </div>
            </div>
          )}

          {/* 3. Status */}
          <div style={{ position: 'relative' }}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                height: '44px',
                minWidth: '150px',
                fontSize: '13px',
                fontWeight: 'bold',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                paddingRight: '14px',
                paddingLeft: '32px',
                appearance: 'none',
                outline: 'none',
                cursor: 'pointer',
                color: '#334155',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <option value="الكل">كل الطلبات</option>
              <option value="معلق">الطلبات المعلقة</option>
              <option value="موافق عليه">الموافق عليها</option>
              <option value="مرفوض">المرفوضة</option>
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          </div>

          {/* 4. Employee ID */}
          <div style={{ width: '200px' }}>
            <Select
              options={employeeIdOptions}
              value={employeeIdOptions.find(opt => opt.value === searchTerm) || null}
              onChange={(selected) => setSearchTerm(selected ? selected.value : '')}
              styles={{ ...customSelectStyles, control: (base) => ({ ...base, height: '44px', minHeight: '44px', borderRadius: '10px', border: '1px solid #e2e8f0' }) }}
              placeholder="رقم الموظف..."
              isSearchable={true}
              isClearable={true}
            />
          </div>

          {/* 5. Employee Name */}
          <div style={{ width: '280px', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, color: '#94a3b8', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
              <User size={16} />
            </div>
            <Select
              options={employeeNameOptions}
              value={employeeNameOptions.find(opt => opt.value === searchTerm) || null}
              onChange={(selected) => setSearchTerm(selected ? selected.value : '')}
              styles={{ ...customSelectStyles, control: (base) => ({ ...base, height: '44px', minHeight: '44px', borderRadius: '10px', border: '1px solid #e2e8f0', paddingLeft: '24px' }) }}
              placeholder="اسم الموظف..."
              isSearchable={true}
              isClearable={true}
            />
          </div>

        </div>

        {/* Left Side: Submit Button */}
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            backgroundColor: '#0f766e',
            height: '44px',
            padding: '0 20px',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 'bold',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(15, 118, 110, 0.2)',
            transition: 'opacity 0.2s'
          }}
        >
          <span>تقديم طلب جديد</span>
          <Plus size={18} strokeWidth={2.5} />
        </button>

      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '24px' }}>

        {/* Total (Rightmost) */}
        <div onClick={() => setFilterStatus('الكل')} style={{ cursor: 'pointer', opacity: filterStatus === 'الكل' ? 1 : 0.6, transition: 'all 0.2s', backgroundColor: '#ffffff', borderRadius: '16px', border: filterStatus === 'الكل' ? '2px solid #3b82f6' : '1px solid #f1f5f9', boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.05)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', margin: '0 0 4px 0' }}>إجمالي الطلبات</p>
            <h3 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{totalCount}</h3>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', margin: '4px 0 0 0' }}>طلب</p>
          </div>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Fingerprint size={28} strokeWidth={2} />
          </div>
        </div>

        {/* Pending */}
        <div onClick={() => setFilterStatus('معلق')} style={{ cursor: 'pointer', opacity: filterStatus === 'معلق' ? 1 : 0.6, transition: 'all 0.2s', backgroundColor: '#ffffff', borderRadius: '16px', border: filterStatus === 'معلق' ? '2px solid #d97706' : '1px solid #f1f5f9', boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.05)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', margin: '0 0 4px 0' }}>طلبات معلقة</p>
            <h3 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{pendingCount}</h3>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', margin: '4px 0 0 0' }}>طلب</p>
          </div>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={28} strokeWidth={2} />
          </div>
        </div>

        {/* Approved */}
        <div onClick={() => setFilterStatus('موافق عليه')} style={{ cursor: 'pointer', opacity: filterStatus === 'موافق عليه' ? 1 : 0.6, transition: 'all 0.2s', backgroundColor: '#ffffff', borderRadius: '16px', border: filterStatus === 'موافق عليه' ? '2px solid #10b981' : '1px solid #f1f5f9', boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.05)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', margin: '0 0 4px 0' }}>طلبات موافق عليها</p>
            <h3 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{approvedCount}</h3>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', margin: '4px 0 0 0' }}>طلب</p>
          </div>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Check size={28} strokeWidth={2.5} />
          </div>
        </div>

        {/* Rejected (Leftmost) */}
        <div onClick={() => setFilterStatus('مرفوض')} style={{ cursor: 'pointer', opacity: filterStatus === 'مرفوض' ? 1 : 0.6, transition: 'all 0.2s', backgroundColor: '#ffffff', borderRadius: '16px', border: filterStatus === 'مرفوض' ? '2px solid #ef4444' : '1px solid #f1f5f9', boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.05)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', margin: '0 0 4px 0' }}>طلبات مرفوضة</p>
            <h3 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{rejectedCount}</h3>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', margin: '4px 0 0 0' }}>طلب</p>
          </div>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={28} strokeWidth={2.5} />
          </div>
        </div>

      </div>

      {/* Table Section */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse" dir="rtl">
            <thead>
              <tr className="bg-white text-slate-900 border-b border-slate-200 text-sm">
                <th className="p-5 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 text-right" style={{ minWidth: '120px' }} onClick={() => handleSort('employeeId')}>
                  <div className="flex items-center gap-1 justify-start">الرقم الوظيفي <SortIcon col="employeeId" /></div>
                </th>
                <th className="p-5 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 text-right" style={{ minWidth: '250px' }} onClick={() => handleSort('employeeName')}>
                  <div className="flex items-center gap-1 justify-start">اسم الموظف <SortIcon col="employeeName" /></div>
                </th>
                <th className="p-5 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 text-center" onClick={() => handleSort('date')}>
                  <div className="flex items-center justify-center gap-1">التاريخ <SortIcon col="date" /></div>
                </th>
                <th className="p-5 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 text-center" onClick={() => handleSort('type')}>
                  <div className="flex items-center justify-center gap-1">النوع <SortIcon col="type" /></div>
                </th>
                <th className="p-5 font-bold whitespace-nowrap text-center">وقت الدخول</th>
                <th className="p-5 font-bold whitespace-nowrap text-center">وقت الخروج</th>
                <th className="p-5 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 text-center" onClick={() => handleSort('reason')}>
                  <div className="flex items-center justify-center gap-1">السبب <SortIcon col="reason" /></div>
                </th>
                <th className="p-5 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 text-center" onClick={() => handleSort('status')}>
                  <div className="flex items-center justify-center gap-1">الحالة <SortIcon col="status" /></div>
                </th>
                <th className="p-5 font-bold whitespace-nowrap text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {filteredPunches.length === 0 ? (
                <tr><td colSpan="9" className="p-8 text-center text-slate-500 font-bold">لا توجد طلبات مطابقة</td></tr>
              ) : filteredPunches.map(p => {
                const punchEmployeeId = String(p.employeeId || '').trim();
                const emp = punchEmployeeId
                  ? employees.find(e => String(e.id || '').trim() === punchEmployeeId)
                  : employees.find(e => String(e.name || '').trim() === String(p.employeeName || '').trim());
                const pDate = new Date(p.date || p.createdAt);
                const currentMonthStr = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`;
                const bonusPunches = emp?.bonusMissingPunches?.[currentMonthStr] || 0;
                const allowedPunches = (emp?.allowedMissingPunches ?? 3) + bonusPunches;
                const monthCount = punches.filter(empPunch => {
                  if (String(empPunch.employeeId || '').trim() !== String(p.employeeId || '').trim()) return false;
                  const empDate = new Date(empPunch.date || empPunch.createdAt);
                  return empDate.getMonth() === pDate.getMonth() && empDate.getFullYear() === pDate.getFullYear();
                }).length;
                const isExhausted = monthCount > allowedPunches;

                // Status styling based on Image 2
                let dotClass = "bg-slate-400";
                let textClass = "text-slate-600";
                if (p.status === 'معلق' || p.status === 'قيد المراجعة') {
                  dotClass = "bg-amber-400";
                  textClass = "text-[#0f766e]"; // Greenish text for pending as in image
                } else if (p.status === 'موافق عليه' || p.status === 'موافق' || p.status === 'مكتمل الدوام') {
                  dotClass = "bg-emerald-400";
                  textClass = "text-emerald-700";
                } else if (p.status === 'مرفوض') {
                  dotClass = "bg-red-400";
                  textClass = "text-red-700";
                }

                return (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-5 text-teal-700 font-bold text-sm whitespace-nowrap text-right">
                      {p.employeeId}
                    </td>
                    <td className="p-5 font-bold text-slate-800 whitespace-nowrap text-right">
                      {emp?.name || p.employeeName}
                    </td>
                    <td className="p-5 whitespace-nowrap text-slate-800 font-bold text-sm text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span>{p.date}</span>
                        <Calendar size={14} className="text-[#0f766e]" />
                      </div>
                    </td>
                    <td className="p-5 whitespace-nowrap text-center text-sm font-bold text-slate-800">
                      {p.isVirtual ? 'الي' : 'يدوي'}
                    </td>
                    <td className="p-5 font-bold whitespace-nowrap text-center text-sm">
                      <div className="flex items-center justify-center gap-2">
                        {(p.type === 'دخول' || p.reason === 'بصمة دخول وخروج') && p.isVirtual && (p.status === 'معلق' || p.status === 'قيد المراجعة') ? (
                          <>
                            <input type="time" className="premium-time-input" style={{ width: 75, height: 28, fontSize: 13 }} value={inlineTimes[`${p.id}_in`] || ''} onChange={(e) => handleInlineTimeChange(`${p.id}_in`, e.target.value)} />
                            <Clock size={14} className="text-slate-400" />
                          </>
                        ) : (p.type === 'دخول' && !p.isVirtual) ? (
                          <>
                            <span className="text-slate-800">{formatTime12h(p.time)}</span>
                            <Clock size={14} className="text-slate-400" />
                          </>
                        ) : (
                          <>
                            <span className={p.attendanceRecord?.timeIn ? 'text-slate-800' : 'text-slate-400'}>{formatTime12h(p.attendanceRecord?.timeIn)}</span>
                            <Clock size={14} className="text-slate-400" />
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-5 font-bold whitespace-nowrap text-center text-sm">
                      <div className="flex items-center justify-center gap-2">
                        {(p.type === 'خروج' || p.reason === 'بصمة دخول وخروج') && p.isVirtual && (p.status === 'معلق' || p.status === 'قيد المراجعة') ? (
                          <>
                            <input type="time" className="premium-time-input" style={{ width: 75, height: 28, fontSize: 13 }} value={inlineTimes[`${p.id}_out`] || ''} onChange={(e) => handleInlineTimeChange(`${p.id}_out`, e.target.value)} />
                            <Clock size={14} className="text-slate-400" />
                          </>
                        ) : (p.type === 'خروج' && !p.isVirtual) ? (
                          <>
                            <span className="text-slate-800">{formatTime12h(p.time)}</span>
                            <Clock size={14} className="text-slate-400" />
                          </>
                        ) : (
                          <>
                            <span className={p.attendanceRecord?.timeOut ? 'text-slate-800' : 'text-slate-400'}>{formatTime12h(p.attendanceRecord?.timeOut)}</span>
                            <Clock size={14} className="text-slate-400" />
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-5 text-sm text-slate-800 font-bold text-center">{p.reason}</td>
                    <td className="p-5 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${dotClass}`}></span>
                        <span className={`text-xs font-bold ${textClass}`}>{p.status}</span>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex justify-center items-center gap-3">
                        <button onClick={() => promptEmployeeAlert({ employeeId: p.employeeId, employeeName: emp?.name || p.employeeName, source: 'الختمات الناقصة', sourceReference: `${p.type || 'ختمة'} ${p.date || ''}`, suggestedMessage: `يوجد لديك سجل ختمة ناقصة (${p.type || 'دخول/خروج'}) بتاريخ ${p.date || 'غير محدد'}. يرجى مراجعة الختمات والالتزام بتسجيل الدوام.`, user })} className="shrink-0" style={{ background: '#fff7ed', border: '1px solid #fdba74', color: '#c2410c', padding: '7px 10px', borderRadius: 8, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}><Bell size={15}/> إرسال تنبيه</button>
                        {p.status === 'معلق' || p.status === 'قيد المراجعة' ? (
                          p.isVirtual ? (
                            <>
                              {/* Save Button */}
                              <button
                                onClick={() => handleDropdownAction(p, 'time')}
                                className="flex items-center justify-center text-white text-xs font-bold shadow-sm hover:opacity-90 transition-opacity"
                                style={{ backgroundColor: '#0f766e', height: '36px', borderRadius: '8px', width: '130px', flexShrink: 0, color: '#ffffff' }}
                              >
                                <span>حفظ الدوام</span>
                              </button>

                              {/* Dropdown */}
                              <div style={{ position: 'relative', width: '130px', flexShrink: 0 }}>
                                <select
                                  className="text-xs font-bold bg-white text-slate-700 focus:outline-none cursor-pointer shadow-sm transition-all"
                                  style={{ height: '36px', padding: '0 12px 0 28px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' }}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    e.target.value = "";
                                    handleDropdownAction(p, val);
                                  }}
                                  defaultValue=""
                                >
                                  <option value="" disabled>إجراءات أخرى</option>
                                  {p.type === 'خروج' && <option value="early">تسجيل كمغادرة مبكرة</option>}
                                  {(emp?.allowedLeaveTypes || ['إجازة سنوية', 'إجازة مرضية', 'مغادرة خاصة', 'مغادرة عمل', 'إجازة غير مدفوعة', 'بدل عمل إضافي']).includes('إجازة سنوية') && <option value="vacation">خصم إجازة سنوية</option>}
                                  {(emp?.allowedLeaveTypes || ['إجازة سنوية', 'إجازة مرضية', 'مغادرة خاصة', 'مغادرة عمل', 'إجازة غير مدفوعة', 'بدل عمل إضافي']).includes('إجازة مرضية') && <option value="sick">خصم إجازة مرضية</option>}
                                  {(emp?.allowedLeaveTypes || ['إجازة سنوية', 'إجازة مرضية', 'مغادرة خاصة', 'مغادرة عمل', 'إجازة غير مدفوعة', 'بدل عمل إضافي']).includes('إجازة غير مدفوعة') && <option value="unpaid">إجازة غير مدفوعة</option>}
                                  <option value="violation">تسجيل مخالفة مالية</option>
                                </select>
                                <ChevronDown size={14} className="pointer-events-none" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#000000', zIndex: 10 }} />
                              </div>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleUpdateStatus(p, 'موافق عليه')} className="icon-btn icon-btn-success shrink-0" title="موافقة"><Check size={18} strokeWidth={2.5} /></button>
                              <button onClick={() => handleUpdateStatus(p, 'مرفوض')} className="icon-btn icon-btn-delete shrink-0" title="رفض"><X size={18} strokeWidth={2.5} /></button>
                              <button onClick={() => handleDelete(p.id)} className="icon-btn icon-btn-delete shrink-0" title="حذف الطلب"><Trash2 size={18} strokeWidth={2.5} /></button>
                              {isExhausted && <button onClick={() => handleRegisterViolation(p)} className="shrink-0" style={{ background: '#0f766e', color: 'white', padding: '6px 16px', borderRadius: '6px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>تسجيل مخالفة</button>}
                            </>
                          )
                        ) : (
                          <>
                            <span className="text-xs text-slate-400 font-bold whitespace-nowrap">({p.approvedBy || '-'})</span>
                            {!p.isVirtual && <button onClick={() => handleUpdateStatus(p, 'معلق')} className="icon-btn icon-btn-warning shrink-0" title="تراجع عن القرار"><Undo2 size={16} strokeWidth={2.5} /></button>}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        {filteredPunches.length > 0 && (
          <div className="flex items-center p-5 border-t border-slate-100 bg-white justify-between">
            {/* Right Side: Page size */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-500">عرض</span>
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 bg-white cursor-pointer hover:border-slate-300 transition-colors">
                <span className="text-sm font-bold text-slate-700">10</span>
                <ChevronDown size={14} className="text-slate-400" />
              </div>
            </div>

            {/* Middle: Info */}
            <div className="text-sm font-bold text-slate-500">
              من 1 إلى {filteredPunches.length} من أصل {filteredPunches.length} طلب
            </div>

            {/* Left Side: Buttons */}
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors font-bold">&laquo;</button>
              <button className="w-8 h-8 flex items-center justify-center rounded border text-white font-bold shadow-sm" style={{ backgroundColor: '#0f766e', borderColor: '#0f766e' }}>1</button>
              <button className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors font-bold">&raquo;</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Missing Punch Modal */}
      <div
        className="modal-overlay"
        style={{ zIndex: 10500, display: showAddModal ? 'flex' : 'none' }}
      >
        <div className="modal-content animate-fade-in" style={{ maxWidth: '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
          <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Fingerprint className="text-[#0ea5e9]" size={20} /> طلب ختمة ناقصة
            </h3>
            <button type="button" onClick={() => setShowAddModal(false)} className="icon-btn hover:bg-gray-100 rounded-full p-2 transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto">
            <form onSubmit={handleAddPunch} className="space-y-4">
              <div className="input-group">
                <label>الموظف</label>
                <select
                  className="input-field w-full"
                  value={newPunch.employeeId}
                  onChange={(e) => setNewPunch({ ...newPunch, employeeId: e.target.value })}
                  required
                >
                  <option value="">اختر الموظف...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>التاريخ</label>
                <Flatpickr
                  value={newPunch.date}
                  onChange={(dates, dateStr) => setNewPunch({ ...newPunch, date: dateStr })}
                  className="input-field w-full bg-white"
                  options={{ dateFormat: 'Y-m-d', disableMobile: true, maxDate: 'today' }}
                  placeholder="اختر التاريخ"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="input-group">
                  <label>نوع الختمة</label>
                  <select
                    className="input-field w-full"
                    value={newPunch.type}
                    onChange={(e) => setNewPunch({ ...newPunch, type: e.target.value })}
                    required
                  >
                    <option value="دخول">دخول</option>
                    <option value="خروج">خروج</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>الوقت</label>
                  <input
                    type="time"
                    className="input-field w-full bg-white"
                    value={(() => {
                      if (!newPunch.time) return '';
                      const timeStr = String(newPunch.time);
                      if (!timeStr.includes('ص') && !timeStr.includes('م') && !timeStr.includes('AM') && !timeStr.includes('PM')) {
                        return timeStr;
                      }
                      const isPM = timeStr.includes('م') || timeStr.includes('PM');
                      const cleanTime = timeStr.replace(/[صمAMPM\s]/g, '').trim();
                      const parts = cleanTime.split(':');
                      if (parts.length < 2) return '';
                      let h = parseInt(parts[0], 10);
                      if (isPM && h < 12) h += 12;
                      if (!isPM && h === 12) h = 0;
                      return `${String(h).padStart(2, '0')}:${String(parts[1]).padStart(2, '0')}`;
                    })()}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setNewPunch({ ...newPunch, time: '' });
                        return;
                      }
                      const [hoursStr, minutesStr] = val.split(':');
                      let hours = parseInt(hoursStr, 10);
                      const ampm = hours >= 12 ? 'م' : 'ص';
                      hours = hours % 12 || 12;
                      setNewPunch({ ...newPunch, time: `${hours}:${minutesStr} ${ampm}` });
                    }}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>سبب عدم تسجيل الختمة</label>
                <textarea
                  className="input-field w-full"
                  rows="2"
                  placeholder="اذكر السبب بوضوح..."
                  value={newPunch.reason}
                  onChange={(e) => setNewPunch({ ...newPunch, reason: e.target.value })}
                  required
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline">إلغاء</button>
                <button type="submit" className="btn text-white px-6 font-bold rounded-lg shadow-sm" style={{ backgroundColor: '#0f766e' }}>إرسال الطلب</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HRMissingPunches;
