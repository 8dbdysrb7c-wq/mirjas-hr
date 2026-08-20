import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, X, Settings } from 'lucide-react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/airbnb.css';
import { getHolidays, saveHoliday, deleteHoliday, getDepartments, getGlobalSettings } from '../../store';
import Swal from 'sweetalert2';
import { matchesSearch, useDebounce } from '../../utils/searchEngine';

const HRHolidays = ({ user }) => {
  const [holidays, setHolidays] = useState([]);
  const [departments, setDepartments] = useState({});
  const [globalSettings, setGlobalSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'fromDate', direction: 'desc' });

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
    id: '', code: '', descriptionAr: '', descriptionEn: '', fromDate: '', toDate: '',
    dateType: 'ثابت', type: 'رسمية', targetAudience: 'all', isActive: true,
    useDefaultSettings: true,
    customSettings: {
      isPaid: true,
      attendanceCompensation: 'alternative_day_and_overtime',
      affectsMonthlyWorkDays: false,
      exemptFromPunch: true
    }
  });

  const fetchData = async () => {
    setLoading(true);
    const [hols, depts, settings] = await Promise.all([getHolidays(), getDepartments(), getGlobalSettings()]);
    setHolidays(hols);
    setDepartments(depts || {});
    setGlobalSettings(settings);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpenModal = (hol = null) => {
    if (hol) {
      setEditingHoliday(hol);
      setFormData({
        id: hol.id || '',
        code: hol.code || '',
        descriptionAr: hol.descriptionAr || '',
        descriptionEn: hol.descriptionEn || '',
        fromDate: hol.fromDate || '',
        toDate: hol.toDate || '',
        dateType: hol.dateType || 'ثابت',
        type: hol.type || 'رسمية',
        targetAudience: hol.targetAudience || 'all',
        isActive: hol.isActive !== false,
        useDefaultSettings: hol.useDefaultSettings !== false,
        customSettings: hol.customSettings || {
          isPaid: true,
          attendanceCompensation: 'alternative_day_and_overtime',
          affectsMonthlyWorkDays: false,
          exemptFromPunch: true
        }
      });
    } else {
      setEditingHoliday(null);
      setFormData({
        id: '', code: '', descriptionAr: '', descriptionEn: '', fromDate: '', toDate: '',
        dateType: 'ثابت', type: 'رسمية', targetAudience: 'all', isActive: true,
        useDefaultSettings: true,
        customSettings: {
          isPaid: true,
          attendanceCompensation: 'alternative_day_and_overtime',
          affectsMonthlyWorkDays: false,
          exemptFromPunch: true
        }
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.descriptionAr || !formData.fromDate || !formData.toDate) {
      Swal.fire('خطأ', 'الوصف والتاريخ مطلوبان', 'error');
      return;
    }
    
    await saveHoliday(formData);
    Swal.fire('نجاح', 'تم حفظ العطلة', 'success');
    setShowModal(false);
    fetchData();
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'هل أنت متأكد؟',
      text: "لن تتمكن من استرجاع هذه العطلة!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    });
    if (result.isConfirmed) {
      await deleteHoliday(id);
      Swal.fire('تم الحذف!', 'تم حذف العطلة.', 'success');
      fetchData();
    }
  };

  const debouncedSearch = useDebounce(search);
  const filteredHolidays = holidays.filter(hol =>
    matchesSearch([hol.descriptionAr, hol.descriptionEn, hol.code], debouncedSearch)
  ).sort((a, b) => {
    if (!sortConfig.key) return 0;
    let valA = a[sortConfig.key] || '';
    let valB = b[sortConfig.key] || '';
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
              <Calendar style={{ color: 'var(--primary)' }} /> تهيئة العطل
            </h2>
            <p className="text-muted text-sm mt-1">إدارة العطل الرسمية وأيام الإجازات للموظفين</p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto max-w-md mr-auto">
            <div className="search-wrapper">
              <Search className="search-icon" size={18} />
              <input 
                type="text" 
                placeholder="بحث..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field search-input"
              />
            </div>
            <button 
              onClick={() => handleOpenModal()}
              className="premium-add-btn whitespace-nowrap"
            >
              <Plus size={18} /> إنشاء جديد
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr className="bg-gray-50/50 text-gray-500 text-sm border-b border-gray-100">
                <th className="py-4 px-6 font-medium cursor-pointer hover:bg-gray-100" onClick={() => handleSort('code')}>
                  <div className="flex items-center gap-2">الرمز {renderSortIcon('code')}</div>
                </th>
                <th className="py-4 px-6 font-medium cursor-pointer hover:bg-gray-100" onClick={() =>handleSort('descriptionEn')}>
                  <div className="flex items-center gap-2">الوصف - إنجليزي {renderSortIcon('descriptionEn')}</div></th>
                <th className="py-4 px-6 font-medium cursor-pointer hover:bg-gray-100" onClick={() =>handleSort('descriptionAr')}>
                  <div className="flex items-center gap-2">الوصف - العربية {renderSortIcon('descriptionAr')}</div></th>
                <th className="py-4 px-6 font-medium cursor-pointer hover:bg-gray-100" onClick={() =>handleSort('fromDate')}>
                  <div className="flex items-center gap-2">من تاريخ {renderSortIcon('fromDate')}</div></th>
                <th className="py-4 px-6 font-medium cursor-pointer hover:bg-gray-100" onClick={() =>handleSort('toDate')}>
                  <div className="flex items-center gap-2">إلى تاريخ {renderSortIcon('toDate')}</div></th>
                <th className="py-4 px-6 font-medium cursor-pointer hover:bg-gray-100" onClick={() =>handleSort('dateType')}>
                  <div className="flex items-center gap-2">بناءً على {renderSortIcon('dateType')}</div></th>
                <th className="py-4 px-6 font-medium cursor-pointer hover:bg-gray-100" onClick={() =>handleSort('isActive')}>
                  <div className="flex items-center gap-2">فعال {renderSortIcon('isActive')}</div></th>
                <th className="py-4 px-6 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredHolidays.map((hol) => (
                <tr key={hol.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-6 text-slate-600 font-medium">{hol.code}</td>
                  <td className="py-3 px-6 text-slate-600">{hol.descriptionEn}</td>
                  <td className="py-3 px-6 font-semibold">{hol.descriptionAr}</td>
                  <td className="py-3 px-6 text-slate-600">{hol.fromDate}</td>
                  <td className="py-3 px-6 text-slate-600">{hol.toDate}</td>
                  <td className="py-3 px-6 text-slate-600">{hol.dateType}</td>
                  <td className="py-3 px-6">
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${hol.isActive !== false ? 'bg-primary' : 'bg-slate-300'}`}>
                      <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full transition-all ${hol.isActive !== false ? 'left-1' : 'right-1'}`}></div>
                    </div>
                  </td>
                  <td className="py-3 px-6">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleOpenModal(hol)} className="icon-btn icon-btn-edit" title="تعديل">
                        <Edit2 size={16} />
                      </button>
                      <button type="button" onClick={() => handleDelete(hol.id)} className="icon-btn icon-btn-delete" title="حذف">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredHolidays.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-muted">لا يوجد عطل مسجلة</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" style={{ zIndex: 10500 }}>
          <div className="modal-content" style={{ maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
                {editingHoliday ? <Edit2 className="text-primary" size={20}/> : <Plus className="text-primary" size={20}/>} 
                {editingHoliday ? 'تعديل بيانات العطلة' : 'إنشاء عطلة جديدة'}
              </h3>
              <button onClick={() => setShowModal(false)} className="icon-btn hover:bg-gray-100 rounded-full p-2 transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
              <div className="p-5" style={{ overflowY: 'auto', flexGrow: 1 }}>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="input-group">
                    <label>الرمز</label>
                    <input type="text" value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value})} className="input-field" />
                  </div>
                  <div className="input-group">
                    <label>بناءً على</label>
                    <select value={formData.dateType} onChange={e=>setFormData({...formData, dateType: e.target.value})} className="input-field">
                      <option value="ثابت">ثابت (التاريخ يعتمد كما هو)</option>
                      <option value="متغير">متغير (يعتمد على الرؤية الفلكية)</option>
                    </select>
                  </div>
                  
                  <div className="input-group">
                    <label>الوصف - العربية *</label>
                    <input type="text" required value={formData.descriptionAr} onChange={e=>setFormData({...formData, descriptionAr: e.target.value})} className="input-field" />
                  </div>
                  <div className="input-group">
                    <label>الوصف - إنجليزي</label>
                    <input type="text" value={formData.descriptionEn} onChange={e=>setFormData({...formData, descriptionEn: e.target.value})} className="input-field" />
                  </div>

                  <div className="input-group">
                    <label>من تاريخ *</label>
                    <Flatpickr 
                      value={formData.fromDate} 
                      onChange={(dates, dateStr) => setFormData({...formData, fromDate: dateStr})} 
                      className="input-field" 
                      options={{ dateFormat: 'Y-m-d' }}
                      placeholder="اختر التاريخ"
                    />
                  </div>
                  <div className="input-group">
                    <label>إلى تاريخ *</label>
                    <Flatpickr 
                      value={formData.toDate} 
                      onChange={(dates, dateStr) => setFormData({...formData, toDate: dateStr})} 
                      className="input-field" 
                      options={{ dateFormat: 'Y-m-d' }}
                      placeholder="اختر التاريخ"
                    />
                  </div>

                  <div className="input-group">
                    <label>نوع العطلة</label>
                    <select value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value})} className="input-field">
                      <option value="رسمية">رسمية</option>
                      <option value="دينية">دينية</option>
                      <option value="وطنية">وطنية</option>
                      <option value="داخلية">داخلية للشركة</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label>تطبق على</label>
                    <select value={formData.targetAudience} onChange={e=>setFormData({...formData, targetAudience: e.target.value})} className="input-field">
                      <option value="all">جميع الموظفين</option>
                      {globalSettings?.departmentsList?.length > 0 ? (
                        globalSettings.departmentsList.map((dept, idx) => <option key={idx} value={`dept_${dept}`}>قسم: {dept}</option>)
                      ) : (
                        Object.entries(departments).map(([k,v]) => <option key={k} value={`dept_${k}`}>قسم: {v}</option>)
                      )}
                    </select>
                  </div>
                  
                  <div className="input-group flex flex-col justify-center">
                     <label className="flex items-center gap-2 cursor-pointer font-bold">
                        <input type="checkbox" checked={formData.isActive} onChange={e=>setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 text-primary rounded focus:ring-primary" />
                        العطلة فعالة ونشطة
                     </label>
                  </div>
                </div>

                <hr className="my-6 border-slate-100" />
                
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Settings className="text-primary" size={18} /> إعدادات التأثير على الرواتب والحضور
                </h4>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                  <label className="flex items-center gap-3 cursor-pointer mb-2">
                    <input type="checkbox" checked={formData.useDefaultSettings} onChange={e=>setFormData({...formData, useDefaultSettings: e.target.checked})} className="w-5 h-5 text-primary rounded focus:ring-primary" />
                    <span className="font-bold">استخدام السياسة الافتراضية للعطل (من إعدادات الموقع)</span>
                  </label>
                  <p className="text-sm text-slate-500 mr-8">تعطيل هذا الخيار يسمح لك بتخصيص قوانين فريدة لهذه العطلة فقط.</p>
                </div>

                {!formData.useDefaultSettings && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-4 rounded-xl border border-primary/20 shadow-sm shadow-primary/5">
                    <div className="input-group">
                      <label className="font-bold flex items-center gap-2">
                         <input type="checkbox" checked={formData.customSettings.isPaid} onChange={e=>setFormData({...formData, customSettings: {...formData.customSettings, isPaid: e.target.checked}})} className="w-4 h-4" />
                         تعتبر يوم دوام مدفوع الأجر
                      </label>
                      <p className="text-xs text-slate-500 mt-1 mr-6">لن يتم خصم غياب إذا لم يحضر الموظف.</p>
                    </div>

                    <div className="input-group">
                      <label className="font-bold flex items-center gap-2">
                         <input type="checkbox" checked={formData.customSettings.exemptFromPunch} onChange={e=>setFormData({...formData, customSettings: {...formData.customSettings, exemptFromPunch: e.target.checked}})} className="w-4 h-4" />
                         إعفاء الموظف من الختم
                      </label>
                      <p className="text-xs text-slate-500 mt-1 mr-6">لن يسجل النظام ختمات ناقصة في هذا اليوم.</p>
                    </div>

                    <div className="input-group">
                      <label className="font-bold flex items-center gap-2">
                         <input type="checkbox" checked={formData.customSettings.affectsMonthlyWorkDays} onChange={e=>setFormData({...formData, customSettings: {...formData.customSettings, affectsMonthlyWorkDays: e.target.checked}})} className="w-4 h-4" />
                         تؤثر على عدد أيام العمل الشهرية
                      </label>
                    </div>

                    <div className="input-group">
                      <label className="font-bold">حضور الموظف في العطلة يستحق:</label>
                      <select value={formData.customSettings.attendanceCompensation} onChange={e=>setFormData({...formData, customSettings: {...formData.customSettings, attendanceCompensation: e.target.value}})} className="input-field mt-1">
                        <option value="none">لا شيء</option>
                        <option value="alternative_day">يوم بديل (يضاف لرصيد إجازاته)</option>
                        <option value="overtime_1_25">أجر إضافي فقط (الساعة بساعة وربع 1.25)</option>
                        <option value="overtime_1_5">أجر إضافي فقط (الساعة بساعة ونصف 1.5)</option>
                        <option value="alternative_day_and_overtime_1_25">يوم بديل + أجر إضافي (الساعة بساعة وربع 1.25)</option>
                        <option value="alternative_day_and_overtime_1_5">يوم بديل + أجر إضافي (الساعة بساعة ونصف 1.5)</option>
                      </select>
                    </div>
                  </div>
                )}

              </div>
              <div style={{ padding: '1.25rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexShrink: 0, backgroundColor: '#fff', borderBottomLeftRadius: '0.5rem', borderBottomRightRadius: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ العطلة</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default HRHolidays;
