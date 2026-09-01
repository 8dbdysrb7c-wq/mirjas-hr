/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { getEmployees, getSupervisorReports, saveSupervisorReport, deleteSupervisorReport, addLog, isAdmin, getSalesOrders, saveSalesOrder, getGlobalSettings, getMissions, saveMission, getOrders, saveOrder, getTasksData, getProductionLogs, saveProductionLog, deleteProductionLog, getReports, getReportsByDateRange, saveReport, getAttendanceLogs, createNotification, getPreparationOrders } from '../../store';
import { getHRAttendance, getHRLeaves } from '../../services/hr';
import { hasPermission } from '../../utils/permissions';
import { FileText, Check, Calendar, Plus, Trash2, Save, UserCheck, Clock, CheckCircle2, AlertTriangle, Eye, X, Package, MessageSquare, Truck, ChevronDown, ChevronUp, ClipboardList, Building2, Settings, Target, TrendingUp, Edit, CheckCircle, RotateCcw, ArrowUpDown, Filter, Shield, Smartphone, LogIn, LogOut } from 'lucide-react';
import Swal from 'sweetalert2';
import { sendWhatsAppNotification, sendTemplatedWhatsAppNotification } from '../../utils/whatsappService';
import { triggerWhatsAppRouting } from '../../services/whatsappRouter';
import withReactContent from 'sweetalert2-react-content';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';

const MySwal = withReactContent(Swal);

const getLocalDateStr = (d) => {
  if (!d) return '';
  const pad = (n) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const normalizeEmpId = (id) => String(id || '').toUpperCase().replace(/^EMP-0*/i, '').trim();

const normalizeArabic = (str) => {
  return String(str || '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
};

const matchAttendance = (att, empId, empName, date) => {
  if (!att || String(att.date).trim() !== String(date).trim()) return false;
  if (att.isLeave) return false;

  const normAttId = normalizeEmpId(att.employeeId || att.id);
  const normTargetId = normalizeEmpId(empId);
  const matchId = normAttId && normTargetId && normAttId === normTargetId;

  const normAttName = normalizeArabic(att.employeeName || att.name);
  const normTargetName = normalizeArabic(empName);
  const matchName = normAttName && normTargetName && normAttName === normTargetName;

  return matchId || matchName;
};

class TableErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("Caught by TableErrorBoundary:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginTop: '20px', direction: 'ltr' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>Crash Caught!</h2>
          <p style={{ fontWeight: 'bold' }}>{this.state.error && this.state.error.toString()}</p>
          <pre style={{ fontSize: '12px', marginTop: '10px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const MonthPicker = ({ selectedMonth, setSelectedMonth }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  useEffect(() => {
    const closeDropdown = (e) => {
      if (isOpen && !e.target.closest('.month-picker-container')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', closeDropdown);
    return () => document.removeEventListener('mousedown', closeDropdown);
  }, [isOpen]);

  const getLabel = () => {
    if (!selectedMonth) return '';
    const [year, month] = selectedMonth.split('-');
    return `${arabicMonths[parseInt(month, 10) - 1]} ${year}`;
  };

  return (
    <div className="shrink-0 month-picker-container" style={{ position: 'relative' }}>
      <div
        onClick={() => {
          if (selectedMonth) {
            const [year] = selectedMonth.split('-');
            setPickerYear(parseInt(year));
          }
          setIsOpen(!isOpen);
        }}
        className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg px-4 py-2 shadow-sm hover:border-sky-300 hover:shadow-md transition-all cursor-pointer min-w-[150px] h-[40px]"
      >
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-sky-500" />
          <span className="font-bold text-slate-700 whitespace-nowrap text-[14px]">
            {getLabel()}
          </span>
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-sky-500' : ''}`} />
      </div>

      {isOpen && (
        <div
          className="month-picker-popup"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: '0',
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
              type="button"
              onClick={(e) => { e.stopPropagation(); setPickerYear(prev => prev + 1); }}
              disabled={pickerYear >= currentYear}
              className={`p-1.5 rounded-full transition-colors ${pickerYear >= currentYear ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'}`}
              title="السنة القادمة"
            >
              <ChevronUp size={18} />
            </button>
            <span className="font-bold text-lg text-slate-800">{pickerYear}</span>
            <button
              type="button"
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

              return (
                <button
                  key={m}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMonth(monthVal);
                    setIsOpen(false);
                  }}
                  className={`py-2.5 px-2 text-xs font-bold rounded-xl transition-all duration-200 ${isSelected
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20 scale-105'
                      : isCurrentMonth
                        ? 'bg-sky-50 text-sky-600 border border-sky-200'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const AdminSupervisorReports = ({ user }) => {
  // An employer is ONLY the system owner (Anas/Mashhour/Admin)
  const isEmployer = user.id === 'admin' || String(user.name).includes('مشهور') || String(user.name).includes('انس') || String(user.name).includes('أنس') || user.name === 'المدير العام';
  const isSuperAdmin = isEmployer;

  const [activeTab, setActiveTab] = useState(isSuperAdmin ? 'history' : 'add');
  const [isEditMode, setIsEditMode] = useState(false);

  const [date, setDate] = useState(getLocalDateStr(new Date()));
  const [timeIn, setTimeIn] = useState('');
  const [timeOut, setTimeOut] = useState('');
  const [attendanceNotes, setAttendanceNotes] = useState('');

  const [employeeEvaluations, setEmployeeEvaluations] = useState({});
  const [savedItems, setSavedItems] = useState({});
  const [expandedEmployees, setExpandedEmployees] = useState({});

  const [employees, setEmployees] = useState([]);
  const [reports, setReports] = useState([]);
  const [employeeReports, setEmployeeReports] = useState([]);
  const [allEmployeeReports, setAllEmployeeReports] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [orders, setOrders] = useState([]);
  const [globalSettings, setGlobalSettings] = useState({});
  const [currentUserPerms, setCurrentUserPerms] = useState({ attendance: true, smoking: true, absences: true, evaluations: true, orders: true });

  const [dateMode, setDateMode] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [selectedDate, setSelectedDate] = useState(getLocalDateStr(new Date()));
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterSupervisor, setFilterSupervisor] = useState('');
  const [filterAttendance, setFilterAttendance] = useState('');
  const [filterStatus, setFilterStatus] = useState('قيد المراجعة');
  const [showFilters, setShowFilters] = useState(false);

  const supervisorsList = React.useMemo(() => {
    if (!reports) return [];
    return [...new Set(reports.map(r => r.supervisorName).filter(Boolean))];
  }, [reports]);

  const fetchOrders = async () => {
    const salesOrdersData = await getSalesOrders();
    const productionOrdersData = await getOrders();
    const preparationOrdersData = await getPreparationOrders();
    const missionsData = await getMissions();

    const excludedOrderStatuses = ['منتهي', 'تم التسليم', 'تم التوصيل', 'تم التسليم للتوصيل', 'ملغي', 'جاهز'];
    const excludedMissionStatuses = ['تم الإنجاز', 'ملغي'];

    const activeSalesOrders = salesOrdersData.filter(o => !excludedOrderStatuses.includes(o.status) && !excludedOrderStatuses.includes(o.executionStatus)).map(o => ({ ...o, isSales: true, currentDepartment: 'الطلبيات' }));

    const activeProductionOrders = productionOrdersData.filter(o => !excludedOrderStatuses.includes(o.status) && !excludedOrderStatuses.includes(o.executionStatus)).map(o => ({ ...o, isProduction: true, currentDepartment: 'الإنتاج' }));

    const activePreparationOrders = preparationOrdersData.filter(o => !excludedOrderStatuses.includes(o.status) && !excludedOrderStatuses.includes(o.executionStatus)).map(o => ({ ...o, isPreparation: true, currentDepartment: 'التحضير' }));

    const activeMissions = missionsData.filter(m => !excludedMissionStatuses.includes(m.status));

    const normalizedMissions = activeMissions.map(m => ({
      ...m,
      isMission: true,
      orderNumber: 'توصيل',
      customerName: m.targetEntity || m.type,
      currentDepartment: 'التوصيل',
      executionStatus: m.status
    }));

    setOrders([...activeSalesOrders, ...activeProductionOrders, ...activePreparationOrders, ...normalizedMissions].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
  };

  useEffect(() => {
    const fetchData = async () => {
      const [emps, reps, salesOrdersData, settings, missionsData, productionOrdersData, preparationOrdersData, empReports, attLogs] = await Promise.all([
        getEmployees(),
        getSupervisorReports(),
        getSalesOrders(),
        getGlobalSettings(),
        getMissions(),
        getOrders(),
        getPreparationOrders(),
        getReports(),
        getAttendanceLogs()
      ]);
      const currentUserId = String(user.id).trim();
      const cUser = emps.find(e => String(e.id).trim() === currentUserId);

      let filteredEmps = emps;

      if (isSuperAdmin) {
        // Admin sees everyone except top admins
        filteredEmps = emps.filter(e => String(e.id).trim() !== 'admin' && e.role !== 'admin' && e.level !== 'admin' && e.level !== 'إدارة');
      } else {
        // Supervisor sees only assigned employees
        if (cUser && cUser.assignedEmployees && cUser.assignedEmployees.length > 0) {
          const assignedIds = cUser.assignedEmployees.map(id => String(id).trim());
          filteredEmps = emps.filter(e => assignedIds.includes(String(e.id).trim()));
        } else {
          // If no assigned employees, show all normal employees
          filteredEmps = emps.filter(e => e.role !== 'admin' && e.level !== 'admin' && e.level !== 'إدارة' && e.level !== 'supervisor' && e.level !== 'مشرف' && String(e.id).trim() !== currentUserId);
        }
      }

      setEmployees(filteredEmps);
      setReports(reps);
      setAllEmployeeReports(empReports);
      setAttendanceLogs(attLogs || []);

      // Only show suspended/pending orders in the tracking board (which means active and not finished/canceled)
      const excludedOrderStatuses = ['منتهي', 'تم التسليم', 'تم التوصيل', 'تم التسليم للتوصيل', 'ملغي', 'جاهز'];
      const excludedMissionStatuses = ['تم الإنجاز', 'ملغي'];

      const activeSalesOrders = salesOrdersData.filter(o => !excludedOrderStatuses.includes(o.status) && !excludedOrderStatuses.includes(o.executionStatus)).map(o => ({ ...o, isSales: true, currentDepartment: 'إدارة الطلبات' }));

      const activeProductionOrders = productionOrdersData.filter(o => !excludedOrderStatuses.includes(o.status) && !excludedOrderStatuses.includes(o.executionStatus)).map(o => ({ ...o, isProduction: true, currentDepartment: 'إنتاج قيد الخياطة' }));

      const activePreparationOrders = preparationOrdersData.filter(o => !excludedOrderStatuses.includes(o.status) && !excludedOrderStatuses.includes(o.executionStatus)).map(o => ({ ...o, isPreparation: true, currentDepartment: 'إنتاج قيد التحضير' }));

      const activeMissions = missionsData.filter(m => !excludedMissionStatuses.includes(m.status));

      const normalizedMissions = activeMissions.map(m => ({
        ...m,
        isMission: true,
        orderNumber: 'توصيل',
        customerName: m.targetEntity || m.type,
        currentDepartment: 'مهمة توصيل',
        executionStatus: m.status
      }));

      let finalSalesOrders = activeSalesOrders;
      let finalProductionOrders = activeProductionOrders;
      let finalPreparationOrders = activePreparationOrders;
      let finalMissions = normalizedMissions;

      if (!isSuperAdmin) {
        if (!hasPermission(user, 'orders', 'edit') && !hasPermission(user, 'orders', 'add')) finalSalesOrders = [];
        if (!hasPermission(user, 'production', 'edit') && !hasPermission(user, 'production', 'add')) finalProductionOrders = [];
        if (!hasPermission(user, 'preparation', 'edit') && !hasPermission(user, 'preparation', 'add')) finalPreparationOrders = [];
        if (!hasPermission(user, 'delivery', 'edit') && !hasPermission(user, 'delivery', 'add')) finalMissions = [];
      }

      const allActiveOrders = [...finalSalesOrders, ...finalProductionOrders, ...finalPreparationOrders, ...finalMissions].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setOrders(allActiveOrders);
      setGlobalSettings(settings || {});

      if (cUser && cUser.supervisorPermissions) {
        setCurrentUserPerms(cUser.supervisorPermissions);
      } else if (isSuperAdmin) {
        setCurrentUserPerms({ attendance: true, smoking: true, absences: true, evaluations: true, orders: true });
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const fetchDailyReports = async () => {
      if (!date) return;
      try {
        const reps = await getReportsByDateRange(date, date);
        setEmployeeReports(reps);
      } catch (err) {
        console.error("Error fetching daily reports:", err);
      }
    };
    fetchDailyReports();
  }, [date]);

  useEffect(() => {
    if (activeTab === 'add') {
      const existingReport = reports.find(r => String(r.supervisorId) === String(user.id) && r.date === date);
      if (existingReport) {
        setTimeIn(existingReport.timeIn || '');
        setTimeOut(existingReport.timeOut || '');
        setAttendanceNotes(existingReport.attendanceNotes || existingReport.notes || '');
        const evals = {};
        const savedEvals = {};
        if (existingReport.employeeEvaluations) {
          existingReport.employeeEvaluations.forEach(ev => {
            evals[ev.employeeId] = {
              rating: ev.rating,
              reason: ev.reason,
              scorePercentage: ev.scorePercentage,
              reportApproved: ev.reportApproved
            };
            if (ev.rating) savedEvals[`emp_${ev.employeeId}`] = true;
          });
        }
        setEmployeeEvaluations(evals);

        const savedOrders = {};
        if (existingReport.ordersSnapshot) {
          existingReport.ordersSnapshot.forEach(so => {
            if (so.supervisorNotes && so.supervisorNotes.trim()) {
              savedOrders[`order_${so.id}`] = true;
            }
          });
        }
        setSavedItems(prev => {
          const newPrev = { ...prev };
          Object.keys(newPrev).forEach(k => { if (k.startsWith('order_')) delete newPrev[k]; });
          return { ...newPrev, ...savedEvals, ...savedOrders };
        });

        setOrders(currentOrders => currentOrders.map(o => {
          const snapOrder = existingReport.ordersSnapshot?.find(so => so.id === o.id);
          return { ...o, supervisorNotes: snapOrder ? (snapOrder.supervisorNotes || '') : '' };
        }));

      } else {
        setTimeIn(''); setTimeOut(''); setAttendanceNotes('');

        setOrders(currentOrders => currentOrders.map(o => ({ ...o, supervisorNotes: '' })));

        const lsKey = `sup_eval_${user.id}_${date}`;
        const savedDataStr = localStorage.getItem(lsKey);
        let savedItemsFromLs = {};
        if (savedDataStr) {
          try {
            const savedData = JSON.parse(savedDataStr);
            setEmployeeEvaluations(savedData.employeeEvaluations || {});
            savedItemsFromLs = savedData.savedItems || {};
          } catch (e) {
            setEmployeeEvaluations({});
          }
        } else {
          setEmployeeEvaluations({});
        }

        setSavedItems(prev => {
          const newPrev = { ...prev };
          Object.keys(newPrev).forEach(k => { if (k.startsWith('order_')) delete newPrev[k]; });
          return { ...newPrev, ...savedItemsFromLs };
        });
      }
    }
  }, [date, activeTab, user.id, reports]);

  // Auto-save to localStorage
  useEffect(() => {
    if (activeTab === 'add' && !reports.some(r => String(r.supervisorId) === String(user.id) && r.date === date)) {
      const lsKey = `sup_eval_${user.id}_${date}`;
      if (Object.keys(employeeEvaluations).length > 0) {
        const dataToSave = {
          employeeEvaluations,
          savedItems: Object.keys(savedItems).reduce((acc, key) => {
            if (key.startsWith('emp_')) acc[key] = savedItems[key];
            return acc;
          }, {})
        };
        localStorage.setItem(lsKey, JSON.stringify(dataToSave));
      }
    }
  }, [employeeEvaluations, savedItems, date, activeTab, user.id, reports]);

  const handleEvaluationChange = (empId, field, value) => {
    setEmployeeEvaluations(prev => {
      const current = prev[empId] || { rating: '', reason: '', scorePercentage: '', reportApproved: false };
      let updates = { [field]: value };
      if (field === 'rating' && value === 'لم يقدم تقرير') {
        updates.scorePercentage = '40';
        updates.reason = 'لم يقم بتقديم أي تقرير';
      } else if (field === 'rating' && value === 'غائب') {
        updates.scorePercentage = '0';
      }
      return { ...prev, [empId]: { ...current, ...updates } };
    });
    setSavedItems(prev => ({ ...prev, [`emp_${empId}`]: false }));
  };

  const toggleEmployeeReport = (empId) => {
    setExpandedEmployees(prev => ({ ...prev, [empId]: !prev[empId] }));
  };

  const handleSaveSingleEvaluation = async (empId) => {
    const evalData = employeeEvaluations[empId];
    const emp = employees.find(e => e.id === empId);
    if (!evalData || !evalData.rating) {
      MySwal.fire('تنبيه', 'الرجاء اختيار التقييم قبل الحفظ.', 'warning');
      return;
    }

    if (evalData.rating !== 'غائب' && evalData.rating !== 'لم يقدم تقرير' && (!evalData.scorePercentage || String(evalData.scorePercentage).trim() === '')) {
      MySwal.fire('تنبيه', `الرجاء إدخال النسبة المئوية للتقييم للموظف ${emp.name} قبل الحفظ.`, 'warning');
      return;
    }

    let finalReason = evalData.reason || '';

    if (evalData.rating === 'مقبول' || evalData.rating === 'سيئ') {
      const result = await MySwal.fire({
        title: 'سبب التقييم مطلوب',
        text: `يرجى كتابة سبب التقييم للموظف ${emp.name} (نظراً لأن التقييم مقبول أو سيئ):`,
        input: 'textarea',
        inputPlaceholder: 'اكتب السبب هنا...',
        inputValue: finalReason,
        showCancelButton: true,
        confirmButtonText: 'حفظ السبب والتقييم',
        cancelButtonText: 'إلغاء',
        inputValidator: (value) => {
          if (!value || !value.trim()) {
            return 'يجب كتابة سبب التقييم!';
          }
        }
      });

      if (!result.isConfirmed) {
        return;
      }
      finalReason = result.value;

      // Update state with reason
      setEmployeeEvaluations(prev => {
        const current = prev[empId] || { rating: '', reason: '', scorePercentage: '', reportApproved: false };
        return { ...prev, [empId]: { ...current, reason: finalReason } };
      });
    }

    setSavedItems(prev => ({ ...prev, [`emp_${empId}`]: true }));

    MySwal.fire({
      title: 'تم الحفظ مبدئياً',
      text: `تم حفظ تقييم ${emp.name} مؤقتاً، يرجى حفظ التقرير بالكامل للاعتماد النهائي.`,
      icon: 'info',
      timer: 2000,
      showConfirmButton: false
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!date) {
        MySwal.fire('تنبيه', 'الرجاء اختيار تاريخ التقرير.', 'warning');
        return;
      }

      const allAttLogs = await getAttendanceLogs();
      const todayLogs = allAttLogs.filter(log => log.date === date);

      let isValid = true;
      let errorMessage = '';

      if (currentUserPerms.evaluations) {
        for (const emp of employees) {
          if (!savedItems[`emp_${emp.id}`]) {
            isValid = false;
            errorMessage = `يرجى حفظ التقييم للموظف "${emp.name}" (الزر الصغير) قبل اعتماد التقرير بالكامل.`;
            break;
          }

          const empDailyReport = employeeReports.find(r => String(r.userId || '').trim() === String(emp.id).trim() || String(r.employeeId || '').trim() === String(emp.id).trim() || String(r.userName || '').trim() === String(emp.name).trim());
          const empLog = todayLogs.find(l => String(l.employeeId) === String(emp.id));
          const evalData = employeeEvaluations[emp.id];

          if (!empDailyReport && empLog && empLog.status !== 'غياب') {
            if (evalData && evalData.rating === 'لم يقدم تقرير') {
              // Bypass block if supervisor explicitly marked as "Did not submit report"
            } else {
              isValid = false;
              errorMessage = `لا يمكن الحفظ! الموظف "${emp.name}" مسجل كحاضر ولكنه لم يقم بتقديم تقريره اليومي بعد. يمكنك اختيار "لم يقدم تقرير" إذا أردت استكمال التقييم.`;
              break;
            }
          }

          if (!evalData || !evalData.rating) {
            isValid = false;
            errorMessage = `الرجاء إدخال التقييم اليومي للموظف: ${emp.name}`;
            break;
          }
          if (evalData.rating !== 'غائب' && evalData.rating !== 'لم يقدم تقرير' && (!evalData.scorePercentage || String(evalData.scorePercentage).trim() === '')) {
            isValid = false;
            errorMessage = `الرجاء إدخال النسبة المئوية للتقييم للموظف: ${emp.name}`;
            break;
          }
          if ((evalData.rating === 'مقبول' || evalData.rating === 'سيئ') && (!evalData.reason || !evalData.reason.trim())) {
            isValid = false;
            errorMessage = `يجب كتابة سبب للموظف ${emp.name} نظراً لأن تقييمه "${evalData.rating}".`;
            break;
          }
        }
      }

      if (currentUserPerms.orders && isValid) {
        for (const order of orders) {
          if (!savedItems[`order_${order.id}`]) {
            isValid = false;
            const orderRef = order.isMission ? 'مهمة التوصيل' : `الطلبية رقم ${order.orderNumber}`;
            errorMessage = `يرجى حفظ الملاحظة لـ ${orderRef} (الزر الصغير) قبل اعتماد التقرير بالكامل.`;
            break;
          }

          if (!order.supervisorNotes || !order.supervisorNotes.trim()) {
            isValid = false;
            const orderRef = order.isMission ? 'مهمة التوصيل' : `الطلبية رقم ${order.orderNumber}`;
            errorMessage = `الرجاء إدخال ملاحظة لـ ${orderRef} الخاصة بـ ${order.customerName} (أو كتابة "لا يوجد" أو "قيد العمل").`;
            break;
          }
        }
      }

      if (!isValid) {
        MySwal.fire('تنبيه', errorMessage, 'warning');
        return;
      }

      const evaluationsArray = Object.keys(employeeEvaluations).map(empId => ({
        employeeId: empId,
        employeeName: employees.find(e => e.id === empId)?.name || 'غير معروف',
        rating: employeeEvaluations[empId].rating,
        reason: employeeEvaluations[empId].reason || '',
        scorePercentage: employeeEvaluations[empId].scorePercentage || '',
        reportApproved: employeeEvaluations[empId].reportApproved || false
      })).filter(ev => ev.rating);

      let employeeAttendanceStatus = 'all_present';
      let hasAbsence = false;
      let hasDelay = false;

      employees.forEach(emp => {
        const empLog = todayLogs.find(l => String(l.employeeId) === String(emp.id));
        if (empLog) {
          if (empLog.status === 'غياب') {
            hasAbsence = true;
          } else if (empLog.status === 'تأخير' || empLog.status === 'حاضر متأخر') {
            hasDelay = true;
          }
        }
      });

      if (hasAbsence) {
        employeeAttendanceStatus = 'absence';
      } else if (hasDelay) {
        employeeAttendanceStatus = 'delay';
      }

      const supervisorLog = todayLogs.find(l => String(l.employeeId) === String(user.id));
      const autoTimeIn = supervisorLog ? supervisorLog.timeIn : '';
      const autoTimeOut = supervisorLog ? supervisorLog.timeOut : '';

      const reportData = {
        supervisorId: user.id,
        supervisorName: user.name,
        date,
        timeIn: autoTimeIn,
        timeOut: autoTimeOut,
        attendanceNotes: '',
        employeeEvaluations: evaluationsArray,
        employeeAttendanceStatus,
        ordersSnapshot: orders || [],
        status: 'قيد المراجعة',
        createdAt: new Date().toISOString()
      };

      const existingReport = reports.find(r => r.supervisorId === user.id && r.date === date);
      if (existingReport) {
        reportData.id = existingReport.id;
      } else {
        reportData.id = `sup_rep_${user.id}_${date}`;
      }
      await saveSupervisorReport(reportData);

      if (currentUserPerms.evaluations) {
        for (const ev of evaluationsArray) {
          let empDailyReport = employeeReports.find(r => String(r.userId || '').trim() === String(ev.employeeId).trim() || String(r.employeeId || '').trim() === String(ev.employeeId).trim());

          if (!empDailyReport && ev.rating === 'لم يقدم تقرير') {
            const empUser = employees.find(e => String(e.id) === String(ev.employeeId));
            empDailyReport = {
              id: `rep_${ev.employeeId}_${date}`,
              userId: ev.employeeId,
              employeeId: ev.employeeId,
              userName: empUser ? empUser.name : 'غير معروف',
              date: date,
              timeIn: '',
              timeOut: '',
              status: 'معتمد',
              finalScore: 40,
              phoneUsages: 0,
              tasks: [],
              notes: 'تم تقييم الموظف من قبل المشرف لعدم تقديمه التقرير اليومي',
              createdAt: new Date().toISOString()
            };
          }

          if (empDailyReport) {
            const mapping = { 'ممتاز': 100, 'جيد': 80, 'مقبول': 60, 'سيئ': 40, 'لم يقدم تقرير': 40, 'غائب': 0 };
            const supervisorScore = ev.scorePercentage ? parseFloat(ev.scorePercentage) : mapping[ev.rating] || 0;
            const updatedEmpReport = {
              ...empDailyReport,
              supervisorRating: ev.rating,
              supervisorReason: ev.reason,
              finalScore: supervisorScore
            };
            await saveReport(updatedEmpReport);

            const empUser = employees.find(e => String(e.id) === String(ev.employeeId));
            triggerWhatsAppRouting('daily_report', 'approve', {
              employeeId: ev.employeeId,
              employeeName: empUser?.name || 'موظف غير معروف',
              date: date,
              rating: ev.rating,
              notes: ev.reason || 'لا يوجد'
            });
          }
        }
      }

      if (currentUserPerms.orders) {
        for (const order of orders) {
          if (order.isMission) {
            await saveMission({ ...order, lastActionBy: user?.name || 'مشرف' });
          } else if (order.isProduction) {
            await saveOrder({ ...order, lastActionBy: user?.name || 'مشرف' });
          } else {
            await saveSalesOrder({ ...order, lastActionBy: user?.name || 'مشرف' });
          }
        }
      }

      if (existingReport) {
        setReports(reports.map(r => r.id === existingReport.id ? reportData : r));
      } else {
        setReports([...reports, reportData]);
      }

      await addLog({
        userName: user.name,
        userId: user.id,
        module: 'تقارير المشرفين',
        action: 'إضافة',
        details: `حفظ تقرير المشرف ${user.name} بتاريخ ${date}`
      });

      await createNotification({
        settingKey: 'supervisorsReport',
        moduleKey: 'hr',
        moduleLabel: 'الموارد البشرية',
        title: 'تقرير مشرف جديد',
        message: `المشرف: ${user.name}\nالتاريخ: ${date}`,
        createdById: user.id,
        createdByName: user.name,
        createdByRole: user.level || user.role,
        target: { tab: 'supervisors-reports' }
      });

      // Refresh employee daily reports local state to prevent duplicate creation on subsequent saves
      try {
        const updatedReps = await getReportsByDateRange(date, date);
        setEmployeeReports(updatedReps);
      } catch (err) {
        console.error("Error refreshing employee reports:", err);
      }

      // Clear local storage after successful save
      localStorage.removeItem(`sup_eval_${user.id}_${date}`);

      MySwal.fire({
        title: 'تم الحفظ',
        text: 'تم حفظ تقرير المشرف اليومي بنجاح',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });

      setActiveTab('history');

    } catch (err) {
      MySwal.fire('خطأ', 'حدث خطأ أثناء حفظ التقرير.', 'error');
    }
  };

  const [supSortKey, setSupSortKey] = useState('date');
  const [supSortDir, setSupSortDir] = useState('desc');

  const handleSupSort = (key) => {
    if (supSortKey === key) {
      setSupSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSupSortKey(key);
      setSupSortDir('asc');
    }
  };

  const getSupSortIcon = (key) => {
    if (supSortKey !== key) return <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '4px' }}>↕</span>;
    return supSortDir === 'asc'
      ? <span style={{ color: 'var(--primary)', fontWeight: 'bold', marginLeft: '4px' }}>↑</span>
      : <span style={{ color: 'var(--primary)', fontWeight: 'bold', marginLeft: '4px' }}>↓</span>;
  };

  const filteredReports = reports.filter(report => {
    if (!isSuperAdmin && String(report.supervisorId) !== String(user?.id)) return false;

    let matchDate = true;
    if (dateMode === 'day') {
      matchDate = selectedDate ? report.date === selectedDate : true;
    } else if (dateMode === 'month') {
      matchDate = selectedMonth ? (report.date && report.date.startsWith(selectedMonth)) : true;
    } else if (dateMode === 'range') {
      const matchFrom = dateFrom ? report.date >= dateFrom : true;
      const matchTo = dateTo ? report.date <= dateTo : true;
      matchDate = matchFrom && matchTo;
    }

    const matchSupervisor = filterSupervisor ? String(report.supervisorName || '').trim().toLowerCase() === filterSupervisor.trim().toLowerCase() : true;
    const matchAttendance = filterAttendance ? report.employeeAttendanceStatus === filterAttendance : true;
    const matchStatus = filterStatus ? (report.status || 'قيد المراجعة') === filterStatus : true;

    return matchDate && matchSupervisor && matchAttendance && matchStatus;
  });

  const visibleReports = React.useMemo(() => {
    if (!filteredReports || filteredReports.length === 0) return [];
    const sorted = [...filteredReports];
    if (!supSortKey) return sorted;

    sorted.sort((a, b) => {
      if (!a && !b) return 0;
      if (!a) return 1;
      if (!b) return -1;

      let aVal = a[supSortKey];
      let bVal = b[supSortKey];

      if (supSortKey === 'employeeEvaluations') {
        const numA = Array.isArray(a.employeeEvaluations) ? a.employeeEvaluations.length : 0;
        const numB = Array.isArray(b.employeeEvaluations) ? b.employeeEvaluations.length : 0;
        if (numA !== numB) {
          return supSortDir === 'asc' ? numA - numB : numB - numA;
        }
        return 0;
      }

      if (supSortKey === 'date') {
        const timeA = aVal ? new Date(aVal).getTime() : 0;
        const timeB = bVal ? new Date(bVal).getTime() : 0;
        const finalA = isNaN(timeA) ? 0 : timeA;
        const finalB = isNaN(timeB) ? 0 : timeB;
        if (finalA !== finalB) {
          return supSortDir === 'asc' ? finalA - finalB : finalB - finalA;
        }
        return 0;
      }

      const strA = aVal ? String(aVal).trim().toLowerCase() : '';
      const strB = bVal ? String(bVal).trim().toLowerCase() : '';
      if (strA < strB) return supSortDir === 'asc' ? -1 : 1;
      if (strA > strB) return supSortDir === 'asc' ? 1 : -1;
      return 0;
    });

    if (!isSuperAdmin && dateMode === 'range' && !dateFrom && !dateTo) {
      return sorted.slice(0, 5);
    }
    return sorted;
  }, [filteredReports, supSortKey, supSortDir, isSuperAdmin, dateMode, dateFrom, dateTo]);

  const handleViewReport = async (report) => {
    // Lookup supervisor live attendance logs freshly
    const freshAttLogs = await getAttendanceLogs();
    const hrAttLogs = await getHRAttendance();
    const hrLeaves = await getHRLeaves();

    let supAttLog = hrAttLogs.find(l => (String(l.employeeId || '').trim() === String(report.supervisorId || '').trim() || String(l.employeeName || '').trim() === String(report.supervisorName || '').trim()) && l.date === report.date);
    if (!supAttLog) {
      supAttLog = freshAttLogs.find(l => (String(l.employeeId || '').trim() === String(report.supervisorId || '').trim() || String(l.employeeName || '').trim() === String(report.supervisorName || '').trim()) && l.date === report.date);
    }

    let supLeave = hrLeaves.find(l => {
      const matchEmp = (String(l.employeeId || '').trim() === String(report.supervisorId || '').trim() || String(l.employeeName || '').trim() === String(report.supervisorName || '').trim());
      if (!matchEmp) return false;
      const isApproved = l.status === 'موافق' || l.status === 'مقبول' || l.status === 'Approved' || !l.status;
      if (!isApproved) return false;
      if (l.date === report.date) return true;
      if (l.startDate && l.endDate && report.date >= l.startDate && report.date <= l.endDate) return true;
      return false;
    });

    const formatTime = (t) => {
      if (!t) return '--:--';
      const parts = t.split(':');
      if (parts.length < 2) return t;
      let hh = parseInt(parts[0], 10);
      const m = parts[1];
      const ampm = hh >= 12 ? 'م' : 'ص';
      hh = hh % 12 || 12;
      return `${hh}:${m} ${ampm}`;
    };

    let supTimeIn = formatTime(supAttLog?.timeIn || report.timeIn);
    let supTimeOut = formatTime(supAttLog?.timeOut || report.timeOut);

    if (supAttLog?.status && (supAttLog.status.includes('إجازة') || supAttLog.status.includes('مغادرة'))) {
      supTimeIn = `<span style="color: #f59e0b; font-weight: bold;">${supAttLog.status}</span>`;
      supTimeOut = `<span style="color: #f59e0b; font-weight: bold;">${supAttLog.status}</span>`;
    } else if (supAttLog?.status && (supAttLog.status.includes('غياب') || supAttLog.status.includes('غائب'))) {
      supTimeIn = '<span style="color: #ef4444; font-weight: bold;">غائب</span>';
      supTimeOut = '<span style="color: #ef4444; font-weight: bold;">غائب</span>';
    } else if (!supAttLog?.timeIn && !report.timeIn && supLeave) {
      const leaveType = supLeave.type || 'إجازة';
      supTimeIn = `<span style="color: #f59e0b; font-weight: bold;">${leaveType}</span>`;
      supTimeOut = `<span style="color: #f59e0b; font-weight: bold;">${leaveType}</span>`;
    } else if (!supAttLog?.timeIn && !report.timeIn) {
      // إذا لم يكن هناك بصمة ولم يكن هناك إجازة مسجلة
      supTimeIn = '<span style="color: #ef4444; font-weight: bold;">غائب</span>';
      supTimeOut = '<span style="color: #ef4444; font-weight: bold;">غائب</span>';
    }

    MySwal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup-report',
        confirmButton: 'btn-premium-close-teal',
        actions: 'premium-modal-actions'
      },
      showConfirmButton: false,
      buttonsStyling: false,
      width: '600px',
      html: `
        <div style="direction: rtl; text-align: right; font-family: 'Tajawal', sans-serif; color: #1e293b; display: flex; flex-direction: column; height: 80vh; overflow: hidden; margin: -2rem;">
          
          <!-- Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 1.25rem; border-bottom: 1px solid #e2e8f0; background: #ffffff;">
            <!-- Close Button (Left) -->
            <button onclick="Swal.close()" style="width: 2.75rem; height: 2.75rem; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #475569;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            
            <!-- Title (Center) -->
            <div style="text-align: center; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
              <h3 style="margin: 0; font-size: 1.05rem; font-weight: 800; color: #1e293b;">تقرير المشرف: ${report.supervisorName}</h3>
              <span style="font-size: 0.72rem; color: #64748b; font-weight: bold; background: #f1f5f9; padding: 2px 8px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace;">${report.supervisorId || ''}</span>
            </div>
            
            <!-- Print Button (Right) -->
            <button onclick="window.printSupervisorReport()" style="width: 2.75rem; height: 2.75rem; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #0f766e; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            </button>
          </div>

          <!-- Body (Scrollable) -->
          <div style="flex: 1; overflow-y: auto; padding: 1.25rem; background-color: #f8fafc;">
            
            <!-- الدوام Card -->
            <div style="background: #ffffff; border-radius: 20px; padding: 1.25rem; margin-bottom: 1.25rem; border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.02);">
              <div style="display: flex; align-items: center; justify-content: flex-start; gap: 0.5rem; font-weight: 800; color: #0f766e; font-size: 0.95rem; margin-bottom: 1rem;">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <span>الدوام</span>
              </div>
              
              <div style="display: flex; gap: 0.75rem;">
                <!-- التاريخ -->
                <div style="flex: 1; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 0.75rem 0.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.25rem; background: #f8fafc;">
                  <span style="font-size: 0.7rem; font-weight: 700; color: #64748b; display: flex; align-items: center; gap: 0.25rem;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <span>التاريخ:</span>
                  </span>
                  <span style="font-weight: 800; color: #1e293b; font-size: 0.85rem;">${report.date}</span>
                </div>
                
                <!-- وقت الحضور -->
                <div style="flex: 1; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 0.75rem 0.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.25rem; background: #f8fafc;">
                  <span style="font-size: 0.7rem; font-weight: 700; color: #64748b; display: flex; align-items: center; gap: 0.25rem;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <span>وقت الحضور:</span>
                  </span>
                  <span style="font-weight: 800; color: #1e293b; font-size: 0.85rem;" dir="ltr">${supTimeIn}</span>
                </div>
                
                <!-- وقت الخروج -->
                <div style="flex: 1; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 0.75rem 0.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.25rem; background: #f8fafc;">
                  <span style="font-size: 0.7rem; font-weight: 700; color: #64748b; display: flex; align-items: center; gap: 0.25rem;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <span>وقت الخروج:</span>
                  </span>
                  <span style="font-weight: 800; color: #1e293b; font-size: 0.85rem;" dir="ltr">${supTimeOut}</span>
                </div>
              </div>
              
              <!-- الملاحظات اليومية للمشرف -->
              ${report.notes ? `
                <div style="margin-top: 1rem; padding: 0.75rem; border-radius: 12px; background-color: #f1f5f9; border: 1px solid #e2e8f0;">
                  <span style="display: block; font-size: 0.7rem; font-weight: 700; color: #475569; margin-bottom: 0.25rem;">الملاحظات اليومية للمشرف:</span>
                  <span style="font-weight: 600; color: #1e293b; font-size: 0.85rem; white-space: pre-wrap;">${report.notes}</span>
                </div>
              ` : ''}
            </div>

            <!-- تقييمات الموظفين -->
            ${(report.employeeEvaluations || []).map((ev, idx) => {
        const empDailyReport = allEmployeeReports.find(r => (String(r.userId || '').trim() === String(ev.employeeId).trim() || String(r.employeeId || '').trim() === String(ev.employeeId).trim() || String(r.userName || '').trim() === String(ev.employeeName).trim()) && r.date === report.date);

        return `
                <!-- Employee evaluation card wrapper -->
                <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 20px; padding: 1.25rem; margin-bottom: 1.25rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03); position: relative;">
                  
                  <!-- Employee Header -->
                  <div style="display: flex; justify-content: flex-start; align-items: center; gap: 0.75rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem; margin-bottom: 0.75rem;">
                    <!-- Circular Green Badge index (Right) -->
                    <div style="width: 26px; height: 26px; background-color: #0f766e; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem; box-shadow: 0 2px 6px rgba(15,118,110,0.2); flex-shrink: 0;">
                      ${String(idx + 1).padStart(2, '0')}
                    </div>
                    <!-- User icon & name -->
                    <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 800; color: #1e293b; font-size: 0.95rem;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0e7490" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      <span>${ev.employeeName}</span>
                      <span style="font-size: 0.72rem; color: #64748b; font-weight: bold; background: #f1f5f9; padding: 2px 6px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; margin-right: 4px;">${ev.employeeId}</span>
                    </div>
                  </div>

                  <!-- Mini evaluation table -->
                  <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 0.8rem; margin-bottom: 1rem; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <thead>
                      <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: bold;">
                        <th style="padding: 8px; border: 1px solid #cbd5e1;">التقييم</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1;">النسبة</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1;">الملاحظة</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style="background-color: #ffffff;">
                        <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; color: ${ev.rating === 'ممتاز' || ev.rating === 'جيد' ? '#10b981' : ev.rating === 'سيئ' || ev.rating === 'لم يقدم تقرير' ? '#ef4444' : '#334155'};">
                          ${ev.rating}
                        </td>
                        <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; color: #0e7490;" dir="ltr">
                          ${ev.scorePercentage ? ev.scorePercentage + '%' : '---'}
                        </td>
                        <td style="padding: 8px; border: 1px solid #cbd5e1; color: #475569; font-weight: 600;">
                          ${ev.reason || '---'}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <!-- Collapsible section header -->
                  <div style="display: flex; align-items: center; justify-content: space-between; color: #0e7490; font-weight: bold; font-size: 0.85rem; padding: 0.5rem 0; border-top: 1px dashed #cbd5e1; margin-top: 0.5rem; cursor: pointer;">
                    <span style="display: flex; align-items: center; gap: 0.25rem;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      <span>تفاصيل تقرير الموظف</span>
                    </span>
                  </div>

                  <!-- Tasks Table Container -->
                  <div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; margin: 0.5rem 0; overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 0.65rem;">
                      <thead>
                        <tr style="background-color: #f8fafc; border-bottom: 1px solid #cbd5e1; color: #64748b; font-weight: bold;">
                          <th style="padding: 5px 3px; border: 1px solid #cbd5e1; font-size: 0.62rem !important; font-weight: bold !important;">القسم</th>
                          <th style="padding: 5px 3px; border: 1px solid #cbd5e1; font-size: 0.62rem !important; font-weight: bold !important;">الصنف</th>
                          <th style="padding: 5px 3px; border: 1px solid #cbd5e1; font-size: 0.62rem !important; font-weight: bold !important;">العملية</th>
                          <th style="padding: 5px 3px; border: 1px solid #cbd5e1; font-size: 0.62rem !important; font-weight: bold !important;">المنجز</th>
                          <th style="padding: 5px 3px; border: 1px solid #cbd5e1; font-size: 0.62rem !important; font-weight: bold !important;">الحد المطلوب</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${(empDailyReport && empDailyReport.tasks && empDailyReport.tasks.length > 0) ? empDailyReport.tasks.map(t => `
                          <tr style="background-color: #ffffff;">
                            <td style="padding: 5px 3px; border: 1px solid #cbd5e1; font-weight: normal !important; color: #0e7490; font-size: 0.6rem !important;">${t.departmentName || t.department || 'عام'}</td>
                            <td style="padding: 5px 3px; border: 1px solid #cbd5e1; font-weight: normal !important; color: #1e293b; font-size: 0.6rem !important;">${t.name}</td>
                            <td style="padding: 5px 3px; border: 1px solid #cbd5e1; color: #475569; font-size: 0.6rem !important; font-weight: normal !important;">${t.operation}</td>
                            <td style="padding: 5px 3px; border: 1px solid #cbd5e1; font-weight: 800 !important; color: #0e7490; font-size: 0.68rem !important;">${t.count}</td>
                            <td style="padding: 5px 3px; border: 1px solid #cbd5e1; color: #64748b; font-size: 0.58rem !important; font-weight: normal !important;">${(t.min > 0 || t.max > 0) ? `<span dir="ltr">${t.max} - ${t.min}</span>` : '-'}</td>
                          </tr>
                        `).join('') : `
                          <tr>
                            <td colspan="5" style="padding: 1rem; color: #94a3b8; text-align: center;">
                              <div style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem; justify-content: center;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><line x1="12" y1="11" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                <span style="font-weight: bold; font-size: 0.8rem;">لا توجد مهام مسجلة.</span>
                              </div>
                            </td>
                          </tr>
                        `}
                      </tbody>
                    </table>
                  </div>

                  <!-- Metadata Row badges -->
                  <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; justify-content: space-between; align-items: center; background-color: #f0f9fa; padding: 0.5rem 0.75rem; border-radius: 12px; border: 1px solid #cfeef1; font-size: 0.75rem; font-weight: bold;">
                    <!-- Phone Safe -->
                    <span style="color: ${empDailyReport && empDailyReport.phoneSafe ? '#16a34a' : '#ef4444'}; display: flex; align-items: center; gap: 0.25rem;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                      <span>الهاتف بالأمانات: ${empDailyReport && empDailyReport.phoneSafe ? 'نعم' : 'لا'}</span>
                    </span>
                    <!-- Phone Usages -->
                    <span style="color: ${empDailyReport && empDailyReport.phoneUsages > 0 ? '#ef4444' : '#16a34a'}; display: flex; align-items: center; gap: 0.25rem;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                      <span>استخدام الهاتف: ${empDailyReport ? empDailyReport.phoneUsages || 0 : 0} مرات</span>
                    </span>
                    <!-- Check-in Time -->
                    <span style="color: #0e7490; display: flex; align-items: center; gap: 0.25rem;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                      <span>دخول: ${(() => {
            let attLog = hrAttLogs.find(l => matchAttendance(l, ev.employeeId, ev.employeeName, report.date));
            if (!attLog) attLog = freshAttLogs.find(l => matchAttendance(l, ev.employeeId, ev.employeeName, report.date));
            if (attLog?.status === 'إجازة' || attLog?.status === 'مغادرة') return `<span style="color: #f59e0b; font-weight: bold;">${attLog.status}</span>`;
            if (attLog?.status === 'غياب' || attLog?.status === 'غائب' || ev.rating === 'غائب') return '<span style="color: #ef4444; font-weight: bold;">غائب</span>';
            const tIn = attLog?.timeIn || empDailyReport?.timeIn;
            if (!tIn) return '--:--';
            const [h, m] = tIn.split(':'); let hh = parseInt(h, 10); const ampm = hh >= 12 ? 'م' : 'ص'; hh = hh % 12 || 12; return `${hh}:${m} ${ampm}`;
          })()}</span>
                    </span>
                    <!-- Check-out Time -->
                    <span style="color: #0e7490; display: flex; align-items: center; gap: 0.25rem;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                      <span>خروج: ${(() => {
            let attLog = hrAttLogs.find(l => matchAttendance(l, ev.employeeId, ev.employeeName, report.date));
            if (!attLog) attLog = freshAttLogs.find(l => matchAttendance(l, ev.employeeId, ev.employeeName, report.date));
            if (attLog?.status === 'إجازة' || attLog?.status === 'مغادرة') return `<span style="color: #f59e0b; font-weight: bold;">${attLog.status}</span>`;
            if (attLog?.status === 'غياب' || attLog?.status === 'غائب' || ev.rating === 'غائب') return '<span style="color: #ef4444; font-weight: bold;">غائب</span>';
            const tOut = attLog?.timeOut || empDailyReport?.timeOut;
            if (!tOut) return '--:--';
            const [h, m] = tOut.split(':'); let hh = parseInt(h, 10); const ampm = hh >= 12 ? 'م' : 'ص'; hh = hh % 12 || 12; return `${hh}:${m} ${ampm}`;
          })()}</span>
                    </span>
                  </div>

                </div>
              `;
      }).join('')}

            <!-- متابعة الطلبيات والإنتاج المباشر -->
            <div style="background: #ffffff; border-radius: 20px; padding: 1.25rem; margin-top: 1.25rem; border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.02);">
              <div style="display: flex; align-items: center; justify-content: flex-start; gap: 0.5rem; font-weight: 800; color: #0f766e; font-size: 0.95rem; margin-bottom: 1rem;">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                <span>متابعة الطلبيات والإنتاج المباشر</span>
              </div>
              
              <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 0.8rem; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
                <thead>
                  <tr style="background-color: #f8fafc; border-bottom: 1px solid #cbd5e1; color: #64748b; font-weight: bold;">
                    <th style="padding: 10px; border: 1px solid #cbd5e1;">الطلبية/المهمة</th>
                    <th style="padding: 10px; border: 1px solid #cbd5e1;">القسم</th>
                    <th style="padding: 10px; border: 1px solid #cbd5e1;">الحالة</th>
                    <th style="padding: 10px; border: 1px solid #cbd5e1;">ملاحظات المشرف</th>
                  </tr>
                </thead>
                <tbody>
                  ${(report.ordersSnapshot && report.ordersSnapshot.length > 0) ? (() => {
          const getDept = (o) => o.isMission ? 'مهمة توصيل' : (o.currentDepartment || (['جديد', 'مؤكد', 'قيد الانتظار', 'طلب جديد'].includes(o.status || '') ? 'إدارة الطلبات' : ((o.status || '').includes('توصيل') || (o.status || '').includes('تسليم') ? 'مهمة توصيل' : 'إنتاج قيد الخياطة')));

          const sorted = [...report.ordersSnapshot].sort((a, b) => {
            const d1 = getDept(a);
            const d2 = getDept(b);
            if (d1 === d2) return 0;
            if (d1.includes('الطلبات')) return -1;
            if (d2.includes('الطلبات')) return 1;
            if (d1.includes('الخياطة')) return -1;
            if (d2.includes('الخياطة')) return 1;
            return 0;
          });

          return sorted.map(o => {
            const dept = getDept(o);
            const deptColor = dept.includes('الطلبات') ? '#3b82f6' : dept.includes('الخياطة') ? '#f59e0b' : dept.includes('التحضير') ? '#8b5cf6' : '#10b981';
            const deptBg = dept.includes('الطلبات') ? '#eff6ff' : dept.includes('الخياطة') ? '#fffbeb' : dept.includes('التحضير') ? '#f5f3ff' : '#ecfdf5';

            return `
                        <tr style="background-color: ${deptBg}; border-bottom: 1px solid #e2e8f0;">
                          <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; border-right: 4px solid ${deptColor}; text-align: right;">
                            ${o.isMission
                ? `<span style="color: #f97316; font-size: 0.85rem;">🚚 ${o.customerName || ''}</span>`
                : `<span style="color: ${deptColor}; font-size: 0.85rem;">${o.orderNumber?.toString().includes('-') ? o.orderNumber : '#' + parseInt(o.orderNumber || 0)}</span><span style="font-size: 0.75rem; color: #64748b; margin-right: 5px;">- ${o.customerName || ''}</span>`
              }
                          </td>
                          <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; color: ${deptColor};">${dept}</td>
                          <td style="padding: 8px; border: 1px solid #cbd5e1; color: #64748b;">${o.executionStatus || o.status || 'غير محدد'}</td>
                          <td style="padding: 8px; border: 1px solid #cbd5e1; color: #475569; font-weight: bold;">${o.supervisorNotes || '---'}</td>
                        </tr>
                      `;
          }).join('');
        })() : '<tr><td colspan="4" style="padding: 15px; border: 1px solid #cbd5e1; color: #64748b;">لا توجد طلبيات مسجلة</td></tr>'}
                </tbody>
              </table>
            </div>

          </div>
          </div>

        </div>
      `,
    });
  };

  const handleUpdateOrderField = async (orderId, field, value) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const updatedOrder = { ...order, [field]: value };
    setOrders(orders.map(o => o.id === orderId ? updatedOrder : o));
  };

  const handleEditReport = (report) => {
    setDate(report.date);
    setIsEditMode(true);
    setActiveTab('add');
  };

  const handleChangeReportStatus = async (report, newStatus) => {
    const actionText = newStatus === 'معتمد' ? 'اعتماد' : 'إرجاع / رفض';
    const result = await MySwal.fire({
      title: 'تأكيد الإجراء',
      html: `
        <p style="margin-bottom: 15px;">${newStatus === 'معتمد' ? 'هل أنت متأكد من اعتماد هذا التقرير؟ سيمنع هذا المشرف من تعديله.' : 'هل أنت متأكد من رفض/إرجاع التقرير للمشرف لكي يتمكن من تعديله؟'}</p>
        <div style="text-align: right; margin-top: 15px;">
          <label style="display:block; margin-bottom: 8px; font-weight: bold; color: #1e293b;">${newStatus === 'معتمد' ? 'ملاحظات (اختياري)' : 'سبب الرفض (اختياري)'}</label>
          <textarea id="swal-report-note" class="swal2-textarea" style="margin:0; width:100%; font-size: 14px;" placeholder="اكتب ملاحظتك هنا..."></textarea>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، متأكد',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        return document.getElementById('swal-report-note').value;
      }
    });

    if (result.isConfirmed) {
      try {
        const adminNote = result.value;
        const updatedReport = {
          ...report,
          status: newStatus
        };

        const newAdminNotes = adminNote ? `${report.adminNotes ? report.adminNotes + '\n' : ''}(${newStatus === 'معتمد' ? 'ملاحظة اعتماد' : 'سبب الرفض'}: ${adminNote})` : report.adminNotes;
        if (newAdminNotes !== undefined) {
          updatedReport.adminNotes = newAdminNotes;
        }
        await saveSupervisorReport(updatedReport);
        setReports(reports.map(r => r.id === report.id ? updatedReport : r));

        // Optionally send whatsapp to supervisor
        try {
          const supEmp = employees.find(e => String(e.id) === String(report.supervisorId));
          if (supEmp && supEmp.phone) {
            const statusMsg = newStatus === 'معتمد' ? 'اعتماد ✅' : 'رفض/إرجاع ❌';
            let msg = `مرحباً ${report.supervisorName}،\nتم ${statusMsg} تقريرك اليومي لتاريخ ${report.date}.`;
            if (adminNote) msg += `\nملاحظة الإدارة: ${adminNote}`;
            await sendTemplatedWhatsAppNotification(supEmp.phone, 'report_approval', {
              name: report.supervisorName,
              status: statusMsg,
              date: report.date,
              reason: adminNote || 'بدون ملاحظات'
            });
          }
        } catch (e) { console.error(e); }

        MySwal.fire('تم بنجاح', `تم ${actionText} التقرير.`, 'success');
      } catch (err) {
        MySwal.fire('خطأ', 'حدث خطأ أثناء تغيير الحالة.', 'error');
      }
    }
  };

  const handleDeleteReport = async (report) => {
    const result = await MySwal.fire({
      title: 'هل أنت متأكد؟',
      text: 'لن تتمكن من التراجع عن عملية الحذف!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#cbd5e1',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
      try {
        await deleteSupervisorReport(report.id);
        setReports(reports.filter((r) => r.id !== report.id));
        MySwal.fire('تم الحذف!', 'تم حذف تقرير المشرف بنجاح.', 'success');
      } catch (err) {
        console.error("Error deleting report:", err);
        MySwal.fire('خطأ', 'حدث خطأ أثناء حذف التقرير.', 'error');
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="premium-tabs-container no-print mb-4" style={{ display: 'flex' }}>
        <>
          <button className={`premium-tab ${activeTab === 'add' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => { setActiveTab('add'); setIsEditMode(false); setDate(getLocalDateStr(new Date())); }}>
            <Plus size={20} /> <span>إضافة/تعديل تقرير</span>
          </button>
          <button className={`premium-tab ${activeTab === 'history' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('history')}>
            <ClipboardList size={20} /> <span>{isSuperAdmin ? 'سجل تقارير المشرفين' : 'سجل تقاريري'}</span>
          </button>
        </>
      </div>

      {activeTab === 'add' && (
        (() => {
          const existingReportForDate = reports.find(r => String(r.supervisorId) === String(user.id) && r.date === date);
          const isApproved = existingReportForDate && existingReportForDate.status === 'معتمد';
          const showForm = isEditMode || !existingReportForDate || !isApproved;

          if (!showForm) {
            return (
              <div className="glass-card flex flex-col items-center justify-center p-12 text-center" style={{ minHeight: '400px' }}>
                <CheckCircle size={64} className="text-emerald-500 mb-6" />
                <h3 className="text-2xl font-bold text-slate-800 mb-3">لقد قمت بتقديم التقرير مسبقاً وتم اعتماده</h3>
                <p className="text-slate-600 mb-6 text-lg">لا يمكنك تعديل التقرير بعد أن تم اعتماده من الإدارة.</p>
                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center mt-4">
                  <Flatpickr className="input-field h-12 w-48 text-center bg-slate-50 cursor-pointer mb-0" value={date} onChange={([d]) => setDate(getLocalDateStr(d))} options={{ dateFormat: 'Y-m-d', disableMobile: true, maxDate: 'today' }} placeholder="تغيير التاريخ" title="تغيير التاريخ لإضافة تقرير ليوم آخر" />
                </div>
              </div>
            );
          }

          return (
            <form onSubmit={handleSubmit} className="glass-card">
              <div className="mb-4 pb-2 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-xl font-bold flex items-center gap-2 mb-0">
                  <Calendar size={20} className="text-primary" /> تقرير المشرف اليومي
                </h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">تاريخ التقرير:</span>
                    {isEditMode ? (
                      <span className="font-bold text-primary px-3 py-1 bg-primary/10 rounded-lg" style={{ minWidth: '160px', textAlign: 'center' }}>{date}</span>
                    ) : (
                      <Flatpickr className="input-field h-10 w-40 mb-0" value={date} onChange={([d]) => setDate(getLocalDateStr(d))} options={{ dateFormat: 'Y-m-d', disableMobile: true, maxDate: 'today' }} placeholder="اختر تاريخ" />
                    )}
                  </div>
                </div>
              </div>

              {/* ثانيا: التقييم */}
              {currentUserPerms.evaluations && (
                <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-200">
                  <h4 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-primary" /> أولاً: تقييم الموظفين اليومي
                  </h4>

                  <div className="flex flex-col">
                    {/* Table Header Equivalent for the list */}
                    {employees.length === 0 ? (
                      <div className="text-center p-6 text-slate-500 bg-white rounded-lg" style={{ border: '1px solid #f1f5f9' }}>لا يوجد موظفين للتقييم.</div>
                    ) : employees.map(emp => {
                      const evalData = employeeEvaluations[emp.id] || { rating: '', reason: '', scorePercentage: '', reportApproved: false };
                      const isReasonRequired = evalData.rating === 'مقبول' || evalData.rating === 'سيئ';
                      const empDailyReport = employeeReports.find(r => String(r.userId || '').trim() === String(emp.id).trim() || String(r.employeeId || '').trim() === String(emp.id).trim() || String(r.userName || '').trim() === String(emp.name).trim());
                      const isExpanded = expandedEmployees[emp.id];

                      return (
                        <div
                          key={emp.id}
                          style={{
                            transition: 'all 0.3s ease',
                            marginBottom: '1.5rem',
                            backgroundColor: '#ffffff',
                            border: '2px solid #cbd5e1',
                            borderRadius: '20px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                            padding: '1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem'
                          }}
                          dir="rtl"
                        >
                          {/* Employee Header (Name & ID) */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', gap: '0.5rem' }}>
                            {/* Right side: Name & ID vertically */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', textAlign: 'right' }}>
                              <h3 style={{ margin: 0, fontWeight: 'extrabold', color: '#1e293b', fontSize: '0.875rem', lineHeight: '1.2' }}>{emp.name}</h3>
                              <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', lineHeight: '1' }}>({emp.id})</span>
                            </div>
                            {/* Left side: Toggle button horizontally */}
                            {empDailyReport ? (
                              <button
                                type="button"
                                onClick={() => toggleEmployeeReport(emp.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  backgroundColor: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  color: '#334155',
                                  fontWeight: 'extrabold',
                                  fontSize: '0.75rem',
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: '10px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0
                                }}
                              >
                                <span>{isExpanded ? 'إخفاء التقرير' : 'عرض التقرير'}</span>
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#94a3b8', backgroundColor: '#f1f5f9', padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                لم يُقدم تقرير
                              </span>
                            )}
                          </div>

                          {/* Evaluation Card Form */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Radio Buttons Container */}
                            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1rem', boxShadow: '0 2px 6px rgba(0,0,0,0.01)' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', direction: 'rtl' }}>
                                {['ممتاز', 'جيد', 'مقبول', 'سيئ', 'لم يقدم تقرير', 'غائب'].map(rate => (
                                  <label key={rate} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', padding: '0.25rem 0', borderRadius: '8px' }}>
                                    <input
                                      type="radio"
                                      name={`rating-${emp.id}`}
                                      value={rate}
                                      checked={evalData.rating === rate}
                                      onChange={(e) => handleEvaluationChange(emp.id, 'rating', e.target.value)}
                                      style={{ width: '16px', height: '16px', accentColor: '#1a8d9b', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155', whiteSpace: 'nowrap' }}>{rate}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* Rating Percentage Row & Save Button */}
                            <div style={{ display: 'flex', flexDirection: 'row', gap: '0.75rem', alignItems: 'center', width: '100%', marginTop: '0.25rem' }}>
                              {/* Rating Percentage Box */}
                              <div style={{
                                flex: 1,
                                backgroundColor: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '16px',
                                padding: '0 1rem',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.01)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                height: '3.2rem'
                              }}>
                                {/* Right: Trend Icon & Text Label */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', backgroundColor: '#eaf4f5', borderRadius: '10px', color: '#1a8d9b' }}>
                                    <TrendingUp size={18} />
                                  </div>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155' }}>نسبة التقييم</span>
                                </div>

                                {/* Left: Input with % inside */}
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  backgroundColor: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '10px',
                                  padding: '0 0.5rem',
                                  height: '2.4rem'
                                }}>
                                  <input
                                    type="number"
                                    min="0" max="100"
                                    style={{
                                      width: '45px',
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      textAlign: 'center',
                                      fontWeight: 'extrabold',
                                      fontSize: '0.9rem',
                                      color: '#1e293b',
                                      outline: 'none',
                                      padding: 0
                                    }}
                                    placeholder={evalData.rating === 'غائب' ? "---" : "95"}
                                    value={evalData.rating === 'غائب' ? '' : evalData.scorePercentage}
                                    disabled={evalData.rating === 'غائب' || evalData.rating === 'لم يقدم تقرير'}
                                    onChange={(e) => handleEvaluationChange(emp.id, 'scorePercentage', e.target.value)}
                                  />
                                  <span style={{ fontWeight: 'extrabold', color: '#1a8d9b', fontSize: '0.95rem' }}>%</span>
                                </div>
                              </div>

                              {/* Save Button */}
                              <button
                                type="button"
                                onClick={() => handleSaveSingleEvaluation(emp.id)}
                                style={{
                                  width: '90px',
                                  height: '3.2rem',
                                  borderRadius: '16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.35rem',
                                  border: savedItems[`emp_${emp.id}`] ? '1px solid #a7f3d0' : 'none',
                                  backgroundColor: savedItems[`emp_${emp.id}`] ? '#ecfdf5' : '#1a8d9b',
                                  color: savedItems[`emp_${emp.id}`] ? '#10b981' : '#ffffff',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  flexShrink: 0,
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.01)'
                                }}
                              >
                                {savedItems[`emp_${emp.id}`] ? (
                                  <>
                                    <CheckCircle2 size={18} />
                                    <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>تم</span>
                                  </>
                                ) : (
                                  <>
                                    <Save size={18} />
                                    <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>حفظ</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Collapsible Report Summary */}
                          {isExpanded && empDailyReport && (
                            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                              {/* Section Header */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1a8d9b' }}>
                                <TrendingUp size={18} />
                                <h4 style={{ margin: 0, fontWeight: 'bold', fontSize: '0.85rem', color: '#1e293b' }}>ملخص التقرير بناءً على جدول مقاييس الوظيفة</h4>
                              </div>

                              {/* Horizontal Table for tasks */}
                              <div style={{ backgroundColor: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', overflowX: 'auto', width: '100%' }}>
                                <table style={{ display: 'table', width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.75rem' }}>
                                  <thead style={{ display: 'table-header-group' }}>
                                    <tr style={{ display: 'table-row', backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontWeight: 'bold' }}>
                                      <th style={{ display: 'table-cell', padding: '0.5rem 0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>الصنف</th>
                                      <th style={{ display: 'table-cell', padding: '0.5rem 0.5rem', textAlign: 'center', whiteSpace: 'nowrap' }}>العملية</th>
                                      <th style={{ display: 'table-cell', padding: '0.5rem 0.5rem', textAlign: 'center', whiteSpace: 'nowrap' }}>المنجز</th>
                                      <th style={{ display: 'table-cell', padding: '0.5rem 0.5rem', textAlign: 'center', whiteSpace: 'nowrap' }}>الحد المطلوب (أدنى-أعلى)</th>
                                    </tr>
                                  </thead>
                                  <tbody style={{ display: 'table-row-group' }}>
                                    {empDailyReport.tasks && empDailyReport.tasks.length > 0 ? (
                                      empDailyReport.tasks.map((t, idx) => (
                                        <tr key={idx} style={{ display: 'table-row', borderBottom: '1px solid #f1f5f9' }}>
                                          {/* الصنف (with department name very small under it) */}
                                          <td style={{ display: 'table-cell', padding: '0.5rem 0.3rem', textAlign: 'right', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', alignItems: 'stretch', textAlign: 'right', width: '100%' }}>
                                              <span style={{ fontWeight: 'extrabold', color: '#1e293b', fontSize: '0.62rem', whiteSpace: 'nowrap', lineHeight: '1.2' }} title={t.name}>
                                                {t.name}
                                              </span>
                                              <span style={{ fontSize: '0.48rem', fontWeight: 'bold', color: '#94a3b8', marginTop: '1px', whiteSpace: 'nowrap' }}>
                                                {t.departmentName || t.department || 'عام'}
                                              </span>
                                            </div>
                                          </td>
                                          {/* العملية */}
                                          <td style={{ display: 'table-cell', padding: '0.5rem 0.2rem', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', color: '#475569', fontSize: '0.5rem', whiteSpace: 'nowrap' }}>
                                            {t.operation}
                                          </td>
                                          {/* المنجز */}
                                          <td style={{ display: 'table-cell', padding: '0.5rem 0.2rem', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', color: '#1a8d9b', fontSize: '0.7rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', textAlign: 'center' }}>
                                              {t.count}
                                            </div>
                                          </td>
                                          {/* الحد المطلوب */}
                                          <td style={{ display: 'table-cell', padding: '0.5rem 0.2rem', textAlign: 'center', verticalAlign: 'middle' }}>
                                            {(t.min > 0 || t.max > 0) ? (
                                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', width: '60px', margin: '0 auto' }}>
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.15rem', width: '100%', fontSize: '0.5rem', fontWeight: 'extrabold', color: '#475569', whiteSpace: 'nowrap' }} dir="rtl">
                                                  <span>{t.min}</span>
                                                  <span>-</span>
                                                  <span>{t.max}</span>
                                                </div>
                                                <div style={{ width: '100%', height: '2px', backgroundColor: '#cbd5e1', borderRadius: '4px', position: 'relative' }}>
                                                  <div style={{ width: '5px', height: '5px', background: '#1a8d9b', borderRadius: '50%', position: 'absolute', right: '-1px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}></div>
                                                  <div style={{ width: '5px', height: '5px', background: '#1a8d9b', borderRadius: '50%', position: 'absolute', left: '-1px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}></div>
                                                </div>
                                              </div>
                                            ) : (
                                              <span style={{ color: '#94a3b8', fontWeight: 'bold' }}>-</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr style={{ display: 'table-row' }}>
                                        <td colSpan="4" style={{ display: 'table-cell', textAlign: 'center', fontStyle: 'italic', color: '#94a3b8', padding: '1.5rem' }}>لا توجد مهام مسجلة.</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>

                              {/* Metadata container */}
                              <div style={{ backgroundColor: '#eef7f8', borderRadius: '20px', padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                {/* Row 1: الهاتف بالأمانات */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid #dbeef0' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155' }}>
                                    <Shield size={16} className="text-[#334155]" />
                                    <span style={{ fontWeight: 'extrabold', fontSize: '0.75rem' }}>الهاتف بالأمانات</span>
                                  </div>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#ffffff',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                    border: '1px solid rgba(0, 0, 0, 0.04)',
                                    borderRadius: '10px',
                                    padding: '0.25rem 0.5rem',
                                    fontWeight: 'extrabold',
                                    fontSize: '0.75rem',
                                    minWidth: '75px',
                                    height: '30px',
                                    color: empDailyReport.phoneSafe ? '#10b981' : '#ef4444'
                                  }}>
                                    {empDailyReport.phoneSafe ? 'نعم' : 'لا'}
                                  </span>
                                </div>

                                {/* Row 2: استخدام الهاتف */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid #dbeef0' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155' }}>
                                    <Smartphone size={16} className="text-[#334155]" />
                                    <span style={{ fontWeight: 'extrabold', fontSize: '0.75rem' }}>استخدام الهاتف</span>
                                  </div>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#ffffff',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                    border: '1px solid rgba(0, 0, 0, 0.04)',
                                    borderRadius: '10px',
                                    padding: '0.25rem 0.5rem',
                                    fontWeight: 'extrabold',
                                    fontSize: '0.75rem',
                                    minWidth: '75px',
                                    height: '30px',
                                    color: empDailyReport.phoneUsages > 0 ? '#ef4444' : '#10b981'
                                  }}>
                                    {empDailyReport.phoneUsages || 0} مرات
                                  </span>
                                </div>

                                {/* Row 3: وقت الدخول */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid #dbeef0' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155' }}>
                                    <LogIn size={16} className="text-[#334155]" />
                                    <span style={{ fontWeight: 'extrabold', fontSize: '0.75rem' }}>وقت الدخول</span>
                                  </div>
                                  <span dir="ltr" style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#ffffff',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                    border: '1px solid rgba(0, 0, 0, 0.04)',
                                    borderRadius: '10px',
                                    padding: '0.25rem 0.5rem',
                                    fontWeight: 'extrabold',
                                    fontSize: '0.75rem',
                                    minWidth: '75px',
                                    height: '30px',
                                    color: '#1a8d9b'
                                  }}>
                                    {(() => {
                                      const attLogs = attendanceLogs.filter(l => matchAttendance(l, emp.id, emp.name, empDailyReport.date));
                                      const attLog = attLogs.find(l => l.timeIn) || attLogs[0];
                                      const tIn = attLog?.timeIn || empDailyReport.timeIn;
                                      if (!tIn) return '---';
                                      if (typeof tIn !== 'string' || !tIn.includes(':')) return String(tIn);
                                      const [h, m] = tIn.split(':');
                                      let hh = parseInt(h, 10); const ampm = hh >= 12 ? 'م' : 'ص'; hh = hh % 12 || 12; return `${ampm} ${hh}:${m}`;
                                    })()}
                                  </span>
                                </div>

                                {/* Row 4: وقت الخروج */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: 'none' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155' }}>
                                    <LogOut size={16} className="text-[#334155]" />
                                    <span style={{ fontWeight: 'extrabold', fontSize: '0.75rem' }}>وقت الخروج</span>
                                  </div>
                                  <span dir="ltr" style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#ffffff',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                    border: '1px solid rgba(0, 0, 0, 0.04)',
                                    borderRadius: '10px',
                                    padding: '0.25rem 0.5rem',
                                    fontWeight: 'extrabold',
                                    fontSize: '0.75rem',
                                    minWidth: '75px',
                                    height: '30px',
                                    color: '#1a8d9b'
                                  }}>
                                    {(() => {
                                      const attLogs = attendanceLogs.filter(l => matchAttendance(l, emp.id, emp.name, empDailyReport.date));
                                      const attLog = attLogs.find(l => l.timeOut) || attLogs[0];
                                      const tOut = attLog?.timeOut || empDailyReport.timeOut;
                                      if (!tOut) return '---';
                                      if (typeof tOut !== 'string' || !tOut.includes(':')) return String(tOut);
                                      const [h, m] = tOut.split(':');
                                      let hh = parseInt(h, 10); const ampm = hh >= 12 ? 'م' : 'ص'; hh = hh % 12 || 12; return `${ampm} ${hh}:${m}`;
                                    })()}
                                  </span>
                                </div>
                              </div>

                              {/* Employee Notes Box */}
                              {empDailyReport.notes && (
                                <div style={{ marginTop: '0.5rem', borderTop: '1px solid #fef08a', backgroundColor: '#fffbeb', borderRadius: '16px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'right', width: '100%' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.5rem', color: '#a16207', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                    <MessageSquare size={20} className="text-[#a16207]" />
                                    <span>ملاحظات الموظف</span>
                                  </div>
                                  <div style={{ color: '#334155', fontSize: '0.85rem', fontWeight: 'bold', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                                    {empDailyReport.notes}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* زر حفظ التقرير واعتماده (منقول قبل القسم ثانياً بناءً على طلب المستخدم) */}
              <button type="submit" className="btn btn-primary w-full h-12 text-lg font-bold mb-8 mt-4 shadow-lg">
                <Save size={20} /> حفظ التقرير واعتماده
              </button>

              {/* ثالثاً: لوحة متابعة الطلبيات والإنتاج المباشر */}
              {currentUserPerms.orders && (
                <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-200">
                  <h4 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2">
                    <Package size={18} className="text-primary" /> ثانياً: لوحة متابعة الطلبيات والإنتاج المباشر
                  </h4>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse bg-white rounded-lg overflow-hidden text-sm">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="p-3 border-b whitespace-nowrap">الطلبية/المهمة</th>
                          <th className="p-3 border-b text-center whitespace-nowrap">القسم</th>
                          <th className="p-3 border-b text-center whitespace-nowrap">الحالة</th>
                          <th className="p-3 border-b text-center whitespace-nowrap">ملاحظات سريعة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(order => {
                          const isStopped = order.executionStatus === 'متوقف' || order.status === 'متوقف';
                          const isLate = order.deliveryDate && new Date(order.deliveryDate) < new Date();

                          const getDepartmentName = () => {
                            if (order.currentDepartment) return order.currentDepartment;
                            const s = order.status || '';
                            if (['جديد', 'مؤكد', 'قيد الانتظار', 'طلب جديد'].includes(s)) return 'إدارة الطلبات';
                            if (s.includes('توصيل') || s.includes('تسليم')) return 'مهمة توصيل';
                            return 'إنتاج قيد الخياطة';
                          };

                          return (
                            <tr key={order.id} className={`border-b last:border-0 transition-colors duration-500 ${savedItems[`order_${order.id}`] ? 'bg-emerald-50' : isStopped ? 'bg-red-50' : isLate && !isStopped ? 'bg-orange-50' : 'hover:bg-slate-50'}`}>
                              <td className="p-3">
                                <div className="font-bold text-primary flex items-center gap-1 text-sm">
                                  {order.isMission ? (
                                    <span className="flex items-center text-orange-500"><Truck size={14} className="ml-1" /> {order.customerName}</span>
                                  ) : (
                                    <>
                                      <span>{order.orderNumber?.toString().includes('-') ? order.orderNumber : `#${parseInt(order.orderNumber)}`}</span>
                                      <span className="text-slate-400 mx-1">-</span>
                                      <span className="text-slate-600 text-xs">{order.customerName}</span>
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <div className="text-sm font-bold text-slate-700">
                                  {order.isMission ? 'مهمة توصيل' : getDepartmentName()}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <div className="text-xs text-slate-500 font-bold">
                                  {order.executionStatus || order.status || 'غير محدد'}
                                </div>
                                {isStopped && order.stopReason && (
                                  <div className="text-xs text-red-600 font-bold mt-1">سبب التوقف: {order.stopReason}</div>
                                )}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    className="input-field h-9 mb-0 text-xs flex-1 px-2"
                                    placeholder="ملاحظات المشرف..."
                                    value={order.supervisorNotes || ''}
                                    onChange={(e) => {
                                      const updatedOrders = orders.map(o => o.id === order.id ? { ...o, supervisorNotes: e.target.value } : o);
                                      setOrders(updatedOrders);
                                      setSavedItems(prev => ({ ...prev, [`order_${order.id}`]: false }));
                                    }}
                                    onBlur={(e) => {
                                      if (order.supervisorNotes !== e.target.value) {
                                        handleUpdateOrderField(order.id, 'supervisorNotes', e.target.value);
                                      }
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className={`transition-all duration-300 ${savedItems[`order_${order.id}`] ? 'bg-emerald-500 border-emerald-500 text-white' : 'hover:bg-primary hover:text-white bg-transparent border-primary text-primary'}`}
                                    style={{
                                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                      padding: '0.25rem', minWidth: '45px', height: '100%', minHeight: '36px',
                                      borderWidth: '1px', borderStyle: 'solid', borderRadius: '8px',
                                      fontWeight: 'bold', cursor: 'pointer', gap: '0.1rem'
                                    }}
                                    title={savedItems[`order_${order.id}`] ? "تم الحفظ" : "حفظ الملاحظة"}
                                    onClick={() => {
                                      handleUpdateOrderField(order.id, 'supervisorNotes', order.supervisorNotes);
                                      setSavedItems(prev => ({ ...prev, [`order_${order.id}`]: true }));
                                    }}
                                  >
                                    {savedItems[`order_${order.id}`] ? <CheckCircle2 size={16} /> : <Save size={16} />}
                                    <span style={{ fontSize: '0.65rem' }}>{savedItems[`order_${order.id}`] ? 'تم' : 'حفظ'}</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {orders.length === 0 && (
                          <tr>
                            <td colSpan="4" className="text-center p-6 text-muted">لا يوجد طلبيات نشطة حالياً.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <MessageSquare size={12} /> أي تعديل تقوم به في هذا الجدول يتم حفظه مباشرة في الطلبية.
                  </p>
                </div>
              )}

              {/* رابعاً: الملاحظات اليومية الشاملة */}
              <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-200">
                <h4 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2">
                  <FileText size={18} className="text-primary" /> ملاحظات يومية حول المعلقات وسير العمل
                </h4>
                <textarea
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm min-h-[100px] focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  placeholder="اكتب ملاحظاتك كمدير أو مشرف عن أسباب تعليق بعض الطلبات أو أي حدث مهم لليوم..."
                  value={attendanceNotes}
                  onChange={(e) => setAttendanceNotes(e.target.value)}
                ></textarea>
              </div>

              {/* مسافة سفلية بديلة عن الزر القديم */}
              <div className="h-24 mt-4"></div>
            </form>
          );
        })()
      )}

      {activeTab === 'history' && (
        <div className="glass-card">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 border-b pb-4 no-print">
            <h3 className="text-xl font-bold mb-0 flex items-center gap-2 shrink-0">
              <ClipboardList className="text-primary" size={22} />
              <span>سجل تقارير المشرفين</span>
            </h3>

            <div className="flex flex-wrap items-center gap-3 flex-1 justify-end">
              {/* Mode Toggle */}
              <div style={{ display: 'flex', backgroundColor: '#ffffff', borderRadius: '10px', padding: '4px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', height: '44px', alignItems: 'center', gap: '4px' }}>
                 <button
                    type="button"
                    onClick={() => setDateMode('day')}
                    style={{
                      padding: '6px 14px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: dateMode === 'day' ? '#e0f2fe' : 'transparent',
                      color: dateMode === 'day' ? '#0284c7' : '#64748b',
                      transition: 'all 0.2s'
                    }}
                 >
                    يومي
                 </button>
                 <button
                    type="button"
                    onClick={() => setDateMode('month')}
                    style={{
                      padding: '6px 14px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: dateMode === 'month' ? '#e0f2fe' : 'transparent',
                      color: dateMode === 'month' ? '#0284c7' : '#64748b',
                      transition: 'all 0.2s'
                    }}
                 >
                    شهري
                 </button>
                 <button
                    type="button"
                    onClick={() => setDateMode('range')}
                    style={{
                      padding: '6px 14px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: dateMode === 'range' ? '#e0f2fe' : 'transparent',
                      color: dateMode === 'range' ? '#0284c7' : '#64748b',
                      transition: 'all 0.2s'
                    }}
                 >
                    فترة
                 </button>
              </div>

              {/* Month Picker */}
              {dateMode === 'month' && (
                <MonthPicker selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />
              )}

              {/* Single Date Picker */}
              {dateMode === 'day' && (
                <div className="input-group mb-0 shrink-0 w-[140px]">
                  <Flatpickr
                    className="input-field h-10 text-sm font-bold text-slate-800 bg-slate-50 text-center w-full focus:bg-white border border-slate-200 rounded-lg"
                    value={selectedDate}
                    onChange={([d]) => setSelectedDate(getLocalDateStr(d))}
                    options={{ dateFormat: 'Y-m-d' }}
                    placeholder="اختر اليوم"
                  />
                </div>
              )}

              {/* Date Range Pickers */}
              {dateMode === 'range' && (
                <>
                  <div className="input-group mb-0 shrink-0 w-[120px]">
                    <label className="text-xs font-bold text-slate-700 mb-1 block text-center">من تاريخ</label>
                    <Flatpickr className="input-field h-10 text-sm font-bold text-slate-800 bg-slate-50 text-center w-full focus:bg-white" value={dateFrom} onChange={([d]) => setDateFrom(getLocalDateStr(d))} options={{ dateFormat: 'Y-m-d' }} placeholder="الكل" />
                  </div>

                  <div className="input-group mb-0 shrink-0 w-[120px]">
                    <label className="text-xs font-bold text-slate-700 mb-1 block text-center">إلى تاريخ</label>
                    <Flatpickr className="input-field h-10 text-sm font-bold text-slate-800 bg-slate-50 text-center w-full focus:bg-white" value={dateTo} onChange={([d]) => setDateTo(getLocalDateStr(d))} options={{ dateFormat: 'Y-m-d' }} placeholder="الكل" />
                  </div>
                </>
              )}

              {isSuperAdmin ? (
                <div className="input-group mb-0 shrink-0 w-[140px]">
                  <label className="text-xs font-bold text-slate-700 mb-1 block text-center">المشرف</label>
                  <select
                    className="input-field py-2 px-3 text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer focus:bg-white transition-all w-full text-center"
                    value={filterSupervisor}
                    onChange={(e) => setFilterSupervisor(e.target.value)}
                  >
                    <option value="" className="font-bold">الكل</option>
                    {supervisorsList.map((name, i) => (
                      <option key={i} value={name} className="font-bold">{name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="input-group mb-0 shrink-0 w-[140px]">
                  <label className="text-xs font-bold text-slate-700 mb-1 block text-center">المشرف</label>
                  <input
                    type="text"
                    className="input-field py-2 px-3 text-sm font-bold text-slate-800 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed w-full text-center"
                    value={user?.name || ''}
                    disabled
                  />
                </div>
              )}

              <div className="input-group mb-0 shrink-0 w-[140px]">
                <label className="text-xs font-bold text-slate-700 mb-1 block text-center">حالة التقرير</label>
                <select
                  className="input-field py-2 px-3 text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer focus:bg-white transition-all w-full text-center"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="" className="font-bold">الكل</option>
                  <option value="قيد المراجعة" className="font-bold">قيد المراجعة</option>
                  <option value="معتمد" className="font-bold">معتمد</option>
                  <option value="مرفوض/مُعاد" className="font-bold">مرفوض/مُعاد</option>
                </select>
              </div>
            </div>
          </div>

          <div className="table-container">
            <TableErrorBoundary>
              <table>
                <thead>
                  <tr>
                    <th onClick={() => handleSupSort('date')} className="cursor-pointer hover:bg-slate-50 transition-colors">التاريخ {getSupSortIcon('date')}</th>
                    <th onClick={() => handleSupSort('supervisorName')} className="cursor-pointer hover:bg-slate-50 transition-colors">المشرف {getSupSortIcon('supervisorName')}</th>

                    <th onClick={() => handleSupSort('employeeEvaluations')} className="cursor-pointer hover:bg-slate-50 transition-colors">تقييم الموظفين {getSupSortIcon('employeeEvaluations')}</th>
                    <th onClick={() => handleSupSort('status')} className="cursor-pointer hover:bg-slate-50 transition-colors">حالة التقرير {getSupSortIcon('status')}</th>
                    <th className="text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleReports.map((report, index) => (
                    <tr key={`${report?.id || 'no-id'}-${index}`}>
                      <td className="font-bold">{report.date}</td>
                      <td>{report.supervisorName}</td>

                      <td>تم تقييم {report.employeeEvaluations?.length || 0} موظف</td>
                      <td>
                        <span className={`badge ${(!report.status || report.status === 'قيد المراجعة') ? 'bg-blue-100 text-blue-700' : report.status === 'معتمد' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {report.status || 'قيد المراجعة'}
                        </span>
                      </td>
                      <td>
                        <div className="flex justify-center gap-2">
                          <button className="action-btn info" style={{ backgroundColor: '#f0f9ff' }} onClick={() => handleViewReport(report)} title="عرض التفاصيل">
                            <Eye size={18} />
                          </button>
                          {!isSuperAdmin && report.status !== 'معتمد' && (
                            <button className="action-btn info" onClick={() => handleEditReport(report)} title="تعديل التقرير">
                              <Edit size={18} />
                            </button>
                          )}
                          {isSuperAdmin && report.status !== 'معتمد' && report.status !== 'مرفوض/مُعاد' && (
                            <button className="action-btn success" onClick={() => handleChangeReportStatus(report, 'معتمد')} title="اعتماد التقرير ومنع التعديل">
                              <Check size={18} />
                            </button>
                          )}
                          {isSuperAdmin && report.status !== 'مرفوض/مُعاد' && (
                            <button className="action-btn danger" onClick={() => handleChangeReportStatus(report, 'مرفوض/مُعاد')} title={report.status === 'معتمد' ? "إلغاء الاعتماد وإعادته للمشرف" : "رفض التقرير وإعادته للمشرف"}>
                              <X size={18} />
                            </button>
                          )}
                          {isSuperAdmin && (
                            <button className="action-btn danger" onClick={() => handleDeleteReport(report)} title="حذف التقرير">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visibleReports.length === 0 && (
                    <tr><td colSpan="5" className="text-center text-muted p-4">لا يوجد تقارير مطابقة</td></tr>
                  )}
                </tbody>
              </table>
            </TableErrorBoundary>
          </div>
        </div>
      )}
    </div>
  );
};
export default function AdminSupervisorReportsWrapper(props) {
  return (
    <TableErrorBoundary>
      <AdminSupervisorReports {...props} />
    </TableErrorBoundary>
  );
}
