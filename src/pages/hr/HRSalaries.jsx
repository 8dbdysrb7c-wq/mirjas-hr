import React, { useState, useEffect } from 'react';
import { DollarSign, Printer, Search, ArrowUpDown, ArrowUp, ArrowDown, Calendar, ChevronDown, ChevronUp, User } from 'lucide-react';
import Select from '../../components/SearchSelect';
import { getEmployees, getHRViolations, getHRAttendance, getHRLeaves, getGlobalSettings, getHRSalaryPeriods, saveHRSalaryPeriod, getHRAdvances, getHRBonuses, archiveHRSalaryPeriod, unarchiveHRSalaryPeriod, getHRSalaryArchive } from '../../store';
import { calculateSalaries as calculateSalariesLogic, getCycleDates } from '../../utils/salaryCalculator';
import Swal from 'sweetalert2';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';

const formatVal = (val, showZeroAsDash = true) => {
  if (val === undefined || val === null || val === '') return '-';
  const num = Number(val);
  if (isNaN(num)) return val;
  if (num === 0) return showZeroAsDash ? '-' : '0.00';
  return num.toFixed(2);
};

const HRSalaries = ({ user }) => {
  const [employees, setEmployees] = useState([]);
  const [violations, setViolations] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [salaryPeriods, setSalaryPeriods] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [hrSettings, setHrSettings] = useState(null);
  const [archivedSalaryData, setArchivedSalaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState(`${currentYear}-${currentMonth.toString().padStart(2, '0')}`);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentYear);

  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const getSelectedMonthLabel = () => {
    if (!selectedMonth) return '';
    const [year, month] = selectedMonth.split('-');
    return `${arabicMonths[parseInt(month) - 1]} ${year}`;
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.month-picker-container')) {
        setIsMonthDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate last 12 months and next 3 months for the select
  const getMonthOptions = () => {
    const options = [];
    const today = new Date();
    const currentY = today.getFullYear();
    const currentM = today.getMonth() + 1;
    
    for (let i = -12; i <= 3; i++) {
      const d = new Date(currentY, currentM - 1 + i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const value = `${y}-${m.toString().padStart(2, '0')}`;
      const label = `${arabicMonths[m - 1]} ${y}`;
      options.push({ value, label });
    }
    return options;
  };
  const monthOptions = getMonthOptions();

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
    const [emps, viols, atts, lvs, settings, hols, periods, advs, bns] = await Promise.all([
      getEmployees(), 
      getHRViolations(), 
      getHRAttendance(),
      getHRLeaves(),
      getGlobalSettings(),
      import('../../store').then(m => m.getHolidays()),
      getHRSalaryPeriods(),
      getHRAdvances(),
      getHRBonuses()
    ]);
    setEmployees(emps);
    setViolations(viols);
    setAttendance(atts);
    setLeaves(lvs);
    setAdvances(advs);
    setHolidays(hols);
    setSalaryPeriods(periods);
    setBonuses(bns);
    setHrSettings(settings.hrSettings || {
      standardWorkHours: 8,
      gracePeriodMinutes: 15,
      workDaysPerMonth: 30,
      overtimeMultiplier: 1.5,
      fullDayAbsenceDeduction: true
    });
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const fetchArchive = async () => {
      const data = await getHRSalaryArchive(selectedMonth);
      setArchivedSalaryData(data);
    };
    fetchArchive();
  }, [selectedMonth]);

  // Calculate Salary
  const calculateSalaries = () => {
    if (!hrSettings) return [];
    
    return calculateSalariesLogic({
      employees,
      hrSettings,
      holidays,
      violations,
      bonuses,
      attendance,
      leaves,
      advances,
      selectedMonth
    });
  };

  const getProcessedSalaryData = () => {
    const rawData = archivedSalaryData || calculateSalaries();
    
    const mapped = rawData.map(emp => {
      const totalEntitlements = (emp.basic || 0) + (emp.transportAllowanceAddition || 0) + (emp.overtimePay || 0) + (emp.holidayPay || 0) + (emp.advanceAddition || 0) + (emp.bonusAddition || 0);
      return {
        ...emp,
        totalEntitlements
      };
    });
    
    return mapped.filter(emp => 
      String(emp.name || '').toLowerCase().includes((search || '').toLowerCase()) || 
      String(emp.id || '').toLowerCase().includes((search || '').toLowerCase())
    ).sort((a, b) => {
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
  };

  const customSelectStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '10px',
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
      fontSize: '15px',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#94a3b8',
      fontSize: '15px',
      fontWeight: '600',
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
      fontSize: '15px',
      fontWeight: state.isSelected ? 'bold' : '600',
    }),
  };

  const employeeIdOptions = [
    { value: '', label: 'الكل (رقم الموظف)' },
    ...employees.map(emp => ({ value: emp.id || emp.employeeId || '', label: emp.id || emp.employeeId || '' }))
  ];

  const employeeNameOptions = [
    { value: '', label: 'الكل (اسم الموظف)' },
    ...employees.map(emp => ({ value: emp.name || '', label: emp.name || '' }))
  ];

  const salaryData = getProcessedSalaryData();
  
  const totalSalaries = salaryData.reduce((sum, s) => sum + s.netSalary, 0);

  const totalActualHours = salaryData.reduce((sum, emp) => {
    if (emp.actualWorkHours !== undefined) return sum + (Number(emp.actualWorkHours) || 0);
    const workDays = emp.workDays || 30;
    const stdHours = emp.empStandardWorkHours || 8;
    const unpaid = emp.unpaidLeaveDays || 0;
    const unexcused = emp.unexcusedAbsenceDays || 0;
    const lateMins = emp.lateMinutes || 0;
    const hrs = Math.max(0, (workDays - unpaid - unexcused) * stdHours - (lateMins / 60));
    return sum + hrs;
  }, 0);

  const totalOvertimeHours = salaryData.reduce((sum, emp) => sum + (Number(emp.totalOvertimeHours) || 0), 0);

  const cycleInfo = hrSettings ? getCycleDates(selectedMonth, hrSettings.salaryCycleStartDay || 1) : {start:'', end:''};

  const currentPeriod = salaryPeriods.find(p => (p.month || p.id) === selectedMonth);
  const periodStatus = currentPeriod ? currentPeriod.status : 'open';

  const handleStatusChange = async (newStatus) => {
    try {
      if (newStatus === 'archived') {
        const negativeBalances = salaryData.filter(emp => Number(emp.netSalary) < 0);
        if (negativeBalances.length > 0) {
          const nextMonthDate = new Date(`${selectedMonth}-01T00:00:00`);
          nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
          const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
          const rowsHtml = negativeBalances.map(emp => `
            <div style="display:flex;justify-content:space-between;gap:16px;padding:8px 0;border-bottom:1px solid #fee2e2">
              <span>${emp.name || emp.employeeName || emp.id}</span>
              <strong dir="ltr" style="color:#dc2626">${Math.abs(Number(emp.netSalary)).toFixed(2)} د.أ</strong>
            </div>`).join('');
          const result = await Swal.fire({
            icon: 'warning',
            title: 'رواتب بصافي سالب',
            html: `<div style="text-align:right"><p>عند ترحيل وإغلاق شهر <strong>${selectedMonth}</strong> سيتم إنشاء طلب سلفة معلّق للشهر <strong>${nextMonth}</strong> لكل موظف أدناه:</p><div style="margin-top:12px">${rowsHtml}</div><p style="margin-top:14px;color:#64748b;font-size:13px">لن تُخصم السلفة من راتب الشهر التالي إلا بعد اعتمادها من قسم السلف.</p></div>`,
            showCancelButton: true,
            confirmButtonText: 'ترحيل وإنشاء طلبات السلف',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#0f766e'
          });
          if (!result.isConfirmed) return;
        }

        Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false });
        Swal.showLoading();
        const cycle = getCycleDates(selectedMonth, hrSettings.salaryCycleStartDay || 1);
        
        // Find processed advances, violations, bonuses
        const advancesToStamp = advances.filter(a => {
          if (a.status !== 'موافق') return false;
          if (a.isInstallment && a.installments && a.installments.length > 0) {
            return a.installments.some(inst => inst.month === selectedMonth) && !(a.processedPeriods || []).includes(selectedMonth);
          }
          return (!a.processedInPeriod) && ((a.date || a.createdAt) >= cycle.start && (a.date || a.createdAt) <= cycle.end);
        });
        const violationsToStamp = violations.filter(v => v.status !== 'محذوف' && (!v.processedInPeriod) && v.date >= cycle.start && v.date <= cycle.end);
        const bonusesToStamp = bonuses.filter(b => b.status !== 'محذوف' && (!b.processedInPeriod) && b.date >= cycle.start && b.date <= cycle.end);

        for (const adv of advancesToStamp) {
          if (adv.isInstallment) {
            const newPeriods = [...(adv.processedPeriods || []), selectedMonth];
            await updateDoc(doc(db, 'hr_advances', adv.id), { processedPeriods: newPeriods });
          } else {
            await updateDoc(doc(db, 'hr_advances', adv.id), { processedInPeriod: selectedMonth });
          }
        }
        for (const viol of violationsToStamp) {
          await updateDoc(doc(db, 'hr_violations', viol.id), { processedInPeriod: selectedMonth });
        }
        for (const bon of bonusesToStamp) {
          await updateDoc(doc(db, 'hr_bonuses', bon.id), { processedInPeriod: selectedMonth });
        }

        const archived = await archiveHRSalaryPeriod(selectedMonth, salaryData, user);
        if (!archived) throw new Error('تعذر حفظ دورة الرواتب ونسخة الأرشيف');
      } else if (newStatus === 'open') {
        Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false });
        Swal.showLoading();
        const reopened = await unarchiveHRSalaryPeriod(selectedMonth, user);
        if (!reopened) throw new Error('تعذر إلغاء ترحيل دورة الرواتب');
        
        // Remove stamps
        const advancesToUnstamp = advances.filter(a => a.processedInPeriod === selectedMonth || (a.processedPeriods || []).includes(selectedMonth));
        const violationsToUnstamp = violations.filter(v => v.processedInPeriod === selectedMonth);
        const bonusesToUnstamp = bonuses.filter(b => b.processedInPeriod === selectedMonth);

        for (const adv of advancesToUnstamp) {
          if (adv.isInstallment) {
            const newPeriods = (adv.processedPeriods || []).filter(p => p !== selectedMonth);
            await updateDoc(doc(db, 'hr_advances', adv.id), { processedPeriods: newPeriods });
          } else {
            await updateDoc(doc(db, 'hr_advances', adv.id), { processedInPeriod: null });
          }
        }
        for (const viol of violationsToUnstamp) {
          await updateDoc(doc(db, 'hr_violations', viol.id), { processedInPeriod: null });
        }
        for (const bon of bonusesToUnstamp) {
          await updateDoc(doc(db, 'hr_bonuses', bon.id), { processedInPeriod: null });
        }
      } else {
        Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false });
        Swal.showLoading();
        const saved = await saveHRSalaryPeriod(selectedMonth, newStatus, user);
        if (!saved) throw new Error('تعذر تحديث حالة دورة الرواتب');
      }
      
      Swal.fire('نجاح', 'تم تحديث حالة دورة الرواتب بنجاح', 'success');
      await fetchData();
    } catch (error) {
      console.error(error);
      Swal.fire('تعذر إتمام الترحيل', error?.message || 'حدث خطأ أثناء تحديث حالة دورة الرواتب', 'error');
    }
  };

  return (
    <div className="glass-card animate-fade-in min-h-[500px]">
      {/* Header and Controls */}
      <div className="flex-responsive mb-6 border-b pb-4">
        <div className="shrink-0">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="text-primary" /> الرواتب والأجور
            {periodStatus === 'archived' && <span className="bg-slate-200 text-slate-800 text-xs px-2 py-1 rounded-full font-bold ml-2">مُرحّل ومغلق</span>}
            {periodStatus === 'review' && <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full font-bold ml-2">قيد المراجعة</span>}
          </h2>
          <p className="text-xs text-slate-500 font-bold mt-1 whitespace-nowrap">دورة الرواتب: {cycleInfo.start} إلى {cycleInfo.end}</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto flex-wrap md:flex-nowrap items-center">
          
          {(user?.level === 'إدارة' || user?.role === 'admin' || user?.level === 'admin') && (
            <div className="flex gap-2">
              {(periodStatus === 'open' || periodStatus === 'review') && (
                <button 
                  onClick={() => handleStatusChange('archived')}
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}
                  className="btn whitespace-nowrap font-bold"
                >
                  ترحيل وإغلاق الشهر
                </button>
              )}
              {periodStatus === 'archived' && (
                <button 
                  onClick={() => {
                    if (window.confirm('تنبيه هام جداً: إلغاء الترحيل سيحذف النسخة المحفوظة للرواتب وقد تتأثر الأرقام بالتعديلات التي حدثت مؤخراً. هل أنت متأكد من إلغاء ترحيل هذا الشهر؟')) {
                      handleStatusChange('open');
                    }
                  }}
                  style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
                  className="btn whitespace-nowrap font-bold"
                >
                  إلغاء الترحيل (طوارئ)
                </button>
              )}
            </div>
          )}

          <div className="shrink-0 month-picker-container" style={{ position: 'relative' }}>
            <div 
              onClick={() => {
                const [year] = selectedMonth.split('-');
                setPickerYear(parseInt(year));
                setIsMonthDropdownOpen(!isMonthDropdownOpen);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                cursor: 'pointer',
                height: '42px',
                minHeight: '42px',
                padding: '0 16px',
                minWidth: '200px',
                transition: 'border-color 0.2s'
              }}
              className="hover:border-primary"
            >
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-primary" />
                <span className="font-bold text-slate-700 whitespace-nowrap" style={{ fontSize: '15px' }}>
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
          {/* Employee ID Filter */}
          <div style={{ width: '260px', minWidth: '260px', flexShrink: 0 }}>
            <Select
              options={employeeIdOptions}
              value={employeeIdOptions.find(opt => opt.value === search) || null}
              onChange={(selected) => setSearch(selected ? selected.value : '')}
              styles={{...customSelectStyles, control: (base) => ({...base, height: '42px', minHeight: '42px', borderRadius: '10px', border: '1px solid #e2e8f0'})}}
              placeholder="رقم الموظف..."
              isSearchable={true}
              isClearable={true}
            />
          </div>

          {/* Employee Name Filter */}
          <div style={{ width: '260px', minWidth: '260px', flexShrink: 0, position: 'relative' }}>
            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, color: '#94a3b8', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
              <User size={16} />
            </div>
            <Select
              options={employeeNameOptions}
              value={employeeNameOptions.find(opt => opt.value === search) || null}
              onChange={(selected) => setSearch(selected ? selected.value : '')}
              styles={{
                ...customSelectStyles, 
                control: (base) => ({...base, height: '42px', minHeight: '42px', borderRadius: '10px', border: '1px solid #e2e8f0'}),
                valueContainer: (base) => ({...base, paddingLeft: '32px'})
              }}
              placeholder="اسم الموظف..."
              isSearchable={true}
              isClearable={true}
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {/* Card 1: Employees */}
        <div style={{ backgroundColor: '#e0f2fe', borderRadius: '12px', border: '1px solid #bae6fd', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', padding: '14px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'right', width: '100%' }}>
            <p style={{ fontSize: '12px', fontWeight: '800', color: '#0369a1', margin: '0 0 4px 0', whiteSpace: 'nowrap' }}>عدد الموظفين</p>
            <h4 style={{ fontSize: '20px', fontWeight: '900', color: '#0284c7', margin: 0 }}>
              {salaryData.length} <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0369a1' }}>موظف</span>
            </h4>
          </div>
        </div>

        {/* Card 2: Total Basic */}
        <div style={{ backgroundColor: '#f1f5f9', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', padding: '14px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'right', width: '100%' }}>
            <p style={{ fontSize: '12px', fontWeight: '800', color: '#475569', margin: '0 0 4px 0', whiteSpace: 'nowrap' }}>إجمالي الأساسي</p>
            <h4 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
              {salaryData.reduce((sum, emp) => sum + (emp.basic || 0), 0).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>JD</span>
            </h4>
          </div>
        </div>

        {/* Card 3: Total Additions */}
        <div style={{ backgroundColor: '#d1fae5', borderRadius: '12px', border: '1px solid #a7f3d0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', padding: '14px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'right', width: '100%' }}>
            <p style={{ fontSize: '12px', fontWeight: '800', color: '#065f46', margin: '0 0 4px 0', whiteSpace: 'nowrap' }}>إجمالي الإضافات</p>
            <h4 style={{ fontSize: '20px', fontWeight: '900', color: '#047857', margin: 0 }}>
              {salaryData.reduce((sum, emp) => sum + (emp.transportAllowanceAddition || 0) + (emp.overtimePay || 0) + (emp.holidayPay || 0) + (emp.advanceAddition || 0) + (emp.bonusAddition || 0), 0).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#065f46' }}>JD</span>
            </h4>
          </div>
        </div>

        {/* Card 4: Total Deductions */}
        <div style={{ backgroundColor: '#fee2e2', borderRadius: '12px', border: '1px solid #fecaca', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', padding: '14px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'right', width: '100%' }}>
            <p style={{ fontSize: '12px', fontWeight: '800', color: '#991b1b', margin: '0 0 4px 0', whiteSpace: 'nowrap' }}>إجمالي الخصومات</p>
            <h4 style={{ fontSize: '20px', fontWeight: '900', color: '#b91c1c', margin: 0 }}>
              {salaryData.reduce((sum, emp) => sum + (emp.totalDeductions || 0), 0).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#991b1b' }}>JD</span>
            </h4>
          </div>
        </div>

        {/* Card 5: Net Salaries */}
        <div style={{ backgroundColor: '#e0e7ff', borderRadius: '12px', border: '1px solid #c7d2fe', boxShadow: '0 4px 15px -3px rgba(79, 70, 229, 0.1)', padding: '14px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'right', width: '100%' }}>
            <p style={{ fontSize: '12px', fontWeight: '800', color: '#3730a3', margin: '0 0 4px 0', whiteSpace: 'nowrap' }}>صافي الرواتب</p>
            <h4 style={{ fontSize: '20px', fontWeight: '900', color: '#4338ca', margin: 0 }}>
              {salaryData.reduce((sum, emp) => sum + (emp.netSalary || 0), 0).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#3730a3' }}>JD</span>
            </h4>
          </div>
        </div>

        {/* Card 6: Total Advances */}
        <div style={{ backgroundColor: '#fef3c7', borderRadius: '12px', border: '1px solid #fde68a', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', padding: '14px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'right', width: '100%' }}>
            <p style={{ fontSize: '12px', fontWeight: '800', color: '#92400e', margin: '0 0 4px 0', whiteSpace: 'nowrap' }}>مجموع السلف</p>
            <h4 style={{ fontSize: '20px', fontWeight: '900', color: '#b45309', margin: 0 }}>
              {salaryData.reduce((sum, emp) => sum + (emp.advanceDeduction || 0), 0).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#92400e' }}>JD</span>
            </h4>
          </div>
        </div>

        {/* Card 7: Total Actual Work Hours */}
        <div style={{ backgroundColor: '#ccfbf1', borderRadius: '12px', border: '1px solid #99f6e4', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', padding: '14px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'right', width: '100%' }}>
            <p style={{ fontSize: '12px', fontWeight: '800', color: '#0f766e', margin: '0 0 4px 0', whiteSpace: 'nowrap' }}>الساعات الفعلية</p>
            <h4 style={{ fontSize: '20px', fontWeight: '900', color: '#0d9488', margin: 0 }}>
              {totalActualHours.toFixed(1)} <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f766e' }}>ساعة</span>
            </h4>
          </div>
        </div>

        {/* Card 8: Total Overtime Hours */}
        <div style={{ backgroundColor: '#ffedd5', borderRadius: '12px', border: '1px solid #fed7aa', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', padding: '14px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'right', width: '100%' }}>
            <p style={{ fontSize: '12.5px', fontWeight: '800', color: '#c2410c', margin: '0 0 4px 0', whiteSpace: 'nowrap' }}>ساعات الإضافي</p>
            <h4 style={{ fontSize: '20px', fontWeight: '900', color: '#ea580c', margin: 0 }}>
              {totalOvertimeHours.toFixed(1)} <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#c2410c' }}>ساعة</span>
            </h4>
          </div>
        </div>
      </div>

      <div className="salary-table-responsive">
        <table className="table salary-table">
          <thead>
            <tr>
              <th className="cursor-pointer hover:bg-gray-100 transition-colors text-center" onClick={() => handleSort('id')}>
                <div className="flex items-center justify-center gap-1">الرقم {renderSortIcon('id')}</div>
              </th>
              <th className="cursor-pointer hover:bg-gray-100 transition-colors text-right pr-4" onClick={() =>handleSort('name')}>
                <div className="flex items-center justify-start gap-1">الموظف {renderSortIcon('name')}</div></th>
              <th className="cursor-pointer hover:bg-gray-100 transition-colors text-center" onClick={() =>handleSort('basic')}>
                <div className="flex items-center justify-center gap-1">الراتب الأساسي {renderSortIcon('basic')}</div></th>
              <th className="py-4 px-2 font-medium cursor-pointer hover:bg-gray-100 text-center text-indigo-600" onClick={() =>handleSort('transportAllowanceAddition')}>
                <div className="flex items-center justify-center gap-1">مواصلات (+) {renderSortIcon('transportAllowanceAddition')}</div></th>
              <th className="py-4 px-2 font-medium cursor-pointer hover:bg-gray-100 text-center" onClick={() =>handleSort('overtimePay')}>
                <div className="flex items-center justify-center gap-1">بدل إضافي {renderSortIcon('overtimePay')}</div></th>
              <th className="py-4 px-2 font-medium cursor-pointer hover:bg-gray-100 text-center text-emerald-600" onClick={() =>handleSort('bonusAddition')}>
                <div className="flex items-center justify-center gap-1">مكافآت (+) {renderSortIcon('bonusAddition')}</div></th>
              <th className="py-4 px-2 font-medium cursor-pointer hover:bg-gray-100 text-center text-rose-600" onClick={() =>handleSort('manualDeductions')}>
                <div className="flex items-center justify-center gap-1">مخالفات (-) {renderSortIcon('manualDeductions')}</div></th>
              <th className="text-rose-500 cursor-pointer hover:bg-gray-100 transition-colors text-center" title="خصم تأخيرات الحضور آلياً" onClick={() =>handleSort('lateDeduction')}>
                <div className="flex items-center justify-center gap-1">التأخير (-) {renderSortIcon('lateDeduction')}</div></th>
              <th className="text-rose-500 cursor-pointer hover:bg-gray-100 transition-colors text-center" title="إجازات غير مدفوعة والغياب الآلي واليدوي" onClick={() =>handleSort('unpaidLeaveDeduction')}>
                <div className="flex items-center justify-center gap-1">الغياب الشامل (-) {renderSortIcon('unpaidLeaveDeduction')}</div></th>
              <th className="text-rose-500 cursor-pointer hover:bg-gray-100 transition-colors text-center" title="سلف مقتطعة" onClick={() =>handleSort('advanceDeduction')}>
                <div className="flex items-center justify-center gap-1">السلف (-) {renderSortIcon('advanceDeduction')}</div></th>
              <th className="text-emerald-600 cursor-pointer hover:bg-gray-100 transition-colors text-center" title="إجمالي الراتب المستحق قبل الخصم" onClick={() =>handleSort('totalEntitlements')}>
                <div className="flex items-center justify-center gap-1">إجمالي المستحق {renderSortIcon('totalEntitlements')}</div></th>
              <th className="text-rose-500 cursor-pointer hover:bg-gray-100 transition-colors text-center" title="إجمالي الخصومات اليدوية والآلية" onClick={() =>handleSort('totalDeductions')}>
                <div className="flex items-center justify-center gap-1">إجمالي الخصم {renderSortIcon('totalDeductions')}</div></th>
              <th className="text-blue-500 cursor-pointer hover:bg-gray-100 transition-colors text-center" title="اقتطاع الضمان الاجتماعي" onClick={() =>handleSort('socialSecurityEmployeeDeduction')}>
                <div className="flex items-center justify-center gap-1">ضمان موظف {renderSortIcon('socialSecurityEmployeeDeduction')}</div></th>
              <th className="font-bold cursor-pointer hover:bg-gray-100 transition-colors text-center" onClick={() =>handleSort('netSalary')}>
                <div className="flex items-center justify-center gap-1">صافي الراتب {renderSortIcon('netSalary')}</div></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {salaryData.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="text-muted text-center">{emp.id}</td>
                <td className="font-semibold text-right pr-4">{emp.name}</td>
                <td className="text-muted text-center">{formatVal(emp.basic, false)}</td>
                <td className="py-3 px-2 font-bold text-indigo-600 text-center">{formatVal(emp.transportAllowanceAddition)}</td>
                <td className="py-3 px-2 font-bold text-emerald-600 text-center">{formatVal(emp.overtimePay)}</td>
                <td className="py-3 px-2 font-bold text-emerald-600 text-center">{formatVal(emp.bonusAddition)}</td>
                <td className="py-3 px-2 font-bold text-rose-600 text-center">{formatVal(emp.manualDeductions)}</td>
                <td className="text-rose-500 font-medium text-center">{formatVal(emp.lateDeduction)}</td>
                <td className="text-rose-500 font-medium text-center">{formatVal(emp.unpaidLeaveDeduction + (emp.unexcusedAbsenceDeduction || 0))}</td>
                <td className="text-rose-500 font-medium text-center">{formatVal(emp.advanceDeduction)}</td>
                <td className="text-emerald-600 font-bold text-center">{formatVal(emp.totalEntitlements)}</td>
                <td className="py-3 px-2 font-bold text-rose-600 text-center">{formatVal(emp.totalDeductions)}</td>
                <td className="py-3 px-2 font-medium text-blue-500 text-center">{formatVal(emp.socialSecurityEmployeeDeduction)}</td>
                <td className="font-bold text-lg bg-slate-50 text-center">{formatVal(emp.netSalary, false)} د.أ</td>
              </tr>
            ))}
            {salaryData.length === 0 && (
              <tr><td colSpan="10" className="py-10 text-center text-muted">لا يوجد بيانات للعرض</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HRSalaries;
