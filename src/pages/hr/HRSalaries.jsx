import React, { useState, useEffect } from 'react';
import { DollarSign, Printer, Search, ArrowUpDown, ArrowUp, ArrowDown, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { getEmployees, getHRViolations, getHRAttendance, getHRLeaves, getGlobalSettings, getHRSalaryPeriods, saveHRSalaryPeriod, getHRAdvances, getHRBonuses, archiveHRSalaryPeriod, unarchiveHRSalaryPeriod, getHRSalaryArchive } from '../../store';
import { calculateSalaries as calculateSalariesLogic, getCycleDates } from '../../utils/salaryCalculator';
import Swal from 'sweetalert2';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';

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
    
    return rawData.filter(emp => 
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

  const salaryData = getProcessedSalaryData();
  
  const totalSalaries = salaryData.reduce((sum, s) => sum + s.netSalary, 0);

  const cycleInfo = hrSettings ? getCycleDates(selectedMonth, hrSettings.salaryCycleStartDay || 1) : {start:'', end:''};

  const currentPeriod = salaryPeriods.find(p => p.month === selectedMonth);
  const periodStatus = currentPeriod ? currentPeriod.status : 'open';

  const handleStatusChange = async (newStatus) => {
    Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false });
    Swal.showLoading();
    try {
      if (newStatus === 'archived') {
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

        await archiveHRSalaryPeriod(selectedMonth, salaryData, user);
      } else if (newStatus === 'open') {
        await unarchiveHRSalaryPeriod(selectedMonth, user);
        
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
        await saveHRSalaryPeriod(selectedMonth, newStatus, user);
      }
      
      Swal.fire('نجاح', 'تم تحديث حالة دورة الرواتب بنجاح', 'success');
      fetchData();
    } catch (error) {
      console.error(error);
      Swal.fire('خطأ', 'حدث خطأ أثناء تحديث الحالة', 'error');
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
          <p className="text-xs text-slate-400 mt-1 whitespace-nowrap">دورة الرواتب: {cycleInfo.start} إلى {cycleInfo.end}</p>
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
              className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm hover:border-primary transition-colors cursor-pointer min-w-[160px]"
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
          <div className="search-wrapper flex-grow max-w-[200px]">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="البحث بالرقم الوظيفي أو اسم الموظف..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field search-input w-full"
            />
          </div>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table">
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
                <td className="text-muted text-center">{emp.basic}</td>
                <td className="py-3 px-2 font-bold text-indigo-600 text-center">{emp.transportAllowanceAddition > 0 ? emp.transportAllowanceAddition.toLocaleString() : '-'}</td>
                <td className="py-3 px-2 font-bold text-emerald-600 text-center">{emp.overtimePay > 0 ? emp.overtimePay.toLocaleString() : '-'}</td>
                <td className="py-3 px-2 font-bold text-emerald-600 text-center">{emp.bonusAddition > 0 ? emp.bonusAddition.toLocaleString() : '-'}</td>
                <td className="py-3 px-2 font-bold text-rose-600 text-center">{emp.manualDeductions > 0 ? emp.manualDeductions.toLocaleString() : '-'}</td>
                <td className="text-rose-500 font-medium text-center">{emp.lateDeduction > 0 ? emp.lateDeduction : '-'}</td>
                <td className="text-rose-500 font-medium text-center">{(emp.unpaidLeaveDeduction + (emp.unexcusedAbsenceDeduction || 0)) > 0 ? (emp.unpaidLeaveDeduction + (emp.unexcusedAbsenceDeduction || 0)) : '-'}</td>
                <td className="text-rose-500 font-medium text-center">{emp.advanceDeduction > 0 ? emp.advanceDeduction : '-'}</td>
                <td className="py-3 px-2 font-bold text-rose-600 text-center">{emp.totalDeductions > 0 ? emp.totalDeductions.toLocaleString() : '-'}</td>
                <td className="py-3 px-2 font-medium text-blue-500 text-center">{emp.socialSecurityEmployeeDeduction > 0 ? emp.socialSecurityEmployeeDeduction.toLocaleString() : '-'}</td>
                <td className="font-bold text-lg bg-slate-50 text-center">{emp.netSalary} د.أ</td>
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
