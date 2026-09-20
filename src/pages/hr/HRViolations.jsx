import { isActiveEmployee } from '../../utils/employeeStatus';
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Trash2, ArrowUpDown, ArrowUp, ArrowDown, X, User, Bell, Check } from 'lucide-react';
import { promptEmployeeAlert } from '../../utils/employeeAlerts';
import Select from '../../components/SearchSelect';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/airbnb.css';
import { getEmployees, getHRViolations, getHRViolationsByDateRange, saveHRViolation, deleteHRViolation, syncEvaluatedDailyReportViolations } from '../../store';
import Swal from 'sweetalert2';
import HRDateFilter from '../../components/ui/HRDateFilter';
import { hasPermission } from '../../utils/permissions';

const getLocalDateStr = (d) => {
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().split('T')[0];
};

const HRViolations = ({ user, refreshCounts, onFiltersChange }) => {
  const canAdd = hasPermission(user, 'hr_bonuses_violations', 'add') || hasPermission(user, 'hr_bonuses_violations', 'create');
  const canEdit = hasPermission(user, 'hr_bonuses_violations', 'edit');
  const canApprove = hasPermission(user, 'hr_bonuses_violations', 'approve');
  const canDelete = hasPermission(user, 'hr_bonuses_violations', 'delete');

  const [violations, setViolations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [dateMode, setDateMode] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedDate, setSelectedDate] = useState(getLocalDateStr(new Date()));
  const [startDate, setStartDate] = useState(getLocalDateStr(new Date()));
  const [endDate, setEndDate] = useState(getLocalDateStr(new Date()));
  
  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'تأخير',
    date: new Date().toISOString().split('T')[0],
    action: 'تنبيه',
    deductionAmount: '',
    notes: ''
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

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

  const getFilterRange = () => {
    if (dateMode === 'day') return { from: selectedDate, to: selectedDate };
    if (dateMode === 'month') return { from: `${selectedMonth}-01`, to: `${selectedMonth}-31` };
    if (dateMode === 'range') return { from: startDate, to: endDate };
    return { from: null, to: null };
  };

  const refreshVisibleData = async () => {
    const { from, to } = getFilterRange();
    const [violationsData, empsData] = await Promise.all([
      getHRViolationsByDateRange(from, to),
      getEmployees()
    ]);
    setViolations(violationsData || []);
    setEmployees(empsData || []);
  };

  const fetchData = async ({ syncReports = false } = {}) => {
    setLoading(true);
    try {
      await refreshVisibleData();
    } catch (error) {
      console.error('Error loading HR violations:', error);
      Swal.fire('تعذر التحميل', 'حدث خطأ أثناء تحميل المخالفات. يرجى المحاولة مرة أخرى.', 'error');
    } finally {
      setLoading(false);
    }

    if (syncReports) {
      syncEvaluatedDailyReportViolations()
        .then(async created => {
          if (created.length > 0) {
            const { from, to } = getFilterRange();
            setViolations(await getHRViolationsByDateRange(from, to));
            refreshCounts?.();
          }
        })
        .catch(error => console.error('Error syncing report violations:', error));
    }
  };

  useEffect(() => { 
    fetchData({ syncReports: false }); 
  }, [dateMode, selectedMonth, selectedDate, startDate, endDate]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canAdd) {
      return Swal.fire('غير مصرح', 'ليس لديك صلاحية تسجيل مخالفات جديدة.', 'warning');
    }
    const emp = employees.find(e => String(e.id || '').trim() === String(formData.employeeId || '').trim());
    if (!emp) return Swal.fire('خطأ', 'الرجاء اختيار الموظف', 'error');

    await saveHRViolation({
      ...formData,
      employeeName: emp.name,
      department: emp.department || 'غير محدد'
    });
    
    Swal.fire('نجاح', 'تم تسجيل المخالفة بنجاح', 'success');
    setShowModal(false);
    fetchData();
    refreshCounts?.();
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      return Swal.fire('غير مصرح', 'ليس لديك صلاحية حذف المخالفات.', 'warning');
    }
    const res = await Swal.fire({ title: 'تأكيد الحذف', icon: 'warning', showCancelButton: true });
    if (res.isConfirmed) {
      await deleteHRViolation(id);
      fetchData();
      refreshCounts?.();
    }
  };

  const handleApproval = async (violation, status) => {
    if (!canApprove) {
      return Swal.fire('غير مصرح', 'ليس لديك صلاحية اعتماد أو رفض المخالفات.', 'warning');
    }
    await saveHRViolation({
      ...violation,
      status,
      approvedBy: user?.name || 'المدير',
      approvedAt: new Date().toISOString()
    }, user);
    Swal.fire('تم', status === 'موافق' ? 'تم اعتماد المخالفة والخصم' : 'تم رفض المخالفة', 'success');
    fetchData();
    refreshCounts?.();
  };

  useEffect(() => {
    onFiltersChange?.({ dateMode, selectedMonth, selectedDate, startDate, endDate, searchTerm });
  }, [dateMode, selectedMonth, selectedDate, startDate, endDate, searchTerm, onFiltersChange]);

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

  const filteredViolations = [...violations].filter(v => v.status !== 'محذوف').filter(v => {
    if (searchTerm && String(v.employeeId) !== String(searchTerm)) return false;
    if (!v.date) return false;
    const reqDate = new Date(v.date).toISOString().split('T')[0];
    const reqMonth = reqDate.slice(0, 7);
    
    if (dateMode === 'day' && reqDate !== selectedDate) return false;
    if (dateMode === 'month' && reqMonth !== selectedMonth) return false;
    if (dateMode === 'range' && (reqDate < startDate || reqDate > endDate)) return false;
    
    return true;
  });
  const pendingViolationCount = filteredViolations.filter(v => v.status === 'معلق').length;
  const sortedViolations = filteredViolations.filter(v => (v.status === 'معلق') === (statusFilter === 'pending')).sort((a, b) => {
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

  const totalDeductions = sortedViolations.reduce((sum, v) => sum + (Number(v.deductionAmount) || 0), 0);

  return (
    <>
      <div className="glass-card flex flex-col min-h-[500px]">
        <div className="flex-responsive mb-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <AlertTriangle className="text-primary" /> المخالفات والخصومات
          </h2>
          <div className="flex flex-col gap-2 mt-2">
            <p className="text-muted text-sm">سجل المخالفات الإدارية والخصومات المالية للموظفين</p>
            <div className="flex items-center gap-3">
              <span style={{ background: '#fff1f2', color: '#e11d48', padding: '6px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 'bold', border: '1px solid #ffe4e6' }}>
                إجمالي الخصومات المعروضة: {totalDeductions.toFixed(2)} د.أ
              </span>
              <span style={{ background: '#f8fafc', color: '#475569', padding: '6px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 'bold', border: '1px solid #e2e8f0' }}>
                عدد المخالفات المعلقة: {pendingViolationCount}
              </span>
            </div>
          </div>
        </div>
        <style>
          {`
            .blood-red-btn {
              background: linear-gradient(135deg, #dc2626, #991b1b) !important;
              box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3) !important;
            }
            .blood-red-btn:hover {
              box-shadow: 0 6px 16px rgba(220, 38, 38, 0.5) !important;
              transform: translateY(-2px);
            }
          `}
        </style>
        <div className="flex flex-wrap gap-3 items-center">
          <select
            aria-label="حالة المخالفات"
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
            className="input-field"
            style={{ width: '150px', height: '42px' }}
          >
            <option value="pending">معلقة</option>
            <option value="resolved">غير معلقة</option>
          </select>
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
                value={employeeIdOptions.find(opt => opt.value === searchTerm) || null}
                onChange={(selected) => setSearchTerm(selected ? selected.value : '')}
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
                value={employeeNameOptions.find(opt => opt.value === searchTerm) || null}
                onChange={(selected) => setSearchTerm(selected ? selected.value : '')}
                styles={{...customSelectStyles, control: (base) => ({...base, height: '42px', minHeight: '42px', borderRadius: '10px', border: '1px solid #e2e8f0', paddingLeft: '24px'})}}
                placeholder="اسم الموظف..."
                isSearchable={true}
                isClearable={true}
              />
          </div>
          {canAdd && (
            <button 
              onClick={() => {
                setFormData({ employeeId: '', type: 'تأخير', date: new Date().toISOString().split('T')[0], action: 'تنبيه', deductionAmount: '', notes: '' });
                setShowModal(true);
              }}
              className="premium-add-btn blood-red-btn whitespace-nowrap"
            >
              <Plus size={20} /> تسجيل مخالفة
            </button>
          )}
        </div>
      </div>

      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('date')}>
                <div className="flex items-center gap-2">التاريخ {renderSortIcon('date')}</div>
              </th>
              <th className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() =>handleSort('employeeName')}>
                <div className="flex items-center gap-2">الموظف {renderSortIcon('employeeName')}</div></th>
              <th className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() =>handleSort('department')}>
                <div className="flex items-center gap-2">القسم {renderSortIcon('department')}</div></th>
              <th className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() =>handleSort('type')}>
                <div className="flex items-center gap-2">نوع المخالفة {renderSortIcon('type')}</div></th>
              <th className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() =>handleSort('action')}>
                <div className="flex items-center gap-2">الإجراء المتخذ {renderSortIcon('action')}</div></th>
              <th className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() =>handleSort('deductionAmount')}>
                <div className="flex items-center gap-2">قيمة الخصم {renderSortIcon('deductionAmount')}</div></th>
              <th>حالة الاعتماد</th>
              <th>ملاحظات</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedViolations.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="text-muted text-sm">{v.date}</td>
                <td className="font-semibold">{v.employeeName}</td>
                <td className="text-muted text-sm">{v.department}</td>
                <td className="text-rose-600 font-medium">{v.type}</td>
                <td>{v.action}</td>
                <td className="font-bold text-rose-600">{v.deductionAmount ? `${v.deductionAmount} د.أ` : '-'}</td>
                <td className="font-bold">
                  <span className={v.status === 'موافق' ? 'text-emerald-600' : v.status === 'مرفوض' ? 'text-rose-600' : 'text-amber-600'}>
                    {v.status || 'معتمد'}
                  </span>
                </td>
                <td className="text-muted text-sm">{v.notes}</td>
                <td>
                  <div className="flex gap-2 justify-center">
                    {(canEdit || canApprove) && (
                      <button onClick={() => promptEmployeeAlert({ employeeId: v.employeeId, employeeName: v.employeeName, source: 'المخالفات والخصومات', sourceReference: `${v.type || 'مخالفة'} ${v.date || ''}`, suggestedMessage: `تم تسجيل مخالفة (${v.type || 'غير محددة'}) بتاريخ ${v.date || 'غير محدد'}.${v.action ? `\nالإجراء المتخذ: ${v.action}.` : ''}${v.deductionAmount ? `\nقيمة الخصم: ${v.deductionAmount} د.أ.` : ''}${v.notes ? `\nالملاحظات: ${v.notes}` : ''}`, user })} className="icon-btn" style={{ color: '#c2410c', background: '#fff7ed', borderColor: '#fdba74' }} title="إرسال تنبيه للموظف"><Bell size={17}/></button>
                    )}
                    {canApprove && v.status === 'معلق' && (
                      <>
                        <button onClick={() => handleApproval(v, 'موافق')} className="icon-btn icon-btn-success" title="اعتماد المخالفة"><Check size={18}/></button>
                        <button onClick={() => handleApproval(v, 'مرفوض')} className="icon-btn icon-btn-delete" title="رفض المخالفة"><X size={18}/></button>
                      </>
                    )}
                    {canDelete && !v.processedInPeriod && (
                      <button onClick={() => handleDelete(v.id)} className="icon-btn icon-btn-delete"><Trash2 size={18}/></button>
                    )}
                    {!canApprove && !canDelete && (
                      <span className="text-xs text-slate-400 font-bold whitespace-nowrap">معاينة فقط</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {sortedViolations.length === 0 && (
              <tr><td colSpan="9" className="py-10 text-center text-muted">لا توجد مخالفات مسجلة</td></tr>
            )}
          </tbody>
        </table>
      </div>
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ zIndex: 10500 }}>
          <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-lg text-rose-600">تسجيل مخالفة جديدة</h3>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label>نوع المخالفة</label>
                    <select value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value})} className="input-field">
                      <option>تأخير</option>
                      <option>غياب بدون إذن</option>
                      <option>استخدام هاتف</option>
                      <option>تدخين</option>
                      <option>عدم التزام بالتعليمات</option>
                      <option>أخرى</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>تاريخ المخالفة</label>
                    <Flatpickr 
                      value={formData.date} 
                      onChange={(dates, dateStr) => setFormData({...formData, date: dateStr})} 
                      className="input-field" 
                      options={{ dateFormat: 'Y-m-d' }}
                      placeholder="اختر التاريخ"
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label>الإجراء المتخذ</label>
                    <select value={formData.action} onChange={e=>setFormData({...formData, action: e.target.value})} className="input-field">
                      <option>تنبيه</option>
                      <option>إنذار أول</option>
                      <option>إنذار نهائي</option>
                      <option>خصم من الراتب</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>قيمة الخصم (إن وجد)</label>
                    <input type="number" placeholder="المبلغ بالدينار" value={formData.deductionAmount} onChange={e=>setFormData({...formData, deductionAmount: e.target.value})} className="input-field" />
                  </div>
                </div>
                <div className="input-group">
                  <label>ملاحظات / تفاصيل الإجراء</label>
                  <textarea rows={2} value={formData.notes} onChange={e=>setFormData({...formData, notes: e.target.value})} className="input-field"></textarea>
                </div>
              </div>
              <div style={{ padding: '1.25rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexShrink: 0, backgroundColor: '#fff', borderBottomLeftRadius: '0.5rem', borderBottomRightRadius: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">إلغاء</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#e11d48', borderColor: '#e11d48' }}>تسجيل المخالفة</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default HRViolations;
