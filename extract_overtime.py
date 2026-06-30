import re
import os
import shutil

# 1. Update AdminHR.jsx
with open('src/pages/hr/AdminHR.jsx', 'r', encoding='utf-8') as f:
    admin_hr_content = f.read()

admin_hr_content = admin_hr_content.replace(
    "import HRLeaves from './HRLeaves';",
    "import HRLeaves from './HRLeaves';\nimport HROvertime from './HROvertime';"
)

if "case 'overtime':" not in admin_hr_content:
    admin_hr_content = admin_hr_content.replace(
        "case 'missing-punches': return <HRMissingPunches user={user} />;",
        "case 'missing-punches': return <HRMissingPunches user={user} />;\n      case 'overtime': return <HROvertime user={user} />;"
    )

if "id: 'overtime'" not in admin_hr_content:
    admin_hr_content = admin_hr_content.replace(
        "{ id: 'leaves', label: 'الإجازات والمغادرات', icon: <Calendar size={18} /> },",
        "{ id: 'leaves', label: 'الإجازات والمغادرات', icon: <Calendar size={18} /> },\n    { id: 'overtime', label: 'العمل الإضافي', icon: <Clock size={18} /> },"
    )

with open('src/pages/hr/AdminHR.jsx', 'w', encoding='utf-8') as f:
    f.write(admin_hr_content)

# 2. Update HRLeaves.jsx (Remove tabs, keep only leaves where type !== 'بدل عمل إضافي')
with open('src/pages/hr/HRLeaves.jsx', 'r', encoding='utf-8') as f:
    hr_leaves_content = f.read()

# remove activeTab state
hr_leaves_content = hr_leaves_content.replace(
    "  const [activeTab, setActiveTab] = useState('leaves');\n", ""
)

# replace tabs UI
tabs_ui_pattern = r'<div className="flex gap-4 mb-6">.*?</div>\s*\{\(activeTab === \'leaves\' \|\| activeTab === \'overtime\'\) && \('
hr_leaves_content = re.sub(tabs_ui_pattern, '      <div className="glass-card flex flex-col min-h-[500px] animate-fade-in">', hr_leaves_content, flags=re.DOTALL)

# remove closing tag for tabs condition
hr_leaves_content = hr_leaves_content.replace(
"""          </tbody>
        </table>
      </div>
      </div>
      )}""",
"""          </tbody>
        </table>
      </div>
      </div>"""
)

# fix titles
hr_leaves_content = hr_leaves_content.replace(
    "{activeTab === 'leaves' ? 'الإجازات والمغادرات' : 'العمل الإضافي'}",
    "الإجازات والمغادرات"
)
hr_leaves_content = hr_leaves_content.replace(
    "{activeTab === 'leaves' ? 'إدارة طلبات إجازات ومغادرات الموظفين' : 'إدارة طلبات العمل الإضافي'}",
    "إدارة طلبات إجازات ومغادرات الموظفين"
)

# fix filters
hr_leaves_content = hr_leaves_content.replace(
    "sortedLeaves.filter(l => activeTab === 'leaves' ? l.type !== 'بدل عمل إضافي' : l.type === 'بدل عمل إضافي')",
    "sortedLeaves.filter(l => l.type !== 'بدل عمل إضافي')"
)

# remove type 'بدل عمل إضافي' from modal dropdown
hr_leaves_content = hr_leaves_content.replace(
    "<option>بدل عمل إضافي</option>",
    ""
)

with open('src/pages/hr/HRLeaves.jsx', 'w', encoding='utf-8') as f:
    f.write(hr_leaves_content)

# 3. Create HROvertime.jsx
overtime_content = """import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, XCircle, Calendar, Plus, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/airbnb.css';
import { getEmployees, getHRLeaves, saveHRLeave, deleteHRLeave } from '../../store';
import Swal from 'sweetalert2';

const HROvertime = ({ user }) => {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'بدل عمل إضافي',
    startDate: '',
    endDate: '',
    notes: '',
    status: 'معلق'
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
    if (!formData.startDate || !formData.endDate) {
      Swal.fire('تنبيه', 'الرجاء إدخال تاريخ البداية والنهاية للطلب', 'warning');
      return;
    }
    
    const emp = employees.find(e => e.id === formData.employeeId);
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
    await saveHRLeave({ ...leave, status: newStatus });
    fetchData();
  };

  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: 'هل أنت متأكد؟',
      text: 'لن تتمكن من التراجع عن الحذف',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    });
    if (res.isConfirmed) {
      await deleteHRLeave(id);
      fetchData();
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

  const overtimeRequests = sortedLeaves.filter(l => l.type === 'بدل عمل إضافي');

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
        <button 
          onClick={() => {
            setFormData({ employeeId: '', type: 'بدل عمل إضافي', startDate: '', endDate: '', notes: '', status: 'معلق' });
            setShowModal(true);
          }}
          className="premium-add-btn flex items-center gap-2 whitespace-nowrap"
        >
          <Plus size={18} /> تقديم طلب جديد
        </button>
      </div>

      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('createdAt')}>
                <div className="flex items-center gap-2">تاريخ الطلب {renderSortIcon('createdAt')}</div>
              </th>
              <th className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('employeeName')}>
                <div className="flex items-center gap-2">الموظف {renderSortIcon('employeeName')}</div>
              </th>
              <th className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('department')}>
                <div className="flex items-center gap-2">القسم {renderSortIcon('department')}</div>
              </th>
              <th>من تاريخ - إلى تاريخ</th>
              <th>السبب / الملاحظات</th>
              <th className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-2">الحالة {renderSortIcon('status')}</div>
              </th>
              <th>إجراءات الإدارة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {overtimeRequests.map((leave) => (
              <tr key={leave.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="text-muted text-sm">{new Date(leave.createdAt).toLocaleDateString('ar-EG')}</td>
                <td className="font-semibold">{leave.employeeName}</td>
                <td className="text-muted text-sm">{leave.department}</td>
                <td className="text-muted text-sm" dir="ltr">
                  {leave.startDate} {leave.endDate ? ' - ' + leave.endDate : ''}
                </td>
                <td className="max-w-[200px] whitespace-normal text-sm">{leave.notes}</td>
                <td>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 w-fit ${
                    leave.status === 'موافق' ? 'bg-emerald-50 text-emerald-600' :
                    leave.status === 'مرفوض' ? 'bg-rose-50 text-rose-600' :
                    'bg-amber-50 text-amber-600'
                  }`}>
                    {leave.status === 'موافق' && <CheckCircle size={12} />}
                    {leave.status === 'مرفوض' && <XCircle size={12} />}
                    {leave.status === 'معلق' && <Clock size={12} />}
                    {leave.status}
                  </span>
                </td>
                <td>
                  <div className="flex gap-2">
                    {leave.status === 'معلق' && (
                      <>
                        <button onClick={() => handleStatusChange(leave, 'موافق')} className="btn btn-outline btn-sm text-emerald-600" style={{ borderColor: '#059669' }}>موافقة</button>
                        <button onClick={() => handleStatusChange(leave, 'مرفوض')} className="btn btn-outline btn-sm text-rose-600" style={{ borderColor: '#e11d48' }}>رفض</button>
                      </>
                    )}
                    <button onClick={() => handleDelete(leave.id)} className="icon-btn icon-btn-delete">حذف</button>
                  </div>
                </td>
              </tr>
            ))}
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
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label>من تاريخ</label>
                    <Flatpickr 
                      value={formData.startDate} 
                      onChange={(dates, dateStr) => setFormData({...formData, startDate: dateStr})} 
                      className="input-field" 
                      options={{ dateFormat: 'Y-m-d' }}
                      placeholder="اختر التاريخ"
                    />
                  </div>
                  <div className="input-group">
                    <label>إلى تاريخ</label>
                    <Flatpickr 
                      value={formData.endDate} 
                      onChange={(dates, dateStr) => setFormData({...formData, endDate: dateStr})} 
                      className="input-field" 
                      options={{ dateFormat: 'Y-m-d' }}
                      placeholder="اختر التاريخ"
                    />
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
"""

with open('src/pages/hr/HROvertime.jsx', 'w', encoding='utf-8') as f:
    f.write(overtime_content)

print("Split Overtime into MAIN HR Navigation successfully.")
