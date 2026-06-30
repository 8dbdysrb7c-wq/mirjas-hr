import React, { useState, useEffect } from 'react';
import {
  Clock, Save, Search, ArrowUpDown, ArrowUp, ArrowDown,
  MapPin, Users, CheckCircle, AlertTriangle, X,
  LogIn, LogOut, Sun, ChevronDown, Calendar
} from 'lucide-react';
import {
  getEmployees, getHRAttendance, saveHRAttendance,
  getReports, getSupervisorReports, getHRLeaves,
  getAttendanceLogs, processDailyAbsences, saveEmployee
} from '../../store';
import Swal from 'sweetalert2';
import { sendWhatsAppNotification } from '../../utils/whatsappService';

/* ─────────────────────────── helpers ─────────────────────────── */
const getLocalDateStr = (d) => {
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().split('T')[0];
};

const STATUS_META = {
  'متواجد حالياً':  { bg: '#ecfdf5', border: '#a7f3d0', text: '#059669' },
  'مكتمل الدوام':   { bg: '#ecfdf5', border: '#a7f3d0', text: '#059669' },
  'مداوم':          { bg: '#ecfdf5', border: '#a7f3d0', text: '#059669' },
  'متأخر':          { bg: '#fffbeb', border: '#fde68a', text: '#d97706' },
  'في إجازة':       { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb' },
  'لم يسجل دخول':  { bg: '#f8fafc', border: '#e2e8f0', text: '#475569' },
  'لم يسجل خروج':  { bg: '#fff7ed', border: '#fed7aa', text: '#ea580c' },
  'غائب':           { bg: '#fff1f2', border: '#fecdd3', text: '#e11d48' },
};

const getStatusStyle = (s) => STATUS_META[s] || { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b', dot: '#94a3b8' };

/* ─────────────────────────── component ─────────────────────────── */
const HRAttendance = ({ user }) => {
  const [employees, setEmployees]           = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employeeReports, setEmployeeReports]     = useState([]);
  const [supervisorReports, setSupervisorReports] = useState([]);
  const [leaves, setLeaves]                 = useState([]);
  const [liveLogs, setLiveLogs]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [dailyAttendance, setDailyAttendance] = useState({});
  const [search, setSearch]                 = useState('');
  const [sortConfig, setSortConfig]         = useState({ key: null, direction: 'asc' });
  const [activeFilter, setActiveFilter]     = useState(null);

  const selectedDate = getLocalDateStr(new Date());

  /* ── sorting ── */
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const SortIcon = ({ col }) => {
    if (sortConfig.key !== col) return <ArrowUpDown size={13} style={{ color: '#cbd5e1' }} />;
    return sortConfig.direction === 'asc'
      ? <ArrowUp size={13} style={{ color: '#0f5c6e' }} />
      : <ArrowDown size={13} style={{ color: '#0f5c6e' }} />;
  };

  const handleProcessAbsences = async () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA');
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const endDay = yesterday.toLocaleDateString('en-CA');

    const result = await Swal.fire({
      title: 'معالجة الغيابات الآلية',
      html: `سيقوم النظام بالبحث عن الأيام التي لم يحضر فيها الموظف (ولم يسجل إجازة) وتسجيلها كـ "غياب غير مبرر".<br><br>
        <div style="text-align: right; margin-top: 15px;">
          <label>من تاريخ:</label>
          <input type="date" id="abs-start" class="swal2-input" value="${firstDay}" style="width: 80%;">
          <label>إلى تاريخ:</label>
          <input type="date" id="abs-end" class="swal2-input" value="${endDay}" style="width: 80%;">
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'معالجة الغيابات',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        return {
          start: document.getElementById('abs-start').value,
          end: document.getElementById('abs-end').value
        };
      }
    });

    if (result.isConfirmed) {
      setLoading(true);
      const res = await processDailyAbsences(result.value.start, result.value.end, user);
      if (res.success) {
        Swal.fire('تم بنجاح', `تم تسجيل ${res.count} أيام غياب.`, 'success');
        const records = await getHRAttendance();
        setAttendanceRecords(records);
      } else {
        Swal.fire('خطأ', 'حدث خطأ أثناء معالجة الغيابات', 'error');
      }
      setLoading(false);
    }
  };

  const handleMarkAbsent = async (empId, empName) => {
    const emp = employees.find(e => String(e.id) === String(empId));
    if (!emp) return;

    const vacBal = Number(emp.vacationBalance) || 0;
    const sickBal = Number(emp.sickLeaveBalance) || 0;

    const { value: absenceType } = await Swal.fire({
      title: 'تسجيل الغياب',
      html: `
        <div style="text-align: right; font-family: inherit;">
          <p style="margin-bottom: 15px;">يرجى اختيار نوع الغياب للموظف <b style="color: #0f5c6e;">${empName}</b>:</p>
          <div style="display: flex; flex-direction: column; gap: 12px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 8px; border-radius: 6px; transition: background 0.2s;">
              <input type="radio" name="absenceType" value="إجازة غير مدفوعة" checked style="accent-color: #0f5c6e; width: 16px; height: 16px;">
              <span style="font-size: 14px; font-weight: 600; color: #1e293b;">إجازة غير مدفوعة (غياب غير مبرر)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 8px; border-radius: 6px; transition: background 0.2s; ${vacBal <= 0 ? 'opacity: 0.5' : ''}">
              <input type="radio" name="absenceType" value="إجازة سنوية" ${vacBal <= 0 ? 'disabled' : ''} style="accent-color: #0f5c6e; width: 16px; height: 16px;">
              <span style="font-size: 14px; font-weight: 600; color: #1e293b;">إجازة سنوية</span>
              <span style="margin-right: auto; font-size: 12px; background: #e0f2fe; color: #0284c7; padding: 2px 8px; border-radius: 12px; font-weight: bold;">الرصيد: ${vacBal} يوم</span>
            </label>
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 8px; border-radius: 6px; transition: background 0.2s; ${sickBal <= 0 ? 'opacity: 0.5' : ''}">
              <input type="radio" name="absenceType" value="إجازة مرضية" ${sickBal <= 0 ? 'disabled' : ''} style="accent-color: #0f5c6e; width: 16px; height: 16px;">
              <span style="font-size: 14px; font-weight: 600; color: #1e293b;">إجازة مرضية</span>
              <span style="margin-right: auto; font-size: 12px; background: #fce7f3; color: #be185d; padding: 2px 8px; border-radius: 12px; font-weight: bold;">الرصيد: ${sickBal} يوم</span>
            </label>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'حفظ الغياب',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#0f5c6e',
      preConfirm: () => {
        const radios = document.getElementsByName('absenceType');
        for (let i = 0; i < radios.length; i++) {
          if (radios[i].checked) {
            return radios[i].value;
          }
        }
        return 'إجازة غير مدفوعة';
      }
    });

    if (absenceType) {
      setLoading(true);
      try {
        const attId = `${empId}_${selectedDate}`;
        await saveHRAttendance({
          id: attId,
          employeeId: empId,
          employeeName: empName,
          date: selectedDate,
          status: absenceType,
          timeIn: '--:--',
          timeOut: '--:--',
          notes: `تم تسجيل غياب (${absenceType}) يدوياً بواسطة الإدارة`
        });
        
        if (absenceType === 'إجازة سنوية' && vacBal > 0) {
           await saveEmployee({ ...emp, vacationBalance: vacBal - 1 });
        } else if (absenceType === 'إجازة مرضية' && sickBal > 0) {
           await saveEmployee({ ...emp, sickLeaveBalance: sickBal - 1 });
        }

        const [records, updatedEmps] = await Promise.all([getHRAttendance(), getEmployees()]);
        setAttendanceRecords(records);
        setEmployees(updatedEmps);
        
        Swal.fire('تم بنجاح', 'تم تسجيل الغياب بنجاح وتم تحديث الأرصدة إذا لزم الأمر', 'success');
      } catch (e) {
        console.error(e);
        Swal.fire('خطأ', 'حدث خطأ أثناء الحفظ', 'error');
      }
      setLoading(false);
    }
  };

  const handleMissingCheckout = async (empId, empName, rec) => {
    const { value: formValues } = await Swal.fire({
      title: 'معالجة نسيان خروج',
      html: `
        <div style="text-align: right; font-family: inherit;">
          <p style="margin-bottom: 15px;">الموظف <b style="color: #0f5c6e;">${empName}</b> لم يسجل خروج. يرجى اتخاذ الإجراء المناسب:</p>
          <div style="display: flex; flex-direction: column; gap: 12px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
            
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 8px; border-radius: 6px;">
              <input type="radio" name="checkoutAction" value="time" checked style="accent-color: #0f5c6e; width: 16px; height: 16px;">
              <span style="font-size: 14px; font-weight: 600; color: #1e293b;">إدخال وقت خروج يدوي</span>
            </label>
            <div id="manual-time-div" style="padding-right: 26px; display:block;">
               <input type="time" id="manualOutTime" class="swal2-input" style="height: 36px; font-size: 14px; margin: 0; width: 150px;">
            </div>

            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 8px; border-radius: 6px;">
              <input type="radio" name="checkoutAction" value="early" style="accent-color: #0f5c6e; width: 16px; height: 16px;">
              <span style="font-size: 14px; font-weight: 600; color: #1e293b;">تسجيل كمغادرة (يحسب كدوام ناقص)</span>
            </label>

            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 8px; border-radius: 6px;">
              <input type="radio" name="checkoutAction" value="absent" style="accent-color: #f43f5e; width: 16px; height: 16px;">
              <span style="font-size: 14px; font-weight: 600; color: #e11d48;">تسجيل كغياب غير مبرر (خصم يوم كامل)</span>
            </label>
          </div>
        </div>
      `,
      didOpen: () => {
         const radios = document.getElementsByName('checkoutAction');
         radios.forEach(r => r.addEventListener('change', (e) => {
            const timeDiv = document.getElementById('manual-time-div');
            if (timeDiv) timeDiv.style.display = e.target.value === 'time' ? 'block' : 'none';
         }));
      },
      showCancelButton: true,
      confirmButtonText: 'حفظ الإجراء',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#0f5c6e',
      preConfirm: () => {
        const actionNode = document.querySelector('input[name="checkoutAction"]:checked');
        const action = actionNode ? actionNode.value : 'time';
        const outTime = document.getElementById('manualOutTime').value;
        if (action === 'time' && !outTime) {
           Swal.showValidationMessage('الرجاء إدخال وقت الخروج');
           return false;
        }
        return { action, outTime };
      }
    });

    if (formValues) {
      setLoading(true);
      try {
        let updateData = {
           id: rec.id,
           employeeId: empId,
           employeeName: empName,
           date: selectedDate,
        };
        
        if (formValues.action === 'time') {
           updateData.timeOut = formValues.outTime;
           updateData.status = 'مكتمل الدوام';
           updateData.notes = (rec.notes || '') + ' | أُدخل وقت خروج يدوي للإغلاق';
        } else if (formValues.action === 'early') {
           updateData.status = 'مغادرة مبكرة';
           updateData.timeOut = '--:--';
           updateData.notes = (rec.notes || '') + ' | سُجلت مغادرة مبكرة لعدم إكمال البصمة';
        } else if (formValues.action === 'absent') {
           updateData.status = 'غياب غير مبرر';
           updateData.timeIn = '--:--';
           updateData.timeOut = '--:--';
           updateData.notes = (rec.notes || '') + ' | ألغي دخول الموظف وحُسب غياب لتجاهل الخروج';
        }

        await saveHRAttendance(updateData);
        
        const records = await getHRAttendance();
        setAttendanceRecords(records);
        
        Swal.fire('تم بنجاح', 'تم معالجة نسيان الخروج بنجاح', 'success');
      } catch (e) {
        console.error(e);
        Swal.fire('خطأ', 'حدث خطأ أثناء الحفظ', 'error');
      }
      setLoading(false);
    }
  };

  const handleUndoAbsent = async (empId) => {
    try {
      const existing = attendanceRecords.find(r => String(r.employeeId).trim() === String(empId).trim() && r.date === selectedDate);
      if (existing && existing.id) {
        // Just delete the manual record or update its status to empty so it gets recalculated
        // The safest is to use saveHRAttendance to clear it if deleting isn't imported
        // but we can import deleteDoc from firebase if needed, or just set it to 'محذوف'
        await saveHRAttendance({
          id: existing.id,
          status: 'محذوف',
          notes: ''
        });
        const records = await getHRAttendance();
        setAttendanceRecords(records);
      }
    } catch (e) {
      console.error(e);
    }
  };

  /* ── fetch ── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [emps, records, empReps, supReps, lvs, aLogs] = await Promise.all([
        getEmployees(), getHRAttendance(), getReports(), getSupervisorReports(), getHRLeaves(), getAttendanceLogs()
      ]);
      setEmployees(emps);
      setAttendanceRecords(records);
      setEmployeeReports(empReps || []);
      setSupervisorReports(supReps || []);
      setLeaves(lvs || []);
      setLiveLogs(aLogs || []);
      setLoading(false);
    })();
  }, []);

  /* ── build daily map ── */
  useEffect(() => {
    const todayRecords = attendanceRecords.filter(r => r.date === selectedDate);
    const data = {};
    employees.forEach(emp => {
      const empIdStr = String(emp.id).trim();
      const empNameStr = String(emp.name || '').trim();

      const isMatch = (id, name) => {
        // 1. Exact ID match
        if (id && String(id).trim() === empIdStr) return true;
        
        // 2. Exact Name match (Fallback because some users have different login IDs)
        if (name && empNameStr && String(name).trim() === empNameStr) return true;
        
        return false;
      };

      const empReport = employeeReports.find(r => isMatch(r.userId, r.userName) && r.date === selectedDate);
      const supReport = supervisorReports.find(r => isMatch(r.supervisorId, r.supervisorName) && r.date === selectedDate);
      const empLeave = leaves.find(l => {
        if (!isMatch(l.employeeId, l.employeeName) || l.status !== 'موافق' || l.type === 'بدل عمل إضافي') return false;
        if (l.date && l.date === selectedDate) return true;
        if (l.startDate && l.endDate && selectedDate >= l.startDate && selectedDate <= l.endDate) return true;
        return false;
      });
      const liveLog   = liveLogs.find(l => isMatch(l.employeeId, l.employeeName) && l.date === selectedDate);

      const reportNotes = empReport?.notes || supReport?.attendanceNotes || '';
      const liveNotes = liveLog?.notes || liveLog?.actionType || liveLog?.status || '';
      const actualNotes = reportNotes || liveNotes;

      const existing = todayRecords.find(r => (isMatch(r.employeeId, r.employeeName) || isMatch(r.userId, r.userName)) && r.status !== 'محذوف');
      if (existing) { 
        data[emp.id] = { ...existing }; 
        if (!existing.notes && actualNotes) {
           data[emp.id].notes = actualNotes;
        }
        if (!existing.status) {
           data[emp.id].status = existing.isLeave ? (existing.type || 'في إجازة') : 'لم يسجل دخول';
        }
        return; 
      }

      let tIn  = liveLog?.timeIn || liveLog?.time || empReport?.timeIn  || supReport?.timeIn  || '';
      let tOut = liveLog?.timeOut || empReport?.timeOut || supReport?.timeOut || '';

      let status = 'لم يسجل دخول';
      if (empLeave) {
        status = empLeave.type || 'في إجازة';
      } else if (tIn) {
        const [h, m] = (emp.shiftStart || '08:00').split(':').map(Number);
        const grace = new Date(); grace.setHours(h, m + 15, 0);
        const graceStr = `${String(grace.getHours()).padStart(2,'0')}:${String(grace.getMinutes()).padStart(2,'0')}`;
        if (tIn > graceStr)       status = 'متأخر';
        else if (tIn && tOut)     status = 'مكتمل الدوام';
        else                      status = 'متواجد حالياً';
      } else if (liveLog && (liveLog.status === 'حضور' || liveLog.status === 'حاضر متأخر' || liveLog.status === 'مداوم' || liveLog.actionType === 'دخول' || liveLog.actionType === 'دخول جغرافى')) {
        status = 'متواجد حالياً';
      }

      let generatedNotes = '';
      if (actualNotes) {
        generatedNotes = actualNotes;
      } else if (tIn || tOut) {
        generatedNotes = 'تم سحب الدوام من التقرير';
      } else if (empLeave) {
        generatedNotes = `طلب معتمد: ${empLeave.type} ${empLeave.notes ? `- ${empLeave.notes}` : ''}`;
      }

      data[emp.id] = {
        employeeId: emp.id, employeeName: emp.name, date: selectedDate,
        timeIn: tIn, timeOut: tOut, status,
        overtimeHours: '',
        notes: generatedNotes,
      };
    });
    setDailyAttendance(data);
  }, [selectedDate, attendanceRecords, employees, employeeReports, supervisorReports, leaves]);

  /* ── filter + sort ── */
  const filteredEmployees = employees
    .filter(emp =>
      emp.name?.toLowerCase().includes(search.toLowerCase()) ||
      emp.id?.toLowerCase().includes(search.toLowerCase())
    )
    .filter(emp => {
      if (!activeFilter) return true;
      const r = dailyAttendance[emp.id] || {};
      const s = r.status || 'لم يسجل دخول';
      
      if (activeFilter === 'متواجد حالياً' && s === 'متواجد حالياً') return true;
      if (activeFilter === 'مكتمل الدوام' && s === 'مكتمل الدوام') return true;
      if (activeFilter === 'متأخر' && s === 'متأخر') return true;
      if (activeFilter === 'لم يسجل دخول' && s === 'لم يسجل دخول') return true;
      if (activeFilter === 'لم يسجل خروج' && s === 'لم يسجل خروج') return true;
      if (activeFilter === 'غائب' && ['غائب', 'غياب غير مبرر', 'غياب'].includes(s)) return true;
      if (activeFilter === 'في إجازة' && (s === 'في إجازة' || r.isLeave || s.includes('إجازة') || s.includes('مغادرة') || s.includes('امتحان') || s.includes('بدل'))) return true;
      
      return false;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      let vA = a[sortConfig.key] ?? '', vB = b[sortConfig.key] ?? '';
      if (sortConfig.key === 'name') {
        vA = String(vA).toLowerCase(); vB = String(vB).toLowerCase();
      }
      const nA = Number(vA), nB = Number(vB);
      if (!isNaN(nA) && !isNaN(nB)) return sortConfig.direction === 'asc' ? nA - nB : nB - nA;
      if (vA < vB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (vA > vB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  /* ── clean notes ── */
  const cleanNotes = (notes) =>
    (notes || '')
      .replace(/(?:دخول|خروج) جغراف[يى][^|]*\|?/g, '')
      .replace(/\|\s*$/g, '')
      .trim();

  /* ── counters ── */
  const C = { present:0, completed:0, late:0, absent:0, noIn:0, noOut:0, leave:0 };
  Object.values(dailyAttendance).forEach(r => {
    const s = r.status || '';
    if (s === 'متواجد حالياً') C.present++;
    else if (s === 'مكتمل الدوام')  C.completed++;
    else if (s === 'متأخر')          C.late++;
    else if (s === 'لم يسجل دخول')  C.noIn++;
    else if (s === 'لم يسجل خروج')  C.noOut++;
    else if (['غائب', 'غياب غير مبرر', 'غياب'].includes(s)) C.absent++;
    else if (s === 'في إجازة' || r.isLeave || s.includes('إجازة') || s.includes('مغادرة') || s.includes('امتحان') || s.includes('بدل')) C.leave++; 
  });

  const displayDate = new Date(selectedDate).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  /* ── loading state ── */
  if (loading && employees.length === 0) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:400, flexDirection:'column', gap:16 }}>
      <div style={{ width:40, height:40, border:'3px solid #e2e8f0', borderTopColor:'#1a7a8a', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <span style={{ color:'#94a3b8', fontSize:14 }}>جارٍ التحميل...</span>
    </div>
  );

  /* ════════════════════════════════════════════
                   R E N D E R
  ════════════════════════════════════════════ */
  return (
    <div style={{ minHeight:'100vh', background:'#fff', fontFamily:'inherit' }}>
      
      {/* ── TOP HEADER BAR ── */}
      <header style={{
        background: '#fff',
        padding: '24px 32px 28px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        borderBottom: '1px solid #e2e8f0',
        position: 'relative',
      }}>
        {/* decorative circles */}

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative', zIndex:1, gap:16 }}>
          
          {/* Right: Title */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
              <div style={{ width:38, height:38, borderRadius:10, background:'#e0f2fe', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Clock size={20} style={{ color:'#0ea5e9' }} />
              </div>
              <h1 style={{ fontSize:22, fontWeight:800, color:'#1e293b', margin:0, lineHeight:1.2 }}>
                لوحة الحضور والانصراف اليومية
              </h1>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, paddingRight:48 }}>
              <Calendar size={13} style={{ color:'#64748b' }} />
              <p style={{ fontSize:13, color:'#64748b', margin:0 }}>
                {displayDate}
              </p>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:12, flexShrink:0, flex: 1, maxWidth: '450px' }}>
            {/* Search */}
            <div style={{
              background:'#fff',
              border:'1px solid #e2e8f0',
              borderRadius:10,
              padding:'9px 14px',
              display:'flex',
              alignItems:'center',
              gap:8,
              width: '100%',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'all 0.2s ease-in-out',
            }}>
              <input
                type="text"
                placeholder="ابحث بالاسم أو الرقم..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  background:'transparent', border:'none', outline:'none',
                  fontSize:13, width:'100%', textAlign:'right',
                  color:'#1e293b', direction:'rtl',
                }}
              />
              <Search size={15} style={{ color:'#94a3b8', flexShrink:0 }} />
            </div>
            
            {activeFilter && (
              <button
                onClick={() => setActiveFilter(null)}
                style={{
                  padding: '10px 16px',
                  background: '#fff1f2',
                  color: '#e11d48',
                  border: '1px solid #fecdd3',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#ffe4e6'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff1f2'; }}
              >
                <X size={15} />
                إلغاء تصفية ({activeFilter})
              </button>
            )}

          </div>
        </div>
      </header>

      {/* ── CONTENT AREA ── */}
      <div style={{ padding:'28px 28px 40px' }}>

        {/* ── STAT CARDS ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:28 }}>
          
          {/* Card: غائب */}
          <StatCard
            icon={<X size={22} strokeWidth={2.5} style={{ color:'#f43f5e' }} />}
            iconBg="#fff1f2"
            label="غائب"
            value={C.absent}
            accent="#f43f5e"
            isActive={activeFilter === 'غائب'}
            onClick={() => setActiveFilter(activeFilter === 'غائب' ? null : 'غائب')}
          />

          {/* Card: متأخر + في إجازة */}
          <DualCard
            top={{ icon:<AlertTriangle size={18} style={{ color:'#f59e0b' }} />, iconBg:'#fffbeb', label:'متأخر', value:C.late, isActive: activeFilter === 'متأخر', onClick: () => setActiveFilter(activeFilter === 'متأخر' ? null : 'متأخر') }}
            bottom={{ icon:<Sun size={18} style={{ color:'#f59e0b' }} />, iconBg:'#fffbeb', label:'في إجازة', value:C.leave, isActive: activeFilter === 'في إجازة', onClick: () => setActiveFilter(activeFilter === 'في إجازة' ? null : 'في إجازة') }}
          />

          {/* Card: مكتمل الدوام + لم يسجل خروج */}
          <DualCard
            top={{ icon:<CheckCircle size={18} style={{ color:'#10b981' }} />, iconBg:'#ecfdf5', label:'مكتمل الدوام', value:C.completed, isActive: activeFilter === 'مكتمل الدوام', onClick: () => setActiveFilter(activeFilter === 'مكتمل الدوام' ? null : 'مكتمل الدوام') }}
            bottom={{ icon:<LogOut size={18} style={{ color:'#10b981' }} />, iconBg:'#ecfdf5', label:'لم يسجل خروج', value:C.noOut, isActive: activeFilter === 'لم يسجل خروج', onClick: () => setActiveFilter(activeFilter === 'لم يسجل خروج' ? null : 'لم يسجل خروج') }}
          />

          {/* Card: متواجد حالياً + لم يسجل دخول */}
          <DualCard
            top={{ icon:<Users size={18} style={{ color:'#3b82f6' }} />, iconBg:'#eff6ff', label:'متواجد حالياً', value:C.present, isActive: activeFilter === 'متواجد حالياً', onClick: () => setActiveFilter(activeFilter === 'متواجد حالياً' ? null : 'متواجد حالياً') }}
            bottom={{ icon:<LogIn size={18} style={{ color:'#3b82f6' }} />, iconBg:'#eff6ff', label:'لم يسجل دخول', value:C.noIn, isActive: activeFilter === 'لم يسجل دخول', onClick: () => setActiveFilter(activeFilter === 'لم يسجل دخول' ? null : 'لم يسجل دخول') }}
          />
        </div>

        {/* ── TABLE ── */}
        <div style={{
          background:'#fff',
          borderRadius:16,
          border:'1px solid #e2e8f0',
          boxShadow:'0 1px 8px rgba(0,0,0,0.06)',
          overflow:'hidden',
        }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, textAlign:'right', whiteSpace:'nowrap', minWidth:900 }}>
              <thead>
                <tr style={{ background:'#f8fafc', borderBottom:'2px solid #e8edf4' }}>
                  {[
                    { label:'الرقم',          col:'id',   align:'right', w:100 },
                    { label:'الموظف',         col:'name', align:'right', w:260 },
                    { label:'وقت الدخول',    col:null,  align:'center', w:150 },
                    { label:'وقت الخروج',    col:null,  align:'center', w:150 },
                    { label:'الحالة',         col:null,  align:'center', w:180 },
                    { label:'ملاحظات',        col:null,  align:'center', w:280 },
                  ].map(({ label, col, align, w }) => (
                    <th
                      key={label}
                      onClick={col ? () => handleSort(col) : undefined}
                      style={{
                        padding:'16px 14px',
                        fontWeight:700,
                        color:'#475569',
                        fontSize:13,
                        textTransform:'uppercase',
                        letterSpacing:'0.03em',
                        textAlign: align,
                        cursor: col ? 'pointer' : 'default',
                        width: w || undefined,
                        userSelect:'none',
                        borderBottom: '2px solid #e2e8f0',
                      }}
                    >
                      <div style={{ display:'flex', alignItems:'center', justifyContent: align === 'center' ? 'center' : 'flex-start', gap:5 }}>
                        {col && <SortIcon col={col} />}
                        {label}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredEmployees.map((emp, idx) => {
                  const rec = dailyAttendance[emp.id] || {};
                  const hasInLoc  = rec.locationConfirmed || (rec.notes||'').includes('دخول جغراف');
                  const hasOutLoc = (rec.notes||'').includes('خروج جغراف');
                  const st = getStatusStyle(rec.status);

                  return (
                    <tr
                      key={emp.id}
                      style={{ borderBottom:'1px solid #f1f5f9', background: idx%2===0 ? '#fff' : '#fafbfc', transition:'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background='#f0f9ff'}
                      onMouseLeave={e => e.currentTarget.style.background = idx%2===0 ? '#fff' : '#fafbfc'}
                    >
                      {/* ID */}
                      <td style={{ padding:'16px 14px', textAlign:'right' }}>
                        <span style={{
                          display:'inline-block', fontWeight:700, fontSize:12,
                          color:'#0f5c6e', background:'#e6f4f7', borderRadius:6,
                          padding:'3px 8px', letterSpacing:'0.02em',
                        }}>
                          {emp.id}
                        </span>
                      </td>

                      {/* Employee */}
                      <td style={{ padding:'16px 14px', textAlign:'right' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'flex-start' }}>
                          <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#e0f2fe,#bfdbfe)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <Users size={15} style={{ color:'#3b82f6' }} />
                          </div>
                          <div>
                            <div style={{ fontWeight:700, color:'#1e293b', fontSize:13 }}>{emp.name}</div>
                            <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{emp.jobTitle || emp.department || '—'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Time In */}
                      <td style={{ padding:'16px 14px', textAlign:'center' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                          {hasInLoc
                            ? <MapPin size={13} style={{ color:'#10b981', flexShrink:0 }} />
                            : <div style={{ width:13, flexShrink:0 }} />
                          }
                          <div style={{
                            fontWeight:700, color: rec.timeIn ? '#0f172a' : '#cbd5e1',
                            fontSize:13, textAlign:'center', width:50, padding:0,
                          }}>
                            {rec.timeIn || '--:--'}
                          </div>
                          <Clock size={13} style={{ color: rec.timeIn ? '#3b82f6' : '#e2e8f0', flexShrink:0 }} />
                        </div>
                      </td>

                      {/* Time Out */}
                      <td style={{ padding:'16px 14px', textAlign:'center' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                          {hasOutLoc
                            ? <MapPin size={13} style={{ color:'#10b981', flexShrink:0 }} />
                            : <div style={{ width:13, flexShrink:0 }} />
                          }
                          <div style={{
                            fontWeight:700, color: rec.timeOut ? '#0f172a' : '#cbd5e1',
                            fontSize:13, textAlign:'center', width:50, padding:0,
                          }}>
                            {rec.timeOut || '--:--'}
                          </div>
                          <Clock size={13} style={{ color: rec.timeOut ? '#3b82f6' : '#e2e8f0', flexShrink:0 }} />
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding:'16px 14px', textAlign:'center' }}>
                        <div style={{ position:'relative', display:'inline-flex', alignItems:'center' }}>
                          <div
                            dir="rtl"
                            style={{
                              background: st.bg,
                              border:`1px solid ${st.border}`,
                              borderRadius:'6px', color: st.text,
                              fontWeight:600, fontSize:13,
                              padding:'6px 12px',
                              minWidth:120, textAlign:'center',
                              boxShadow:'0 1px 2px rgba(0,0,0,0.05)',
                            }}
                          >
                            {rec.status || 'لم يسجل دخول'}
                          </div>
                        </div>
                      </td>




                      {/* Notes */}
                      <td style={{ padding:'16px 14px', textAlign:'center' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                          <div style={{
                            fontSize:12, color:'#64748b', textAlign:'right',
                            width:'100%', minWidth:200, padding:'8px 10px',
                            background:'#f8fafc', borderRadius:8, border:'1px solid #e2e8f0'
                          }}>
                            {cleanNotes(rec.notes) || <span style={{ color:'#cbd5e1' }}>لا يوجد ملاحظات</span>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign:'center', padding:48, color:'#94a3b8', fontSize:14 }}>
                      لا توجد نتائج مطابقة للبحث
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{ borderTop:'1px solid #f1f5f9', padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:12, color:'#94a3b8' }}>
              إجمالي الموظفين: <strong style={{ color:'#475569' }}>{filteredEmployees.length}</strong>
            </span>
            <span style={{ fontSize:12, color:'#94a3b8' }}>
              آخر تحديث: <span dir="ltr" style={{ display: 'inline-block', marginLeft: '4px' }}>{new Date().toLocaleTimeString('en-US').replace(' AM', ' ص').replace(' PM', ' م')}</span>
            </span>
          </div>
        </div>
      </div>

      {/* global styles */}
      <style>{`
        input[type="time"]::-webkit-calendar-picker-indicator { display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

/* ── Sub-components ── */
const StatCard = ({ icon, iconBg, label, value, accent, onClick, isActive }) => (
  <div 
    onClick={onClick}
    style={{
    background: isActive ? '#f8fafc' : '#fff',
    cursor: onClick ? 'pointer' : 'default',
    borderRadius:14,
    border: isActive ? `1px solid ${accent}` : '1px solid #e8edf4',
    boxShadow: isActive ? `inset 0 0 0 1px ${accent}, 0 1px 6px rgba(0,0,0,0.05)` : '0 1px 6px rgba(0,0,0,0.05)',
    padding:'20px 20px',
    display:'flex',
    alignItems:'center',
    gap:16,
    transition:'all 0.15s',
    borderTop: `3px solid ${accent}`,
  }}
    onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.1)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow=isActive ? `inset 0 0 0 1px ${accent}, 0 1px 6px rgba(0,0,0,0.05)` : '0 1px 6px rgba(0,0,0,0.05)'; }}
  >
    <div style={{ flex:1, textAlign:'right' }}>
      <div style={{ fontSize:34, fontWeight:900, color:'#1e293b', lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:15, fontWeight:600, color:'#64748b', marginTop:6 }}>{label}</div>
    </div>
    <div style={{ width:48, height:48, borderRadius:12, background:iconBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      {icon}
    </div>
  </div>
);

const DualCard = ({ top, bottom }) => (
  <div style={{
    background:'#fff',
    borderRadius:14,
    border:'1px solid #e8edf4',
    boxShadow:'0 1px 6px rgba(0,0,0,0.05)',
    overflow:'hidden',
    transition:'transform 0.15s, box-shadow 0.15s',
    display: 'flex',
    flexDirection: 'column'
  }}
    onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.1)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 1px 6px rgba(0,0,0,0.05)'; }}
  >
    {[top, bottom].map((row, i) => (
      <div 
        key={i} 
        onClick={row.onClick}
        style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'14px 18px',
        borderBottom: i === 0 ? '1px solid #f1f5f9' : 'none',
        flex:1,
        cursor: row.onClick ? 'pointer' : 'default',
        background: row.isActive ? '#f8fafc' : 'transparent',
        boxShadow: row.isActive ? 'inset 0 0 0 1px #cbd5e1' : 'none',
        transition: 'all 0.15s'
      }}
      onMouseEnter={e => { if(row.onClick) e.currentTarget.style.background = row.isActive ? '#f1f5f9' : '#f8fafc'; }}
      onMouseLeave={e => { if(row.onClick) e.currentTarget.style.background = row.isActive ? '#f8fafc' : 'transparent'; }}
      >
        <div style={{ width:36, height:36, borderRadius:10, background:row.iconBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {row.icon}
        </div>
        <div style={{ textAlign:'right', flex:1, paddingRight:10 }}>
          <div style={{ fontSize:24, fontWeight:900, color:'#1e293b', lineHeight:1.1 }}>{row.value}</div>
          <div style={{ fontSize:14, fontWeight:600, color:'#64748b', marginTop:3 }}>{row.label}</div>
        </div>
      </div>
    ))}
  </div>
);

export default HRAttendance;
