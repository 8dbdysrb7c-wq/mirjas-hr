import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, XCircle, Calendar, Plus, X, ArrowUpDown, ArrowUp, ArrowDown, Check, Undo2, Trash2, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/airbnb.css';
import { getEmployees, getHRLeaves, saveHRLeave, deleteHRLeave, getGlobalSettings } from '../../store';
import Swal from 'sweetalert2';
import { sendWhatsAppNotification } from '../../utils/whatsappService';

const HROvertime = ({ user, refreshCounts }) => {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'بدل عمل إضافي',
    date: '',
    startTime: '',
    endTime: '',
    notes: '',
    status: 'معلق'
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterStatus, setFilterStatus] = useState('معلق');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

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

  const handlePreviewOvertime = (leave) => {
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
        <tr><th>القسم</th><td>${leave.department || 'غير محدد'}</td></tr>
        <tr><th>نوع الطلب</th><td><span style="color:var(--primary); font-weight:bold;">${leave.type}</span></td></tr>
        <tr><th>التاريخ</th><td>${leave.date || leave.startDate || '-'}</td></tr>
    `;
    if (leave.startTime && leave.endTime) {
      htmlContent += `<tr><th>الوقت</th><td dir="ltr">${leave.startTime} - ${leave.endTime}</td></tr>`;
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

  const fetchData = async () => {
    setLoading(true);
    const [leavesData, empsData] = await Promise.all([getHRLeaves(), getEmployees()]);
    setLeaves(leavesData);
    setEmployees(empsData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
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
    
    if (diffMins > 360) {
      Swal.fire('خطأ', 'يوجد مشكلة بالوقت المدخل', 'error');
      return;
    }
    
    const emp = employees.find(e => String(e.id || '').trim() === String(formData.employeeId || '').trim());
    if (!emp) {
      Swal.fire('خطأ', 'الرجاء اختيار موظف', 'error');
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

    if (overtimeStartMins < shiftEndMins && overtimeEndMins > shiftStartMins) {
      Swal.fire('خطأ', 'لا يمكن تقديم عمل إضافي خلال أوقات الدوام الرسمي الخاصة بالموظف (' + shiftStart + ' إلى ' + shiftEnd + ')', 'error');
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
            if (actionReason) msg += `\nملاحظات: ${actionReason}`;
            msg += `\n-- الإدارة`;
            await sendWhatsAppNotification(emp.phone, msg);
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



  const overtimeRequests = sortedLeaves.filter(l => {
    if (l.type !== 'بدل عمل إضافي' && l.type !== 'عمل إضافي') return false;
    
    if (filterStatus !== 'الكل') {
      const reqMonth = new Date(l.createdAt).toISOString().slice(0, 7);
      if (reqMonth !== selectedMonth) return false;
    }

    if (filterStatus === 'الكل') return true;
    if (filterStatus === 'معلق') return l.status === 'معلق' || l.status === 'قيد المراجعة';
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
          <div className="shrink-0 month-picker-container" style={{ position: 'relative' }}>
            <div 
              onClick={() => {
                const [year] = selectedMonth.split('-');
                setPickerYear(parseInt(year));
                setIsMonthDropdownOpen(!isMonthDropdownOpen);
              }}
              className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm hover:border-primary transition-colors cursor-pointer min-w-[160px] h-[42px]"
            >
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-primary" />
                <span className="font-bold text-slate-700 whitespace-nowrap">
                  {getSelectedMonthLabel()}
                </span>
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
            
            {isMonthDropdownOpen && (
              <div 
                className="month-picker-popup"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: '0',
                  width: '280px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  zIndex: 99999,
                  overflow: 'hidden'
                }}
              >
                <div className="flex justify-between items-center bg-slate-50/80 backdrop-blur-sm p-4 border-b border-slate-100">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setPickerYear(prev => prev + 1); }}
                    disabled={pickerYear >= currentYear}
                    className={`p-1.5 rounded-full transition-colors ${pickerYear >= currentYear ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'}`}
                    title="السنة القادمة"
                  >
                    <ChevronUp size={18} />
                  </button>
                  <span className="font-bold text-lg text-slate-800">{pickerYear}</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setPickerYear(prev => prev - 1); }}
                    className="p-1.5 hover:bg-slate-200/70 rounded-full transition-colors text-slate-600 hover:text-slate-900"
                    title="السنة السابقة"
                  >
                    <ChevronDown size={18} />
                  </button>
                </div>
                
                <div 
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    padding: '16px'
                  }}
                >
                  {arabicMonths.map((m, index) => {
                    const monthVal = `${pickerYear}-${(index + 1).toString().padStart(2, '0')}`;
                    const isSelected = selectedMonth === monthVal;
                    const isCurrentMonth = currentYear === pickerYear && currentMonth === (index + 1);
                    const isFutureMonth = pickerYear > currentYear || (pickerYear === currentYear && (index + 1) > currentMonth);
                    
                    return (
                      <button
                        key={monthVal}
                        disabled={isFutureMonth}
                        onClick={() => {
                          setSelectedMonth(monthVal);
                          setIsMonthDropdownOpen(false);
                        }}
                        style={{
                          padding: '8px 4px',
                          borderRadius: '12px',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          transition: 'all 0.2s',
                          border: '1px solid',
                          borderColor: isCurrentMonth && !isSelected ? 'rgba(26, 141, 155, 0.2)' : 'transparent',
                          backgroundColor: isSelected ? '#1a8d9b' : isCurrentMonth ? 'rgba(26, 141, 155, 0.1)' : 'transparent',
                          color: isFutureMonth ? '#cbd5e1' : isSelected ? '#ffffff' : isCurrentMonth ? '#1a8d9b' : '#475569',
                          cursor: isFutureMonth ? 'not-allowed' : 'pointer',
                          transform: isSelected ? 'scale(1.05)' : 'scale(1)'
                        }}
                        onMouseEnter={(e) => {
                          if (isFutureMonth) return;
                          if (!isSelected && !isCurrentMonth) {
                            e.currentTarget.style.backgroundColor = '#f1f5f9';
                            e.currentTarget.style.color = '#0f172a';
                          } else if (isCurrentMonth && !isSelected) {
                            e.currentTarget.style.backgroundColor = 'rgba(26, 141, 155, 0.2)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (isFutureMonth) return;
                          if (!isSelected && !isCurrentMonth) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#475569';
                          } else if (isCurrentMonth && !isSelected) {
                            e.currentTarget.style.backgroundColor = 'rgba(26, 141, 155, 0.1)';
                            e.currentTarget.style.color = '#1a8d9b';
                          }
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
              setFormData({ employeeId: '', type: 'بدل عمل إضافي', date: '', startTime: '', endTime: '', notes: '', status: 'معلق' });
              setShowModal(true);
            }}
            className="premium-add-btn flex items-center gap-2 whitespace-nowrap"
          >
            <Plus size={18} /> تقديم طلب جديد
          </button>
        </div>
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
              <th className="text-center">السبب / الملاحظات</th>
              <th className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() =>handleSort('status')}>
                <div className="flex items-center gap-2">الحالة {renderSortIcon('status')}</div>
              </th>
              <th>إجراءات الإدارة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {overtimeRequests.map((leave) => {
              const emp = employees.find(e => String(e.id || '').trim() === String(leave.employeeId || '').trim() || String(e.name || '').trim() === String(leave.employeeName || '').trim());
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
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="font-mono text-xs">{leave.startDate} {leave.endDate ? `إلى ${leave.endDate}` : ''}</span>
                    </div>
                  )}
                </td>
                <td className="max-w-[200px] whitespace-normal text-sm text-center">{leave.notes}</td>
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
                    {leave.status === 'معلق' ? (
                      <>
                        <button onClick={() => handleStatusChange(leave, 'موافق')} className="icon-btn icon-btn-success" title="موافقة">
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
                    )}
                    <button onClick={() => handleDelete(leave.id)} className="icon-btn icon-btn-delete" title="حذف">
                      <Trash2 size={16} strokeWidth={2} />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
            {overtimeRequests.length === 0 && (
              <tr><td colSpan="7" className="py-10 text-center text-muted">لا توجد طلبات عمل إضافي حالياً</td></tr>
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
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="input-group">
                      <label>من الساعة</label>
                      <input type="time" value={formData.startTime} onChange={e=>setFormData({...formData, startTime: e.target.value})} className="input-field" required />
                    </div>
                    <div className="input-group">
                      <label>إلى الساعة</label>
                      <input type="time" value={formData.endTime} onChange={e=>setFormData({...formData, endTime: e.target.value})} className="input-field" required />
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
                <button type="submit" className="btn btn-primary">حفظ الطلب</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default HROvertime;
