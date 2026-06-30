import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Trash2, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/airbnb.css';
import { getEmployees, getHRViolations, saveHRViolation, deleteHRViolation } from '../../store';
import Swal from 'sweetalert2';

const HRViolations = ({ user }) => {
  const [violations, setViolations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
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

  const fetchData = async () => {
    setLoading(true);
    const [violationsData, empsData] = await Promise.all([getHRViolations(), getEmployees()]);
    setViolations(violationsData);
    setEmployees(empsData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
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
  };

  const handleDelete = async (id) => {
    const res = await Swal.fire({ title: 'تأكيد الحذف', icon: 'warning', showCancelButton: true });
    if (res.isConfirmed) {
      await deleteHRViolation(id);
      fetchData();
    }
  };

  if (loading) return <div className="text-center p-8">جاري التحميل...</div>;

  const sortedViolations = [...violations].filter(v => v.status !== 'محذوف').sort((a, b) => {
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
            <AlertTriangle className="text-primary" /> المخالفات والخصومات
          </h2>
          <p className="text-muted text-sm mt-1">سجل المخالفات الإدارية والخصومات المالية للموظفين</p>
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
        <button 
          onClick={() => {
            setFormData({ employeeId: '', type: 'تأخير', date: new Date().toISOString().split('T')[0], action: 'تنبيه', deductionAmount: '', notes: '' });
            setShowModal(true);
          }}
          className="premium-add-btn blood-red-btn whitespace-nowrap"
        >
          <Plus size={20} /> تسجيل مخالفة
        </button>
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
                <td className="text-muted text-sm">{v.notes}</td>
                <td>
                  {!v.processedInPeriod && (
                    <button onClick={() => handleDelete(v.id)} className="icon-btn icon-btn-delete"><Trash2 size={18}/></button>
                  )}
                </td>
              </tr>
            ))}
            {violations.filter(v => v.status !== 'محذوف').length === 0 && (
              <tr><td colSpan="8" className="py-10 text-center text-muted">لا توجد مخالفات مسجلة</td></tr>
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
                    {employees.filter(emp => emp.isActive !== false && emp.status !== 'مستقيل').map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
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
