import { isActiveEmployee } from '../../utils/employeeStatus';
import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, XCircle, FileText, Calendar, Filter, X, ArrowUpDown, ArrowUp, ArrowDown, Plus, Check, Undo2, Trash2, Eye, ChevronDown, ChevronUp, User } from 'lucide-react';
import Select from '../../components/SearchSelect';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/airbnb.css';
import { getEmployees, getHRLeaves, getHRLeavesByDateRange, saveHRLeave, deleteHRLeave, getMissingPunches, getMissingPunchesByDateRange, updateMissingPunchStatus, deleteMissingPunch, saveHRAttendance, createNotification, getGlobalSettings, saveEmployee } from '../../store';
import Swal from 'sweetalert2';
import { sendWhatsAppNotification } from '../../utils/whatsappService';
import HRDateFilter from '../../components/ui/HRDateFilter';
import { hasPermission } from '../../utils/permissions';

const getLocalDateStr = (d) => {
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().split('T')[0];
};

const HRLeaves = ({ user, refreshCounts }) => {
  const canAdd = hasPermission(user, 'hr_leaves', 'add') || hasPermission(user, 'hr_leaves', 'create');
  const canEdit = hasPermission(user, 'hr_leaves', 'edit');
  const canApprove = hasPermission(user, 'hr_leaves', 'approve');
  const canDelete = hasPermission(user, 'hr_leaves', 'delete');

  const [leaves, setLeaves] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [missingPunches, setMissingPunches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'إجازة سنوية',
    startDate: '',
    endDate: '',
    date: '',
    startTime: '',
    endTime: '',
    notes: '',
    status: 'معلق'
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterStatus, setFilterStatus] = useState('معلق');
  const [filterType, setFilterType] = useState('الكل');
  const [settings, setSettings] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [dateMode, setDateMode] = useState('month');
  const [selectedDate, setSelectedDate] = useState(getLocalDateStr(new Date()));
  const [startDate, setStartDate] = useState(getLocalDateStr(new Date()));
  const [endDate, setEndDate] = useState(getLocalDateStr(new Date()));

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

  const fetchData = async () => {
    setLoading(true);
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

    const [leavesData, empsData, mpData, settingsData] = await Promise.all([
      from && to ? getHRLeavesByDateRange(from, to) : getHRLeaves(),
      employees.length === 0 ? getEmployees() : Promise.resolve(employees),
      from && to ? getMissingPunchesByDateRange(from, to) : getMissingPunches(),
      settings ? Promise.resolve(settings) : getGlobalSettings()
    ]);
    setLeaves(leavesData || []);
    if (employees.length === 0) setEmployees(empsData || []);
    setMissingPunches(mpData || []);
    if (!settings) setSettings(settingsData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [dateMode, selectedMonth, selectedDate, startDate, endDate]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canAdd && !canEdit) {
      Swal.fire('غير مصرح', 'حسابك في وضع المعاينة فقط، ليس لديك صلاحية لإضافة أو تعديل الطلبات.', 'warning');
      return;
    }
    if (!formData.notes || formData.notes.trim() === '') {
      Swal.fire('تنبيه', 'الرجاء إدخال السبب / الملاحظات', 'warning');
      return;
    }
    const isDept = ['مغادرة خاصة', 'مغادرة عمل', 'مغادرة الدخان'].includes(formData.type);
    if (isDept) {
      if (!formData.date || !formData.startTime || !formData.endTime) {
        Swal.fire('تنبيه', 'يرجى تحديد تاريخ ووقت البداية والنهاية', 'warning');
        return;
      }
      if (formData.startTime >= formData.endTime) {
        Swal.fire('خطأ', 'لا يمكن أن يكون وقت النهاية قبل أو يساوي وقت البداية. يجب أن يكون نطاق الطلب خلال يوم واحد فقط.', 'error');
        return;
      }

      const [sHours, sMins] = formData.startTime.split(':').map(Number);
      const [eHours, eMins] = formData.endTime.split(':').map(Number);
      const diffMins = (eHours * 60 + eMins) - (sHours * 60 + sMins);

      if (diffMins > 240) {
        Swal.fire('خطأ', 'يوجد مشكلة بالوقت المدخل', 'error');
        return;
      }
    } else {
      if (!formData.startDate || !formData.endDate) {
        Swal.fire('تنبيه', 'الرجاء إدخال تاريخ البداية والنهاية للطلب', 'warning');
        return;
      }
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        Swal.fire('خطأ', 'لا يمكن أن يكون تاريخ النهاية قبل تاريخ البداية', 'error');
        return;
      }
    }
    const emp = employees.find(e => String(e.id || '').trim() === String(formData.employeeId || '').trim());
    if (!emp) {
      Swal.fire('خطأ', 'الرجاء اختيار موظف', 'error');
      return;
    }

    await saveHRLeave({
      ...formData,
      employeeName: emp.name,
      department: emp.department || 'غير محدد'
    });

    Swal.fire('نجاح', 'تم تسجيل الطلب بنجاح', 'success');
    setShowModal(false);
    fetchData();
  };

  const handleStatusChange = async (leave, newStatus) => {
    if (!canApprove) {
      Swal.fire('غير مصرح', 'حسابك في وضع المعاينة فقط، ليس لديك صلاحية لاعتماد أو رفض الطلبات.', 'warning');
      return;
    }
    let actionReason = '';
    if (newStatus === 'موافق' || newStatus === 'مرفوض') {
      let extraHtml = '';
      if (newStatus === 'موافق') {
        const emp = employees.find(e => String(e.id || '').trim() === String(leave.employeeId || '').trim());
        const vacBal = emp?.vacationBalance !== undefined ? emp.vacationBalance : 'غير محدد';
        const isDept = ['مغادرة خاصة', 'مغادرة عمل', 'مغادرة الدخان'].includes(leave.type);
        const targetDate = leave.date || leave.startDate;
        const targetMonth = targetDate ? targetDate.substring(0, 7) : '';

        extraHtml += `<div style="text-align: right; margin-bottom: 15px; font-size: 15px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">`;
        extraHtml += `<div style="color: #059669; font-weight: bold; margin-bottom: 8px;">📌 الرصيد المتبقي للإجازات السنوية: ${vacBal} يوم</div>`;

        if (leave.type === 'إجازة غير مدفوعة' && targetMonth) {
          const unpaidCount = leaves.filter(l =>
            String(l.employeeId) === String(leave.employeeId) &&
            l.type === 'إجازة غير مدفوعة' &&
            l.status === 'موافق' &&
            (l.date || l.startDate || '').startsWith(targetMonth)
          ).length;
          extraHtml += `<div style="color: #e11d48; font-weight: bold; font-size: 14px;">⚠️ تنبيه: أخذ إجازة غير مدفوعة ${unpaidCount} مرات هذا الشهر (${targetMonth})</div>`;
        } else if (isDept && targetMonth) {
          const deptCount = leaves.filter(l =>
            String(l.employeeId) === String(leave.employeeId) &&
            ['مغادرة خاصة', 'مغادرة عمل', 'مغادرة الدخان'].includes(l.type) &&
            l.status === 'موافق' &&
            (l.date || l.startDate || '').startsWith(targetMonth)
          ).length;
          extraHtml += `<div style="color: #d97706; font-weight: bold; font-size: 14px;">⚠️ تنبيه: أخذ مغادرات ${deptCount} مرات هذا الشهر (${targetMonth})</div>`;
        }
        extraHtml += `</div>`;
      }

      const { value, isDismissed } = await Swal.fire({
        title: newStatus === 'موافق' ? 'تأكيد الموافقة' : 'سبب الرفض',
        html: extraHtml,
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

      if (newStatus === 'موافق') {
        const isDept = ['مغادرة خاصة', 'مغادرة عمل', 'مغادرة الدخان'].includes(leave.type);
        const dateToSave = leave.date || leave.startDate;

        await saveHRAttendance({
          employeeId: leave.employeeId,
          employeeName: leave.employeeName,
          date: dateToSave,
          type: leave.type,
          time: isDept ? `${leave.startTime} - ${leave.endTime}` : 'يوم كامل',
          notes: `طلب معتمد (${leave.type}): ${leave.notes || 'بدون ملاحظات'}`,
          isLeave: true
        });

        // Deduct from balance
        if (!isDept) {
          const empToUpdate = employees.find(e => String(e.id || '').trim() === String(leave.employeeId || '').trim());
          if (empToUpdate) {
            let days = 1;
            if (leave.startDate && leave.endDate) {
              const d1 = new Date(leave.startDate);
              const d2 = new Date(leave.endDate);
              days = Math.max(1, Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
            } else if (leave.days || leave.daysCount) {
              days = Number(leave.days || leave.daysCount) || 1;
            }

            if (days > 0) {
              let updated = false;
              if (leave.type === 'إجازة سنوية') {
                empToUpdate.vacationBalance = Math.max(0, (empToUpdate.vacationBalance || 0) - days);
                updated = true;
              } else if (leave.type === 'إجازة مرضية') {
                empToUpdate.sickLeaveBalance = Math.max(0, (empToUpdate.sickLeaveBalance || 0) - days);
                updated = true;
              }
              if (updated) {
                await saveEmployee(empToUpdate);
              }
            }
          }
        }
      } else if ((newStatus === 'مرفوض' || newStatus === 'معلق') && leave.status === 'موافق') {
        const isDept = ['مغادرة خاصة', 'مغادرة عمل', 'إذن تأخير', 'خروج مبكر', 'مغادرة الدخان'].includes(leave.type);

        // Refund balance
        if (!isDept) {
          const empToUpdate = employees.find(e => String(e.id || '').trim() === String(leave.employeeId || '').trim());
          if (empToUpdate) {
            let days = 1;
            if (leave.startDate && leave.endDate) {
              const d1 = new Date(leave.startDate);
              const d2 = new Date(leave.endDate);
              days = Math.max(1, Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
            } else if (leave.days || leave.daysCount) {
              days = Number(leave.days || leave.daysCount) || 1;
            }

            if (days > 0) {
              let updated = false;
              if (leave.type === 'إجازة سنوية') {
                empToUpdate.vacationBalance = (empToUpdate.vacationBalance || 0) + days;
                updated = true;
              } else if (leave.type === 'إجازة مرضية') {
                empToUpdate.sickLeaveBalance = (empToUpdate.sickLeaveBalance || 0) + days;
                updated = true;
              }
              if (updated) {
                await saveEmployee(empToUpdate);
              }
            }
          }
        }
      }

      if (newStatus === 'موافق' || newStatus === 'مرفوض') {
        const globalSettings = await getGlobalSettings();
        const settingKey = ['مغادرة خاصة', 'مغادرة عمل', 'خروج مبكر', 'مغادرة الدخان'].includes(leave.type) ? 'earlyLeave' : 'leaves';
        const modSettings = globalSettings?.notifications?.[settingKey] || {};

        if (modSettings.whatsapp) {
          try {
            const emp = employees.find(e => String(e.id || '').trim() === String(leave.employeeId || '').trim() || String(e.name || '').trim() === String(leave.employeeName || '').trim());
            if (emp && emp.phone) {
              const actionText = newStatus === 'موافق' ? 'الموافقة على' : 'رفض';
              let msg = `مرحباً ${emp.name}،\nتم ${actionText} ${leave.type} الخاصة بك.`;
              if (actionReason) msg += `\nالملاحظات: ${actionReason}`;
              msg += `\n-- الإدارة`;
              await sendWhatsAppNotification(emp.phone, msg, 'leave_requests');
            }
          } catch (err) { console.error('WhatsApp Error:', err); }
        }

        await createNotification({
          settingKey,
          targetEmployeeId: leave.employeeId,
          moduleKey: 'hr',
          moduleLabel: 'الموارد البشرية',
          title: newStatus === 'موافق' ? 'تمت الموافقة على طلبك' : 'تم رفض طلبك',
          message: `تم ${newStatus === 'موافق' ? 'قبول' : 'رفض'} طلب ${leave.type} الخاص بك.${newStatus === 'مرفوض' && actionReason ? `\nالسبب: ${actionReason}` : ''}`,
          target: { tab: 'leaves' },
          skipWhatsApp: true
        });
      }

      setLeaves(prev => prev.filter(l => l.id !== leave.id));
      await fetchData();
      if (refreshCounts) refreshCounts();
      Swal.fire('نجاح', `تم ${newStatus === 'موافق' ? 'قبول' : (newStatus === 'مرفوض' ? 'رفض' : 'تحديث')} الطلب بنجاح`, 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('خطأ', 'حدث خطأ أثناء تحديث حالة الطلب', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      Swal.fire('غير مصرح', 'حسابك في وضع المعاينة فقط، ليس لديك صلاحية لحذف الطلبات.', 'warning');
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
        Swal.fire('نجاح', 'تم حذف الطلب بنجاح', 'success');
      } catch (error) {
        console.error(error);
        Swal.fire('خطأ', 'حدث خطأ أثناء الحذف', 'error');
      }
    }
  };

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

  const handlePreviewLeave = (leave) => {
    const emp = employees.find(e => String(e.id || '').trim() === String(leave.employeeId || '').trim());
    const isDept = ['مغادرة خاصة', 'مغادرة عمل', 'إذن تأخير', 'خروج مبكر', 'مغادرة الدخان'].includes(leave.type);
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
        <tr><th>القسم</th><td>${formatDepartmentName(emp?.department || leave.department)}</td></tr>
        <tr><th>نوع الطلب</th><td><span style="color:var(--primary); font-weight:bold;">${leave.type}</span></td></tr>
    `;
    if (isDept && (leave.startTime || leave.endTime)) {
      htmlContent += `<tr><th>التاريخ</th><td>${leave.date || leave.startDate || '-'}</td></tr>`;
      htmlContent += `<tr><th>من الساعة</th><td>${leave.startTime || '-'}</td></tr>`;
      htmlContent += `<tr><th>إلى الساعة</th><td>${leave.endTime || '-'}</td></tr>`;
    } else if (leave.startDate && leave.endDate && leave.startDate !== leave.endDate) {
      htmlContent += `<tr><th>من تاريخ</th><td>${leave.startDate || '-'}</td></tr>`;
      htmlContent += `<tr><th>إلى تاريخ</th><td>${leave.endDate || '-'}</td></tr>`;
    } else {
      htmlContent += `<tr><th>التاريخ</th><td>${leave.date || leave.startDate || leave.endDate || '-'}</td></tr>`;
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

  const handleDeleteMp = async (id) => {
    const res = await Swal.fire({
      title: 'هل أنت متأكد؟',
      text: 'لن تتمكن من التراجع عن الحذف',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    });
    if (res.isConfirmed) {
      await deleteMissingPunch(id);
      fetchData();
    }
  };

  const handleMpStatusChange = async (id, newStatus, punchData) => {
    await updateMissingPunchStatus(id, newStatus, user?.name || 'المدير', punchData);
    fetchData();
  };

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

  const baseLeaves = [...leaves].filter(l => {
    if (searchTerm && String(l.employeeId) !== String(searchTerm)) return false;
    if (l.type === 'بدل عمل إضافي' || l.type === 'عمل إضافي') return false;

    const reqDate = l.createdAt ? new Date(l.createdAt).toISOString().split('T')[0] : '';
    const reqMonth = reqDate ? reqDate.slice(0, 7) : '';

    if (dateMode === 'day' && reqDate !== selectedDate) return false;
    if (dateMode === 'month' && reqMonth !== selectedMonth) return false;
    if (dateMode === 'range' && (reqDate < startDate || reqDate > endDate)) return false;
    return true;
  });

  const totalCount = baseLeaves.length;
  const pendingCount = baseLeaves.filter(l => l.status === 'معلق' || l.status === 'قيد المراجعة').length;
  const approvedCount = baseLeaves.filter(l => l.status === 'موافق' || l.status === 'مقبول').length;
  const rejectedCount = baseLeaves.filter(l => l.status === 'مرفوض').length;

  const leaveRequests = baseLeaves.filter(l => {
    if (filterStatus !== 'الكل') {
      if (filterStatus === 'معلق' && l.status !== 'معلق' && l.status !== 'قيد المراجعة') return false;
      if (filterStatus === 'موافق' && l.status !== 'موافق' && l.status !== 'مقبول') return false;
      if (filterStatus === 'مرفوض' && l.status !== 'مرفوض') return false;
    }
    if (filterType !== 'الكل' && l.type !== filterType) return false;
    return true;
  }).sort((a, b) => {
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

  const getLeaveCost = (l, emp) => {
    const basicSalary = Number(emp?.basicSalary) || 0;

    const targetDate = l.date || l.startDate || new Date().toISOString().split('T')[0];
    const yStr = targetDate.substring(0, 4);
    const mStr = targetDate.substring(5, 7);
    const daysInMonth = new Date(parseInt(yStr, 10), parseInt(mStr, 10), 0).getDate();

    let workDays = settings?.hrSettings?.workDaysPerMonth || daysInMonth;
    if (settings?.hrSettings?.workDaysStrategy === 'actual' || !settings?.hrSettings?.workDaysStrategy) {
      workDays = daysInMonth;
    } else if (settings?.hrSettings?.workDaysStrategy === 'custom' && settings?.hrSettings?.customWorkDays) {
      const mIndex = parseInt(mStr, 10) - 1;
      if (!isNaN(mIndex) && settings?.hrSettings?.customWorkDays[mIndex]) {
        workDays = settings?.hrSettings?.customWorkDays[mIndex];
      }
    }

    let empStandardWorkHours = settings?.hrSettings?.standardWorkHours || 8;
    if (emp?.shiftStart && emp?.shiftEnd) {
      const [sh, sm] = emp.shiftStart.split(':').map(Number);
      const [eh, em] = emp.shiftEnd.split(':').map(Number);
      if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
        let mins = (eh * 60 + em) - (sh * 60 + sm);
        if (mins < 0) mins += 24 * 60;
        empStandardWorkHours = mins / 60;
        if (empStandardWorkHours <= 0) empStandardWorkHours = settings?.hrSettings?.standardWorkHours || 8;
      }
    }

    const dailyRate = basicSalary / workDays;
    const hourlyRate = dailyRate / empStandardWorkHours;
    const minuteRate = hourlyRate / 60;

    let cost = 0;
    let durationStr = '';
    let days = 0;

    if (l.type === 'إجازة غير مدفوعة') {
      if (l.startDate && l.endDate) {
        const d1 = new Date(l.startDate);
        const d2 = new Date(l.endDate);
        days = Math.max(1, Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
      } else if (l.days || l.daysCount) {
        days = Number(l.days || l.daysCount) || 1;
      } else if (l.date || l.startDate || l.endDate) {
        days = 1;
      }

      if (days > 0) {
        if (settings?.hrSettings?.absenceHandling === 'work_hours') {
          cost = days * (empStandardWorkHours * hourlyRate);
        } else {
          cost = days * dailyRate;
        }
        durationStr = `${days} ${days === 1 ? 'يوم' : days === 2 ? 'يومان' : 'أيام'}`;
      }
    } else if (['مغادرة خاصة', 'مغادرة عمل', 'مغادرة الدخان'].includes(l.type)) {
      if (l.startTime && l.endTime) {
        const [sh, sm] = l.startTime.split(':').map(Number);
        const [eh, em] = l.endTime.split(':').map(Number);
        const mins = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
        cost = mins * minuteRate;
        durationStr = `${Math.floor(mins / 60)}س ${mins % 60}د`;
      }
    }
    return { cost, durationStr, days };
  };

  let totalUnpaidDays = 0;
  let totalUnpaidCost = 0;
  let totalDepartureMins = 0;
  let totalDepartureCost = 0;

  leaveRequests.forEach(l => {
    const emp = employees.find(e => String(e.id) === String(l.employeeId));
    const res = getLeaveCost(l, emp);

    if (l.type === 'إجازة غير مدفوعة') {
      totalUnpaidDays += res.days || 0;
      totalUnpaidCost += res.cost;
    } else if (['مغادرة خاصة', 'مغادرة عمل', 'مغادرة الدخان'].includes(l.type)) {
      if (l.startTime && l.endTime) {
        const [sh, sm] = l.startTime.split(':').map(Number);
        const [eh, em] = l.endTime.split(':').map(Number);
        totalDepartureMins += Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
        totalDepartureCost += res.cost;
      }
    }
  });

  const formatMins = (totalMins) => {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h}س ${m}د`;
  };

  return (
    <>
      <div className="glass-card flex flex-col min-h-[500px] animate-fade-in">
        <div className="border-b pb-4 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="text-primary" /> الإجازات والمغادرات
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <span style={{ background: '#f8fafc', color: '#475569', padding: '6px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 'bold', border: '1px solid #e2e8f0' }}>
                عدد الطلبات: {leaveRequests.length}
              </span>
              {totalUnpaidDays > 0 && (
                <span style={{ background: '#fff1f2', color: '#e11d48', padding: '6px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 'bold', border: '1px solid #ffe4e6' }}>
                  الإجازات غير المدفوعة: {totalUnpaidDays} أيام (قيمة الخصم: {totalUnpaidCost.toFixed(2)} د.أ)
                </span>
              )}
              {totalDepartureMins > 0 && (
                <span style={{ background: '#fffbeb', color: '#d97706', padding: '6px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 'bold', border: '1px solid #fde68a' }}>
                  المغادرات: {formatMins(totalDepartureMins)} (قيمة الخصم: {totalDepartureCost.toFixed(2)} د.أ)
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-center w-full">
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

            {/* Type Filter */}
            <div style={{ width: '180px', minWidth: '180px', flexShrink: 0 }}>
              <Select
                options={[
                  { value: 'الكل', label: 'الكل (نوع الطلب)' },
                  { value: 'إجازة سنوية', label: 'إجازة سنوية' },
                  { value: 'إجازة غير مدفوعة', label: 'إجازة غير مدفوعة' },
                  { value: 'إجازة مرضية', label: 'إجازة مرضية' },
                  { value: 'مغادرة خاصة', label: 'مغادرة خاصة' },
                  { value: 'مغادرة عمل', label: 'مغادرة عمل' },
                  { value: 'مغادرة الدخان', label: 'مغادرة الدخان' }
                ]}
                value={{ value: filterType, label: filterType === 'الكل' ? 'الكل (نوع الطلب)' : filterType }}
                onChange={(opt) => setFilterType(opt.value)}
                styles={{ ...customSelectStyles, control: (base) => ({ ...base, height: '42px', minHeight: '42px', borderRadius: '10px', border: '1px solid #e2e8f0' }) }}
              />
            </div>

            {/* Employee ID */}
            <div style={{ width: '180px', minWidth: '180px', flexShrink: 0 }}>
              <Select
                options={employeeIdOptions}
                value={employeeIdOptions.find(opt => opt.value === searchTerm) || null}
                onChange={(selected) => setSearchTerm(selected ? selected.value : '')}
                styles={{ ...customSelectStyles, control: (base) => ({ ...base, height: '42px', minHeight: '42px', borderRadius: '10px', border: '1px solid #e2e8f0' }) }}
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
                styles={{ ...customSelectStyles, control: (base) => ({ ...base, height: '42px', minHeight: '42px', borderRadius: '10px', border: '1px solid #e2e8f0', paddingLeft: '24px' }) }}
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
                  setFormData({ employeeId: '', type: 'إجازة سنوية', startDate: '', endDate: '', notes: '', status: 'معلق' });
                  setShowModal(true);
                }}
                className="premium-add-btn flex items-center gap-2 whitespace-nowrap h-[42px]"
              >
                <Plus size={18} /> تقديم طلب جديد
              </button>
            )}
          </div>
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
              <Calendar size={28} strokeWidth={2} />
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
        </div>

        <div className="table-responsive bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-500">
              <tr>
                <th className="p-5 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 text-center" onClick={() => handleSort('createdAt')}>
                  <div className="flex items-center justify-center gap-1">تاريخ الطلب {renderSortIcon('createdAt')}</div>
                </th>
                <th className="p-5 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 text-center" onClick={() => handleSort('employeeName')}>
                  <div className="flex items-center justify-center gap-1">الموظف {renderSortIcon('employeeName')}</div>
                </th>
                <th className="p-5 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 text-center" onClick={() => handleSort('department')}>
                  <div className="flex items-center justify-center gap-1">القسم {renderSortIcon('department')}</div>
                </th>
                <th className="p-5 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 text-center" onClick={() => handleSort('type')}>
                  <div className="flex items-center justify-center gap-1">نوع الطلب {renderSortIcon('type')}</div>
                </th>
                <th className="p-5 font-bold whitespace-nowrap text-center">من - إلى</th>
                <th className="p-5 font-bold whitespace-nowrap text-center">القيمة المالية</th>
                <th className="p-5 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 text-center" onClick={() => handleSort('status')}>
                  <div className="flex items-center justify-center gap-1">الحالة {renderSortIcon('status')}</div>
                </th>
                <th className="p-5 font-bold whitespace-nowrap text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {leaveRequests.map((leave) => {
                const emp = employees.find(e => String(e.id || '').trim() === String(leave.employeeId || '').trim());
                let dotClass = "bg-slate-400";
                let textClass = "text-slate-600";
                if (leave.status === 'معلق' || leave.status === 'قيد المراجعة') {
                  dotClass = "bg-amber-400";
                  textClass = "text-[#0f766e]";
                } else if (leave.status === 'موافق' || leave.status === 'مقبول') {
                  dotClass = "bg-emerald-400";
                  textClass = "text-emerald-700";
                } else if (leave.status === 'مرفوض') {
                  dotClass = "bg-red-400";
                  textClass = "text-red-700";
                }

                return (
                  <tr key={leave.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-5 whitespace-nowrap text-slate-800 font-bold text-sm text-center">
                      <span>{new Date(leave.createdAt).toLocaleDateString('en-GB')}</span>
                    </td>
                    <td className="p-5 font-bold text-slate-800 whitespace-nowrap text-center">
                      {leave.employeeName}
                    </td>
                    <td className="p-5 text-sm text-slate-600 font-bold text-center">
                      {formatDepartmentName(emp?.department || leave.department)}
                    </td>
                    <td className="p-5 text-sm text-slate-800 font-bold text-center">
                      {leave.type}
                    </td>

                    <td className="p-5 text-muted text-sm text-center">
                      {leave.startTime && leave.endTime ? (
                        <div className="flex flex-col items-center justify-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-bold text-slate-800 text-xs" dir="ltr">{leave.date || leave.startDate}</span>
                            <Calendar size={14} className="text-[#0f766e]" />
                          </div>
                          <span className="font-bold text-xs mt-1 text-[#0f766e]" dir="rtl">
                            من {leave.startTime} إلى {leave.endTime}
                          </span>
                        </div>
                      ) : leave.startDate && leave.endDate && leave.startDate !== leave.endDate ? (
                        <div className="flex flex-col items-center justify-center">
                          <span className="font-bold text-xs text-slate-800" dir="rtl">
                            من <span className="font-mono" dir="ltr">{leave.startDate}</span>
                          </span>
                          <span className="font-bold text-xs mt-1 text-slate-800" dir="rtl">
                            إلى <span className="font-mono" dir="ltr">{leave.endDate}</span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-bold text-slate-800 text-xs font-mono" dir="ltr">
                              {leave.date || leave.startDate || leave.endDate}
                            </span>
                            <Calendar size={14} className="text-[#0f766e]" />
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="p-5 text-sm font-bold text-center">
                      {(() => {
                        const res = getLeaveCost(leave, emp);
                        if (res.cost > 0) {
                          return (
                            <div className="flex flex-col items-center justify-center">
                              <span className="text-rose-600 font-bold">{res.cost.toFixed(2)} د.أ</span>
                              <span className="text-xs text-slate-500 mt-1">{res.durationStr}</span>
                            </div>
                          );
                        }
                        return <span className="text-slate-400">-</span>;
                      })()}
                    </td>

                    <td className="p-5 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${dotClass}`}></span>
                        <span className={`text-xs font-bold ${textClass}`}>{leave.status}</span>
                      </div>
                    </td>

                    <td className="p-5">
                      <div className="flex justify-center items-center gap-2">
                        <button onClick={() => handlePreviewLeave(leave)} className="flex items-center justify-center transition-all hover:scale-105" style={{ color: '#0ea5e9', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '14px', width: '36px', height: '36px' }} title="معاينة الطلب">
                          <Eye size={18} strokeWidth={2} />
                        </button>
                        {canApprove && (
                          leave.status === 'معلق' ? (
                            <>
                              <button onClick={() => handleStatusChange(leave, 'موافق')} className="flex items-center justify-center transition-all hover:scale-105" style={{ color: '#10b981', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '14px', width: '36px', height: '36px' }} title="موافقة">
                                <Check size={18} strokeWidth={2.5} />
                              </button>
                              <button onClick={() => handleStatusChange(leave, 'مرفوض')} className="flex items-center justify-center transition-all hover:scale-105" style={{ color: '#ef4444', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '14px', width: '36px', height: '36px' }} title="رفض">
                                <X size={18} strokeWidth={2.5} />
                              </button>
                            </>
                          ) : (
                            <button onClick={() => handleStatusChange(leave, 'معلق')} className="flex items-center justify-center transition-all hover:scale-105" style={{ color: '#f59e0b', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '14px', width: '36px', height: '36px' }} title="تراجع عن القرار">
                              <Undo2 size={18} strokeWidth={2} />
                            </button>
                          )
                        )}
                        {canDelete && (
                          <button onClick={() => handleDelete(leave.id)} className="flex items-center justify-center transition-all hover:scale-105" style={{ color: '#ef4444', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '14px', width: '36px', height: '36px' }} title="حذف">
                            <Trash2 size={18} strokeWidth={2} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {leaveRequests.length === 0 && (
                <tr><td colSpan="8" className="p-8 text-center text-slate-500 font-bold">لا توجد طلبات مطابقة</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* Add Modal */}
      {showModal && (() => {
        const selectedEmp = employees.find(e => String(e.id || '').trim() === String(formData.employeeId || '').trim());
        const defaultAllowed = ['إجازة سنوية', 'إجازة مرضية', 'مغادرة خاصة', 'مغادرة عمل', 'إذن تأخير', 'خروج مبكر', 'إجازة غير مدفوعة', 'مغادرة الدخان'];
        const allowedTypes = (selectedEmp?.allowedLeaveTypes || defaultAllowed).filter(t => t !== 'بدل عمل إضافي');

        return (
          <div className="modal-overlay" style={{ zIndex: 10500 }}>
            <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
                <h3 className="font-bold text-lg text-slate-800">تقديم طلب إجازة / مغادرة</h3>
                <button type="button" onClick={() => setShowModal(false)} className="icon-btn hover:bg-gray-100 rounded-full p-2 transition-colors">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
                <div className="p-5" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flexGrow: 1 }}>
                  <div className="input-group">
                    <label>الموظف</label>
                    <select required value={formData.employeeId} onChange={e => {
                      const empId = e.target.value;
                      const emp = employees.find(e => String(e.id) === String(empId));
                      const defaultTypes = ['إجازة سنوية', 'إجازة مرضية', 'مغادرة خاصة', 'مغادرة عمل', 'إجازة غير مدفوعة', 'مغادرة الدخان'];
                      const aTypes = (emp?.allowedLeaveTypes || defaultTypes).filter(t => t !== 'بدل عمل إضافي');

                      setFormData({
                        ...formData,
                        employeeId: empId,
                        type: aTypes.length > 0 ? aTypes[0] : ''
                      });
                    }} className="input-field">
                      <option value="">-- اختر الموظف --</option>
                      {employees.filter(isActiveEmployee).map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>نوع الطلب</label>
                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="input-field" disabled={!formData.employeeId} required>
                      {!formData.employeeId && <option value="">-- يرجى اختيار الموظف أولاً --</option>}
                      {formData.employeeId && allowedTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  {['مغادرة خاصة', 'مغادرة عمل', 'مغادرة الدخان'].includes(formData.type) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="input-group">
                        <label>تاريخ المغادرة</label>
                        <Flatpickr
                          value={formData.date}
                          onChange={(dates, dateStr) => setFormData({ ...formData, date: dateStr })}
                          className="input-field"
                          options={{ dateFormat: 'Y-m-d' }}
                          placeholder="اختر التاريخ"
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="input-group">
                          <label>من الساعة</label>
                          <input type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} className="input-field" required />
                        </div>
                        <div className="input-group">
                          <label>إلى الساعة</label>
                          <input type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} className="input-field" required />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="input-group">
                        <label>من تاريخ</label>
                        <Flatpickr
                          value={formData.startDate}
                          onChange={(dates, dateStr) => setFormData({ ...formData, startDate: dateStr })}
                          className="input-field"
                          options={{ dateFormat: 'Y-m-d' }}
                          placeholder="اختر التاريخ"
                        />
                      </div>
                      <div className="input-group">
                        <label>إلى تاريخ</label>
                        <Flatpickr
                          value={formData.endDate}
                          onChange={(dates, dateStr) => setFormData({ ...formData, endDate: dateStr })}
                          className="input-field"
                          options={{ dateFormat: 'Y-m-d' }}
                          placeholder="اختر التاريخ"
                        />
                      </div>
                    </div>
                  )}

                  <div className="input-group">
                    <label>ملاحظات / السبب</label>
                    <textarea rows={2} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="input-field"></textarea>
                  </div>
                </div>
                <div style={{ padding: '1.25rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexShrink: 0, backgroundColor: '#fff', borderBottomLeftRadius: '0.5rem', borderBottomRightRadius: '0.5rem' }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">إلغاء</button>
                  <button type="submit" className="btn btn-primary">حفظ الطلب</button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </>
  );
};

export default HRLeaves;
