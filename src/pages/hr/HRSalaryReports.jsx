import React, { useState, useEffect, useRef } from 'react';
import Select from '../../components/SearchSelect';
import Flatpickr from 'react-flatpickr';
import { Arabic } from 'flatpickr/dist/l10n/ar.js';
import 'flatpickr/dist/themes/airbnb.css';
import { FileText, Printer, Calendar, ChevronDown, ChevronUp, CheckCircle, Search, User, Briefcase, Filter, ArrowUpDown, ArrowUp, ArrowDown, DollarSign, Fingerprint, Clock, AlertCircle, ArrowLeft, Package, Users, FileSpreadsheet, FileDown, Settings, Plus, X } from 'lucide-react';
import { getEmployees, getHRViolations, getHRAttendance, getDepartments, getGlobalSettings, getHRLeaves, getHRAdvances, getMissingPunches, getHRBonuses, getHRSalaryArchive, getHRAssets, getStock } from '../../store';
import { calculateSalaries as calculateSalariesLogic } from '../../utils/salaryCalculator';
import html2pdf from 'html2pdf.js';
import HRDateFilter from '../../components/ui/HRDateFilter';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

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

const formatVal = (val, showZeroAsDash = true) => {
  if (val === undefined || val === null || val === '') return '-';
  const num = Number(val);
  if (isNaN(num)) return val;
  if (num === 0) return showZeroAsDash ? '-' : '0.00';
  return num.toFixed(2);
};

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || timeStr === '--:--' || String(timeStr).trim() === '-' || String(timeStr).trim() === '') return null;
  let str = String(timeStr).trim();
  let isPM = false;
  let isAM = false;

  if (str.includes('م') || str.toLowerCase().includes('pm')) {
    isPM = true;
    str = str.replace(/م|pm/gi, '').trim();
  } else if (str.includes('ص') || str.toLowerCase().includes('am')) {
    isAM = true;
    str = str.replace(/ص|am/gi, '').trim();
  }

  const parts = str.split(':').map(p => parseInt(p.trim(), 10));
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;

  let hours = parts[0];
  const minutes = parts[1];

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

const getDailyWorkedHours = (att) => {
  if (!att) return '-';
  if (att.workedHours && !isNaN(Number(att.workedHours))) {
    return Number(att.workedHours).toFixed(1);
  }
  if (att.workHours && !isNaN(Number(att.workHours))) {
    return Number(att.workHours).toFixed(1);
  }
  
  const inMins = parseTimeToMinutes(att.timeIn);
  const outMins = parseTimeToMinutes(att.timeOut);
  
  if (inMins !== null && outMins !== null) {
    let diff = outMins - inMins;
    if (diff < 0) diff += 24 * 60; // Handle overnight shifts
    const hours = diff / 60;
    return hours.toFixed(1);
  }
  return '-';
};

const HRSalaryReports = ({ user, isNested }) => {
  const useLocalStorageState = (key, initialValue) => {
    const [state, setState] = useState(() => {
      try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
      } catch (error) {
        return initialValue;
      }
    });
  
    useEffect(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(state));
      } catch (error) {
        console.error(error);
      }
    }, [key, state]);
  
    return [state, setState];
  };

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedMonth, setSelectedMonth] = useLocalStorageState('hr_selectedMonth', `${currentYear}-${currentMonth.toString().padStart(2, '0')}`);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentYear);

  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnName) => {
    if (sortConfig.key !== columnName) {
      return <ArrowUpDown size={14} className="inline-block mr-1 opacity-40 cursor-pointer" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp size={14} className="inline-block mr-1 cursor-pointer" />;
    }
    return <ArrowDown size={14} className="inline-block mr-1 cursor-pointer" />;
  };

  const sortData = (data, valueGetters = {}) => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      let aVal = valueGetters[sortConfig.key] ? valueGetters[sortConfig.key](a) : a[sortConfig.key];
      let bVal = valueGetters[sortConfig.key] ? valueGetters[sortConfig.key](b) : b[sortConfig.key];

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (sortConfig.key === 'workedHours') {
        const aHrs = parseFloat(getDailyWorkedHours(a)) || 0;
        const bHrs = parseFloat(getDailyWorkedHours(b)) || 0;
        return sortConfig.direction === 'asc' ? aHrs - bHrs : bHrs - aHrs;
      }

      if (sortConfig.key === 'employeeName' || sortConfig.key === 'name') {
        return sortConfig.direction === 'asc' 
          ? String(aVal).localeCompare(String(bVal), 'ar') 
          : String(bVal).localeCompare(String(aVal), 'ar');
      }

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      const aNum = Number(aVal);
      const bNum = Number(bVal);
      if (!isNaN(aNum) && !isNaN(bNum) && aVal !== '' && bVal !== '') {
        aVal = aNum;
        bVal = bNum;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const [archivedSalaryData, setArchivedSalaryData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [employees, setEmployees] = useState([]);
  const [violations, setViolations] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [departments, setDepartments] = useState({});
  const [settings, setSettings] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [missingPunches, setMissingPunches] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [salaryPeriods, setSalaryPeriods] = useState([]);
  const [assets, setAssets] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [petitions, setPetitions] = useState([]);

  // Archive Filters (for advances, overtime, leaves, missing punches)
  const [archiveSearch, setArchiveSearch] = useLocalStorageState('hr_archiveSearch', '');
  const [archiveStatus, setArchiveStatus] = useLocalStorageState('hr_archiveStatus', 'all');
  const [archiveDateFrom, setArchiveDateFrom] = useLocalStorageState('hr_archiveDateFrom', '');
  const [archiveDateTo, setArchiveDateTo] = useLocalStorageState('hr_archiveDateTo', '');
  const [archiveDateMode, setArchiveDateMode] = useLocalStorageState('hrsr_archiveDateMode', 'month');
  const [archiveSelectedDate, setArchiveSelectedDate] = useLocalStorageState('hrsr_archiveSelectedDate', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}`);
  const [archiveFilterType, setArchiveFilterType] = useLocalStorageState('hrsr_archiveFilterType', 'الكل');
  const [assetCategoryFilter, setAssetCategoryFilter] = useLocalStorageState('hr_assetCategoryFilter', 'all');
  const [assetJobTitleFilter, setAssetJobTitleFilter] = useLocalStorageState('hr_assetJobTitleFilter', 'all');
  const [showAssetFilters, setShowAssetFilters] = useLocalStorageState('hr_showAssetFilters', false);
  const [activeReportTab, setActiveReportTab] = useLocalStorageState('hr_activeReportTab', 'slip'); // 'slip' or 'sheet'

  // Salary Slip State
  const [selectedEmployeeId, setSelectedEmployeeId] = useLocalStorageState('hr_selectedEmployeeId', '');

  // Salary Sheet State
  const [selectedDepartment, setSelectedDepartment] = useLocalStorageState('hr_selectedDepartment', 'all');

  // Employee Report State
  const [employeeReportFields, setEmployeeReportFields] = useLocalStorageState('hr_employeeReportFields', {
    id: true,
    name: true,
    jobTitle: true,
    department: true,
    joinDate: true,
    annualRaiseDate: true,
    basicSalary: true,
    phone: true,
    directManager: true,
    annualLeaveBalance: true,
    sickLeaveBalance: true,
    socialSecurity: true,
    shiftPeriod: true,
    status: true
  });

  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const getSelectedMonthLabel = () => {
    if (!selectedMonth) return '';
    const [year, month] = selectedMonth.split('-');
    return `${arabicMonths[parseInt(month) - 1]} ${year}`;
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.month-picker-container')) {
        setIsMonthDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [emps, viols, atts, lvs, depts, glbSettings, hols, advs, periods, mps, bns, hrAssets, stockData, petsData] = await Promise.all([
      getEmployees(),
      getHRViolations(),
      getHRAttendance(),
      getHRLeaves(),
      getDepartments(),
      getGlobalSettings(),
      import('../../store').then(m => m.getHolidays()),
      getHRAdvances(),
      import('../../store').then(m => m.getHRSalaryPeriods()),
      import('../../store').then(m => m.getMissingPunches()),
      import('../../store').then(m => m.getHRBonuses()),
      getHRAssets(),
      getStock(),
      import('../../store').then(m => m.getHRPetitions())
    ]);
    setEmployees(emps);
    setViolations(viols);
    setAttendance(atts);
    setLeaves(lvs || []);
    setDepartments(depts || {});
    setSettings(glbSettings);
    setHolidays(hols);
    setAdvances(advs);
    setSalaryPeriods(periods);
    setMissingPunches(mps || []);
    setBonuses(bns || []);
    setAssets(hrAssets || []);
    setStockItems(stockData || []);
    setPetitions(petsData || []);
    if (emps.length > 0) setSelectedEmployeeId(emps[0].id);
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

  useEffect(() => {
    setArchiveSearch('');
    setArchiveStatus('all');
    setArchiveDateFrom('');
    setArchiveDateTo('');
    setAssetCategoryFilter('all');
    setAssetJobTitleFilter('all');
    setSelectedDepartment('all');
  }, [activeReportTab]);

  const calculateSalaries = () => {
    if (archivedSalaryData) return archivedSalaryData;

    const hrSettings = settings?.hrSettings || {
      standardWorkHours: 8,
      workDaysPerMonth: 30,
      monthlyMissionBalanceMinutes: 120,
      latenessHandling: 'deduct_from_balance',
      absenceHandling: 'full_day',
      timeRounding: 'minute',
      overtimeCalculationMethod: 'hourly_rate',
      overtimeFixedAmount: 10,
      overtimeMultiplier: 1.5,
      fullDayAbsenceDeduction: true
    };

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

  const salaryData = calculateSalaries();
  const selectedEmployeeData = salaryData.find(e => e.id === selectedEmployeeId);

  const filteredSheetSalaryData = salaryData
    .filter(emp => selectedDepartment === 'all' || emp.department === (departments[selectedDepartment] || selectedDepartment) || emp.department === selectedDepartment)
    .filter(emp => archiveSearch ? emp.id === archiveSearch : true);


  const handleExportAsset = (asset) => {
    MySwal.fire({
      title: `طباعة وتصدير عهدة: ${asset.name}`,
      html: `
        <div class="text-right" style="direction: rtl;">
          <p class="text-sm text-slate-500 mb-4 font-bold">حدد البيانات التي تريد إظهارها في التقرير:</p>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <label class="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 rounded border border-slate-100 hover:bg-slate-100 transition-colors"><input type="checkbox" id="col-assetNumber" checked class="accent-primary w-4 h-4" /> <span class="font-bold">رقم العهدة</span></label>
            <label class="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 rounded border border-slate-100 hover:bg-slate-100 transition-colors"><input type="checkbox" id="col-employeeName" checked class="accent-primary w-4 h-4" /> <span class="font-bold">الموظف المستلم</span></label>
            <label class="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 rounded border border-slate-100 hover:bg-slate-100 transition-colors"><input type="checkbox" id="col-handoverDate" checked class="accent-primary w-4 h-4" /> <span class="font-bold">تاريخ التسليم</span></label>
            <label class="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 rounded border border-slate-100 hover:bg-slate-100 transition-colors"><input type="checkbox" id="col-itemName" checked class="accent-primary w-4 h-4" /> <span class="font-bold">اسم الصنف</span></label>
            <label class="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 rounded border border-slate-100 hover:bg-slate-100 transition-colors"><input type="checkbox" id="col-itemCategory" checked class="accent-primary w-4 h-4" /> <span class="font-bold">التصنيف</span></label>
            <label class="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 rounded border border-slate-100 hover:bg-slate-100 transition-colors"><input type="checkbox" id="col-itemLocation" checked class="accent-primary w-4 h-4" /> <span class="font-bold">الموقع بالمخزن</span></label>
            <label class="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 rounded border border-slate-100 hover:bg-slate-100 transition-colors"><input type="checkbox" id="col-itemQuantity" checked class="accent-primary w-4 h-4" /> <span class="font-bold">الكمية</span></label>
            <label class="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 rounded border border-slate-100 hover:bg-slate-100 transition-colors"><input type="checkbox" id="col-itemStatus" checked class="accent-primary w-4 h-4" /> <span class="font-bold">الحالة</span></label>
          </div>
          <div class="mt-6 flex flex-wrap gap-2 justify-center">
             <button id="btn-print" class="btn btn-primary flex-1 flex justify-center items-center gap-2 h-10 shadow-sm hover:-translate-y-0.5 transition-all"><svg class="lucide lucide-printer" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect width="12" height="8" x="6" y="14"></rect></svg> طباعة / PDF</button>
             <button id="btn-excel" class="btn flex-1 flex justify-center items-center gap-2 h-10 shadow-sm hover:-translate-y-0.5 transition-all" style="background-color: #10b981; color: white;"><svg class="lucide lucide-file-down" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M12 18v-6"></path><path d="M9 15l3 3 3-3"></path></svg> Excel</button>
             <button id="btn-word" class="btn flex-1 flex justify-center items-center gap-2 h-10 shadow-sm hover:-translate-y-0.5 transition-all" style="background-color: #3b82f6; color: white;"><svg class="lucide lucide-file-text" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg> Word</button>
          </div>
        </div>
      `,
      showConfirmButton: false,
      showCloseButton: true,
      customClass: {
         popup: 'premium-modal-popup'
      },
      didOpen: () => {
        const getHtmlTable = () => {
           const c_assetNum = document.getElementById('col-assetNumber').checked;
           const c_emp = document.getElementById('col-employeeName').checked;
           const c_date = document.getElementById('col-handoverDate').checked;
           const c_name = document.getElementById('col-itemName').checked;
           const c_cat = document.getElementById('col-itemCategory').checked;
           const c_loc = document.getElementById('col-itemLocation').checked;
           const c_qty = document.getElementById('col-itemQuantity').checked;
           const c_status = document.getElementById('col-itemStatus').checked;

           let html = `
              <html dir="rtl">
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; direction: rtl; text-align: right; color: #1e293b; background: #fff; }
                  h1 { color: #0ea5e9; text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e0f2fe; padding-bottom: 15px; }
                  .details { margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                  .details p { margin: 0; font-size: 15px; }
                  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                  th, td { padding: 14px; border: 1px solid #cbd5e1; text-align: right; font-size: 14px; }
                  th { background-color: #0ea5e9; color: white; font-weight: bold; }
                  tr:nth-child(even) { background-color: #f8fafc; }
                  .footer { margin-top: 60px; display: flex; justify-content: space-around; text-align: center; }
                  .sig-box { border-top: 2px dashed #94a3b8; width: 220px; padding-top: 10px; margin-top: 60px; font-weight: bold; color: #64748b; }
                  @media print {
                     body { padding: 0; }
                     .details { background: transparent; border: 1px solid #000; }
                     th { background-color: #f1f5f9; color: #000; }
                     th, td { border: 1px solid #000; }
                  }
                </style>
              </head>
              <body>
                <h1>نموذج تسليم عهدة وممتلكات</h1>
                <div class="details">
                  ${c_assetNum ? `<p><strong>رقم العهدة:</strong> ${asset.assetNumber || '-'}</p>` : ''}
                  <p><strong>اسم العهدة:</strong> ${asset.name}</p>
                  ${c_emp ? `<p><strong>الموظف المستلم:</strong> ${asset.employeeName}</p>` : ''}
                  ${c_date ? `<p><strong>تاريخ التسليم:</strong> ${asset.handoverDate || '-'}</p>` : ''}
                </div>
                
                <h3 style="color: #334155; margin-bottom: 10px;">محتويات العهدة المرفقة:</h3>
                <table>
                  <thead>
                    <tr>
                      ${c_name ? '<th>اسم الصنف</th>' : ''}
                      ${c_cat ? '<th>التصنيف</th>' : ''}
                      ${c_loc ? '<th>الموقع بالمخزن</th>' : ''}
                      ${c_qty ? '<th>الكمية</th>' : ''}
                      ${c_status ? '<th>الحالة وقت التسليم</th>' : ''}
                    </tr>
                  </thead>
                  <tbody>
                    ${(asset.items || []).map(item => {
                       const stockItem = stockItems.find(s => s.name === item.name);
                       const loc = stockItem?.location || '-';
                       return `
                         <tr>
                            ${c_name ? `<td><strong>${item.name}</strong></td>` : ''}
                            ${c_cat ? `<td>${item.category}</td>` : ''}
                            ${c_loc ? `<td>${loc}</td>` : ''}
                            ${c_qty ? `<td>${item.quantity}</td>` : ''}
                            ${c_status ? `<td>${item.status}</td>` : ''}
                         </tr>
                       `;
                    }).join('')}
                  </tbody>
                </table>

                <div class="footer">
                  <div>
                    <div class="sig-box">توقيع الإدارة / المشرف</div>
                  </div>
                  <div>
                    <div class="sig-box">توقيع الموظف المستلم</div>
                  </div>
                </div>
              </body>
              </html>
           `;
           return html;
        };

        const downloadFile = (html, filename, type) => {
           const blob = new Blob(['\ufeff' + html], { type });
           const url = URL.createObjectURL(blob);
           const a = document.createElement('a');
           a.href = url;
           a.download = filename;
           a.click();
           URL.revokeObjectURL(url);
        };

        document.getElementById('btn-print').onclick = () => {
           const html = getHtmlTable();
           const printPortal = document.getElementById('print-portal');
           if (printPortal) {
              printPortal.innerHTML = html;
              window.print();
              setTimeout(() => { printPortal.innerHTML = ''; }, 100);
           } else {
              const win = window.open('', '_blank');
              win.document.write(html);
              win.document.close();
              setTimeout(() => { win.print(); }, 200);
           }
        };
        
        document.getElementById('btn-excel').onclick = () => {
           const html = getHtmlTable();
           downloadFile(html, `تقرير_عهدة_${asset.assetNumber || '1'}.xls`, 'application/vnd.ms-excel;charset=utf-8');
        };

        document.getElementById('btn-word').onclick = () => {
           const html = getHtmlTable();
           downloadFile(html, `تقرير_عهدة_${asset.assetNumber || '1'}.doc`, 'application/msword;charset=utf-8');
        };
      }
    });
  };

  const executeExport = (format) => {
    const reportTitle = "تقرير الموارد البشرية";
    if (format === 'print') {
      window.print();
      return;
    }
    if (format === 'pdf') {
      const printableElement = document.querySelector('.printable-card');
      if (!printableElement) return;
      const element = document.createElement('div');
      element.innerHTML = printableElement.innerHTML;
      element.style.direction = 'rtl';
      element.style.padding = '20px';
      
      const opt = {
        margin:       [15, 10, 15, 10],
        filename:     `${reportTitle}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' },
        pagebreak:    { mode: ['css', 'legacy'] }
      };
      html2pdf().set(opt).from(element).save();
    } else {
      const printableElement = document.querySelector('.printable-card table');
      if (!printableElement) return;
      const tableHtml = `<html xmlns:x="urn:schemas-microsoft-com:office:${format === 'excel' ? 'excel' : 'word'}">
        <head>
          <meta charset="utf-8">
        </head>
        <body style="direction: rtl; text-align: right; font-family: 'Arial';">
          <h2 style="text-align: center;">${reportTitle}</h2>
          <table border="1" style="border-collapse: collapse; width: 100%;">
            ${printableElement.innerHTML}
          </table>
        </body>
      </html>`;
      
      const blob = new Blob([tableHtml], { type: format === 'excel' ? 'application/vnd.ms-excel' : 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportTitle}.${format === 'excel' ? 'xls' : 'doc'}`;
      a.click();
    }
  };

  const openPrintConfig = (format) => {
    const printArea = document.querySelector('.printable-card');
    if (!printArea) return;
    const table = printArea.querySelector('table');

    // If it's a slip or there's no table, just export immediately (no columns to customize)
    if (!table || activeReportTab === 'slip') {
      executeExport(format);
      return;
    }

    // Extract headers
    const headers = Array.from(table.querySelectorAll('thead th')).map((th, index) => ({
      index,
      text: th.innerText.trim()
    })).filter(h => h.text !== '' && h.text !== 'الإجراءات'); // Exclude empty or action columns

    // Create SweetAlert HTML
    const checkboxesHtml = headers.map(h => `
      <label class="premium-checkbox-item" style="flex-direction: column; justify-content: center; height: 80px; text-align: center; gap: 10px; display: flex; align-items: center; cursor: pointer; padding: 8px 12px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 0.85rem; font-weight: 600; transition: all 0.2s; color: #1e293b;">
        <input type="checkbox" id="col-check-${h.index}" value="${h.index}" checked style="width: 18px; height: 18px; accent-color: #1e293b;" />
        <span style="font-size: 0.8rem; line-height: 1.2;">${h.text}</span>
      </label>
    `).join('');

    MySwal.fire({
      title: 'تخصيص أعمدة التقرير',
      html: `
        <div class="premium-checkbox-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; max-height: 400px; overflow-y: visible; padding: 12px; background: transparent; border: none; overflow-x: hidden;">
          ${checkboxesHtml}
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: format === 'print' ? 'طباعة التقرير' : 'تصدير التقرير',
      cancelButtonText: 'إلغاء',
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn btn-primary',
        cancelButton: 'btn btn-outline'
      },
      width: '800px',
      preConfirm: () => {
        const uncheckedIndices = headers
          .filter(h => !document.getElementById(`col-check-${h.index}`).checked)
          .map(h => h.index);

        // Hide columns temporarily
        const allRows = table.querySelectorAll('tr');
        const hiddenCells = [];

        allRows.forEach(row => {
          const cells = row.children;
          uncheckedIndices.forEach(idx => {
            if (cells[idx]) {
              hiddenCells.push({ cell: cells[idx], origDisplay: cells[idx].style.display });
              cells[idx].style.display = 'none';
            }
          });
        });

        if (format === 'print') {
          window.print();
          // Restore columns immediately after print dialog returns
          hiddenCells.forEach(item => {
            item.cell.style.display = item.origDisplay;
          });
          return true;
        } else {
          return { hiddenCells };
        }
      }
    }).then((result) => {
      if (result.isConfirmed && format !== 'print') {
        const { hiddenCells } = result.value || {};
        executeExport(format);

        // Restore hidden columns after download
        if (hiddenCells) {
          setTimeout(() => {
            hiddenCells.forEach(item => {
              item.cell.style.display = item.origDisplay;
            });
          }, 500);
        }
      }
    });
  };
  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: 'transparent',
      border: 'none',
      boxShadow: 'none',
      cursor: 'pointer',
      minWidth: '100%',
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: '0 8px',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#1e293b',
      fontWeight: 'bold',
      fontSize: '1rem',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#94a3b8',
      fontSize: '1rem',
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
      fontSize: '0.95rem',
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

  if (loading) return <div className="text-center p-8">جاري التحميل...</div>;

  return (
    <div className="glass-card flex flex-col min-h-[500px]" style={{ padding: '24px', background: '#ffffff', borderRadius: '24px', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>

      {/* Header & Controls (Hidden in Print) */}
      <div className="no-print mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' }}>
          <div>
            {!isNested && (
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                <FileText color="#1a8d9b" size={22} /> مركز تقارير الموارد البشرية
              </h2>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="month-picker-container" style={{ position: 'relative' }}>
              <div
                onClick={() => {
                  const [year] = selectedMonth.split('-');
                  setPickerYear(parseInt(year));
                  setIsMonthDropdownOpen(!isMonthDropdownOpen);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', color: '#334155', fontWeight: 'bold' }}
              >
                <Calendar size={18} color="#1a8d9b" />
                <span style={{ minWidth: '90px', textAlign: 'center' }}>{getSelectedMonthLabel()}</span>
                <ChevronDown size={16} color="#94a3b8" style={{ transform: isMonthDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>

              {isMonthDropdownOpen && (
                <div className="month-picker-popup"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: '0',
                    width: '280px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    zIndex: 99999,
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <button onClick={(e) => { e.stopPropagation(); setPickerYear(prev => prev + 1); }} disabled={pickerYear >= currentYear} style={{ padding: '4px', color: pickerYear >= currentYear ? '#cbd5e1' : '#64748b', cursor: pickerYear >= currentYear ? 'not-allowed' : 'pointer', background: 'none', border: 'none' }}><ChevronUp size={20} /></button>
                    <span style={{ fontWeight: 'bold', fontSize: '1.125rem', color: '#1e293b' }}>{pickerYear}</span>
                    <button onClick={(e) => { e.stopPropagation(); setPickerYear(prev => prev - 1); }} style={{ padding: '4px', color: '#64748b', cursor: 'pointer', background: 'none', border: 'none' }}><ChevronDown size={20} /></button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '16px' }}>
                    {arabicMonths.map((m, index) => {
                      const monthVal = `${pickerYear}-${(index + 1).toString().padStart(2, '0')}`;
                      const isSelected = selectedMonth === monthVal;
                      const isCurrentMonth = currentYear === pickerYear && currentMonth === (index + 1);
                      const isFutureMonth = pickerYear > currentYear || (pickerYear === currentYear && (index + 1) > currentMonth);

                      return (
                        <button
                          key={monthVal}
                          disabled={isFutureMonth}
                          onClick={() => { setSelectedMonth(monthVal); setIsMonthDropdownOpen(false); }}
                          style={{
                            padding: '10px 4px',
                            borderRadius: '10px',
                            fontSize: '0.875rem',
                            fontWeight: 'bold',
                            transition: 'all 0.2s',
                            border: '1px solid',
                            borderColor: isCurrentMonth && !isSelected ? 'rgba(26, 141, 155, 0.2)' : 'transparent',
                            backgroundColor: isSelected ? '#1a8d9b' : isCurrentMonth ? 'rgba(26, 141, 155, 0.05)' : 'transparent',
                            color: isFutureMonth ? '#cbd5e1' : isSelected ? '#ffffff' : isCurrentMonth ? '#1a8d9b' : '#475569',
                            cursor: isFutureMonth ? 'not-allowed' : 'pointer',
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

                        <div className="flex items-center gap-2">
              <button 
                className="bg-white shadow-sm hover:bg-slate-50 flex items-center justify-center rounded-lg transition-all cursor-pointer" 
                title="تصدير كـ PDF"
                onClick={() => openPrintConfig('pdf')}
                style={{ width: '54px', height: '38px', border: '2px solid #3b82f6', padding: '0' }}
              >
                <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgMzIgMzIiPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iYSIgeDE9IjYyNS43ODciIHkxPSI4MjUuNjQxIiB4Mj0iNjMyLjg0NyIgeTI9IjgxMi44NDgiIGdyYWRpZW50VHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTYxMC4yMzIgLTgwMy4yODUpIHJvdGF0ZSgwLjA2MykiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNmZmYiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNlMWUxZTEiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iYiIgeDE9IjYzNC4wODEiIHkxPSI4MTAuMjUxIiB4Mj0iNjM1LjE2OSIgeTI9IjgwOS4yNDgiIGdyYWRpZW50VHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTYxMC41MjQgLTgwMi41MikiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNmZmYiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNjOGM4YzgiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iYyIgeDE9IjE0LjAxOSIgeTE9Ii0xMTYuODE2IiB4Mj0iMTAuNjY1IiB5Mj0iLTEwNi40OTMiIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMSwgMCwgMCwgLTEsIDAuMDQsIC0xMDMuNzg1KSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMC4xMjciIHN0b3AtY29sb3I9IiM4YTAwMDAiLz48c3RvcCBvZmZzZXQ9IjAuMjQ0IiBzdG9wLWNvbG9yPSIjOTAwMDAwIiBzdG9wLW9wYWNpdHk9IjAuOTk5Ii8+PHN0b3Agb2Zmc2V0PSIwLjM5OCIgc3RvcC1jb2xvcj0iI2EwMDAwMCIgc3RvcC1vcGFjaXR5PSIwLjk5OSIvPjxzdG9wIG9mZnNldD0iMC41NzMiIHN0b3AtY29sb3I9IiNiYzAwMDAiIHN0b3Atb3BhY2l0eT0iMC45OTgiLz48c3RvcCBvZmZzZXQ9IjAuNzYxIiBzdG9wLWNvbG9yPSIjZTIwMDAwIiBzdG9wLW9wYWNpdHk9IjAuOTk3Ii8+PHN0b3Agb2Zmc2V0PSIwLjg2NyIgc3RvcC1jb2xvcj0iI2ZhMDAwMCIgc3RvcC1vcGFjaXR5PSIwLjk5NiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJkIiB4MT0iMTQuMTYiIHkxPSItMTE3LjIyNSIgeDI9IjEwLjU0MSIgeTI9Ii0xMDYuMDg0IiBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KDEsIDAsIDAsIC0xLCAwLjA0LCAtMTAzLjc4NSkiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj48c3RvcCBvZmZzZXQ9IjAuMzE1IiBzdG9wLWNvbG9yPSIjNWUwMDAwIi8+PHN0b3Agb2Zmc2V0PSIwLjQ0NCIgc3RvcC1jb2xvcj0iIzgzMDAwMCIgc3RvcC1vcGFjaXR5PSIwLjk5OSIvPjxzdG9wIG9mZnNldD0iMC42MTgiIHN0b3AtY29sb3I9IiNhZTAwMDAiIHN0b3Atb3BhY2l0eT0iMC45OTgiLz48c3RvcCBvZmZzZXQ9IjAuNzc1IiBzdG9wLWNvbG9yPSIjY2QwMDAwIiBzdG9wLW9wYWNpdHk9IjAuOTk3Ii8+PHN0b3Agb2Zmc2V0PSIwLjkwOCIgc3RvcC1jb2xvcj0iI2UwMDAwMCIgc3RvcC1vcGFjaXR5PSIwLjk5NiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI2U3MDAwMCIgc3RvcC1vcGFjaXR5PSIwLjk5NiIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjx0aXRsZT5maWxlX3R5cGVfcGRmPC90aXRsZT48aW1hZ2Ugd2lkdGg9IjQ5MCIgaGVpZ2h0PSI2NDEiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDguNDI2IDIuNzkyKSBzY2FsZSgwLjA0MikiIHhsaW5rOmhyZWY9ImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBZXdBQUFLQ0NBWUFBQUFUUE9yWEFBQUFDWEJJV1hNQUFRbS9BQUVKdndHTSt4elVBQUFnQUVsRVFWUjRYdTNkQjVSdFoxbnc4VWNzaUNoQnFWTFN4RkNsQ0VScEVycFNZaWdxU0VtaUlrWEFLRVFVZ2tRSVJVQ3FVZ1FodEtnSVFab0NnZVM2S0NwU1ZCQ1JmTUJGd0lLZ1dENzdoOS96K001bTd6bHp6cHd6OTg2OWQ5NlpuMnY5MXRyZ0JjNWRLMmYvejk1dmkvLzVuLzhKQUdCblcvb0hBSUFqYitrZldDYi83NnNBdHRPeSt3N3NSVXYvd0liL3dPWmZ0RXNBSENBQmgwMHMvUU5mK1lPYngvbXI1L2dhZ0NYbTNUczJEZm15ZXhYc1Zrdi93UC8rb1kyUm5vM3kxMDU4M1FLWEJJakY5NGpoSGpJYjg3bnhYbmJmZ3QxbTgvL254aWZxYWFpSE9BOWZ3cTlQbDFyekRST1hCcGhqZXA4WTdoMTFINW1HZlRiZ3dzMmV0ZmovTWYrcGVocnFJZEQxWmZ2RzlFM3BNdW1vTlplZDhjMEFzZkhlVVBlTHk2eXArMGpkVDRhSUR3R2Z4bnREdUpmZDZHQTNXUHovMkJqcjJWQmZldTNMVlYrMitoSmVMbDArWFNGZE1WMHBYWG5HdHdKNzJ1dzlvZTRUZGIrbyswYmRQK28rTWtTOUFsN3hybnROM1hNV2hWdTAyUlBtLzVzYlg0Ti83ZHFYWlJycXk2NTl1ZXJMVmwrOHE2U3JwYVBUc2VtNGRQekV0d0hFK3Z0QzNTZU9UY2VrcTZlclJndDdoYndpL2kzUjdqVjF6NWtOdDZkdDlwU04vOGJtc2E1ZnUwZXRmWWtxMUZkWis1TFZsKzRhNlpycDJ1bTY2VHZTOWRmY0FHQml1RGZVZmVKNjZUcnBXdW1FYUZFL050cTlwZTR4ZGErcGg0TnB1SWRYNVo2MjJUTTIvaHZyWTExZmhQb2xPNDExZlhHdXZQWmxPbjd0QzFhQnJpL2hqZE9KNmJ2VHpkTXQwNjNXZkEvQW1yb24xUDNoRnVsbTZidlNUZE4zUnJ1WDFEMmxIZ0FxM3ZYMFhVL2U5ZFJkOTUrNkR3M2ozQlh1MmFkdEU5TFlsZGIvaS9sUDEvV0Z1SFNNc2E3WFZVZEhlNkt1TDlXTm9rVzZ2bnducGR1bjcwMTNUbmROZDBzbnArOEhpSFkvS0hWdnVFdjZ2blNuYVBlTzIwU0xlZjNvcndlQWVncXZ0M1oxdjZsdzF4UDM4S3E4eHJpSHArMWhiTnNyY25hdDlmOWlEUGJzMC9VM3JYMUI2c202WWwxUDFmVXFxMzRSVjZodkZ5M1FwNlI3cFh1bis2WUhwRlBUYWVuMDlDUEFubmI2bXRPaTNSdnVIKzFlVWZlTUgwaDNqL1pEdndKZThhNG44THJQM0NCYXVPdUp1OTd1MWIyb0pxblZhL0xoYWRzcmNuYTE5ZjlpOGROMWZTbXV1UFpGcVYrNkZldDZxcjUxdEtmcCtwTGRKOW9YOElIcG9la1I2WXowMCtsUjZjd1pQd1BzR2RQdmZ0MFBIaG50M2xEM2lMcFgvRVI2VVByUmFCR3ZnTmQ5cFI0RTZvR2d3bjJUYVBlZWVtQTROdHByOGl0R20xVSsrN1R0RlRtN3p2cC9NUVo3OXVtNlhvWFhxNmpqbzcwR3IxKzhGZXY2TXRVVGRUMUpQemphbDYrK25HZWxzOU1UMDVQVFU5SlQweThDZTE3ZEMrcWVVUGVHYzlJdnBKOVBqNGtXOUxxUFBDVGFFL2tQcDN0RXU5ZlVFM2VOZDljd1hFMVNtejV0VDhlMkx4WHJuN1l2RVo2MjJRWEdpL1hqMTErejlnLzhONng5Q2E2NDlzVTRZZTNMVXEvQjY4bTZZbjFhZWxpMFVEOCsyaGZ4bWVsNTZmbnBSZWxYMDB2Vy9CcXdadzMzZ1JkSHV6ZThJUDFLZWs3NnBXZ3hmMEo2YkxRbjhYcnlybkRYRzd3YWNxdFg1VFZwclI0YXBrL2J3OWoyTUpQY0szSjJuZkZpL2ZqMXNKU3JmcTNXNjZiNkJWdEx0K3JwK3NSb3I2anFkVlU5V1Zlc2Z5N2FMK1ZuUmZzQ3ZqUzlLdjFHK3EzMHVuUitldjNFYndON3h2UzdYL2VDdWllOE5yMG0vWHEwKzhXNTBVSmVBYTk0MXhQNDQ2SzlQcTlodHRQU0QwWWI0NzV0akUvYjE0NzI5cS8yZ2FpSGkyVVQwcndpcDB2anhjWmcxei9vMDlmaE5YWmRFei9xNmJwZVQ5VXYzbm9OWGsvV0ZldjZoVnkvbk0rTDlvVjhjM3BydWlDOU0xMlU5czM0UFdEWDJyZEEzUXN1akhaZnFQdkQyOUpiMGh1aVJienVJUytMOXVPLzN0WTlLZG9UOXhuUjVzalVKTFZUMGgyanpTaXZzZTFheS8zdDBTYkZMbnRGN21tYkxvMFhHeWVjMVQvazlTdTFabUxXTDlkYUUxbkxMRTVhKzdMVUJMUDZBdFZyOEhxeXJsalhFL1dib24wSjZ3djczdlMrOVA3MGdmVEI5S0VaZnd6c1NyUGY5VUhkQitwK1VQZUZ1ai84UVhwUHRIdkdPOUx2Um5zcXIvdEpoYnVHMXA0UmJheTdIaERxTmZscDBXYVYxOFBEU2RIV2NkY0RSZDJuam8zeEZYbTlJUnhla1MrY2tMYnNSZ2s3d1hpeFB0akRoTE9qMXY2aHIxK3Q5ZHFwWG9mWFdza2F1NjVmdXZYbHFUSHIraVZjdjRvcjF2V3J1VUpkWDhnL1RSOU5IMHNmVHhlbi93UHNXUmV2cWZ2Qlg2US9UMytXUGh3dDVuOFVMZDcxRkY1djZPb1ZldDFiWHBLZUcrMDErZkMwL1dQUjN2VFZtdTY2TDlWbVRiWHh5akFoN1dyUk5sdnhpcHhkWWJ6WUdPenBoTE5qbzQxZjEyWUdOZG1zbGx6VW1OSlowVjVaMVpoMXZRYXZKK3VLZFgzeDZvdFlYOUQ5NlMvVFo5UG4wbDhCZTFyZEJ6NjdwdTROKzlNbm80Vzg3aHYxUTc5KzhMODMycXZ6ZWwxZXI4cGZFZTNoNE9uUlZxSFVwTFFhbHJ0L3RKbmtkVzhhSnFSTlg1SFhaay8xcHRBc2NybzJYbXhjMGxYQnZteTBYNmpIUlp1UldiOWc2eFZValNIVjJzbXpvODBHcndrak5XWmRyN1RxaTFaZnV2b0MxaGZ5YjlMbjB4ZlNGOVBmQTN2YUY5ZlVQZUh2MHQrbXY0NFc4aytuVDBSN0sxZmhyaWZ1ZDZXM1J4dmpQaS9hMC9hem84MmRxUW12RDQrMkdVdE5TS3VkMDI0VDdlRmkyU3R5NDlwMFpieFlIT3lhd0ZFek1LOGZiY0paemRDczJlSDFTcXJXV2RmNFVvMDExZXVyK2tWY1g3SjZzcTVZMXhleHZwaGZTditVL2puOUM3Q24vZk9hdWlmOFk3VDd3ejlFQzNqOXVLK244SHJ5cm5EWGovOGFENjl4N25wTlhrL2J0ZkxrM0dpenlXdGRkODBrLzZsb3czUzFidnY3bzcwaXI4MVdWbjFGYnFNVmRyenhZbU93aHgzT3BzR3VHWm0xLzI5Tk9LdGRpcDRjYlMxbGZZSHFkWGhOSUtreDYvM1JucXdyMXZXRnJDL3B2NlovUy84TzdIbi90cWJ1Qy84MzJqMmlBbDd4cnZ0R2hidWV1UGRIRysrdU1lN2hhYnRtbGRmWWRyM1pxL3RQTFFHckNXbTE2VXB0dUZJUEZKdTlJcjl5TEo1RlBrVGIwelk3em5peFBOajFlcW1DZlhLMEdacVBpamJockRaRnFUV1ZOZG1zWm4xK0xOcXY0L3JDMVpldnZvajF4ZnlQOUovcHY0QTk3ejhuNnQ0d1JMemlYVS9mZGUrb0orNzY0ZitaYUUvYjlUQlE4MlBxVFY3ZGIycVNhNzNkcXcxWmFsbHBMZi9hNml2eXVzZDVSVTRYeG92MXdhNS9jQ3ZZdzZZcDM3YjJEM3Y5V3EzWFRmVmxxRit6dFN0UmpTZWRIKzExVlkxZjE2L2hlaDFlWDdiNnhWeS9vT3NMV1YvUy8xN3ovNEE5N2I4bnBoRWZ3ajA4Y2RlWTkvUnB1MmFXMTdCYnZjM2JGMjBKV0UxSWUzbHM3Ulg1c28xV1JKc2RaN3hZSE95YVlUa2I3QitKRnV6NmNsU3c2L1hVdm1qckt5K085dVdxMTFyMVM3bStmUFZGbkliNnl3Q3hNZURUY05lUC9lblRkazFNcTdkM05VZW1sb0xWQThLN28wMUlxM1hicjQ2RGYwVmU5NzE2UlY3UnR2U0xIV1c4T1BCZy8xcU13YTdYVmZWbHFra2o5Y3U0ZmlYWEYyOTR1cDZOOWY4QWU4WXE4UjdDUGJ3cUg1NjJheTVNM1ZOcUltdTl3ZnRrdEFscGRjLzUvZGo2Sy9KNUc2MWNQc2JqT2kzOVlzY1pMdzU5c0tleFh2YkZCdmFXZWVHdSs4WXd2ajJNYmRkczhsb0tWdmVZL2RHRzRJWlg1TFdzZEpWWDVEVVBaOWhvWmJvWCtWVmpQSzdUN21qc09PUEYxb05kdTV3TndhN1hVZnRDc0lFRHR5amEwMWZrZFUrWlRrZzdrRmZrOTQvMmlyeE8vcnBWdEMyWGEyT29hMFE3bFhEbHBWL0xickN3bmNhTGd3OTIvYnBkSmRqTHZyVEEzalp2Zkh0NDJoNW1raC9NSy9JNlliQmVrVS8zSXE5dGwydHpxQnJYUGliYWZXOTI2WmR4Ylk2bzhXSjdnbDBiSEFnMmNMQ1dQVzBmekN2eTJsSjUySXY4M3RIMmxyaHR0S1ZmTjR6NVM3K01hM1BFalJlQ0RldzhzMC9iQi9xS3ZPYloxRVlyTDR4Mjh0ZlowYzdaZmxDTXgzWGVJY2FsWDdObmJCdlg1b2diTHdRYjJKbTIreFY1TFVXdHZjaHJhK1ZIUnp1dTg5UjB6eGlYZnQwazJ0SXY0OXJzR09PRllBTTcxNEcrSWg4Mld2bkRhQk5qZnlmYVZzb3ZpM1p3VWUzVytKaG9oeG5WZlcxWStuVlN0SEh0MnBMNWhEQ3V6UTR3WGdnMnNQTWQ2Q3Z5ajBUYk9ubllpN3gyWjN4RnRPTTZuNVorUHNhbFgvZUpOcTU5dTNTek1LN05EakZlQ0RiUWh3TjlSVjU3a2RkdWpMVVgrVHRpUEs2enprTVlsbjdWR1FsMXh2YjlZbXZqMnZZaDU1QWJMd1FiNk1mQnZDTC9rMmpIZFY2WTNweCtNOXA5ck1hMXo0bk54N1d0MSthSUdTOEVHK2pQc2xma3MzdVJmenJhZVFmRGNaM0QwcThhMXo0M1ZodlhIdFpySHgwYjl5RVhiUTZaOFVLd2dUNHRlMFUrN0VWZUJ4TFZLL0xodU01aDZkZDBYUHVWc2ZtNDltMWovbEdkaS9ZaEg2SXQzQnkwOFVLd2dYNnQ4b3A4OXJqT0d0Y2VsbjRkeUxqMjdEN2tOUm5OdURhSHpIZ2gyRUQvTm92MjhJcjhZTWExSHhCdFhIdDJIL0s2Unc2VDBXcGMyeVlyYkx2eFFyQ0IzV0hlSy9MWjR6cW40OXExOUd2VmNlM2hxTTVoSC9KYlJ6dGZlM1pjMjJRMHR0MTRJZGpBN3JIb0ZmbWlwVi9MeHJXZkgyMWMrM0d4ZmgveXU4WjR2dmFpVFZaRW0yMHhYZ2cyc1B1c01xNWRyOGlYald0UGorbzhPOFo5eU90ODdib24zajdHVFZhdUZTYWpjUWlNRjRJTjdFNnpyOGdYTGYxYU5xNDl1dzk1M1FNZkV1MTg3YnVuTzhiR1RWWk1SbVBiakJlQ0RleGU4OGExNXkzOW1qZXVQUnpWT2QySC9MbnB5VEdlcjMxcWpKdXMxR1MwWVpNVms5SFlOdU9GWUFPNzI2cmoydFAxMm5VL3EzSHRZUi95dDZiWHhYaSs5bFBUWTlOUHhyakp5akFaYmQ0bUt5YWpjY0RHQzhFRzlvWlZ4cldIOWRyRFB1UTFybDM3a0w4blhSRHRudmVxYU9kclB6M0dUVmFHeVdqVFRWWk1SbU5iakJlQ0Rld2RxNHhyVDlkcmZ5cDlMTm85N3Zlam5hLzl4cGkveVVwTlJydHZiRzB5V2tYYk1aMXNhcndRYkdCdm1UZXV2ZGw2N1Urbmo4ZDR2dlpGc1hHVGxhMU9ScXRvMTdpMkdlUXNOVjRJTnJEM0xCdlhudTVEUHB5dlBidkp5blF5V20yeXN0bGt0SGs3bzVsQnprckdDOEVHOXE1bGs5R0djZTNOTmxtcHlXaXZpUFdUMGFZbmZrMTNScnRlekQrbTB3eHlGaG92QkJ2WTJ6YWJqRFlkMTU3ZFpHWGVaTFE2OFd2ZVpMVFpuZEZtaitrMGc1eUZ4Z3ZCQmxnMHJyMW9rNVZQeGZMSmFHZEgyeG50eDZQdGpIWnl1bDJzUDZiem1EQ0RuQ1hHQzhFR0tQT2lQVHV1dmNwa3RHRm50R2VsSjZRem8wMUd1MStNeDNUZVBNd2daMFhqaFdBRERMWnpNdHBMbysyTTlxVDBzekVlMDNtUGFEUElieG5qRFBMall2ME1jbnVROHhYamhXQUR6TnBzWEh1enlXanpka2I3NVZoL1RPZHA2VjZ4ZmdiNWRhSXQrMW8yZzF5MDk2RHhRckFCNWpuWXlXaHZUNitQOFpqT3VtK2VGZk8zTTEwMGc5eXlMMks4RUd5QVJRNW1NdHA3WS8weG5mTzJNLzJoYURQSVQ0cjFlNUJiOXNWWGpCZUNEYkNaQTVtTU5udE01NXZTcjhmOEdlVDNpZmw3a0I4ZGxuMlJ4Z3ZCQmxqbVlDYWp6VzVuT2p1RC9NR3hjUTl5eTc3NGl2RkNzQUZXdGRYSmFIVmYvRWlzbjBIK21tZ3p5SitUemttUFRnK05jUS95WWRuWGpXTDVzaS9SM2dQR0M4RUcySXF0UlB1ek1YOEcrV3ZUdVRGL0QvSmE5blduV0czWmw3WGFlOEI0SWRnQVc3WEtaTFJGTThqZkhXMEcrZm14Y1EveVpjdStobWpYUGRwYTdUMWl2QkJzZ0FPeEtObzFycjNaRFBJUFJadEJQcnNIK2ROaThiS3ZtOFJxcDMySjlpNDBYZ2cyd0lGYVpUTGFkQWI1L2hobmtBOTdrQS9Mdmw2VW5oRWJsMzNkSmNabFg5TzEyalpZMlNQR0M4RUdPRmpMb2ozTUlKKzNCL21Gc2RxeXI5dEVPKzFyczdYYU5salpoY1lMd1FiWURvc21vdzFuYXk5YTl2Vyt0Qys5SlRZdSszcFVlbENNcDMzZE51WWYwV21EbFYxc3ZCQnNnTzJ5bFJua3F5ejdlbUswZSs1MHJmYnRZanlpc3paWU9TWnNzTEtyalJlQ0RiQ2RaaWVqYmJZSCtXYkx2bDRXNDJsZjA3WGFwMFRiWUdVNG9yTTJXRGsyMmoyNzFtcmJZR1dYR1M4RUcyQzdMWnBCdnVxeXI3ZkYrdE8raHJYYXd4R2R0Y0hLSGRNdHdnWXJ1OTU0SWRnQWg4SzhhQStUMFpZdCs1cWU5dldLR05kcTF4R2R3d1lyOTR5dGJiQWkycDBhTHdRYjRGRDVjcXdQOTJiTHZ1cit1VC9hc3ErNnA5WmE3WGRFdTgrK01zWWpPbXVEbFVlazAyUDVCaXZUYU0rdTFSYnRUb3dYZ2cxd3FDMkxkczBnbjNmYTEreGE3VHFpc3paWWVWdzZJN2Eyd1lwb2QycThFR3lBdzJHemFNOWI5aldzMVI2TzZIeGpPaS9HRFZZZUgvTTNXTGxwdEExV1JIdVhHQzhFRytCd21SZnQyV1ZmeTQ3b3JBMVdYcHllR2VNR0t3OU05MDUzamJiQnltYTdvb2wyWjhZTHdRWTRuRmFKOXJ5MTJxdHVzREs3SzVwb2QyNjhFR3lBdzIzWnNxL1phSDhpMmxydGVSdXNQRHZhQml0blJ0dGdaWFpYTk5IdTNIZ2gyQUJId3JKb3o5dGc1YVBwQXpGL2c1VnpZdjJ1YUtLOVM0d1hnZzF3cE14YjlqVjdSR2RGdTlacUR4dXNWTFJuTjFnNU56MHZ4bDNSSHBMdUYrTldwck9IaG9oMlI4WUx3UVk0a3VaRmV6cURmTjRHSzdVcjJuU0RsZk9qN1lwVzBhNWQwWDQyMmxhbTAyalgvdU5iam5ZSTl4RTNYZ2cyd0pHMkxOcnpObGlwWGRHR0RWWXVpQmJ0VjhTNGxlbWlhQThuZlZXMDYzak96YUx0YVhzSEdDOEVHMkNuV0JidGVSdXNUS005YkdWNm9OR2VucWt0Mmp2RWVDSFlBRHZKWnRHZWJyQXl1eXZhYkxSci8vR3RSTHZPMUo2TmRuVkJ0SSt3OFVLd0FYYWFlZEdlcnRXZTdvcFcwYTVkMFlhdFROOFI2NlA5bEJpamZmK1lIKzJqWTR4Mm5hazlHMjJUMFk2ZzhVS3dBWGFpWmRHZTNSVnROdHAxZjE0VTdWT2luYWw5czJqMytCT2lSZnZLc1Q3YXp0VGVBY1lMd1FiWXFhYlJMb3QyUmRzczJxK01NZG8vRisxTTdYblJ2bVk2SmxxMEx4Y3QydFVEMFQ3Q3hndkJCdGpKWnFNOTNXRGxZS0w5Z0hUM2RJZDA4M1REYU5FK050cjkvL0xwcUJEdEkyNjhFR3lBblc2emFFKzNNbDBXN2VlbnA2YkhwSWVsVTlNOTBoM1RMZEtOMHJYU2Nla3EwYUo5MlJqUDFCYnRJMkM4RUd5QUhteDN0QitiSHA1T1MvZE1kMHEzVE4rWnJoMHQybGROVndqUlBxTEdDOEVHNk1XWFkzMjRWNG4yY0tiMk85TWIwcXZTQzZMZHg4OUtqMGlucDN1bDcwdTNTamRPMTBuSHgveG96OTBWYlZsNE9ERGpoV0FEOUdUVmFOZEpYeFh0aTJOOXROK1lYcDFlbUo2ZUhwZk9pSFovLzhGMDUzVHJkSk4wM1dnZHVGcXN1Slhwc3Zpd2RlT0ZZQVAwNWtDai9ZZnB3dlNtZEY1NlVYcEdlbno2cWZSajZZZlNYZEpKNmFicGVpSGFSOVI0SWRnQVBUcVFhSDg0V3JRdlNtOU92NUZlbko2WnprNlBUQTlNOTA1M1RiZEpKMGFMOW1iSGN4clRQb1RHQzhFRzZOVldvdjJaYVBmcGo2VDNwWDNwTGVrMzAwdlNzOUlUMHFQU2c5SVBwN3RGaS9heU03Vk5SRHVFeGd2QkJ1alpWcVA5aWZSbjZZK2kzYjkvSjcwbXZUUTlPejB4blprZUhDM2FKNmZieHVKb216MStpSTBYZ2czUXUyWFJyak8xL3lGOVBuMDJXclEvbWo2UTNwWGVtbDZiWHBhZW04NkpkcSt2YU44MzVrZDdHTk8yNU9zUUd5OEVHMkEzV0JUdE91bHJHdTIvUzU5TG40d1c3USttZDZlM3BkZWxjOVB6MHBQU285TkRZbU8wcHhQUnBrdSs3SWgyQ0l3WGdnMndXOHlMOXZSNHpvcjJsNkpGdSs3WG4wcC9uajZVM3BQZW5zNVBMNC9GMFo1T1JLdEdUTmRwejI1amVva1E3WU0yWGdnMndHNnlMTnAxZjY1b2Z5SGFQWHQvK2xpMCsvaDdZM0cwaHpIdFlTSmFMZm1xZGRySFI0djI3TjdqRzg3VFhoWW01aHN2QkJ0Z04xb1c3VHBUdTZMOTE5SE8xUDZMR0tOOVFXeU05akNtWGRHdUpWOG5SZHRjcFhaRU95N0d2Y2N2RSt2UDAvWnEvQ0NORjRJTnNGdHRGdTA2NmF1aVhXZHFyeEx0bW9oV3M4ZHJ5VmV0MDY3TlZXNGRiUnZUYTBlTGRuVmpPSnBUdExmSmVDSFlBTHZadkdoUGorY2NvbDM3ajFlMGEvL3gyZGZqNTBhYlBWNUx2bXFkZG0ydVVqdWkxVGFtdDRwMllFaWQ4blZzdFBPMHZ5VkVlOXVNRjRJTnNOc3RpM2F0MVo1R2UvcWtYZEd1MmVNdmk3Wk8rd25SZGtTcmJVeHI3L0U2TU9TVzBZN21yUE8wajRreDJyV3hpbWdmcFBGQ3NBSDJnbW0weTZyUnJ0bmp0ZVNyMW1tL05OcU9hR2RIMjN1OG1sQ25mTlhSbkxkSU40d1c3YVBUbFdLTXRuM0hEOEo0SWRnQWU4VnN0S2NickV5alBZeHAxK3p4V3ZKVjY3UnJjNVhhRWEyMk1hMjl4eDhmN1pTdjA2T2RwMzNIZFBOb3pUZ2h4bWc3TE9RZ2pSZUNEYkNYTEl2MmRDTGEvbWpydEd0emxkb1JyYll4cmIzSDY4Q1FPdVhyY2RITzB6NHQzU1BkSWQwc1dqZStQZG9XcHFKOWtNWUx3UWJZYTFhSjlyQk8rMU14Ym1OYTkvczZNS1JPK2Fxak9lczg3YlBTdzlPcDZlN3A5dEdpZmYwUTdXMHhYZ2cyd0Y2MGJFeDdHdTFQUm90MkhSaXlMOXJSbk9lbEYwYnJ3V1BUdzlJRDBpblJvdjNkc1Q3YXN5ZDhpZmFLeGd2QkJ0aXJGa1Y3dWlQYXNQZjRKNktkOGxWSGMxNlUzcFJlblY2UW5wb2VrMzRpM1Q5YXRHOFhvcjB0eGd2QkJ0akxwdEZldEkxcFJYczQ1YXZPMC83RGRHRjZZM3BWZW42MGFQOWNqTkd1Wm9qMk5oZ3ZCQnRncjlzczJ0T2pPVDhUN1Y3LzRXalJmbWQ2UTNwbHRHZy9KVnEwSDVydUYrdWpYY2R5YmhadEozd3RNRjRJTmdDclJmdHZvMFg3NHZTbjZRK2lSYnRhVU5IK2xXalIvdG5ZR08zcFdkcnpvdTFZemdYR0M4RUdvRmtVN2VFODdicS9WN1QvTXRaSCt4MXhjTkd1czdSRmU0SHhRckFCR0cwVzdkcFlaVjYwZno4MlJ2dkpzVEhhdDQzMTBiNWF0R2hmTmtSN29mRkNzQUZZYnpiYXczS3ZlZEd1dzBMK0pOWkgreFV4UDlvbnh4anQ2MFZyVEVYN0NqRkd1ODdTRnUySjhVS3dBZGpvWUtMOSttalIvdVVZby8yUWROOW8wYjVOT2pIR2FGODF4bWhYZzZiUnZrVHM4V2lQRjRJTndIeXJSTHNPQzFrbDJvOU9EMDQvbk80V0xkbzNUZGROeDBlTDl1WFRVVEZHdTVaN3JZdjJzcmp0UnVPRllBTXczNWZqd0tOOVFZelJmbDU2VXJSK0RORythem9wM1NSZEp4MlhyaEl0MnM3U25oZ3ZCQnVBeFE0MDJuV1dka1g3L1BUeWFORStKNTJaSHBUdW5lNlNicDF1bks2ZGpvM1duc3VGYUgvRmVDSFlBR3h1TzZKOWJucHVlbUo2VkhwZytxRjA1M1NyOUozcFd0R2lmZVZvWjJtTGRob3ZCQnVBNWJZUzdVK252NGpXaG9yMjI5UHIwc3ZTczlNVDBpUFRqNlVmVE4rYmJwbHVsSzZaam9reDJyV3h5cDZPOW5naDJBQ3Nack5vMXdsZkZlMDZTM3MyMnU5SmIwdXZUUzlOejBwbnA1K0sxcFY3cFR1bFc2UWJwaFBTMGJIeFdNNDl1ZHhydkJCc0FGYTNhclQvT2xxMFA1WStsTjZkM3BwZWsxNlNucGtlbjg1SXA2ZDdwanVtbTBmcnp1eSs0M3QyWTVYeFFyQUIySnBsMGY3SEdLTzlQLzE1K21CNlYvcWQ5SnZweGVrWjZYSHBFZW5VZFBmWS9DenRQUm50OFVLd0FkaTZhYkFYUmZzTDBicndxZlRSOUlGb3pYaEwrdlgwb3ZTMDlOajBzUFNBR00vU250M0NkTS91aGpaZUNEWUFCMlkyMm5YUFh4VHRUMGFMOWgrbGZlbk42Ynowd21oTmVVeXNQMHY3dHJGK0M5T1Zka05iRnI4ZWpSZUNEY0NCV3hUdE9wYXpXdkNsOUhmcGMra1Q2Yy9TKzlKRjZZM3AxZEhPMG41cWpHZHB6MjVodXVwdWFMdnlLWHU4RUd3QURzN3NlUFp3d3Rkc3REOGJMZG9mU1grWUxreHZpUFVuZk0xdVlYcFNiTndOYlU5dHJESmVDRFlBQjIremFOZFoyditRUHA4K0U2MFhINDUybHZZN1l6emhxL1lkSDdZd3JkM1E3aE4yUTR2eFFyQUIyQjZyUkx0TytLcG9YeHpyejlLdWZjZGZIdXQzUS92eG1MOGIyakd4aHpaV0dTOEVHNER0c3lqYXRSdGFSYnNhTVhzczUreHVhTStKNWJ1aEhSMXRZNVVoMnJ0MnVkZDRJZGdBYksvTm9qMjc3L2hXZDBNYk5sYXAzZEN1SHVOdWFBdlhhQzhMNGs0M1hnZzJBTnR2TnRxeis0N1BibUU2YnplMFgwby9uMzR5blpidWtlNlFiaFliTjFiWmRJMzJzaWp1Wk9PRllBTndhQ3lLOXV3V3B2dWpiV0U2dXh2YXIwYmJEZTJzOVBEWXVCdmF2STFWNXEzUjd2clYrSGdoMkFBY09wdEZlM1kzdE5yQzlQMngrVzVvOTQ5eFk1VmFvMTBicTJ5MlJydjc4ZXp4UXJBQk9IUytIS3RIKzVQUk5sWVpka043VTdTTlZWNFFHemRXR2RabzN6UjIrUnJ0OFVLd0FUaTBwc0V1eTNaRHE0MVZhamUwQzZOdHJQS3EyTGl4U3EzUnZtdk1YNk05dTl5cjY1bmo0NFZnQTNEb0xabzVQbzEyYmF4U3U2RU5HNnZVYm1qdmpIRmpsZWVsYzlLWnNmb2E3ZTVuam84WGdnM0E0YkZadEdkM1E1dHVySEpCT2orZEd4dlhhUDlBdERYYXQwZzNqTGJjNitoWWZ5Um4xelBIeHd2QkJ1RHdXUlR0WVdPVllUZTBXcU05dTdIS29qWGE5MHgzalBYTHZYYk56UEh4UXJBQk9MeVdSWHZZV0dXVk5kcVBpUG5MdmFwZnUyTG0rSGdoMkFBY2Z2T2lQYnV4eXFJMTJyOFJiWTMyMDJQeGNxL2hTTTd1WjQ2UEY0SU53SkV4RyszWjVWNUR0RCtWUGhyakd1MDNwL05pL1hLdmg4UzQzT3ZXMFk3azNCVXp4OGNMd1FiZ3lGa1c3WGxydEM5S2I0ejF5NzJHSXpudkhidHM1dmg0SWRnQUhGbERzRGRibzEzTHZXcU45dXh5cjVkSFcrNzF4R2hIY3RiTThlRjByMVZuanUvb3ArenhRckFCT0xLbVQ5bER0S2RydERkYjdqVWN5Zm5zOUF1eDlabmpOWjY5bzZNOVhnZzJBRWZlb3BuajB6WGEwK1ZlMVozaFNNN2ZpdGFrNmVsZXA4WTRjL3k3WXZITThSMC9DVzI4RUd3QWRvYk5sbnROejlHdTVWNkxUdmVhTjNQOE50SDJITzl5NXZoNElkZ0E3QnlyTHZmNlZMVFR2VDRRNjJlT3Z6RFd6eHovNFppLzUzZzNrOURHQzhFR1lHYzVsRFBIYjVTdUdXMFMycFZpbklRMmpmYU9lc29lTHdRYmdKMW5VYlRubmU0MWIrYjRjNlBOSEovdU9YNm5hRFBIcTJzMUNlM3EwV2FPMXlTMEhUdHpmTHdRYkFCMnBtWEx2VmFaT1g1Mk9pT2RIbTNtK0IxaTNMNzBHakhPSE4reDI1Y0tOZ0E3M1lIT0hLODl4MnZtK0xEbitPUFN3OU1EMGluUjJmYWxnZzFBRHphYk9UNTdVTWk4UGNkZmxKNldIcE4rSXQwdjJ2YWxKOFhpN1V0MzFDUTB3UWFnRjF1ZE9UN2RjL3pWNmZucEtlblI2Y0hwUHVrdTBkcFcyNWZXSkxSallvZE9RaE5zQUhxeTFabmo3MHNYcGpla1YwYmJ2dlNjYU51WFBqQTJibDg2T3dsdHg0eG5DellBdlprWDdYbDdqbGVQYXViNEg2UjNwUFBUdVRGLys5TFpTV2c3YmljMHdRYWdSN016eHpmYmMveFAwbnRqL3ZhbGo0aTJmZW1xazlDTzJIaTJZQVBRbzJVeng2dEJ3OHp4djBnZmlqWUo3WGRqM0w1ME9nbnR2akZPUWx0bEo3VEQvcFF0MkFEMGFyT1o0OU5KYVB0ai92YWxMNGh4RXRwbU82SE5icXB5UkU3MkVtd0FlcmJWU1dpMWZla3dDZTBWTVo2aFBic1QyczFqM0FsdGRsT1ZJektlTGRnQTlHNnphQStUMEtiYmwwNG5vYjBzTnU2RWRvOFlqK084WHF5NHFjcXk0QjRzd1FaZ041aEdlM2I3MG1XVDBHb250R2VrczJJOGp2UGtHSS9qdkU0c1A5bnJrRDlsQ3pZQXU4V2ltZVBUU1dpZmpqWUpiWFludERxT3M1bzJQWTV6ZGxPVkdzK2VicXB5V0E4SkVXd0Fkb3V0VEVMN2FMU2QwUGFsTjhWNEhPZVQwcG14Y1ZPVlJlUFpoMjFURmNFR1lEZlp5aVMwajhSNEhPZnJveDNIK1p3WU4xV1pqbWZYcGlvMW5sMDlyUEhzMmxUbHNJNW5DellBdTgyaWFNL2JDVjNhbWh3QUFCUFFTVVJCVkcwNGp2UHQ2YlV4YnFyeXVCaFA5cXJ1elk1bmIzWkl5Q0Y1eWhac0FIYWpSWlBRWm8vakhEWlZlWGUwVFZXR2s3MTIzSGkyWUFPd1d5MGF6NTRleDdrLzFtK3FVdVBaZGJMWGpodlBGbXdBZHF0NWs5Q1duZXhWNDluVnRObng3T3JlOUpDUXd6NmVMZGdBN0dhYlRVSTcxT1BaMi9xVUxkZ0E3SGFMeHJPSFRWV0c4ZXlQeC9hTloyLzdmdU9DRGNCZU1BUjdpUGFoSHMvZTl2M0dCUnVBdldDN3g3TVhyYzgrWk9kbkN6WUFlOFhoR004K1pPZG5DellBZThuaEdNK2VkMzcyUWI4YUYyd0E5cHJ0SHMrK1U0em5aMThqVmhqUFhoWm53UWFBN1IzUFBqMlduNSs5TFZ1WENqWUFlOUYyam1mZlA5cjUyU2VsbTZScnAyT2lqV2R2MjlhbGdnM0FYclVkNDlrL214NmM3cFB1bkc2WmJwaE9TRmVQY1R6N29KZDZDVFlBZTlsV3g3UDN4ZnJ6czg5Smowby9sdTZWN3BodWxyNGpXanV2R2h1M0xqMmdwVjZDRGNCZWRxRGoyYTlQNTZabnA3UFRUNlpUMHlucHRuRUlsbm9KTmdCNzNWYkhzOStiM3BaK0s3MDRQVDA5TnYxRXVtKzZheXhlNm5YQXAzb0pOZ0NzUHA0OW5KLzlydlNXZEY1NlFYcEt0QzcrZUt4ZjZuWDlhRXU5RHZyVnVHQURRTE5zUFB1dm80MW5melQ5VWJvb3ZTRzlJajAzUFNIR3BWNTNUN2RMSjBaN05YNWNqSy9HYTliNGxsK05DellBTkt1TVozOHVmU0o5T1AxQnVpRFdML1U2S3owczNTODJ2aHBmT210Y3NBRmdOWXZHczZ0bk5aNzkrZlNaZEhHMDVrMlhlcjB3MnF2eFI4ZkdWK1BEclBGaFE1VXRUMEFUYkFCWWIzWTh1MTZOMTNqMmRLblhwNk10OVhwL3RLVmViMHl2alBacS9CZWl2Um8vTGNaWjQ5TU5WZXJzN0MwL1pRczJBR3cwKzJwOEdNLytwL1RGR0pkNmZTVEdWK092aTliRVowU2JOZjdRV0wraHlyRFhlRTFBVy9pVUxkZ0FzTHJObG5yVmVQYXcxR3Y2YXZ4MzBxK241MGM3SUtRMlZQblJhSHVOMXdTMFdwczlQR1hQam1VdmZTMHUyQUF3Mzd4b1Q1ZDZ6YjRhdnpCYUQ4OU56NHEyMTNpdHphNWpPT3NwK3hiUmxua05ZOW5EalBFTjY3SUZHd0MyWnQ1NDl1eXI4Wm8xUG15bzh0Wm9FOUJxYmZhVG96MWxWek5ybWRkdDBvMWpuREZlUjNCT1QvTVNiQUE0Q0l1V2VnMnp4bXREbFk5RjIydjhvbWhOZkZsNlpyU3g3SWVrZTBlYk1mN2Q2YnJSdGl3ZEpwOU5OMUlSYkFBNFFJdGVqZGVzOFhsUDJiWE1xM1pBcThOQmFqT1ZNNklkd1ZucnNtOFZyYWZWMWVycmNQem0wbkZzd1FhQTVlYTlHcDgrWlE5ajJiVUQyanVpYmFaUys0dy9OWjBaYmZMWjhGcThObEk1SWRiUEZwK09Zd3MyQUJ5RWVVL1p3MWgyN1lCV004WnJuL0hxWVcxWmVtNjAzYzhla3g2VWZpRGRQdHBzOFd0Rkc4Y2U5aGV2Y1d6QkJvQnRNRHhsVDhleWh4bmp0Yzk0cmN1dUxVdmZFKzFna0ZlbDU2U2ZqelpiZkJqSC9xNW8rNHNmRTF1WWVDYllBTEM2UmEvRjZ6U3YvZEhPeks2TlZPcjR6VnFUWGVQWXRmUFpJNklkdmZsOTZXYnBldEVtbnRWNjdLT2lUVHdUYkFEWUpyT3Z4V3VKMTdDUlNzMFdyM0hzOTBYYitldzEwWlozblJQanhMTzdSRnVQWFh1TEh4ZnJaNG9MTmdCc2srbHI4ZWs0ZHAza1ZUdWYxWG5adFluS082Tk5QSHRSdFBYWVA1MU9UWGVMdGsxcGJhQnlmTFFqTjZmQlhyaTBTN0FCWUhYemdqMHM3NnBnZnp6YWV1d0xvKzB0WGpQRjZ3U3ZSMFk3RE9Ua2FFdTdab05kelJWc0FOZ21zOHU3cW5GRHNJZVo0aCtNdG9ISytla2wwWloyMVk1bnAwY0xkclcwbWlyWUFIQ0l6QXQydGE2YVYrMGJsbmJ0UzYrUEZ1eHFaYTNGcm1CWFE0ZGdWMXNyMk5YYURZZUFDRFlBSExobHdhNEdUb05kalJ5Q1hlMmNEZmF3MjVsZ0E4QTJFMndBNk1DcXdhNDJEc0d1WmdvMkFCeEdnZzBBSFJCc0FPakFzbUJYQzZ1SmdnMEFSNUJnQTBBSEJCc0FPaURZQU5BQndRYUFEZ2cyQUhSQXNBR2dBNElOQUIwUWJBRG9nR0FEUUFjRUd3QTZJTmdBMEFIQkJvQU9DRFlBZEVDd0FhQURnZzBBSFJCc0FPaUFZQU5BQndRYkFEb2cyQURRQWNFR2dBNElOZ0IwUUxBQm9BT0NEUUFkRUd3QTZJQmdBMEFIQkJzQU9pRFlBTkFCd1FhQURnZzJBSFJBc0FHZ0E0SU5BQjBRYkFEb2dHQURRQWNFR3dBNklOZ0EwQUhCQm9BT0NEWUFkRUN3QWFBRGdnMEFIUkJzQU9pQVlBTkFCd1FiQURvZzJBRFFBY0VHZ0E0SU5nQjBRTEFCb0FPQ0RRQWRFR3dBNklCZ0EwQUhCQnNBT2lEWUFOQUJ3UWFBRGdnMkFIUkFzQUdnQTRJTkFCMFFiQURvZ0dBRFFBY0VHd0E2SU5nQTBBSEJCb0FPQ0RZQWRFQ3dBYUFEZ2cwQUhSQnNBT2lBWUFOQUJ3UWJBRG9nMkFEUUFjRUdnQTRJTmdCMFFMQUJvQU9DRFFBZEVHd0E2SUJnQTBBSEJCc0FPaURZQU5BQndRYUFEZ2cyQUhSQXNBR2dBNElOQUIwUWJBRG9nR0FEUUFjRUd3QTZJTmdBMEFIQkJvQU9DRFlBZEVDd0FhQURnZzBBSFJCc0FPaUFZQU5BQndRYkFEb2cyQURRQWNFR2dBNElOZ0IwUUxBQm9BT0NEUUFkRUd3QTZJQmdBMEFIQkJzQU9pRFlBTkFCd1FhQURnZzJBSFJBc0FHZ0E0SU5BQjBRYkFEb2dHQURRQWNFR3dBNklOZ0EwQUhCQm9BT0NEWUFkRUN3QWFBRGdnMEFIUkJzQU9pQVlBTkFCd1FiQURvZzJBRFFBY0VHZ0E0SU5nQjBRTEFCb0FPQ0RRQWRFR3dBNklCZ0EwQUhCQnNBT2lEWUFOQUJ3UWFBRGdnMkFIUkFzQUdnQTRJTkFCMFFiQURvZ0dBRFFBY0VHd0E2SU5nQTBBSEJCb0FPQ0RZQWRFQ3dBYUFEZ2cwQUhSQnNBT2lBWUFOQUJ3UWJBRG9nMkFEUUFjRUdnQTRJTmdCMFFMQUJvQU9DRFFBZEVHd0E2SUJnQTBBSEJCc0FPaURZQU5BQndRYUFEZ2cyQUhSQXNBR2dBNElOQUIwUWJBRG9nR0FEUUFjRUd3QTZJTmdBMEFIQkJvQU9DRFlBZEVDd0FhQURnZzBBSFJCc0FPaUFZQU5BQndRYkFEb2cyQURRQWNFR2dBNElOZ0IwUUxBQm9BT0NEUUFkRUd3QTZJQmdBMEFIQkJzQU9pRFlBTkFCd1FhQURnZzJBSFJBc0FHZ0E0SU5BQjBRYkFEb2dHQURRQWNFR3dBNklOZ0EwQUhCQm9BT0NEWUFkRUN3QWFBRGdnMEFIUkJzQU9pQVlBTkFCd1FiQURvZzJBRFFBY0VHZ0E0SU5nQjBRTEFCb0FPQ0RRQWRFR3dBNklCZ0EwQUhCQnNBT2lEWUFOQUJ3UWFBRGdnMkFIUkFzQUdnQTRJTkFCMFFiQURvZ0dBRFFBY0VHd0E2SU5nQTBBSEJCb0FPQ0RZQWRFQ3dBYUFEZ2cwQUhSQnNBT2lBWUFOQUJ3UWJBRG9nMkFEUUFjRUdnQTRJTmdCMFFMQUJvQU9DRFFBZEVHd0E2SUJnQTBBSEJCc0FPaURZQU5BQndRYUFEZ2cyQUhSQXNBR2dBNElOQUIwUWJBRG9nR0FEUUFjRUd3QTZJTmdBMEFIQkJvQU9DRFlBZEVDd0FhQURnZzBBSFJCc0FPaUFZQU5BQndRYkFEb2cyQURRQWNFR2dBNElOZ0IwUUxBQm9BT0NEUUFkRUd3QTZJQmdBMEFIQkJzQU9pRFlBTkFCd1FhQURnZzJBSFJBc0FHZ0E0SU5BQjBRYkFEb2dHQURRQWNFR3dBNklOZ0EwQUhCQm9BT0NEWUFkRUN3QWFBRGdnMEFIUkJzQU9pQVlBTkFCd1FiQURvZzJBRFFBY0VHZ0E0SU5nQjBRTEFCb0FPQ0RRQWRFR3dBNklCZ0EwQUhCQnNBT2lEWUFOQUJ3UWFBRGdnMkFIUkFzQUdnQTRJTkFCMFFiQURvZ0dBRFFBY0VHd0E2SU5nQTBBSEJCb0FPQ0RZQWRFQ3dBYUFEZ2cwQUhSQnNBT2lBWUFOQUJ3UWJBRG9nMkFEUUFjRUdnQTRJTmdCMFFMQUJvQU9DRFFBZEVHd0E2SUJnQTBBSEJCc0FPaURZQU5BQndRYUFEZ2cyQUhSQXNBR2dBNElOQUIwUWJBRG9nR0FEUUFjRUd3QTZJTmdBMEFIQkJvQU9DRFlBZEVDd0FhQURnZzBBSFJCc0FPaUFZQU5BQndRYkFEb2cyQURRQWNFR2dBNElOZ0IwUUxBQm9BT0NEUUFkRUd3QTZJQmdBMEFIQkJzQU9pRFlBTkFCd1FhQURnZzJBSFJBc0FHZ0E0SU5BQjBRYkFEb2dHQURRQWNFR3dBNklOZ0EwQUhCQm9BT0NEWUFkRUN3QWFBRGdnMEFIUkJzQU9pQVlBTkFCd1FiQURvZzJBRFFBY0VHZ0E0SU5nQjBRTEFCb0FPQ0RRQWRFR3dBNklCZ0EwQUhCQnNBT2lEWUFOQUJ3UWFBRGdnMkFIUkFzQUdnQTRJTkFCMFFiQURvZ0dBRFFBY0VHd0E2SU5nQTBBSEJCb0FPQ0RZQWRFQ3dBYUFEZ2cwQUhSQnNBT2lBWUFOQUJ3UWJBRG9nMkFEUUFjRUdnQTRJTmdCMFFMQUJvQU9DRFFBZEVHd0E2SUJnQTBBSEJCc0FPaURZQU5BQndRYUFEZ2cyQUhSQXNBR2dBNElOQUIwUWJBRG9nR0FEUUFjRUd3QTZJTmdBMEFIQkJvQU9DRFlBZEVDd0FhQURnZzBBSFJCc0FPaUFZQU5BQndRYkFEb2cyQURRQWNFR2dBNElOZ0IwUUxBQm9BT0NEUUFkRUd3QTZJQmdBMEFIQkJzQU9pRFlBTkFCd1FhQURnZzJBSFJBc0FHZ0E0SU5BQjBRYkFEb2dHQURRQWNFR3dBNklOZ0EwQUhCQm9BTzdJcGdmeWdFRzREZGJWbXdxNFU3T3RqN1lyVmdpellBdlJvNnRpelkrMklIQmZ2TUdJUDkraEJzQUhhL3JRUzcyamdFdTVyWlRiRC9POVpIVzdnQjZNVzBYZFd5YWxwM3dYNUpqTUgrWUxvNGZTNTlNZjF6K3JmMG56RUdlemJhQU5DTG9XUFZ0R3BiTmE1YVY4MnI5bFVEcTRYN29yV3hHbm5ZZ24zbDJCanMwOWYreDUrNjltSE9UeGVsRDZTUHA4K21MNlIvU3YrYS9pUEdwK3hwdUFHZ0owUEhxbW5WdG1wY3RhNmFWKzJyQmxZTHE0blZ4bXBrdGJLYVdlMmNEWFkxOXFDQy9YVnIvK0hMcnYyWEhiLzJYMzZyZEhJNkxUMHFQU1g5YW5wZGVtZDZmL3BZK3N2MCtmU2xhSzhLNmhkSS9jWHExOGgvQVVESHFtWFZ0R3BiTmE1YVY4MnI5bFVEcTRYVnhHcGpOYkphV2MwOExWcERxNlhWMUdwck5iWmFXODJ0OW01THNLKy85ajl5dDNScSt1bjA1UFNpOUZ2cGd2Uys5TkcwUC8xTnRGY0UveGp0TDFTL1F1b3Y5KzhBMExGcVdUV3QybGFOcTlaVjgvWkhhMkMxc0pwWWJheEdWaXVybWRYT2FtaTF0SnE2YmNIK2h0Z1k3RnVtdTZZSHBEUFNFOVB6MDIra3Q2YjNwaitOTnVoZXJ3YitOdHBmcEg1OTFDdURlcy8vTHdEUXNXcFpOYTNhVm8ycjFsWHpxbjNWd0dwaE5iSGFXSTJzVmxZenE1M1YwR3JwYkxDcnVRY2Q3Q3VsNDlKM3BKdW5PNmY3cGtla3M5UHowcXZTbTZNdEZLOTM5MytlUGhudEwxQy9PdXBWUWIzZnI3L1kzd05BeDZwbDFiUnFXeld1V2xmTnEvWlZBNnVGMWNScVl6WHk3R2pOckhaV1E2dWwxZFJxYXpYMmdJUDkxVEVHKzZoMHhYUnN1bTc2N3ZTOTZkN3BvZW1zOU16MDBtaUQ2L1VLb0g1WjFKVDIrdUQxYTJOL3RQZjY5UmVxR1hSL0JRQWRxNVpWMDZwdCs2TzFycHBYN1h0dnRCWldFNnVOMWNocVpUV3oybGtOclpaV1U0K04xdGhxN1JEc2F2Q1dnMzJwdGYrU0s2U2owN1hUaWVuMjZWN3BnZEYyYnFuQjlCZWs4OUtib2cyMDF3ZXVYeG4xYXFEZTUzOHMyc3k1aTZQOXhRQ2dWOVd5YWxxMXJScFhyYXZtVmZ1cWdkWENhbUsxc1JwWnJheG1WanVyb2RYU2FtcTF0UnBicmEzbUhsQ3d2M2J0UDN5WmRQbDB0WFROZE9OMFVqb2wydUI1dlpOL2ZIcFd0S25yOWI2K1Btajl1cWhYQXZYaGEvQzlac3pWWCthRDBYNkJUUDB4QU94Z3M5MnFsbFhUcW0zVnVHcGROYS9hVncyc0ZsWVRxNDNWeURPaU5mT1VhQTJ0bGxaVHE2M1YyR3B0TmJmYXUzS3d2eXJHWUg5OStxWjB1WFNWZEkxbzA5QnZHZTBkL0gzU2c2UDljamduUFNmYUI2eGZGZlVxb043ZjE2QjcvUVhxRjBldFNkczM0L2NBb0FQN1psVFRxbTNWdUdwZE5hL2FWdzJzRmxZVHE0M1Z5R3BsTmJQYVdRMnRsbFpUcTYzVjJHcHROWGNJOWxmRkZvTmRDN2kvTWNiTlU0Nkw5czY5SHVWdmwrNGViY2JidzlMUFJmdGc5V3VpWGdIVWUvc2FiSzlmR1RXdHZkYWkxVi9rOVJPL0RRQWRtVGFzbWxadHE4WlY2NnA1MWI1cVlMV3dtbGh0ckVaV0s2dVoxYzVxYUxXMG1scHRyY1pXYTZ1NVd3NzJkTGV6NmNTenE2Y1QwbzJpL1VLb2dmTjZIMy9hMmdlcVh4SDE2Ri92NjJ1UXZXYkcxWFQyV29OV0M4ZGZzdWJYQUtCalE4K3FiZFc0YWwwMXI5cFhEYXdXVmhPcmphZEZhMlUxczlwWkRhMldYajNXVHpoYnQ4dFpiQmJzbVhIc1lXbFh2Vk9mdmhhdk5XUDF5K0NtNmRiUkh1L3JnOVN2aDNya1B5UGFoendyMmpUMldudjI1R2gvZ2RxYTdSY0JZQmVvcGxYYnFuSFZ1ck9qdGE4YVdDMnNKbFlicTVIVnltcG10Yk1hV2kyZHZnNi9WQ3haMHJWWnNLZmoyTU9PWjhOVGRyMTNyL1ZqSjY1OWdQclZVSS82OVg2K0J0VnJKbHhOWDY4MVovV2hhM2VYUjBYYlIzWHFad0NnSTdNZHE3WlY0NnAxMWJ4cVh6V3dXbGhOckRaV0k2dVZKMFpyWnpWMGVMcXV0bFpqcCtQWFd3cjJNSTQ5KzVUOUxkSGV0OWMwOUJQVy9vZnIxMEk5NHRkNytmb0ZjVXEwWHhPMTFxd1dpTmV2aS9yZ3AwWGI5UHhIQUdBWHFLYWRGcTF4MWJwcVhyV3ZHbGd0ckNaV0c2dVIxY3BxWnJXekdsb3RyYWJPUGwwdkhML2VMTmlYaUkxUDJmV2V2UjdmdjNYdGY3QitKZFNqZmIyUFAzSHRRNTBVYlkxWi9hS29EMXRic05XK3FTZEhPNkVFQUhhTGFsczFybHBYemF2MlZRTlBpdGJFYW1NMXNscFp6YXgyVmtPcnBVZkZncWZyV0NYWWMxNkxUNSt5dnpIR2FOZXZnM3FrUHo3YUw0YjZNRGVJdHJhc1BtRHQ0bEpicjlVSHZ0V2E3d0dBWFdUb1c3V3VtbGZ0cXdaV0M2dUoxY1pxWkxXeW1sbnRIR0pkVFoxOXV2N2ZZTStMOVdiQm5uM0t2bVNzajNZOXl0Zjc5NnVzZllpYW5sNi9IbW9oK0xYWFBtUTkvbDkvelEwQVlCY2FPbGZOcS9aVkE2dUYxY1JxWXpXeVdsbk5ySFllRldPc3AwdTVObjI2bmh2c0ZhSmRqL0QxM3IwR3l5KzM5aUd1dlBhQmF0ZVdvNlB0ajFvZjlQaUpid09BWFdUYXVHcmVzZEVhV0Myc0psWWJxNUhWeW1wbXRiTWF1dVZZTHd6MkpOcVhpUFhScmtmM3I0LzE0YTVmQzkrODlvRnFpN1VyckgzQUs2MTkyS2x2QllCZFlMWnYxYnhxWHpXd1dsaE5yRFpXSTZlaHJvWldTNmV4M3ZSVitLckJubzMyMThUR2NOZUM3MjljKzBDWFdmdHc1Ykl6dmhrQWRwSFp6ZzM5cXhaV0U2dU4xY2paVUUvSHJGZDZ1dDQwMkRQUm5yNGVudzMzSmRjTUFSOGlQcmcwQU94aTArWU5IYXdtRG4yY0RmVzYxK0N4UXF5WEJudE91S2RQMjBPNGgzZ1B2bTZCU3dMQUxyS29kOU1tRHAyY2hucmxwK290QjNzbTJyUHhuZ1o4Nm1zQVlBK1oxOEpwSzlkMWRGbDNEempZbTRSN1VjUUJZSzlhMk1wbG5kMjJZRzh4NEFDd3B5M3I2S3FXL2dFQTRNaGIrZ2NBZ0NOdjZSOEFBSTY4L3cvTlpjUHkzejN6clFBQUFBQkpSVTVFcmtKZ2dnPT0iIHN0eWxlPSJvcGFjaXR5OjAuNzU7aXNvbGF0aW9uOmlzb2xhdGUiLz48cGF0aCBkPSJNOS4wNjQsMy4xNjJoMTEuNkEzMS40NTksMzEuNDU5LDAsMCwxLDI4LjE4OCwxMC43VjI4LjU0Mkg5LjA2NFoiIHN0eWxlPSJmaWxsOnVybCgjYSkiLz48cGF0aCBkPSJNOS4wNjQsMy4xNjJoMTEuNkEzMS40NTksMzEuNDU5LDAsMCwxLDI4LjE4OCwxMC43VjI4LjU0Mkg5LjA2NFoiIHN0eWxlPSJmaWxsOm5vbmU7c3Ryb2tlOiNjOGM4Yzg7c3Ryb2tlLXdpZHRoOjAuNXB4Ii8+PGltYWdlIHdpZHRoPSIyMTMiIGhlaWdodD0iMjEyIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyMC4wMSAyLjUpIHNjYWxlKDAuMDQxIDAuMDQyKSIgeGxpbms6aHJlZj0iZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFOVUFBQURYQ0FZQUFBQ05pQlNJQUFBQUNYQklXWE1BQVFyNkFBRUsrZ0Z0enBpUEFBQWdBRWxFUVZSNFh1MmRlWnhzVjFXRmwwR1FFQUthRUJJRHllc1lCUVZsQmdVQzZRUklqSWdveUNpQlRpSkVFWU9DTTBNZUpJQ2lvaUNDWUpBWEUzRkVVZFE0QUhsRUZCR0pJdzRNU1FzaURrd3lDU2pFKzJXZnpUMTE2dDU3cXZwVmQ5ZXQzbitzWDc5WGRhcTdxL3VzdTlaZWU1L2J1dTY2NnhRSUJCYUg2b0pBSURBZnFnc0NnY0I4cUM0SUJBTHpvYm9nRUFqTWgrcUNRQ0F3SDZvTGVsOG9mVUVOdGM4UkNLd2lxZ3VtWGpBRG1ZSmdnYjJNNm9MUEw1d2t5V0Z6SU1nVjJGT29McmgrVVRlaGJwRHdoUjI0UVlZcGN0VytYaUF3WnRRWERKUHBoaGx1bEpBL2xwTXN5QlhZRXhoK2NscWhTakpCb2k5S3VIRUdmOHhKRnVRSzdCa01QOWxQS0NjVEJEcTh3VTA2Y0hoR3NKeGN1UzBNWWdWV0R2MVBkTnUrbkZCT3BpTWEzTFRCa1FWdW1wN0xDVmFTYTBLMWF0OXNJREFHOUQvUnIxSTVvWnhNTjIvd3hSMjR1VnFDT2JtNmxDdFVLN0F5NkgraW0xU1E0Y1lab1c2V3lQTWxEWTV1Y0lzTS9QK285TnpOMDFvbmw5dkNVSzNBeXFIL2lXbFM1U3FGclRzeUVlcW9SS0piTmpnMjRiajBrY2VPVVV1d0wwNnZjMXZZWndsRHRRS2pSZjhUazZRcXJaK3JGQ3JraElKSXh6ZTRWWUhqMDNPM1RHdGR1WnhjYmdtRFdJR1ZRUDhUL2FSeTZ3Y3hVSjlqMUJMcTFnMU9iTEF2QS84L1FVYXdMOVVrdVVwTDZLbzFsUkRXM2tnZ3NDem9mNkt1VkRtcElJc1RhcTNCbHpVNE9jTko2WEdlejhtRkxjd3RZYWhXWVBUb2YySzRwdW9qRmNvRW9iNjh3VzBhM0RhQmYzK0ZXb0k1dVk1THJ6OHFmYjQrMVlvUUl6QWE5RDh4blA2aEtsNVQ1YVJha3hFSEVuMWxnOXNsM0Q1OTVERklCdW1jWE5oR1FvM2NFbFpWcS9iR0FvSGR3dkNUdzVHNnAzK1FBY1ZCZVZBcVNBVnh2cXJCVnpmNG1nWjN5TUJqdDlNa3VhaTUzQktXcXVWOXJTQldZQlFZZm5KMkN3Z1pVQnlVQi91SFVrRWNDSFhIQm5kdWNKY01kNUlSREFWRHZTRFhta3p0SUtpcmx0ZGFZUWNEbzhId2s4TVdzRXV0SUFYS1EvMkVVa0VxQ0hYWEJuZHZjSThNZDVNUkROSkJMcFFMbFhOTFdLcFcyTUhBS0ZCZk1GdHRsYXVWVzBBVUNLc0hxU0RRMXphNFo0TjdOYmgzK3ZoMU1vSkJPc2lGdXFGeUVETlhMVThJOHhBamlCVllTbFFYWEwrb0pkVlF2RTQ4ZnF4YXRZSWNLQkJrZ1ZRUUNETGRwOEdwQ2ZkTi80ZGdrQTdsd2hhaWNsaENDT3FxbFljWVlRY0RTNHZxZ3VzWGRhdFYzZ3pPYlNDQkF4Yk8xUW9MaUJKQm1sTmtaRHE5d2YwYTNEOTlQRTFHTUVpSGNxRnVxQnlXMEZVTHdrTGNzSU9CcFVaMXdlY1gxdXVyUEdKM0cwaHRoYVVqbUlBc2tHWmRScVF6R254OWc3UFN4elBTNDVBTzVhSUdRK1ZjdFNBcWhBMDdHRmhxVkJkTUxKNjl2c3B0SUdyamFrVk5CV2xRS0lqMHdBWVB5dkRBOURqa3VtOWF6K3RRTGV6a21peTY5eENqdElNeGhSSFlkVlFYVEwyZ08yWm5RNWYxRlNFRC9TZHNJR3JqYWtVTkJXa2dEMFQ2NWdZUGFmRFE5SkgvZjJONkhwdDRTbnFkcTliSjZmTWVwMzQ3R0hWV1lOZFFYZEQ1b25yL0txK3YzQWFpTnFnTzFtNjl3Wmt5VW4xTGc0YzFlRVNEUjZhUEQwdVBRNjR6MG5wVTZ5N3A4M3hGK3J4ZGRqRHFyTUN1b3JxZzgwV1RwQ29UUVE4dTh2cHFUV1lEU2Zhb2xWQXJMQ0IyRC9JOHZNR2pHenltd2RucDQ2UFM0eWpYTjZUMTkwbXZ2NFBhRU1QdFlGYzZHTVFLN0RpcUMzcGZPRHV4MlBEVVYweGFZTjlJOWxBZEVqOHNIcVNCUE4vVzRIRU56bWx3YnZyNFdCblpVSzRIcC9YcjZmVjhIa0tRTGp2b3M0Tmw3QjUxVm1EYlVWMHcrT0orWXVXSm9BY1hiSHhTUE93YmZTdHFKZFFIaS9ldE1sSnROUGoyQnVjblBLSEJlVEt5b1Z3UFRldnZuMTUvTi9YYndhN1lQZXFzd0xhanVxQUdUUktyS3hIMDRNTHJLMUk4N0J2aEEwa2c2b01GaERRYkRSN2Y0RHNiUENuaHV4cDhoNHhzS0JjMUYrcDJabm85L1M5Q0RIcGlwUjJNT2l1dzQ2Z3VtQVVhSnBZbmdpakk4V25qUXdEc0c2RUZTU0RxZzhXam5vSThUMnh3UVlQdlRmaWVCdDh0SXh2S1JjMkZ1bEdUblo0K0R5R0cyMEZ2RnM4VXU5ZmVYeUF3RDZvTFpvWDZpWlVuZ3Nla0RYOXlJZ0JwSURhT2hBLzFRYTJvcFNEUGt4dDhYNE1mYVBDRDZlTlRaR1RER203STBzSUhwOWNUWXVSMmtHWnhXV2NGc1FMYmp1cUNlYUJwWXVWUnV3Y1hlWDFGVXhnYnVDNUwrRkFmMUlwYUN2SkFxaDl1OFBTRXA4a0k5bFNaTlVUVlVDMzZXMmVsejRNZDlIUndUYWFPZlhWVzlMTUNDMGQxd2J4UVA3SHk0QUlGOGZxS2VvZzBEeHRJM3dyMUlmMmpsb0k4a09xWkRaN1Y0TmtOOWpkNGhveGNXRVBxTFlJTUVzUnZUSi9IMDBIU1JxK3pVTW1vc3dMYmp1cUNyVUNUeE1vVHdUSzRXSlBWVjlSRHpBVmk0d2d0VUIvVWlscnFoeHBjMk9EaUJzOXQ4THdHejVFUkRQWDZmbG05UmExRi9JNGRmSURNVm1JdisrcXNtQnNNYkF1cUM3WUNUWkxLaVZVbWdpZ0hDa0wvaWlNaTFFT2tlZGhBUW9zTm1WcEJHcFFKVXYxWWc1OUkrSEVad1ZDd0g1R3BGclVXOXBIb25WU1IrVUdheFZGbkJYWU0xUVZiaFNhSjFSZGNlR1BZNnl2cUlkSThiQ0NoQmZFNmFnVnBMbXJ3L0FZLzFlQ0ZEVjdVNEtkbEJFUEJzSWdRRUNKdXlPd2c2ZUJwYXVzczdHYmV6OHJuQnFOUkhGZ0lxZ3NPQlJvbVZoNWNuSmcyUEVPM3hPUFlOMndncWtNU0NGbXdnRDhxSTlXTEc3dzA0V2RsNUlKd1dFSnFNRUlPUWd5SStVMXE2eXcrdi9lekNEQlF5MmdVQnhhSzZvSkRoYWFKMVJkY3JLbXRyNGpIU2ZPd2dZUVdrQVMxb3BaNmdZeElMMjl3U2NMTDAyTThoMnBSYXhHL1l3ZXB6NGpycWRkT1VkdlB3bmFpa3RFb0Rpd1UxUVdMZ09yRThzYXcxMWZVUWRnMmJDRGhBK1FnWHQ4dlU2U2ZrUkhwbFEwdVRmaUZCaStUMmNMbnA3VW9ISTFrMHNHOHp2SitGcmFUZUQ4YXhZR0ZvYnBnVWRBa3NjcEVNRzhNczlHcGY3aW5CVE4rMkVER2sraExZZTFRSyt3ZUJEclE0UElHcjBxNFRFWXViQ0dxZFhGNkRlbmdPV3JyckhWWmY0dzZMZ0tNd0VKUlhiQklhSnBZZVhDUjExYzBidWt6WWRkUUY4aEFaRTdDUnlCQjhvZmRnMEMvMU9EWEd2eDZ3aTgzK01VR1B5OExORWdJc1lNRUhsNW5vWURVV1JEM2pocHVGRWVBRVpnTDFRV0xob2FEaTd5K29uR0xUVnVYTlhXeGdUUjZHVmRDZ1ZBcmlJTlNRYWJmYXZDYTlQRTNaTW9GNlNBZkpDVG9vSm1NbFdRaW5qcUxRSVQrV0Zlak9DWXdBbHRDZGNHaW9VbTFxdFZYMUQzRTRXNERxWTBJTFZBZWVsWXZrZFZUS0JXRSt0MEd2NWMrdmlZOWptcGhGYkdEcElPUWtqb0xTOGw0RTlQdUJDTmxvemdDak1DV1VGMndIVkEzc2NyNmlnQ0JlZ2Q3aHBxNERjVENvVGdRaEhpZDlBL0xoMEpCcUQ5czhFY04va0JHcnQrVXFSYnJzSU9rZ3lTSlhtZVJNSkkwMG5qMlJuRlhnQkVUR0lHWlVGMndYZEFrc2ZLSmk3eStvbEZMekg3WHRPbXhnVmczbElZQWdyNFZhb1VhWWZrZzFSODNlRVBDNjJUaytwMEd2eW9MTnJDRHFKelhXZFJxajBpZm04UVJaZXdLTUNJWkRNeUU2b0x0aEZwaWRkVlhQaDlJblhQN3ROa0pGN0NCR3pKQ1VDZGg2MUNoWDVHUkI1VTYyT0JQRXZnMzVJSndyNVlsaEQ4bm04VGc5ZlN6bURPa1p2TkdjUjVnbEJNWVFhekFJS29MdGh2cXI2OThQdEJqOXR3R29pd1FnZnFJaUowSkM5UUtxNGN5SFd6d3B3M2VuUENtOUJqV2tGb0xPMGlmeStzcytsbUVJTjRvcG9aanNzTW5NTllVeVdCZ1JsUVhiRGV5alZqV1Z6NGY2REY3YmdPSnhCbGhvbmVGalVOMVNBSlJLK29vckIraytvc0dmOW5nclEzK1hLWmNxTlpyWlhid0ZiSTZpelNSb3lUTURYcUFrVTlna0F3U25KUkhTQ0laREV5aHVtQW5vRWxpZGNYc3BRMUVTWmlRb0I0aXRMaElObVdCV2hGWVlBRWhFS1M2dXNGZk4vZ3JHY0grck1HVkRYNWZGc1VmU0srbG4rVUJ4b2Jzd0NTcTZDZUsrZHFSREFhcXFDN1lLV2k2ZjVYYndGdWt6VXg0Z0NWRFFUZ2lRaU9YZ1Z2SXdHZ1NsZzYxb240NjJPQXRNakw5WFlPL1R4Ly9LajMrUnBsVnhESkNSZ0lQRHpBNHluK3VMRzNrNjBReUdKZ1oxUVU3QlduUUJ1WnBvRGVGU2Vxb2Z6WmtvY1d6WkZhT3ZoVnFoYzFEbFZBcUNQV1BEZjZwd1Q4MCtGdVphbEZyb1dyVVdUU1JDVEJvRkRPMXdmUUc4VDBua2ZOa2tCR3FTQVlEdmFndTJFbElnemFRemV0TllTSnZqbkxRdUVWTkNDMm9pWWpZSVFacWhiMjdTa1llRkFwQ3ZUUGhuMlZFZzNBUTcvV3k1TkFEakorVURlUStWYk1sZ3pFekdQZzhxZ3QyR2hxMmdkNFV2bzBzUU1oREN5WXRpTWdaWHpvZ1V5dklRa0R4TnpKU3ZhdkJOUW1RQy9YNjY3U0dPb3VRZ3dEamt2UjVxTlZJR0xHWW5nd3kyaFRKWUtBWDFRVTdEVTJxVlpjTnhITGxvUVdibkZBQnEwWTB6c1FFVStwTVdhQldCQllvRXJidjNRMDJHL3hMK2dpNVVDM3NJS0hHRzlVR0dLK1VIU01oc3VjK0dVUEpJTjlQekF3R3JrZDF3VzVBazhSeUc1alBCcktCUGJRZ25lTTRCNU1XUk96Y3o0TCtFNlJ3dFNLWXdBS2lUcHNOM3R2Z1g5UEh6ZlE0ZGhDckNBa0pNR2dVVTUvUkF4dEtCbjFtRUZ0YVN3YURXSHNBMVFXN0JVMnJGWnZUWndQejBJSlVqbG9IQlNHeDR6QWo2cEtyRllFRXFSK3F0Q2tqMVBzVDN0ZmdQVEpyaUpwZHJUYkFnSlNYYWV2SllFVHVleERWQmJzRmRhdFZHVnF3aVVuajdwMDJPSUVDYzRGcy9seXRhQVpqNzk0dXM0Q1E2dDhiL0VjQzVFSzFzSVBVV1JDUUFJTUU4YmRsWjdhNmtrR2ZHVnpYNUtISGlOejNNS29MZGhOcWlaV0hGcTVXMkN5ZnRDQmlQMTAyRjNpT0xMVkRyVkFZMU9vS21mb1FTcnhEcGt3UTZiOGFmQ0I5aEZ5bzFxWk0wUWczQ0RBZzVHdlQ1K2xLQnYzUUkxK2ZaQkNTRTZSRTVMNUhVVjJ3MjFCM2FPR1RGcWpWeVdrams4aWRsVGE1cXhVRXlOV0tjU1VzM3JVTi9rMUdwZzgyK0ZENitKL3BjWUlNeUVlQVFUM215U0JSUGNrZ1IwNmVyWFpta0hydXdiSkpENkwraU56M01Lb0xkaHZTbEEzTUkvWlNyVTdUcEZwZHJFbTFZaDRRQmFKK3dnSkNJZ2oxa1lRUHk1UUxhK2gxRmdFR1pQUmtrSU9QbkNqT1p3WWg4ZG5wYTN2a3ptbmlNbkxuZTg0ajl5RFdDcUs2WUJtZy9vamQ1d0s5SVR5a1ZreE5vRGdrZlBTc1VDUElnMEpCcUk4bWZDUTloaDJrenFJR2U3c21rMEhPYmgyUXpRd1M0WE8yaStUeGNXcFBFODhTdVhmMnNtby9qOEJ5bzdwZ0dhQnB0ZktJUFc4SSt4UjdxVmFlQkdMZElBUUJCUEU2Wk1IcW9Vd1E2V01OUHA0Ky9yZE13VkF5Rk0wRGpEd1o5SmxCRGoweXljRmZKS2xGN3JQMHN2eTlCcmxHaXVxQ1pZRU9UYTFJQWcvSWtyeUREZDRtQ3lPd2VCQUgyd2VaUHBFQXVUNmFIcWZ1Z256VVlTaWNKNE9jTVBhWlFVajdmUFZIN2tOVDd0RWtYakZVRnl3TFZGZXJyaVRRKzFaWU5DSnhScEE0cUVpcVI2MEVVVWdCc1h1UUNFSjlNb0YvUXpSVTdBTnAzYWJhWlBETnNzYXlSKzdjWElaelhXWGtUbU42WGRPOXJMNG1jUkJyNUtndVdDYW9ybGFlQk9aOUsyb2ROanF6Zk5nMUJtY0pIVkFjRWo3c0hXcUU1VU9oL3FmQnA5TEhUNmJIZUE3aVFhd3lHUnlLM0I4dlUweWZjdmRlVnQ0a2p1bUxGVU4xd1RKQncycFZKb0UrWllGaU1CUkwzY09tWjY0UDZ3WWhpTmMzWmFFRVZpOG4xYWZWa2lzbmxpZURqRFpSbTlGVVBpZzd3K1hEdUI2NW81TG5xNTF5UjBITDR5TmxremltTDBhTzZvSmxnNGJWeXZ0VzlJbEkzN0JlVEpjendiNWZOaUJMRFFRQkNCdzhYcWRtY2d1SU9rR216eVJBTG9qMWlmUThBWVluZzdYSS9TSVpvZk5lRm1UdmFoTEg5TVdLb0xwZzJhQnB0U3I3VmpSY2liR3hXalJqU2VLWWZHRFNuREVqN2t0QmNvZHQ4M2pkQXd2VUNQSTRxZjVYTGJGNERNSjVnT0hKWUYva1Rvd1BpYjJYbFI4ZnladkVFSXZ2T2FZdlZnVFZCY3NJZGF1Vnp3VG1FK3ozbFkwUWNXU0QwOEVvQnhHNE40Tko4VHl3d05ibEZ0Qko1ZUQvVHF5UHFTVVdvMDFFN3Zrd0xtRUlVKzRIMVBheUlIVlhrNWp2ayttTE5jV3QwRllDMVFYTENIV3JWVDdCemdZbHdzWm0wWWdsaFVNcDZDWGw4Ym9IRnRSSHFBNHBuMXRBMUFreS9WOUNybHBPTEpMQlBITDNZVndtTi9KZWxoOGZvVWxjbnNzaVZPbWF2aWlieEVHc2thQzZZRm1oU2JXNlVkcDhmdDZLWGhDMmlva0dVamNzbDhmcmJHN2lidzhzQ0JwUUdWSTlsQWVpdUFYTVNaV1R5K3VzajZ1TjNDSFdwc3hPTXJqcnZTdy9QdUpONHZ4YzFrTTEzL1JGRUdzRXFDNVlWcWhWcXpLd0lLTE9tOEVlcnhNVXNKa3YxSFJnUVR4T2JVUmtUaEFCV2J5dWdraWZ6ZEJGTEdveDcyVkJUbnBaRUl0ZUZzZEg4aWF4bjhzaVBEbEhDNWkrcVAyc0FqdUw2b0psaHVyTllEL0UyQlZZa05DaElsZXFuYkRvc29BbHFicUloYkxsa2J2M3NycWF4RFNobWI3Z2hESjFIZ3A2S05NWFFhd2xRM1hCTWtQRGdZVWZZdlRBZ2o3UjQyVDNUaWVSUXpYeUNRc1N2RTFaWE80VzBPc3FKOVBuRW5KaWVZQlJFb3RFMFp2RWZIN1NSaHJQcjFJN2ZZRnFEazFmQkxGR2lPcUNaWVp2SmcwSEZteE80bXNzRnRNTkJBVStZVUd0d3prcG9uQlV4WWRzc1lBRUVhVUYvSnpxeFBKZVZ0a2t6czlsa1Q3K3ZDdzAyYTkyK3VLUm1weSs2QnRyQ21JdE1hb0xsaDBhRGl6WWpNVFZQZzlJTUlBcTBEZkNnakg5NEQwcnQ0QTBkVW4wM0FMMmtjcUpCZnFJVlRhSlo1MitvQTBBc1ppK3lNZWFnbGdqUUhYQnNrT3RXdFVtTE82ajZaNFZCeGc1RWpLckJTeEpsUk1MNHVXOXJKSlkzaVR1bXI1QU5mbCt2bDgyZlZHT05RV3hSb1RxZ2pGQTNZRkZYODhLaTBVVGxxREFoMndaaU8yeWdKNENlclR1UkxvdW9VYXN2RW5zMHhmRTkyOVQvL1JGUHRZVXhCb2hxZ3ZHQUUwSEZvZW5EZWM5S3l6Z1hkTUc5U0hibWdYMEZOQ25LM0lMZUoybWlaWFhXV1dUMk05bHpUSjk4UnhOampYNXZHQVFheVNvTGhnRGZBT2xEZVdCUlhra3BMU0FwRzRvUTJrQnZSRThaQUd2VTUxWWVlUSs2L1RGcFpvZWE4cUpoZG9Hc1pZYzFRVmpnZnA3Vm15OE5VMWJRRThCbVNiM0ZIQ29FVnpXVmZNU2E1YnBpM3lzS1lnMVVsUVhqQVdhelFMbUtTQVJ0amVDWDZHMkVZd3RvNytVTjRKekM5aEhxcTQ2YTU3cGkzeXNLWWcxWWxRWGpBVytjVFRac3lwVHdLNUdNRFVNVXc0a2NUNExpRFdqeCtUSFFjcnBpaUZTMVlpVk40bHpZaEdTbE1SaVhqQ0lOVEpVRjR3SnFxZUEzZ2crU3haYmY3ZXMrVW9kd3dnUk1UY2JtMll0ZFk4ZkI1bWxycHFGV0gzVEZ4QXJIMnQ2blNhSjlUd0ZzVWFENm9JeFFmMk40R1BVM3NiTVp3RWZKbXUyTWpYK2s3TDBqVEdpcTJSMmpJWnRPVjFScTZ2bUpSYlcwb21GTWdheFZnRFZCV09DYnhoTk40THp3NHVjWFZwWGV4eUVoaXRITWhnYkl0ck9vL1d0MWxWOXhBSzFzYWFTV0V5NEI3RkdoT3FDc1VIVGRkVVJhdjlZM0pmSjdnMXhpbXpHN214TlRsY3dPa1M4elp5ZVIrdGJyYXVHaUpVM2lZTllLNGJxZ3JGQnc5SDZQdGw1SlkvVzh3RmJQMk8xeUxwcVZtTGxZMDFCckpHanVtQnMwSEMwemtiemFKMU55Qm1yV2V1cVdmdFZRYXc5anVxQ3NjRTNpZm9IYk5sc1hYWFZqNmtkV2JwUzAvMHF3b3F0MWxWZHhNb0RqQ0RXQ3FHNllJeFFkMTFGdE41VlZ6MVdOckpVOXF1WUp2OG4yY1llT2dwU0kxRVFhNCtodW1DTTBIUzBYdFpWakN4MTlhdVlZdmhsMmZSNDExR1FRd2tyZ2xoN0JOVUZZNFM2NjZyODRDTDlxbnZJN3IzM2NObEUrTlBWbmdibUVDR0Ryb1FWMTJoeFlVVVFhdytndW1DTThJMmg3bnRYMEsvaTltVitGTVRuQUg5WWR0K0lWOHB1MHJKZFlVVVFhOFZSWFRCV2FMcXVLc01LNWdCUDFYUVR1Q3VzZUo5czhtRlJZVVVRYTRWUlhUQlc2TkRDQ202MHlXYjFzT0s5T3ZUSmlocUNXQ3VDNm9LeFFzTmh4Wm9td3dxT3JsOGd1d0VMbTlJUExmWk5WaXdpQVF4aXJTaXFDOFlLOVljVkROZWVLTHZSSmtmVXo5RGtvVVVtSy9LSmRlNkNkSzJtVHdKdkI2bUNXQ3VBNm9LeHdqZUNwc09LOHRCaVBySCtOTmt0dzlpVTNBem1UYktUd0NTQTc5ZjJKSUJCckJWRGRjRllvWlpVaDJsNnNzSW4xdThpdTcvZVEyUTNnMkh6Y1JMNGxXci9Lc2hPSklCQnJCVkNkY0dZb2U2d2drM2pONFB4QkpCTjVnbGczN2hTbmdEdUJLbUNXQ05GZGNHWW9VbFM1U2VCeXdUd1FXcVAxM044L1dXeSsvRzlYdllYRW9kdVc3YWRwQXBpalJEVkJXT0dnbFJCcWwxQWRjR1lvZjVZUGI5bnhiMWtmOGFHVGZaa1RSOVkvQXUxTjRMeHdkcWRKRlVRYTJTb0xoZ3pORTBxajlYWk1QdlVIbGo4ZWcwUDF1NWtyeXFJTlhKVUY0d1ova3RYLzJBdHZhcDd5SHBWajBpYjdKbnE3bFZ0YW51bTFlZEJFR3NFcUM0WU16Uk5xcTVlMWQzVjlxcStRemF0VHEvcU1rMU9xMThyMjZ3NzBRQWVBN0dvVTROWUhhZ3VHRFBVa29wZmZONnI2cHRXZjRMYW8vV1hxdjFySUx2UkFONXRZdFgrSUFKMk9valZnZXFDc1VQVHZhcDhXcDBHOEowYnJEZjRGblUzZ0srU05ZRGZyZm52cjc2ZDJFMWk4VE1NWXZXZ3VtRHMwT3dOWUQ4QzhnT3lCdkFyWkRlelBDajc2eHp2MU01UFZkU3dTR0oxM1Y0YUJjK0poV1dHV0xRbGdsZzlxQzRZTzlSUEt1OVYzVkgySjNhK3FjR0c3TStFY3E2S20yc3V3MVJGRFlkS0xDNGNmY1RpWitMRW92M0FSUWhpTVpUc3hNSlNCN0V5VkJlTUhScHVBSitrK1JyQS82ckYzbGxwVVZnVXNmSy9OTUl0QmpnU0E3Rk9VL3VIdlNFVzlhZ1RpNHRVVHF6RHRNZUpWVjB3ZG1pMkJ2QzlHenhRN1IxckwxWjdaeVUyM1U0ZVZ0d3FGazBzL3BvamFTajlPeTQ0RUl1a2xITm9LRHpFSWtYbForbkVJZ3lhSUZidDk3T0txQzRZTzlUZEFQYkRpdnZVSGxaa3FvSXJNMU1WejlieVRWWE1na01oVnY0bmZQelBwRkpmT3JFNEliMHVPeTVEMHh5VkoreUJXUFQrdUZoRkQ2dEJkY0hZNGI5WWRSOVczS2Y2VkFVbmdHdFRGY3RDS3JCVll0SGtobGpVa2JRVElCYUt6ZVQrK2JLRG5LajVxYkkyQkkzek5WbmdRNHNpaUpWUVhUQjJhSmhVSjZvOUFYeW0yaFBBRjZxZHFyaENkaVYvdTJ5cVlqZEhsV2JGSW9oMVFQWXpZQmFTOE9ieHNxa1RGSjFnaDdOb1h5a2pGdlVwYllvZ1ZvUHFnckZEMDZUS3B5cE9VUHMzcXg2UU5nMEYrak5rZnd2NGNpM2ZxTktzbUlkWUtEQkJEUDA0M2l1Vzk5V3lYdDFQeSt6d1UyVjl2SWZMVkoxd2h4NGZVeW43MUJLTG4rMmVKbFoxd2RpaGZsSmhXVzZ0NldQMSthZ1M5Y1h2YXZsR2xXYkZFTEg0L2lFV0xZS1NXTHhmYkMvcDV5L0lmaGI3WlhlY09sZjJoeDFRZGdJZStueE1wcUQ2aEQ5N2Z1cWl1bURzVURlcHVrYVY3cWZKdndMeUFyV2pTbTlTTzZyRUJseUdVYVZaTVN1eG1CYUJXS1NjTkx0NXozOGdTMEF2a2YwOExwU2xvK2ZJeHJvWVJMNlhyTmZIZEVwTVhUU29MaGc3MUpMS2UxVk9LcXhLZnErSzA5WE8vM0czV3ViL0Rzait0QTd6ZjlRY2tHcFo1di9tUVkxWTFJaE9yRTFaMGtuRG0vZU4vU1VGcFJuT0hYeXh4aGZJZW5xTWRxSHdCRDMwKzRKWURhb0xWZ0dhSkZYWC9CK2tvZy96RUZsQlR2UFRid0VOcWE2U2tjcm4veUFWbzBwaklSWElTZFZITEhwd2pHSmRLMHM3M3lhNytRM1QraVNoTk1TZkw3dnIxSk5rTnlGbHZLdWNFOXpUVXhmVkJhc0FEWk9LVFZBTzFkTDRIQnFxZFZLVm8wcTFqYjNiS0luRjk5NUhMRlFaWXRINFBpaXJMVjhsYTRvekc0bEZKaW1sWVo3UENjNDFkVkg3M1kwUjFRV3JBRTJUeXVmL3VraDFubHBTVWFSREtxN1drT3BkR3A1VXIyM3FaVUFmc1dobTg1NElZV2h3TStmSVJZUldBczN2SzJXcVRadUJ4amp6a2RoazVnVExjYVpacHk1V1VxMnFDMVlCNmljVmpjc2FxWmpremtrMU5LbGUyOURMZ3JLKzRqMWdaVXRpTWVzSXNXZ252S1hCRzJRWG1jdlVEdUNXNDB6cm1wNjYyRlBONGVxQ1ZZQ0NWRjBZSWhZRHcxaGNHdDNNTy9LK2FTa3dXZko2dFVkR21EcnhjU1pTMDBjcHBpNVVYYkFLVU5pL1BzeENMSnJkRU91ZHNyWUMweVUrZ0V2TElaKzZJRG50bXJyWXB6M1VISzR1V0FVb2dvb2g5QkdMcVF1SXhRVUVZcjFIaytOTStkVEZDMVdmdWpoUjFoeDJZcTFzMUY1ZHNBcFFST28xREJHcm5CT2NkK3JDbThNMDJlbGgrZFRGeXZhd3FndkdEdjhsYWZibUw2VHFhLzdXU0xWS3hDcm5CTXR4cHE2cEMzNW16NVFkbjltUVhhU1lxZVJvVGRrY0h1eGgxWDZ2eTR6cWdyRkRrNlRhNnBnU3BQSXhwU0g3TjJaU2dUNWlsZU5NbTdKeHBuTHE0dVV5aFdkMmtpTTBqOVBrMUVWWGM3aXJoelZxdGFvdUdEdlVrbXFlZ1ZvbUJ2S0JXcTdJUTZUS2gycG5RVzF6N3lhR2lGVk9YVERPeEswR0NITDZwaTd5NXJBZnlSL3FZWTNlQmxZWGpCM3FKMVhYMFE4S2JJNStjS1hseUFQOW1DNVNlZnJucDM5ellzMURyaHBxQk5nTzVGKy9SaXgrSGpTSGZlb0NWYWM1L0ZKTk40ZTloOFhQZXFWN1dOVUZZNGVtU1ZYZStobFNjUVZsNHZvUmFSTThReTJwdUFJN3FhaXAyRXpZSU93UTlRYWJMU2RXRno0N0Eyb0UyMG5DNWFRQ3Rha0xtc05NWGJ4QmxwWmVydW5tTUQwc2p1U2ZxaFh2WVZVWGpCM3FKMVY1OGhkU1BWTFRwRUtwUEtpZ1Q4V1VBUnVLamNVR2MySjlPdUV6SGZqZkhzeEx3aHJSRmttMlVxMjZwaTVvRHZQejhPWXdVeGV2VjlzY3pvL2t6OXJER24waVdGMHdkdWpRU01YR3dOSVFxVk9VazNxUmZwR0NvVlpzTEJTTFRZWTErbVNHLzhud3FRS2ZMakJFd2xsSXQxMGtHeUpXT1hXUk40Zi9XTzJSL0tFZUZnY2M4eDRXVVhzdnNXcS82MlZCZGNIWW9mbEl4WlhVYXlyU3Z3T3lxeTYyaHJxQitnRzd3eWFDV0NnVzVHSnpmU1NCbXVPakdUNlc4UEVNbjhqUVJjUXU4bldSYml0RXF4RnBWbUo1YzlpbkxycWF3ME05TEg3ZTNzTmFxYWk5dW1EczBHeWtvcWJ5b0lKSW5RS2JpWXBMWkJ1REppZk5Ubm96SElmQTdxQllXQjlxTEFqMkh3bGN1ZjhyZ1lMK2d3a2Z5dkJoVFJQUnlaaVRzQ1JlVHJxU2JGM3FOZ3ZSYXFTYWhWamx2UzdtNldFUnRkUERXcG1vdmJwZzdGQ2RWSjcrMGFlaStZdEZZVUQwZWJJVWl6TkVXRURVQ211RERhUitvRStENVVHNXJwRkZ6SnV5amNWVis3MEpFTzk5Q1JEdy9Rbi9ycGFNWFVSMDhuV1JyaVJjcVc1OWlsWWoyQkRKdW9oVk5vZHJQU3d1VkxnQWVsaVAxZVFCeC93YzFxaWo5dXFDc1VQOXBQTDBEMDlQR25WYStpVnZ5TzdEOEN4WlhZVjk0V3BMWUVFUnprWmhXcHYrREZkazdBNjFCQWtZOWhBbG8zL0R4dUtxL1k0RUNJakN2VnZEUkhRU09nRWhucE91ajNBbDJmcUlOaS9KdWtpVkU2dU0ycDFZdksrOGg4WFBqaDdXejJueWdPTmoxSjdENHNMbTU3QkdIYlZYRjR3ZG1pWlYzdnpscW9pZnAyQW1rU0x5cGFkQ1dJRUZSSzFlTEpzQi9CVlpmY1dWbDBJYzVXTERRREtzRG5VRVNnYmhTTUdJbU5sVUhFbS9PZ0VTTWpmblJFVHhuSXc1RVoyQU9mR2NkRTY0WE9XY2JGMUVLMG1XMjhZK2t2V3BXRTZxUG1KMTliQ3VWTnZEZW9uYVA5MUQvZnBvOVVmdG5nZzZzVWFSQ0ZZWGpCM3FKcFhQL3ZHTDQ4ckkrTXc5WmNVelJUVEZOR3IxREZrVDgwV3lHNStRQm5MRi9YVlp1a1ZQaHMzQ2xSaXlYU0dySXlqU0lkN3JaT29HQVEvS1NFaVM2RVNrVG5NeVFrUTJJRVNFZ0U0K2lHaXYyY1FBQUJLd1NVUkJWT2VrYytWendtMXFrbXlvUkU0MFY3UWF5YlpDc053R2ZrYkRQU3plR3o4RGZsNjBLYmhRUFVkdDFFN3Fta2Z0dUlkOUdta2lXRjB3ZG1pYVZGengvRHpWc2VtWHg5WHhicktPUDFmTlI4a0dhMG1ybmlicnRURFRCcm00MGxJZnZFS21ZSmZLTmdvTlQ2N0VrQTVWd3pKQ1BvSU9qa2h3L2dpbFkyTXhwQXNaYVN4RFJvaElHQUlSSVNGWGRsZEJpT2VreXdubmx0UEo1dlhkcG94b2VZalNSekszaXlYQm5HUkROakZYS3c4dWhucFlLRGdYbWZ3Y1ZsZlVmbSsxOXhMRW5wTUkrbFQ3S0lLTDZvS3hReTJwRGxONzlBTTdRU0ZNV0VIaWhBVWtnVUt0bUFGa1Z1M1I2WmROVWMwVkZYTHRsMTFoVVMvbTJ5QWEwVHVSTWYwWU5ncFg0WitWaFJ6VUVCQVFsU01CY3lJZTBDUVpDVU9jaUpBUUZZU0FUanhYUHpZbGhFUHRVTHFjYkY3ZjVVUmpRMk1mcWRsUXN5NlNkZlhhWmlWWUY3SEtxSjJ2QytIenFKMkxETFZxR2JVVEZPRVcrRDBNSllKY0hKZVdXTlVGcXdCTmtvb3JIVllDUytFV2NFMm1WbGdQcnBSRXZSVFE5SzBlSzFNdDZpemk0S2ZJU1BhRHNycUxvcHRFQzZ0NG9XeVRjQVcrU0VaQVJuV29JU2pRSVNJSldFbEdKZytjaUMrVEVaQk41OFNEZENSb3VlM0VjbUkzMmFTbzIwR1pza0UwNmpscU9SUU5sU0E4eVVubVN1WjJzU1JZYmhPSENKYkRiV0NlQ0hyVS9oNU5uc1BpSXNGNzRYMTYxSDZCMnFuMldpSzQxTUZGZGNFcVFDMnA4cnJxQ0xWcXhTK04yb3BCVDRoMUw5bFU5Vm15UlBCaE11VTZXNVlPY2xWRnhhZ0h6cGZOdGtFNkVpMlVqUTFDVGNZVkdCSmljU0FpVVgwZkdVa2JzWm1RRUNXRWZCQ1BCQkxTWVR1ZGNLZ2Q5UjEyRTdLaGJxNXNUalJxR0JTTlRleHE1aVJEeWFqTnNJdTVpa0V3NnFGNUNGYmkwNXI5dUFqcWpKTHpYbkVDVDFJNzFaNG5naWRwUklsZ2RjRXF3SC9nNmxZcnI2M3c3MXdWSVJhZW5vYndLZW1YaXlXQllOUmIvTUloR3MxTDdBckJCdlVBcWtiQkRmbElFQjhqVXptdXZodXlXeVdmSnlNanlwZVRrYzNrUk15VkVPSTU2VkEvbEEvRlErbFFPU2NiR3hObHk0bUd4VUxSc0k4NXliQmdLQm1ibTdyTVZjenJzU0dDRGRWZ09mTDZLazhFcjAxZkw0L2FVV0VVbWdzSkY1dWhSUEE0VldZRWEzdGhKMUJkc0FyUUpLbnl3SUlyM3MzU0x3cGk0ZCs1S3BJK1lUMGdGd0VHWFgvVWkzU0tYL1M2akd5b0dWYUZPZ3pMZUthczJJYUFwRmxzREk0OFlDV2RqTmdiQ0FrWlVVRElTREFDRWJsS1EwSUk2RXJJSm9OMHVmVWtqa2JsSUJzMkUzdkoxZDZKeGlhbGpqc2dxOW1jWkFRazNoS2dOcU11STBEQUtsTHprREs2VGR6VUpNRzZhckN1cU43aE5yQk1CRDFxaDloOEQzeFBmSS9ZWHk0YXFEa1huRHdSdkxPbVp3UUpMbkppTFkxYVZSZXNDdFFTNndacTFjcHRvQk9McE9uNDlNdkREaEpnTUhHQkJTRjJaMDd0VHVtWGpFM2tLZ3Jwc0Nrb0czVUFCS1RRaG9UVVo2Z2RHK08rbWlSa1NVYUkrRUFaQ1NFZzVITVZoSFFvSDRURGVxSjBxSnlURFh1SnNtR2hJQm8ya2lzLzlRbzFHMnJtSkVQSkNFUkk0VkFLVWtkVURFdm1UVzFzb2hQTUZjeHJNQTg1UEVYMHBuUFpjUDVVK3IvYndBK3JmNm85VHdTNVNIZ2l5RVdIbncwL1IzNzIvRDQ4RVNTNFdNcEVzTHBnVmFCcHRlb2lGbGRBQ21LdWhnUVlLQmNFVzVPUkRIdjQ1ZW1YQzRoOWI1c0ErYkFwMkVkSWlOSkJ4RHNrZEJFeUp5TkVkQkpDd0hVWjhaeDBYTFdkY0NoZFRyWU4yU1owb21FalVUVHNGQ0VBRzlWSmhwS1JTcEpFRW9KUTF4QitVSThSSUpRRXl4WE1hekNJUVFDQitsQXpkZFZmRHY3dk5oQ2xRL1VJTHQ2aDdqc3plU0xJZTBDeHNkajhETGhZOGZQTUUwRVBMandSWElyNnFycGdsYUJoWW1FRnVmSkJMcTZDS0JjRTQ2b0l5ZkR6RU8zNGhGc2wzRHFCS3lnRTNKZXdKck9TSUNla2s5SUpDUmx6SWtKQUo1OFREOUtoZkJBT3RVUHBVRG5JaHJwaEx5RWFWM2FJaG8xRTBiQ1BoQ2RPTW1xMC9US2JoVjEwRlNQOG9CNkRZR3h1Q0ZZcUdCYlJhekFpY2s4UisreWhLNWpqbytrNTFxRjRrQk9pMGdyQWhrSm9GTlFUUVdwSlFoL3FVbXd6VnBzTDBOS1BNbFVYckJyVVR5eCtLVG01amt5L01LNkdrT3hMRW81S09EckRMUktPU2JpbEpzbm9oSFJTOXBFeEo2QVR6MG1YRXc2bGcyeGU2NkZzVGpScU9tbzVOaUwya2RyRVNVYXRncEpSbTFHWHVZb1JmcEF5bGdSRHdkd2llZzFHTFFRUjZJZVI1bm45bGR0REg1bnlKck1EVW4wb3JhRytncGdra1JDV0VPWDMwdGNsNWFUOXdFV0Fpd0pxakVxdnkreTJCeGY4UEpjdXVLZ3VXRFdvSlZWSnJCdHFrbHlISjBDeUl6TGNOTU9SQlc2bWxvaE9Sa2NYS1hNeWRpa2k1SFBTcmNrSWg5S1ZaTU5hNWtSelJjTStvbVpPTW04TlVKdFJsN21LRVE2Z0RFNHdMRmhPTUlJTzZoNDJQU0hIRzJXMnplMGg2b1dkNjFNdkNQWVJ0YVRpY2V3alFRaVdFbnY1Vm5YUENGSXJZbXRSWUZTWitwVDNpc3B6SVZxNjRLSzZZQldoYVdMbDVIS0NPY21jYURsdTNJSERDOXdrd3hBcHU0am81SFBpT2VtY2NFNDJWemRYTmc5VlVEVHNveWVYa0d4ZHBtUUVJdGhGYWhWVURIdEZQVWEwWHhJTXRVREJTQk9wd1M2WE5XMko2dW1IdVQwa2NNalZxNnk5UE56NFlNSUgwbVAvbHRaaEo3R1cyRXlDaTllb1BZN1A5L0Y5c29zQWRTUktUTzJKWXBmQnhWTFVWOVVGcXd6MWs4dnhoVDI0WVFVMzZrQWZNVXNpNXVUTEZUQW5uSlBOMWEwa21pc2FWM1BVekVtR2toR0lZQmVwVVZBeGJCWDFtTnZFbkdDb0JCYnhZbGtOUmpxSE5Uc2dtM0YwZStqcTlXYVpla0VRYkIxazJkVDBpQlJBeWJDTEVBK0ZnNHlram1Wd0FhbjN5eHJwZmNIRlVrMWNWQmZzQldpU1hEbkJobkNER1RFck1ic0ltQk92aTNCOVJFUFJzSS9VYkU0eVZ6THNJbGQ1VnpIc2xCTU1tK2dFY3dYRElyS2hxY0V1bEUxOHZFRFdWOEllWGlZTEdGQXZ3Z1lzM0ovSzdCd2t3ZHBoRGVsUFlRMGhFUVI3Zi9wSWJZVmF2U3V0cGI1Qy9hNUluNWRXd0U5b2E4SEZydFJYMVFWN0Rab20yRmF4VlZMMkVhOGtXNmx1bmx3NjBmTDBFcEs1a3EzSjdDSXF4b2FrSGlObGRKdVlLeGlxUUMxRERVYVN5S2JHaXRFUGU3Yk1IdWJxUmNoQTdmWDdhZzkwNXRZdzczdEJzUGNtUUtwcjB2T29IR0VJNUVRRlg2WDJjQ010QWxTVVJqbmZIM1hqMGsxY1ZCY0VGa3EwZVVuWVI3aXVtcTlVdEZ6TnZFYWpOc011NWlvR3dRZytzSWs1d1Z6QnFHR293VWdTMmN6bnlxWTgzQjZpWGdRS3FCZmhBdU5TQkEzWU43ZUdWOG5xcGFzMWVTc0NpTFNaY0UxNmpOQURFbUlEWHllcnIxRERGMnYraVF0K0pqc2VYRlFYQkJZUDlSTnJWc0xWaU5aSHNxNGVuRGU1bldDNWdtRVJ2UWE3djJ3VFk3MFlyY0tHRVI2NGVqRTJSZTJGVllNQVdNUExaY0VHaVI1MTBodlZrc3ZyTHF3aFpIcFgrdmMvcHVlb3pWQTZMT1Z2YVBKUDl0QVNPRS90eEFWdEJaKzQ4TWJ3cmdVWDFRV0IzWUg2Q2RaSHRwSm9ReVFyVmF3azJKcGFnbmtOUnNoQjZyWXVHekRHZnVYcWhTMWpzOU5ieXEzaHkyVktVNUtMVUlQNnlTYzJJQk1LaGxLaFpxZ1ZCTVFHZXYrSytvckdNT0hKa3h0c3FQMERDRFRJK1Y3NXZ2UGd3dXVySFNOV2RVRmcrYURGa0t5TFlLNWdiaEc5QmlOaEkrUWdiYU5IeEFiR2R0MVBwbDVzYk96WWhzeWFzZUVKTnZiTGFpRVVab2hjcUJLaEJncjFkK2tqcEtLMmVwUE1RaEtFb0h3djFmRE5ZN0N4SjJueWR0STdXbDlWRndUR0FjMU9zdHd1OWhFc3Q0aE9NQjh5cHY3Q0h1YnF4WWFtOW5xd3JKZUVOU1RZdUVCdDNmV2o2aVpYM2t5R1JLalgxZW5qVzlQanFCVnBJRGJ3Z0t4L2xkZFgzaGpHcGtKNkxnRFkyVjFwREZjWEJNWUp6VWF5R3NHOEJ1T0tUNTFDdXViMkVQVWlkYU1IUnJoQjdVVWE1OWFRZW9lK0YzV1hrMnUvVEdXd2hWZzVsQWVpRUdpZ1hBZGxjVHkyN3kwSmtBclNRYjdma2RsQTZqV21QcDZsNmZvS2tsTmZRZjVkYVF4WEZ3UldBNXFmWUY2RHNSbkwrcXRVTDYrOVNPR3doaWpHQTJSOUwrb3VMSnFUQzFzSUdhaTVVQndJa3FlRmtBdGxJakhFK2hGV1FDb2llcUo2R3M0bzNVdlQ1M2k2Sm8vaVUxOTVZN2lzcjNha01WeGRFRmc5cUo5Z1pRMldoeHhkNnVYaEJvcEFIWk5iUXhxejFGMXNjaWNYeW9VdHBPYWk1MFNnUVZwSUk1a29ucDZVazRzaFhpTDFOeVR3YjVKQWFxdGZsYVdCa1BLNU1xSVNsTXhTWDIxN1k3aTZJTERhMFB3RUs5WEwrMSs1TlNUYVprUG41RUs1M0JaU2MxRUxNYWxCNEVBVVQ2cEhud3V5T0xtb3VWQ25QMHk0SWoyR1pjUTZVcC9SSDBQNWlQVWhyUGV2eXZxcXJ6RzhjTFdxTGdqc0hXaVlZRFgxeXEzaHJkSkdwdTV5Y3JrdHBPWkNUZWgxYmNnYXlVK1YyVGhVaDFxSkNZb0RzdmxDQ0lRNnZUYUJmNzg2UFFjQlVUbnFOTWFZVU1CelpLcm85UlZmdTZ5dnZERzhMVGF3dWlDd042RitjcFVFeTJ1djNCbzZ1ZFpreW9VdHBPYWkzaUhRWU5QVFNDYTVPMWQyem91RGxIbFM2T05QS0JkcElXU2lwb0pvQkJhL0tGTXJobTVSTzJ3Z01mdlphdi80d1k3WFY5VUZnYjBOVFpLcnBsNjVOUndpRjdhTXRKRGE1eXpaRUM5TjVMNHdBK0ljME9RZGdDRWFwQ0xvWUlMangyV0VSUFd3Z1pDVldtNWROaG15WS9WVmRVRWc0TkQ4NUhMbFFoMjg1bUpqa3hhaUhteDJMQnFLQWdIS2VvdkJYUlRJUjU4Z0Y1YnZVaG1oK01nNUw1SkFiQ085SzJvMGlIbHUrbnowenhnVTdwc1BYSGg5VlYwUUNKUlFQN21jWUYzazhwb0xjbEhmRU1VVEl0RG5JcWtqelBCNmk3Q0IyZ2dyUndEQldCTDFGcUVFNU1JVzB1ZTZKSDJFVk5oRmxHMi96RVpTcTdrTkpJRzhwK3Eza2w2SURhd3VDQVQ2b0VseU9jSDZsQ3NQTk5qUTJMQVROUmxtVVArc3E5OFM3cGZWVzVBTFcvaVNCTUlLU0lXaW9Xd29IRlAwM3k0anFOdEF5RHQwL21xQ1dMWDMzL3R6cVMwSUJHYUI2dVRLMDBLUDRrbmo4bnFMQmpMVEdia2xaT3lKeGk3S2t3L3NRaTVpZUVJS0NJWDlvNjVDMFZBMjFPcUo2YldjQ3lNWWNSdFlpOW41M3Jlc1Z0VUZnY0E4MENTeGhzaFZoaGxZTXJlRWpCblIzL0tVa0VrSmJsaHpudHFVa0FnZWNqMVA3UjkrSUZxbnJ0b3ZVellpOXNlbjEySXJQUTNNYmVEQ3g1aXFDd0tCclVERDVPcXF0MHBMNkNraFo2VzZnZ3dJd3p3aC9TbVN3b3NUTHBLbGdDZ2F5b2JDb1ZiMHJyQ1Y5TXJ5TkxCcUF6VW5zYW9MQW9HdFFpMnh1c2hWMWx1bEpmU1VFRlZCdFNCRDJkdkMzcEVTUWk3cXFHY21RRFRHb0lqWFViYnowbXVZb2llMGdLamVGTTdUd0lYWXdPcUNRT0JRb1g1eTlWbENVc0thYXZrc0lmWU80a0F1am9MOFVBSkVnMVNjVEg1Q1d1dHFoYTBrdEtDRzg2Ynd3dExBNm9KQVlGSFFOTG1HTEdHcFdsNXJNZTZVVDJUNDRVaUlBN2xJL1o2UzhEM3BzZlBUR2thanFLMWNyVHkwV0ZOM1UzaEx4S291Q0FRV0RhbFR0ZHdTOXFrV2FWMVhRc2poUk5JOTR2ZHpaT1RDRmo0cDRZbnBzUTJaQlNUMG9DR2NxeFZxNkxPQlhVM2h1V3hnZFVFZ3NCMlFabFl0YXEweUllUndwQS9wdW1yNXFXT09mMEF1ZWxTUUNYdElUVVZZUVFvSUFTSGk2YktHY0s1V2hCYjViT0NXYkdEMXpRY0Myd2xwWnRYeWhQRDRSQUJDQmg5MW92K0VhbkhrQXlYQzVxRmNKSVViTWtKUlU2RlVrSW9qS0ErUVRYSHcrbHl0eXRCaTd0bkE2cHNPQkxZYm1rMjFQQ0ZFdFh6VWlaQ0JhRHlmZm1mVWlTQ0RpUXlVaTVyclVRa1BUNDgvS0sxalBXcEhyVlpUSzc2Zm1kU3Erb1lEZ1oyQ3VsVXJUd2o3UWd5UDN2MUdORmc3NmliSVE1angwQXo4SDlKaEdkZGxGcEJrRVhKQzBrTldxK29iRFFSMkV1cFhyYTRRd3h2R0htTGtaN2JvYTJFSklSYzExSU1TSUJRMkVhVTZUWllDWWdHeGtyZEpuNHZQdVdXMXFyN0pRR0Ezb0c1aTFld2dJWVpQdmtNVUNJUEZnMXlRNk15RU05SmpwNlkxZDArdjRiVW9uL2V0K3BMQVFiV3F2cmxBWUxlZ2J0V3EyY0UxdFRlZ1FiV1l4b0E0S05lNnpCcWVudjVOVUlIOWc0RFVWYVNLdVFVOFNsdm9XMVhmV0NDdzIxQzNhdldsZ3o2SkFUbFFIbXdkTlJQa2drRFVYS2NrUURhQ0N2cGVLSldUaXRlamZxamczQmF3K29ZQ2dXV0F1b25WWndlOXA0V1ZvOWE2WFNJTjVFS1ZJTmpYcG8vOEgwV0RmRG1wOHJwcXJtWnc5YzBFQXNzQ1RSS3J0SU5kSTA1K3cwK0lRa0xvNUtKeGZPZUVPNlhIYnAvV2xLVHl1eS9OWEZkVjMwZ2dzR3pRN0hZd3Z6ZkdtdG8vMllvaVFhS3ZUb0JzV0VWVURYVTdJYjJ1Sk5WTTBYcjFEUVFDeXdnTjI4SDhoREYyMEZYTC80ckp5WWxBQkJxM1RSLzVQK2toa1RxQng3RnFhNnBRcXNEZWdPcDFWbm5UR2I4SC9BbUpQQ2NsSXZGeExUMkdxbUg5SUNJMjBvT0tJRlZnYjBERGRWYlpMTTV2VVgxOEl0QUpDZno3VmhtaGprNnY0YldlL2dXcEFuc0Q2dTVuZVoyVnA0T3VXaERtbUVRZTFPdTRoR1BUNDBlbmRUZlRaRDBWa1hwZ2I2R0hXS1VkUkhtd2RLNWNSeGM0S2ozbmhFTHBYS1dpK1J2WWV5aUkxV1VIblZ5dVhEY3Z3R05IRm9US1ZTcElGZGg3NkNGV3JscE9ycHRrQkhNY2tSNC9mSUJRdmZYVTlWKy85ZzBHQW1ORVJxd3VPK2kxVms0d3g0MHpNcm5sbXlKVWtDcXdaNkZoMVhLQ2RjR2ZuNHRRMTMvTjJqY1ZDSXdkR2JGS2NqbkIrdUJyWmliVTlWK3Z0aUFRV0FYMEVLc2tXSTV5elV5RXV2NXIxUllFQXF1RWdseDlKRHRNSGV0cW4vdnpYNk8ySUJCWVJmU1FxeE8xenpYMXVXc0xBb0hBZktndUNBUUM4Nkc2SUJBSXpJZnFna0FnTUIrcUN3S0J3SHlvTGdnRUF2UGgvd0d4WWR6ekxRdDdod0FBQUFCSlJVNUVya0pnZ2c9PSIgc3R5bGU9Im9wYWNpdHk6MC43NTtpc29sYXRpb246aXNvbGF0ZSIvPjxwYXRoIGQ9Ik0yMC42NjIsMy4xNjJBMzEuODA3LDMxLjgwNywwLDAsMSwyOC4xODgsMTAuN2E2Ljc2NSw2Ljc2NSwwLDAsMC01LjMzMi0yLjAzQTYuMDI1LDYuMDI1LDAsMCwwLDIwLjY2MiwzLjE2MloiIHN0eWxlPSJmaWxsOnVybCgjYikiLz48cGF0aCBkPSJNMjAuNjYyLDMuMTYyQTMxLjgwNywzMS44MDcsMCwwLDEsMjguMTg4LDEwLjdhNi43NjUsNi43NjUsMCwwLDAtNS4zMzItMi4wM0E2LjAyNSw2LjAyNSwwLDAsMCwyMC42NjIsMy4xNjJaIiBzdHlsZT0iZmlsbDpub25lO3N0cm9rZTojYzhjOGM4O3N0cm9rZS13aWR0aDowLjVweCIvPjxyZWN0IHg9IjUuMzM5IiB5PSI2LjQ5NiIgd2lkdGg9IjE0LjEiIGhlaWdodD0iMi43IiBzdHlsZT0iZmlsbDpub25lO3N0cm9rZTojYzhjOGM4O3N0cm9rZS13aWR0aDo0cHgiLz48cGF0aCBkPSJNMTUuODE5LDE5Ljg1NWMuNDY2LS45MTQsMS0xLjk0MywxLjQyLTIuOTc3aDBsLjE2OC0uNDA4Yy0uNTU0LTIuMTA4LS44ODYtMy44LS41ODktNC44OTRoMGEuNzU1Ljc1NSwwLDAsMSwuNzYzLS40NThoMGwuMjE1LDBoLjAzOWMuNDg0LS4wMDcuNzExLjYwOC43MzcuODQ3aDBhMy44NDcsMy44NDcsMCwwLDEtLjE0MSwxLjA3MmgwYTIuNjM5LDIuNjM5LDAsMCwwLS4xNjEtMS4wOTFoMGMtLjItLjQzOS0uMzkxLS43LS41NjItLjc0M2gwYS41NC41NCwwLDAsMC0uMi40MDdoMGE1Ljg3NCw1Ljg3NCwwLDAsMC0uMDc3LjkzOWgwYTEwLjUxMSwxMC41MTEsMCwwLDAsLjQzMywyLjcyOWgwYy4wNTQtLjE1Ni4xLS4zMDYuMTQtLjQ0N2gwYy4wNTktLjIyMi40MzMtMS42OTEuNDMzLTEuNjkxaDBzLS4wOTQsMS45NTYtLjIyNiwyLjU0N2gwYy0uMDI4LjEyNS0uMDU5LjI0OS0uMDkyLjM3NWgwYTguNTg2LDguNTg2LDAsMCwwLDIuMTQ1LDMuMzUxaDBhNi43LDYuNywwLDAsMCwxLjI0Ljg1MmgwYTE2LjksMTYuOSwwLDAsMSwyLjUxNy0uMTg5aDBhMy4xNTMsMy4xNTMsMCwwLDEsMS45MzguNDMzaDBhLjczOC43MzgsMCwwLDEsLjIxMy40ODRoMGExLjQ0NiwxLjQ0NiwwLDAsMS0uMDQxLjI4MmgwYy4wMS0uMDUxLjAxLS4zLS43NTUtLjU0NmgwYTguOTEsOC45MSwwLDAsMC0zLjA4Ni0uMDQzaDBjMS41NjYuNzY2LDMuMDkzLDEuMTQ3LDMuNTc2LjkxOWgwYTEuMDE1LDEuMDE1LDAsMCwwLC4yNjItLjI1NGgwYTIuNzI3LDIuNzI3LDAsMCwxLS4xNDYuNDg0aDBhLjc2NC43NjQsMCwwLDEtLjM3Ny4yNThoMGMtLjc2NC4yLTIuNzUyLS4yNjgtNC40ODUtMS4yNThoMGEzNi42MTksMzYuNjE5LDAsMCwwLTUuNzY4LDEuMzcxaDBjLTEuNjc1LDIuOTM2LTIuOTM1LDQuMjg0LTMuOTU5LDMuNzcxaDBsLS4zNzctLjE4OWEuNDM2LjQzNiwwLDAsMS0uMTQxLS40NzRoMGMuMTE5LS41ODQuODUyLTEuNDY1LDIuMzI0LTIuMzQ0aDBjLjE1OC0uMS44NjQtLjQ2OS44NjQtLjQ2OWgwcy0uNTIzLjUwNi0uNjQ1LjYwNWgwYy0xLjE3NS45NjMtMi4wNDIsMi4xNzQtMi4wMjEsMi42NDRoMGwwLC4wNDFjMS0uMTQyLDIuNDk1LTIuMTc0LDQuNDE5LTUuOTM5bS42MS4zMTJjLS4zMjEuNjA1LS42MzYsMS4xNjYtLjkyNiwxLjY4MmgwYTI0LjU4MiwyNC41ODIsMCwwLDEsNC45NzUtMS40MDhoMGMtLjIyMS0uMTUzLS40MzUtLjMxNC0uNjM3LS40ODVoMGE4LjUzMSw4LjUzMSwwLDAsMS0yLjEtMi43MjloMGEyMy4zODgsMjMuMzg4LDAsMCwxLTEuMzE3LDIuOTQiIHN0eWxlPSJmaWxsOiNmOTFkMGEiLz48aW1hZ2Ugd2lkdGg9IjQ0NSIgaGVpZ2h0PSIxNzEiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDMuMTU3IDQuNDM5KSBzY2FsZSgwLjA0MiAwLjA0MSkiIHhsaW5rOmhyZWY9ImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBYjhBQUFDckNBWUFBQUQySTVKTEFBQUFDWEJJV1hNQUFRcGNBQUVLWEFGYTFuRVRBQUFHYWtsRVFWUjRYdTNhcjQ1ZFpSdkc0VFV6VGYra29nbHBXb0dvUTlDUVdsd05FZ0VCanFHZW9CRDBBSG9JSUJGQWp3RmZReEFjQUtxaEFrVlNRV2krZnMvZHRTWU1NSjNwUi9KbDcvUyt4S1gyWHMrU3Z6enZlcGZuejU4dkFORGszRDhBd092bTNEOEF3T3ZtN0IrWDVXQWNubkFFQUh2b1pLc08vdWY0TFd2d0RyWmhGOGJGY1dsY0hsY0FZQStsVVdsVm1wVjJwV0V2ZW5adS9KWS9ONzBMMjVDcjQ5cDRZMXdmTnpZM0FXQVBISGNwalVxcjBxeTBLdzFMeTA3ZEJFK0xYLzU4WlJ1UXdiZkdXK1AyZUdmY0FZQTlramFsVVdsVm1wVjJYVnZXbHFWcDU4WXZhK0tsN2FFM3g5dmozZkhlZUg5OE1EN2FmQXdBTzNUY283UXBqVXFyMHF5MEt3MUx5OUswbzVmR2IvbHo2OHU2ZUhONytPNzRaTndibjQzUHh4ZmpQZ0RzZ1RRcGJVcWowcW8wNis2eU5pd3RTOVArc2YyZGpGL09SZk9oTUtXOHRhejF6SkJQeDRQeDFmaDZmRHUrR3c4QllJZlNvalFwYlVxakhpeHJzOUt1TkN3dFM5UFN0c096NHBmMU1COE1jMjZhOWZIZU5pekR2eCtQeGcvalJ3RFlBMmxTMnBSR3BWVnBWdHFWaHFWbGFWcmFkbWI4Y2xYMCtySitPTXo1YWRiSUw3ZWhQNDJmeCtQeHkzZ0NBRHVVRnFWSmFWTWFsVmFsV1dsWEdwYVdwV21YbHpQaWw4c3V1Um1USzZPNU9mUGhzcDZqWnAxOHRBMy9kZncybmdMQUhraVQwcVkwS3ExS3M5S3VOQ3d0UzlQU3RxTlhpZCtkWmIxQmt3K0ozeXpyV3ZsNGU4bnY0NC94REFCMktDMUtrOUttTkNxdFNyUFNyalFzTFh2bCtOM2NIc2cxMHR5a3lRZkZuS3Rtdlh5NnZldy9BTEFIMHFTMEtZMUtxOUtzdENzTlM4dlN0SDhWdjRmYndDZmJDNTV0TDN3T0FEdVVGcVZKYVZNYWxWYWxXZmNYOFFQZ05TVitBTlFSUHdEcWlCOEFkY1FQZ0RyaUIwQWQ4UU9nanZnQlVFZjhBS2dqZmdEVUVUOEE2b2dmQUhYRUQ0QTY0Z2RBSGZFRG9JNzRBVkJIL0FDb0kzNEExQkUvQU9xSUh3QjF4QStBT3VJSFFCM3hBNkNPK0FGUVIvd0FxQ04rQU5RUlB3RHFpQjhBZGNRUGdEcmlCMEFkOFFPZ2p2Z0JVRWY4QUtnamZnRFVFVDhBNm9nZkFIWEVENEE2NGdkQUhmRURvSTc0QVZCSC9BQ29JMzRBMUJFL0FPcUlId0IxeEErQU91SUhRQjN4QTZDTytBRlFSL3dBcUNOK0FOUVJQd0RxaUI4QWRjUVBnRHJpQjBBZDhRT2dqdmdCVUVmOEFLZ2pmZ0RVRVQ4QTZvZ2ZBSFhFRDRBNjRnZEFIZkVEb0k3NEFWQkgvQUNvSTM0QTFCRS9BT3FJSHdCMXhBK0FPdUlIUUIzeEE2Q08rQUZRUi93QXFDTitBTlFSUHdEcWlCOEFkY1FQZ0RyaUIwQWQ4UU9nanZnQlVFZjhBS2dqZmdEVUVUOEE2b2dmQUhYRUQ0QTY0Z2RBSGZFRG9JNzRBVkJIL0FDb0kzNEExQkUvQU9xSUh3QjF4QStBT3VJSFFCM3hBNkNPK0FGUVIvd0FxQ04rQU5RUlB3RHFpQjhBZGNRUGdEcmlCMEFkOFFPZ2p2Z0JVRWY4QUtnamZnRFVFVDhBNm9nZkFIWEVENEE2NGdkQUhmRURvSTc0QVZCSC9BQ29JMzRBMUJFL0FPcUlId0IxeEErQU91SUhRQjN4QTZDTytBRlFSL3dBcUNOK0FOUVJQd0RxaUI4QWRjUVBnRHJpQjBBZDhRT2dqdmdCVUVmOEFLZ2pmZ0RVRVQ4QTZvZ2ZBSFhFRDRBNjRnZEFIZkVEb0k3NEFWQkgvQUNvSTM0QTFCRS9BT3FJSHdCMXhBK0FPdUlIUUIzeEE2RE8velYrMzIwRGY5bGU4TWYyUWdEWXRUUXBiVXFqMHFvMDYxL0Y3OGIyd0VmamkvSE4rR0U4SHIrTjM3ZVhQUU9BSFVxTDBxUzBLWTFLcTlLc3RDc05TOHZTdEZlTzN6dmp3L0g1K0hvOEdqK1BYN2VYUEFXQVBaQW1wVTFwVkZxVlpxVmRhVmhhZG03OERzZmxjWDNjSHUrUHo4YVg0L3Z4MHpZOGRjMTYrUVFBZGlndFNwUFNwalFxclVxejBxNDBMQzFMMHk2UHc3UGlkMm04TWQ0YTc0MTc0OEg0ZGh2NmFGblh5aDhCWUEra1NXbFRHcFZXcFZscFZ4cVdscVZwYWR1WjhiczRybzFiNDkzeHlmaDBHL2JWc3E2VEdaNFBpZzhCWUlmU29qUXBiVXFqSGl4cnM5S3VOQ3d0UzlQU3RwZkc3MkJjR0ZlWDlYYk0yK1B1TmlRVnpScVpjOVI4U0x3UEFIc2dUVXFiMHFpMEtzMjZ1NndOUzh2U3RMVHQ0TlQ0bmJqMGt2VXdwWHh6ZXpqMXpQcVk4OU1QbHZVR1RYd01BRHQwM0tPMEtZMUtxOUtzdENzTlM4dlN0TDljZGprdGZzZmIzNVh0b1ZUejFyS2VtOTVlMXBzemR3QmdqNlJOYVZSYWxXYWxYZGVXdFdYLzJQcGVGci9EN2MrcDVkVnRRRDRZWGwvV0s2TTN0c0VBc0d2SFhVcWowcW8wSysxS3c5S3lOTzNzK0owSVlCeHREMTdjaHVTcTZCVUEyRU5wVkZxVlpxVmRhZGlMbnYyOWM2Zkc3eVdiNExFakFOaERKMXQxYXZCTytpOVRoamhSdEkzc2N3QUFBQUJKUlU1RXJrSmdnZz09IiBzdHlsZT0ib3BhY2l0eTowLjMwMDAwMDAwMDAwMDAwMDA0O2lzb2xhdGlvbjppc29sYXRlIi8+PHJlY3QgeD0iMy43NSIgeT0iNC45NjgiIHdpZHRoPSIxNy4yNjQiIGhlaWdodD0iNS44MDMiIHN0eWxlPSJmaWxsOnVybCgjYykiLz48cGF0aCBkPSJNMjEuMzQzLDExLjExOUgzLjQzN1Y0LjYySDIxLjM0M1pNMjAuNyw1LjI2NEg0LjA4MXY1LjIwOUgyMC43WiIgc3R5bGU9ImZpbGw6dXJsKCNkKSIvPjxwYXRoIGQ9Ik04LjI2Miw1LjgxOUg5LjUxOGExLjEsMS4xLDAsMCwxLC44NTkuMzMxLDEuMzM4LDEuMzM4LDAsMCwxLC4zLjkzNywxLjM1MSwxLjM1MSwwLDAsMS0uMy45NDIsMS4xLDEuMSwwLDAsMS0uODU5LjMyOGgtLjVWOS43MDZIOC4yNjJWNS44MTltLjc1Ny43MjZWNy42MzFoLjQxOWEuNDIzLjQyMywwLDAsMCwuMzQtLjE0MS42MTEuNjExLDAsMCwwLC4xMi0uNC42LjYsMCwwLDAtLjEyLS40LjQyMi40MjIsMCwwLDAtLjM0LS4xNDFIOS4wMTltMi45NDkuMDMxVjguOTQ5aC4yNzFhLjg1My44NTMsMCwwLDAsLjcwOC0uMywxLjM4MiwxLjM4MiwwLDAsMCwuMjQ2LS44ODUsMS4zNzUsMS4zNzUsMCwwLDAtLjI0NC0uODguODU4Ljg1OCwwLDAsMC0uNzEtLjNoLS4yNzFtLS43NTctLjc1OGguOEEyLjksMi45LDAsMCwxLDEzLDUuOTQ3YTEuMjgzLDEuMjgzLDAsMCwxLC41NjIuNDI3LDEuNzc5LDEuNzc5LDAsMCwxLC4zMDcuNjA3LDIuNzgzLDIuNzgzLDAsMCwxLC4xLjc3OSwyLjgzMSwyLjgzMSwwLDAsMS0uMS43ODYsMS43NzksMS43NzksMCwwLDEtLjMwNy42MDcsMS4zMTMsMS4zMTMsMCwwLDEtLjU2Ni40MywyLjk2NSwyLjk2NSwwLDAsMS0uOTkxLjEyNWgtLjhWNS44MTltMy4zNDIsMEgxNi42di43NThIMTUuMzFWNy4zaDEuMjA5di43NThIMTUuMzFWOS43MDZoLS43NTdWNS44MTkiIHN0eWxlPSJmaWxsOiNmZmY5ZjkiLz48L3N2Zz4=" alt="PDF" style={{ width: '28px', height: '28px' }} />
              </button>
              <button 
                className="bg-white shadow-sm hover:bg-slate-50 flex items-center justify-center rounded-lg transition-all cursor-pointer" 
                title="تصدير كـ Excel"
                onClick={() => openPrintConfig('excel')}
                style={{ width: '54px', height: '38px', border: '2px solid #3b82f6', padding: '0' }}
              >
                <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgMzIgMzIiPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iYSIgeDE9IjQuNDk0IiB5MT0iLTIwOTIuMDg2IiB4Mj0iMTMuODMyIiB5Mj0iLTIwNzUuOTE0IiBncmFkaWVudFRyYW5zZm9ybT0idHJhbnNsYXRlKDAgMjEwMCkiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiMxODg4NGYiLz48c3RvcCBvZmZzZXQ9IjAuNSIgc3RvcC1jb2xvcj0iIzExN2U0MyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzBiNjYzMSIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjx0aXRsZT5maWxlX3R5cGVfZXhjZWw8L3RpdGxlPjxwYXRoIGQ9Ik0xOS41ODEsMTUuMzUsOC41MTIsMTMuNFYyNy44MDlBMS4xOTIsMS4xOTIsMCwwLDAsOS43MDUsMjloMTkuMUExLjE5MiwxLjE5MiwwLDAsMCwzMCwyNy44MDloMFYyMi41WiIgc3R5bGU9ImZpbGw6IzE4NWMzNyIvPjxwYXRoIGQ9Ik0xOS41ODEsM0g5LjcwNUExLjE5MiwxLjE5MiwwLDAsMCw4LjUxMiw0LjE5MWgwVjkuNUwxOS41ODEsMTZsNS44NjEsMS45NUwzMCwxNlY5LjVaIiBzdHlsZT0iZmlsbDojMjFhMzY2Ii8+PHBhdGggZD0iTTguNTEyLDkuNUgxOS41ODFWMTZIOC41MTJaIiBzdHlsZT0iZmlsbDojMTA3YzQxIi8+PHBhdGggZD0iTTE2LjQzNCw4LjJIOC41MTJWMjQuNDVoNy45MjJhMS4yLDEuMiwwLDAsMCwxLjE5NC0xLjE5MVY5LjM5MUExLjIsMS4yLDAsMCwwLDE2LjQzNCw4LjJaIiBzdHlsZT0ib3BhY2l0eTowLjEwMDAwMDAwMTQ5MDExNjEyO2lzb2xhdGlvbjppc29sYXRlIi8+PHBhdGggZD0iTTE1Ljc4Myw4Ljg1SDguNTEyVjI1LjFoNy4yNzFhMS4yLDEuMiwwLDAsMCwxLjE5NC0xLjE5MVYxMC4wNDFBMS4yLDEuMiwwLDAsMCwxNS43ODMsOC44NVoiIHN0eWxlPSJvcGFjaXR5OjAuMjAwMDAwMDAyOTgwMjMyMjQ7aXNvbGF0aW9uOmlzb2xhdGUiLz48cGF0aCBkPSJNMTUuNzgzLDguODVIOC41MTJWMjMuOGg3LjI3MWExLjIsMS4yLDAsMCwwLDEuMTk0LTEuMTkxVjEwLjA0MUExLjIsMS4yLDAsMCwwLDE1Ljc4Myw4Ljg1WiIgc3R5bGU9Im9wYWNpdHk6MC4yMDAwMDAwMDI5ODAyMzIyNDtpc29sYXRpb246aXNvbGF0ZSIvPjxwYXRoIGQ9Ik0xNS4xMzIsOC44NUg4LjUxMlYyMy44aDYuNjJhMS4yLDEuMiwwLDAsMCwxLjE5NC0xLjE5MVYxMC4wNDFBMS4yLDEuMiwwLDAsMCwxNS4xMzIsOC44NVoiIHN0eWxlPSJvcGFjaXR5OjAuMjAwMDAwMDAyOTgwMjMyMjQ7aXNvbGF0aW9uOmlzb2xhdGUiLz48cGF0aCBkPSJNMy4xOTQsOC44NUgxNS4xMzJhMS4xOTMsMS4xOTMsMCwwLDEsMS4xOTQsMS4xOTFWMjEuOTU5YTEuMTkzLDEuMTkzLDAsMCwxLTEuMTk0LDEuMTkxSDMuMTk0QTEuMTkyLDEuMTkyLDAsMCwxLDIsMjEuOTU5VjEwLjA0MUExLjE5MiwxLjE5MiwwLDAsMSwzLjE5NCw4Ljg1WiIgc3R5bGU9ImZpbGw6dXJsKCNhKSIvPjxwYXRoIGQ9Ik01LjcsMTkuODczbDIuNTExLTMuODg0LTIuMy0zLjg2Mkg3Ljc1OEw5LjAxMywxNC42Yy4xMTYuMjM0LjIuNDA4LjIzOC41MjRoLjAxN2MuMDgyLS4xODguMTY5LS4zNjkuMjYtLjU0NmwxLjM0Mi0yLjQ0N2gxLjdsLTIuMzU5LDMuODQsMi40MTksMy45MDVIMTAuODIxbC0xLjQ1LTIuNzExQTIuMzU1LDIuMzU1LDAsMCwxLDkuMiwxNi44SDkuMTc2YTEuNjg4LDEuNjg4LDAsMCwxLS4xNjguMzUxTDcuNTE1LDE5Ljg3M1oiIHN0eWxlPSJmaWxsOiNmZmYiLz48cGF0aCBkPSJNMjguODA2LDNIMTkuNTgxVjkuNUgzMFY0LjE5MUExLjE5MiwxLjE5MiwwLDAsMCwyOC44MDYsM1oiIHN0eWxlPSJmaWxsOiMzM2M0ODEiLz48cGF0aCBkPSJNMTkuNTgxLDE2SDMwdjYuNUgxOS41ODFaIiBzdHlsZT0iZmlsbDojMTA3YzQxIi8+PC9zdmc+" alt="Excel" style={{ width: '28px', height: '28px' }} />
              </button>
              <button 
                className="bg-white shadow-sm hover:bg-slate-50 flex items-center justify-center rounded-lg transition-all cursor-pointer" 
                title="تصدير كـ Word"
                onClick={() => openPrintConfig('word')}
                style={{ width: '54px', height: '38px', border: '2px solid #3b82f6', padding: '0' }}
              >
                <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgMzIgMzIiPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iYSIgeDE9IjQuNDk0IiB5MT0iLTE3MTIuMDg2IiB4Mj0iMTMuODMyIiB5Mj0iLTE2OTUuOTE0IiBncmFkaWVudFRyYW5zZm9ybT0idHJhbnNsYXRlKDAgMTcyMCkiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiMyMzY4YzQiLz48c3RvcCBvZmZzZXQ9IjAuNSIgc3RvcC1jb2xvcj0iIzFhNWRiZSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzExNDZhYyIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjx0aXRsZT5maWxlX3R5cGVfd29yZDwvdGl0bGU+PHBhdGggZD0iTTI4LjgwNiwzSDkuNzA1QTEuMTkyLDEuMTkyLDAsMCwwLDguNTEyLDQuMTkxaDBWOS41bDExLjA2OSwzLjI1TDMwLDkuNVY0LjE5MUExLjE5MiwxLjE5MiwwLDAsMCwyOC44MDYsM1oiIHN0eWxlPSJmaWxsOiM0MWE1ZWUiLz48cGF0aCBkPSJNMzAsOS41SDguNTEyVjE2bDExLjA2OSwxLjk1TDMwLDE2WiIgc3R5bGU9ImZpbGw6IzJiN2NkMyIvPjxwYXRoIGQ9Ik04LjUxMiwxNnY2LjVMMTguOTMsMjMuOCwzMCwyMi41VjE2WiIgc3R5bGU9ImZpbGw6IzE4NWFiZCIvPjxwYXRoIGQ9Ik05LjcwNSwyOWgxOS4xQTEuMTkyLDEuMTkyLDAsMCwwLDMwLDI3LjgwOWgwVjIyLjVIOC41MTJ2NS4zMDlBMS4xOTIsMS4xOTIsMCwwLDAsOS43MDUsMjlaIiBzdHlsZT0iZmlsbDojMTAzZjkxIi8+PHBhdGggZD0iTTE2LjQzNCw4LjJIOC41MTJWMjQuNDVoNy45MjJhMS4yLDEuMiwwLDAsMCwxLjE5NC0xLjE5MVY5LjM5MUExLjIsMS4yLDAsMCwwLDE2LjQzNCw4LjJaIiBzdHlsZT0ib3BhY2l0eTowLjEwMDAwMDAwMTQ5MDExNjEyO2lzb2xhdGlvbjppc29sYXRlIi8+PHBhdGggZD0iTTE1Ljc4Myw4Ljg1SDguNTEyVjI1LjFoNy4yNzFhMS4yLDEuMiwwLDAsMCwxLjE5NC0xLjE5MVYxMC4wNDFBMS4yLDEuMiwwLDAsMCwxNS43ODMsOC44NVoiIHN0eWxlPSJvcGFjaXR5OjAuMjAwMDAwMDAyOTgwMjMyMjQ7aXNvbGF0aW9uOmlzb2xhdGUiLz48cGF0aCBkPSJNMTUuNzgzLDguODVIOC41MTJWMjMuOGg3LjI3MWExLjIsMS4yLDAsMCwwLDEuMTk0LTEuMTkxVjEwLjA0MUExLjIsMS4yLDAsMCwwLDE1Ljc4Myw4Ljg1WiIgc3R5bGU9Im9wYWNpdHk6MC4yMDAwMDAwMDI5ODAyMzIyNDtpc29sYXRpb246aXNvbGF0ZSIvPjxwYXRoIGQ9Ik0xNS4xMzIsOC44NUg4LjUxMlYyMy44aDYuNjJhMS4yLDEuMiwwLDAsMCwxLjE5NC0xLjE5MVYxMC4wNDFBMS4yLDEuMiwwLDAsMCwxNS4xMzIsOC44NVoiIHN0eWxlPSJvcGFjaXR5OjAuMjAwMDAwMDAyOTgwMjMyMjQ7aXNvbGF0aW9uOmlzb2xhdGUiLz48cGF0aCBkPSJNMy4xOTQsOC44NUgxNS4xMzJhMS4xOTMsMS4xOTMsMCwwLDEsMS4xOTQsMS4xOTFWMjEuOTU5YTEuMTkzLDEuMTkzLDAsMCwxLTEuMTk0LDEuMTkxSDMuMTk0QTEuMTkyLDEuMTkyLDAsMCwxLDIsMjEuOTU5VjEwLjA0MUExLjE5MiwxLjE5MiwwLDAsMSwzLjE5NCw4Ljg1WiIgc3R5bGU9ImZpbGw6dXJsKCNhKSIvPjxwYXRoIGQ9Ik02LjksMTcuOTg4Yy4wMjMuMTg0LjAzOS4zNDQuMDQ2LjQ4MWguMDI4Yy4wMS0uMTMuMDMyLS4yODcuMDY1LS40N3MuMDYyLS4zMzguODktLjQ2NWwxLjI1NS01LjQwN2gxLjYyNGwxLjMsNS4zMjZhNy43NjEsNy43NjEsMCwwLDEsLjE2MiwxaC4wMjJhNy42LDcuNiwwLDAsMSwuMTM1LS45NzVsMS4wMzktNS4zNThoMS40NzdsLTEuODI0LDcuNzQ4SDEwLjU5MUw5LjM1NCwxNC43NDJxLS4wNTQtLjIyMi0uMTIyLS41Nzh0LS4wODQtLjUySDkuMTI3cS0uMDIxLjE4OS0uMDg0LjU2MWMtLjA0Mi4yNDktLjA3NS40MzItLjEuNTUyTDcuNzgsMTkuODcxSDYuMDI0TDQuMTksMTIuMTI3aDEuNWwxLjEzMSw1LjQxOEE0LjQ2OSw0LjQ2OSwwLDAsMSw2LjksMTcuOTg4WiIgc3R5bGU9ImZpbGw6I2ZmZiIvPjwvc3ZnPg==" alt="Word" style={{ width: '28px', height: '28px' }} />
              </button>
              <button 
                className="bg-white shadow-sm hover:bg-slate-50 flex items-center justify-center rounded-lg transition-all cursor-pointer" 
                title="طباعة التقرير"
                onClick={() => openPrintConfig('print')}
                style={{ width: '54px', height: '38px', border: '2px solid #3b82f6', padding: '0', color: '#3b82f6' }}
              >
                <Printer size={22} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div style={{
          display: 'flex',
          flexWrap: 'nowrap',
          gap: '12px',
          marginBottom: '32px',
          overflowX: 'auto',
          overflowY: 'hidden',
          padding: '8px 0 16px'
        }}>
          {[
            { id: 'slip', label: 'قسيمة راتب', desc: 'تفاصيل راتب موظف محدد', icon: <User size={28} strokeWidth={1.5} /> },
            { id: 'sheet', label: 'إجمالي الرواتب', desc: 'كشف رواتب لجميع الموظفين', icon: <Briefcase size={28} strokeWidth={1.5} /> },
            { id: 'advances', label: 'كشف السلف', desc: 'السلف، الموافقات، الخصومات', icon: <DollarSign size={28} strokeWidth={1.5} /> },
            { id: 'petitions', label: 'سجل الاستدعاءات', desc: 'الاستدعاءات، الشكاوى، الطلبات', icon: <FileText size={28} strokeWidth={1.5} /> },
            { id: 'missing-punches', label: 'الختمات الناقصة', desc: 'الختمات المنسية والمخالفات', icon: <Fingerprint size={28} strokeWidth={1.5} /> },
            { id: 'leaves', label: 'الإجازات والمغادرات', desc: 'أرصدة، موافقات، مغادرات', icon: <Calendar size={28} strokeWidth={1.5} /> },
            { id: 'overtime', label: 'العمل الإضافي', desc: 'طلبات العمل الإضافي، ساعات', icon: <Clock size={28} strokeWidth={1.5} /> },
            { id: 'attendance', label: 'سجل الحضور', desc: 'بصمات الحضور والانصراف', icon: <Clock size={28} strokeWidth={1.5} /> },
            { id: 'employees', label: 'كشف الموظفين', desc: 'بيانات، عقود، تواصل', icon: <User size={28} strokeWidth={1.5} /> },
            { id: 'violations-bonuses', label: 'المخالفات والمكافآت', desc: 'الخصومات، الحوافز، العقوبات', icon: <AlertCircle size={28} strokeWidth={1.5} /> },
            { id: 'assets', label: 'سجل العهد والأصول', desc: 'ممتلكات الموظفين', icon: <Package size={28} strokeWidth={1.5} /> }
          ].map(card => {
            const isActive = activeReportTab === card.id;
            return (
              <div
                key={card.id}
                onClick={() => setActiveReportTab(card.id)}
                style={{
                  background: isActive ? 'linear-gradient(135deg, #2dd4bf, #0f766e)' : '#ffffff',
                  borderRadius: '16px',
                  padding: '12px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 20px 25px -5px rgba(15, 118, 110, 0.4)' : '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
                  border: isActive ? 'none' : '1px solid #f1f5f9',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isActive ? 'translateY(-8px)' : 'translateY(0)',
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: '100px',
                  minWidth: '118px',
                  flex: '1 0 118px'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)';
                  }
                }}
              >
                {isActive && (
                  <>
                    <div style={{
                      position: 'absolute',
                      bottom: '-40px',
                      left: '-20px',
                      right: '-20px',
                      height: '100px',
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: '50% 50% 0 0',
                      transform: 'rotate(-5deg)'
                    }}></div>
                    <div style={{
                      position: 'absolute',
                      bottom: '-60px',
                      left: '-30px',
                      right: '-30px',
                      height: '120px',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '50% 50% 0 0',
                      transform: 'rotate(3deg)'
                    }}></div>
                  
                  </>
                )}

                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: isActive ? 'rgba(255, 255, 255, 0.2)' : '#f8fafc',
                  border: isActive ? '1px solid rgba(255,255,255,0.3)' : '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isActive ? '#ffffff' : '#0f766e',
                  marginBottom: '8px',
                  zIndex: 1,
                  transition: 'all 0.3s ease'
                }}>
                  {React.cloneElement(card.icon, { size: 16 })}
                </div>

                <h3 style={{
                  fontSize: '0.9rem',
                  fontWeight: '800',
                  color: isActive ? '#ffffff' : '#0f766e',
                  marginBottom: '4px',
                  zIndex: 1,
                  letterSpacing: '-0.5px'
                }}>{card.label}</h3>

                <p style={{
                  fontSize: '0.75rem',
                  color: isActive ? 'rgba(255, 255, 255, 0.9)' : '#64748b',
                  marginBottom: '8px',
                  zIndex: 1,
                  lineHeight: '1.5',
                  maxWidth: '180px'
                }}>{card.desc}</p>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: isActive ? '1.5px solid rgba(255,255,255,0.5)' : '1.5px solid #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isActive ? '#ffffff' : '#0f766e',
                  zIndex: 1,
                  marginTop: 'auto',
                  transition: 'all 0.3s ease'
                }}>
                  <ArrowLeft size={14} strokeWidth={2.5} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="glass-card mb-6 flex-responsive" style={{ border: 'none', background: '#f8fafc', padding: '16px', borderRadius: '16px' }}>
          {activeReportTab === 'slip' ? (
            <div className="flex-1 flex gap-4 items-center">
              <Search color="#94a3b8" size={20} className="shrink-0 ml-2" />

              <div className="flex items-center gap-3 min-w-[200px]">
                <span className="text-sm font-bold text-slate-600 whitespace-nowrap">الرقم الوظيفي:</span>
                <div className="w-44">
                  <Select
                    options={employeeIdOptions}
                    value={employeeIdOptions.find(opt => opt.value === selectedEmployeeId) || null}
                    onChange={(selected) => setSelectedEmployeeId(selected ? selected.value : '')}
                    styles={customSelectStyles}
                    placeholder="اختر..."
                    isSearchable={true}
                    menuPosition="fixed"
                    menuPortalTarget={document.body}
                    noOptionsMessage={() => "لا يوجد رقم"}
                  />
                </div>
              </div>

              <div className="w-px h-8 bg-slate-200 mr-4 ml-10 shrink-0"></div>

              <div className="flex items-center gap-3 flex-1">
                <span className="text-sm font-bold text-slate-600 whitespace-nowrap">اسم الموظف:</span>
                <div className="flex-1 min-w-[280px]">
                  <Select
                    options={employeeNameOptions}
                    value={employeeNameOptions.find(opt => opt.value === selectedEmployeeId) || null}
                    onChange={(selected) => setSelectedEmployeeId(selected ? selected.value : '')}
                    styles={customSelectStyles}
                    placeholder="ابحث واختر الاسم..."
                    isSearchable={true}
                    menuPosition="fixed"
                    menuPortalTarget={document.body}
                    noOptionsMessage={() => "لا يوجد موظف بهذا الاسم"}
                  />
                </div>
              </div>
            </div>
          ) : activeReportTab === 'sheet' ? (
            <div className="flex-1 flex flex-wrap gap-8 items-center">
              <div className="flex items-center gap-3">
                <Search color="#94a3b8" size={20} className="shrink-0" />
                <span className="text-sm font-bold text-slate-600 whitespace-nowrap">الرقم الوظيفي:</span>
                <div className="w-44">
                  <Select
                    options={employeeIdOptions}
                    value={employeeIdOptions.find(opt => opt.value === archiveSearch) || null}
                    onChange={(selected) => setArchiveSearch(selected ? selected.value : '')}
                    styles={customSelectStyles}
                    placeholder="الكل"
                    isSearchable={true}
                    isClearable={true}
                    menuPosition="fixed"
                    menuPortalTarget={document.body}
                    noOptionsMessage={() => "لا يوجد رقم"}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 flex-1 min-w-[250px]">
                <span className="text-sm font-bold text-slate-600 whitespace-nowrap">اسم الموظف:</span>
                <div className="flex-1 max-w-md">
                  <Select
                    options={employeeNameOptions}
                    value={employeeNameOptions.find(opt => opt.value === archiveSearch) || null}
                    onChange={(selected) => setArchiveSearch(selected ? selected.value : '')}
                    styles={customSelectStyles}
                    placeholder="جميع الموظفين..."
                    isSearchable={true}
                    isClearable={true}
                    menuPosition="fixed"
                    menuPortalTarget={document.body}
                    noOptionsMessage={() => "لا يوجد موظف بهذا الاسم"}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Briefcase color="#3b82f6" size={18} />
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value === 'all_content' ? 'all' : e.target.value)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.95rem', color: '#1e293b', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  <option value="all">جميع الأقسام</option>
                  {(settings?.departmentsList || []).map((dept, idx) => (
                    <option key={idx} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : activeReportTab === 'missing-punches' || activeReportTab === 'advances' || activeReportTab === 'petitions' || activeReportTab === 'leaves' || activeReportTab === 'overtime' || activeReportTab === 'attendance' || activeReportTab === 'violations-bonuses' ? (
            <div className="flex-1 flex flex-wrap gap-8 items-center">
              <div className="flex items-center gap-3">
                <Search color="#94a3b8" size={20} className="shrink-0" />
                <span className="text-sm font-bold text-slate-600 whitespace-nowrap">الرقم الوظيفي:</span>
                <div className="w-44">
                  <Select
                    options={employeeIdOptions}
                    value={employeeIdOptions.find(opt => opt.value === archiveSearch) || null}
                    onChange={(selected) => setArchiveSearch(selected ? selected.value : '')}
                    styles={customSelectStyles}
                    placeholder="الكل"
                    isSearchable={true}
                    isClearable={true}
                    menuPosition="fixed"
                    menuPortalTarget={document.body}
                    noOptionsMessage={() => "لا يوجد رقم"}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 flex-1 min-w-[250px]">
                <span className="text-sm font-bold text-slate-600 whitespace-nowrap">اسم الموظف:</span>
                <div className="flex-1 max-w-md">
                  <Select
                    options={employeeNameOptions}
                    value={employeeNameOptions.find(opt => opt.value === archiveSearch) || null}
                    onChange={(selected) => setArchiveSearch(selected ? selected.value : '')}
                    styles={customSelectStyles}
                    placeholder="جميع الموظفين..."
                    isSearchable={true}
                    isClearable={true}
                    menuPosition="fixed"
                    menuPortalTarget={document.body}
                    noOptionsMessage={() => "لا يوجد موظف بهذا الاسم"}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <HRDateFilter 
                  mode={archiveDateMode}
                  setMode={setArchiveDateMode}
                  date={archiveSelectedDate}
                  setDate={setArchiveSelectedDate}
                  month={selectedMonth}
                  setMonth={setSelectedMonth}
                  startDate={archiveDateFrom}
                  setStartDate={setArchiveDateFrom}
                  endDate={archiveDateTo}
                  setEndDate={setArchiveDateTo}
                  allowedModes={['day', 'month', 'range']}
                />
              </div>

              {activeReportTab === 'leaves' && (
                <div className="flex items-center gap-2">
                  <Filter color="#3b82f6" size={18} />
                  <select
                    value={archiveFilterType}
                    onChange={e => setArchiveFilterType(e.target.value)}
                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.95rem', color: '#1e293b', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    <option value="الكل">الكل (نوع الطلب)</option>
                    <option value="إجازة سنوية">إجازة سنوية</option>
                    <option value="إجازة غير مدفوعة">إجازة غير مدفوعة</option>
                    <option value="إجازة مرضية">إجازة مرضية</option>
                    <option value="مغادرة خاصة">مغادرة خاصة</option>
                    <option value="مغادرة عمل">مغادرة عمل</option>
                    <option value="مغادرة الدخان">مغادرة الدخان</option>
                  </select>
                </div>
              )}

              {activeReportTab !== 'attendance' && activeReportTab !== 'violations-bonuses' && (
                <div className="flex items-center gap-2">
                  <Filter color="#3b82f6" size={18} />
                  <select
                    value={archiveStatus}
                    onChange={e => setArchiveStatus(e.target.value)}
                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.95rem', color: '#1e293b', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    <option value="all">جميع الحالات</option>
                    <option value="موافق">موافق</option>
                    <option value="موافق عليه">موافق عليه</option>
                    <option value="مرفوض">مرفوض</option>
                    <option value="معلق">معلق</option>
                    <option value="محذوف">محذوف</option>
                  </select>
                </div>
              )}
              {activeReportTab === 'violations-bonuses' && (
                <div className="flex items-center gap-2">
                  <Filter color="#3b82f6" size={18} />
                  <select
                    value={archiveStatus}
                    onChange={e => setArchiveStatus(e.target.value)}
                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.95rem', color: '#1e293b', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    <option value="all">الكل</option>
                    <option value="مخالفة">المخالفات</option>
                    <option value="مكافأة">المكافآت</option>
                  </select>
                </div>
              )}
              <div className="w-px h-6 bg-slate-200 hidden md:block"></div>
              <div className="flex items-center gap-2">
                <Briefcase color="#3b82f6" size={18} />
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value === 'all_content' ? 'all' : e.target.value)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.95rem', color: '#1e293b', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  <option value="all">جميع الأقسام</option>
                  {(settings?.departmentsList || []).map((dept, idx) => (
                    <option key={idx} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : activeReportTab === 'assets' ? (
            <div className="flex flex-col gap-4 w-full">
              <div className="flex justify-between items-center w-full">
                <div className="text-slate-700 font-bold flex items-center gap-2">
                  <Package size={20} className="text-primary" />
                  <span>تصفية تقرير العهد والأصول</span>
                </div>
                <button
                  onClick={() => setShowAssetFilters(!showAssetFilters)}
                  className="btn btn-primary flex items-center gap-2 shadow-sm"
                >
                  <Filter size={18} />
                  <span>{showAssetFilters ? 'إخفاء التصفية' : 'تصفية متقدمة'}</span>
                </button>
              </div>

              {showAssetFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
                  <div className="search-wrapper m-0 bg-white">
                    <Search className="search-icon" size={18} />
                    <input
                      type="text"
                      placeholder="ابحث باسم الموظف أو رقمه..."
                      value={archiveSearch}
                      onChange={e => setArchiveSearch(e.target.value)}
                      className="input-field search-input"
                    />
                  </div>
                  
                  <div className="search-wrapper m-0 bg-white">
                    <Filter className="search-icon" size={18} />
                    <select
                      value={assetCategoryFilter}
                      onChange={e => setAssetCategoryFilter(e.target.value)}
                      className="input-field search-input"
                    >
                      <option value="all">جميع تصنيفات العهد</option>
                      {(Array.isArray(settings?.stockCategories) ? settings.stockCategories : ['الأصول', 'مستهلكات الخياطة']).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="search-wrapper m-0 bg-white">
                    <Filter className="search-icon" size={18} />
                    <select
                      value={archiveStatus}
                      onChange={e => setArchiveStatus(e.target.value)}
                      className="input-field search-input"
                    >
                      <option value="all">جميع حالات العهد</option>
                      <option value="نشطة">نشطة</option>
                      <option value="تالفة">تالفة</option>
                      <option value="مفقودة">مفقودة</option>
                    </select>
                  </div>

                  <div className="search-wrapper m-0 bg-white">
                    <Briefcase className="search-icon" size={18} />
                    <select
                      value={selectedDepartment}
                      onChange={e => setSelectedDepartment(e.target.value === 'all_content' ? 'all' : e.target.value)}
                      className="input-field search-input"
                    >
                      <option value="all" hidden>جميع الأقسام</option>
                  <option value="all_content">جميع الأقسام الوظيفية</option>
                      {(Array.isArray(settings?.departmentsList) ? settings.departmentsList : []).map((dept, idx) => (
                    <option key={idx} value={dept}>{dept}</option>
                  ))}
                    </select>
                  </div>

                  <div className="search-wrapper m-0 bg-white">
                    <Users className="search-icon" size={18} />
                    <select
                      value={assetJobTitleFilter}
                      onChange={e => setAssetJobTitleFilter(e.target.value)}
                      className="input-field search-input"
                    >
                      <option value="all">جميع المسميات الوظيفية</option>
                      {Array.from(new Set((Array.isArray(employees) ? employees : []).map(e => e.jobTitle).filter(Boolean))).map(title => (
                        <option key={title} value={title}>{title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Filter color="#94a3b8" size={20} />
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value === 'all_content' ? 'all' : e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '1rem', color: '#1e293b', fontWeight: 'bold', cursor: 'pointer' }}
              >
                <option value="all" hidden>جميع الأقسام</option>
                  <option value="all_content">جميع الأقسام الوظيفية</option>
                {(settings?.departmentsList || []).map((dept, idx) => (
                    <option key={idx} value={dept}>{dept}</option>
                  ))}
              </select>
            
            </>
          )}
        </div>
      </div>

      {/* Printable Area */}
      <div className="print-area">
        {activeReportTab === 'slip' && selectedEmployeeData && (
          <div className="bg-white printable-card print-no-border" style={{
            direction: 'rtl',
            maxWidth: '800px',
            margin: '0 auto',
            padding: '40px',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
          }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #cbd5e1', paddingBottom: '24px', marginBottom: '32px' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 8px 0' }}>قسيمة راتب</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.875rem' }}>
                  <Calendar size={16} /> {getSelectedMonthLabel()}
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                {settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" style={{ maxHeight: '48px', objectFit: 'contain', marginBottom: '8px', mixBlendMode: 'multiply' }} />
                ) : (
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1a8d9b', margin: '0 0 4px 0' }}>{settings?.siteName || 'Mr Sleep'}</h2>
                )}
                <p style={{ color: '#64748b', fontSize: '0.75rem' }}>إدارة الموارد البشرية</p>
              </div>
            </div>

            {/* Employee Info Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px',
              marginBottom: '40px',
              background: '#f8fafc',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid #f1f5f9'
            }}>
              {[
                { label: 'الرقم الوظيفي', value: selectedEmployeeData.id },
                { label: 'اسم الموظف', value: selectedEmployeeData.name },
                { label: 'المسمى الوظيفي', value: selectedEmployeeData.jobTitle || '-' },
                { label: 'القسم', value: selectedEmployeeData.department || '-' }
              ].map((item, i) => (
                <div key={i} style={{
                  background: 'white',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1a8d9b' }}></div>
                    {item.label}
                  </p>
                  <p style={{ fontWeight: '900', color: '#0f172a', fontSize: '1.05rem', marginTop: '4px' }}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Financial Breakdown */}
            <div style={{ display: 'flex', gap: '40px', marginBottom: '40px' }}>

              {/* Earnings */}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px' }}>
                  الاستحقاقات
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#475569', fontSize: '0.875rem' }}>الراتب الأساسي</span>
                  <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{formatVal(selectedEmployeeData.basic, false)} د.أ</span>
                </div>
                {selectedEmployeeData.transportAllowanceAddition > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#475569', fontSize: '0.875rem' }}>بدل مواصلات</span>
                    <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{formatVal(selectedEmployeeData.transportAllowanceAddition, false)} د.أ</span>
                  </div>
                )}
                {selectedEmployeeData.overtimePay > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#475569', fontSize: '0.875rem' }}>بدل إضافي <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>({selectedEmployeeData.totalOvertimeHours.toFixed(1)} ساعة)</span></span>
                    <span style={{ fontWeight: 'bold', color: '#059669' }}>{formatVal(selectedEmployeeData.overtimePay, false)} د.أ</span>
                  </div>
                )}
                {selectedEmployeeData.holidayPay > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#475569', fontSize: '0.875rem' }}>تعويض عطل الرسمية</span>
                    <span style={{ fontWeight: 'bold', color: '#7e22ce' }}>{formatVal(selectedEmployeeData.holidayPay, false)} د.أ</span>
                  </div>
                )}
                {selectedEmployeeData.totalBonusAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#475569', fontSize: '0.875rem' }}>بدلات ومكافآت</span>
                    <span style={{ fontWeight: 'bold', color: '#10b981' }}>{formatVal(selectedEmployeeData.totalBonusAmount, false)} د.أ</span>
                  </div>
                )}
                {selectedEmployeeData.bonusesList?.length > 0 && (
                  <div style={{ padding: '4px 0', fontSize: '0.75rem' }}>
                    {selectedEmployeeData.bonusesList.map((b, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: '4px', paddingLeft: '8px' }}>
                        <span>- {b.type}</span>
                        <span>{formatVal(b.amount, false)} د.أ</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', marginTop: '8px' }}>
                  <span style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '0.875rem' }}>إجمالي الاستحقاقات</span>
                  <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{formatVal(selectedEmployeeData.basic + selectedEmployeeData.overtimePay + (selectedEmployeeData.holidayPay || 0) + (selectedEmployeeData.totalBonusAmount || 0) + (selectedEmployeeData.transportAllowanceAddition || 0), false)} د.أ</span>
                </div>
              </div>

              {/* Deductions */}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px' }}>
                  الاستقطاعات
                </h3>
                {selectedEmployeeData.lateDeduction > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#475569', fontSize: '0.875rem' }}>خصم التأخير والمغادرات</span>
                    <span style={{ fontWeight: 'bold', color: '#e11d48' }}>{formatVal(selectedEmployeeData.lateDeduction, false)} د.أ</span>
                  </div>
                )}
                {(selectedEmployeeData.unpaidLeaveDeduction > 0 || selectedEmployeeData.unexcusedAbsenceDeduction > 0) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#475569', fontSize: '0.875rem' }}>خصم الغياب الشامل (آلي ويدوي)</span>
                    <span style={{ fontWeight: 'bold', color: '#e11d48' }}>{formatVal((selectedEmployeeData.unpaidLeaveDeduction || 0) + (selectedEmployeeData.unexcusedAbsenceDeduction || 0), false)} د.أ</span>
                  </div>
                )}
                {Math.round(selectedEmployeeData.violationsList?.reduce((sum, v) => sum + (Number(v.deductionAmount) || 0), 0) || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#475569', fontSize: '0.875rem' }}>مخالفات يدوية</span>
                    <span style={{ fontWeight: 'bold', color: '#e11d48' }}>{formatVal(selectedEmployeeData.violationsList?.reduce((sum, v) => sum + (Number(v.deductionAmount) || 0), 0) || 0, false)} د.أ</span>
                  </div>
                )}
                {selectedEmployeeData.violationsList?.length > 0 && (
                  <div style={{ padding: '4px 0', fontSize: '0.75rem' }}>
                    {selectedEmployeeData.violationsList.map((v, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: '4px', paddingLeft: '8px' }}>
                        <span>- {v.type} ({v.date?.split('-')[2]})</span>
                      </div>
                    ))}
                  </div>
                )}
                {selectedEmployeeData.socialSecurityEmployeeDeduction > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#475569', fontSize: '0.875rem' }}>اقتطاع الضمان الاجتماعي</span>
                    <span style={{ fontWeight: 'bold', color: '#e11d48' }}>{formatVal(selectedEmployeeData.socialSecurityEmployeeDeduction, false)} د.أ</span>
                  </div>
                )}
                {selectedEmployeeData.advanceDeduction > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#475569', fontSize: '0.875rem' }}>سلفة مقتطعة</span>
                    <span style={{ fontWeight: 'bold', color: '#e11d48' }}>{formatVal(selectedEmployeeData.advanceDeduction, false)} د.أ</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', marginTop: 'auto' }}>
                  <span style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '0.875rem' }}>إجمالي الاستقطاعات</span>
                  <span style={{ fontWeight: 'bold', color: '#e11d48' }}>{formatVal(selectedEmployeeData.totalDeductions, false)} د.أ</span>
                </div>
              </div>
            </div>

            {/* Net Salary */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <span style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#0f172a' }}>صافي الراتب المستحق</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1a8d9b', lineHeight: 1 }}>
                  {formatVal(selectedEmployeeData.netSalary, false)}
                </span>
                <span style={{ fontSize: '1rem', color: '#1a8d9b' }}>د.أ</span>
              </div>
            </div>

            {/* Notes Section (Company Contribution) */}
            {selectedEmployeeData.socialSecurityCompanyContribution > 0 && (
              <div style={{ marginBottom: '40px', padding: '16px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <p style={{ color: '#1e40af', fontSize: '0.875rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 'bold' }}>ملاحظة إدارية:</span> مساهمة الشركة في الضمان الاجتماعي عن هذا الشهر تبلغ {selectedEmployeeData.socialSecurityCompanyContribution} د.أ (لا تخصم من راتب الموظف).
                </p>
              </div>
            )}

            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '32px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ textAlign: 'center', width: '40%' }}>
                <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '48px' }}>توقيع الموظف المستلم</p>
                <div style={{ borderBottom: '1px solid #cbd5e1' }}></div>
              </div>
              <div style={{ textAlign: 'center', width: '40%' }}>
                <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '48px' }}>اعتماد الإدارة / المحاسبة</p>
                <div style={{ borderBottom: '1px solid #cbd5e1' }}></div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '32px', color: '#94a3b8', fontSize: '0.75rem' }}>
              طبع في: {new Date().toLocaleDateString('en-GB')}
            </div>
          </div>
        )}

        {activeReportTab === 'sheet' && (
          <div className="bg-white printable-card print-no-border" style={{
            direction: 'rtl',
            padding: '40px',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
          }}>
            {/* Awesome Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #cbd5e1', paddingBottom: '20px', marginBottom: '32px' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>كشف الرواتب الاجمالي</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '0.875rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} /> {getSelectedMonthLabel()}</span>
                  <span>|</span>
                  <span style={{ color: '#1a8d9b' }}>{selectedDepartment === 'all' ? 'جميع الأقسام' : (departments[selectedDepartment] || selectedDepartment)}</span>
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                {settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" style={{ maxHeight: '48px', objectFit: 'contain', marginBottom: '8px', mixBlendMode: 'multiply' }} />
                ) : (
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1a8d9b', margin: '0 0 4px 0' }}>{settings?.siteName || 'Mr Sleep'}</h2>
                )}
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>تاريخ الإصدار: {new Date().toLocaleDateString('en-GB')}</p>
              </div>
            </div>

            <table style={{ width: '100%', fontSize: '0.875rem', textAlign: 'right', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '12px', color: '#475569', width: '40px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '12px', color: '#475569', width: '90px', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('employeeId')}>الرقم الوظيفي {getSortIcon('employeeId')}</th>
                  <th style={{ padding: '12px', color: '#475569', textAlign: 'right', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('employeeName')}>الموظف {getSortIcon('employeeName')}</th>
                  <th style={{ padding: '12px', color: '#475569', width: '90px', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('basic')}>الأساسي {getSortIcon('basic')}</th>
                  <th style={{ padding: '12px', color: '#475569', width: '90px', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('transport')}>مواصلات {getSortIcon('transport')}</th>
                  <th style={{ padding: '12px', color: '#475569', width: '90px', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('bonuses')}>بدلات {getSortIcon('bonuses')}</th>
                  <th style={{ padding: '12px', color: '#475569', width: '100px', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('overtime')}>إضافي {getSortIcon('overtime')}</th>
                  <th style={{ padding: '12px', color: '#475569', width: '100px', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('deductions')}>خصومات {getSortIcon('deductions')}</th>
                  <th style={{ padding: '12px', color: '#475569', width: '100px', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('socialEmp')}>ضمان الموظف {getSortIcon('socialEmp')}</th>
                  <th style={{ padding: '12px', color: '#475569', width: '100px', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('socialComp')}>ضمان الشركة {getSortIcon('socialComp')}</th>
                  <th style={{ padding: '12px', color: '#1a8d9b', width: '120px', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('net')}>الصافي {getSortIcon('net')}</th>
                  <th style={{ padding: '12px', color: '#475569', width: '180px', textAlign: 'center' }}>التوقيع بالاستلام</th>
                </tr>
              </thead>
              <tbody>
                {sortData(filteredSheetSalaryData, {
                  employeeId: (e) => e.employeeId || e.id,
                  employeeName: (e) => e.name,
                  basic: (e) => e.basic,
                  transport: (e) => e.transportAllowanceAddition || 0,
                  bonuses: (e) => e.totalBonusAmount || 0,
                  overtime: (e) => e.overtimePay || 0,
                  deductions: (e) => e.totalDeductions || 0,
                  socialEmp: (e) => e.socialSecurityEmployeeDeduction || 0,
                  socialComp: (e) => e.socialSecurityCompanyContribution || 0,
                  net: (e) => e.netSalary || 0
                })
                  .map((emp, index) => (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', color: '#64748b', textAlign: 'center' }}>{index + 1}</td>
                      <td style={{ padding: '12px', color: '#64748b', textAlign: 'center', direction: 'ltr' }}>{emp.employeeId || emp.id}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a', textAlign: 'right' }}>{emp.name}</td>
                      <td style={{ padding: '12px', color: '#475569', textAlign: 'center' }}>{formatVal(emp.basic, false)}</td>
                      <td style={{ padding: '12px', color: '#475569', textAlign: 'center' }}>{formatVal(emp.transportAllowanceAddition || 0)}</td>
                      <td style={{ padding: '12px', color: '#10b981', textAlign: 'center' }}>{formatVal(emp.totalBonusAmount)}</td>
                      <td style={{ padding: '12px', color: '#059669', textAlign: 'center' }}>{formatVal(emp.overtimePay)}</td>
                      <td style={{ padding: '12px', color: '#e11d48', textAlign: 'center' }}>{formatVal(emp.totalDeductions)}</td>
                      <td style={{ padding: '12px', color: '#3b82f6', textAlign: 'center' }}>{formatVal(emp.socialSecurityEmployeeDeduction || 0)}</td>
                      <td style={{ padding: '12px', color: '#6366f1', textAlign: 'center' }}>{formatVal(emp.socialSecurityCompanyContribution || 0)}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a', textAlign: 'center' }}>{formatVal(emp.netSalary, false)}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ borderBottom: '1px solid #cbd5e1', width: '100%', marginTop: '12px' }}></div>
                      </td>
                    </tr>
                  ))}

                {/* Totals Row */}
                <tr style={{ background: '#f8fafc', borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>
                  <td colSpan="3" style={{ padding: '16px 12px', fontWeight: 'bold', color: '#0f172a', textAlign: 'center' }}>المجموع الكلي:</td>
                  <td style={{ padding: '16px 12px', fontWeight: 'bold', color: '#0f172a', textAlign: 'center' }}>
                    {formatVal(filteredSheetSalaryData.reduce((sum, e) => sum + e.basic, 0), false)}
                  </td>
                  <td style={{ padding: '16px 12px', fontWeight: 'bold', color: '#0f172a', textAlign: 'center' }}>
                    {formatVal(filteredSheetSalaryData.reduce((sum, e) => sum + (e.transportAllowanceAddition || 0), 0), false)}
                  </td>
                  <td style={{ padding: '16px 12px', fontWeight: 'bold', color: '#10b981', textAlign: 'center' }}>
                    {formatVal(filteredSheetSalaryData.reduce((sum, e) => sum + (e.totalBonusAmount || 0), 0), false)}
                  </td>
                  <td style={{ padding: '16px 12px', fontWeight: 'bold', color: '#059669', textAlign: 'center' }}>
                    {formatVal(filteredSheetSalaryData.reduce((sum, e) => sum + e.overtimePay, 0), false)}
                  </td>
                  <td style={{ padding: '16px 12px', fontWeight: 'bold', color: '#e11d48', textAlign: 'center' }}>
                    {formatVal(filteredSheetSalaryData.reduce((sum, e) => sum + e.totalDeductions, 0), false)}
                  </td>
                  <td style={{ padding: '16px 12px', fontWeight: 'bold', color: '#3b82f6', textAlign: 'center' }}>
                    {formatVal(filteredSheetSalaryData.reduce((sum, e) => sum + (e.socialSecurityEmployeeDeduction || 0), 0), false)}
                  </td>
                  <td style={{ padding: '16px 12px', fontWeight: 'bold', color: '#6366f1', textAlign: 'center' }}>
                    {formatVal(filteredSheetSalaryData.reduce((sum, e) => sum + (e.socialSecurityCompanyContribution || 0), 0), false)}
                  </td>
                  <td style={{ padding: '16px 12px', fontWeight: 'bold', color: '#0f172a', textAlign: 'center' }}>
                    {formatVal(filteredSheetSalaryData.reduce((sum, e) => sum + e.netSalary, 0), false)} د.أ
                  </td>
                  <td style={{ padding: '16px 12px' }}></td>
                </tr>
              </tbody>
            </table>

            <div style={{ textAlign: 'center', marginTop: '32px', color: '#94a3b8', fontSize: '0.75rem' }}>
              طبع في: {new Date().toLocaleDateString('en-GB')}
            </div>
          </div>
        )}
        {activeReportTab === 'advances' && (
          <div className="bg-white printable-card print-no-border" style={{
            direction: 'rtl', padding: '40px', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #cbd5e1', paddingBottom: '20px', marginBottom: '32px' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>كشف السلف للموظفين</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '0.875rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} /> {getSelectedMonthLabel()}</span>
                  <span>|</span>
                  <span style={{ color: '#1a8d9b' }}>{selectedDepartment === 'all' ? 'جميع الأقسام' : (departments[selectedDepartment] || selectedDepartment)}</span>
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                {settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" style={{ maxHeight: '48px', objectFit: 'contain', marginBottom: '8px', mixBlendMode: 'multiply' }} />
                ) : (
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1a8d9b', margin: '0 0 4px 0' }}>{settings?.siteName || 'Mr Sleep'}</h2>
                )}
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>تاريخ الإصدار: {new Date().toLocaleDateString('en-GB')}</p>
              </div>
            </div>

            <table style={{ width: '100%', fontSize: '0.875rem', textAlign: 'right', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '12px', color: '#475569', width: '40px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '12px', color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('employeeId')}>الرقم الوظيفي {getSortIcon('employeeId')}</th>
                  <th style={{ padding: '12px', color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('employeeName')}>الموظف {getSortIcon('employeeName')}</th>
                  <th style={{ padding: '12px', color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('date')}>التاريخ {getSortIcon('date')}</th>
                  <th style={{ padding: '12px', color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('amount')}>المبلغ {getSortIcon('amount')}</th>
                  <th style={{ padding: '12px', color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('status')}>الحالة {getSortIcon('status')}</th>
                  <th style={{ padding: '12px', color: '#475569' }}>الملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let flatData = [];
                  const normalizeMonthKey = (value) => {
                    const rawValue = String(value || '').trim();
                    const yearFirst = rawValue.match(/^(\d{4})-(\d{1,2})/);
                    if (yearFirst) return `${yearFirst[1]}-${yearFirst[2].padStart(2, '0')}`;
                    const monthFirst = rawValue.match(/^(\d{1,2})-(\d{4})$/);
                    if (monthFirst) return `${monthFirst[2]}-${monthFirst[1].padStart(2, '0')}`;
                    return '';
                  };
                  const matchesSelectedPeriod = (entry) => {
                    const entryMonth = normalizeMonthKey(entry.month || entry.date);
                    if (archiveDateMode === 'day') {
                      return /^\d{4}-\d{2}-\d{2}$/.test(entry.date || '') && entry.date === archiveSelectedDate;
                    }
                    if (archiveDateMode === 'month') return entryMonth === selectedMonth;
                    if (archiveDateMode === 'range') {
                      const comparableDate = /^\d{4}-\d{2}-\d{2}$/.test(entry.date || '')
                        ? entry.date
                        : (entryMonth ? `${entryMonth}-01` : '');
                      if (!comparableDate) return false;
                      if (archiveDateFrom && comparableDate < archiveDateFrom) return false;
                      if (archiveDateTo && comparableDate > archiveDateTo) return false;
                    }
                    return true;
                  };
                  const filteredEmps = employees.filter(emp => {
                    if (selectedDepartment !== 'all' && emp.department !== (departments[selectedDepartment] || selectedDepartment) && emp.department !== selectedDepartment) return false;
                    if (archiveSearch) {
                      const empName = (emp.name || '').toLowerCase();
                      const empId = (String(emp.id) || '').toLowerCase();
                      const s = archiveSearch.toLowerCase();
                      return empName.includes(s) || String(empId).trim() === String(s).trim();
                    }
                    return true;
                  });
                  filteredEmps.forEach(emp => {
                    advances.filter(a => {
                      if (String(a.employeeId).trim() !== String(emp.id).trim() && String(a.employeeName).trim() !== String(emp.name).trim()) return false;
                      return true;
                    }).forEach(adv => {
                      const installments = Array.isArray(adv.installments) ? adv.installments : [];
                      const entries = installments.length > 0
                        ? installments.map((inst, index) => {
                            const installmentMonth = normalizeMonthKey(inst.month || inst.date || inst.dueDate || inst.paymentDate);
                            const installmentDate = inst.date || inst.dueDate || inst.paymentDate || installmentMonth;
                            return {
                              id: `${adv.id}-installment-${index}`,
                              emp,
                              adv,
                              date: installmentDate,
                              month: installmentMonth,
                              amount: Number(inst.amount) || 0,
                              status: inst.status || adv.status,
                              notes: `قسط شهر ${installmentMonth || inst.month} (من إجمالي ${adv.amount} د.أ)${adv.reason ? ` | ${adv.reason}` : ''}`
                            };
                          })
                        : [{
                            id: adv.id,
                            emp,
                            adv,
                            date: adv.date,
                            month: normalizeMonthKey(adv.date),
                            amount: Number(adv.amount) || 0,
                            status: adv.status,
                            notes: adv.reason || '-'
                          }];

                      entries
                        .filter(matchesSelectedPeriod)
                        .filter(entry => archiveStatus === 'all' || entry.status === archiveStatus)
                        .forEach(entry => flatData.push(entry));
                    });
                  });
                  const sortedData = sortData(flatData, {
                    employeeId: d => d.emp.employeeId || d.emp.id,
                    employeeName: d => d.emp.name,
                    date: d => d.date,
                    amount: d => d.amount,
                    status: d => d.status
                  });
                  if (sortedData.length === 0) {
                    const selectedEmployee = archiveSearch
                      ? employees.find(emp => String(emp.id).trim() === String(archiveSearch).trim())
                      : null;
                    const selectedEmployeeHasAnyAdvance = selectedEmployee
                      ? advances.some(advance =>
                          String(advance.employeeId).trim() === String(selectedEmployee.id).trim()
                          || String(advance.employeeName || '').trim() === String(selectedEmployee.name || '').trim()
                        )
                      : false;
                    const emptyMessage = selectedEmployee
                      ? (selectedEmployeeHasAnyAdvance
                          ? `لا توجد سلف للموظف ${selectedEmployee.name} ضمن الفترة المحددة`
                          : `الموظف ${selectedEmployee.name} لم يأخذ أي سلفة`)
                      : 'لا توجد سلف مطابقة للفلاتر المحددة';
                    return (
                      <tr>
                        <td colSpan="7" style={{ padding: '32px 12px', color: '#94a3b8', textAlign: 'center', fontWeight: 'bold' }}>
                          {emptyMessage}
                        </td>
                      </tr>
                    );
                  }
                  return sortedData.map((d, i) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', color: '#64748b', textAlign: 'center' }}>{i + 1}</td>
                      <td style={{ padding: '12px', color: '#64748b', textAlign: 'center', direction: 'ltr' }}>{d.emp.employeeId || d.emp.id}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a', whiteSpace: 'nowrap' }}>{d.emp.name}</td>
                      <td style={{ padding: '12px', color: '#475569', textAlign: 'center' }}>{d.date}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#64748b', textAlign: 'center' }}>{d.amount} د.أ</td>
                      <td style={{ padding: '12px', color: '#475569', textAlign: 'center' }}>{d.status}</td>
                      <td style={{ padding: '12px', color: '#64748b' }}>{d.notes}</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
          
        )}

        {activeReportTab === 'missing-punches' && (
          <div className="bg-white printable-card print-no-border" style={{
            direction: 'rtl', padding: '40px', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #cbd5e1', paddingBottom: '20px', marginBottom: '32px' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>كشف الختمات الناقصة</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '0.875rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} /> {getSelectedMonthLabel()}</span>
                  <span>|</span>
                  <span style={{ color: '#1a8d9b' }}>{selectedDepartment === 'all' ? 'جميع الأقسام' : (departments[selectedDepartment] || selectedDepartment)}</span>
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                {settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" style={{ maxHeight: '48px', objectFit: 'contain', marginBottom: '8px', mixBlendMode: 'multiply' }} />
                ) : (
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1a8d9b', margin: '0 0 4px 0' }}>{settings?.siteName || 'Mr Sleep'}</h2>
                )}
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>تاريخ الإصدار: {new Date().toLocaleDateString('en-GB')}</p>
              </div>
            </div>

            <table style={{ width: '100%', fontSize: '0.875rem', textAlign: 'right', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '12px', color: '#475569', width: '40px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '12px', color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('employeeId')}>الرقم الوظيفي {getSortIcon('employeeId')}</th>
                  <th style={{ padding: '12px', color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('employeeName')}>الموظف {getSortIcon('employeeName')}</th>
                  <th style={{ padding: '12px', color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('date')}>التاريخ {getSortIcon('date')}</th>
                  <th style={{ padding: '12px', color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('type')}>النوع {getSortIcon('type')}</th>
                  <th style={{ padding: '12px', color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('time')}>الوقت {getSortIcon('time')}</th>
                  <th style={{ padding: '12px', color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('status')}>الحالة {getSortIcon('status')}</th>
                  <th style={{ padding: '12px', color: '#475569' }}>السبب</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const data = missingPunches
                    .filter(p => {
                      if (archiveDateMode === 'day') return p.date === archiveSelectedDate;
                      if (archiveDateMode === 'month') return p.date?.startsWith(selectedMonth);
                      if (archiveDateMode === 'range') {
                        if (archiveDateFrom && archiveDateTo) return p.date >= archiveDateFrom && p.date <= archiveDateTo;
                        if (archiveDateFrom) return p.date >= archiveDateFrom;
                        if (archiveDateTo) return p.date <= archiveDateTo;
                        return true;
                      }
                      return true;
                    })
                  .filter(p => archiveStatus === 'all' ? true : p.status === archiveStatus)
                  .filter(p => {
                    if (!archiveSearch) return true;
                    const empName = (p.employeeName || '').toLowerCase();
                    const empId = (p.employeeId || '').toLowerCase();
                    const s = archiveSearch.toLowerCase();
                    return empName.includes(s) || String(empId).trim() === String(s).trim();
                  })
                  .filter(p => {
                    const emp = employees.find(e => String(e.id || '').trim() === String(p.employeeId || '').trim() || String(e.name || '').trim() === String(p.employeeName || '').trim());
                    if (!emp) return false;
                    if (selectedDepartment === 'all') return true;
                    return emp.department === (departments[selectedDepartment] || selectedDepartment) || emp.department === selectedDepartment;
                  });
                  return sortData(data).map((punch, index) => {
                    const emp = employees.find(e => String(e.id || '').trim() === String(punch.employeeId || '').trim() || String(e.name || '').trim() === String(punch.employeeName || '').trim());
                    return (
                      <tr key={punch.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', color: '#64748b', textAlign: 'center' }}>{index + 1}</td>
                        <td style={{ padding: '12px', color: '#64748b', textAlign: 'center', direction: 'ltr' }}>{punch.employeeId || emp?.employeeId || emp?.id || '-'}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a' }}>{punch.employeeName || emp?.name}</td>
                        <td style={{ padding: '12px', color: '#475569', textAlign: 'center' }}>{punch.date}</td>
                        <td style={{ padding: '12px', color: punch.type === 'دخول' ? '#3b82f6' : '#f97316', textAlign: 'center', fontWeight: 'bold' }}>{punch.type}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a', textAlign: 'center' }} dir="ltr">{punch.time}</td>
                        <td style={{ padding: '12px', color: '#475569', textAlign: 'center' }}>{punch.status}</td>
                        <td style={{ padding: '12px', color: '#64748b' }}>{punch.reason || '-'}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
          
        )}

        {activeReportTab === 'leaves' && (
          <div className="bg-white printable-card print-no-border" style={{
            direction: 'rtl', padding: '40px', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #cbd5e1', paddingBottom: '20px', marginBottom: '32px' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>كشف الإجازات والمغادرات</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '0.875rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} /> {getSelectedMonthLabel()}</span>
                  <span>|</span>
                  <span style={{ color: '#1a8d9b' }}>{selectedDepartment === 'all' ? 'جميع الأقسام' : (departments[selectedDepartment] || selectedDepartment)}</span>
                </div>
              </div>
            </div>

            <table style={{ width: '100%', fontSize: '0.875rem', textAlign: 'right', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '12px', color: '#475569', width: '40px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '12px', color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('employeeId')}>الرقم الوظيفي {getSortIcon('employeeId')}</th>
                  <th style={{ padding: '12px', color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('employeeName')}>الموظف {getSortIcon('employeeName')}</th>
                  <th style={{ padding: '12px', color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('type')}>النوع {getSortIcon('type')}</th>
                  <th style={{ padding: '12px', color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('date')}>التاريخ (من - إلى) {getSortIcon('date')}</th>
                  <th style={{ padding: '12px', color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('status')}>الحالة {getSortIcon('status')}</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const data = leaves
                    .filter(l => l.type !== 'بدل عمل إضافي')
                    .filter(l => archiveFilterType === 'الكل' ? true : l.type === archiveFilterType)
                  .filter(l => {
                    const lDate = l.date || l.startDate;
                    if (!lDate) return false;
                    if (archiveDateMode === 'day') return lDate === archiveSelectedDate;
                    if (archiveDateMode === 'month') return lDate.startsWith(selectedMonth);
                    if (archiveDateMode === 'range') {
                      if (archiveDateFrom && archiveDateTo) return lDate >= archiveDateFrom && lDate <= archiveDateTo;
                      if (archiveDateFrom) return lDate >= archiveDateFrom;
                      if (archiveDateTo) return lDate <= archiveDateTo;
                      return true;
                    }
                    return true;
                  })
                  .filter(l => archiveStatus === 'all' ? true : l.status === archiveStatus)
                  .filter(l => {
                    if (!archiveSearch) return true;
                    const empName = (l.employeeName || '').toLowerCase();
                    const empId = (l.employeeId || '').toLowerCase();
                    const s = archiveSearch.toLowerCase();
                    return empName.includes(s) || String(empId).trim() === String(s).trim();
                  })
                  .filter(l => {
                    const emp = employees.find(e => String(e.id || '').trim() === String(l.employeeId || '').trim() || String(e.name || '').trim() === String(l.employeeName || '').trim());
                    if (!emp) return false;
                    if (selectedDepartment === 'all') return true;
                    return emp.department === (departments[selectedDepartment] || selectedDepartment) || emp.department === selectedDepartment;
                  });
                  return sortData(data, { date: d => d.date || d.startDate }).map((leave, index) => {
                    const emp = employees.find(e => String(e.id || '').trim() === String(leave.employeeId || '').trim() || String(e.name || '').trim() === String(leave.employeeName || '').trim());
                    return (
                      <tr key={leave.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', color: '#64748b', textAlign: 'center' }}>{index + 1}</td>
                        <td style={{ padding: '12px', color: '#64748b', textAlign: 'center', direction: 'ltr' }}>{leave.employeeId || emp?.employeeId || emp?.id || '-'}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a' }}>{leave.employeeName || emp?.name}</td>
                        <td style={{ padding: '12px', color: '#475569', textAlign: 'center' }}>{leave.type}</td>
                        <td style={{ padding: '12px', color: '#475569', textAlign: 'center' }} dir="ltr">
                          {leave.date ? `${leave.date} (${leave.startTime} - ${leave.endTime})` : `${leave.startDate} - ${leave.endDate}`}
                        </td>
                        <td style={{ padding: '12px', color: '#475569', textAlign: 'center' }}>{leave.status}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
          
        )}

        {activeReportTab === 'overtime' && (
          <div className="bg-white printable-card print-no-border" style={{
            direction: 'rtl', padding: '40px', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #cbd5e1', paddingBottom: '20px', marginBottom: '32px' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>كشف العمل الإضافي</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '0.875rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} /> {getSelectedMonthLabel()}</span>
                  <span>|</span>
                  <span style={{ color: '#1a8d9b' }}>{selectedDepartment === 'all' ? 'جميع الأقسام' : (departments[selectedDepartment] || selectedDepartment)}</span>
                </div>
              </div>
            </div>

            <table style={{ width: '100%', fontSize: '0.875rem', textAlign: 'right', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '12px', color: '#475569', width: '40px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '12px', color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('employeeId')}>الرقم الوظيفي {getSortIcon('employeeId')}</th>
                  <th style={{ padding: '12px', color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('employeeName')}>الموظف {getSortIcon('employeeName')}</th>
                  <th style={{ padding: '12px', color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('date')}>التاريخ {getSortIcon('date')}</th>
                  <th style={{ padding: '12px', color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('startTime')}>الوقت {getSortIcon('startTime')}</th>
                  <th style={{ padding: '12px', color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('status')}>الحالة {getSortIcon('status')}</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const data = leaves
                    .filter(l => l.type === 'بدل عمل إضافي')
                  .filter(l => {
                    if (archiveDateMode === 'day') return l.date === archiveSelectedDate;
                    if (archiveDateMode === 'month') return l.date?.startsWith(selectedMonth);
                    if (archiveDateMode === 'range') {
                      if (archiveDateFrom && archiveDateTo) return l.date >= archiveDateFrom && l.date <= archiveDateTo;
                      if (archiveDateFrom) return l.date >= archiveDateFrom;
                      if (archiveDateTo) return l.date <= archiveDateTo;
                      return true;
                    }
                    return true;
                  })
                  .filter(l => archiveStatus === 'all' ? true : l.status === archiveStatus)
                  .filter(l => {
                    if (!archiveSearch) return true;
                    const empName = (l.employeeName || '').toLowerCase();
                    const empId = (l.employeeId || '').toLowerCase();
                    const s = archiveSearch.toLowerCase();
                    return empName.includes(s) || String(empId).trim() === String(s).trim();
                  })
                  .filter(l => {
                    const emp = employees.find(e => String(e.id || '').trim() === String(l.employeeId || '').trim() || String(e.name || '').trim() === String(l.employeeName || '').trim());
                    if (!emp) return false;
                    if (selectedDepartment === 'all') return true;
                    return emp.department === (departments[selectedDepartment] || selectedDepartment) || emp.department === selectedDepartment;
                  });
                  return sortData(data).map((leave, index) => {
                    const emp = employees.find(e => String(e.id || '').trim() === String(leave.employeeId || '').trim() || String(e.name || '').trim() === String(leave.employeeName || '').trim());
                    return (
                      <tr key={leave.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', color: '#64748b', textAlign: 'center' }}>{index + 1}</td>
                        <td style={{ padding: '12px', color: '#64748b', textAlign: 'center', direction: 'ltr' }}>{leave.employeeId || emp?.employeeId || emp?.id || '-'}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a' }}>{leave.employeeName || emp?.name}</td>
                        <td style={{ padding: '12px', color: '#475569', textAlign: 'center' }}>{leave.date}</td>
                        <td style={{ padding: '12px', color: '#475569', textAlign: 'center' }} dir="ltr">{leave.startTime} - {leave.endTime}</td>
                        <td style={{ padding: '12px', color: '#475569', textAlign: 'center' }}>{leave.status}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
          
        )}

        {activeReportTab === 'attendance' && (
          <div className="bg-white printable-card print-no-border" style={{
            direction: 'rtl', padding: '40px', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #cbd5e1', paddingBottom: '20px', marginBottom: '32px' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>سجل الحضور والانصراف (الأرشيف)</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '0.875rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} /> {getSelectedMonthLabel()}</span>
                  <span>|</span>
                  <span style={{ color: '#1a8d9b' }}>{selectedDepartment === 'all' ? 'جميع الأقسام' : (departments[selectedDepartment] || selectedDepartment)}</span>
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                {settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" style={{ maxHeight: '48px', objectFit: 'contain', marginBottom: '8px', mixBlendMode: 'multiply' }} />
                ) : (
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1a8d9b', margin: '0 0 4px 0' }}>{settings?.siteName || 'Mr Sleep'}</h2>
                )}
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>تاريخ الإصدار: {new Date().toLocaleDateString('en-GB')}</p>
              </div>
            </div>

            <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '1100px', fontSize: '0.82rem', textAlign: 'right', borderCollapse: 'collapse', tableLayout: 'auto' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '12px', color: '#475569', width: '40px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '12px', color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('employeeId')}>الرقم الوظيفي {getSortIcon('employeeId')}</th>
                  <th style={{ padding: '12px', color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('employeeName')}>الموظف {getSortIcon('employeeName')}</th>
                  <th style={{ padding: '12px', color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('date')}>التاريخ {getSortIcon('date')}</th>
                  <th style={{ padding: '12px', color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('timeIn')}>وقت الدخول {getSortIcon('timeIn')}</th>
                  <th style={{ padding: '12px', color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('timeOut')}>وقت الخروج {getSortIcon('timeOut')}</th>
                  <th style={{ padding: '12px', color: '#0f766e', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('workedHours')}>ساعات الدوام {getSortIcon('workedHours')}</th>
                  <th style={{ padding: '12px', color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('overtimeHours')}>إضافي {getSortIcon('overtimeHours')}</th>
                  <th style={{ padding: '12px', color: '#475569', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('status')}>الحالة {getSortIcon('status')}</th>
                  <th style={{ padding: '12px', color: '#475569' }}>الملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filteredAtt = attendance.filter(a => {
                    if (archiveDateMode === 'day') return a.date === archiveSelectedDate;
                    if (archiveDateMode === 'month') return a.date?.startsWith(selectedMonth);
                    if (archiveDateMode === 'range') {
                      if (archiveDateFrom && archiveDateTo) return a.date >= archiveDateFrom && a.date <= archiveDateTo;
                      if (archiveDateFrom) return a.date >= archiveDateFrom;
                      if (archiveDateTo) return a.date <= archiveDateTo;
                      return true;
                    }
                    return true;
                  });
                  
                  // Firestore may contain a punch row and separate request/log
                  // rows for the same employee and date. Keep one daily row,
                  // preferring the row that contains actual punch times.
                  const dailyRows = new Map();
                  filteredAtt.forEach(att => {
                    if (!att.date) return;
                    const emp = employees.find(e => String(e.id || '').trim() === String(att.employeeId || '').trim() || String(e.name || '').trim() === String(att.employeeName || '').trim());
                    const employeeKey = String(emp?.id || att.employeeId || att.employeeName || '').trim();
                    if (!employeeKey) return;
                    const key = `${employeeKey}|${att.date}`;
                    const hasIn = parseTimeToMinutes(att.timeIn) !== null;
                    const hasOut = parseTimeToMinutes(att.timeOut) !== null;
                    const score = (hasIn ? 4 : 0) + (hasOut ? 4 : 0) + (att.status ? 2 : 0) + (att.actualHours ? 1 : 0);
                    const existing = dailyRows.get(key);
                    if (!existing || score > existing._score) {
                      dailyRows.set(key, {
                        ...att,
                        employeeId: emp?.id || att.employeeId,
                        employeeName: emp?.name || att.employeeName,
                        status: existing?.status === 'إجازة غير مدفوعة' ? existing.status : att.status,
                        _score: score
                      });
                    } else if (att.status === 'إجازة غير مدفوعة' && existing.status !== 'إجازة غير مدفوعة') {
                      dailyRows.set(key, { ...existing, status: att.status });
                    }
                  });

                  const approvedStatuses = ['موافق', 'موافق عليه', 'مقبول', 'تمت الموافقة', 'تم التسليم'];
                  const departureTypes = ['مغادرة خاصة', 'مغادرة عمل', 'مغادرة الدخان', 'إذن تأخير', 'خروج مبكر'];
                  const departureNotes = new Map();
                  const fullDayLeaveStatus = new Map();
                  const isDateInsideArchiveFilter = date => {
                    if (!date) return false;
                    if (archiveDateMode === 'day') return date === archiveSelectedDate;
                    if (archiveDateMode === 'month') return date.startsWith(selectedMonth);
                    if (archiveDateMode === 'range') {
                      if (archiveDateFrom && date < archiveDateFrom) return false;
                      if (archiveDateTo && date > archiveDateTo) return false;
                    }
                    return true;
                  };
                  leaves.forEach(leave => {
                    if (!approvedStatuses.includes(leave.status)) return;
                    const emp = employees.find(e => String(e.id || '').trim() === String(leave.employeeId || '').trim() || String(e.name || '').trim() === String(leave.employeeName || '').trim());
                    const employeeKey = String(emp?.id || leave.employeeId || leave.employeeName || '').trim();
                    if (!employeeKey) return;

                    const leaveDates = [];
                    if (leave.date) {
                      leaveDates.push(leave.date);
                    } else if (leave.startDate) {
                      const endDate = leave.endDate || leave.startDate;
                      const cursor = new Date(`${leave.startDate}T12:00:00`);
                      const end = new Date(`${endDate}T12:00:00`);
                      while (cursor <= end) {
                        leaveDates.push(cursor.toLocaleDateString('en-CA'));
                        cursor.setDate(cursor.getDate() + 1);
                      }
                    }

                    leaveDates.forEach(leaveDate => {
                      if (!isDateInsideArchiveFilter(leaveDate)) return;
                      const key = `${employeeKey}|${leaveDate}`;
                      if (departureTypes.includes(leave.type)) {
                        const time = leave.startTime && leave.endTime ? ` (${leave.startTime}–${leave.endTime})` : '';
                        const label = `${leave.type}${time}`;
                        const current = departureNotes.get(key) || [];
                        if (!current.includes(label)) departureNotes.set(key, [...current, label]);
                      } else if (String(leave.type || '').startsWith('إجازة')) {
                        fullDayLeaveStatus.set(key, leave.type);
                      }
                    });
                  });

                  // A full-day approved leave must appear even when there is
                  // no punch document for that employee/date.
                  fullDayLeaveStatus.forEach((leaveType, key) => {
                    if (dailyRows.has(key)) return;
                    const separator = key.lastIndexOf('|');
                    const employeeKey = key.slice(0, separator);
                    const leaveDate = key.slice(separator + 1);
                    const emp = employees.find(e => String(e.id || '').trim() === employeeKey || String(e.name || '').trim() === employeeKey);
                    dailyRows.set(key, {
                      employeeId: emp?.id || employeeKey,
                      employeeName: emp?.name || employeeKey,
                      date: leaveDate,
                      timeIn: '',
                      timeOut: '',
                      status: leaveType,
                      _score: 0
                    });
                  });

                  const data = [...dailyRows.entries()].map(([key, row]) => ({
                    ...row,
                    status: fullDayLeaveStatus.get(key) || row.status,
                    reportNotes: fullDayLeaveStatus.get(key) || (departureNotes.get(key) || []).join('، ') || '-'
                  })).filter(a => {
                    if (!archiveSearch) return true;
                    const empName = (a.employeeName || '').toLowerCase();
                    const empId = (a.employeeId || '').toLowerCase();
                    const s = archiveSearch.toLowerCase();
                    return empName.includes(s) || String(empId).trim() === String(s).trim();
                  })
                  .filter(a => {
                    const emp = employees.find(e => String(e.id).trim() === String(a.employeeId).trim() || String(e.name).trim() === String(a.employeeName).trim());
                    if (!emp) return false;
                    if (selectedDepartment === 'all') return true;
                    return emp.department === (departments[selectedDepartment] || selectedDepartment) || emp.department === selectedDepartment;
                  });
                  const orderedData = sortConfig.key
                    ? sortData(data)
                    : [...data].sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.employeeName || '').localeCompare(String(b.employeeName || ''), 'ar'));
                  return orderedData.map((att, index) => {
                    const emp = employees.find(e => String(e.id).trim() === String(att.employeeId || '').trim() || String(e.name).trim() === String(att.employeeName || '').trim());
                    const dailyHours = getDailyWorkedHours(att);
                    return (
                      <tr key={`${att.employeeId || att.employeeName}-${att.date}`} style={{ borderBottom: '1px solid #e2e8f0', background: index % 2 === 0 ? '#ffffff' : '#f8fafc', verticalAlign: 'middle' }}>
                        <td style={{ padding: '12px', color: '#64748b', textAlign: 'center' }}>{index + 1}</td>
                        <td style={{ padding: '12px', color: '#64748b', textAlign: 'center', direction: 'ltr' }}>{att.employeeId || emp?.employeeId || emp?.id || '-'}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a', whiteSpace: 'nowrap', minWidth: '190px' }}>{att.employeeName || emp?.name}</td>
                        <td style={{ padding: '12px', color: '#475569', textAlign: 'center', whiteSpace: 'nowrap' }} dir="ltr">{att.date}</td>
                        <td style={{ padding: '12px', color: '#475569', textAlign: 'center', fontWeight: 'bold' }} dir="ltr">{(att.timeIn || '').trim() || '-'}</td>
                        <td style={{ padding: '12px', color: '#475569', textAlign: 'center', fontWeight: 'bold' }} dir="ltr">{(att.timeOut || '').trim() || '-'}</td>
                        <td style={{ padding: '12px', color: dailyHours !== '-' ? '#0f766e' : '#94a3b8', textAlign: 'center', fontWeight: 'bold' }}>{dailyHours !== '-' ? `${dailyHours} ساعة` : '-'}</td>
                        <td style={{ padding: '12px', color: '#475569', textAlign: 'center' }}>{att.overtimeHours ? `${att.overtimeHours} ساعة` : '-'}</td>
                        <td style={{ padding: '12px', color: '#475569', textAlign: 'center' }}>{att.status}</td>
                        <td style={{ padding: '12px', color: '#64748b', minWidth: '230px', lineHeight: 1.7 }}>{att.reportNotes}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
            </div>
          </div>
          
        )}

        {activeReportTab === 'employees' && (
          <>
            <div className="no-print mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-700 mb-3 text-sm">تخصيص أعمدة التقرير:</h3>
              <div className="premium-checkbox-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
                {(() => {
                  const labelMap = {
                    id: 'الرقم الوظيفي', name: 'اسم الموظف', department: 'القسم الوظيفي', jobTitle: 'المسمى الوظيفي', joinDate: 'تاريخ التعيين', annualRaiseDate: 'موعد الزيادة السنوية', basicSalary: 'الراتب الأساسي', transportation: 'بدل مواصلات', phone: 'رقم الهاتف', directManager: 'المدير المباشر', annualLeaveBalance: 'رصيد الإجازات السنوي', sickLeaveBalance: 'رصيد الإجازات المرضي', socialSecurity: 'الضمان الاجتماعي', shiftPeriod: 'فترة الدوام', status: 'الحالة'
                  };
                  return Object.keys(labelMap).map(key => (
                    <label key={key} className="premium-checkbox-item hover:border-primary/40 hover:bg-slate-100/50 hover:shadow-sm" style={{ flexDirection: 'row', justifyContent: 'flex-start', height: '48px', textAlign: 'right', gap: '8px', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px 12px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', transition: 'all 0.2s', color: '#1e293b' }}>
                      <input 
                        type="checkbox" 
                        checked={employeeReportFields[key]} 
                        onChange={(e) => setEmployeeReportFields(prev => ({ ...prev, [key]: e.target.checked }))} 
                        className="cursor-pointer"
                        style={{ width: '18px', height: '18px', accentColor: '#1e293b' }} 
                      />
                      <span style={{ fontSize: '0.8rem', lineHeight: '1.2', fontWeight: '600' }}>{labelMap[key]}</span>
                    </label>
                  ));
                })()}
              </div>
            </div>
          <div className="bg-white printable-card print-no-border" style={{
            direction: 'rtl', padding: '40px', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
          }}>
            

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #cbd5e1', paddingBottom: '20px', marginBottom: '32px' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>تقرير كشف الموظفين</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '0.875rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} /> {new Date().toLocaleDateString('en-GB')}</span>
                  <span>|</span>
                  <span style={{ color: '#1a8d9b' }}>{selectedDepartment === 'all' ? 'جميع الأقسام' : (departments[selectedDepartment] || selectedDepartment)}</span>
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                {settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" style={{ maxHeight: '48px', objectFit: 'contain', marginBottom: '8px', mixBlendMode: 'multiply' }} />
                ) : (
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#1a8d9b', margin: 0, letterSpacing: '-0.5px' }}>{settings?.siteName || 'M I R J A S'}</h2>
                )}
                <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>تقرير الموظفين الشامل</p>
              </div>
            </div>

            <table style={{ width: '100%', fontSize: '0.875rem', textAlign: 'right', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontWeight: 'bold' }}>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1' }}>#</th>
                  {employeeReportFields.id && <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('id')}>الرقم الوظيفي {getSortIcon('id')}</th>}
                  {employeeReportFields.name && <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('name')}>اسم الموظف {getSortIcon('name')}</th>}
                  {employeeReportFields.department && <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('department')}>القسم {getSortIcon('department')}</th>}
                  {employeeReportFields.jobTitle && <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('jobTitle')}>المسمى الوظيفي {getSortIcon('jobTitle')}</th>}
                  {employeeReportFields.joinDate && <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('joinDate')}>تاريخ التعيين {getSortIcon('joinDate')}</th>}
                  {employeeReportFields.annualRaiseDate && <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('annualRaiseDate')}>موعد الزيادة السنوية {getSortIcon('annualRaiseDate')}</th>}
                  {employeeReportFields.basicSalary && <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('basicSalary')}>الراتب الأساسي {getSortIcon('basicSalary')}</th>}
                  {employeeReportFields.transportationAllowance && <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('transportationAllowance')}>بدل مواصلات {getSortIcon('transportationAllowance')}</th>}
                  {employeeReportFields.phone && <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('phone')}>رقم الهاتف {getSortIcon('phone')}</th>}
                  {employeeReportFields.directManager && <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('directManager')}>المدير المباشر {getSortIcon('directManager')}</th>}
                  {employeeReportFields.annualLeaveBalance && <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('vacationBalance')}>الرصيد السنوي {getSortIcon('vacationBalance')}</th>}
                  {employeeReportFields.sickLeaveBalance && <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('sickLeaveBalance')}>الرصيد المرضي {getSortIcon('sickLeaveBalance')}</th>}
                  {employeeReportFields.socialSecurity && <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('hasSocialSecurity')}>الضمان الاجتماعي {getSortIcon('hasSocialSecurity')}</th>}
                  {employeeReportFields.shiftPeriod && <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('shiftStart')}>فترة الدوام {getSortIcon('shiftStart')}</th>}
                  {employeeReportFields.status && <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('status')}>الحالة {getSortIcon('status')}</th>}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const data = employees.filter(emp => selectedDepartment === 'all' || emp.department === selectedDepartment);
                  return sortData(data, { id: e => e.employeeId || e.id }).map((emp, index) => (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '12px', color: '#64748b' }}>{index + 1}</td>
                      {employeeReportFields.id && <td style={{ padding: '12px', fontWeight: '500', direction: 'ltr', textAlign: 'right' }}>{emp.employeeId || emp.id}</td>}
                      {employeeReportFields.name && <td style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a' }}>{emp.name}</td>}
                      {employeeReportFields.department && <td style={{ padding: '12px' }}>{departments[emp.department] || emp.department}</td>}
                      {employeeReportFields.jobTitle && <td style={{ padding: '12px' }}>{emp.jobTitle}</td>}
                      {employeeReportFields.joinDate && <td style={{ padding: '12px' }}>{emp.joinDate}</td>}
                      {employeeReportFields.annualRaiseDate && <td style={{ padding: '12px', textAlign: 'center', color: '#0f766e', fontWeight: 'bold' }}>{emp.annualRaiseDate || getNextAnnualRaiseDate(emp.joinDate)}</td>}
                      {employeeReportFields.basicSalary && <td style={{ padding: '12px', fontWeight: 'bold', textAlign: 'center' }}>{Number(emp.basicSalary || 0).toLocaleString()}</td>}
                      {employeeReportFields.transportationAllowance && <td style={{ padding: '12px', fontWeight: 'bold' }}>{Number(emp.transportationAllowance || 0).toLocaleString()}</td>}
                      {employeeReportFields.phone && <td style={{ padding: '12px', direction: 'ltr', textAlign: 'right' }}>{emp.phone}</td>}
                      {employeeReportFields.directManager && <td style={{ padding: '12px' }}>{emp.directManager || '-'}</td>}
                      {employeeReportFields.annualLeaveBalance && <td style={{ padding: '12px', fontWeight: 'bold', textAlign: 'center' }}>{emp.vacationBalance ?? 14}</td>}
                      {employeeReportFields.sickLeaveBalance && <td style={{ padding: '12px', fontWeight: 'bold', textAlign: 'center' }}>{emp.sickLeaveBalance ?? 14}</td>}
                      {employeeReportFields.socialSecurity && <td style={{ padding: '12px', textAlign: 'center' }}>{emp.hasSocialSecurity ? 'نعم' : 'لا'}</td>}
                      {employeeReportFields.shiftPeriod && <td style={{ padding: '12px', direction: 'ltr', textAlign: 'center' }}>{emp.shiftStart && emp.shiftEnd ? `${emp.shiftStart} - ${emp.shiftEnd}` : '-'}</td>}
                      {employeeReportFields.status && <td style={{ padding: '12px' }}>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${emp.status === 'نشط' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {emp.status || 'نشط'}
                        </span>
                      </td>}
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
          </>
        )}

        {activeReportTab === 'violations-bonuses' && (
          <div className="bg-white printable-card print-no-border" style={{
            direction: 'rtl', padding: '40px', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #cbd5e1', paddingBottom: '20px', marginBottom: '32px' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>كشف المخالفات والمكافآت</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '0.875rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} /> {(archiveDateFrom || archiveDateTo) ? `تاريخ: ${archiveDateFrom} - ${archiveDateTo}` : `دورة الرواتب: ${getSelectedMonthLabel()}`}</span>
                  <span>|</span>
                  <span style={{ color: '#1a8d9b' }}>{selectedDepartment === 'all' ? 'جميع الأقسام' : (departments[selectedDepartment] || selectedDepartment)}</span>
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                {settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" style={{ maxHeight: '48px', objectFit: 'contain', marginBottom: '8px', mixBlendMode: 'multiply' }} />
                ) : (
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#1a8d9b', margin: 0, letterSpacing: '-0.5px' }}>{settings?.siteName || 'M I R J A S'}</h2>
                )}
                <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>الموارد البشرية - سجل المخالفات والمكافآت</p>
              </div>
            </div>

            <table style={{ width: '100%', fontSize: '0.875rem', textAlign: 'right', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontWeight: 'bold' }}>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1' }}>#</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('employeeId')}>الرقم الوظيفي {getSortIcon('employeeId')}</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('employeeName')}>اسم الموظف {getSortIcon('employeeName')}</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('date')}>التاريخ {getSortIcon('date')}</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('recordType')}>التصنيف {getSortIcon('recordType')}</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('type')}>النوع {getSortIcon('type')}</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('value')}>القيمة (د.أ) {getSortIcon('value')}</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1' }}>الملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const data = [
                    ...violations.map(v => ({ ...v, recordType: 'مخالفة', value: v.deductionAmount })),
                  ...bonuses.map(b => ({ ...b, recordType: 'مكافأة', value: b.amount }))
                ]
                  .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
                  .filter(item => {
                    const d = item.date || item.createdAt?.split('T')[0];
                    if (!d) return false;
                    if (archiveDateMode === 'day') return d === archiveSelectedDate;
                    if (archiveDateMode === 'month') return d.startsWith(selectedMonth);
                    if (archiveDateMode === 'range') {
                      if (archiveDateFrom && archiveDateTo) return d >= archiveDateFrom && d <= archiveDateTo;
                      if (archiveDateFrom) return d >= archiveDateFrom;
                      if (archiveDateTo) return d <= archiveDateTo;
                      return true;
                    }
                    return true;
                  })
                  .filter(item => archiveStatus === 'all' || item.recordType === archiveStatus)
                  .filter(item => {
                    const empName = (item.employeeName || '').toLowerCase();
                    const empId = (item.employeeId || '').toLowerCase();
                    const s = archiveSearch.toLowerCase();
                    return empName.includes(s) || String(empId).trim() === String(s).trim();
                  })
                  .filter(item => {
                    const emp = employees.find(e => String(e.id || '').trim() === String(item.employeeId || '').trim() || String(e.name || '').trim() === String(item.employeeName || '').trim());
                    if (!emp) return false;
                    if (selectedDepartment === 'all') return true;
                    return emp.department === (departments[selectedDepartment] || selectedDepartment) || emp.department === selectedDepartment;
                  });
                  return sortData(data).map((item, index) => {
                    const emp = employees.find(e => String(e.id || '').trim() === String(item.employeeId || '').trim() || String(e.name || '').trim() === String(item.employeeName || '').trim());
                    const isViolation = item.recordType === 'مخالفة';
                    return (
                      <tr key={item.id || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', color: '#64748b', textAlign: 'center' }}>{index + 1}</td>
                        <td style={{ padding: '12px', color: '#64748b', textAlign: 'center', direction: 'ltr' }}>{item.employeeId || emp?.employeeId || emp?.id || '-'}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a' }}>{item.employeeName || emp?.name}</td>
                        <td style={{ padding: '12px', color: '#475569' }}>{item.date}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: isViolation ? '#dc2626' : '#10b981' }}>{item.recordType}</td>
                        <td style={{ padding: '12px', color: '#475569' }}>{item.type}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: isViolation ? '#dc2626' : '#10b981' }} dir="ltr">{item.value || 0} د.أ</td>
                        <td style={{ padding: '12px', color: '#64748b' }}>{item.notes || item.reason || '-'}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
          
        )}

        {activeReportTab === 'assets' && (
          <div className="bg-white printable-card print-no-border" style={{
            direction: 'rtl', padding: '40px', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #cbd5e1', paddingBottom: '20px', marginBottom: '32px' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>كشف العهد والأصول المسلمة</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '0.875rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} /> {(archiveDateFrom || archiveDateTo) ? `تاريخ: ${archiveDateFrom} - ${archiveDateTo}` : 'جميع التواريخ'}</span>
                  <span>|</span>
                  <span style={{ color: '#1a8d9b' }}>{selectedDepartment === 'all' ? 'جميع الأقسام' : (departments[selectedDepartment] || selectedDepartment)}</span>
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                {settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" style={{ maxHeight: '48px', objectFit: 'contain', marginBottom: '8px', mixBlendMode: 'multiply' }} />
                ) : (
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#1a8d9b', margin: 0, letterSpacing: '-0.5px' }}>{settings?.siteName || 'M I R J A S'}</h2>
                )}
                <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>تقرير العهد - قسم الموارد البشرية</p>
              </div>
            </div>

            <table style={{ width: '100%', fontSize: '0.875rem', textAlign: 'right', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontWeight: 'bold' }}>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('assetNumber')}>رقم العهدة {getSortIcon('assetNumber')}</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('employeeId')}>الرقم الوظيفي {getSortIcon('employeeId')}</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('employeeName')}>اسم الموظف {getSortIcon('employeeName')}</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('name')}>اسم العهدة {getSortIcon('name')}</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('handoverDate')}>تاريخ التسليم {getSortIcon('handoverDate')}</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('nextInspectionDate')}>تاريخ الفحص القادم {getSortIcon('nextInspectionDate')}</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('status')}>الحالة {getSortIcon('status')}</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('quantity')}>عدد الأصناف {getSortIcon('quantity')}</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', textAlign: 'center', whiteSpace: 'nowrap' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const data = assets
                    .filter(item => {
                      if (archiveDateFrom && archiveDateTo) return item.handoverDate >= archiveDateFrom && item.handoverDate <= archiveDateTo;
                      if (archiveDateFrom) return item.handoverDate >= archiveDateFrom;
                      if (archiveDateTo) return item.handoverDate <= archiveDateTo;
                      return true;
                    })
                  .filter(item => archiveStatus === 'all' || item.status === archiveStatus)
                  .filter(item => {
                    const empName = (item.employeeName || '').toLowerCase();
                    const empId = (item.employeeId || '').toLowerCase();
                    const s = archiveSearch.toLowerCase();
                    return empName.includes(s) || empId.includes(s) || (item.name || '').toLowerCase().includes(s) || (item.assetNumber || '').toLowerCase().includes(s);
                  })
                  .filter(item => {
                    if (assetCategoryFilter !== 'all' && item.category !== assetCategoryFilter) return false;
                    const emp = employees.find(e => String(e.id || '').trim() === String(item.employeeId || '').trim() || String(e.name || '').trim() === String(item.employeeName || '').trim());
                    if (!emp) return false;
                    if (assetJobTitleFilter !== 'all' && emp.jobTitle !== assetJobTitleFilter) return false;
                    if (selectedDepartment !== 'all' && emp.department !== (departments[selectedDepartment] || selectedDepartment) && emp.department !== selectedDepartment) return false;
                    return true;
                  });
                  return sortData(data).map((item, index) => {
                    const emp = employees.find(e => String(e.id || '').trim() === String(item.employeeId || '').trim() || String(e.name || '').trim() === String(item.employeeName || '').trim());
                    return (
                      <tr key={item.id || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', color: '#475569', fontWeight: 'bold' }}>{item.assetNumber}</td>
                        <td style={{ padding: '12px', color: '#64748b', textAlign: 'center', direction: 'ltr' }}>{item.employeeId || emp?.employeeId || emp?.id || '-'}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a' }}>{item.employeeName || emp?.name}</td>
                        <td style={{ padding: '12px', color: '#475569' }}>{item.name}</td>
                        <td style={{ padding: '12px', color: '#475569' }}>{item.handoverDate}</td>
                        <td style={{ padding: '12px', color: '#475569' }}>{item.nextInspectionDate || '-'}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: item.status === 'نشطة' ? '#10b981' : item.status === 'تالفة' || item.status === 'مفقودة' ? '#dc2626' : '#f59e0b' }}>{item.status}</td>
                        <td style={{ padding: '12px', color: '#475569', textAlign: 'center' }}>{item.items?.length || 0}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button 
                             onClick={() => handleExportAsset(item)} 
                             title="طباعة / تصدير العهدة"
                             style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', padding: '4px', backgroundColor: '#e0e7ff', borderRadius: '6px' }}
                          >
                             <Printer size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
          
        )}

        {activeReportTab === 'petitions' && (
          <div className="bg-white printable-card print-no-border" style={{
            direction: 'rtl', padding: '40px', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #cbd5e1', paddingBottom: '20px', marginBottom: '32px' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>سجل الاستدعاءات والطلبات</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '0.875rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} /> {(archiveDateFrom || archiveDateTo) ? `تاريخ: ${archiveDateFrom} - ${archiveDateTo}` : 'جميع التواريخ'}</span>
                  <span>|</span>
                  <span style={{ color: '#1a8d9b' }}>{selectedDepartment === 'all' ? 'جميع الأقسام' : (departments[selectedDepartment] || selectedDepartment)}</span>
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                {settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" style={{ maxHeight: '48px', objectFit: 'contain', marginBottom: '8px', mixBlendMode: 'multiply' }} />
                ) : (
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#1a8d9b', margin: 0, letterSpacing: '-0.5px' }}>{settings?.siteName || 'M I R J A S'}</h2>
                )}
                <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>تقرير الموارد البشرية - الاستدعاءات</p>
              </div>
            </div>

            <table style={{ width: '100%', fontSize: '0.875rem', textAlign: 'right', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontWeight: 'bold' }}>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', textAlign: 'center', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('employeeId')}>الرقم الوظيفي {getSortIcon('employeeId')}</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('employeeName')}>اسم الموظف {getSortIcon('employeeName')}</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('date')}>تاريخ التقديم {getSortIcon('date')}</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('type')}>نوع الطلب {getSortIcon('type')}</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1' }}>التفاصيل</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleSort('status')}>الحالة {getSortIcon('status')}</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const data = petitions
                    .filter(item => {
                      const d = item.date || item.createdAt?.split('T')[0];
                      if (!d) return false;
                      if (archiveDateMode === 'day') return d === archiveSelectedDate;
                      if (archiveDateMode === 'month') return d.startsWith(selectedMonth);
                      if (archiveDateMode === 'range') {
                        if (archiveDateFrom && archiveDateTo) return d >= archiveDateFrom && d <= archiveDateTo;
                        if (archiveDateFrom) return d >= archiveDateFrom;
                        if (archiveDateTo) return d <= archiveDateTo;
                        return true;
                      }
                      return true;
                    })
                  .filter(item => archiveStatus === 'all' || item.status === archiveStatus)
                  .filter(item => {
                    const empName = (item.employeeName || '').toLowerCase();
                    const empId = (item.employeeId || '').toLowerCase();
                    const s = archiveSearch.toLowerCase();
                    return empName.includes(s) || String(empId).trim() === String(s).trim();
                  })
                  .filter(item => {
                    const emp = employees.find(e => String(e.id || '').trim() === String(item.employeeId || '').trim() || String(e.name || '').trim() === String(item.employeeName || '').trim());
                    if (!emp) return false;
                    if (selectedDepartment === 'all') return true;
                    return emp.department === (departments[selectedDepartment] || selectedDepartment) || emp.department === selectedDepartment;
                  });
                  return sortData(data).map((item, index) => {
                    const emp = employees.find(e => String(e.id || '').trim() === String(item.employeeId || '').trim() || String(e.name || '').trim() === String(item.employeeName || '').trim());
                    return (
                      <tr key={item.id || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', color: '#64748b', textAlign: 'center', direction: 'ltr' }}>{item.employeeId || emp?.employeeId || emp?.id || '-'}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a' }}>{item.employeeName || emp?.name}</td>
                        <td style={{ padding: '12px', color: '#475569' }}>{item.date || item.createdAt?.split('T')[0] || '-'}</td>
                        <td style={{ padding: '12px', color: '#475569' }}>{item.type || item.category || 'استدعاء'}</td>
                        <td style={{ padding: '12px', color: '#64748b' }}>{item.details || item.reason || '-'}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: item.status === 'موافق عليه' ? '#10b981' : item.status === 'مرفوض' ? '#dc2626' : '#f59e0b' }}>{item.status || 'قيد المراجعة'}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

};

export default HRSalaryReports;
