import { isActiveEmployee } from '../../utils/employeeStatus';
import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, XCircle, FileText, Calendar, Filter, X, ArrowUpDown, ArrowUp, ArrowDown, Plus, Check, Undo2, Trash2, DollarSign, Eye, ChevronDown, ChevronUp, User, Pencil, Bell } from 'lucide-react';
import { promptEmployeeAlert } from '../../utils/employeeAlerts';
import Select from '../../components/SearchSelect';
import { getEmployees, getHRAdvances, saveHRAdvance, deleteHRAdvance, createNotification, getGlobalSettings, isDateLocked } from '../../store';
import Swal from 'sweetalert2';
import { sendWhatsAppNotification } from '../../utils/whatsappService';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import HRDateFilter from '../../components/ui/HRDateFilter';

const getLocalDateStr = (d) => {
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().split('T')[0];
};

const HRAdvances = ({ user, refreshCounts }) => {
  const isSiteOwner = String(user?.id || '').trim().toLowerCase() === 'admin';
  const [advances, setAdvances] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [filterStatus, setFilterStatus] = useState('معلق');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [dateMode, setDateMode] = useState('month');
  const [selectedRequestType, setSelectedRequestType] = useState('الكل');
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(getLocalDateStr(new Date()));
  const [startDate, setStartDate] = useState(getLocalDateStr(new Date()));
  const [endDate, setEndDate] = useState(getLocalDateStr(new Date()));
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'سلفة شخصية',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    reason: '',
    paymentMethod: 'تخصم من الراتب القادم',
    status: 'معلق',
    isInstallment: false,
    installmentMonths: 1,
    installmentStartMonth: new Date().toISOString().substring(0, 7),
    installments: []
  });

  const generateInstallments = (amount, months, startMonth) => {
    if (!amount || months <= 0 || !startMonth) return [];
    const amountNum = Number(amount);
    const amountPerMonth = Math.floor(amountNum / months);
    const remainder = amountNum - (amountPerMonth * months);
    
    const [startYear, startMonthNum] = startMonth.split('-');
    let currentYear = parseInt(startYear);
    let currentMonth = parseInt(startMonthNum);
    
    const newInstallments = [];
    for (let i = 0; i < months; i++) {
      let currentMonthStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
      let instAmount = amountPerMonth + (i === 0 ? remainder : 0);
      newInstallments.push({ month: currentMonthStr, amount: instAmount, isPaid: false });
      
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }
    return newInstallments;
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

  const fetchData = async () => {
    setLoading(true);
    const [advancesData, empsData] = await Promise.all([getHRAdvances(), getEmployees()]);
    setAdvances(advancesData);
    setEmployees(empsData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatusChange = async (advance, newStatus) => {
    let rejectionReason = '';
    if (newStatus === 'مرفوض') {
      const { value, isDismissed } = await Swal.fire({
        title: 'سبب الرفض',
        input: 'textarea',
        inputPlaceholder: 'اكتب سبب الرفض هنا ليظهر للموظف... (اختياري)',
        showCancelButton: true,
        confirmButtonText: 'تأكيد الرفض',
        cancelButtonText: 'إلغاء'
      });
      if (isDismissed) return;
      rejectionReason = value || '';
    }

    Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false });
    Swal.showLoading();
    
    try {
      await saveHRAdvance({ ...advance, status: newStatus, rejectionReason }, user);

      if (newStatus === 'موافق' || newStatus === 'مرفوض') {
        const finalAmount = advance.approvedAmount || advance.amount;
        await createNotification({
          settingKey: 'advances',
          targetEmployeeId: advance.employeeId,
          moduleKey: 'hr',
          moduleLabel: 'الموارد البشرية',
          title: newStatus === 'موافق' ? 'تمت الموافقة على طلب السلفة' : 'تم رفض طلب السلفة',
          message: `تم ${newStatus === 'موافق' ? 'قبول' : 'رفض'} طلب السلفة الخاص بك بقيمة ${finalAmount} د.أ${newStatus === 'مرفوض' && rejectionReason ? `\nالسبب: ${rejectionReason}` : ''}`,
          target: { tab: 'advances' }
        });
      }
      
      setAdvances(prev => prev.filter(a => a.id !== advance.id));
      await fetchData();
      if (refreshCounts) refreshCounts();
      Swal.fire('نجاح', `تم ${newStatus === 'موافق' ? 'قبول' : (newStatus === 'مرفوض' ? 'رفض' : 'تحديث')} الطلب بنجاح`, 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('خطأ', 'حدث خطأ أثناء الحفظ', 'error');
    }
  };

  const handleApproveRequest = async (advance) => {
    const { value: result } = await Swal.fire({
      title: 'موافقة على طلب السلفة',
      html: `
        <div style="direction: rtl; text-align: center; padding: 10px 5px 0;">
          <div style="background: #f8fafc; border-radius: 16px; padding: 15px; margin-bottom: 25px; border: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 1.15rem; color: #334155;">قيمة السلفة المطلوبة: <strong style="color: var(--primary); font-size: 1.3rem;">${advance.amount} د.أ</strong></p>
            <p style="margin: 8px 0 0; font-size: 0.85rem; color: #64748b;">يمكنك الموافقة على المبلغ كاملاً أو تعديله.</p>
          </div>
          <label style="display: block; font-weight: bold; color: #1e293b; margin-bottom: 12px; font-size: 1.1rem;">المبلغ الموافق عليه (د.أ)</label>
          <div style="position: relative; max-width: 200px; margin: 0 auto;">
            <input type="number" id="swal-approved-amount" value="${advance.amount}" min="1" step="0.5" dir="ltr" style="width: 100%; box-sizing: border-box; padding: 12px 15px; text-align: center; font-weight: bold; font-size: 1.5rem; color: var(--primary); background: #ffffff; border: 2px solid var(--primary); border-radius: 16px; outline: none; box-shadow: 0 4px 15px rgba(26, 141, 155, 0.15);">
          </div>
          <textarea id="swal-approve-notes" placeholder="ملاحظات الموافقة (اختياري)..." style="width: 100%; margin-top: 20px; box-sizing: border-box; padding: 12px 15px; font-family: inherit; font-size: 1rem; border: 1px solid #cbd5e1; border-radius: 12px; outline: none; resize: vertical; min-height: 80px;"></textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'تأكيد الموافقة',
      cancelButtonText: 'إلغاء',
      customClass: {
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        popup: 'premium-modal-popup-report'
      },
      preConfirm: () => {
        const input = document.getElementById('swal-approved-amount');
        const notesInput = document.getElementById('swal-approve-notes');
        if (!input.value || parseFloat(input.value) <= 0) {
          Swal.showValidationMessage('الرجاء إدخال مبلغ صحيح أكبر من الصفر');
          return false;
        }
        return { amount: parseFloat(input.value), notes: notesInput?.value || '' };
      }
    });

    if (result) {
      const { amount: approvedAmount, notes: approvalNotes } = result;
      Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false });
      Swal.showLoading();
      try {
        const updatedAdvance = { ...advance, status: 'موافق', approvedAmount: approvedAmount, approvalReason: approvalNotes };
        await saveHRAdvance(updatedAdvance, user);

        await createNotification({
          settingKey: 'advances',
          targetEmployeeId: advance.employeeId,
          moduleKey: 'hr',
          moduleLabel: 'الموارد البشرية',
          title: 'تمت الموافقة على طلب السلفة',
          message: `تمت الموافقة على طلب السلفة الخاص بك.${approvalNotes ? `\nالملاحظات: ${approvalNotes}` : ''}`,
          target: { tab: 'advances' }
        });
        
        setAdvances(prev => prev.filter(a => a.id !== advance.id));
        await fetchData();
        if (refreshCounts) refreshCounts();
        Swal.fire('نجاح', 'تم قبول طلب السلفة بنجاح', 'success');
      } catch (error) {
        console.error(error);
        Swal.fire('خطأ', 'حدث خطأ أثناء الحفظ', 'error');
      }
    }
  };

  const handleDelete = async (id) => {
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
        await deleteHRAdvance(id, user);
        setAdvances(prev => prev.filter(a => a.id !== id));
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

  const handlePreviewAdvance = (advance) => {
    const emp = employees.find(e => String(e.id || '').trim() === String(advance.employeeId || '').trim());
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
        <tr><th>الموظف</th><td>${advance.employeeName}</td></tr>
        <tr><th>القسم</th><td>${formatDepartmentName(emp?.department || advance.department || 'غير محدد')}</td></tr>
        <tr><th>نوع السلفة</th><td><span style="color:var(--primary); font-weight:bold;">${advance.type}</span></td></tr>
        <tr><th>التاريخ</th><td>${advance.date || '-'}</td></tr>
        <tr><th>القيمة المطلوبة</th><td dir="ltr" style="text-align: right; font-weight: bold; color: #10b981;">${advance.amount} د.أ</td></tr>
        <tr><th>طريقة السداد</th><td>${advance.isInstallment ? 'مقسطة' : advance.paymentMethod}</td></tr>
      </table>
      ${advance.isInstallment && advance.installments && advance.installments.length > 0 ? `
      <div style="margin-top: 15px; text-align: right; direction: rtl;">
        <h4 style="font-size: 0.9rem; color: #475569; margin-bottom: 8px; font-weight: bold;">جدول الأقساط:</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <tr style="background: #f1f5f9; color: #475569;">
            <th style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">الشهر</th>
            <th style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">القيمة</th>
          </tr>
          ${advance.installments.map(inst => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold;" dir="ltr">${inst.month}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${inst.amount} د.أ</td>
            </tr>
          `).join('')}
        </table>
      </div>
      ` : ''}
      <div class="swal-notes-box"><strong>السبب / الملاحظات:</strong><br><div style="margin-top: 8px;">${advance.reason ? advance.reason.replace(/\n/g, '<br>') : '<span style="color:#94a3b8; font-style:italic;">لا يوجد ملاحظات</span>'}</div></div>
      ${advance.rejectionReason ? `<div class="swal-notes-box" style="border-color: #fda4af; background: #fff1f2;"><strong>سبب الرفض:</strong><br><div style="margin-top: 8px;">${advance.rejectionReason}</div></div>` : ''}
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

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.amount || formData.amount <= 0) {
      Swal.fire('تنبيه', 'الرجاء إدخال مبلغ صحيح', 'warning');
      return;
    }
    if (!formData.reason || formData.reason.trim() === '') {
      Swal.fire('تنبيه', 'الرجاء إدخال السبب', 'warning');
      return;
    }

    const today = getLocalDateStr(new Date());
    if (!formData.id && formData.date < today) {
      if (!isSiteOwner) {
        Swal.fire('غير مسموح', 'إدخال سلفة بتاريخ سابق متاح لمالك الموقع فقط.', 'error');
        return;
      }
      if (await isDateLocked(formData.date)) {
        Swal.fire('الفترة مُرحّلة', 'لا يمكن إضافة السلفة لأن رواتب الفترة المختارة مُرحّلة أو مقفلة.', 'error');
        return;
      }
    }
    
    const emp = employees.find(e => String(e.id) === String(formData.employeeId));
    if (!emp) {
      Swal.fire('خطأ', 'الرجاء اختيار موظف', 'error');
      return;
    }

    if (formData.isInstallment) {
      const totalInst = formData.installments.reduce((sum, inst) => sum + Number(inst.amount), 0);
      if (Math.abs(totalInst - Number(formData.amount)) > 0.01) {
        Swal.fire('خطأ', 'مجموع الأقساط يجب أن يساوي إجمالي مبلغ السلفة', 'error');
        return;
      }
    }
    
    const advanceData = {
      ...formData,
      employeeName: emp.name,
      department: emp.department || 'غير محدد'
    };
    if (!formData.id) {
      advanceData.createdAt = new Date().toISOString();
    }
    await saveHRAdvance(advanceData, user);
    
    Swal.fire('نجاح', 'تم تقديم طلب السلفة بنجاح', 'success');
    setShowModal(false);
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

  const baseAdvances = [...advances].filter(a => {
    if (searchTerm && String(a.employeeId) !== String(searchTerm)) return false;
    const reqDate = new Date(a.createdAt).toISOString().split('T')[0];
    const reqMonth = reqDate.slice(0, 7);
    
    if (dateMode === 'day' && reqDate !== selectedDate) return false;
    if (dateMode === 'month' && reqMonth !== selectedMonth) return false;
    if (dateMode === 'range' && (reqDate < startDate || reqDate > endDate)) return false;
    return true;
  });

  const totalCount = baseAdvances.length;
  const pendingCount = baseAdvances.filter(a => a.status === 'معلق' || a.status === 'قيد المراجعة').length;
  const approvedCount = baseAdvances.filter(a => a.status === 'موافق' || a.status === 'مقبول').length;
  const rejectedCount = baseAdvances.filter(a => a.status === 'مرفوض').length;
  const getAdvanceDisplayAmount = (advance) => {
    const amount = (advance.status === 'موافق' || advance.status === 'مقبول')
      ? (advance.approvedAmount ?? advance.amount)
      : advance.amount;
    return Number(amount) || 0;
  };
  const sumAdvanceAmounts = (items) => items.reduce((sum, advance) => sum + getAdvanceDisplayAmount(advance), 0);
  const formatAdvanceAmount = (amount) => new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
  const totalAmount = sumAdvanceAmounts(baseAdvances);
  const pendingAmount = sumAdvanceAmounts(baseAdvances.filter(a => a.status === 'معلق' || a.status === 'قيد المراجعة'));
  const approvedAmount = sumAdvanceAmounts(baseAdvances.filter(a => a.status === 'موافق' || a.status === 'مقبول'));
  const rejectedAmount = sumAdvanceAmounts(baseAdvances.filter(a => a.status === 'مرفوض'));

  const sortedAdvances = baseAdvances.filter(a => {
    if (filterStatus === 'الكل') return true;
    if (filterStatus === 'معلق') return a.status === 'معلق' || a.status === 'قيد المراجعة';
    if (filterStatus === 'موافق') return a.status === 'موافق' || a.status === 'مقبول';
    return a.status === filterStatus;
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

  return (
    <>
      <div className="glass-card flex flex-col min-h-[500px] animate-fade-in">
        <div className="flex-responsive mb-4 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <DollarSign className="text-primary" /> السلف
            </h2>
            <p className="text-muted text-sm mt-1">
              إدارة طلبات السلف ومتابعة حالتها
            </p>
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
            <button 
              onClick={() => {
                setFormData({ 
                  employeeId: '', type: 'سلفة شخصية', date: new Date().toISOString().split('T')[0], 
                  amount: '', reason: '', paymentMethod: 'تخصم من الراتب القادم', status: 'معلق',
                  isInstallment: false, installmentMonths: 1, installmentStartMonth: new Date().toISOString().substring(0, 7), installments: [] 
                });
                setShowModal(true);
              }}
              className="premium-add-btn flex items-center gap-2 whitespace-nowrap h-[42px]"
            >
              <Plus size={20} strokeWidth={2.5} />
              تقديم طلب جديد
            </button>
          </div>
        </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '24px' }}>
        {/* Total (Rightmost) */}
        <div onClick={() => setFilterStatus('الكل')} style={{ cursor: 'pointer', opacity: filterStatus === 'الكل' ? 1 : 0.6, transition: 'all 0.2s', backgroundColor: '#ffffff', borderRadius: '16px', border: filterStatus === 'الكل' ? '2px solid #3b82f6' : '1px solid #f1f5f9', boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.05)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px', whiteSpace: 'nowrap' }}>
              <p style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', margin: 0 }}>إجمالي الطلبات</p>
              <strong style={{ fontSize: '18px', fontWeight: '900', color: '#3b82f6' }}>{formatAdvanceAmount(totalAmount)} د.أ</strong>
            </div>
            <h3 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{totalCount}</h3>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', margin: '4px 0 0 0' }}>طلب</p>
          </div>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DollarSign size={28} strokeWidth={2} />
          </div>
        </div>

        {/* Pending */}
        <div onClick={() => setFilterStatus('معلق')} style={{ cursor: 'pointer', opacity: filterStatus === 'معلق' ? 1 : 0.6, transition: 'all 0.2s', backgroundColor: '#ffffff', borderRadius: '16px', border: filterStatus === 'معلق' ? '2px solid #d97706' : '1px solid #f1f5f9', boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.05)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px', whiteSpace: 'nowrap' }}>
              <p style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', margin: 0 }}>طلبات معلقة</p>
              <strong style={{ fontSize: '18px', fontWeight: '900', color: '#d97706' }}>{formatAdvanceAmount(pendingAmount)} د.أ</strong>
            </div>
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
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px', whiteSpace: 'nowrap' }}>
              <p style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', margin: 0 }}>طلبات موافق عليها</p>
              <strong style={{ fontSize: '18px', fontWeight: '900', color: '#10b981' }}>{formatAdvanceAmount(approvedAmount)} د.أ</strong>
            </div>
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
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px', whiteSpace: 'nowrap' }}>
              <p style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', margin: 0 }}>طلبات مرفوضة</p>
              <strong style={{ fontSize: '18px', fontWeight: '900', color: '#ef4444' }}>{formatAdvanceAmount(rejectedAmount)} د.أ</strong>
            </div>
            <h3 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{rejectedCount}</h3>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', margin: '4px 0 0 0' }}>طلب</p>
          </div>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={28} strokeWidth={2.5} />
          </div>
        </div>
      </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th className="cursor-pointer hover:bg-gray-100 transition-colors py-4" style={{ textAlign: 'center' }} onClick={() => handleSort('createdAt')}>
                  <div className="flex items-center justify-center gap-2 w-full" style={{ textAlign: 'center' }}>تاريخ الطلب {renderSortIcon('createdAt')}</div>
                </th>
                <th className="cursor-pointer hover:bg-gray-100 transition-colors py-4" style={{ textAlign: 'right', paddingRight: '24px' }} onClick={() =>handleSort('employeeName')}>
                  <div className="flex items-center gap-2 w-full" style={{ justifyContent: 'flex-start', direction: 'rtl', textAlign: 'right' }}>
                    <span>الموظف</span>
                    {renderSortIcon('employeeName')}
                  </div>
                </th>
                <th className="cursor-pointer hover:bg-gray-100 transition-colors text-center py-4" onClick={() =>handleSort('department')}>
                  <div className="flex items-center justify-center gap-2">القسم {renderSortIcon('department')}</div></th>
                <th className="cursor-pointer hover:bg-gray-100 transition-colors text-center py-4" onClick={() =>handleSort('type')}>
                  <div className="flex items-center justify-center gap-2">نوع السلفة {renderSortIcon('type')}</div></th>
                <th className="cursor-pointer hover:bg-gray-100 transition-colors text-center py-4" onClick={() =>handleSort('amount')}>
                  <div className="flex items-center justify-center gap-2">القيمة (د.أ) {renderSortIcon('amount')}</div></th>
                <th className="cursor-pointer hover:bg-gray-100 transition-colors text-center py-4" onClick={() =>handleSort('status')}>
                  <div className="flex items-center justify-center gap-2">الحالة {renderSortIcon('status')}</div></th>
                <th className="text-center py-4">السبب</th>
                <th className="text-center py-4">إجراءات الإدارة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedAdvances.map((advance) => {
                const emp = employees.find(e => String(e.id || '').trim() === String(advance.employeeId || '').trim());
                return (
                <tr key={advance.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="text-muted text-sm align-middle py-3" style={{ textAlign: 'center', direction: 'ltr' }}>{new Date(advance.createdAt).toLocaleDateString('en-GB')}</td>
                  <td className="font-semibold text-right align-middle py-3 pr-6 whitespace-nowrap">{advance.employeeName}</td>
                  <td className="text-muted text-sm text-center align-middle py-3">{formatDepartmentName(emp?.department || advance.department)}</td>
                  <td className="text-center align-middle py-3">{advance.type}</td>
                  <td className="font-bold text-slate-800 text-center align-middle py-3">
                    <div className="flex flex-col items-center justify-center">
                      {advance.approvedAmount && advance.approvedAmount !== advance.amount && advance.status === 'موافق' ? (
                        <>
                          <span className="text-emerald-600 text-base">{advance.approvedAmount}</span>
                          <span className="text-[11px] text-muted line-through" title="المبلغ الأصلي المطلوب">({advance.amount})</span>
                        </>
                      ) : (
                        <span className="text-base">{advance.amount}</span>
                      )}
                      {advance.isInstallment && <span className="text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded-full mt-1">مقسطة ({advance.installments?.length || 0})</span>}
                    </div>
                  </td>
                  <td className="text-center align-middle py-3">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center justify-center gap-1 w-fit mx-auto ${
                      advance.status === 'موافق' ? 'bg-emerald-50 text-emerald-600' :
                      advance.status === 'مرفوض' ? 'bg-rose-50 text-rose-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {advance.status === 'موافق' && <CheckCircle size={12} />}
                      {advance.status === 'مرفوض' && <X size={14} strokeWidth={3} />}
                      {advance.status === 'معلق' && <Clock size={12} />}
                      {advance.status}
                    </span>
                  </td>
                  <td className="text-muted text-sm max-w-[200px] truncate text-center align-middle py-3" title={advance.reason}>{advance.reason}</td>
                  <td className="align-middle py-3">
                    <div className="flex gap-2 justify-center items-center">
                      <button onClick={() => handlePreviewAdvance(advance)} className="icon-btn" style={{ color: '#0ea5e9', background: '#f0f9ff', borderColor: '#bae6fd' }} title="معاينة الطلب">
                        <Eye size={18} strokeWidth={2} />
                      </button>
                      <button onClick={() => promptEmployeeAlert({ employeeId: advance.employeeId, employeeName: advance.employeeName, source: 'السلف', sourceReference: `${advance.type || 'سلفة'} ${advance.createdAt ? new Date(advance.createdAt).toLocaleDateString('en-GB') : ''}`, suggestedMessage: `طلب السلفة الخاص بك بقيمة ${advance.approvedAmount || advance.amount || 0} د.أ حالته: ${advance.status || 'معلق'}.${advance.reason ? `\nالسبب: ${advance.reason}` : ''}`, user })} className="icon-btn" style={{ color: '#c2410c', background: '#fff7ed', borderColor: '#fdba74' }} title="إرسال تنبيه للموظف">
                        <Bell size={17} />
                      </button>
                      {advance.status === 'معلق' ? (
                        <>
                          <button onClick={() => {
                            setFormData({
                              id: advance.id,
                              employeeId: employees.find(e => e.name === advance.employeeName)?.id || advance.employeeId || '',
                              amount: advance.amount || '',
                              reason: advance.reason || '',
                              paymentMethod: advance.paymentMethod || 'تخصم من الراتب القادم',
                              status: advance.status || 'معلق',
                              date: advance.date || (advance.createdAt ? advance.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
                              isInstallment: advance.isInstallment || false,
                              installmentMonths: advance.installmentMonths || 1,
                              installmentStartMonth: advance.installmentStartMonth || new Date().toISOString().substring(0, 7),
                              installments: advance.installments || [],
                              createdAt: advance.createdAt
                            });
                            setShowModal(true);
                          }} className="icon-btn" style={{ color: '#8b5cf6', background: '#f5f3ff', borderColor: '#ddd6fe' }} title="تعديل الطلب">
                            <Pencil size={18} strokeWidth={2} />
                          </button>
                          <button onClick={() => handleApproveRequest(advance)} className="icon-btn icon-btn-success" title="موافقة">
                            <Check size={18} strokeWidth={2.5} />
                          </button>
                          <button onClick={() => handleStatusChange(advance, 'مرفوض')} className="icon-btn icon-btn-delete" title="رفض">
                            <X size={18} strokeWidth={2.5} />
                          </button>
                        </>
                      ) : (
                        !(advance.processedInPeriod || (advance.processedPeriods && advance.processedPeriods.length > 0)) && (
                          <button onClick={() => handleStatusChange(advance, 'معلق')} className="icon-btn icon-btn-warning" title="تراجع عن القرار">
                            <Undo2 size={16} strokeWidth={2.5} />
                          </button>
                        )
                      )}
                      {!(advance.processedInPeriod || (advance.processedPeriods && advance.processedPeriods.length > 0)) && (
                        <button onClick={() => handleDelete(advance.id)} className="icon-btn icon-btn-delete" title="حذف">
                          <Trash2 size={16} strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
              {sortedAdvances.length === 0 && (
                <tr><td colSpan="8" className="py-10 text-center text-muted">لا توجد طلبات سلف حالياً</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ zIndex: 10500 }}>
          <div className="modal-content" style={{ maxWidth: '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-lg text-slate-800">تقديم طلب سلفة جديد</h3>
              <button type="button" onClick={() => setShowModal(false)} className="icon-btn hover:bg-gray-100 rounded-full p-2 transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
              <div className="p-5" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flexGrow: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label>الموظف *</label>
                    <select required value={formData.employeeId} onChange={e=>setFormData({...formData, employeeId: e.target.value})} className="input-field">
                      <option value="">-- اختر الموظف --</option>
                      {employees.filter(isActiveEmployee).map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                  </div>
                  
                  <div className="input-group">
                    <label>نوع السلفة *</label>
                    <select 
                      value={formData.type} 
                      onChange={e => {
                        const newType = e.target.value;
                        setFormData({
                          ...formData, 
                          type: newType,
                          paymentMethod: newType === 'سلفة شخصية' ? 'تخصم من الراتب القادم' : 'دفع نقدي'
                        });
                      }} 
                      className="input-field" 
                      required
                    >
                      <option value="سلفة شخصية">سلفة شخصية</option>
                      <option value="سلفة عمل">سلفة عمل</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label>التاريخ *</label>
                    <Flatpickr 
                      value={formData.date} 
                      onChange={(dates, dateStr) => setFormData({...formData, date: dateStr})} 
                      className="input-field w-full bg-white" 
                      options={{ dateFormat: 'Y-m-d', disableMobile: true, ...(isSiteOwner ? {} : { minDate: 'today' }) }}
                      placeholder="اختر التاريخ"
                      required
                    />
                    {isSiteOwner && <small className="text-muted">يمكن لمالك الموقع اختيار تاريخ سابق إذا لم تكن فترة الرواتب مُرحّلة.</small>}
                  </div>
                  
                  <div className="input-group">
                    <label>المبلغ (د.أ) *</label>
                    <input type="number" min="1" step="0.5" value={formData.amount} onChange={e => {
                      const newAmt = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        amount: newAmt,
                        installments: prev.isInstallment ? generateInstallments(newAmt, prev.installmentMonths, prev.installmentStartMonth) : []
                      }));
                    }} className="input-field" required />
                  </div>

                  {formData.type === 'سلفة شخصية' ? (
                    <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                      <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm flex items-center gap-2">
                        <span className="font-bold">ملاحظة:</span> هذه السلفة سيتم خصمها من الراتب القادم.
                      </div>
                    </div>
                  ) : (
                    <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                      <label>طريقة الدفع *</label>
                      <select 
                        value={formData.paymentMethod} 
                        onChange={e => setFormData({...formData, paymentMethod: e.target.value})} 
                        className="input-field" 
                        required
                      >
                        <option value="دفع نقدي">دفع نقدي</option>
                        <option value="تخصم من الراتب القادم">تخصم من الراتب القادم</option>
                      </select>
                    </div>
                  )}
                  
                  <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="flex items-center gap-2 cursor-pointer mt-2">
                      <input 
                        type="checkbox" 
                        checked={formData.isInstallment}
                        onChange={e => {
                          const checked = e.target.checked;
                          setFormData(prev => ({
                            ...prev, 
                            isInstallment: checked,
                            installments: checked ? generateInstallments(prev.amount, prev.installmentMonths, prev.installmentStartMonth) : []
                          }));
                        }}
                        className="w-4 h-4 text-primary rounded focus:ring-primary"
                      />
                      <span className="font-bold text-slate-700">تقسيط السلفة على عدة أشهر؟</span>
                    </label>
                  </div>

                  {formData.isInstallment && (
                    <div className="input-group" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <label>عدد الأشهر</label>
                          <input type="number" min="1" max="60" value={formData.installmentMonths} onChange={e => {
                            const months = parseInt(e.target.value) || 1;
                            setFormData(prev => ({
                              ...prev, installmentMonths: months,
                              installments: generateInstallments(prev.amount, months, prev.installmentStartMonth)
                            }));
                          }} className="input-field" />
                        </div>
                        <div style={{ position: 'relative' }}>
                          <label>شهر بداية الخصم</label>
                          <div
                            onClick={() => {
                              if (!formData.installmentStartMonth) {
                                setPickerYear(new Date().getFullYear());
                              } else {
                                setPickerYear(parseInt(formData.installmentStartMonth.split('-')[0]));
                              }
                              setIsMonthDropdownOpen(!isMonthDropdownOpen);
                            }}
                            className="input-field"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: '#fff' }}
                          >
                            <span style={{ color: formData.installmentStartMonth ? '#1e293b' : '#94a3b8' }}>
                              {formData.installmentStartMonth ? (() => {
                                const [y, m] = formData.installmentStartMonth.split('-');
                                const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
                                return `${arabicMonths[parseInt(m) - 1]} ${y}`;
                              })() : 'اختر شهر بداية الخصم'}
                            </span>
                            <Calendar size={16} color="#94a3b8" />
                          </div>

                          {isMonthDropdownOpen && (
                            <div className="month-picker-popup"
                              style={{
                                position: 'absolute',
                                bottom: 'calc(100% + 4px)',
                                top: 'auto',
                                left: '0',
                                right: 'auto',
                                width: '280px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                                zIndex: 99999,
                                overflow: 'hidden'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                                <button type="button" onClick={(e) => { e.stopPropagation(); setPickerYear(prev => prev + 1); }} style={{ padding: '4px', color: '#64748b', cursor: 'pointer', background: 'none', border: 'none' }}><ChevronUp size={20} /></button>
                                <span style={{ fontWeight: 'bold', fontSize: '1.125rem', color: '#1e293b' }}>{pickerYear}</span>
                                <button type="button" onClick={(e) => { e.stopPropagation(); setPickerYear(prev => prev - 1); }} style={{ padding: '4px', color: '#64748b', cursor: 'pointer', background: 'none', border: 'none' }}><ChevronDown size={20} /></button>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '16px' }}>
                                {['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'].map((m, index) => {
                                  const monthVal = `${pickerYear}-${(index + 1).toString().padStart(2, '0')}`;
                                  const isSelected = formData.installmentStartMonth === monthVal;
                                  const currentYear = new Date().getFullYear();
                                  const currentMonth = new Date().getMonth() + 1;
                                  const isCurrentMonth = currentYear === pickerYear && currentMonth === (index + 1);

                                  return (
                                    <button
                                      key={monthVal}
                                      type="button"
                                      onClick={() => { 
                                        setFormData(prev => ({
                                          ...prev, installmentStartMonth: monthVal,
                                          installments: generateInstallments(prev.amount, prev.installmentMonths, monthVal)
                                        }));
                                        setIsMonthDropdownOpen(false); 
                                      }}
                                      style={{
                                        padding: '10px 4px',
                                        borderRadius: '8px',
                                        fontSize: '0.875rem',
                                        fontWeight: 'bold',
                                        transition: 'all 0.2s',
                                        border: '1px solid',
                                        borderColor: isCurrentMonth && !isSelected ? 'rgba(26, 141, 155, 0.2)' : 'transparent',
                                        backgroundColor: isSelected ? '#1a8d9b' : isCurrentMonth ? 'rgba(26, 141, 155, 0.05)' : 'transparent',
                                        color: isSelected ? '#ffffff' : isCurrentMonth ? '#1a8d9b' : '#475569',
                                        cursor: 'pointer',
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
                      </div>
                      
                      {formData.installments.length > 0 && (
                        <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '5px' }}>
                          <table className="w-full text-right" style={{ fontSize: '0.85rem' }}>
                            <thead>
                              <tr className="bg-slate-100 text-slate-600">
                                <th className="p-2 rounded-r-lg">الشهر</th>
                                <th className="p-2 rounded-l-lg">القيمة (د.أ)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {formData.installments.map((inst, idx) => (
                                <tr key={idx} className="border-b border-slate-100 last:border-0">
                                  <td className="p-2 font-bold text-slate-700" dir="ltr" style={{ textAlign: 'right' }}>{inst.month}</td>
                                  <td className="p-2">
                                    <input type="number" step="0.5" min="0" value={inst.amount} onChange={e => {
                                      const newInsts = [...formData.installments];
                                      newInsts[idx].amount = Number(e.target.value);
                                      setFormData(prev => ({ ...prev, installments: newInsts }));
                                    }} className="input-field py-1 px-2 h-auto text-sm" style={{ width: '100px' }} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="mt-2 text-left text-sm font-bold flex justify-between">
                            <span className="text-slate-600">المجموع:</span>
                            <span className={Math.abs(formData.installments.reduce((s,i)=>s+Number(i.amount),0) - Number(formData.amount)) < 0.01 ? 'text-emerald-600' : 'text-rose-600'}>
                              {formData.installments.reduce((s,i)=>s+Number(i.amount),0)} / {formData.amount || 0} د.أ
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                    <label>السبب / الملاحظات *</label>
                    <textarea rows="3" value={formData.reason} onChange={e=>setFormData({...formData, reason: e.target.value})} className="input-field" required></textarea>
                  </div>
                </div>
              </div>
              
              <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0 rounded-b-2xl">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">إلغاء</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#1a8d9b', border: 'none' }}>حفظ الطلب</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default HRAdvances;
