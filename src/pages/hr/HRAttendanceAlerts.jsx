import React, { useState, useEffect, useRef } from 'react';
import { Bell, Calendar, Search, LogOut, AlertTriangle, ChevronDown, Upload, FileMinus, X, User, Trash2, Clock, Check } from 'lucide-react';
import Select from '../../components/SearchSelect';
import HRDateFilter from '../../components/ui/HRDateFilter';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/airbnb.css';
import { getEmployees, getHRAttendance, getGlobalSettings, saveHRViolation, getHRViolations, getHRLeaves, getAttendanceLogs, getReports, getSupervisorReports } from '../../store';
import Swal from 'sweetalert2';

const getLocalDateStr = (d) => {
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
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

const HRAttendanceAlerts = ({ user }) => {
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [rawLogs, setRawLogs] = useState([]);
  const [employeeReports, setEmployeeReports] = useState([]);
  const [supervisorReports, setSupervisorReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getLocalDateStr(new Date()));
  const [dateMode, setDateMode] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [startDate, setStartDate] = useState(getLocalDateStr(new Date()));
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('معلق');
  const [settings, setSettings] = useState(null);
  const [violations, setViolations] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [endDate, setEndDate] = useState(getLocalDateStr(new Date()));
  const [earlyDepartures, setEarlyDepartures] = useState([]);
  const [repeatedLates, setRepeatedLates] = useState([]);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [penaltyModal, setPenaltyModal] = useState({
    isOpen: false,
    employeeName: '',
    type: '',
    date: '',
    action: 'تنبيه',
    deduction: '',
    notes: ''
  });
  const [viewLatesModal, setViewLatesModal] = useState({ isOpen: false, employee: null, lates: [] });

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [emps, records, globSet, viols, lvs, raw, empsReps, supsReps] = await Promise.all([
        getEmployees(), 
        getHRAttendance(),
        getGlobalSettings(),
        getHRViolations(),
        getHRLeaves(),
        getAttendanceLogs(),
        getReports(),
        getSupervisorReports()
      ]);
      setEmployees(emps.filter(e => e.name !== 'المدير العام' && e.jobTitle !== 'المدير العام' && e.role !== 'المدير العام' && !['غير فعال', 'مستقيل', 'منتهي خدمات'].includes(e.employmentStatus || e.status)));
      setAttendanceRecords(records);
      setSettings(globSet);
      setViolations(viols);
      setLeaves(lvs);
      setRawLogs(raw);
      setEmployeeReports(empsReps);
      setSupervisorReports(supsReps);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (loading) return;

    // Helper to check if a record matches an employee
    const findEmployee = (id, name) => {
      const idStr = String(id || '').trim().toLowerCase();
      const nameStr = String(name || '').trim().toLowerCase();

      // An employee ID is authoritative. Falling back to the name while an ID
      // exists can attach one attendance record to another employee who happens
      // to have the same name.
      if (idStr) {
        return employees.find(e => String(e.id).trim().toLowerCase() === idStr);
      }

      return nameStr
        ? employees.find(e => String(e.name || '').trim().toLowerCase() === nameStr)
        : undefined;
    };

    // 1. Build a unified list of records combining processed attendance records, employee reports, supervisor reports, and raw logs
    const recordsMap = new Map();

    // 1a. Process actual attendance records
    const isTimeEmpty = (t) => !t || t === '--:--';
    
    const normalizeDate = (dStr) => {
      if (!dStr) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
      const parts = dStr.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[2].length === 4) { // DD-MM-YYYY or D-M-YYYY
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        if (parts[0].length === 4) { // YYYY-M-D
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
      }
      return dStr;
    };

    const parseTime = (tStr) => {
      if (!tStr) return 0;
      const match = tStr.match(/(\d+):(\d+)/);
      if (match) {
        let h = parseInt(match[1], 10);
        let m = parseInt(match[2], 10);
        if (tStr.toLowerCase().includes('pm') || tStr.includes('م')) {
           if (h < 12) h += 12;
        } else if (tStr.toLowerCase().includes('am') || tStr.includes('ص')) {
           if (h === 12) h = 0;
        }
        return h * 60 + m;
      }
      return 0;
    };

    attendanceRecords.forEach(r => {
      if (r.isLeave) return;
      const emp = findEmployee(r.employeeId, r.employeeName);
      if (emp && r.date) {
        const d = normalizeDate(r.date);
        const key = `${emp.id}_${d}`;
        let tIn = r.timeIn || '';
        let tOut = r.timeOut || '';
        if (!r.isLeave && !r.timeIn && r.time) {
           tIn = r.time.includes('-') ? r.time.split('-')[0].trim() : r.time;
        }
        if (!r.isLeave && !r.timeOut && r.time && r.time.includes('-')) {
           tOut = r.time.split('-')[1].trim();
        }
        recordsMap.set(key, { ...r, timeIn: tIn, timeOut: tOut, date: d, employeeId: emp.id, employeeName: emp.name });
      }
    });

    // 1b. Process raw logs
    rawLogs.forEach(log => {
      const emp = findEmployee(log.employeeId, log.employeeName || log.name);
      if (emp && log.date) {
        const d = normalizeDate(log.date);
        const key = `${emp.id}_${d}`;
        const existing = recordsMap.get(key);
        const logTimeIn = log.timeIn || log.time || '';
        const logTimeOut = log.timeOut || '';
        
        if (existing) {
          if (isTimeEmpty(existing.timeIn) && logTimeIn && logTimeIn !== '--:--') existing.timeIn = logTimeIn;
          if (isTimeEmpty(existing.timeOut) && logTimeOut && logTimeOut !== '--:--') existing.timeOut = logTimeOut;
        } else {
          recordsMap.set(key, {
            id: `raw-${log.id}`,
            employeeId: emp.id,
            employeeName: emp.name,
            date: d,
            timeIn: logTimeIn !== '--:--' ? logTimeIn : '',
            timeOut: logTimeOut !== '--:--' ? logTimeOut : '',
            status: log.status || 'مداوم'
          });
        }
      }
    });

    // 1c. Process employee reports
    employeeReports.forEach(r => {
      const emp = findEmployee(r.userId, r.userName);
      if (emp && r.date) {
        const d = normalizeDate(r.date);
        const key = `${emp.id}_${d}`;
        const existing = recordsMap.get(key);
        if (existing) {
          if (isTimeEmpty(existing.timeIn) && r.timeIn && r.timeIn !== '--:--') existing.timeIn = r.timeIn;
          if (isTimeEmpty(existing.timeOut) && r.timeOut && r.timeOut !== '--:--') existing.timeOut = r.timeOut;
        } else {
          recordsMap.set(key, {
            id: `emprep-${r.id}`,
            employeeId: emp.id,
            employeeName: emp.name,
            date: d,
            timeIn: r.timeIn || '',
            timeOut: r.timeOut || '',
            status: 'مداوم'
          });
        }
      }
    });

    // 1c. Process supervisor reports
    supervisorReports.forEach(r => {
      const emp = findEmployee(r.supervisorId, r.supervisorName);
      if (emp && r.date) {
        const d = normalizeDate(r.date);
        const key = `${emp.id}_${d}`;
        const existing = recordsMap.get(key);
        if (existing) {
          if (isTimeEmpty(existing.timeIn) && r.timeIn && r.timeIn !== '--:--') existing.timeIn = r.timeIn;
          if (isTimeEmpty(existing.timeOut) && r.timeOut && r.timeOut !== '--:--') existing.timeOut = r.timeOut;
        } else {
          recordsMap.set(key, {
            id: `suprep-${r.id}`,
            employeeId: emp.id,
            employeeName: emp.name,
            date: d,
            timeIn: r.timeIn || '',
            timeOut: r.timeOut || '',
            status: 'مداوم'
          });
        }
      }
    });

    const finalRecordsList = Array.from(recordsMap.values());
    window.debugFinalRecords = finalRecordsList;

    let earlyTargetRecords = [];
    let lateTargetRecords = [];

    if (dateMode === 'day') {
      earlyTargetRecords = finalRecordsList.filter(r => r.date === selectedDate);
      lateTargetRecords = finalRecordsList.filter(r => r.date === selectedDate);
    } else if (dateMode === 'month') {
      earlyTargetRecords = finalRecordsList.filter(r => r.date && r.date.startsWith(selectedMonth));
      lateTargetRecords = earlyTargetRecords;
    } else if (dateMode === 'range') {
      earlyTargetRecords = finalRecordsList.filter(r => r.date && r.date >= startDate && r.date <= endDate);
      lateTargetRecords = earlyTargetRecords;
    }
    
    const earlyList = [];
    const lateList = [];

    employees.forEach(emp => {
      let shiftStart = emp?.shiftStart || '08:00';
      let shiftEnd = emp?.shiftEnd || '16:00';
      
      if (emp?.workShiftName && settings?.workShifts) {
        const shift = settings.workShifts.find(s => s.name === emp.workShiftName);
        if (shift) { shiftStart = shift.startTime; shiftEnd = shift.endTime; }
      }

      const empIdStr = String(emp.id).trim().toLowerCase();
      const empNameStr = String(emp.name || '').trim().toLowerCase();

      const isMatch = (id, name) => {
        const recordId = String(id || '').trim().toLowerCase();
        if (recordId) return recordId === empIdStr;

        const recordName = String(name || '').trim().toLowerCase();
        return Boolean(recordName && empNameStr && recordName === empNameStr);
      };
      
      const shiftStartMins = parseTime(shiftStart);
      const shiftEndMins = parseTime(shiftEnd);
      
      // Calculate repetitions for the current month
      const currentMonthStr = selectedDate.substring(0, 7);
      let monthlyEarlyCount = 0;
      let monthlyLateCount = 0;
      
      const empMonthlyRecords = finalRecordsList.filter(r => isMatch(r.employeeId || r.userId, r.employeeName || r.userName) && r.date && r.date.startsWith(currentMonthStr));
      empMonthlyRecords.forEach(rec => {
        if (rec.timeOut && rec.timeOut !== '--:--') {
          const actualEndMins = parseTime(rec.timeOut);
          if (actualEndMins < shiftEndMins) {
             const hasPerm = leaves.some(l => isMatch(l.employeeId, l.employeeName) && (l.status === 'موافق' || l.status === 'موافق عليه' || l.status === 'مقبول') && l.type && (l.type.startsWith('إجازة') || l.type === 'مغادرة خاصة' || l.type === 'مغادرة عمل' || l.type === 'مغادرة الدخان') && (l.date === rec.date || (rec.date >= l.startDate && rec.date <= l.endDate)));
             if (!hasPerm) monthlyEarlyCount++;
          }
        }
        if (rec.timeIn && rec.timeIn !== '--:--') {
          const actualStartMins = parseTime(rec.timeIn);
          if (actualStartMins > shiftStartMins + 15) { 
              const hasPerm = leaves.some(l => isMatch(l.employeeId, l.employeeName) && (l.status === 'موافق' || l.status === 'موافق عليه' || l.status === 'مقبول') && (l.date === rec.date || (rec.date >= l.startDate && rec.date <= l.endDate)) && (l.type === 'إذن تأخير'));
             if (!hasPerm) monthlyLateCount++;
          }
        }
      });

      // Early Departures
      const empEarlyRecords = earlyTargetRecords.filter(r => isMatch(r.employeeId || r.userId, r.employeeName || r.userName));
      empEarlyRecords.forEach(record => {
        if (record.timeOut && record.timeOut !== '--:--') {
          const actualEndMins = parseTime(record.timeOut);
          
          if (actualEndMins < shiftEndMins) {
             const earlyMins = shiftEndMins - actualEndMins;
             const viol = violations.find(v => isMatch(v.employeeId, v.employeeName) && v.date === record.date && v.type === 'مغادرة مبكرة');
             
             const hasApprovedLeave = leaves.some(l => 
                 isMatch(l.employeeId, l.employeeName) && 
                  (l.status === 'موافق' || l.status === 'موافق عليه' || l.status === 'مقبول') &&
                  l.type && (l.type.startsWith('إجازة') || l.type === 'مغادرة خاصة' || l.type === 'مغادرة عمل' || l.type === 'مغادرة الدخان') &&
                  (l.date === record.date || (record.date >= l.startDate && record.date <= l.endDate))
             );

             if (!hasApprovedLeave) {
                 let status = 'معلق';
                 if (viol) {
                   if (!viol.action || viol.action === 'معلق') {
                     status = 'معلق';
                   } else {
                     status = viol.action === 'تجاهل' ? 'مرفوض' : 'موافق عليه';
                   }
                 }

                 earlyList.push({
                   id: emp.id,
                   name: emp.name,
                   department: emp.department || '-',
                   date: record.date,
                   timeOut: record.timeOut,
                   earlyMins: earlyMins,
                   shiftEnd: shiftEnd,
                   status: status,
                   actionTaken: viol ? viol.action : null,
                   deductionAmount: viol ? (viol.deductionAmount || 0) : 0,
                   monthlyCount: monthlyEarlyCount
                 });
             }
          }
        }
      });

      // Lates
      const empLateRecords = lateTargetRecords.filter(r => isMatch(r.employeeId || r.userId, r.employeeName || r.userName));
      empLateRecords.forEach(record => {
        if (record.timeIn && record.timeIn !== '--:--') {
          const actualStartMins = parseTime(record.timeIn);
          if (actualStartMins > shiftStartMins + 5) { 
              const hasLatePermission = leaves.some(l => 
                  isMatch(l.employeeId, l.employeeName) && 
                  (l.status === 'موافق' || l.status === 'موافق عليه' || l.status === 'مقبول') &&
                  l.type && (l.type.startsWith('إجازة') || l.type === 'إذن تأخير') && (l.date === record.date || (record.date >= l.startDate && record.date <= l.endDate))
              );
              
              window.debugAlerts = window.debugAlerts || {};
              window.debugAlerts[emp.name] = { record, hasLatePermission, actualStartMins, shiftStartMins, leaves };

             if (!hasLatePermission) {
                 const lateMins = actualStartMins - shiftStartMins;
                 const viol = violations.find(v => isMatch(v.employeeId, v.employeeName) && v.date === record.date && v.type === 'تأخير');
                 
                 let status = 'معلق';
                 if (viol) {
                   if (!viol.action || viol.action === 'معلق') {
                     status = 'معلق';
                   } else {
                     status = viol.action === 'تجاهل' ? 'مرفوض' : 'موافق عليه';
                   }
                 }

                 lateList.push({
                   id: emp.id,
                   name: emp.name,
                   department: emp.department || '-',
                   date: record.date,
                   timeIn: record.timeIn,
                   lateMins: lateMins,
                   shiftStart: shiftStart,
                   status: status,
                   actionTaken: viol ? viol.action : null,
                   deductionAmount: viol ? (viol.deductionAmount || 0) : 0,
                   monthlyCount: monthlyLateCount,
                   violId: viol ? viol.id : null
                 });
             }
          }
        }
      });
    });

    const allAlerts = [...earlyList, ...lateList];
    setCounts({
      total: allAlerts.length,
      pending: allAlerts.filter(a => a.status === 'معلق').length,
      approved: allAlerts.filter(a => a.status === 'موافق عليه').length,
      rejected: allAlerts.filter(a => a.status === 'مرفوض').length
    });

    setEarlyDepartures(earlyList.filter(a => filterStatus === 'الكل' || a.status === filterStatus));
    setRepeatedLates(lateList.filter(a => filterStatus === 'الكل' || a.status === filterStatus));
  }, [dateMode, selectedDate, selectedMonth, startDate, endDate, attendanceRecords, rawLogs, employeeReports, supervisorReports, employees, settings, loading, violations, leaves, filterStatus]);

  const handleIgnoreAlert = async (empData, type) => {
      setOpenDropdownId(null);
      const result = await Swal.fire({
          title: 'هل أنت متأكد من التجاهل؟',
          text: 'سيتم حذف هذا التنبيه ولن يظهر مجدداً. هذا الإجراء لن يؤثر على الرواتب إطلاقاً.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'نعم، تجاهل التنبيه',
          cancelButtonText: 'إلغاء',
          confirmButtonColor: '#10b981',
          cancelButtonColor: '#94a3b8'
      });

      if (result.isConfirmed) {
          try {
              const savedViol = await saveHRViolation({
                  employeeId: empData.id,
                  employeeName: empData.name,
                  department: empData.department || 'غير محدد',
                  date: empData.date,
                  type: type === 'early' ? 'مغادرة مبكرة' : 'تأخير',
                  deductionAmount: 0,
                  reason: 'تم التجاهل من قبل الإدارة',
                  action: 'تجاهل',
              }, { name: user?.name || 'النظام' });
              
              setViolations(prev => [savedViol, ...prev]);
              Swal.fire('تم', 'تم حذف التنبيه بنجاح ولن يؤثر على راتب الموظف.', 'success');
          } catch(e) {
              console.error(e);
              Swal.fire('خطأ', 'حدث خطأ أثناء حفظ الإجراء', 'error');
          }
      }
  };

  const handleApplyDeduction = async (empData, type) => {
    setOpenDropdownId(null);
    
    let tableHtml = '';
    let totalMins = 0;
    
    if (type === 'late') {
       totalMins = empData.lateMins;
       tableHtml = `
         <div style="margin-bottom: 20px; text-align: right; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
           <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
             <thead style="background: #f8fafc;">
               <tr>
                 <th style="padding: 10px 8px; text-align: right; color: #475569;">التاريخ</th>
                 <th style="padding: 10px 8px; text-align: right; color: #475569;">وقت الدخول</th>
                 <th style="padding: 10px 8px; text-align: right; color: #475569;">التأخير</th>
               </tr>
             </thead>
             <tbody>
               <tr>
                 <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0;">${empData.date}</td>
                 <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0;" dir="ltr">${empData.timeIn}</td>
                 <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; color: #ef4444; font-weight: bold;">${empData.lateMins} دقيقة</td>
               </tr>
             </tbody>
           </table>
         </div>
       `;
    } else if (type === 'early') {
       totalMins = empData.earlyMins;
       tableHtml = `
         <div style="margin-bottom: 20px; text-align: right; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
           <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
             <thead style="background: #f8fafc;">
               <tr>
                 <th style="padding: 10px 8px; text-align: right; color: #475569;">التاريخ</th>
                 <th style="padding: 10px 8px; text-align: right; color: #475569;">وقت الخروج</th>
                 <th style="padding: 10px 8px; text-align: right; color: #475569;">الخروج المبكر</th>
               </tr>
             </thead>
             <tbody>
               <tr>
                 <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0;">${empData.date}</td>
                 <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0;" dir="ltr">${empData.timeOut}</td>
                 <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; color: #d97706; font-weight: bold;">${empData.earlyMins} دقيقة</td>
               </tr>
             </tbody>
           </table>
         </div>
       `;
    }

    const fullEmp = employees.find(e => e.id === empData.id);
    const basicSalary = Number(fullEmp?.basicSalary) || 0;
    const workDays = settings?.hrSettings?.workDaysPerMonth || 30;
    const workHours = settings?.hrSettings?.standardWorkHours || 8;
    
    let recommendedAmount = '';
    let calculationText = '';
    
    if (basicSalary > 0 && totalMins > 0) {
        const minuteRate = basicSalary / (workDays * workHours * 60);
        recommendedAmount = (minuteRate * totalMins).toFixed(2);
        if (recommendedAmount <= 0) recommendedAmount = '0.01'; // minimum
        calculationText = `
          <div style="font-size: 0.85rem; color: #10b981; margin-top: 5px; margin-bottom: 15px; font-weight: 500;">
             💡 القيمة المقترحة أعلاه محسوبة آلياً بناءً على الراتب الأساسي (${basicSalary} دينار) وعدد الدقائق، ويمكنك تعديلها يدوياً.
          </div>
        `;
    }

    const { value: amount } = await Swal.fire({
      title: 'تطبيق خصم مالي',
      html: `
        <div style="text-align: right; margin-bottom: 15px; font-size: 1.05rem;">
          تفاصيل المخالفة للموظف: <strong style="color: #0f172a;">${empData.name}</strong>
        </div>
        ${tableHtml}
        <div style="text-align: right; margin-bottom: 10px; font-weight: 600; color: #475569;">قيمة الخصم بالدينار:</div>
        <input id="swal-deduction-input" class="swal2-input" type="number" step="0.01" min="0" value="${recommendedAmount}" placeholder="مثال: 10" style="width: 100%; max-width: 100%; margin: 0; box-sizing: border-box; text-align: right;">
        ${calculationText}
      `,
      showCancelButton: true,
      confirmButtonText: 'تأكيد الخصم',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#4f46e5',
      preConfirm: () => {
        const inputVal = document.getElementById('swal-deduction-input').value;
        if (!inputVal || inputVal <= 0) {
          Swal.showValidationMessage('يجب إدخال قيمة خصم صحيحة أكبر من صفر');
          return false;
        }
        return inputVal;
      }
    });

    if (amount) {
      try {
        const savedViol = await saveHRViolation({
          employeeId: empData.id,
          employeeName: empData.name,
          department: empData.department || 'غير محدد',
          date: empData.date,
          type: type === 'early' ? 'مغادرة مبكرة' : 'تأخير',
          deductionAmount: Number(amount),
          reason: type === 'early' 
            ? `خصم إداري: مغادرة مبكرة بتاريخ ${empData.date} (${empData.earlyMins} دقيقة)`
            : `خصم إداري: تأخير بتاريخ ${empData.date} (${empData.lateMins} دقيقة)`,
          action: 'خصم مالي',
        }, { name: user?.name || 'النظام' });
        
        setViolations(prev => [savedViol, ...prev]);
        Swal.fire('تم بنجاح!', 'تم إدراج الخصم المالي في السجل وتطبيقه على الراتب.', 'success');
      } catch (e) {
        console.error(e);
        Swal.fire('خطأ', 'حدث خطأ أثناء حفظ الخصم', 'error');
      }
    }
  };

  const handleRegisterPenalty = (empName, defaultType, defaultNotes) => {
    setOpenDropdownId(null);
    setPenaltyModal({
      isOpen: true,
      employeeName: empName,
      type: defaultType,
      date: selectedDate,
      action: 'تنبيه',
      deduction: '',
      notes: defaultNotes
    });
  };

  const handleViewLateDetails = (empId) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    let shiftStart = emp?.shiftStart || '08:00';
    if (emp?.workShiftName && settings?.workShifts) {
      const shift = settings.workShifts.find(s => s.name === emp.workShiftName);
      if (shift) shiftStart = shift.startTime;
    }
    const [ssh, ssm] = shiftStart.split(':').map(Number);
    const shiftStartMins = ssh * 60 + ssm;

    let earlyTargetRecords = [];
    if (dateMode === 'day') {
      const currentMonth = selectedDate.substring(0, 7);
      earlyTargetRecords = attendanceRecords.filter(r => r.date && r.date.startsWith(currentMonth));
    } else if (dateMode === 'month') {
      earlyTargetRecords = attendanceRecords.filter(r => r.date && r.date.startsWith(selectedMonth));
    } else if (dateMode === 'range') {
      earlyTargetRecords = attendanceRecords.filter(r => r.date && r.date >= startDate && r.date <= endDate);
    }

    const empLateRecords = earlyTargetRecords.filter(r => String(r.employeeId) === String(empId));
    const detailedLates = [];

    const basicSalary = Number(emp?.basicSalary) || 0;
    const workDays = settings?.hrSettings?.workDaysPerMonth || 30;
    const workHours = settings?.hrSettings?.standardWorkHours || 8;
    const minuteRate = basicSalary > 0 ? basicSalary / (workDays * workHours * 60) : 0;

    empLateRecords.forEach(rec => {
      if (rec.timeIn && rec.timeIn !== '--:--') {
        const actualStartMins = parseTime(rec.timeIn);
        if (actualStartMins > shiftStartMins + 15) {
          const hasLatePermission = leaves.some(l => 
              String(l.employeeId) === String(empId) && 
              l.status !== 'مرفوض' &&
              (l.date === rec.date || (rec.date >= l.startDate && rec.date <= l.endDate)) &&
              (l.type === 'إذن تأخير')
          );
          if (!hasLatePermission) {
            const lateMins = actualStartMins - shiftStartMins;
            const financialDeduction = minuteRate * lateMins;
            detailedLates.push({
              date: rec.date,
              timeIn: rec.timeIn,
              shiftStart: shiftStart,
              lateMins: lateMins,
              financialDeduction: financialDeduction
            });
          }
        }
      }
    });

    setViewLatesModal({
      isOpen: true,
      employee: emp,
      lates: detailedLates
    });
  };

  if (loading && employees.length === 0) return <div style={{textAlign:'center', padding:'40px'}}>جاري التحميل...</div>;

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

  const filteredEarlyDepartures = search ? earlyDepartures.filter(a => String(a.id) === String(search)) : earlyDepartures;
  const filteredRepeatedLates = search ? repeatedLates.filter(a => String(a.id) === String(search)) : repeatedLates;

  return (
    <div style={{ padding: '20px', fontFamily: 'inherit', direction: 'rtl' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
        
        {/* Right Side (Title and Bell) */}
        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ color: '#6366f1', background: '#eff6ff', padding: '10px', borderRadius: '12px' }}>
            <Bell size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>تنبيهات التأخير والعقوبات</h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0' }}>الموظفون الذين تجاوزوا الحد المسموح لتأخير الدوام</p>
          </div>
        </div>

        {/* Left Side (Search and Date) */}
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
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
          <div style={{ width: '180px' }}>
              <Select
                options={employeeIdOptions}
                value={employeeIdOptions.find(opt => opt.value === search) || null}
                onChange={(selected) => setSearch(selected ? selected.value : '')}
                styles={{...customSelectStyles, control: (base) => ({...base, height: '42px', minHeight: '42px', borderRadius: '10px', border: '1px solid #e2e8f0'})}}
                placeholder="رقم الموظف..."
                isSearchable={true}
                isClearable={true}
              />
          </div>

          {/* Employee Name */}
          <div style={{ width: '250px', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, color: '#94a3b8', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                <User size={16} />
              </div>
              <Select
                options={employeeNameOptions}
                value={employeeNameOptions.find(opt => opt.value === search) || null}
                onChange={(selected) => setSearch(selected ? selected.value : '')}
                styles={{...customSelectStyles, control: (base) => ({...base, height: '42px', minHeight: '42px', borderRadius: '10px', border: '1px solid #e2e8f0', paddingLeft: '24px'})}}
                placeholder="اسم الموظف..."
                isSearchable={true}
                isClearable={true}
              />
          </div>

          {/* Status Dropdown */}
          <div style={{ position: 'relative' }}>
             <select
               value={filterStatus}
               onChange={(e) => setFilterStatus(e.target.value)}
               style={{
                 height: '42px',
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
               <option value="معلق">الطلبات المعلقة</option>
               <option value="موافق عليه">الموافق عليها</option>
               <option value="مرفوض">المرفوضة</option>
               <option value="الكل">كل الطلبات</option>
             </select>
             <ChevronDown size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          </div>
        </div>

      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '24px' }}>
        {/* Total (Rightmost) */}
        <div onClick={() => setFilterStatus('الكل')} style={{ cursor: 'pointer', opacity: filterStatus === 'الكل' ? 1 : 0.6, transition: 'all 0.2s', backgroundColor: '#ffffff', borderRadius: '16px', border: filterStatus === 'الكل' ? '2px solid #3b82f6' : '1px solid #f1f5f9', boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.05)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', margin: '0 0 4px 0' }}>إجمالي التنبيهات</p>
            <h3 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{counts.total}</h3>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', margin: '4px 0 0 0' }}>تنبيه</p>
          </div>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={28} strokeWidth={2} />
          </div>
        </div>

        {/* Pending */}
        <div onClick={() => setFilterStatus('معلق')} style={{ cursor: 'pointer', opacity: filterStatus === 'معلق' ? 1 : 0.6, transition: 'all 0.2s', backgroundColor: '#ffffff', borderRadius: '16px', border: filterStatus === 'معلق' ? '2px solid #d97706' : '1px solid #f1f5f9', boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.05)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', margin: '0 0 4px 0' }}>تنبيهات معلقة</p>
            <h3 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{counts.pending}</h3>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', margin: '4px 0 0 0' }}>تنبيه</p>
          </div>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={28} strokeWidth={2} />
          </div>
        </div>

        {/* Approved */}
        <div onClick={() => setFilterStatus('موافق عليه')} style={{ cursor: 'pointer', opacity: filterStatus === 'موافق عليه' ? 1 : 0.6, transition: 'all 0.2s', backgroundColor: '#ffffff', borderRadius: '16px', border: filterStatus === 'موافق عليه' ? '2px solid #10b981' : '1px solid #f1f5f9', boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.05)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', margin: '0 0 4px 0' }}>تنبيهات معتمدة</p>
            <h3 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{counts.approved}</h3>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', margin: '4px 0 0 0' }}>تنبيه</p>
          </div>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Check size={28} strokeWidth={2.5} />
          </div>
        </div>

        {/* Rejected */}
        <div onClick={() => setFilterStatus('مرفوض')} style={{ cursor: 'pointer', opacity: filterStatus === 'مرفوض' ? 1 : 0.6, transition: 'all 0.2s', backgroundColor: '#ffffff', borderRadius: '16px', border: filterStatus === 'مرفوض' ? '2px solid #ef4444' : '1px solid #f1f5f9', boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.05)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', margin: '0 0 4px 0' }}>تنبيهات تم تجاهلها</p>
            <h3 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{counts.rejected}</h3>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', margin: '4px 0 0 0' }}>تنبيه</p>
          </div>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={28} strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* Stats Cards - Early Departures (Orange) FIRST so it's on the RIGHT in RTL */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '30px' }}>
        
        {/* Early Departures Card (Right Side in RTL) */}
        <div style={{ background: '#ffffff', border: '1px solid #fbd38d', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b', lineHeight: '1' }}>{filteredEarlyDepartures.length}</div>
            <div style={{ color: '#f59e0b', fontWeight: '600', fontSize: '0.9rem', marginTop: '4px' }}>طلب</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>المغادرة المبكرة</h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0' }}>موظفون سجلوا خروج قبل نهاية دوامهم<br/>ولم يقدموا إذن/مغادرة</p>
            </div>
            <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '50%', color: '#f59e0b', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <LogOut size={32} />
            </div>
          </div>
        </div>

        {/* Repeated Lates Card (Left Side in RTL) */}
        <div style={{ background: '#fff5f5', border: '1px solid #fee2e2', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ef4444', lineHeight: '1' }}>{filteredRepeatedLates.length}</div>
            <div style={{ color: '#ef4444', fontWeight: '600', fontSize: '0.9rem', marginTop: '4px' }}>تنبيه</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>تنبيهات التأخير</h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0' }}>جميع حالات التأخير الصباحي<br/>والمتجاوزة للوقت المسموح</p>
            </div>
            <div style={{ background: '#fee2e2', padding: '16px', borderRadius: '50%', color: '#ef4444', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <AlertTriangle size={32} />
            </div>
          </div>
        </div>

      </div>

      {/* Tables Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }} ref={dropdownRef}>
        
        {/* Early Departures Table */}
        <div style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '16px', overflow: (openDropdownId && openDropdownId.startsWith('early-')) ? 'visible' : 'hidden', zIndex: (openDropdownId && openDropdownId.startsWith('early-')) ? 20 : 1, position: 'relative', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <h3 style={{ fontWeight: 'bold', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                 المغادرة المبكرة ({filteredEarlyDepartures.length})
               </h3>
               <LogOut size={18} style={{ color: '#f59e0b' }} />
            </div>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>موظفون سجلوا خروج قبل نهاية دوامهم ولم يقدموا إذن/مغادرة</span>
          </div>
          
          <div style={{ overflow: openDropdownId ? 'visible' : 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead style={{ background: '#f8fafc', color: '#475569', fontSize: '0.9rem' }}>
                <tr>
                  <th style={{ padding: '16px 24px', fontWeight: '600' }}>الموظف</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600' }}>القسم</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>التاريخ</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>وقت الخروج</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>الخروج المبكر</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>تكرار (هذا الشهر)</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>نهاية الدوام</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filteredEarlyDepartures.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>لا توجد حالات مغادرة مبكرة</td></tr>
                ) : filteredEarlyDepartures.map((emp, index) => (
                  <tr key={index} style={{ borderTop: '1px solid #f1f5f9', transition: 'all 0.2s' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 'bold', color: '#1e293b' }}>{emp.name}</td>
                    <td style={{ padding: '16px 24px', color: '#64748b' }}>{emp.department}</td>
                    <td style={{ padding: '16px 24px', fontWeight: 'bold', color: '#1e293b', textAlign: 'center' }}>{emp.date}</td>
                    <td style={{ padding: '16px 24px', fontWeight: 'bold', color: '#1e293b', textAlign: 'center' }} dir="ltr">{formatTime12h(emp.timeOut)}</td>
                    <td style={{ padding: '16px 24px', fontWeight: 'bold', color: '#d97706', textAlign: 'center' }}>{emp.earlyMins} دقيقة</td>
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        {emp.monthlyCount} مرات
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 'bold', color: '#1e293b', textAlign: 'center' }} dir="ltr">{emp.shiftEnd}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'center', position: 'relative', zIndex: openDropdownId === `early-${emp.id}-${emp.date}` ? 30 : 1 }}>
                      {emp.status !== 'معلق' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <span style={{ 
                            background: emp.status === 'مرفوض' ? '#fee2e2' : '#ecfdf5', 
                            color: emp.status === 'مرفوض' ? '#ef4444' : '#10b981', 
                            padding: '4px 12px', 
                            borderRadius: '8px', 
                            fontWeight: 'bold', 
                            fontSize: '0.8rem' 
                          }}>
                            {emp.status === 'مرفوض' ? 'تم التجاهل' : 'تم اعتماد العقوبة'}
                          </span>
                          {emp.actionTaken && (
                            <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 'bold' }}>
                              ({emp.actionTaken}
                              {emp.deductionAmount > 0 ? `: ${Number(emp.deductionAmount).toFixed(2)} د.أ` : ''})
                            </span>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                          <button onClick={() => handleIgnoreAlert(emp, 'early')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: '8px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#fee2e2'} onMouseOut={(e) => e.currentTarget.style.background = '#fef2f2'} title="تجاهل الحالة">
                            <Trash2 size={18} />
                          </button>
                          <div style={{ position: 'relative' }}>
                            <button 
                              onClick={() => setOpenDropdownId(openDropdownId === `early-${emp.id}-${emp.date}` ? null : `early-${emp.id}-${emp.date}`)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#fffbeb', border: '1px solid #fde68a', color: '#d97706', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', width: '140px', justifyContent: 'space-between' }}
                            >
                               تطبيق إجراء <ChevronDown size={16} />
                            </button>
                            
                            {openDropdownId === `early-${emp.id}-${emp.date}` && (
                              <div style={{ position: 'absolute', top: '100%', right: '0', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 50, width: '200px', marginTop: '4px', overflow: 'hidden' }}>
                                 <button onClick={() => handleApplyDeduction(emp, 'early')} style={{ width: '100%', padding: '12px 16px', textAlign: 'right', background: 'transparent', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#d97706', fontWeight: '600' }} onMouseOver={(e) => e.currentTarget.style.background = '#fef3c7'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                                   <Upload size={14} /> تطبيق خصم من الراتب
                                 </button>
                                 <button onClick={() => handleRegisterPenalty(emp.name, 'مغادرة مبكرة', `تم تسجيل خروج مبكر للموظف بتاريخ ${emp.date} في تمام الساعة ${emp.timeOut}، حيث غادر قبل نهاية دوامه بمقدار ${emp.earlyMins} دقيقة، وبلغت تكرارات ذلك هذا الشهر ${emp.monthlyCount} مرات.`)} style={{ width: '100%', padding: '12px 16px', textAlign: 'right', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: '600' }} onMouseOver={(e) => e.currentTarget.style.background = '#fee2e2'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                                   <FileMinus size={14} /> تسجيل مخالفة
                                 </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lates Table */}
        <div style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '16px', overflow: (openDropdownId && openDropdownId.startsWith('late-')) ? 'visible' : 'hidden', zIndex: (openDropdownId && openDropdownId.startsWith('late-')) ? 20 : 1, position: 'relative', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <h3 style={{ fontWeight: 'bold', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                 تنبيهات التأخير ({filteredRepeatedLates.length})
               </h3>
               <AlertTriangle size={18} style={{ color: '#ef4444' }} />
            </div>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>جميع حالات التأخير غير المبررة</span>
          </div>
          
          <div style={{ overflow: openDropdownId ? 'visible' : 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead style={{ background: '#f8fafc', color: '#475569', fontSize: '0.9rem' }}>
                <tr>
                  <th style={{ padding: '16px 24px', fontWeight: '600' }}>الموظف</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600' }}>القسم</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>التاريخ</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>وقت الدخول</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>التأخير</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>تكرار (هذا الشهر)</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filteredRepeatedLates.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>لا توجد حالات تأخير</td></tr>
                ) : filteredRepeatedLates.map((emp, index) => (
                  <tr key={index} style={{ borderTop: '1px solid #f1f5f9', transition: 'all 0.2s' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 'bold', color: '#1e293b' }}>{emp.name}</td>
                    <td style={{ padding: '16px 24px', color: '#64748b' }}>{emp.department}</td>
                    <td style={{ padding: '16px 24px', fontWeight: 'bold', color: '#1e293b', textAlign: 'center' }}>{emp.date}</td>
                    <td style={{ padding: '16px 24px', fontWeight: 'bold', color: '#1e293b', textAlign: 'center' }} dir="ltr">{formatTime12h(emp.timeIn)}</td>
                    <td style={{ padding: '16px 24px', fontWeight: 'bold', color: '#ef4444', textAlign: 'center' }}>{emp.lateMins} دقيقة</td>
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        {emp.monthlyCount} مرات
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center', position: 'relative', zIndex: openDropdownId === `late-${emp.id}-${emp.date}` ? 30 : 1 }}>
                      {emp.status !== 'معلق' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <span style={{ 
                            background: emp.status === 'مرفوض' ? '#fee2e2' : '#ecfdf5', 
                            color: emp.status === 'مرفوض' ? '#ef4444' : '#10b981', 
                            padding: '4px 12px', 
                            borderRadius: '8px', 
                            fontWeight: 'bold', 
                            fontSize: '0.8rem' 
                          }}>
                            {emp.status === 'مرفوض' ? 'تم التجاهل' : 'تم اعتماد العقوبة'}
                          </span>
                          {emp.actionTaken && (
                            <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 'bold' }}>
                              ({emp.actionTaken}
                              {emp.deductionAmount > 0 ? `: ${Number(emp.deductionAmount).toFixed(2)} د.أ` : ''})
                            </span>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                          <button onClick={() => handleIgnoreAlert(emp, 'late')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: '8px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#fee2e2'} onMouseOut={(e) => e.currentTarget.style.background = '#fef2f2'} title="تجاهل الحالة">
                            <Trash2 size={18} />
                          </button>
                          <div style={{ position: 'relative' }}>
                            <button 
                              onClick={() => setOpenDropdownId(openDropdownId === `late-${emp.id}-${emp.date}` ? null : `late-${emp.id}-${emp.date}`)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', width: '140px', justifyContent: 'space-between' }}
                            >
                               تطبيق إجراء <ChevronDown size={16} />
                            </button>
                            
                            {openDropdownId === `late-${emp.id}-${emp.date}` && (
                              <div style={{ position: 'absolute', top: '100%', right: '0', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 50, width: '200px', marginTop: '4px', overflow: 'hidden' }}>
                                 <button onClick={() => handleApplyDeduction(emp, 'late')} style={{ width: '100%', padding: '12px 16px', textAlign: 'right', background: 'transparent', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: '600' }} onMouseOver={(e) => e.currentTarget.style.background = '#fee2e2'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                                   <Upload size={14} /> تطبيق خصم من الراتب
                                 </button>
                                 <button onClick={() => handleRegisterPenalty(emp.name, 'تأخير', `تأخر الموظف عن العمل بتاريخ ${emp.date} بمقدار ${emp.lateMins} دقيقة، وبلغت تكرارات التأخير غير المبرر هذا الشهر ${emp.monthlyCount} مرات.`)} style={{ width: '100%', padding: '12px 16px', textAlign: 'right', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: '600' }} onMouseOver={(e) => e.currentTarget.style.background = '#fee2e2'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                                   <FileMinus size={14} /> تسجيل مخالفة
                                 </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Penalty Modal */}
      {penaltyModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '90%', maxWidth: '600px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', position: 'relative' }}>
            <button onClick={() => setPenaltyModal({ ...penaltyModal, isOpen: false })} style={{ position: 'absolute', top: '24px', left: '24px', background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} />
            </button>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', margin: '0 0 24px 0', textAlign: 'right' }}>تسجيل مخالفة جديدة</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: '#475569' }}>الموظف</label>
                <select disabled style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', color: '#1e293b', outline: 'none' }}>
                  <option>{penaltyModal.employeeName}</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: '#475569' }}>نوع المخالفة</label>
                  <select value={penaltyModal.type} onChange={e => setPenaltyModal({...penaltyModal, type: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', outline: 'none', fontFamily: 'inherit' }}>
                    <option value="تأخير">تأخير</option>
                    <option value="مغادرة مبكرة">مغادرة مبكرة</option>
                    <option value="تغيب">تغيب</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: '#475569' }}>تاريخ المخالفة</label>
                  <input type="text" disabled value={penaltyModal.date} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', color: '#1e293b', outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: '#475569' }}>الإجراء المتخذ</label>
                  <select value={penaltyModal.action} onChange={e => setPenaltyModal({...penaltyModal, action: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', outline: 'none', fontFamily: 'inherit' }}>
                    <option value="تنبيه">تنبيه</option>
                    <option value="إنذار أول">إنذار أول</option>
                    <option value="إنذار نهائي">إنذار نهائي</option>
                    <option value="خصم مالي">خصم مالي</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: '#475569' }}>قيمة الخصم (إن وجد)</label>
                  <input type="text" placeholder="المبلغ بالدينار" value={penaltyModal.deduction} onChange={e => setPenaltyModal({...penaltyModal, deduction: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: '#475569' }}>ملاحظات / تفاصيل الإجراء</label>
                <textarea rows="4" value={penaltyModal.notes} onChange={e => setPenaltyModal({...penaltyModal, notes: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', outline: 'none', fontFamily: 'inherit', resize: 'none' }}></textarea>
              </div>

            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '30px', justifyContent: 'flex-start' }}>
              <button 
                onClick={async () => {
                  try {
                    const emp = employees.find(e => e.name === penaltyModal.employeeName);
                    if (emp) {
                      const savedViol = await saveHRViolation({
                        employeeId: emp.id,
                        employeeName: emp.name,
                        department: emp.department || 'غير محدد',
                        date: penaltyModal.date || selectedDate,
                        type: penaltyModal.type,
                        deductionAmount: Number(penaltyModal.deduction) || 0,
                        reason: penaltyModal.notes || 'لا يوجد ملاحظات',
                        action: penaltyModal.action,
                      }, { name: user?.name || 'النظام' });
                      setViolations(prev => [savedViol, ...prev]);
                      Swal.fire('تم بنجاح!', 'تم تسجيل المخالفة وحفظها في السجل.', 'success');
                    } else {
                      Swal.fire('خطأ', 'لم يتم العثور على الموظف', 'error');
                    }
                  } catch (e) {
                    console.error(e);
                    Swal.fire('خطأ', 'حدث خطأ أثناء الحفظ', 'error');
                  }
                  setPenaltyModal({...penaltyModal, isOpen: false});
                }}
                style={{ background: '#e11d48', color: 'white', border: 'none', borderRadius: '8px', padding: '12px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>
                تسجيل المخالفة
              </button>
              <button 
                onClick={() => setPenaltyModal({...penaltyModal, isOpen: false})}
                style={{ background: '#f1f5f9', color: '#1e293b', border: 'none', borderRadius: '8px', padding: '12px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lates Detail Modal */}
      {viewLatesModal.isOpen && viewLatesModal.employee && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '90%', maxWidth: '550px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', position: 'relative' }}>
            <button 
              onClick={() => setViewLatesModal({ isOpen: false, employee: null, lates: [] })} 
              style={{ position: 'absolute', top: '16px', left: '16px', background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
            >
              <X size={16} />
            </button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b', margin: '0 0 16px 0', textAlign: 'right' }}>
              تفاصيل تأخيرات الموظف: <span style={{ color: '#6366f1' }}>{viewLatesModal.employee.name}</span>
            </h3>
            
            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
                <thead style={{ background: '#f8fafc', color: '#475569', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>التاريخ</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>وقت الدخول</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>مدة التأخير</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>القيمة المالية</th>
                  </tr>
                </thead>
                <tbody>
                  {viewLatesModal.lates.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>لا توجد تفاصيل تأخير مسجلة</td>
                    </tr>
                  ) : (
                    viewLatesModal.lates.map((late, idx) => (
                      <tr key={idx} style={{ borderBottom: idx < viewLatesModal.lates.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <td style={{ padding: '12px 16px', color: '#1e293b', fontWeight: '500' }}>{late.date}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b', textAlign: 'center' }} dir="ltr">{formatTime12h(late.timeIn)}</td>
                        <td style={{ padding: '12px 16px', color: '#ef4444', fontWeight: 'bold', textAlign: 'center' }}>{late.lateMins} دقيقة</td>
                        <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: 'bold', textAlign: 'center' }}>
                          {late.financialDeduction > 0 ? `${late.financialDeduction.toFixed(2)} د.أ` : '0.00 د.أ'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setViewLatesModal({ isOpen: false, employee: null, lates: [] })}
                style={{ background: '#f1f5f9', color: '#1e293b', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit' }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HRAttendanceAlerts;
