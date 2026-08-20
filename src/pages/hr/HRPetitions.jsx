import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Check, X, Search, Filter, MessageSquare, Plus, Edit2, Trash2, ShieldAlert, User, Eye
} from 'lucide-react';
import Select from '../../components/SearchSelect';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { TableContainer, TableHead, TableRow, TableHeader, TableBody, TableCell, Badge } from '../../components/ui';
import HRDateFilter from '../../components/ui/HRDateFilter';
import { getHRPetitions, saveHRPetition, createNotification, getEmployees } from '../../store';
import { triggerWhatsAppRouting } from '../../services/whatsappRouter';

const MySwal = withReactContent(Swal);

const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    borderColor: state.isFocused ? '#1a8d9b' : '#e2e8f0',
    boxShadow: state.isFocused ? '0 0 0 1px #1a8d9b' : 'none',
    '&:hover': { borderColor: '#1a8d9b' },
    minHeight: '42px',
    borderRadius: '12px',
    background: '#f8fafc',
    textAlign: 'right'
  }),
  menu: (provided) => ({ ...provided, zIndex: 9999, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#1a8d9b' : state.isFocused ? '#f1f5f9' : 'white',
    color: state.isSelected ? 'white' : '#1e293b',
    cursor: 'pointer',
    padding: '10px 16px',
    fontSize: '0.9rem',
    fontWeight: state.isSelected ? 'bold' : 'normal',
    textAlign: 'right'
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (provided) => ({ ...provided, color: '#94a3b8', '&:hover': { color: '#1a8d9b' } })
};

export default function HRPetitions({ user }) {
  const [petitions, setPetitions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('معلق');

  // Date Filter State
  const [dateMode, setDateMode] = useState('month');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const loadPetitions = async () => {
    setIsLoading(true);
    try {
      const [data, emps] = await Promise.all([getHRPetitions(), getEmployees()]);
      setPetitions(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setEmployees(emps);
    } catch (error) {
      console.error(error);
      MySwal.fire('خطأ', 'تعذر تحميل بيانات الاستدعاءات', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPetitions();
  }, []);

  const handleAction = async (petition, action) => {
    const { value: notes } = await MySwal.fire({
      title: action === 'approve' ? 'موافقة على الاستدعاء' : 'رفض الاستدعاء',
      input: 'textarea',
      inputLabel: action === 'approve' ? 'ملاحظات الإدارة (إجباري)' : 'سبب الرفض (إجباري)',
      inputPlaceholder: 'أدخل الملاحظات هنا...',
      inputValidator: (value) => {
        if (!value) {
          return 'يجب إدخال الملاحظات للموظف!';
        }
      },
      showCancelButton: true,
      confirmButtonText: 'حفظ',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: action === 'approve' ? '#10b981' : '#ef4444'
    });

    if (notes) {
      try {
        const status = action === 'approve' ? 'مقبول' : 'مرفوض';
        const updatedPetition = {
          ...petition,
          status,
          [action === 'approve' ? 'approvalReason' : 'rejectionReason']: notes,
          actionBy: user.name,
          actionDate: new Date().toISOString()
        };

        await saveHRPetition(updatedPetition);

        await createNotification({
          settingKey: 'petitions',
          targetEmployeeId: petition.employeeId,
          moduleKey: 'hr',
          moduleLabel: 'الموارد البشرية',
          title: `تم ${action === 'approve' ? 'قبول' : 'رفض'} طلب الاستدعاء`,
          message: `عنوان الطلب: ${petition.title}\nالملاحظات: ${notes}`,
          target: { tab: 'hr_requests' }
        });
        
        triggerWhatsAppRouting('petitions', 'status_update', {
          employeeId: petition.employeeId,
          employeeName: petition.employeeName,
          title: petition.title,
          status: status,
          adminNotes: notes
        });

        MySwal.fire('نجاح', 'تم تحديث حالة الطلب بنجاح', 'success');
        loadPetitions();
      } catch (err) {
        console.error(err);
        MySwal.fire('خطأ', 'حدث خطأ أثناء تحديث حالة الطلب', 'error');
      }
    }
  };

  const handleView = (petition) => {
    MySwal.fire({
      title: petition.title,
      html: `
        <div style="text-align: right; direction: rtl; line-height: 1.6;">
          <div style="margin-bottom: 15px; color: #475569; white-space: pre-wrap; font-size: 15px;">${petition.text || 'لا يوجد نص'}</div>
          ${(petition.approvalReason || petition.rejectionReason) ? `
            <div style="margin-top: 15px; padding: 10px; border-radius: 8px; border: 1px solid ${petition.status === 'مقبول' ? '#d1fae5' : '#fee2e2'}; background-color: ${petition.status === 'مقبول' ? '#ecfdf5' : '#fef2f2'}; color: ${petition.status === 'مقبول' ? '#065f46' : '#991b1b'}; font-size: 14px;">
              <strong>${petition.status === 'مقبول' ? 'ملاحظة الإدارة:' : 'سبب الرفض:'}</strong>
              <div style="margin-top: 5px;">${petition.approvalReason || petition.rejectionReason}</div>
            </div>
          ` : ''}
        </div>
      `,
      confirmButtonText: 'إغلاق',
      confirmButtonColor: '#1a8d9b'
    });
  };

  const employeeNameOptions = [...employees]
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map(emp => ({ value: emp.id, label: emp.name }));

  const employeeIdOptions = [...employees]
    .sort((a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0))
    .map(emp => ({ value: emp.id, label: String(emp.id) }));

  const filteredPetitions = petitions.filter(p => {
    const matchesSearch = !searchTerm || String(p.employeeId) === String(searchTerm) || String(p.employeeName) === String(searchTerm);
    const matchesStatus = statusFilter === 'الكل' || p.status === statusFilter;
    
    let matchesDate = true;
    const pDateStr = p.date || (p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : '');
    if (pDateStr) {
      const pMonth = pDateStr.substring(0, 7);
      if (dateMode === 'day' && pDateStr !== selectedDate) matchesDate = false;
      if (dateMode === 'month' && pMonth !== selectedMonth) matchesDate = false;
      if (dateMode === 'range' && (pDateStr < startDate || pDateStr > endDate)) matchesDate = false;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      
      <div className="flex items-center justify-start gap-3 bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100" style={{ direction: 'rtl' }}>
        <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
          <FileText size={22} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 m-0">إدارة الاستدعاءات</h2>
      </div>

      <div className="flex flex-row flex-wrap items-center gap-4 mb-4" style={{ direction: 'rtl' }}>
        
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
        
        {/* Status Filter */}
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field"
          style={{ minWidth: '200px', height: '42px', width: 'auto' }}
        >
          <option value="الكل">جميع الحالات</option>
          <option value="معلق">قيد الانتظار</option>
          <option value="مقبول">مقبول</option>
          <option value="مرفوض">مرفوض</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="spinner border-primary border-4 w-12 h-12"></div>
        </div>
      ) : (
        <TableContainer className="bg-white rounded-[16px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <TableHead>
                <TableRow>
                  <TableHeader className="px-4 py-4 font-bold border-b-2 border-slate-300 text-center">الرقم الوظيفي</TableHeader>
                  <TableHeader className="px-4 py-4 font-bold border-b-2 border-slate-300">اسم الموظف</TableHeader>
                  <TableHeader className="px-4 py-4 font-bold border-b-2 border-slate-300 text-center">المسمى الوظيفي</TableHeader>
                  <TableHeader className="px-4 py-4 font-bold border-b-2 border-slate-300 text-center">القسم</TableHeader>
                  <TableHeader className="px-4 py-4 font-bold border-b-2 border-slate-300">التاريخ</TableHeader>
                  <TableHeader className="px-4 py-4 font-bold border-b-2 border-slate-300">الاستدعاء</TableHeader>
                  <TableHeader className="px-4 py-4 font-bold border-b-2 border-slate-300 text-center">الحالة</TableHeader>
                  <TableHeader className="px-4 py-4 font-bold border-b-2 border-slate-300 text-center">الإجراءات</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPetitions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="8" className="px-4 py-8 text-center text-slate-500 font-medium">
                      لا توجد استدعاءات مطابقة للبحث
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPetitions.map(petition => {
                    const emp = employees.find(e => String(e.id) === String(petition.employeeId) || e.name === petition.employeeName) || {};
                    return (
                    <TableRow key={petition.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="px-4 py-3 text-slate-600 whitespace-nowrap text-center" dir="ltr">
                        {petition.employeeId || emp.id || '-'}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">
                        {petition.employeeName}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-600 whitespace-nowrap text-center">
                        {emp.jobTitle || '-'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-600 whitespace-nowrap text-center">
                        {petition.department || emp.department || '-'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-slate-600 font-medium" dir="ltr" style={{ textAlign: 'right' }}>
                        {petition.date}
                      </TableCell>
                      <TableCell className="px-4 py-3 max-w-xs">
                        <div className="font-bold text-slate-800 text-sm mb-1">{petition.title}</div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <Badge variant={
                          petition.status === 'مقبول' ? 'success' :
                          petition.status === 'مرفوض' ? 'danger' :
                          'warning'
                        }>
                          {petition.status === 'معلق' ? 'قيد الانتظار' : petition.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleView(petition)}
                            className="icon-btn hover:bg-blue-50"
                            style={{ borderColor: '#bfdbfe', color: '#3b82f6', backgroundColor: '#ffffff' }}
                            title="معاينة"
                          >
                            <Eye size={18} />
                          </button>
                          {petition.status === 'معلق' ? (
                            <>
                              <button 
                                onClick={() => handleAction(petition, 'approve')}
                                className="icon-btn hover:bg-emerald-50"
                                style={{ borderColor: '#d1fae5', color: '#10b981', backgroundColor: '#ffffff' }}
                                title="موافقة"
                              >
                                <Check size={18} />
                              </button>
                              <button 
                                onClick={() => handleAction(petition, 'reject')}
                                className="icon-btn hover:bg-red-50"
                                style={{ borderColor: '#fee2e2', color: '#ef4444', backgroundColor: '#ffffff' }}
                                title="رفض"
                              >
                                <X size={18} />
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400 text-xs font-bold mr-2">- تمت المعالجة -</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )})
                )}
              </TableBody>
            </table>
          </div>
        </TableContainer>
      )}
    </motion.div>
  );
}
