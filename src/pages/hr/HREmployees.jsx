import React, { useState, useEffect } from 'react';
import { Users, Plus, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, X, Phone, Search, Edit2, UserCircle, Briefcase, Calendar, DollarSign, FileText } from 'lucide-react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/airbnb.css';
import { getEmployees, saveEmployee, deleteEmployee, getDepartments, getGlobalSettings, getHRAssets } from '../../store';
import Swal from 'sweetalert2';
import { matchesSearch, useDebounce } from '../../utils/searchEngine';
import { hasPermission } from '../../utils/permissions';

const deptMap = {
  sewing: 'الخياطة',
  cutting: 'القص',
  logistics: 'لوجستيات',
  packaging: 'تغليف',
  hr: 'الموارد البشرية',
  sales: 'الطلبيات',
  production: 'الإنتاج',
  inventory: 'المخزون',
  delivery: 'التوصيل',
  admin: 'الإدارة'
};

const getDeptName = (dept) => {
  if (!dept) return '-';
  const lowerDept = dept.toLowerCase();
  return deptMap[lowerDept] || dept;
};

const getNextAnnualRaiseDate = (joinDateStr) => {
  if (!joinDateStr) return '-';
  const joinDate = new Date(joinDateStr);
  if (isNaN(joinDate.getTime())) return '-';
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const nextRaise = new Date(joinDate);
  nextRaise.setFullYear(now.getFullYear());
  nextRaise.setHours(0, 0, 0, 0);
  
  if (nextRaise < now) {
    nextRaise.setFullYear(now.getFullYear() + 1);
  }
  
  return nextRaise.toISOString().split('T')[0];
};

const HREmployees = ({ user, onViewProfile }) => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState({});
  const [globalSettings, setGlobalSettings] = useState({ jobTitles: [], departmentsList: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
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

  const [formData, setFormData] = useState({
    id: '', name: '', jobTitle: '', department: '', administration: '', joinDate: '', dateOfBirth: '',
    basicSalary: 0, phone: '', employmentStatus: 'فعال',
    vacationBalance: 14, sickLeaveBalance: 14, allowedLeaveTypes: ['إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'], directManager: '', hrNotes: '',
    shiftStart: '08:00', shiftEnd: '16:00', workShiftName: '',
    hasSocialSecurity: false, socialSecuritySalary: 0, isHazardousProfession: false, workLocationId: '',
    useCustomAdvancePeriods: false, customAdvancePeriods: []
  });

  const fetchData = async () => {
    setLoading(true);
    const [emps, depts, settings] = await Promise.all([getEmployees(), getDepartments(), getGlobalSettings()]);
    setEmployees(emps);
    setDepartments(depts);
    setGlobalSettings(settings || { jobTitles: [], departmentsList: [] });
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpenModal = (emp = null) => {
    let nextId = 'EMP-0001';
    if (!emp && employees.length > 0) {
      let maxNum = 0;
      employees.forEach(e => {
        if (e.id && e.id.startsWith('EMP-')) {
          const num = parseInt(e.id.replace('EMP-', ''), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      nextId = `EMP-${String(maxNum + 1).padStart(4, '0')}`;
    }

    if (emp) {
      setEditingEmp(emp);
      setFormData({
        id: emp.id || '',
        name: emp.name || '',
        jobTitle: emp.jobTitle || '',
        department: emp.department || (emp.roles && emp.roles[0]) || '',
        administration: emp.administration || '',
        joinDate: emp.joinDate || '',
        dateOfBirth: emp.dateOfBirth || '',
        basicSalary: emp.basicSalary || 0,
        healthInsuranceAmount: emp.healthInsuranceAmount || 0,
        healthInsurancePayer: emp.healthInsurancePayer || 'employee',
        phone: emp.phone || '',
        employmentStatus: emp.employmentStatus || 'فعال',
        directManager: emp.directManager || emp.directManagerId || '',
        hrNotes: emp.hrNotes || '',
        vacationBalance: emp.vacationBalance !== undefined && emp.vacationBalance !== null && emp.vacationBalance !== '' ? emp.vacationBalance : 14, sickLeaveBalance: emp.sickLeaveBalance !== undefined && emp.sickLeaveBalance !== null && emp.sickLeaveBalance !== '' ? emp.sickLeaveBalance : 14, allowedLeaveTypes: emp.allowedLeaveTypes || ['إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'],
        shiftStart: emp.shiftStart || '08:00',
        shiftEnd: emp.shiftEnd || '16:00',
        workShiftName: emp.workShiftName || '',
        hasSocialSecurity: emp.hasSocialSecurity || false,
        socialSecuritySalary: emp.socialSecuritySalary || emp.basicSalary || 0,
        isHazardousProfession: emp.isHazardousProfession || false,
        workLocationId: emp.workLocationId || '',
        useCustomAdvancePeriods: emp.useCustomAdvancePeriods || false,
        customAdvancePeriods: emp.customAdvancePeriods || []
      });
    } else {
      setEditingEmp(null);
      setFormData({
        id: nextId, name: '', jobTitle: '', department: '', administration: '', joinDate: '', dateOfBirth: '',
        basicSalary: '', phone: '', employmentStatus: 'فعال', directManager: '', hrNotes: '', vacationBalance: '14', sickLeaveBalance: '14', allowedLeaveTypes: ['إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'],
        shiftStart: '08:00', shiftEnd: '16:00', workShiftName: '', hasSocialSecurity: false, socialSecuritySalary: '', isHazardousProfession: false, workLocationId: '',
        useCustomAdvancePeriods: false, customAdvancePeriods: []
      });
    }
    setShowModal(true);
  };

  const handleWorkShiftChange = (e) => {
    const shiftName = e.target.value;
    const selectedShift = globalSettings?.workShifts?.find(s => s.name === shiftName);
    if (selectedShift) {
      setFormData({
        ...formData,
        workShiftName: shiftName,
        shiftStart: selectedShift.startTime,
        shiftEnd: selectedShift.endTime
      });
    } else {
      setFormData({
        ...formData,
        workShiftName: '',
        shiftStart: '08:00',
        shiftEnd: '16:00'
      });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.id) {
      Swal.fire('خطأ', 'الرقم الوظيفي والاسم مطلوبان', 'error');
      return;
    }
    
    // Check for active assets if terminating
    if (editingEmp && editingEmp.employmentStatus === 'فعال' && (formData.employmentStatus === 'منتهي خدمات' || formData.employmentStatus === 'مستقيل')) {
      const allAssets = await getHRAssets();
      const activeAssets = allAssets.filter(a => (String(a.employeeId || '').trim() === String(editingEmp.id || '').trim() || String(a.employeeName || '').trim() === String(editingEmp.name || '').trim()) && a.status === 'نشطة');
      if (activeAssets.length > 0) {
        Swal.fire('لا يمكن إتمام العملية', `هذا الموظف لديه ${activeAssets.length} عهد نشطة. يجب استرجاع العهد أولاً قبل إنهاء الخدمات.`, 'warning');
        return;
      }
    }

    // Merge with existing employee data if editing to preserve passwords/permissions
    let empToSave = { ...formData };
    if (editingEmp) {
      empToSave = { ...editingEmp, ...formData };
      // Ensure the roles array is synced with the new department if it was changed
      empToSave.roles = [formData.department];
    } else {
      // New employee default password
      empToSave.password = '12345678';
      empToSave.level = 'employee';
      empToSave.roles = [formData.department];
    }

    empToSave.vacationBalance = formData.vacationBalance !== '' ? parseInt(formData.vacationBalance) : 0;
    empToSave.sickLeaveBalance = formData.sickLeaveBalance !== '' ? parseInt(formData.sickLeaveBalance) : 0;

    await saveEmployee(empToSave);
    Swal.fire('نجاح', 'تم حفظ بيانات الموظف', 'success');
    setShowModal(false);
    fetchData();
  };

  const debouncedSearch = useDebounce(search);
  const filteredEmployees = employees.filter(emp =>
    matchesSearch([emp.name, emp.id, emp.jobTitle, emp.department, emp.phone], debouncedSearch)
  ).sort((a, b) => {
    if (!sortConfig.key) return 0;
    let valA = a[sortConfig.key] || '';
    let valB = b[sortConfig.key] || '';
    
    // Numeric sort for ID
    if (sortConfig.key === 'id') {
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      }
    }
    
    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  if (loading) return <div className="text-center p-8">جاري التحميل...</div>;

  return (
    <>
      <div className="glass-card flex flex-col min-h-[500px]">
        {/* Header */}
      <div className="flex-responsive mb-4 border-b pb-4">
        <div style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, whiteSpace: 'nowrap' }}>
            <Users style={{ color: 'var(--primary)' }} /> قائمة الموظفين
          </h2>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto max-w-md mr-auto">
          <div className="search-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="بحث بالاسم، الرقم، المسمى..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field search-input"
            />
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="premium-add-btn"
          >
            <Plus size={18} /> إضافة موظف
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr className="bg-gray-50/50 text-gray-500 text-sm border-b border-gray-100">
              <th className="py-4 px-6 font-medium cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('id')}>
                <div className="flex items-center gap-2">الرقم {renderSortIcon('id')}</div>
              </th>
              <th className="py-4 px-6 font-medium cursor-pointer hover:bg-gray-100 transition-colors" onClick={() =>handleSort('name')}>
                <div className="flex items-center gap-2">الموظف {renderSortIcon('name')}</div></th>
              <th className="py-4 px-6 font-medium cursor-pointer hover:bg-gray-100 transition-colors" onClick={() =>handleSort('phone')}>
                <div className="flex items-center gap-2">رقم الهاتف {renderSortIcon('phone')}</div></th>
              <th className="py-4 px-6 font-medium cursor-pointer hover:bg-gray-100 transition-colors" onClick={() =>handleSort('jobTitle')}>
                <div className="flex items-center gap-2">المسمى الوظيفي {renderSortIcon('jobTitle')}</div></th>
              <th className="py-4 px-6 font-medium cursor-pointer hover:bg-gray-100 transition-colors" onClick={() =>handleSort('department')}>
                <div className="flex items-center gap-2">القسم {renderSortIcon('department')}</div></th>
              <th className="py-4 px-6 font-medium cursor-pointer hover:bg-gray-100 transition-colors" onClick={() =>handleSort('employmentStatus')}>
                <div className="flex items-center gap-2">الحالة {renderSortIcon('employmentStatus')}</div></th>
              <th className="py-4 px-6 font-medium cursor-pointer hover:bg-gray-100 transition-colors" onClick={() =>handleSort('joinDate')}>
                <div className="flex items-center gap-2">تاريخ التعيين {renderSortIcon('joinDate')}</div></th>
              <th className="py-4 px-6 font-medium">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredEmployees.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="py-3 px-6 text-slate-600 font-medium">{emp.id}</td>
                <td className="py-3 px-6">
                  <div>
                    <p className="font-semibold">{emp.name}</p>
                  </div>
                </td>
                <td className="py-3 px-6 text-slate-600">{emp.phone || 'بدون رقم'}</td>
                <td className="py-3 px-6 text-slate-600">{emp.jobTitle || 'غير محدد'}</td>
                <td className="py-3 px-6 text-slate-600">{getDeptName(emp.department || (emp.roles && emp.roles[0]))}</td>
                <td className="py-3 px-6">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                    emp.employmentStatus === 'فعال' ? 'bg-emerald-50 text-emerald-600' :
                    emp.employmentStatus === 'موقوف' ? 'bg-amber-50 text-amber-600' :
                    'bg-rose-50 text-rose-600'
                  }`}>
                    {emp.employmentStatus || 'فعال'}
                  </span>
                </td>
                <td className="py-3 px-6 text-slate-600">{emp.joinDate || '-'}</td>
                <td className="py-3 px-6">
                  <div className="flex gap-2">
                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenModal(emp); }} className="icon-btn icon-btn-edit" title="تعديل">
                      <Edit2 size={16} />
                    </button>
                    {/* Placeholder for future Profile View button */}
                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onViewProfile && onViewProfile(emp.id); }} className="icon-btn" style={{ color: '#4f46e5' }} title="ملف الموظف الشامل">
                      <FileText size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredEmployees.length === 0 && (
              <tr>
                <td colSpan="8" className="py-10 text-center text-muted">لا يوجد موظفين مسجلين</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </div>

      {/* Modal Add/Edit */}
      {showModal && (
        <div className="modal-overlay" style={{ zIndex: 10500 }}>
          <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
                {editingEmp ? <Edit2 className="text-primary" size={20}/> : <Plus className="text-primary" size={20}/>} 
                {editingEmp ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
              </h3>
              <button onClick={() => setShowModal(false)} className="icon-btn hover:bg-gray-100 rounded-full p-2 transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <form id="emp-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
              <div className="p-5" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'start', overflowY: 'auto', flexGrow: 1 }}>
                
                <div className="input-group">
                  <label>الرقم الوظيفي *</label>
                  <input type="text" required disabled value={formData.id} onChange={e=>setFormData({...formData, id: e.target.value})} className="input-field" />
                </div>

                <div className="input-group">
                  <label>اسم الموظف *</label>
                  <input type="text" required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="input-field" />
                </div>

                <div className="input-group">
                  <label>المسمى الوظيفي</label>
                  {globalSettings?.jobTitles?.length > 0 ? (
                    <select value={formData.jobTitle} onChange={e=>setFormData({...formData, jobTitle: e.target.value})} className="input-field">
                      <option value="">-- اختر المسمى الوظيفي --</option>
                      {globalSettings.jobTitles.map((title, idx) => <option key={idx} value={title}>{title}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={formData.jobTitle} onChange={e=>setFormData({...formData, jobTitle: e.target.value})} className="input-field" placeholder="أضف مسميات وظيفية من الإعدادات" />
                  )}
                </div>

                <div className="input-group">
                  <label>القسم</label>
                  {globalSettings?.departmentsList?.length > 0 ? (
                    <select value={formData.department} onChange={e=>setFormData({...formData, department: e.target.value})} className="input-field">
                      <option value="">-- اختر القسم --</option>
                      {globalSettings.departmentsList.map((dept, idx) => <option key={idx} value={dept}>{dept}</option>)}
                    </select>
                  ) : (
                    <select value={formData.department} onChange={e=>setFormData({...formData, department: e.target.value})} className="input-field">
                      <option value="">-- اختر القسم --</option>
                      {Object.entries(departments).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  )}
                </div>

                <div className="input-group">
                  <label>الإدارة</label>
                  <input type="text" value={formData.administration} onChange={e=>setFormData({...formData, administration: e.target.value})} className="input-field" placeholder="أدخل اسم الإدارة" />
                </div>

                <div className="input-group">
                  <label>رقم الهاتف</label>
                  <input type="text" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} className="input-field" />
                </div>

                <div className="input-group">
                  <label>تاريخ الميلاد</label>
                  <Flatpickr 
                    value={formData.dateOfBirth} 
                    onChange={(dates, dateStr) => setFormData({...formData, dateOfBirth: dateStr})} 
                    className="input-field" 
                    options={{ dateFormat: 'Y-m-d' }}
                    placeholder="اختر التاريخ"
                  />
                </div>

                <div className="input-group">
                  <label>تاريخ التعيين</label>
                  <Flatpickr 
                    value={formData.joinDate} 
                    onChange={(dates, dateStr) => setFormData({...formData, joinDate: dateStr})} 
                    className="input-field" 
                    options={{ dateFormat: 'Y-m-d' }}
                    placeholder="اختر التاريخ"
                  />
                </div>

                <div className="input-group">
                  <label>موعد الزيادة السنوية</label>
                  <Flatpickr 
                    value={formData.annualRaiseDate || getNextAnnualRaiseDate(formData.joinDate)} 
                    onChange={(dates, dateStr) => setFormData({...formData, annualRaiseDate: dateStr})} 
                    className="input-field bg-white" 
                    options={{ dateFormat: 'Y-m-d' }}
                    style={{ color: '#0f766e', fontWeight: 'bold' }}
                    placeholder="اختر التاريخ"
                  />
                </div>

                <div className="input-group">
                  <label>الراتب الأساسي</label>
                  <input type="number" value={formData.basicSalary} onChange={e=>{
                    const newBasic = e.target.value;
                    setFormData(prev => ({
                      ...prev, 
                      basicSalary: newBasic,
                      socialSecuritySalary: prev.hasSocialSecurity && !prev.socialSecuritySalary ? newBasic : prev.socialSecuritySalary
                    }));
                  }} className="input-field" />
                </div>

                <div className="input-group">
                  <label>التأمين الصحي الشهري (د.أ)</label>
                  <input type="number" min="0" step="0.01" value={formData.healthInsuranceAmount || 0} onChange={event => setFormData({ ...formData, healthInsuranceAmount: Number(event.target.value) })} className="input-field" />
                  <select value={formData.healthInsurancePayer || 'employee'} onChange={event => setFormData({ ...formData, healthInsurancePayer: event.target.value })} className="input-field">
                    <option value="employee">يخصم من الموظف</option>
                    <option value="company">تتحمله الشركة</option>
                  </select>
                </div>
                <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label className="font-bold flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4" 
                      checked={formData.hasSocialSecurity}
                      onChange={e => setFormData({
                        ...formData, 
                        hasSocialSecurity: e.target.checked,
                        socialSecuritySalary: e.target.checked && !formData.socialSecuritySalary ? formData.basicSalary : formData.socialSecuritySalary
                      })}
                    />
                    مُسجل في الضمان الاجتماعي
                  </label>
                  {formData.hasSocialSecurity && (
                    <div className="mt-2 space-y-3 border-t border-slate-200 pt-3">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">الراتب الخاضع للضمان</label>
                        <input 
                          type="number" 
                          value={formData.socialSecuritySalary} 
                          onChange={e => setFormData({...formData, socialSecuritySalary: e.target.value})} 
                          className="input-field" 
                          placeholder="اتركه فارغاً لاستخدام الراتب الأساسي"
                        />
                      </div>
                      <label className="font-bold flex items-center gap-2 text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 accent-rose-500" 
                          checked={formData.isHazardousProfession}
                          onChange={e => setFormData({...formData, isHazardousProfession: e.target.checked})}
                        />
                        يعمل ضمن مهن خطرة
                      </label>
                    </div>
                  )}
                </div>

                <div className="input-group">
                  <label>المدير المباشر</label>
                  <select value={formData.directManager} onChange={e=>setFormData({...formData, directManager: e.target.value})} className="input-field">
                    <option value="">-- لا يوجد مدير --</option>
                    {employees.filter(emp => emp.level === 'مشرف' || emp.level === 'admin' || emp.level === 'إدارة').map(emp => (
                      <option key={emp.id} value={emp.name}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>الحالة الوظيفية</label>
                  <select value={formData.employmentStatus} onChange={e=>setFormData({...formData, employmentStatus: e.target.value})} className="input-field">
                    <option value="فعال">فعال</option>
                    <option value="موقوف">موقوف</option>
                    <option value="مستقيل">مستقيل</option>
                    <option value="منتهي خدمات">منتهي خدمات</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>رصيد الإجازات السنوي</label>
                  <input type="number" value={formData.vacationBalance} onChange={e=>setFormData({...formData, vacationBalance: e.target.value})} className="input-field" />
                </div>

                <div className="input-group">
                  <label>رصيد الإجازات المرضية</label>
                  <input type="number" value={formData.sickLeaveBalance} onChange={e=>setFormData({...formData, sickLeaveBalance: e.target.value})} className="input-field" />
                </div>

                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label>صلاحيات أنواع الإجازة والمغادرة</label>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    {['إجازة سنوية', 'إجازة مرضية', 'مغادرة خاصة', 'مغادرة عمل', 'إجازة غير مدفوعة', 'بدل عمل إضافي', 'مغادرة الدخان'].map(type => (
                      <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={formData.allowedLeaveTypes?.includes(type)} onChange={(e) => {
                          const current = formData.allowedLeaveTypes || [];
                          if (e.target.checked) setFormData({...formData, allowedLeaveTypes: [...current, type]});
                          else setFormData({...formData, allowedLeaveTypes: current.filter(t => t !== type)});
                        }} className="w-4 h-4" />
                        {type}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="input-group">
                  <label>فترة الدوام</label>
                  {globalSettings?.workShifts?.length > 0 ? (
                    <select value={formData.workShiftName} onChange={handleWorkShiftChange} className="input-field">
                      <option value="">-- اختر فترة الدوام --</option>
                      {globalSettings.workShifts.map((shift, idx) => (
                        <option key={idx} value={shift.name}>{shift.name} ({shift.startTime} - {shift.endTime})</option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 flex items-center gap-2">
                      <span>لا يوجد فترات دوام مضافة، يرجى إضافتها من الإعدادات.</span>
                    </div>
                  )}
                </div>
                
                <div className="input-group">
                  <label>موقع البصمة (الفرع)</label>
                  {globalSettings?.workLocations?.length > 0 ? (
                    <select value={formData.workLocationId} onChange={e=>setFormData({...formData, workLocationId: e.target.value})} className="input-field">
                      <option value="">-- جميع الفروع / غير محدد --</option>
                      <option value="anywhere">-- السماح بالبصمة من أي مكان (بدون قيود) --</option>
                      {globalSettings.workLocations.map((loc, idx) => (
                        <option key={loc.id || idx} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 flex items-center gap-2">
                      <span>لا يوجد فروع مضافة (يتم إضافتها من الإعدادات العامة)</span>
                    </div>
                  )}
                </div>

                <div className="input-group">
                  <label>وقت الدخول المعتاد</label>
                  <input type="time" value={formData.shiftStart} onChange={e=>setFormData({...formData, shiftStart: e.target.value})} className="input-field" disabled={!!formData.workShiftName} />
                </div>

                <div className="input-group">
                  <label>وقت الخروج المعتاد</label>
                  <input type="time" value={formData.shiftEnd} onChange={e=>setFormData({...formData, shiftEnd: e.target.value})} className="input-field" disabled={!!formData.workShiftName} />
                </div>
                
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="font-bold flex items-center gap-2 cursor-pointer">
                     <input 
                       type="checkbox" 
                       className="w-4 h-4" 
                       checked={formData.allowAdvances !== false}
                       onChange={(e) => setFormData({...formData, allowAdvances: e.target.checked})}
                     />
                     صلاحية طلب السلف (السماح للموظف بتقديم طلب سلفة من حسابه)
                  </label>
                </div>

                {(() => {
                  let advancePeriodMode = 'default';
                  if (formData.useCustomAdvancePeriods && formData.customAdvancePeriods && formData.customAdvancePeriods.length > 0) {
                     const customP = formData.customAdvancePeriods[0];
                     const globalPeriods = globalSettings?.hrSettings?.advancePeriods || [{fromDay: 15, toDay: 20}];
                     const globalIndex = globalPeriods.findIndex(p => p.fromDay === customP.fromDay && p.toDay === customP.toDay);
                     if (globalIndex !== -1 && formData.customAdvancePeriods.length === 1) {
                         advancePeriodMode = `global_${globalIndex}`;
                     } else {
                         advancePeriodMode = 'custom';
                     }
                  }

                  const globalPeriodsList = globalSettings?.hrSettings?.advancePeriods || [{fromDay: 15, toDay: 20}];

                  const handleAdvModeChange = (e) => {
                     const val = e.target.value;
                     if (val === 'default') {
                         setFormData({...formData, useCustomAdvancePeriods: false, customAdvancePeriods: []});
                     } else if (val === 'custom') {
                         setFormData({...formData, useCustomAdvancePeriods: true, customAdvancePeriods: [{fromDay: 1, toDay: 5}]});
                     } else if (val.startsWith('global_')) {
                         const idx = parseInt(val.split('_')[1]);
                         setFormData({...formData, useCustomAdvancePeriods: true, customAdvancePeriods: [globalPeriodsList[idx]]});
                     }
                  };

                  return formData.allowAdvances !== false && (
                    <div className="input-group" style={{ gridColumn: '1 / -1', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '15px', borderRadius: '12px' }}>
                      <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#166534', marginBottom: '8px', display: 'block' }}>
                        فترة السماح لتقديم السلف الخاصة بالموظف
                      </label>
                      <select 
                        value={advancePeriodMode} 
                        onChange={handleAdvModeChange} 
                        className="input-field" 
                        style={{ borderColor: '#bbf7d0', backgroundColor: '#fff', color: '#14532d', fontWeight: '500' }}
                      >
                        <option value="default">جميع الفترات المعتمدة للإدارة (الافتراضي)</option>
                        {globalPeriodsList.map((p, idx) => (
                          <option key={idx} value={`global_${idx}`}>الفترة المعتمدة: من يوم {p.fromDay} إلى {p.toDay} من الشهر</option>
                        ))}
                        <option value="custom">تحديد فترة مخصصة مختلفة...</option>
                      </select>

                      {advancePeriodMode === 'custom' && (
                        <div className="flex flex-col gap-3 mt-4 p-4" style={{ background: '#fff', border: '1px dashed #bbf7d0', borderRadius: '8px' }}>
                          <p className="text-xs text-green-700">حدد الفترات المخصصة لهذا الموظف بالتحديد:</p>
                          {(formData.customAdvancePeriods || []).map((period, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-green-50 p-3 rounded-lg border border-green-200">
                              <span className="text-sm font-bold text-green-800">الفترة {idx + 1}:</span>
                              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-green-200">
                                <label className="text-sm text-green-700 font-medium whitespace-nowrap">من يوم</label>
                                <input type="number" min="1" max="31" className="w-16 py-1 px-2 text-center text-green-900 font-bold border-none outline-none bg-transparent" 
                                  value={period.fromDay || 1} 
                                  onChange={(e) => {
                                    const newPeriods = [...(formData.customAdvancePeriods || [])];
                                    newPeriods[idx] = { ...newPeriods[idx], fromDay: Number(e.target.value) };
                                    setFormData({...formData, customAdvancePeriods: newPeriods});
                                  }} 
                                />
                              </div>
                              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-green-200">
                                <label className="text-sm text-green-700 font-medium whitespace-nowrap">إلى يوم</label>
                                <input type="number" min="1" max="31" className="w-16 py-1 px-2 text-center text-green-900 font-bold border-none outline-none bg-transparent" 
                                  value={period.toDay || 5} 
                                  onChange={(e) => {
                                    const newPeriods = [...(formData.customAdvancePeriods || [])];
                                    newPeriods[idx] = { ...newPeriods[idx], toDay: Number(e.target.value) };
                                    setFormData({...formData, customAdvancePeriods: newPeriods});
                                  }} 
                                />
                              </div>
                              <button type="button" onClick={() => {
                                const newPeriods = [...(formData.customAdvancePeriods || [])];
                                newPeriods.splice(idx, 1);
                                setFormData({...formData, customAdvancePeriods: newPeriods});
                              }} className="icon-btn hover:bg-rose-100 p-2 rounded-full transition-colors ml-auto">
                                <Trash2 size={16} className="text-rose-500" />
                              </button>
                            </div>
                          ))}
                          <button type="button" onClick={() => {
                            const newPeriods = [...(formData.customAdvancePeriods || []), { fromDay: 1, toDay: 5 }];
                            setFormData({...formData, customAdvancePeriods: newPeriods});
                          }} className="btn btn-outline border-dashed text-green-600 border-green-300 hover:bg-green-50 flex items-center justify-center gap-2 py-2 mt-1 w-max" style={{ fontSize: '0.85rem' }}>
                            <Plus size={16} /> إضافة فترة أخرى مخصصة
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}


                
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label>ملاحظات</label>
                  <textarea rows={2} value={formData.hrNotes} onChange={e=>setFormData({...formData, hrNotes: e.target.value})} className="input-field" style={{ minHeight: '100px' }}></textarea>
                </div>
              </div>
              <div style={{ padding: '1.25rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexShrink: 0, backgroundColor: '#fff', borderBottomLeftRadius: '0.5rem', borderBottomRightRadius: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ البيانات</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default HREmployees;
