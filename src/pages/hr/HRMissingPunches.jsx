import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Check, X, Search, Filter, Fingerprint, Undo2, Trash2, ArrowUpDown, ArrowUp, ArrowDown, MessageCircle, Plus, Eye, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { getMissingPunches, updateMissingPunchStatus, deleteMissingPunch, saveHRAuditLog, getEmployees, saveHRViolation, saveMissingPunch, getHRAttendance, saveHRAttendance, saveEmployee, getHRLeaves } from '../../store';
import Swal from 'sweetalert2';
import { sendWhatsAppNotification } from '../../utils/whatsappService';
import Select from 'react-select';
import Flatpickr from 'react-flatpickr';
import { Arabic } from 'flatpickr/dist/l10n/ar.js';
import 'flatpickr/dist/themes/light.css';
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
  const [dateTo, setDateTo] = useState(() => getLocalDateStr(new Date()));
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [inlineTimes, setInlineTimes] = useState({});

  const handleInlineTimeChange = (punchId, val) => {
    setInlineTimes(prev => ({ ...prev, [punchId]: val }));
  };

  const employeeOptions = useMemo(() => {
    return employees.map(emp => ({ value: emp.id, label: emp.name }));
  }, [employees]);

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
    const emps = await getEmployees();
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
      const hasManual = data.some(p => String(p.employeeId) === String(rec.employeeId) && p.date === rec.date && p.type === 'خروج');
      if (hasManual) return;

      if (rec.timeIn && (!rec.timeOut || rec.timeOut === '--:--') && rec.date >= dateFrom && rec.date <= dateTo) {
        if (!['غائب', 'غياب غير مبرر', 'مغادرة مبكرة', 'إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'].includes(rec.status)) {
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

    const combined = [...data, ...virtualPunches];
    setPunches(combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    setEmployees(emps);
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
          // Save note in the request if provided
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
              const statusMsg = newStatus === 'موافق عليه' ? 'الموافقة على ✅' : 'رفض ❌';
              const msg = `مرحباً ${selectedEmp.name}،\nنعلمك بأنه تم ${statusMsg} طلب الختمة الناقصة الخاص بك (${punch.type}) لتاريخ ${punch.date}.${adminNote ? '\nملاحظة الإدارة: ' + adminNote : ''}`;
              await sendWhatsAppNotification(selectedEmp.phone, msg);
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
        if (finalOut < finalIn) {
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
      } else if (action === 'sick') {
        updateData.status = 'إجازة مرضية';
        updateData.timeIn = '--:--';
        updateData.timeOut = '--:--';
        updateData.notes = notesPrefix + 'حُسب كإجازة مرضية لاكتشاف غياب البصمة';
        shouldUpdateEmp = true;
        newEmpData.sickLeaveBalance = sickBal - 1;
      } else if (action === 'unpaid') {
        updateData.status = 'إجازة غير مدفوعة';
        updateData.timeIn = '--:--';
        updateData.timeOut = '--:--';
        updateData.notes = notesPrefix + 'حُسب كإجازة غير مدفوعة لاكتشاف غياب البصمة';
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

    const isDuplicate = punches.some(p => String(p.employeeId || '').trim() === String(newPunch.employeeId || '').trim() && p.date === newPunch.date && p.type === newPunch.type);
    if (isDuplicate) {
      return Swal.fire('خطأ', 'يوجد طلب ختمة ناقصة مسبقاً لهذا الموظف في نفس التاريخ ونفس النوع!', 'error');
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
    if (filterStatus !== 'الكل') {
      if (p.date && (p.date < dateFrom || p.date > dateTo)) matchMonth = false;
    }

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
    if (filterStatus !== 'الكل') {
      if (p.date && (p.date < dateFrom || p.date > dateTo)) matchMonth = false;
    }
    return matchSearch && matchMonth;
  });

  const totalCount = statsPunches.length;
  const pendingCount = statsPunches.filter(p => p.status === 'معلق' || p.status === 'قيد المراجعة').length;
  const approvedCount = statsPunches.filter(p => p.status === 'موافق عليه' || p.status === 'موافق' || p.status === 'مكتمل الدوام').length;
  const rejectedCount = statsPunches.filter(p => p.status === 'مرفوض' || ['غياب غير مبرر', 'مغادرة مبكرة', 'إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'].includes(p.status)).length;

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <h2 className="text-2xl font-bold flex items-center gap-2 shrink-0">
            <Fingerprint className="text-primary" /> طلبات الختمات الناقصة
          </h2>
            <div className="flex flex-wrap gap-3 items-center flex-1 w-full justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-sm shrink-0">
                  <span className="text-slate-600 font-bold px-2 text-sm">من</span>
              <Flatpickr
                value={dateFrom}
                onChange={([d]) => setDateFrom(getLocalDateStr(d))}
                options={{ locale: Arabic, dateFormat: 'Y-m-d' }}
                className="input-field w-[130px] text-center bg-white font-mono text-sm shadow-sm hover:border-primary transition-colors cursor-pointer"
                style={{ borderRadius: '8px', padding: '8px', letterSpacing: '1px' }}
                placeholder="من تاريخ"
              />
              <span className="text-slate-600 font-bold px-2 text-sm">إلى</span>
              <Flatpickr
                value={dateTo}
                onChange={([d]) => setDateTo(getLocalDateStr(d))}
                options={{ locale: Arabic, dateFormat: 'Y-m-d', maxDate: 'today' }}
                className="input-field w-[130px] text-center bg-white font-mono text-sm shadow-sm hover:border-primary transition-colors cursor-pointer"
                style={{ borderRadius: '8px', padding: '8px', letterSpacing: '1px' }}
                placeholder="إلى تاريخ"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field shrink-0"
              style={{ width: '160px', height: '42px', fontSize: '0.9rem' }}
            >
              <option value="معلق">الطلبات المعلقة</option>
              <option value="موافق عليه">الموافق عليها</option>
              <option value="مرفوض">المرفوضة</option>
              <option value="الكل">الكل</option>
            </select>

            <div className="w-[140px] shrink-0">
              <Select
                options={employeeIdOptions}
                value={employeeIdOptions.find(opt => opt.value === searchTerm) || null}
                onChange={(selected) => setSearchTerm(selected ? selected.value : '')}
                styles={customSelectStyles}
                placeholder="رقم الموظف..."
                isSearchable={true}
                isClearable={true}
                menuPosition="fixed"
                menuPortalTarget={document.body}
                noOptionsMessage={() => "لا يوجد رقم"}
              />
            </div>

            <div className="w-[400px] xl:w-[600px] shrink-0">
              <Select
                options={employeeNameOptions}
                value={employeeNameOptions.find(opt => opt.value === searchTerm) || null}
                onChange={(selected) => setSearchTerm(selected ? selected.value : '')}
                styles={customSelectStyles}
                placeholder="اسم الموظف..."
                isSearchable={true}
                isClearable={true}
                menuPosition="fixed"
                menuPortalTarget={document.body}
                noOptionsMessage={() => "لا يوجد موظف"}
              />
            </div>

              </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="premium-add-btn flex items-center gap-2 whitespace-nowrap h-[42px] shrink-0 mr-auto xl:mr-0"
              style={{ paddingLeft: '24px', paddingRight: '24px' }}
            >
              <Plus size={20} strokeWidth={2.5} /> تقديم طلب جديد
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="glass-card flex items-center justify-between hover:-translate-y-1 transition-transform duration-300">
          <div>
            <p className="text-sm text-slate-500 font-bold mb-1">إجمالي الطلبات</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalCount}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shadow-sm">
            <Fingerprint size={24} />
          </div>
        </div>
        <div className="glass-card flex items-center justify-between hover:-translate-y-1 transition-transform duration-300">
          <div>
            <p className="text-sm text-slate-500 font-bold mb-1">طلبات معلقة</p>
            <h3 className="text-2xl font-bold text-yellow-600">{pendingCount}</h3>
          </div>
          <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center shadow-sm">
            <Clock size={24} />
          </div>
        </div>
        <div className="glass-card flex items-center justify-between hover:-translate-y-1 transition-transform duration-300">
          <div>
            <p className="text-sm text-slate-500 font-bold mb-1">طلبات موافق عليها</p>
            <h3 className="text-2xl font-bold text-emerald-600">{approvedCount}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-sm">
            <Check size={24} />
          </div>
        </div>
        <div className="glass-card flex items-center justify-between hover:-translate-y-1 transition-transform duration-300">
          <div>
            <p className="text-sm text-slate-500 font-bold mb-1">طلبات مرفوضة / معالجة</p>
            <h3 className="text-2xl font-bold text-red-600">{rejectedCount}</h3>
          </div>
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center shadow-sm">
            <X size={24} />
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden" style={{ padding: 0 }}>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 text-sm">
                <th className="p-4 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => handleSort('employeeId')}>
                  <div className="flex items-center justify-center gap-1">الرقم الوظيفي <SortIcon col="employeeId" /></div>
                </th>
                <th className="p-4 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors" style={{ minWidth: '10cm' }} onClick={() => handleSort('employeeName')}>
                  <div className="flex items-center gap-1">اسم الموظف <SortIcon col="employeeName" /></div>
                </th>
                <th className="p-4 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => handleSort('date')}>
                  <div className="flex items-center justify-center gap-1">التاريخ <SortIcon col="date" /></div>
                </th>
                <th className="p-4 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => handleSort('type')}>
                  <div className="flex items-center justify-center gap-1">النوع <SortIcon col="type" /></div>
                </th>
                <th className="p-4 font-bold whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-1">وقت الدخول</div>
                </th>
                <th className="p-4 font-bold whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-1">وقت الخروج</div>
                </th>
                <th className="p-4 font-bold w-1/4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('reason')}>
                  <div className="flex items-center gap-1">السبب <SortIcon col="reason" /></div>
                </th>
                <th className="p-4 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => handleSort('status')}>
                  <div className="flex items-center justify-center gap-1">الحالة <SortIcon col="status" /></div>
                </th>
                <th className="p-4 font-bold whitespace-nowrap text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {filteredPunches.length === 0 ? (
                <tr><td colSpan="8" className="p-8 text-center text-slate-500">لا توجد طلبات مطابقة</td></tr>
              ) : filteredPunches.map(p => {
                const emp = employees.find(e => String(e.id || '').trim() === String(p.employeeId || '').trim() || String(e.name || '').trim() === String(p.employeeName || '').trim());
                const allowedPunches = emp?.allowedMissingPunches ?? 3;

                const pDate = new Date(p.date || p.createdAt);
                const pMonth = pDate.getMonth();
                const pYear = pDate.getFullYear();

                const monthCount = punches.filter(empPunch => {
                  if (String(empPunch.employeeId || '').trim() !== String(p.employeeId || '').trim()) return false;
                  const empDate = new Date(empPunch.date || empPunch.createdAt);
                  return empDate.getMonth() === pMonth && empDate.getFullYear() === pYear;
                }).length;

                const isExhausted = monthCount > allowedPunches;

                return (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 text-slate-500 font-mono text-sm whitespace-nowrap text-center" dir="ltr">
                      {p.employeeId}
                    </td>
                    <td className="p-4 font-bold text-slate-800 whitespace-nowrap">
                      {p.employeeName}
                    </td>
                    <td className="p-4 whitespace-nowrap text-slate-600 font-medium text-center">{p.date}</td>
                    <td className="p-4 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center justify-center">
                        {p.isVirtual ? (
                          <span className="px-2 py-1 text-xs font-bold bg-slate-100 text-slate-600 rounded flex items-center justify-center w-fit gap-1 border border-slate-200">
                            آلي
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-bold rounded flex items-center justify-center w-fit gap-1 bg-slate-100 text-slate-700 border border-slate-200">
                            يدوي
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Check-in Time */}
                    <td className="p-4 font-bold whitespace-nowrap text-center" dir="ltr">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {(p.type === 'دخول' || p.reason === 'بصمة دخول وخروج') && p.isVirtual && (p.status === 'معلق' || p.status === 'قيد المراجعة') ? (
                          <>
                            <input
                              type="time"
                              className="premium-time-input"
                              style={{ width: 85, height: 28, fontSize: 13 }}
                              value={inlineTimes[`${p.id}_in`] || ''}
                              onChange={(e) => handleInlineTimeChange(`${p.id}_in`, e.target.value)}
                            />
                            <Clock size={14} style={{ color: '#3b82f6', flexShrink: 0 }} />
                          </>
                        ) : (p.type === 'دخول' && !p.isVirtual) ? (
                          <>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13, textAlign: 'center', width: 50, padding: 0 }}>{p.time}</div>
                            <Clock size={14} style={{ color: '#3b82f6', flexShrink: 0 }} />
                          </>
                        ) : (
                          <>
                            <div style={{ fontWeight: 700, color: p.attendanceRecord?.timeIn ? '#0f172a' : '#cbd5e1', fontSize: 13, textAlign: 'center', width: 50, padding: 0 }}>{p.attendanceRecord?.timeIn || '--:--'}</div>
                            <Clock size={14} style={{ color: p.attendanceRecord?.timeIn ? '#3b82f6' : '#e2e8f0', flexShrink: 0 }} />
                          </>
                        )}
                      </div>
                    </td>

                    {/* Check-out Time */}
                    <td className="p-4 font-bold whitespace-nowrap text-center" dir="ltr">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {(p.type === 'خروج' || p.reason === 'بصمة دخول وخروج') && p.isVirtual && (p.status === 'معلق' || p.status === 'قيد المراجعة') ? (
                          <>
                            <input
                              type="time"
                              className="premium-time-input"
                              style={{ width: 85, height: 28, fontSize: 13 }}
                              value={inlineTimes[`${p.id}_out`] || ''}
                              onChange={(e) => handleInlineTimeChange(`${p.id}_out`, e.target.value)}
                            />
                            <Clock size={14} style={{ color: '#3b82f6', flexShrink: 0 }} />
                          </>
                        ) : (p.type === 'خروج' && !p.isVirtual) ? (
                          <>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13, textAlign: 'center', width: 50, padding: 0 }}>{p.time}</div>
                            <Clock size={14} style={{ color: '#3b82f6', flexShrink: 0 }} />
                          </>
                        ) : (
                          <>
                            <div style={{ fontWeight: 700, color: p.attendanceRecord?.timeOut ? '#0f172a' : '#cbd5e1', fontSize: 13, textAlign: 'center', width: 50, padding: 0 }}>{p.attendanceRecord?.timeOut || '--:--'}</div>
                            <Clock size={14} style={{ color: p.attendanceRecord?.timeOut ? '#3b82f6' : '#e2e8f0', flexShrink: 0 }} />
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600">{p.reason}</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${p.status === 'موافق عليه' ? 'bg-green-100 text-green-700' :
                            p.status === 'مرفوض' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                          }`}>
                          {p.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 justify-center items-center flex-nowrap">
                        <button onClick={() => handlePreviewPunch(p)} className="icon-btn shrink-0" style={{ color: '#0ea5e9', background: '#f0f9ff', borderColor: '#bae6fd' }} title="معاينة الطلب">
                          <Eye size={18} strokeWidth={2} />
                        </button>
                        {p.status === 'معلق' || p.status === 'قيد المراجعة' ? (
                          p.isVirtual ? (
                            <div className="flex items-center gap-2 flex-nowrap">
                              <button
                                onClick={() => handleDropdownAction(p, 'time')}
                                className="btn btn-primary shrink-0"
                                style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Check size={14} /> حفظ الدوام
                              </button>
                              <select
                                className="text-xs font-bold border border-slate-200 bg-white text-slate-700 focus:outline-none cursor-pointer shadow-sm transition-all shrink-0"
                                style={{ padding: '7px 12px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', width: '180px' }}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  e.target.value = "";
                                  handleDropdownAction(p, val);
                                }}
                                defaultValue=""
                              >
                                <option value="" disabled>-- إجراءات أخرى --</option>
                                {p.type === 'خروج' && <option value="early">تسجيل كمغادرة مبكرة</option>}

                                {(emp?.allowedLeaveTypes || ['إجازة سنوية', 'إجازة مرضية', 'مغادرة خاصة', 'مغادرة عمل', 'إجازة غير مدفوعة', 'بدل عمل إضافي']).includes('إجازة سنوية') && (
                                  <option value="vacation">خصم إجازة سنوية (الرصيد: {emp?.vacationBalance ?? 14})</option>
                                )}

                                {(emp?.allowedLeaveTypes || ['إجازة سنوية', 'إجازة مرضية', 'مغادرة خاصة', 'مغادرة عمل', 'إجازة غير مدفوعة', 'بدل عمل إضافي']).includes('إجازة مرضية') && (
                                  <option value="sick">خصم إجازة مرضية (الرصيد: {emp?.sickLeaveBalance ?? 14})</option>
                                )}

                                {(emp?.allowedLeaveTypes || ['إجازة سنوية', 'إجازة مرضية', 'مغادرة خاصة', 'مغادرة عمل', 'إجازة غير مدفوعة', 'بدل عمل إضافي']).includes('إجازة غير مدفوعة') && (
                                  <option value="unpaid">إجازة غير مدفوعة</option>
                                )}

                                <option value="violation">تسجيل مخالفة مالية</option>
                              </select>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-nowrap">
                              <button onClick={() => handleUpdateStatus(p, 'موافق عليه')} className="icon-btn icon-btn-success shrink-0" title="موافقة">
                                <Check size={18} strokeWidth={2.5} />
                              </button>
                              <button onClick={() => handleUpdateStatus(p, 'مرفوض')} className="icon-btn icon-btn-delete shrink-0" title="رفض">
                                <X size={18} strokeWidth={2.5} />
                              </button>
                              <button onClick={() => handleDelete(p.id)} className="icon-btn icon-btn-delete shrink-0" title="حذف الطلب">
                                <Trash2 size={18} strokeWidth={2.5} />
                              </button>
                              {isExhausted && (
                                <button onClick={() => handleRegisterViolation(p)} className="shrink-0" style={{ background: '#1a8d9b', color: 'white', padding: '6px 16px', borderRadius: '50px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', whiteSpace: 'nowrap' }} title="تحويل لمخالفة مالية (تجاوز الحد المسموح)">
                                  تسجيل مخالفة
                                </button>
                              )}
                            </div>
                          )
                        ) : (
                          <div className="flex items-center gap-2 flex-nowrap">
                            <span className="text-xs text-slate-400 whitespace-nowrap">({p.approvedBy || '-'})</span>
                            {!p.isVirtual && (
                              <button onClick={() => handleUpdateStatus(p, 'معلق')} className="icon-btn icon-btn-warning shrink-0" title="تراجع عن القرار">
                                <Undo2 size={16} strokeWidth={2.5} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Missing Punch Modal */}
      <div
        className="modal-overlay"
        style={{ zIndex: 10500, display: showAddModal ? 'flex' : 'none' }}
      >
        <div className="modal-content animate-fade-in" style={{ maxWidth: '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
          <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Fingerprint className="text-primary" size={20} /> طلب ختمة ناقصة
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
                  <Flatpickr
                    className="input-field w-full bg-white"
                    value={newPunch.time}
                    onChange={([d]) => setNewPunch({ ...newPunch, time: d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '' })}
                    options={{ enableTime: true, noCalendar: true, dateFormat: "h:i K", locale: Arabic, disableMobile: true }}
                    placeholder="اختر الوقت"
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
                <button type="submit" className="btn btn-primary">إرسال الطلب</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRMissingPunches;
