import React, { useState, useEffect } from 'react';
import { getLogs, getLogsByDateRange, isAdmin, getEmployees } from '../../store';
import { matchesSearch, useDebounce } from '../../utils/searchEngine';
import { getWhatsAppLogs, getWhatsAppLogsByDateRange, deleteWhatsAppLogs } from '../../utils/whatsappService';
import Flatpickr from 'react-flatpickr';
import Swal from 'sweetalert2';
import { Arabic } from 'flatpickr/dist/l10n/ar.js';
import 'flatpickr/dist/flatpickr.min.css';
import Select from '../../components/SearchSelect';
import { 
  ClipboardList, Search, Calendar, User, 
  ArrowUpDown, Filter, Trash2, Shield, 
  Activity, Info, RefreshCw, MessageCircle, CheckCircle, XCircle, Clock,
  ChevronDown, ChevronUp, X
} from 'lucide-react';

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
              onClick={() => setYear(y => y + 1)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}
            >
              <ChevronUp size={16} />
            </button>
            <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{year}</span>
            <button 
              type="button"
              onClick={() => setYear(y => y - 1)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}
            >
              <ChevronDown size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {arabicMonths.map((m, idx) => {
              const mVal = `${year}-${String(idx + 1).padStart(2, '0')}`;
              const isSelected = selectedMonth === mVal;
              return (
                <button
                  key={mVal}
                  type="button"
                  onClick={() => {
                    setSelectedMonth(mVal);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '8px 4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#e0f2fe' : 'transparent',
                    color: isSelected ? '#0284c7' : '#475569'
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


const AdminLogs = ({ user }) => {
  const [activeTab, setActiveTab] = useState('system');
  const [logs, setLogs] = useState([]);
  const [waLogs, setWaLogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [moduleFilter, setModuleFilter] = useState('الكل');
  const [actionFilter, setActionFilter] = useState('الكل');
  const [waStatusFilter, setWaStatusFilter] = useState('الكل');
  const [waEmployeeFilter, setWaEmployeeFilter] = useState('الكل');
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
  const [deletingWa, setDeletingWa] = useState(false);
  const [selectedWaIds, setSelectedWaIds] = useState([]);

  const getLocalDateStr = (d) => {
    if (!d) return '';
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const [dateMode, setDateMode] = useState('day');
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
  const [endDate, setEndDate] = useState(() => getLocalDateStr(new Date()));

  const [dateFrom, setDateFrom] = useState(selectedDate);
  const [dateTo, setDateTo] = useState(selectedDate);

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

  useEffect(() => {
    fetchData();
  }, [activeTab, dateFrom, dateTo]);

  const fetchData = async () => {
    setLoading(true);
    let from = new Date(dateFrom);
    from.setHours(0,0,0,0);
    let to = new Date(dateTo);
    to.setHours(23,59,59,999);

    if (activeTab === 'system') {
      const data = await getLogsByDateRange(from, to);
      setLogs(data);
    } else {
      const emps = await getEmployees();
      setEmployees(emps);
      const data = await getWhatsAppLogsByDateRange(from, to);
      setWaLogs(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    setSelectedWaIds([]);
  }, [activeTab, dateFrom, dateTo, searchTerm, waStatusFilter, waEmployeeFilter]);

  const handleToggleSelect = (id) => {
    setSelectedWaIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const visibleIds = filteredWaLogs.map(log => log.id);
    const allSelected = visibleIds.every(id => selectedWaIds.includes(id));
    if (allSelected) {
      setSelectedWaIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedWaIds(prev => {
        const newSelection = [...prev];
        visibleIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };

  const handleDeleteAction = async () => {
    const isDeletingSelected = selectedWaIds.length > 0;
    const targetIds = isDeletingSelected ? selectedWaIds : allFilteredWaLogs.map(log => log.id);
    const count = targetIds.length;
    if (count === 0) return;

    const confirmMsg = isDeletingSelected
      ? `هل أنت متأكد من مسح الرسائل المحددة (${count} رسالة)؟`
      : `هل أنت متأكد من مسح جميع الرسائل المفلترة (${count} رسالة)؟`;

    const result = await Swal.fire({
      title: 'هل أنت متأكد؟',
      text: confirmMsg,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'نعم، امسحها',
      cancelButtonText: 'إلغاء',
      customClass: {
        popup: 'premium-swal-popup'
      }
    });

    if (result.isConfirmed) {
      setDeletingWa(true);
      try {
        await deleteWhatsAppLogs(targetIds);
        await Swal.fire({
          title: 'تم المسح!',
          text: 'تم مسح الرسائل بنجاح.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        setSelectedWaIds([]);
        await fetchData();
      } catch (error) {
        console.error(error);
        await Swal.fire('خطأ', 'حدث خطأ أثناء مسح الرسائل.', 'error');
      } finally {
        setDeletingWa(false);
      }
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredLogs = logs.filter(log => {
    const searchMatches = matchesSearch(
      [log.userName, log.userId, log.details, log.module, log.action],
      debouncedSearchTerm
    );
    
    const matchesModule = moduleFilter === 'الكل' || log.module === moduleFilter;
    const matchesAction = actionFilter === 'الكل' || log.action === actionFilter;

    return searchMatches && matchesModule && matchesAction;
  }).sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const modules = ['الكل', ...new Set(logs.map(l => l.module))];
  const actions = ['الكل', ...new Set(logs.map(l => l.action))];

  const customSelectStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '10px',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      cursor: 'pointer',
      minHeight: '44px',
      height: '44px',
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

  const employeeIdOptions = employees.map(emp => ({ value: emp.id, label: emp.id }));

  const employeeNameOptions = employees.map(emp => ({ value: emp.id, label: emp.name }));

  const handleEmployeeIdChange = (selected) => {
    const val = selected ? selected.value : 'الكل';
    setWaEmployeeFilter(val);
  };
  
  const handleEmployeeNameChange = (selected) => {
    const val = selected ? selected.value : 'الكل';
    setWaEmployeeFilter(val);
  };

  const selectedIdOpt = waEmployeeFilter !== 'الكل' 
    ? { value: waEmployeeFilter, label: waEmployeeFilter }
    : null;

  const selectedNameOpt = waEmployeeFilter !== 'الكل'
    ? { value: waEmployeeFilter, label: employees.find(e => String(e.id) === String(waEmployeeFilter))?.name || waEmployeeFilter }
    : null;

  const parseDate = (val) => {
    if (!val) return null;
    if (typeof val.toDate === 'function') return val.toDate();
    if (val.seconds) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  const baseWaLogs = waLogs.map(log => {
    let cleanPhone = (log.phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('962')) cleanPhone = cleanPhone.substring(3);
    else if (cleanPhone.startsWith('00962')) cleanPhone = cleanPhone.substring(5);
    else if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);

    const emp = employees.find(e => {
        if(!e.phone) return false;
        let empPhone = String(e.phone).replace(/[^0-9]/g, '');
        if (empPhone.startsWith('962')) empPhone = empPhone.substring(3);
        else if (empPhone.startsWith('00962')) empPhone = empPhone.substring(5);
        else if (empPhone.startsWith('0')) empPhone = empPhone.substring(1);
        return empPhone === cleanPhone;
    });

    return { ...log, employee: emp };
  });

  const allFilteredWaLogs = baseWaLogs.filter(log => {
    const searchMatches = matchesSearch(
      [log.phone, log.message, log.employee?.name, log.employee?.id, log.status],
      debouncedSearchTerm
    );
    
    const matchesStatus = waStatusFilter === 'الكل' || log.status === waStatusFilter;
    const matchesEmployee = waEmployeeFilter === 'الكل' || (log.employee && String(log.employee.id) === String(waEmployeeFilter));

    return searchMatches && matchesStatus && matchesEmployee;
  });

  const filteredWaLogs = allFilteredWaLogs.slice(0, 20);

  const getWaStatusBadge = (status) => {
    switch (status) {
      case 'sent': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'failed': return 'badge-danger';
      default: return 'badge-secondary';
    }
  };
  
  const getWaStatusIcon = (status) => {
    switch (status) {
      case 'sent': return <CheckCircle size={14} className="mr-1" />;
      case 'pending': return <Clock size={14} className="mr-1" />;
      case 'failed': return <X size={14} strokeWidth={3} className="mr-1" />;
      default: return null;
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'إضافة': return 'badge-success';
      case 'تعديل': return 'badge-warning';
      case 'حذف': return 'badge-danger';
      case 'تسجيل دخول': return 'badge-info';
      default: return 'badge-secondary';
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="loading-spinner" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3 m-0">
            <ClipboardList className="text-primary" size={28} />
            سجل العمليات
          </h2>
          <p className="text-muted m-0 mt-1">تتبع كافة التحركات والتغييرات في النظام</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          className={`premium-filter-btn ${activeTab === 'system' ? 'active' : 'inactive'}`}
          onClick={() => { setActiveTab('system'); setSearchTerm(''); }}
        >
          <Activity size={18} />
          سجل النظام
        </button>
        <button
          className={`premium-filter-btn ${activeTab === 'whatsapp' ? 'active' : 'inactive'}`}
          onClick={() => { setActiveTab('whatsapp'); setSearchTerm(''); }}
        >
          <MessageCircle size={18} />
          سجل إشعارات الواتساب
        </button>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 mb-6">
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '12px', flexWrap: 'wrap', direction: 'rtl' }}>
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

           {/* 3. Dropdowns depending on Tab */}
           {activeTab === 'system' ? (
             <>
               {/* القسم / الوحدة */}
               <div style={{ position: 'relative' }}>
                  <select
                    value={moduleFilter}
                    onChange={(e) => setModuleFilter(e.target.value)}
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
                    {modules.map(m => <option key={m} value={m}>{m === 'الكل' ? 'القسم: الكل' : m}</option>)}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
               </div>

               {/* نوع العملية */}
               <div style={{ position: 'relative' }}>
                  <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
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
                    {actions.map(a => <option key={a} value={a}>{a === 'الكل' ? 'العملية: الكل' : a}</option>)}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
               </div>
             </>
           ) : (
             <>
               {/* حالة الرسالة */}
               <div style={{ position: 'relative' }}>
                  <select
                    value={waStatusFilter}
                    onChange={(e) => setWaStatusFilter(e.target.value)}
                    style={{
                      height: '44px',
                      minWidth: '160px',
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
                    <option value="الكل">حالة الرسالة: الكل</option>
                    <option value="sent">تم الإرسال (sent)</option>
                    <option value="pending">قيد الانتظار (pending)</option>
                    <option value="failed">فشل (failed)</option>
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
               </div>

               {/* 4. Employee ID */}
               <div style={{ width: '180px' }}>
                    <Select
                      options={employeeIdOptions}
                      value={selectedIdOpt}
                      onChange={handleEmployeeIdChange}
                      styles={customSelectStyles}
                      placeholder="رقم الموظف..."
                      isSearchable={true}
                      isClearable={true}
                    />
               </div>

               {/* 5. Employee Name */}
               <div style={{ width: '240px', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, color: '#94a3b8', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                      <User size={16} />
                    </div>
                    <Select
                      options={employeeNameOptions}
                      value={selectedNameOpt}
                      onChange={handleEmployeeNameChange}
                      styles={{
                        ...customSelectStyles,
                        control: (base) => ({
                          ...base,
                          height: '44px',
                          minHeight: '44px',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          paddingLeft: '24px'
                        })
                      }}
                      placeholder="اسم الموظف..."
                      isSearchable={true}
                      isClearable={true}
                    />
               </div>
             </>
           )}

           {/* General Search */}
           <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0 12px', height: '44px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', minWidth: '220px' }}>
              <Search size={16} style={{ color: '#94a3b8', marginLeft: '8px' }} />
              <input 
                type="text" 
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', fontWeight: '500', color: '#334155', backgroundColor: 'transparent' }}
                placeholder={activeTab === 'system' ? "ابحث باسم المستخدم أو التفاصيل..." : "ابحث برقم الهاتف أو الرسالة..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>

           {/* Refresh Button */}
           <button 
             onClick={fetchData}
             style={{
               height: '44px',
               borderRadius: '10px',
               display: 'flex',
               alignItems: 'center',
               gap: '8px',
               fontWeight: 'bold',
               fontSize: '13px',
               padding: '0 16px',
               backgroundColor: '#0ea5e9',
               color: '#fff',
               border: 'none',
               cursor: 'pointer',
               boxShadow: '0 2px 4px rgba(14, 165, 233, 0.2)'
             }}
           >
             <RefreshCw size={16} /> تحديث البيانات
           </button>

           {/* Delete Button */}
           {activeTab === 'whatsapp' && allFilteredWaLogs.length > 0 && (
             <button 
               onClick={handleDeleteAction}
               disabled={deletingWa}
               style={{
                 height: '44px',
                 borderRadius: '10px',
                 display: 'flex',
                 alignItems: 'center',
                 gap: '8px',
                 fontWeight: 'bold',
                 fontSize: '13px',
                 padding: '0 16px',
                 backgroundColor: '#ef4444',
                 color: '#fff',
                 border: 'none',
                 cursor: 'pointer',
                 opacity: deletingWa ? 0.6 : 1,
                 boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
                 transition: 'background-color 0.2s'
               }}
               onMouseOver={(e) => { if (!deletingWa) e.currentTarget.style.backgroundColor = '#dc2626'; }}
               onMouseOut={(e) => { if (!deletingWa) e.currentTarget.style.backgroundColor = '#ef4444'; }}
             >
               {deletingWa ? (
                 <>
                   <RefreshCw size={16} className="animate-spin" /> جاري المسح...
                 </>
               ) : selectedWaIds.length > 0 ? (
                 <>
                   <Trash2 size={16} /> مسح المحدد ({selectedWaIds.length})
                 </>
               ) : (
                 <>
                   <Trash2 size={16} /> مسح الكل المفلتر ({allFilteredWaLogs.length})
                 </>
               )}
             </button>
           )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-panel p-0 overflow-hidden">
        <div className="table-container">
          {activeTab === 'system' ? (
            <table>
              <thead>
                <tr>
                  <th onClick={() => handleSort('timestamp')} className="cursor-pointer">
                    التاريخ والوقت <ArrowUpDown size={14} className="inline mr-1" />
                  </th>
                  <th onClick={() => handleSort('userName')} className="cursor-pointer">
                    المستخدم <ArrowUpDown size={14} className="inline mr-1" />
                  </th>
                  <th>القسم</th>
                  <th>العملية</th>
                  <th>التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id}>
                    <td dir="ltr" style={{ textAlign: 'right' }}>
                      <div className="flex flex-col items-end">
                        <span className="font-bold">
                          {log.timestamp ? new Date(log.timestamp).toLocaleDateString('en-GB') : (log.date ? log.date.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)) : '')}
                        </span>
                        <span className="text-xs text-muted">
                          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: true }) : (log.time ? log.time.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)) : '')}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-xs">
                          {log.userName?.[0] || 'U'}
                        </div>
                        <span className="font-semibold">{log.userName}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        {log.module}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ maxWidth: '300px' }}>
                      <div className="text-sm truncate hover:whitespace-normal" title={log.details}>
                        {log.details}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-muted">
                      <Info size={48} className="mx-auto mb-4 opacity-20" />
                      <p>لا توجد عمليات تطابق البحث</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={filteredWaLogs.length > 0 && filteredWaLogs.every(log => selectedWaIds.includes(log.id))}
                      onChange={handleToggleSelectAll}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </th>
                  <th>تاريخ الإضافة</th>
                  <th>الموظف</th>
                  <th>رقم الهاتف</th>
                  <th>الرسالة</th>
                  <th>الحالة</th>
                  <th>تاريخ الإرسال</th>
                </tr>
              </thead>
              <tbody>
                {filteredWaLogs.map(log => {
                  const createdAtObj = parseDate(log.createdAt);
                  const sentAtObj = parseDate(log.sentAt);
                  const isSelected = selectedWaIds.includes(log.id);
                  return (
                    <tr key={log.id} style={{ backgroundColor: isSelected ? 'rgba(239, 68, 68, 0.05)' : 'transparent', transition: 'background-color 0.2s' }}>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => handleToggleSelect(log.id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>
                      <td dir="ltr" style={{ textAlign: 'right' }}>
                        <div className="text-sm font-bold flex justify-end">
                          {createdAtObj ? createdAtObj.toLocaleString('en-GB', { hour12: true }) : 'غير متوفر'}
                        </div>
                      </td>
                      <td>
                        {log.employee ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">{log.employee.name}</span>
                            <span className="text-xs text-muted">رقم وظيفي: {log.employee.id}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted">غير مسجل</span>
                        )}
                      </td>
                      <td>
                        <span className="font-mono text-sm" dir="ltr">{log.phone}</span>
                      </td>
                      <td style={{ maxWidth: '300px' }}>
                        <div className="text-sm truncate hover:whitespace-normal" title={log.message}>
                          {log.message}
                        </div>
                      </td>
                      <td>
                        <span className={`badge flex items-center w-fit ${getWaStatusBadge(log.status)}`}>
                          {getWaStatusIcon(log.status)}
                          <span className="mr-1">
                            {log.status === 'sent' ? 'تم الإرسال' : log.status === 'pending' ? 'بالانتظار' : 'فشل'}
                          </span>
                        </span>
                      </td>
                      <td dir="ltr" style={{ textAlign: 'right' }}>
                        <div className="text-sm text-muted flex justify-end">
                          {sentAtObj ? sentAtObj.toLocaleString('en-GB', { hour12: true }) : '-'}
                        </div>
                        {log.error && (
                          <div className="text-xs text-red-500 mt-1 max-w-[150px] truncate text-right" title={log.error} dir="rtl">
                            {log.error}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredWaLogs.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-muted">
                      <MessageCircle size={48} className="mx-auto mb-4 opacity-20" />
                      <p>لا توجد إشعارات واتساب مسجلة حتى الآن</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLogs;
