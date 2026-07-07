import React, { useState, useEffect } from 'react';
import { Gift, Plus, Trash2, ArrowUpDown, ArrowUp, ArrowDown, X, User } from 'lucide-react';
import Select from 'react-select';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/airbnb.css';
import { getEmployees, getHRBonuses, saveHRBonus, deleteHRBonus } from '../../store';
import Swal from 'sweetalert2';
import HRDateFilter from '../../components/ui/HRDateFilter';

const getLocalDateStr = (d) => {
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().split('T')[0];
};

const HRBonuses = ({ user }) => {
  const [bonuses, setBonuses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
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
    type: 'مكافأة أداء',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    notes: ''
  });
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

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
    const [bonusesData, empsData] = await Promise.all([getHRBonuses(), getEmployees()]);
    setBonuses(bonusesData);
    setEmployees(empsData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === formData.employeeId);
    if (!emp) return Swal.fire('خطأ', 'الرجاء اختيار الموظف', 'error');

    await saveHRBonus({
      ...formData,
      amount: Number(formData.amount),
      employeeName: emp.name,
      department: emp.department || 'غير محدد'
    }, user);
    
    Swal.fire('نجاح', 'تم تسجيل المكافأة بنجاح', 'success');
    setShowModal(false);
    fetchData();
  };

  const handleDelete = async (id) => {
    const res = await Swal.fire({ title: 'تأكيد الحذف', text: 'هل أنت متأكد من حذف هذه المكافأة؟', icon: 'warning', showCancelButton: true });
    if (res.isConfirmed) {
      await deleteHRBonus(id, user);
      fetchData();
    }
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

  const sortedBonuses = [...bonuses].filter(b => b.status !== 'محذوف').filter(b => {
    if (searchTerm && String(b.employeeId) !== String(searchTerm)) return false;
    if (!b.date) return false;
    const reqDate = new Date(b.date).toISOString().split('T')[0];
    const reqMonth = reqDate.slice(0, 7);
    
    if (dateMode === 'day' && reqDate !== selectedDate) return false;
    if (dateMode === 'month' && reqMonth !== selectedMonth) return false;
    if (dateMode === 'range' && (reqDate < startDate || reqDate > endDate)) return false;
    
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

  return (
    <>
      <div className="glass-card flex flex-col min-h-[500px]">
        <div className="flex-responsive mb-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Gift className="text-emerald-500" /> المكافآت والبدلات
          </h2>
          <p className="text-muted text-sm mt-1">سجل المكافآت والبدلات المالية للموظفين</p>
        </div>
        <style>
          {`
            .emerald-btn {
              background: linear-gradient(135deg, #10b981, #047857) !important;
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3) !important;
            }
            .emerald-btn:hover {
              box-shadow: 0 6px 16px rgba(16, 185, 129, 0.5) !important;
              transform: translateY(-2px);
            }
          `}
        </style>
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
          <button 
          onClick={() => {
            setFormData({ employeeId: '', type: 'مكافأة أداء', date: new Date().toISOString().split('T')[0], amount: '', notes: '' });
            setShowModal(true);
          }}
          className="premium-add-btn emerald-btn whitespace-nowrap"
        >
          <Plus size={20} /> تسجيل مكافأة
        </button>
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
                <div className="flex items-center gap-2">النوع {renderSortIcon('type')}</div></th>
              <th className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() =>handleSort('amount')}>
                <div className="flex items-center gap-2">القيمة (د.أ) {renderSortIcon('amount')}</div></th>
              <th>ملاحظات / السبب</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedBonuses.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="text-muted text-sm">{b.date}</td>
                <td className="font-semibold">{b.employeeName}</td>
                <td className="text-muted text-sm">{b.department}</td>
                <td className="text-emerald-600 font-medium">{b.type}</td>
                <td className="font-bold text-emerald-600">{b.amount} د.أ</td>
                <td className="text-muted text-sm">{b.notes}</td>
                <td>
                  {!b.processedInPeriod && (
                    <button onClick={() => handleDelete(b.id)} className="icon-btn icon-btn-delete"><Trash2 size={18}/></button>
                  )}
                </td>
              </tr>
            ))}
            {bonuses.filter(b => b.status !== 'محذوف').length === 0 && (
              <tr><td colSpan="7" className="py-10 text-center text-muted">لا توجد مكافآت مسجلة</td></tr>
            )}
          </tbody>
        </table>
      </div>
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ zIndex: 10500 }}>
          <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-lg text-emerald-600">تسجيل مكافأة جديدة</h3>
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
                    {employees.filter(emp => emp.isActive !== false && emp.status !== 'مستقيل').map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label>نوع المكافأة</label>
                    <select value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value})} className="input-field">
                      <option>مكافأة أداء</option>
                      <option>الموظف المثالي</option>
                      <option>بونص شهري</option>
                      <option>مكافأة مبيعات</option>
                      <option>بدل تنقلات</option>
                      <option>أخرى</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>التاريخ</label>
                    <Flatpickr 
                      value={formData.date} 
                      onChange={(dates, dateStr) => setFormData({...formData, date: dateStr})} 
                      className="input-field" 
                      options={{ dateFormat: 'Y-m-d' }}
                      placeholder="اختر التاريخ"
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label>قيمة المكافأة (د.أ)</label>
                  <input type="number" required min="1" step="0.5" placeholder="المبلغ بالدينار" value={formData.amount} onChange={e=>setFormData({...formData, amount: e.target.value})} className="input-field" />
                </div>
                <div className="input-group">
                  <label>ملاحظات / السبب</label>
                  <textarea rows={2} required value={formData.notes} onChange={e=>setFormData({...formData, notes: e.target.value})} className="input-field"></textarea>
                </div>
              </div>
              <div style={{ padding: '1.25rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexShrink: 0, backgroundColor: '#fff', borderBottomLeftRadius: '0.5rem', borderBottomRightRadius: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">إلغاء</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>حفظ المكافأة</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default HRBonuses;
