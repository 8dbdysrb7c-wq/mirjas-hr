import { belongsToHREmployees } from '../../utils/employeeStatus';
import { dailyDepartureSettlement } from '../../utils/dailyDepartureSettlement';
import { collection, getDocsFromServer, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { getOvertimeAttendanceForDate } from '../../services/hr';
import { resolveOvertimeAttendance } from '../../utils/overtimeAttendance';
import { isActiveHREmployee as isActiveEmployee } from '../../utils/employeeStatus';
import { isAdmin } from '../../services/settings';
import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, Clock, XCircle, Calendar, Plus, X, ArrowUpDown, ArrowUp, ArrowDown, Check, Undo2, Trash2, Eye, ChevronDown, ChevronUp, User, Bell, Edit2 } from 'lucide-react';
import { promptEmployeeAlert } from '../../utils/employeeAlerts';
import Select from '../../components/SearchSelect';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/airbnb.css';
import { getHRLeaves, getHRLeavesByDateRange, saveHRLeave, deleteHRLeave, getGlobalSettings, subscribeToHRAttendanceForDate, saveHRAttendance } from '../../store';
import { getActiveHREmployees as getEmployees } from '../../services/hrEmployees';
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
  const canEdit = hasPermission(user, 'hr_overtime', 'edit') || isAdmin(user) || canAdd;
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

  const [smartModal, setSmartModal] = useState({ show: false, leave: null, attendance: null, deficitMins: 0, lateMins: 0, earlyMins: 0, requestedMins: 0, loading: false, calculationMode: 'split', waiveDeficit: false, approvalNote: '' });
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  const openSmartApproval = async (leave, displayedEmployee) => {
    if (!canApprove) {
      Swal.fire('غير مصرح', 'حسابك في وضع المعاينة فقط، ليس لديك صلاحية لاعتماد العمل الإضافي.', 'warning');
      return;
    }
    setSmartModal({ show: true, leave, attendance: null, deficitMins: 0, lateMins: 0, earlyMins: 0, requestedMins: 0, loading: true, calculationMode: 'split', waiveDeficit: false, approvalNote: '' });
    
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
    let departureMins = 0;
    try {
      const targetDate = leave.date || leave.startDate;
      const emp = displayedEmployee || employees.find(e => String(e.id) === String(leave.employeeId) || String(e.employeeId) === String(leave.employeeId));
      // Audit exactly the same employee and live punches displayed in the request row.
      const liveAttendance = attendanceByDate[targetDate];
      attendanceData = !liveAttendance?.error && liveAttendance?.records
        ? resolveOvertimeAttendance(liveAttendance.records, leave, emp) : null;
      if (!attendanceData || timeToMinutes(attendanceData.timeIn) == null || timeToMinutes(attendanceData.timeOut) == null) {
        attendanceData = resolveOvertimeAttendance(await getOvertimeAttendanceForDate(targetDate), leave, emp);
      }
      let shiftStart = emp?.shiftStart || '08:00';
      let shiftEnd = emp?.shiftEnd || '16:00';
      


      try {
        const settings = await getGlobalSettings();
        if (emp?.workShiftName && settings.workShifts) {
          const shift = settings.workShifts.find(s => s.name === emp.workShiftName);
          if (shift) { shiftStart = shift.startTime; shiftEnd = shift.endTime; }
        }
      } catch(e) {}
      
      reqMins = getTimedLeaveMinutes(leave);
      if (attendanceData && timeToMinutes(attendanceData.timeIn) != null && timeToMinutes(attendanceData.timeOut) != null) {
        defMins = getOfficialAbsenceMinutes({ timeIn: attendanceData.timeIn, timeOut: attendanceData.timeOut, shiftStart, shiftEnd });
        lateMins = Math.min(defMins, Math.max(0, timeToMinutes(attendanceData.timeIn) - timeToMinutes(shiftStart)));
        earlyMins = defMins - lateMins;
      } else {
        setSmartModal(previous => ({ ...previous, show: false, loading: false }));

        const hasTimeIn = attendanceData && timeToMinutes(attendanceData.timeIn) != null;
        const defaultPunchIn = hasTimeIn ? attendanceData.timeIn : (shiftStart || '08:00');
        const defaultPunchOut = (attendanceData && timeToMinutes(attendanceData.timeOut) != null)
          ? attendanceData.timeOut
          : (leave.endTime || shiftEnd || '17:00');

        const { value: formValues, isDenied, isDismissed } = await Swal.fire({
          title: 'ختمات الدوام غير مكتملة',
          html: `
            <div style="text-align: right; font-size: 0.93rem; line-height: 1.6; color: #334155;">
              <p style="margin-bottom: 8px;">
                لم يكتمل تسجيل الدخول أو الخروج للموظف <strong>${leave.employeeName || emp?.name || ''}</strong> بتاريخ <strong>${targetDate}</strong>.
              </p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; font-size: 0.88rem;">
                <div>دخول فعلي: <strong dir="ltr">${attendanceData?.timeIn || 'غير مسجل (--:--)'}</strong></div>
                <div>خروج فعلي: <strong dir="ltr">${attendanceData?.timeOut || 'غير مسجل (--:--)'}</strong></div>
                <div>وقت الإضافي المطلوب: <strong dir="ltr">${leave.startTime || '--:--'} - ${leave.endTime || '--:--'}</strong></div>
              </div>
              <p style="font-size: 0.88rem; color: #64748b; margin-bottom: 8px;">
                يمكنك استكمال وقت الدوام الفعلي للموظف ليتم حفظه ومتابعة الاحتساب الذكي، أو اعتماد ساعات الإضافي كاملة مباشرة:
              </p>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                <div>
                  <label style="display: block; font-size: 0.82rem; font-weight: bold; margin-bottom: 4px; color: #475569;">وقت الدخول الفعلي</label>
                  <input id="swal-manual-time-in" type="time" class="swal2-input" style="width: 100%; margin: 0; height: 38px; font-size: 0.9rem;" value="${defaultPunchIn}">
                </div>
                <div>
                  <label style="display: block; font-size: 0.82rem; font-weight: bold; margin-bottom: 4px; color: #475569;">وقت الانصراف الفعلي</label>
                  <input id="swal-manual-time-out" type="time" class="swal2-input" style="width: 100%; margin: 0; height: 38px; font-size: 0.9rem;" value="${defaultPunchOut}">
                </div>
              </div>
            </div>
          `,
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonText: 'حفظ الختمات ومتابعة الاحتساب',
          denyButtonText: 'اعتماد الإضافي كاملاً بالطلب',
          cancelButtonText: 'إلغاء',
          confirmButtonColor: '#4f46e5',
          denyButtonColor: '#10b981',
          cancelButtonColor: '#64748b',
          customClass: {
            popup: 'premium-modal-popup'
          },
          preConfirm: () => {
            const inVal = document.getElementById('swal-manual-time-in')?.value;
            const outVal = document.getElementById('swal-manual-time-out')?.value;
            if (!inVal || !outVal) {
              Swal.showValidationMessage('يرجى تحديد وقت الدخول ووقت الانصراف معاً');
              return false;
            }
            return { timeIn: inVal, timeOut: outVal };
          }
        });

        if (isDismissed) return;

        if (isDenied) {
          await handleStatusChange(leave, 'موافق');
          return;
        }

        if (formValues) {
          const updatedAtt = {
            id: attendanceData?.id || `${emp?.id || leave.employeeId}_${targetDate}`,
            employeeId: emp?.id || leave.employeeId,
            employeeName: emp?.name || leave.employeeName,
            date: targetDate,
            timeIn: formValues.timeIn,
            timeOut: formValues.timeOut,
            status: 'مداوم',
            notes: (attendanceData?.notes ? attendanceData.notes + ' - ' : '') + 'تم استكمال الختمات من قبل الإدارة أثناء اعتماد الإضافي'
          };
          await saveHRAttendance(updatedAtt, user);
          attendanceData = updatedAtt;

          defMins = getOfficialAbsenceMinutes({ timeIn: attendanceData.timeIn, timeOut: attendanceData.timeOut, shiftStart, shiftEnd });
          lateMins = Math.min(defMins, Math.max(0, timeToMinutes(attendanceData.timeIn) - timeToMinutes(shiftStart)));
          earlyMins = defMins - lateMins;
        }
      }
      const dayLeaves = await getDocsFromServer(query(collection(db, 'hr_leaves'), where('date', '==', targetDate)));
      const settlement = dailyDepartureSettlement({ attendance: attendanceData, leaves: dayLeaves.docs.map(d => d.data()), date: targetDate, employeeId: leave.employeeId, shiftStart, shiftEnd });
      lateMins = settlement.lateMins; earlyMins = settlement.earlyMins; departureMins = settlement.departureMins; defMins = settlement.deficitMins;
    } catch (err) {
      console.error(err);
      setSmartModal(previous => ({ ...previous, show: false, loading: false }));
      Swal.fire(err.code === 'attendance/incomplete' ? 'ختمات الدوام غير مكتملة' : 'تعذر تحميل الحضور', err.code === 'attendance/incomplete' ? err.message : 'تعذر قراءة سجلات الدوام. أعد المحاولة؛ لم يتم اعتماد الطلب أو تغيير احتسابه.', 'error');
      return;
    }
    
    setSmartModal({
      show: true,
      leave,
      attendance: attendanceData,
      deficitMins: defMins,
      lateMins,
      earlyMins,
      departureMins,
      requestedMins: reqMins,
      loading: false,
      calculationMode: 'split',
      waiveDeficit: false,
      approvalNote: ''
    });
  };

  const confirmSmartApproval = async () => {
    const { leave, deficitMins, requestedMins, calculationMode, waiveDeficit } = smartModal;
    
    // Check if it's weekend
    const lDate = new Date(leave.date);
    const isHoliday = lDate.getDay() === 5; // simplified holiday check (Friday)
    
    let baseRate = isHoliday ? '1:1.5' : '1:1.25';
    if (leave.rate) baseRate = leave.rate; // Respect original if set explicitly
    
    const isFullMode = calculationMode === 'full';
    let compMins = 0; // Compensating (not payable)
    let extraMins = 0; // Pure payable overtime
    let lateCoveredMins = 0;
    let earlyCoveredMins = 0;
    let departureCoveredMins = 0;
    
    if (isFullMode) {
      // اعتبار كامل دوام الطلب كعمل إضافي فعلي
      extraMins = requestedMins;
      compMins = 0;
      if (waiveDeficit) {
        // إعفاء الموظف من خصم العجز استثنائياً بقرار إدارة
        lateCoveredMins = Number(smartModal.lateMins) || 0;
        earlyCoveredMins = Number(smartModal.earlyMins) || 0;
      } else {
        // يبقى عجز الدوام مسجلاً ليخضع للخصم وفق سياسة الحضور
        lateCoveredMins = 0;
        earlyCoveredMins = 0;
      }
    } else {
      // الاحتساب بالتقسيم الذكي وتسوية عجز الدوام (الطريقة المرفقة)
      if (deficitMins > 0) {
        if (requestedMins <= deficitMins) {
          compMins = requestedMins;
          extraMins = 0;
        } else {
          compMins = deficitMins;
          extraMins = requestedMins - deficitMins;
        }
      } else {
        extraMins = requestedMins;
      }
      lateCoveredMins = Math.min(Number(smartModal.lateMins) || 0, compMins);
      earlyCoveredMins = Math.min(Number(smartModal.earlyMins) || 0, Math.max(0, compMins - (Number(smartModal.lateMins) || 0)));
    }
    
    departureCoveredMins = isFullMode ? (waiveDeficit ? (Number(smartModal.departureMins) || 0) : 0) : Math.min(Number(smartModal.departureMins) || 0, Math.max(0, compMins - lateCoveredMins - earlyCoveredMins));
    const compHoursStr = compMins > 0 ? `${Math.floor(compMins/60)} ساعة و ${compMins%60} دقيقة (بمعدل 1:1 لتغطية العجز)` : '';
    const extraHoursStr = extraMins > 0 ? `${Math.floor(extraMins/60)} ساعة و ${extraMins%60} دقيقة (بمعدل ${baseRate})` : '';
    
    let splitNotes = `\n\n-- تفاصيل الاحتساب والاعتماد --\n`;
    if (isFullMode) {
      splitNotes += `* نوع الاعتماد: اعتبار دوامه فعلاً كعمل إضافي كامل (${extraHoursStr})\n`;
      if (deficitMins > 0) {
        if (waiveDeficit) {
          splitNotes += `* عجز الدوام (${deficitMins} دقيقة): تم إعفاء الموظف منه استثنائياً بقرار الإدارة دون خصم.\n`;
        } else {
          splitNotes += `* عجز الدوام (${deficitMins} دقيقة): يبقى مسجلاً في الحضور والانصراف ويخضع لسياسة الخصم في الراتب.\n`;
        }
      }
    } else {
      splitNotes += `* نوع الاعتماد: الاحتساب بالتقسيم الذكي وتسوية عجز الدوام\n`;
      if (compMins > 0) splitNotes += `* تم اقتطاع لتغطية العجز: ${compHoursStr}\n`;
      if (extraMins > 0) splitNotes += `* الصافي الفعلي للإضافي المستحق: ${extraHoursStr}\n`;
    }
    
    const finalNotes = (leave.notes || '') + splitNotes;
    
    const updatedLeave = {
      ...leave,
      notes: finalNotes,
      status: 'موافق',
      adminNote: smartModal.approvalNote || '',
      approvalReason: smartModal.approvalNote || '',
      rejectionReason: '',
      rateDetails: {
        calculationMode: isFullMode ? 'full' : 'split',
        waiveDeficit: isFullMode ? Boolean(waiveDeficit) : false,
        compMins,
        extraMins,
        baseRate,
        lateCoveredMins,
        departureCoveredMins,
        earlyCoveredMins
      }
    };
    
    Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false });
    Swal.showLoading();
    try {
      await saveHRLeave(updatedLeave);
      
      try {
        const emp = employees.find(e => String(e.id || '').trim() === String(leave.employeeId || '').trim() || String(e.name || '').trim() === String(leave.employeeName || '').trim());
        if (emp && emp.phone) {
          let msg = `مرحباً ${emp.name}،\nتمت الموافقة على طلب العمل الإضافي الخاص بك بتاريخ ${leave.date || leave.startDate || ''}.`;
          if (isFullMode) {
            msg += `\nتم اعتماد كامل المدة (${extraHoursStr}) كعمل إضافي فعلي.`;
          } else {
            if (compMins > 0) msg += `\nتمت تغطية عجز الدوام (${compHoursStr}).`;
            if (extraMins > 0) msg += `\nالصافي المعتمد للإضافي: ${extraHoursStr}.`;
          }
          if (smartModal.approvalNote) msg += `\nملاحظة الإدارة: ${smartModal.approvalNote}`;
          msg += `\n-- الإدارة`;
          await sendWhatsAppNotification(emp.phone, msg, 'overtime');
        }
      } catch(err) {
        console.error('WhatsApp Error in smart approval:', err);
      }

      setLeaves(prev => prev.map(l => l.id === leave.id ? updatedLeave : l));
      setSmartModal({ show: false, leave: null, attendance: null, deficitMins: 0, requestedMins: 0, loading: false });
      if(refreshCounts) refreshCounts();
      Swal.fire('نجاح', isFullMode ? 'تم اعتماد كامل المدة كعمل إضافي فعلي بنجاح' : 'تم احتساب الإضافي بالتقسيم الذكي والموافقة عليه بإنصاف', 'success');
    } catch(e) {
       Swal.fire('خطأ', 'حدث خطأ أثناء الحفظ', 'error');
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
    if (leave.rateDetails) {
      const isFull = leave.rateDetails.calculationMode === 'full';
      const modeLabel = isFull ? 'اعتبار كامل المدة كإضافي فعلي' : 'احتساب بالتقسيم الذكي (تسوية العجز)';
      htmlContent += `<tr><th>طريقة الاحتساب</th><td><span style="font-weight:bold; color:${isFull ? '#0284c7' : '#0f766e'};">${modeLabel}</span></td></tr>`;
      if (leave.rateDetails.extraMins != null) {
        htmlContent += `<tr><th>الصافي المعتمد للإضافي</th><td><strong>${leave.rateDetails.extraMins} دقيقة</strong></td></tr>`;
      }
      if (leave.rateDetails.compMins > 0) {
        htmlContent += `<tr><th>المستقطع لتغطية العجز</th><td><strong>${leave.rateDetails.compMins} دقيقة</strong></td></tr>`;
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

  const getEmpHourlyRate = (leave) => {
    const emp = employees.find(e => String(e.id || '').trim() === String(leave?.employeeId || '').trim() || String(e.name || '').trim() === String(leave?.employeeName || '').trim());
    if (!emp) return 0;
    
    const basic = Number(emp.basicSalary) || 0;
    if (basic <= 0) return 0;
    
    const requestDate = leave?.date || leave?.startDate || getLocalDateStr(new Date());
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
    
    return dailyRate / empStandardWorkHours;
  };

  const getOvertimeMultiplier = (leave) => {
    const requestDate = leave?.date || leave?.startDate || getLocalDateStr(new Date());
    const storedRate = leave?.rate || leave?.rateDetails?.baseRate;
    if (storedRate) {
      const parts = String(storedRate).split(':');
      if (parts.length === 2) {
        return Number(parts[1]) || 1.25;
      }
      return Number(storedRate) || 1.25;
    }
    const d = new Date(requestDate);
    const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const weekends = hrSettings?.weekendDays || ['الجمعة'];
    const dayName = arabicDays[d.getDay()];
    if (weekends.includes(dayName)) {
      return hrSettings?.overtimeWeekendMultiplier || 1.50;
    }
    return hrSettings?.overtimeMultiplier || 1.25;
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
    
    if (hrSettings?.overtimeCalculationMethod === 'fixed_amount') {
       return hrSettings.overtimeFixedAmount || 10;
    }
    
    const hourlyRate = getEmpHourlyRate(leave);
    if (hourlyRate <= 0) return 0;
    const multiplier = getOvertimeMultiplier(leave);
    
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
    const record = resolveOvertimeAttendance(attendance.records, leave, emp);
    if (!record) return <span className="text-muted text-xs">لا يوجد سجل حضور لهذا اليوم</span>;
    const mergedRecords = [record];

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
        {mergedRecords.map((record, index) => (
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
      const requested = getTimedLeaveMinutes(leave);
      return hrSettings?.maxDailyOvertimeHours ? Math.min(requested, hrSettings.maxDailyOvertimeHours * 60) : requested;
    }
    const requested = getTimedLeaveMinutes(leave);
    const emp = employees.find(employee => [employee.id, employee.employeeId].some(id =>
      id && String(id).trim() === String(leave.employeeId || '').trim()));
    const records = attendanceByDate[leave.date || leave.startDate]?.records;
    if (!records) return requested;
    const attendance = resolveOvertimeAttendance(records, leave, emp);
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

  const handleAddNew = () => {
    if (!canAdd && !canEdit) {
      Swal.fire('غير مصرح', 'ليس لديك صلاحية لإضافة طلب عمل إضافي.', 'warning');
      return;
    }
    setFormData({
      employeeId: '',
      type: 'بدل عمل إضافي',
      date: getLocalDateStr(new Date()),
      startTime: '',
      endTime: '',
      rate: '1:1.25',
      notes: '',
      status: 'معلق'
    });
    setShowModal(true);
  };

  const handleEdit = (leave) => {
    if (!canEdit && !isAdmin(user)) {
      Swal.fire('غير مصرح', 'ليس لديك صلاحية لتعديل طلبات العمل الإضافي.', 'warning');
      return;
    }
    setFormData({
      ...leave,
      id: leave.id,
      employeeId: leave.employeeId,
      type: leave.type || 'بدل عمل إضافي',
      date: leave.date || leave.startDate || '',
      startTime: leave.startTime || '',
      endTime: leave.endTime || '',
      rate: leave.rate || '1:1.25',
      notes: leave.notes || '',
      status: leave.status || 'معلق'
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canAdd && !canEdit) {
      Swal.fire('غير مصرح', 'حسابك في وضع المعاينة فقط، ليس لديك صلاحية لإضافة أو تعديل طلبات العمل الإضافي.', 'warning');
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
      if (formData.id && l.id === formData.id) return false;
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
      
      Swal.fire('نجاح', formData.id ? 'تم تعديل الطلب بنجاح' : 'تم تسجيل الطلب بنجاح', 'success');
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
      await saveHRLeave({
        ...leave,
        status: newStatus,
        notes: updatedNotes,
        adminNote: actionReason,
        rejectionReason: newStatus === 'مرفوض' ? actionReason : '',
        approvalReason: newStatus === 'موافق' ? actionReason : ''
      });

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
    if (!belongsToHREmployees(l, employees)) return false;
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
              onClick={handleAddNew}
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
                  <div>{getOvertimeDuration(leave)}</div>
                  {leave.rateDetails?.calculationMode === 'full' && (
                    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] bg-sky-50 text-sky-700 border border-sky-200 font-sans">دوام إضافي كامل</span>
                  )}
                  {leave.rateDetails?.calculationMode === 'split' && (
                    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-sans">تقسيم ذكي</span>
                  )}
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
                    {canEdit && (
                      <button onClick={() => handleEdit(leave)} className="icon-btn" style={{ color: '#6366f1', background: '#eef2ff', borderColor: '#c7d2fe' }} title="تعديل الطلب">
                        <Edit2 size={16} />
                      </button>
                    )}
                    {(canEdit || canApprove) && <button onClick={() => promptEmployeeAlert({ employeeId: leave.employeeId, employeeName: leave.employeeName, source: 'العمل الإضافي', sourceReference: `${leave.date || leave.startDate || ''}`, suggestedMessage: `طلب العمل الإضافي الخاص بك بتاريخ ${leave.date || leave.startDate || 'غير محدد'} حالته: ${leave.status || 'معلق'}.\nالمدة المستحقة: ${getOvertimeDuration(leave)}.${getOvertimeReason(leave) ? `\nالسبب: ${getOvertimeReason(leave)}` : ''}`, user })} className="icon-btn" style={{ color: '#c2410c', background: '#fff7ed', borderColor: '#fdba74' }} title="إرسال ملاحظة للموظف">
                      <Bell size={17} />
                    </button>}
                    {canApprove && (
                      leave.status === 'معلق' ? (
                        <>
                          <button onClick={() => openSmartApproval(leave, emp)} className="icon-btn icon-btn-success" title="موافقة">
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

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" style={{ zIndex: 10500 }}>
          <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-lg text-slate-800">{formData.id ? 'تعديل طلب بدل عمل إضافي' : 'تقديم طلب بدل عمل إضافي'}</h3>
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

                {canApprove && formData.id && (
                  <div className="input-group">
                    <label>حالة الطلب</label>
                    <select value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value})} className="input-field font-bold">
                      <option value="معلق">معلق</option>
                      <option value="موافق">موافق</option>
                      <option value="مرفوض">مرفوض</option>
                    </select>
                  </div>
                )}

                <div className="input-group">
                  <label>ملاحظات / السبب</label>
                  <textarea rows={2} value={formData.notes} onChange={e=>setFormData({...formData, notes: e.target.value})} className="input-field"></textarea>
                </div>
              </div>
              <div style={{ padding: '1.25rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexShrink: 0, backgroundColor: '#fff', borderBottomLeftRadius: '0.5rem', borderBottomRightRadius: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">إلغاء</button>
                <button type="submit" disabled={isSaving} className="btn btn-primary">{isSaving ? 'جاري الحفظ...' : (formData.id ? 'تحديث الطلب' : 'حفظ الطلب')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    
      {/* Smart Approval Modal */}
      {smartModal.show && smartModal.leave && (() => {
        const modalEmp = employees.find(e => String(e.id || '').trim() === String(smartModal.leave.employeeId || '').trim() || String(e.name || '').trim() === String(smartModal.leave.employeeName || '').trim());
        const modalEmpRate = getEmpHourlyRate(smartModal.leave);
        const modalMultiplier = getOvertimeMultiplier(smartModal.leave);
        const modalBaseRateText = smartModal.leave.rate || (new Date(smartModal.leave.date).getDay() === 5 ? '1:1.5' : '1:1.25');
        const modalDeficit = smartModal.deficitMins || 0;
        const modalReqMins = smartModal.requestedMins || 0;
        const modalCompMins = Math.min(modalDeficit, modalReqMins);
        const modalSplitExtraMins = Math.max(0, modalReqMins - modalDeficit);
        const modalSplitAmount = (modalSplitExtraMins / 60) * modalEmpRate * modalMultiplier;
        const modalFullAmount = (modalReqMins / 60) * modalEmpRate * modalMultiplier;
        const modalDeficitCost = (modalDeficit / 60) * modalEmpRate;

        return (
        <div className="modal-overlay" style={{ zIndex: 10600 }}>
          <div className="modal-content" style={{ maxWidth: '680px', background: '#f8fafc', padding: 0, overflow: 'hidden' }}>
            
            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <CheckCircle style={{ color: smartModal.calculationMode === 'full' ? '#0284c7' : '#10b981' }} size={24} />
                شاشة الاحتساب والاعتماد الذكي للإضافي
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
                   
                   {smartModal.departureMins > 0 && <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm">المغادرات المعتمدة داخل الوردية: {smartModal.departureMins} دقيقة. الدقائق المتداخلة مع تأخير الدخول أو الخروج محسوبة مرة واحدة فقط. التسوية بالإضافي أو الإعفاء تلغي خصم الدقائق المغطاة في الراتب.</div>}
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
                          <span style={{ fontWeight: 'bold', background: '#e0e7ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85rem', marginRight: '6px' }} dir="ltr">{modalBaseRateText}</span>
                       </div>
                       {modalEmpRate > 0 && (
                         <div style={{ gridColumn: 'span 2', fontSize: '0.85rem', color: '#64748b', background: '#f8fafc', padding: '6px 12px', borderRadius: '6px' }}>
                           <span>أجر الساعة الأساسي: </span>
                           <strong style={{ color: '#1e293b' }}>{modalEmpRate.toFixed(3)} د.أ / ساعة</strong>
                           <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>
                           <span>معدل احتساب الإضافي ({modalBaseRateText}): </span>
                           <strong style={{ color: '#1e293b' }}>{(modalEmpRate * modalMultiplier).toFixed(3)} د.أ / ساعة</strong>
                         </div>
                       )}
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
                           <span style={{ fontWeight: 'bold', color: '#b91c1c', marginRight: '6px' }}>
                             {smartModal.deficitMins} دقيقة
                             {(smartModal.lateMins > 0 || smartModal.earlyMins > 0) && (
                               <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#7c2d12', marginRight: '4px' }}>
                                 ({smartModal.lateMins > 0 ? `تأخير: ${smartModal.lateMins} د` : ''}{smartModal.lateMins > 0 && smartModal.earlyMins > 0 ? ' + ' : ''}{smartModal.earlyMins > 0 ? `مغادرة: ${smartModal.earlyMins} د` : ''})
                               </span>
                             )}
                           </span>
                         ) : (
                           <span style={{ fontWeight: 'bold', color: '#15803d', marginRight: '6px' }}>لا يوجد عجز (0)</span>
                         )}
                       </div>
                     </div>
                   </div>

                   {/* خيارات الاحتساب والاعتماد للإدارة */}
                   {smartModal.deficitMins > 0 ? (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                       <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                         <span>اختر طريقة الاعتماد والاحتساب للإدارة:</span>
                       </div>

                       {/* الخيار 1: الاحتساب بالتقسيم الذكي (الطريقة المرفقة) */}
                       <div 
                         onClick={() => setSmartModal(prev => ({ ...prev, calculationMode: 'split' }))}
                         style={{
                           cursor: 'pointer',
                           borderRadius: '12px',
                           padding: '16px',
                           border: smartModal.calculationMode === 'split' ? '2px solid #10b981' : '1px solid #e2e8f0',
                           backgroundColor: smartModal.calculationMode === 'split' ? '#f0fdf4' : '#ffffff',
                           boxShadow: smartModal.calculationMode === 'split' ? '0 4px 12px rgba(16,185,129,0.12)' : '0 1px 3px rgba(0,0,0,0.03)',
                           transition: 'all 0.2s ease',
                           display: 'flex',
                           flexDirection: 'column',
                           gap: '10px'
                         }}
                       >
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold', color: '#166534', fontSize: '1rem', margin: 0 }}>
                             <input 
                               type="radio" 
                               name="overtimeMode" 
                               checked={smartModal.calculationMode === 'split'} 
                               onChange={() => setSmartModal(prev => ({ ...prev, calculationMode: 'split' }))}
                               style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                             />
                             الخيار الأول: الاحتساب بالتقسيم الذكي (الطريقة المرفقة)
                           </label>
                           <span style={{ fontSize: '0.78rem', background: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: '12px', fontWeight: '700' }}>
                             تسوية العجز (1:1)
                           </span>
                         </div>

                         <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                           يقوم النظام بتعويض عجز الدوام (1:1) أولاً لمنع خصم التأخير من الراتب، واحتساب الفارق فقط كعمل إضافي صافي.
                         </p>

                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                           <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                             <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '2px' }}>تعويض العجز (بمعدل 1:1)</div>
                             <div style={{ fontWeight: 'bold', color: '#d97706', fontSize: '1.05rem' }}>{modalCompMins} دقيقة</div>
                             <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '2px' }}>✓ يُعفى من خصم الدقائق المسوّاة (~{modalDeficitCost.toFixed(2)} د.أ)</div>
                           </div>

                           <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                             <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '2px' }}>الصافي الفعلي للإضافي ({modalBaseRateText})</div>
                             <div style={{ fontWeight: 'bold', color: '#059669', fontSize: '1.05rem' }}>{modalSplitExtraMins} دقيقة</div>
                             <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '2px', fontWeight: '600' }}>= {modalSplitAmount.toFixed(2)} د.أ مستحق صرف</div>
                           </div>
                         </div>
                       </div>

                       {/* الخيار 2: اعتبار دوامه فعلاً كـ عمل إضافي (المدة كاملة) */}
                       <div 
                         onClick={() => setSmartModal(prev => ({ ...prev, calculationMode: 'full' }))}
                         style={{
                           cursor: 'pointer',
                           borderRadius: '12px',
                           padding: '16px',
                           border: smartModal.calculationMode === 'full' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                           backgroundColor: smartModal.calculationMode === 'full' ? '#f0f9ff' : '#ffffff',
                           boxShadow: smartModal.calculationMode === 'full' ? '0 4px 12px rgba(2,132,199,0.12)' : '0 1px 3px rgba(0,0,0,0.03)',
                           transition: 'all 0.2s ease',
                           display: 'flex',
                           flexDirection: 'column',
                           gap: '10px'
                         }}
                       >
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold', color: '#0369a1', fontSize: '1rem', margin: 0 }}>
                             <input 
                               type="radio" 
                               name="overtimeMode" 
                               checked={smartModal.calculationMode === 'full'} 
                               onChange={() => setSmartModal(prev => ({ ...prev, calculationMode: 'full' }))}
                               style={{ width: '18px', height: '18px', accentColor: '#0284c7', cursor: 'pointer' }}
                             />
                             الخيار الثاني: اعتبار دوامه فعلاً كـ عمل إضافي (المدة كاملة)
                           </label>
                           <span style={{ fontSize: '0.78rem', background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '12px', fontWeight: '700' }}>
                             دوام إضافي كامل
                           </span>
                         </div>

                         <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                           يُعتمد كامل وقت الطلب عملاً إضافياً مستحقاً للموظف بمعدل ({modalBaseRateText}) دون اقتطاعها لتعويض العجز.
                         </p>

                         <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <div>
                             <div style={{ fontSize: '0.82rem', color: '#64748b' }}>إجمالي العمل الإضافي المستحق ({modalBaseRateText})</div>
                             <div style={{ fontWeight: 'bold', color: '#0284c7', fontSize: '1.15rem' }}>{modalReqMins} دقيقة ({Math.floor(modalReqMins/60)} س و {modalReqMins%60} د)</div>
                           </div>
                           <div style={{ textAlign: 'left' }}>
                             <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'block' }}>القيمة المالية المستحقة</span>
                             <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0369a1', direction: 'ltr' }}>{modalFullAmount.toFixed(2)} د.أ</span>
                           </div>
                         </div>

                         {/* الخيار الفرعي لمعاملة عجز الدوام عند اختيار الإضافي الكامل */}
                         {smartModal.calculationMode === 'full' && (
                           <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px dashed #cbd5e1', marginTop: '4px' }} onClick={e => e.stopPropagation()}>
                             <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                               المعاملة المالية لعجز الدوام ({modalDeficit} دقيقة):
                             </div>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                               <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#334155' }}>
                                 <input 
                                   type="radio" 
                                   name="waiveDeficitRadio" 
                                   checked={!smartModal.waiveDeficit} 
                                   onChange={() => setSmartModal(prev => ({ ...prev, waiveDeficit: false }))} 
                                   style={{ accentColor: '#0284c7', cursor: 'pointer' }}
                                 />
                                 <span>
                                   <strong>إبقاء عجز الدوام مسجلاً ليخضع للخصم وفق سياسة الحضور</strong> 
                                   <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>
                                     (يحصل الموظف على {modalFullAmount.toFixed(2)} د.أ إضافي، ويخضع عجز {modalDeficit} د للخصم في الراتب بقيمة ~{modalDeficitCost.toFixed(2)} د.أ)
                                   </span>
                                 </span>
                               </label>
                               
                               <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#334155' }}>
                                 <input 
                                   type="radio" 
                                   name="waiveDeficitRadio" 
                                   checked={smartModal.waiveDeficit} 
                                   onChange={() => setSmartModal(prev => ({ ...prev, waiveDeficit: true }))} 
                                   style={{ accentColor: '#0284c7', cursor: 'pointer' }}
                                 />
                                 <span>
                                   <strong>إعفاء الموظف من خصم عجز الدوام والمغادرات استثنائياً بقرار إدارة</strong>
                                   <span style={{ color: '#15803d', display: 'block', fontSize: '0.78rem' }}>
                                     (يحصل الموظف على {modalFullAmount.toFixed(2)} د.أ إضافي كامل، ولا تُخصم دقائق العجز والمغادرة المعفاة لهذا اليوم)
                                   </span>
                                 </span>
                               </label>
                             </div>
                           </div>
                         )}
                       </div>
                     </div>
                   ) : (
                     <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '16px', border: '1px solid #dcfce3', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                       <h4 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#166534', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                         <CheckCircle size={18} /> جميع الدقائق مستحقة كعمل إضافي
                       </h4>
                       <p style={{ margin: 0, fontSize: '0.9rem', color: '#15803d' }}>
                         لا يوجد عجز دوام في هذا اليوم. كامل المدة المطلوبة مستحقة بمعدل ({modalBaseRateText}):
                       </p>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '10px' }}>
                         <span style={{ fontWeight: '600', color: '#334155' }}>{modalReqMins} دقيقة ({Math.floor(modalReqMins/60)} س و {modalReqMins%60} د)</span>
                         <span style={{ fontWeight: '800', color: '#059669', fontSize: '1.25rem', direction: 'ltr' }}>{modalFullAmount.toFixed(2)} د.أ</span>
                       </div>
                     </div>
                   )}

                </div>
              )}
            </div>
            
            <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
               <button type="button" onClick={() => setSmartModal({ show: false, leave: null })} className="btn btn-outline">إلغاء</button>
               <div style={{ flex: 1, margin: '0 10px' }}>
                 <input 
                   type="text" 
                   placeholder="ملاحظة للموظف (اختياري)..." 
                   className="input-field" 
                   value={smartModal.approvalNote || ''} 
                   onChange={e => setSmartModal(previous => ({ ...previous, approvalNote: e.target.value }))}
                   style={{ margin: 0 }}
                 />
               </div>
               <button 
                 type="button" 
                 onClick={confirmSmartApproval} 
                 disabled={smartModal.loading} 
                 className="btn btn-primary" 
                 style={{ 
                   background: smartModal.calculationMode === 'full' ? '#0284c7' : '#10b981', 
                   borderColor: smartModal.calculationMode === 'full' ? '#0284c7' : '#10b981', 
                   display: 'flex', 
                   alignItems: 'center', 
                   gap: '6px',
                   padding: '10px 18px',
                   fontSize: '0.95rem',
                   fontWeight: 'bold',
                   boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                 }}
               >
                 <CheckCircle size={18} />
                 {smartModal.calculationMode === 'full' 
                   ? `اعتماد كامل المدة كإضافي (${modalFullAmount.toFixed(2)} د.أ)` 
                   : `تأكيد التقسيم والموافقة (${modalSplitAmount.toFixed(2)} د.أ)`}
               </button>
            </div>
          </div>
        </div>
        );
      })()}

    </>
  );
};

export default HROvertime;
