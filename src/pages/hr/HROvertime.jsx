import { isActiveEmployee } from '../../utils/employeeStatus';
import { isAdmin } from '../../services/settings';
import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, Clock, XCircle, Calendar, Plus, X, ArrowUpDown, ArrowUp, ArrowDown, Check, Undo2, Trash2, Eye, ChevronDown, ChevronUp, User, Bell } from 'lucide-react';
import { promptEmployeeAlert } from '../../utils/employeeAlerts';
import Select from '../../components/SearchSelect';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/airbnb.css';
import { getEmployees, getHRLeaves, getHRLeavesByDateRange, saveHRLeave, deleteHRLeave, getGlobalSettings, getHRAttendance, subscribeToHRAttendanceForDate } from '../../store';
import Swal from 'sweetalert2';
import { sendWhatsAppNotification } from '../../utils/whatsappService';
import HRDateFilter from '../../components/ui/HRDateFilter';
import { hasPermission } from '../../utils/permissions';
import { getOfficialAbsenceMinutes, getTimedLeaveMinutes, timeToMinutes } from '../../utils/attendancePolicy';

const getLocalDateStr = (d) => {
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().split('T')[0];
};

const HROvertime = ({ user, refreshCounts }) => {
  const canAdd = hasPermission(user, 'hr_overtime', 'add') || hasPermission(user, 'hr_overtime', 'create');
  const canApprove = hasPermission(user, 'hr_overtime', 'approve');
  const canDelete = hasPermission(user, 'hr_overtime', 'delete');

  const [leaves, setLeaves] = useState([]);
  const [attendanceByDate, setAttendanceByDate] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState([]);
  const [hrSettings, setHrSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'بدل عمل إضافي',
    date: '',
    startTime: '',
    endTime: '',
    rate: '1:1',
    notes: '',
    status: 'معلق'
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterStatus, setFilterStatus] = useState('معلق');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [dateMode, setDateMode] = useState('month');
  const [selectedDate, setSelectedDate] = useState(getLocalDateStr(new Date()));
  const [startDate, setStartDate] = useState(getLocalDateStr(new Date()));
  const [endDate, setEndDate] = useState(getLocalDateStr(new Date()));
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);

  const [smartModal, setSmartModal] = useState({ show: false, leave: null, attendance: null, deficitMins: 0, lateMins: 0, earlyMins: 0, requestedMins: 0, loading: false });
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  const openSmartApproval = async (leave) => {
    if (!canApprove) {
      Swal.fire('غير مصرح', 'حسابك في وضع المعاينة فقط، ليس لديك صلاحية لاعتماد العمل الإضافي.', 'warning');
      return;
    }
    setSmartModal({ show: true, leave, attendance: null, deficitMins: 0, requestedMins: 0, loading: true });
    
    // Calculate requested minutes
    let reqMins = 0;
    if (leave.startTime && leave.endTime) {
      const [sh, sm] = leave.startTime.split(':').map(Number);
      const [eh, em] = leave.endTime.split(':').map(Number);
      reqMins = (eh * 60 + em) - (sh * 60 + sm);
    } else {
      reqMins = 8 * 60; // Default full day
    }
    
    // Fetch attendance for the employee on that day
    let attendanceData = null;
    let defMins = 0;
    let lateMins = 0;
    let earlyMins = 0;
    try {
      const targetDate = leave.date || leave.startDate;
      const attList = await getHRAttendance(targetDate);
      const emp = employees.find(e => String(e.id) === String(leave.employeeId) || String(e.employeeId) === String(leave.employeeId));
      let shiftStart = emp?.shiftStart || '08:00';
      let shiftEnd = emp?.shiftEnd || '16:00';
      
      const allAtts = attList.filter(a => {
        const aEmpId = String(a.employeeId || '');
        const aUserId = String(a.userId || '');
        const aName = String(a.employeeName || '').trim();

        const lEmpId = String(leave.employeeId || '');
        const lName = String(leave.employeeName || '').trim();

        const empId = emp ? String(emp.employeeId || '') : '';
        const empDocId = emp ? String(emp.id || '') : '';
        const empName = emp ? String(emp.name || '').trim() : '';

        const matchId = (aEmpId && (aEmpId === lEmpId || aEmpId === empId || aEmpId === empDocId)) || 
                        (aUserId && (aUserId === lEmpId || aUserId === empId || aUserId === empDocId));
        
        const matchName = (aName && aName !== '' && (aName === lName || aName === empName));

        return (matchId || matchName) && a.date === leave.date;
      });
      
      attendanceData = allAtts.find(a => a.timeIn && a.timeIn !== '--:--' && a.timeIn !== '') || allAtts[0];
      
      try {
        const settings = await getGlobalSettings();
        if (emp?.workShiftName && settings.workShifts) {
          const shift = settings.workShifts.find(s => s.name === emp.workShiftName);
          if (shift) { shiftStart = shift.startTime; shiftEnd = shift.endTime; }
        }
      } catch(e) {}
      
      reqMins = getTimedLeaveMinutes(leave);
      const [ssh, ssm] = shiftStart.split(':').map(Number);
      const [seh, sem] = shiftEnd.split(':').map(Number);
      const shiftMins = (seh * 60 + sem) - (ssh * 60 + ssm);

      if (attendanceData && attendanceData.timeIn && attendanceData.timeOut && attendanceData.timeOut !== '--:--') {
        const parseTimeWithAMPM = (tStr) => {
          if (!tStr) return { h: 0, m: 0 };
          const cleaned = tStr.replace(/[^\d:]/g, '').trim();
          let [h, m] = cleaned.split(':').map(Number);
          
          if (tStr.includes('م') || tStr.toLowerCase().includes('pm')) {
            if (h < 12) h += 12;
          } else if (tStr.includes('ص') || tStr.toLowerCase().includes('am')) {
            if (h === 12) h = 0;
          }
          return { h: h || 0, m: m || 0 };
        };
        const { h: ah, m: am } = parseTimeWithAMPM(attendanceData.timeIn);
        const { h: oh, m: om } = parseTimeWithAMPM(attendanceData.timeOut);
        
        // Calculate late arrival
        const actualStartMins = (ah || 0) * 60 + (am || 0);
        const shiftStartMins = ssh * 60 + ssm;
        if (actualStartMins > shiftStartMins) {
           lateMins = actualStartMins - shiftStartMins;
        }

        // Calculate early departure
        const actualEndMins = (oh || 0) * 60 + (om || 0);
        const shiftEndMins = seh * 60 + sem;
        if (actualEndMins < shiftEndMins) {
           earlyMins = shiftEndMins - actualEndMins;
        }
        
        defMins = getOfficialAbsenceMinutes({ timeIn: attendanceData.timeIn, timeOut: attendanceData.timeOut, shiftStart, shiftEnd });
        lateMins = Math.min(defMins, Math.max(0, timeToMinutes(attendanceData.timeIn) - timeToMinutes(shiftStart)));
        earlyMins = defMins - lateMins;
      } else {
        const lDate = new Date(leave.date);
        if (lDate.getDay() !== 5) { // Assuming Friday is weekend
           defMins = shiftMins; // full day deficit
        }
      }
    } catch (err) {
      console.error(err);
      setSmartModal(previous => ({ ...previous, show: false, loading: false }));
      Swal.fire('تعذر تحميل الحضور', 'لم يتم احتساب الإضافي. أعد المحاولة بعد تحميل الختمات المعتمدة.', 'error');
      return;
    }
    
    setSmartModal({
      show: true,
      leave,
      attendance: attendanceData,
      deficitMins: defMins,
      lateMins,
      earlyMins,
      requestedMins: reqMins,
      loading: false
    });
  };

  const confirmSmartApproval = async () => {
    const { leave, deficitMins, requestedMins } = smartModal;
    
    // Check if it's weekend
    const lDate = new Date(leave.date);
    const isHoliday = lDate.getDay() === 5; // simplified holiday check (Friday)
    
    let baseRate = isHoliday ? '1:1.5' : '1:1.25';
    if(leave.rate) baseRate = leave.rate; // Respect original if set explicitly
    
    let compMins = 0; // Compensating (not payable)
    let extraMins = 0; // Pure payable overtime
    
    if (deficitMins > 0) {
      if (requestedMins <= deficitMins) {
        compMins = requestedMins;
      } else {
        compMins = deficitMins;
        extraMins = requestedMins - deficitMins;
      }
    } else {
      extraMins = requestedMins;
    }
    
    const compHoursStr = compMins > 0 ? `${Math.floor(compMins/60)} ساعة و ${compMins%60} دقيقة (بمعدل 1:1 لتغطية العجز)` : '';
    const extraHoursStr = extraMins > 0 ? `${Math.floor(extraMins/60)} ساعة و ${extraMins%60} دقيقة (بمعدل ${baseRate})` : '';
    
    let splitNotes = `\n\n-- تفاصيل الاحتساب الذكي --\n`;
    if(compMins > 0) splitNotes += `* تم اقتطاع ${compHoursStr}\n`;
    if(extraMins > 0) splitNotes += `* الصافي الفعلي للإضافي: ${extraHoursStr}\n`;
    
    const finalNotes = (leave.notes || '') + splitNotes;
    
    const updatedLeave = {
      ...leave,
      notes: finalNotes,
      status: 'موافق',
       rateDetails: {
          compMins,
          extraMins,
          baseRate,
          // Keep the attendance settlement auditable and prevent payroll from
          // deducting the same covered lateness for a second time.
          lateCoveredMins: Math.min(Number(smartModal.lateMins) || 0, compMins),
          earlyCoveredMins: Math.min(Number(smartModal.earlyMins) || 0, Math.max(0, compMins - (Number(smartModal.lateMins) || 0)))
       }
    };
    
    Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false });
    Swal.showLoading();
    try {
      await saveHRLeave(updatedLeave);
      
      try {
        const emp = employees.find(e => String(e.id || '').trim() === String(leave.employeeId || '').trim() || String(e.name || '').trim() === String(leave.employeeName || '').trim());
        if (emp && emp.phone) {
          let msg = `مرحباً ${emp.name}،\nتم الموافقة على طلب العمل الإضافي الخاص بك.`;
          msg += `\n-- الإدارة`;
          await sendWhatsAppNotification(emp.phone, msg, 'overtime');
        }
      } catch(err) {
        console.error('WhatsApp Error in smart approval:', err);
      }

      setLeaves(prev => prev.map(l => l.id === leave.id ? updatedLeave : l));
      setSmartModal({ show: false, leave: null, attendance: null, deficitMins: 0, requestedMins: 0, loading: false });
      if(refreshCounts) refreshCounts();
      Swal.fire('نجاح', 'تم احتساب الإضافي والموافقة عليه بإنصاف', 'success');
    } catch(e) {
       Swal.fire('خطأ', 'حدث خطأ', 'error');
    }
  };

  const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const getSelectedMonthLabel = () => {
    const [year, month] = selectedMonth.split('-');
    return `${arabicMonths[parseInt(month, 10) - 1]} ${year}`;
  };

  useEffect(() => {
    const closeDropdown = (e) => {
      if (isMonthDropdownOpen && !e.target.closest('.month-picker-container')) {
        setIsMonthDropdownOpen(false);
      }
    };
    document.addEventListener('click', closeDropdown);
    return () => document.removeEventListener('click', closeDropdown);
  }, [isMonthDropdownOpen]);

  const formatDepartmentName = (dept) => {
    if (!dept) return 'غير محدد';
    const d = String(dept).trim().toLowerCase();
    if (d === 'logistics' || d === 'مسطرة اللوجيستي' || d === 'مسطرة اللوجستي' || d === 'لوجستيات' || d === 'الدعم اللوجستي') return 'الدعم اللوجستي';
    if (d === 'sewing' || d === 'مسطرة الخياطة' || d === 'الخياطة' || d === 'القص والخياطة') return 'القص والخياطة';
    if (d === 'packaging' || d === 'مسطرة التغليف' || d === 'تغليف' || d === 'تغليف وتشطيب') return 'تغليف وتشطيب';
    if (d === 'cutting' || d === 'القص') return 'القص والخياطة';
    if (d === 'admin' || d === 'الإدارة' || d === 'الادارة') return 'الادارة';
    if (d === 'sales' || d === 'المبيعات' || d === 'الطلبيات') return 'الطلبيات';
    return dept;
  };

  const handlePreviewOvertime = (leave) => {
    const emp = employees.find(e => String(e.id || '').trim() === String(leave.employeeId || '').trim());
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
        <tr><th>الموظف</th><td>${leave.employeeName}</td></tr>
        <tr><th>القسم</th><td>${formatDepartmentName(emp?.department || leave.department || 'غير محدد')}</td></tr>
        <tr><th>نوع الطلب</th><td><span style="color:var(--primary); font-weight:bold;">${leave.type}</span></td></tr>
        <tr><th>التاريخ</th><td>${leave.date || leave.startDate || '-'}</td></tr>
    `;
    if (leave.startTime && leave.endTime) {
      htmlContent += `<tr><th>الوقت</th><td dir="ltr">${leave.startTime} - ${leave.endTime}</td></tr>`;
      if (leave.rate) {
        htmlContent += `<tr><th>معدل الاحتساب</th><td dir="ltr"><span style="background:#e0e7ff; color:#4f46e5; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.85rem;">${leave.rate}</span></td></tr>`;
      }
    }
    htmlContent += `</table>`;
    htmlContent += `<div class="swal-notes-box"><strong>السبب / الملاحظات:</strong><br><div style="margin-top: 8px;">${leave.notes ? leave.notes.replace(/\n/g, '<br>') : '<span style="color:#94a3b8; font-style:italic;">لا يوجد ملاحظات</span>'}</div></div>`;

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

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (columnName) => {
    if (sortConfig.key !== columnName) {
      return <ArrowUpDown size={14} className="text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-primary" /> : <ArrowDown size={14} className="text-primary" />;
  };

  const getOvertimeAmount = (leave) => {
    if (leave.status === 'مرفوض') return 0;

    const requestDate = leave.date || leave.startDate || getLocalDateStr(new Date());
    const hasUnpaidDay = leaves.some(item => {
      const approved = ['موافق', 'موافق عليه', 'مقبول', 'تمت الموافقة', 'تم التسليم'].includes(item.status);
      const sameEmployee = String(item.employeeId || '').trim() === String(leave.employeeId || '').trim();
      const coversDate = item.date === requestDate || (item.startDate && item.endDate && item.startDate <= requestDate && item.endDate >= requestDate);
      return approved && sameEmployee && item.type === 'إجازة غير مدفوعة' && coversDate;
    });
    if (hasUnpaidDay) return 0;
    
    const emp = employees.find(e => String(e.id || '').trim() === String(leave.employeeId || '').trim() || String(e.name || '').trim() === String(leave.employeeName || '').trim());
    if (!emp) return 0;
    
    const basic = Number(emp.basicSalary) || 0;
    if (basic <= 0) return 0;
    
    const [yStr, mStr] = requestDate.split('-');
    const daysInMonth = new Date(parseInt(yStr, 10), parseInt(mStr, 10), 0).getDate();
    
    let workDays = hrSettings?.workDaysPerMonth || daysInMonth;
    if (hrSettings?.workDaysStrategy === 'actual' || !hrSettings?.workDaysStrategy) {
       workDays = daysInMonth;
    } else if (hrSettings?.workDaysStrategy === 'custom' && hrSettings?.customWorkDays) {
      const mIndex = parseInt(mStr, 10) - 1;
      if (!isNaN(mIndex) && hrSettings.customWorkDays[mIndex]) {
        workDays = hrSettings.customWorkDays[mIndex];
      }
    }
    
    const dailyRate = basic / workDays;
    
    let empStandardWorkHours = hrSettings?.standardWorkHours || 8;
    if (emp.shiftStart && emp.shiftEnd) {
      const [sh, sm] = emp.shiftStart.split(':').map(Number);
      const [eh, em] = emp.shiftEnd.split(':').map(Number);
      if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
        let mins = (eh * 60 + em) - (sh * 60 + sm);
        if (mins < 0) mins += 24 * 60;
        empStandardWorkHours = mins / 60;
        if (empStandardWorkHours <= 0) empStandardWorkHours = hrSettings?.standardWorkHours || 8;
      }
    }
    
    const hourlyRate = dailyRate / empStandardWorkHours;
    
    if (hrSettings?.overtimeCalculationMethod === 'fixed_amount') {
       return hrSettings.overtimeFixedAmount || 10;
    }
    
    let multiplier = 1.25;
    const storedRate = leave.rate || leave?.rateDetails?.baseRate;
    if (storedRate) {
      const parts = String(storedRate).split(':');
      if (parts.length === 2) {
        multiplier = Number(parts[1]) || 1.25;
      } else {
        multiplier = Number(storedRate) || 1.25;
      }
    } else {
      const d = new Date(requestDate);
      const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const weekends = hrSettings?.weekendDays || ['الجمعة'];
      const dayName = arabicDays[d.getDay()];
      if (weekends.includes(dayName)) {
        multiplier = hrSettings?.overtimeWeekendMultiplier || 1.50;
      } else {
        multiplier = hrSettings?.overtimeMultiplier || 1.25;
      }
    }
    
    let mins = getPayableOvertimeMinutes(leave);
    if (!Number.isFinite(mins) && leave.startTime && leave.endTime) {
      const [sh, sm] = leave.startTime.split(':').map(Number);
      const [eh, em] = leave.endTime.split(':').map(Number);
      mins = (eh * 60 + em) - (sh * 60 + sm);
      if (mins < 0) mins += 24 * 60;
      
      if (hrSettings?.maxDailyOvertimeHours) {
         const maxMins = hrSettings.maxDailyOvertimeHours * 60;
         if (mins > maxMins) mins = maxMins;
      }
    }
    
    const hours = mins / 60;
    return hours * hourlyRate * multiplier;
  };

  const getOvertimeDuration = (leave) => {
    let mins = getPayableOvertimeMinutes(leave);
    if (!Number.isFinite(mins) && leave.startTime && leave.endTime) {
      const [sh, sm] = leave.startTime.split(':').map(Number);
      const [eh, em] = leave.endTime.split(':').map(Number);
      mins = (eh * 60 + em) - (sh * 60 + sm);
      if (mins < 0) mins += 24 * 60;
      
      if (hrSettings?.maxDailyOvertimeHours) {
         const maxMins = hrSettings.maxDailyOvertimeHours * 60;
         if (mins > maxMins) mins = maxMins;
      }
    }
    
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    
    if (hours > 0 && remainingMins > 0) {
      return `${hours} س و ${remainingMins} د`;
    } else if (hours > 0) {
      return `${hours} ساعة`;
    } else {
      return `${remainingMins} دقيقة`;
    }
  };

  const getOvertimeReason = (leave) => {
    const notes = String(leave?.notes || '').trim();
    if (!notes) return '-';
    const reasonOnly = notes
      .split(/--\s*تفاصيل الاحتساب الذكي\s*--/i)[0]
      .replace(/[\s\-–—]+$/g, '')
      .trim();
    return reasonOnly || '-';
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let from = '';
      let to = '';
      if (dateMode === 'day') {
        from = selectedDate;
        to = selectedDate;
      } else if (dateMode === 'month') {
        from = `${selectedMonth}-01`;
        to = `${selectedMonth}-31`;
      } else if (dateMode === 'range') {
        from = startDate;
        to = endDate;
      }

      const [leavesData, empsData, settingsData] = await Promise.all([
        from && to ? getHRLeavesByDateRange(from, to) : getHRLeaves(),
        employees.length === 0 ? getEmployees() : Promise.resolve(employees),
        hrSettings ? Promise.resolve(hrSettings) : getGlobalSettings()
      ]);
      setLeaves(leavesData || []);
      if (employees.length === 0) setEmployees(empsData || []);
      if (!hrSettings) setHrSettings(settingsData);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [dateMode, selectedMonth, selectedDate, startDate, endDate]);

  useEffect(() => {
    let cancelled = false;
    const dates = [...new Set(leaves.filter(leave => ['بدل عمل إضافي', 'عمل إضافي'].includes(leave.type))
      .map(leave => leave.date || leave.startDate).filter(Boolean))];
    setAttendanceByDate({});
    const unsubscribe = dates.map(date => subscribeToHRAttendanceForDate(date, records => {
      if (!cancelled) setAttendanceByDate(previous => ({ ...previous, [date]: { records } }));
    }, error => {
      console.error('Overtime attendance subscription failed:', error);
      if (!cancelled) setAttendanceByDate(previous => ({ ...previous, [date]: { error: true } }));
    }));
    return () => { cancelled = true; unsubscribe.forEach(stop => stop()); };
  }, [leaves]);

  const renderRequestAttendance = (leave, emp) => {
    const date = leave.date || leave.startDate;
    if (!date) return <span className="text-muted text-xs">تاريخ الطلب غير محدد</span>;
    const attendance = attendanceByDate[date];
    if (!attendance) return <span className="text-muted text-xs">جاري تحميل الحضور...</span>;
    if (attendance.error) return <span className="text-rose-600 text-xs">تعذر تحميل سجل الحضور</span>;
    const ids = [leave.employeeId, emp?.id, emp?.employeeId].filter(Boolean).map(id => String(id).trim());
    const records = attendance.records.filter(record => {
      if (record.date !== date) return false;
      const recordIds = [record.employeeId, record.userId].filter(Boolean).map(id => String(id).trim());
      if (recordIds.length) return recordIds.some(id => ids.includes(id));
      const name = String(record.employeeName || '').trim();
      return Boolean(name && [leave.employeeName, emp?.name].some(value => String(value || '').trim() === name));
    });
    if (!records.length) return <span className="text-muted text-xs">لا يوجد سجل حضور لهذا اليوم</span>;
    const formatTimePart = (value) => {
      const minutes = timeToMinutes(value);
      if (minutes == null) return '--:--';
      const hours = Math.floor(minutes / 60);
      const period = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      const formattedMins = String(minutes % 60).padStart(2, '0');
      return `${formattedHours}:${formattedMins} ${period}`;
    };

    return (
      <div className="flex flex-col gap-1 items-center justify-center">
        {records.map((record, index) => (
          <div
            key={record.id || index}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-200/80 rounded font-mono text-xs font-semibold text-slate-700 whitespace-nowrap"
            dir="ltr"
          >
            <span>{formatTimePart(record.timeIn)}</span>
            <span className="text-slate-400 mx-1">-</span>
            <span>{formatTimePart(record.timeOut)}</span>
          </div>
        ))}
      </div>
    );
  };

  const getPayableOvertimeMinutes = leave => {
    if (leave.status !== 'معلق') {
      const saved = Number(leave.rateDetails?.extraMins);
      if (Number.isFinite(saved)) return saved;
    }
    const requested = getTimedLeaveMinutes(leave);
    const emp = employees.find(employee => [employee.id, employee.employeeId].some(id =>
      id && String(id).trim() === String(leave.employeeId || '').trim()));
    const ids = [leave.employeeId, emp?.id, emp?.employeeId].filter(Boolean).map(String);
    const records = attendanceByDate[leave.date || leave.startDate]?.records;
    if (!records) return requested;
    const attendance = records.find(record => !record.isLeave && record.status !== 'محذوف'
      && [record.employeeId, record.userId].some(id => id && ids.includes(String(id))));
    if (!attendance || timeToMinutes(attendance.timeIn) == null || timeToMinutes(attendance.timeOut) == null) return requested;
    const shift = globalShiftForEmployee(emp);
    const dayName = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][new Date(leave.date || leave.startDate).getDay()];
    const deficit = (hrSettings?.weekendDays || ['الجمعة']).includes(dayName) ? 0
      : getOfficialAbsenceMinutes({ timeIn: attendance.timeIn, timeOut: attendance.timeOut, ...shift });
    const payable = Math.max(0, requested - deficit);
    return hrSettings?.maxDailyOvertimeHours ? Math.min(payable, hrSettings.maxDailyOvertimeHours * 60) : payable;
  };

  const globalShiftForEmployee = emp => {
    const shift = hrSettings?.workShifts?.find(item => item.name === emp?.workShiftName);
    return { shiftStart: shift?.startTime || emp?.shiftStart || '08:00', shiftEnd: shift?.endTime || emp?.shiftEnd || '16:00' };
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canAdd) {
      Swal.fire('غير مصرح', 'حسابك في وضع المعاينة فقط، ليس لديك صلاحية لإضافة طلبات عمل إضافي.', 'warning');
      return;
    }
    if (isSavingRef.current) return;

    if (!formData.notes || formData.notes.trim() === '') {
      Swal.fire('تنبيه', 'الرجاء إدخال السبب / الملاحظات', 'warning');
      return;
    }
    if (!formData.date || !formData.startTime || !formData.endTime) {
      Swal.fire('تنبيه', 'يرجى تحديد التاريخ ووقت البداية والنهاية', 'warning');
      return;
    }
    if (formData.startTime >= formData.endTime) {
      Swal.fire('خطأ', 'لا يمكن أن يكون وقت النهاية قبل أو يساوي وقت البداية. يجب أن يكون نطاق الطلب خلال يوم واحد فقط.', 'error');
      return;
    }
    
    const [sHours, sMins] = formData.startTime.split(':').map(Number);
    const [eHours, eMins] = formData.endTime.split(':').map(Number);
    const diffMins = (eHours * 60 + eMins) - (sHours * 60 + sMins);
    
    if (!Number.isFinite(diffMins) || diffMins <= 0) {
      Swal.fire('خطأ', 'يرجى إدخال وقت بداية ونهاية صحيحين للعمل الإضافي.', 'error');
      return;
    }

    if (diffMins > 360 && !isAdmin(user)) {
      Swal.fire('خطأ', 'الحد الأقصى لطلب العمل الإضافي 6 ساعات. يمكن للمدير إدخال مدة أطول.', 'error');
      return;
    }
    
    const emp = employees.find(e => String(e.id || '').trim() === String(formData.employeeId || '').trim());
    if (!emp) {
      Swal.fire('خطأ', 'الرجاء اختيار موظف', 'error');
      return;
    }

    // Give immediate feedback for another request on the same day.
    const isDuplicate = leaves.some(l => {
      if (l.status === 'مرفوض') return false;
      if (String(l.employeeId || '').trim() !== String(formData.employeeId || '').trim()) return false;
      if (l.type !== 'بدل عمل إضافي' && l.type !== 'عمل إضافي') return false;
      return (l.date || l.startDate) === formData.date;
    });

    if (isDuplicate && !isAdmin(user)) {
      Swal.fire('خطأ', 'يوجد طلب عمل إضافي مسبقاً لهذا الموظف في نفس اليوم!', 'error');
      return;
    }

    let shiftStart = emp.shiftStart || '08:00';
    let shiftEnd = emp.shiftEnd || '16:00';
    try {
      const settings = await getGlobalSettings();
      if (emp.workShiftName && settings.workShifts) {
        const shift = settings.workShifts.find(s => s.name === emp.workShiftName);
        if (shift) {
          shiftStart = shift.startTime;
          shiftEnd = shift.endTime;
        }
      }
    } catch(e){}

    const [shiftStartH, shiftStartM] = shiftStart.split(':').map(Number);
    const [shiftEndH, shiftEndM] = shiftEnd.split(':').map(Number);

    const overtimeStartMins = sHours * 60 + sMins;
    const overtimeEndMins = eHours * 60 + eMins;
    const shiftStartMins = shiftStartH * 60 + shiftStartM;
    const shiftEndMins = shiftEndH * 60 + shiftEndM;

    if (!isAdmin(user) && overtimeStartMins < shiftEndMins && overtimeEndMins > shiftStartMins) {
      Swal.fire('خطأ', 'لا يمكن تقديم عمل إضافي خلال أوقات الدوام الرسمي الخاصة بالموظف (' + shiftStart + ' إلى ' + shiftEnd + ')', 'error');
      return;
    }
    
    isSavingRef.current = true;
    setIsSaving(true);
    try {
      await saveHRLeave({
        ...formData,
        employeeName: emp.name,
        department: emp.department || 'غير محدد'
      }, user);
      
      Swal.fire('نجاح', 'تم تسجيل الطلب بنجاح', 'success');
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error(error);
      Swal.fire('خطأ', error.message || 'حدث خطأ أثناء حفظ الطلب', 'error');
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (leave, newStatus) => {
    if (!canApprove) {
      Swal.fire('غير مصرح', 'حسابك في وضع المعاينة فقط، ليس لديك صلاحية لاعتماد أو رفض العمل الإضافي.', 'warning');
      return;
    }
    let actionReason = '';
    if (newStatus === 'موافق' || newStatus === 'مرفوض') {
      const { value, isDismissed } = await Swal.fire({
        title: newStatus === 'موافق' ? 'تأكيد الموافقة' : 'سبب الرفض',
        input: 'textarea',
        inputPlaceholder: newStatus === 'موافق' ? 'ملاحظات الموافقة (اختياري)...' : 'اكتب سبب الرفض هنا ليظهر للموظف... (اختياري)',
        showCancelButton: true,
        confirmButtonText: newStatus === 'موافق' ? 'تأكيد الموافقة' : 'تأكيد الرفض',
        cancelButtonText: 'إلغاء'
      });
      if (isDismissed) return;
      actionReason = value || '';
    }

    Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false });
    Swal.showLoading();
    
    try {
      const reasonLabel = newStatus === 'موافق' ? 'ملاحظات الإدارة' : 'سبب الرفض';
      const updatedNotes = (newStatus === 'موافق' || newStatus === 'مرفوض') && actionReason ? `${leave.notes || ''}\n(${reasonLabel}: ${actionReason})` : leave.notes;
      await saveHRLeave({ ...leave, status: newStatus, notes: updatedNotes });

      if (newStatus === 'موافق' || newStatus === 'مرفوض') {
        try {
          const emp = employees.find(e => String(e.id || '').trim() === String(leave.employeeId || '').trim() || String(e.name || '').trim() === String(leave.employeeName || '').trim());
          if (emp && emp.phone) {
            const actionText = newStatus === 'موافق' ? 'الموافقة على' : 'رفض';
            let msg = `مرحباً ${emp.name}،\nتم ${actionText} طلب العمل الإضافي الخاص بك.`;
            if (actionReason) msg += `\nالملاحظات: ${actionReason}`;
            msg += `\n-- الإدارة`;
            await sendWhatsAppNotification(emp.phone, msg, 'overtime');
          }
        } catch(err) { console.error('WhatsApp Error:', err); }
      }

      setLeaves(prev => prev.filter(l => l.id !== leave.id));
      await fetchData();
      if (refreshCounts) refreshCounts();
      Swal.fire('نجاح', `تم ${newStatus === 'موافق' ? 'قبول' : (newStatus === 'مرفوض' ? 'رفض' : 'تحديث')} الطلب بنجاح`, 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('خطأ', 'حدث خطأ أثناء الحفظ', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      Swal.fire('غير مصرح', 'حسابك في وضع المعاينة فقط، ليس لديك صلاحية لحذف طلبات العمل الإضافي.', 'warning');
      return;
    }
    const res = await Swal.fire({
      title: 'هل أنت متأكد؟',
      html: '<p style="margin-bottom: 15px;">لن تتمكن من التراجع عن الحذف</p><textarea id="swal-delete-notes" class="swal2-textarea" placeholder="سبب الحذف (اختياري)..." style="margin: 0; width: 100%; box-sizing: border-box;"></textarea>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء',
      preConfirm: () => document.getElementById('swal-delete-notes')?.value || ''
    });
    if (res.isConfirmed) {
      const deleteNotes = res.value;
      Swal.fire({ title: 'جاري الحذف...', allowOutsideClick: false });
      Swal.showLoading();
      try {
        await deleteHRLeave(id);
        setLeaves(prev => prev.filter(l => l.id !== id));
        await fetchData();
        if (refreshCounts) refreshCounts();
        Swal.fire('نجاح', 'تم الحذف بنجاح', 'success');
      } catch (error) {
        console.error(error);
        Swal.fire('خطأ', 'حدث خطأ أثناء الحذف', 'error');
      }
    }
  };

  if (loading) return <div className="text-center p-8">جاري التحميل...</div>;

  const sortedLeaves = [...leaves].sort((a, b) => {
    if (!sortConfig.key) return 0;
    let valA = a[sortConfig.key];
    let valB = b[sortConfig.key];
    
    if (valA == null) valA = '';
    if (valB == null) valB = '';

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    }

    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();

    const numA = Number(strA);
    const numB = Number(strB);

    if (strA !== '' && strB !== '' && !isNaN(numA) && !isNaN(numB)) {
      return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
    }

    if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });



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

  const baseOvertime = sortedLeaves.filter(l => {
    if (searchTerm && String(l.employeeId) !== String(searchTerm)) return false;
    if (l.type !== 'بدل عمل إضافي' && l.type !== 'عمل إضافي') return false;
    
    const targetDate = l.date || l.startDate || (l.createdAt ? new Date(l.createdAt).toISOString().split('T')[0] : '');
    const createdDate = l.createdAt ? new Date(l.createdAt).toISOString().split('T')[0] : '';
    
    const targetMonth = targetDate ? targetDate.slice(0, 7) : '';
    const createdMonth = createdDate ? createdDate.slice(0, 7) : '';

    if (dateMode === 'day') {
      if (targetDate !== selectedDate && createdDate !== selectedDate) return false;
    } else if (dateMode === 'month') {
      if (targetMonth !== selectedMonth && createdMonth !== selectedMonth) return false;
    } else if (dateMode === 'range') {
      const inTarget = targetDate >= startDate && targetDate <= endDate;
      const inCreated = createdDate >= startDate && createdDate <= endDate;
      if (!inTarget && !inCreated) return false;
    }
    return true;
  });

  const totalCount = baseOvertime.length;
  const pendingCount = baseOvertime.filter(l => l.status === 'معلق' || l.status === 'قيد المراجعة').length;
  const approvedCount = baseOvertime.filter(l => l.status === 'موافق' || l.status === 'مقبول').length;
  const rejectedCount = baseOvertime.filter(l => l.status === 'مرفوض').length;

  const overtimeRequests = baseOvertime.filter(l => {
    if (filterStatus === 'الكل') return true;
    if (filterStatus === 'معلق') return l.status === 'معلق' || l.status === 'قيد المراجعة';
    if (filterStatus === 'موافق') return l.status === 'موافق' || l.status === 'مقبول';
    return l.status === filterStatus;
  });

  return (
    <>
      <div className="glass-card flex flex-col min-h-[500px] animate-fade-in">
        <div className="flex-responsive mb-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Clock className="text-primary" /> طلبات العمل الإضافي
          </h2>
          <p className="text-muted text-sm mt-1">إدارة واعتماد طلبات بدل العمل الإضافي</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <HRDateFilter 
            mode={dateMode}
            setMode={setDateMode}
            date={selectedDate}
            setDate={setSelectedDate}
            month={selectedMonth}
            setMonth={setSelectedMonth}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            allowedModes={['day', 'month', 'range']}
          />
          {/* Employee ID */}
          <div style={{ width: '180px', minWidth: '180px', flexShrink: 0 }}>
              <Select
                options={employeeIdOptions}
                value={employeeIdOptions.find(opt => opt.value === searchTerm) || null}
                onChange={(selected) => setSearchTerm(selected ? selected.value : '')}
                styles={{...customSelectStyles, control: (base) => ({...base, height: '42px', minHeight: '42px', borderRadius: '10px', border: '1px solid #e2e8f0'})}}
                placeholder="رقم الموظف..."
                isSearchable={true}
                isClearable={true}
              />
          </div>

          {/* Employee Name */}
          <div style={{ width: '250px', minWidth: '250px', flexShrink: 0, position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, color: '#94a3b8', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                <User size={16} />
              </div>
              <Select
                options={employeeNameOptions}
                value={employeeNameOptions.find(opt => opt.value === searchTerm) || null}
                onChange={(selected) => setSearchTerm(selected ? selected.value : '')}
                styles={{...customSelectStyles, control: (base) => ({...base, height: '42px', minHeight: '42px', borderRadius: '10px', border: '1px solid #e2e8f0', paddingLeft: '24px'})}}
                placeholder="اسم الموظف..."
                isSearchable={true}
                isClearable={true}
              />
          </div>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)} 
            className="input-field"
            style={{ minWidth: '200px', height: '42px' }}
          >
            <option value="معلق">الطلبات المعلقة فقط</option>
            <option value="موافق">الطلبات الموافق عليها</option>
            <option value="مرفوض">الطلبات المرفوضة</option>
            <option value="الكل">سجل جميع الطلبات</option>
          </select>
          {canAdd && (
            <button 
              onClick={() => {
                setFormData({ employeeId: '', type: 'بدل عمل إضافي', date: '', startTime: '', endTime: '', rate: '1:1', notes: '', status: 'معلق' });
                setShowModal(true);
              }}
              className="premium-add-btn flex items-center gap-2 whitespace-nowrap"
            >
              <Plus size={18} /> تقديم طلب جديد
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '24px', marginBottom: '24px' }}>
        {/* Total (Rightmost) */}
        <div onClick={() => setFilterStatus('الكل')} style={{ cursor: 'pointer', opacity: filterStatus === 'الكل' ? 1 : 0.6, transition: 'all 0.2s', backgroundColor: '#ffffff', borderRadius: '16px', border: filterStatus === 'الكل' ? '2px solid #3b82f6' : '1px solid #f1f5f9', boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.05)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', margin: '0 0 4px 0' }}>إجمالي الطلبات</p>
            <h3 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{totalCount}</h3>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', margin: '4px 0 0 0' }}>طلب</p>
          </div>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={28} strokeWidth={2} />
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
        <div onClick={() => setFilterStatus('موافق')} style={{ cursor: 'pointer', opacity: filterStatus === 'موافق' ? 1 : 0.6, transition: 'all 0.2s', backgroundColor: '#ffffff', borderRadius: '16px', border: filterStatus === 'موافق' ? '2px solid #10b981' : '1px solid #f1f5f9', boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.05)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', margin: '0 0 4px 0' }}>طلبات موافق عليها</p>
            <h3 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{approvedCount}</h3>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', margin: '4px 0 0 0' }}>طلب</p>
          </div>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Check size={28} strokeWidth={2.5} />
          </div>
        </div>

        {/* Rejected */}
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

        {/* Total Overtime Value Card */}
        {(() => {
          const totalOvertimeValue = overtimeRequests
            .filter(l => l.status === 'موافق' || l.status === 'مقبول')
            .reduce((sum, leave) => sum + getOvertimeAmount(leave), 0);
          return (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e0e7ff', boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.05)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#4f46e5', margin: '0 0 4px 0' }}>إجمالي قيمة الإضافي</p>
                <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#4f46e5', margin: 0 }}>
                  {totalOvertimeValue.toFixed(2)} <span style={{ fontSize: '14px', fontWeight: 'bold' }}>JD</span>
                </h3>
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', margin: '4px 0 0 0' }}>للطلبات الموافق عليها</p>
              </div>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '20px', fontWeight: '900' }}>JD</span>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('createdAt')}>
                <div className="flex items-center gap-2">تاريخ الطلب {renderSortIcon('createdAt')}</div>
              </th>
              <th>الرقم الوظيفي</th>
              <th className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() =>handleSort('employeeName')}>
                <div className="flex items-center gap-2">الموظف {renderSortIcon('employeeName')}</div>
              </th>
              <th className="text-center">التاريخ والوقت</th>
              <th className="text-center">الحضور والانصراف الفعلي</th>
              <th className="text-center">السبب / الملاحظات</th>
              <th className="text-center">الإضافي المستحق</th>
              <th className="text-center">قيمة العمل الإضافي</th>
              <th className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() =>handleSort('status')}>
                <div className="flex items-center gap-2">الحالة {renderSortIcon('status')}</div>
              </th>
              <th>إجراءات الإدارة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {overtimeRequests.map((leave) => {
              const employeeId = String(leave.employeeId || '').trim();
              const employeeName = String(leave.employeeName || '').trim();
              const emp = employees.find(e => employeeId && [e.id, e.employeeId].some(id => String(id || '').trim() === employeeId))
                || employees.find(e => employeeName && String(e.name || '').trim() === employeeName);
              const empCode = emp ? (emp.employeeId || emp.id) : leave.employeeId;
              return (
              <tr key={leave.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="text-muted text-sm">{new Date(leave.createdAt).toLocaleDateString('en-GB')}</td>
                <td className="font-mono text-sm">{empCode}</td>
                <td className="font-semibold">{leave.employeeName}</td>
                <td className="text-center">
                  {leave.date ? (
                    <div className="flex flex-col items-center">
                      <span className="font-mono text-xs">{leave.date}</span>
                      <span className="font-bold text-xs text-primary mt-1" dir="ltr">{leave.startTime} - {leave.endTime}</span>
                      {leave.rate && (
                        <span className="mt-1 font-bold text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100" dir="ltr">
                          {leave.rate}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="font-mono text-xs">{leave.startDate} {leave.endDate ? `إلى ${leave.endDate}` : ''}</span>
                    </div>
                  )}
                </td>
                <td className="text-center">{renderRequestAttendance(leave, emp)}</td>
                <td className="max-w-[200px] whitespace-normal text-sm text-center">{getOvertimeReason(leave)}</td>
                <td className="text-center font-semibold text-slate-600 font-mono">
                  {getOvertimeDuration(leave)}
                </td>
                <td className="text-center font-bold text-slate-700 font-mono" style={{ direction: 'ltr' }}>
                  {leave.status === 'مرفوض' ? (
                    <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>0.00 JD</span>
                  ) : (
                    <span>{getOvertimeAmount(leave).toFixed(2)} JD</span>
                  )}
                </td>
                <td>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 w-fit ${
                    leave.status === 'موافق' ? 'bg-emerald-50 text-emerald-600' :
                    leave.status === 'مرفوض' ? 'bg-rose-50 text-rose-600' :
                    'bg-amber-50 text-amber-600'
                  }`}>
                    {leave.status === 'موافق' && <CheckCircle size={12} />}
                    {leave.status === 'مرفوض' && <X size={14} strokeWidth={3} />}
                    {leave.status === 'معلق' && <Clock size={12} />}
                    {leave.status}
                  </span>
                </td>
                <td>
                  <div className="flex gap-2 justify-end items-center">
                    <button onClick={() => handlePreviewOvertime(leave)} className="icon-btn" style={{ color: '#0ea5e9', background: '#f0f9ff', borderColor: '#bae6fd' }} title="معاينة الطلب">
                      <Eye size={18} strokeWidth={2} />
                    </button>
                    <button onClick={() => promptEmployeeAlert({ employeeId: leave.employeeId, employeeName: leave.employeeName, source: 'العمل الإضافي', sourceReference: `${leave.date || leave.startDate || ''}`, suggestedMessage: `طلب العمل الإضافي الخاص بك بتاريخ ${leave.date || leave.startDate || 'غير محدد'} حالته: ${leave.status || 'معلق'}.\nالمدة المستحقة: ${getOvertimeDuration(leave)}.${getOvertimeReason(leave) ? `\nالسبب: ${getOvertimeReason(leave)}` : ''}`, user })} className="icon-btn" style={{ color: '#c2410c', background: '#fff7ed', borderColor: '#fdba74' }} title="إرسال تنبيه للموظف">
                      <Bell size={17} />
                    </button>
                    {canApprove && (
                      leave.status === 'معلق' ? (
                        <>
                          <button onClick={() => openSmartApproval(leave)} className="icon-btn icon-btn-success" title="موافقة">
                            <Check size={18} strokeWidth={2.5} />
                          </button>
                          <button onClick={() => handleStatusChange(leave, 'مرفوض')} className="icon-btn icon-btn-delete" title="رفض">
                            <X size={18} strokeWidth={2.5} />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handleStatusChange(leave, 'معلق')} className="icon-btn icon-btn-warning" title="تراجع عن القرار">
                          <Undo2 size={16} strokeWidth={2.5} />
                        </button>
                      )
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(leave.id)} className="icon-btn icon-btn-delete" title="حذف">
                        <Trash2 size={16} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
            {overtimeRequests.length === 0 && (
              <tr><td colSpan="10" className="py-10 text-center text-muted">لا توجد طلبات عمل إضافي حالياً</td></tr>
            )}
          </tbody>
        </table>
      </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="modal-overlay" style={{ zIndex: 10500 }}>
          <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-lg text-slate-800">تقديم طلب بدل عمل إضافي</h3>
              <button type="button" onClick={() => setShowModal(false)} className="icon-btn hover:bg-gray-100 rounded-full p-2 transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
              <div className="p-5" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flexGrow: 1 }}>
                <div className="input-group">
                  <label>الموظف</label>
                  <select required value={formData.employeeId} onChange={e=>setFormData({...formData, employeeId: e.target.value})} className="input-field">
                    <option value="">-- اختر الموظف --</option>
                    {employees.filter(isActiveEmployee).map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                </div>
                
                <div className="space-y-4">
                  <div className="input-group">
                    <label>تاريخ العمل الإضافي</label>
                    <Flatpickr 
                      value={formData.date} 
                      onChange={(dates, dateStr) => setFormData({...formData, date: dateStr})} 
                      className="input-field" 
                      options={{ dateFormat: 'Y-m-d', maxDate: 'today' }}
                      placeholder="اختر التاريخ"
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="input-group">
                      <label>من الساعة</label>
                      <input type="time" value={formData.startTime} onChange={e=>setFormData({...formData, startTime: e.target.value})} className="input-field" required />
                    </div>
                    <div className="input-group">
                      <label>إلى الساعة</label>
                      <input type="time" value={formData.endTime} onChange={e=>setFormData({...formData, endTime: e.target.value})} className="input-field" required />
                    </div>
                    <div className="input-group">
                      <label>معدل الاحتساب</label>
                      <select value={formData.rate || '1:1'} onChange={e=>setFormData({...formData, rate: e.target.value})} className="input-field" required>
                        <option value="1:1">1:1 (عادي)</option>
                        <option value="1:1.25">1:1.25 (إضافي)</option>
                        <option value="1:1.5">1:1.5 (عطلة)</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="input-group">
                  <label>ملاحظات / السبب</label>
                  <textarea rows={2} value={formData.notes} onChange={e=>setFormData({...formData, notes: e.target.value})} className="input-field"></textarea>
                </div>
              </div>
              <div style={{ padding: '1.25rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexShrink: 0, backgroundColor: '#fff', borderBottomLeftRadius: '0.5rem', borderBottomRightRadius: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">إلغاء</button>
                <button type="submit" disabled={isSaving} className="btn btn-primary">{isSaving ? 'جاري الحفظ...' : 'حفظ الطلب'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    
      {/* Smart Approval Modal */}
      {smartModal.show && smartModal.leave && (
        <div className="modal-overlay" style={{ zIndex: 10600 }}>
          <div className="modal-content" style={{ maxWidth: '650px', background: '#f8fafc', padding: 0, overflow: 'hidden' }}>
            
            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <CheckCircle style={{ color: '#10b981' }} size={24} />
                شاشة الاحتساب الذكي للإضافي
              </h3>
              <button type="button" onClick={() => setSmartModal({ show: false, leave: null })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '5px', color: '#64748b' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
              {smartModal.loading ? (
                 <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>جاري التدقيق...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                   
                   {/* الطلب الأصلي */}
                   <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                     <h4 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#334155', margin: '0 0 12px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>بيانات الطلب الأصلي</h4>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.95rem' }}>
                       <div><span style={{ color: '#64748b' }}>الموظف:</span> <span style={{ fontWeight: '600', color: '#0f172a' }}>{smartModal.leave.employeeName}</span></div>
                       <div><span style={{ color: '#64748b' }}>التاريخ:</span> <span style={{ fontWeight: '500', color: '#0f172a' }} dir="ltr">{smartModal.leave.date}</span></div>
                       <div>
                          <span style={{ color: '#64748b' }}>المدة المطلوبة:</span> 
                          <span style={{ fontWeight: 'bold', color: '#1a8d9b', marginRight: '6px' }}>{smartModal.requestedMins} دقيقة</span>
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginRight: '4px' }}>({Math.floor(smartModal.requestedMins / 60)} ساعة و {smartModal.requestedMins % 60} دقيقة)</span>
                       </div>
                       <div>
                          <span style={{ color: '#64748b' }}>معدل الطلب:</span> 
                          <span style={{ fontWeight: 'bold', background: '#e0e7ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85rem', marginRight: '6px' }} dir="ltr">{smartModal.leave.rate || '1:1.25'}</span>
                       </div>
                     </div>
                   </div>

                   {/* تدقيق الدوام */}
                   <div style={{ background: '#fff7ed', borderRadius: '12px', padding: '16px', border: '1px solid #ffedd5', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                     <h4 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#9a3412', margin: '0 0 12px 0', borderBottom: '1px solid #ffedd5', paddingBottom: '8px' }}>تدقيق الدوام في نفس اليوم</h4>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.95rem' }}>
                       <div>
                         <span style={{ color: '#9a3412', opacity: 0.8 }}>حالة الحضور:</span> 
                         {smartModal.attendance ? (
                           <span style={{ fontWeight: 'bold', color: '#15803d', marginRight: '6px' }} dir="ltr">{smartModal.attendance.timeIn} - {smartModal.attendance.timeOut || 'لا يوجد'}</span>
                         ) : (
                           <span style={{ fontWeight: 'bold', color: '#b91c1c', marginRight: '6px' }}>لم يبصم!</span>
                         )}
                       </div>
                       <div>
                         <span style={{ color: '#9a3412', opacity: 0.8 }}>عجز الدوام (تأخير/مغادرة):</span> 
                         {smartModal.deficitMins > 0 ? (
                           <span style={{ fontWeight: 'bold', color: '#b91c1c', marginRight: '6px' }}>{smartModal.deficitMins} دقيقة</span>
                         ) : (
                           <span style={{ fontWeight: 'bold', color: '#15803d', marginRight: '6px' }}>لا يوجد عجز (0)</span>
                         )}
                       </div>
                     </div>
                   </div>

                   {/* الاقتراح */}
                   <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '16px', border: '1px solid #dcfce3', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                     <h4 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#166534', margin: '0 0 12px 0', borderBottom: '1px solid #dcfce3', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                       <CheckCircle size={18} /> نتيجة الاحتساب والتقسيم
                     </h4>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                       
                       {smartModal.deficitMins > 0 ? (
                         <>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                             <span style={{ fontWeight: '600', color: '#334155' }}>مدة لتعويض العجز (بمعدل 1:1)</span>
                             <span style={{ fontWeight: 'bold', color: '#d97706', fontSize: '1.1rem' }}>{Math.min(smartModal.deficitMins, smartModal.requestedMins)} دقيقة</span>
                           </div>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                             <span style={{ fontWeight: '600', color: '#334155' }}>الصافي الفعلي للإضافي (بمعدل {new Date(smartModal.leave.date).getDay() === 5 ? '1:1.5' : (smartModal.leave.rate || '1:1.25')})</span>
                             <span style={{ fontWeight: 'bold', color: '#059669', fontSize: '1.1rem' }}>
                               {smartModal.requestedMins > smartModal.deficitMins 
                                 ? (smartModal.requestedMins - smartModal.deficitMins) + ' دقيقة'
                                 : '0 دقيقة'}
                             </span>
                           </div>
                         </>
                       ) : (
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                           <span style={{ fontWeight: '600', color: '#334155' }}>جميع الدقائق مستحقة بمعدل ({new Date(smartModal.leave.date).getDay() === 5 ? '1:1.5' : (smartModal.leave.rate || '1:1.25')})</span>
                           <span style={{ fontWeight: 'bold', color: '#059669', fontSize: '1.1rem' }}>{smartModal.requestedMins} دقيقة</span>
                         </div>
                       )}
                       <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', marginTop: '10px' }}>
                         * سيتم حفظ هذا التقسيم كمرجع في الطلب لحسابات الرواتب بدقة.
                       </div>
                     </div>
                   </div>

                </div>
              )}
            </div>
            
            <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
               <button type="button" onClick={() => setSmartModal({ show: false, leave: null })} className="btn btn-outline">إلغاء</button>
               <button type="button" onClick={confirmSmartApproval} disabled={smartModal.loading} className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                 <CheckCircle size={18} /> تأكيد التقسيم والموافقة
               </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default HROvertime;
