import React, { useState, useEffect } from 'react';
import HRSalaryReports from '../hr/HRSalaryReports';
import { createPortal } from 'react-dom';
import { getReports, getEmployees, getDepartments, saveReport, deleteReport, getSalesOrders, getOrders, getCustomers, getMissions, getStock, getReportsByDateRange, getSalesOrdersByDateRange, getOrdersByDateRange, getMissionsByDateRange, getHRAttendanceByDateRange, getHRViolationsByDateRange, getSupervisorTasksByDateRange, getSupervisorReportsByDateRange, getMissingPunches, updateMissingPunchStatus, createNotification, getGlobalSettings, canPerformStockAction, getStockVouchers, getStocktakes, saveSupervisorReport, deleteSupervisorReport } from '../../store';
import { sendWhatsAppNotification, sendTemplatedWhatsAppNotification } from '../../utils/whatsappService';
import { FileText, Calendar, Search, Printer, List, Trash2, ShoppingCart, ShoppingBag, Users, X, Filter, Eye, Edit2, Plus, Minus, Trash, ArrowUpDown, Truck, Package, Building2, ClipboardList, UserCheck, FileSpreadsheet, FileDown, AlertTriangle, CheckCircle, User, ArrowLeft, Download, Upload, Layers, Clock, RotateCcw } from 'lucide-react';
import SewingMachineIcon from '../../components/SewingMachineIcon';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import Flatpickr from 'react-flatpickr';
import { Arabic } from 'flatpickr/dist/l10n/ar.js';
import 'flatpickr/dist/themes/light.css';
import html2pdf from 'html2pdf.js';
import { EmployeesReportTab } from './reports/EmployeesReportTab';
import { SalesOrdersReportTab } from './reports/SalesOrdersReportTab';
import { ProductionReportTab } from './reports/ProductionReportTab';
import { DeliveryReportTab } from './reports/DeliveryReportTab';
import { StockReportTab } from './reports/StockReportTab';
import { MissingPunchesReportTab } from './reports/MissingPunchesReportTab';
import { TasksReportTab } from './reports/TasksReportTab';
import { SupervisorsReportTab } from './reports/SupervisorsReportTab';
import { CustomersReportTab } from './reports/CustomersReportTab';
import HRDateFilter from '../../components/ui/HRDateFilter';
import Select from 'react-select';
const MySwal = withReactContent(Swal);

const JORDANIAN_CITIES = ['عمان', 'الزرقاء', 'إربد', 'العقبة', 'السلط', 'مادبا', 'الكرك', 'الطفيلة', 'معان', 'جرش', 'عجلون', 'المفرق'];

const getLocalDateStr = (d) => {
  if (!d) return '';
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const getMissionTypeLabel = (mission) => {
  if (!mission) return '---';
  if (mission.type === 'أخرى' && mission.customType) {
    return `أخرى - ${mission.customType}`;
  }
  return mission.type || '---';
};

const getStockItemStatus = (item) => {
  const quantity = Number(item?.quantity || 0);
  const minLimit = Number(item?.minLimit || 0);
  if (quantity <= 0) return 'ناقص';
  if (quantity <= minLimit) return 'يحتاج متابعة';
  return 'متوفر';
};

const PRINT_ROW_LIMIT_OPTIONS = [
  { value: 'all', label: 'كل الصفوف' },
  { value: '10', label: 'أول 10 صفوف' },
  { value: '25', label: 'أول 25 صفاً' },
  { value: '50', label: 'أول 50 صفاً' }
];

const DEFAULT_PRINT_CONFIGS = {
  employees: { selectedColumns: ['date', 'userName', 'department', 'timeIn', 'timeOut', 'phoneUsages', 'tasksCount', 'finalScore'], rowLimit: 'all' },
  sales: { selectedColumns: ['orderDate', 'orderNumber', 'customerName', 'createdBy', 'lastActionBy', 'itemsCount', 'topItems', 'status'], rowLimit: 'all' },
  production: { selectedColumns: ['orderDate', 'orderNumber', 'customerName', 'createdBy', 'lastActionBy', 'productName', 'quantity', 'status'], rowLimit: 'all' },
  delivery: { selectedColumns: ['createdAt', 'type', 'sourceEntity', 'targetEntity', 'assignedEmployeeName', 'dueDate', 'status'], rowLimit: 'all' },
  stock: { selectedColumns: ['itemNumber', 'name', 'variant', 'category', 'warehouse', 'quantity', 'unit', 'status'], rowLimit: 'all' },
  hr: { selectedColumns: ['date', 'employeeName', 'type', 'details'], rowLimit: 'all' },
  tasks: { selectedColumns: ['createdAt', 'supervisorName', 'title', 'dueDate', 'status'], rowLimit: 'all' },
  supervisors: { selectedColumns: ['date', 'supervisorName', 'employeeEvaluations', 'status'], rowLimit: 'all' },
  customers: { selectedColumns: ['name', 'phone', 'city', 'location', 'sector', 'status'], rowLimit: 'all' },
  missingpunches: { selectedColumns: ['date', 'employeeName', 'status'], rowLimit: 'all' }
};

const PRINT_ROWS_PER_PAGE_BY_TAB = {
  employees: 27,
  sales: 27,
  production: 27,
  delivery: 27,
  stock: 27,
  hr: 27,
  tasks: 27,
  supervisors: 27,
  customers: 27
};

const limitRowsForPrint = (rows, rowLimit) => {
  if (rowLimit === 'all') return rows;
  const numericLimit = Number(rowLimit);
  if (!numericLimit || Number.isNaN(numericLimit)) return rows;
  return rows.slice(0, numericLimit);
};

const chunkRows = (rows, size) => {
  if (!rows.length) return [[]];
  const pages = [];
  for (let index = 0; index < rows.length; index += size) {
    pages.push(rows.slice(index, index + size));
  }
  return pages;
};

const getStockIdentityKey = (item) => `${String(item?.itemNumber || '').trim()}__${String(item?.name || '').trim()}`.toLowerCase();

const getStockVariantLabel = (item) => {
  const variantParts = [
    item?.spec,
    item?.color,
    item?.detail,
    item?.details,
    item?.model,
    item?.location
  ].filter(Boolean);
  return variantParts.length ? variantParts.join(' / ') : 'بدون تفصيل';
};

const AdminReports = ({ user, notificationTarget }) => {
  const [activeReportTab, setActiveReportTab] = useState('employees');

  const [reports, setReports] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState({});
  const [jobTitles, setJobTitles] = useState([]);
  const [salesStatuses, setSalesStatuses] = useState([]);
  const [missionStatuses, setMissionStatuses] = useState([]);
  const [productionStatuses, setProductionStatuses] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [productionOrders, setProductionOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [deliveryMissions, setDeliveryMissions] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [selectedStockSubTab, setSelectedStockSubTab] = useState('items');
  const [stockVouchers, setStockVouchers] = useState([]);
  const [stocktakes, setStocktakes] = useState([]);
  const [missingPunches, setMissingPunches] = useState([]);
  const [hrAttendance, setHRAttendance] = useState([]);
  const [hrViolations, setHRViolations] = useState([]);
  const [supervisorTasks, setSupervisorTasks] = useState([]);
  const [supervisorReports, setSupervisorReports] = useState([]);

  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedJobDepartment, setSelectedJobDepartment] = useState('');
  const [selectedJobTitle, setSelectedJobTitle] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [customerSectors, setCustomerSectors] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedSalesRep, setSelectedSalesRep] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [defaultDateFrom, setDefaultDateFrom] = useState('');
  const [isDefaultDate, setIsDefaultDate] = useState(true);
  const [dateTo, setDateTo] = useState('');
  const [filterOrderNumber, setFilterOrderNumber] = useState('');
  const [filterCreatedBy, setFilterCreatedBy] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showPrintConfigModal, setShowPrintConfigModal] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [printConfigs, setPrintConfigs] = useState(() => ({ ...DEFAULT_PRINT_CONFIGS }));
  const [printDraftConfig, setPrintDraftConfig] = useState(DEFAULT_PRINT_CONFIGS.employees);
  const [printFilterDraft, setPrintFilterDraft] = useState(null);
  const [pendingExportAction, setPendingExportAction] = useState(null);
  const [exportActionToRun, setExportActionToRun] = useState(null);

  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'descending' });
  
  // COMPLETELY ISOLATED SORTING FOR EMPLOYEE REPORTS
  const [empSortKey, setEmpSortKey] = useState('date');
  const [empSortDir, setEmpSortDir] = useState('desc');

  // Isolating Employee Reports inline filter bar states
  const [empDateMode, setEmpDateMode] = useState('month');
  const [empSelectedDate, setEmpSelectedDate] = useState(getLocalDateStr(new Date()));
  const [empSelectedMonth, setEmpSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [empStartDate, setEmpStartDate] = useState(getLocalDateStr(new Date()));
  const [empEndDate, setEmpEndDate] = useState(getLocalDateStr(new Date()));

  const handleEmpSort = (key) => {
    if (empSortKey === key) {
      setEmpSortDir(empSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setEmpSortKey(key);
      setEmpSortDir('asc');
    }
  };

  const getEmpSortIcon = (key) => {
    if (empSortKey !== key) return <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '4px' }}>↕</span>;
    return empSortDir === 'asc' 
      ? <span style={{ color: 'var(--primary)', fontWeight: 'bold', marginLeft: '4px' }}>↑</span>
      : <span style={{ color: 'var(--primary)', fontWeight: 'bold', marginLeft: '4px' }}>↓</span>;
  };

  const handleTabChange = (tab) => {
    setActiveReportTab(tab);
    
    // Reset filters
    setSelectedEmployee('');
    setSelectedJobDepartment('');
    setSelectedJobTitle('');
    setSelectedCustomer('');
    setSelectedCategory('');
    setSelectedSector('');
    setSelectedCity('');
    setSelectedStatus('');
    setSelectedType('');
    setSelectedSalesRep('');
    setSelectedWarehouse('');
    setDateFrom('');
    setDateTo('');
    setFilterOrderNumber('');
    setFilterCreatedBy('');
    setSearchTerm('');
    setIsDefaultDate(true);

    switch (tab) {
      case 'employees': 
        setEmpSortKey('date');
        setEmpSortDir('desc');
        break;
      case 'sales': setSortConfig({ key: 'orderDate', direction: 'descending' }); break;
      case 'production': setSortConfig({ key: 'orderDate', direction: 'descending' }); break;
      case 'delivery': setSortConfig({ key: 'createdAt', direction: 'descending' }); break;
      case 'stock': setSortConfig({ key: 'itemNumber', direction: 'ascending' }); break;
      case 'customers': setSortConfig({ key: 'customerNumber', direction: 'ascending' }); break;
      default: setSortConfig({ key: 'date', direction: 'descending' });
    }
  };

  const handleVoucherRedirect = (type) => {
    const event = new CustomEvent('switchAdminTab', {
      detail: {
        tab: 'stock',
        action: 'viewVouchers',
        data: { type }
      }
    });
    window.dispatchEvent(event);
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-muted" />;
    return sortConfig.direction === 'ascending' 
      ? <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>↑</span>
      : <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>↓</span>;
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'منتهي': return 'badge-success';
      case 'لم يتم التنفيذ': return 'badge-danger';
      case 'ملغي': return 'badge-danger';
      case 'مرحلة القص': return 'badge-cutting';
      case 'مرحلة الخياطة': return 'badge-sewing';
      case 'مرحلة التغليف': return 'badge-packaging';
      case 'مرحلة المستودع': return 'badge-warehouse';
      case 'تم التوصيل': return 'badge-success';
      case 'التحضير': return 'badge-info';
      case 'قيد التوصيل': return 'badge-delivery';
      case 'تم تسليمها للتوصيل': return 'badge-delivery';
      case 'تم تأجيل التوصيل': return 'badge-warning';
      case 'نفد': return 'badge-danger';
      case 'منخفض': return 'badge-warning';
      case 'متوفر': return 'badge-success';
      default: return 'badge-info';
    }
  };

  const getSortedData = (data, tabName) => {
    let key = sortConfig.key;
    let direction = sortConfig.direction;

    if (!key || activeReportTab !== tabName) return data;

    try {
      const sorted = [...data].sort((a, b) => {
        let aVal = a ? a[key] : undefined;
        let bVal = b ? b[key] : undefined;

        if (tabName === 'employees') {
          if (key === 'phone') {
            aVal = a?.phoneUsages || 0;
            bVal = b?.phoneUsages || 0;
          } else if (key === 'tasksCompleted') {
            aVal = a?.tasks?.length || 0;
            bVal = b?.tasks?.length || 0;
          }
        }

        if (tabName === 'delivery') {
          if (key === 'type') {
            aVal = getMissionTypeLabel(a);
            bVal = getMissionTypeLabel(b);
          }
        }

        if (tabName === 'stock' && key === 'status') {
          aVal = getStockItemStatus(a);
          bVal = getStockItemStatus(b);
        }

        // Date handling
        if (key === 'date' || key === 'orderDate' || key === 'createdAt') {
          const dateA = new Date(aVal || 0).getTime();
          const dateB = new Date(bVal || 0).getTime();
          if (!isNaN(dateA) && !isNaN(dateB)) {
            if (dateA < dateB) return direction === 'ascending' ? -1 : 1;
            if (dateA > dateB) return direction === 'ascending' ? 1 : -1;
            return 0;
          }
        }

        // Number handling (protect against NaN)
        if (typeof aVal === 'number' || typeof bVal === 'number') {
          const numA = Number(aVal) || 0;
          const numB = Number(bVal) || 0;
          if (numA < numB) return direction === 'ascending' ? -1 : 1;
          if (numA > numB) return direction === 'ascending' ? 1 : -1;
          return 0;
        }

        // String handling (guarantees transitivity)
        const strA = String(aVal || '').toLowerCase();
        const strB = String(bVal || '').toLowerCase();
        const cmp = strA.localeCompare(strB, 'ar', { numeric: true });
        return direction === 'ascending' ? cmp : -cmp;
      });
      return sorted;
    } catch (err) {
      console.error('Sorting error in AdminReports:', err);
      return data;
    }
  };

  const fetchDynamicData = async (from, to, isDefault = false) => {
    setLoading(true);
    try {
      let repFrom = from, salesFrom = from, prodFrom = from, missionsFrom = from, supervisorFrom = from;
      
      if (isDefault) {
        const today = new Date();
        
        const twoDaysAgo = new Date(today);
        twoDaysAgo.setDate(today.getDate() - 2);
        repFrom = getLocalDateStr(twoDaysAgo);

        const fiveDaysAgo = new Date(today);
        fiveDaysAgo.setDate(today.getDate() - 5);
        salesFrom = getLocalDateStr(fiveDaysAgo);
        prodFrom = salesFrom;
        supervisorFrom = salesFrom;
        
        const tenDaysAgo = new Date(today);
        tenDaysAgo.setDate(today.getDate() - 10);
        missionsFrom = getLocalDateStr(tenDaysAgo);
      }

      const [reps, sales, prod, missions, attLogs, supTasks, supReps, settings] = await Promise.all([
        getReportsByDateRange(repFrom, to),
        getSalesOrdersByDateRange(salesFrom, to),
        getOrdersByDateRange(prodFrom, to),
        getMissionsByDateRange(missionsFrom, to),
        getHRAttendanceByDateRange(repFrom, to),
        getSupervisorTasksByDateRange(supervisorFrom, to),
        getSupervisorReportsByDateRange(supervisorFrom, to),
        getGlobalSettings()
      ]);
      setReports(reps);
      setSalesOrders(sales);
      setProductionOrders(prod);
      setDeliveryMissions(missions);
      setHRAttendance(attLogs || []);
      setSupervisorTasks(supTasks || []);
      setSupervisorReports(supReps || []);
      setGlobalSettings(settings || {});
    } catch (err) {
      console.error("Error fetching dynamic data:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        const [emps, custs, stock, mpData, fetchedSettings, vouchers, takes] = await Promise.all([
          getEmployees(),
          getCustomers(),
          getStock(),
          getMissingPunches(),
          getGlobalSettings(),
          getStockVouchers(),
          getStocktakes()
        ]);
        setEmployees(emps.filter(e => e.role !== 'admin' && e.level !== 'admin'));
        setDepartments(fetchedSettings?.departmentsList || []);
        setJobTitles(fetchedSettings?.jobTitles || []);
        setSalesStatuses(fetchedSettings?.salesStatuses || []);
        setMissionStatuses(fetchedSettings?.missionStatuses || []);
        setProductionStatuses(fetchedSettings?.productionStatuses || []);
        setCustomerSectors(fetchedSettings?.customerSectors || []);
        setCustomers(custs || []);
        setStockItems(stock || []);
        setStockVouchers(vouchers || []);
        setStocktakes(takes || []);
        setMissingPunches(mpData || []);
      } catch (err) {
        console.error("Error fetching static data:", err);
      }
    };
    
    fetchStaticData();

    setDefaultDateFrom('');
    setDateFrom('');
    setIsDefaultDate(true);

    fetchDynamicData('', '', true);
  }, []);

  useEffect(() => {
    if (activeReportTab === 'employees') {
      setSortConfig({ key: 'date', direction: 'descending' });
    } else if (activeReportTab === 'sales' || activeReportTab === 'production') {
      setSortConfig({ key: 'orderDate', direction: 'descending' });
    } else if (activeReportTab === 'delivery') {
      setSortConfig({ key: 'createdAt', direction: 'descending' });
    } else if (activeReportTab === 'stock') {
      setSortConfig({ key: 'itemNumber', direction: 'ascending' });
    } else if (activeReportTab === 'customers') {
      setSortConfig({ key: 'customerNumber', direction: 'ascending' });
    } else {
      setSortConfig({ key: '', direction: 'ascending' });
    }
  }, [activeReportTab]);

  // Sync dates and fetch data when Employee Reports tab filters change
  useEffect(() => {
    if (activeReportTab !== 'employees') return;

    let from = '';
    let to = '';

    if (empDateMode === 'day') {
      from = empSelectedDate;
      to = empSelectedDate;
    } else if (empDateMode === 'month') {
      const [year, month] = empSelectedMonth.split('-');
      from = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
      to = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    } else if (empDateMode === 'range') {
      from = empStartDate;
      to = empEndDate;
    }

    setDateFrom(from);
    setDateTo(to);
    setIsDefaultDate(false);

    fetchDynamicData(from, to, false);
  }, [activeReportTab, empDateMode, empSelectedDate, empSelectedMonth, empStartDate, empEndDate]);

  useEffect(() => {
    if (!notificationTarget || notificationTarget.moduleKey !== 'reports' || loading || reports.length === 0) return;

    handleTabChange('employees');

    const matchedReport = reports.find((report) => (
      (notificationTarget.reportId && report.id === notificationTarget.reportId) ||
      (
        (!notificationTarget.reportId || !report.id) &&
        (!notificationTarget.reportDate || report.date === notificationTarget.reportDate) &&
        (!notificationTarget.reportUserId || String(report.userId) === String(notificationTarget.reportUserId)) &&
        (!notificationTarget.reportUserName || report.userName === notificationTarget.reportUserName)
      )
    ));

    if (matchedReport) {
      handleViewReportDetails(matchedReport);
    }
  }, [notificationTarget, loading, reports]);

  useEffect(() => {
    if (!pendingExportAction) return undefined;
    const exportTimer = window.setTimeout(() => {
      if (pendingExportAction === 'print') {
        window.print();
      } else if (pendingExportAction === 'excel') {
        handleExportExcel();
      } else if (pendingExportAction === 'word') {
        handleExportWord();
      } else if (pendingExportAction === 'pdf') {
        handleExportPDF();
      }
      setPendingExportAction(null);
    }, 180);
    return () => window.clearTimeout(exportTimer);
  }, [pendingExportAction, activeReportTab, printConfigs, selectedEmployee, selectedJobDepartment, selectedJobTitle, selectedCustomer, selectedCategory, selectedStatus, dateFrom, dateTo, filterOrderNumber, filterCreatedBy, searchTerm]);

  // Filter Logics
  const filteredMissingPunches = missingPunches.filter(mp => {
    const empObj = employees.find(e => e.id === mp.employeeId || e.name === mp.employeeName);
    const empJobDept = empObj ? (empObj.employeeType || empObj.departmentName) : '';
    const empJobTitle = empObj ? empObj.jobTitle : '';

    const matchEmp = selectedEmployee ? (mp.employeeId === selectedEmployee || (empObj && empObj.id === selectedEmployee) || mp.employeeName === selectedEmployee) : true;
    const matchJobDept = selectedJobDepartment ? empJobDept === selectedJobDepartment : true;
    const matchJobTitle = selectedJobTitle ? empJobTitle === selectedJobTitle : true;
    const matchDateFrom = dateFrom ? mp.date >= dateFrom : true;
    const matchDateTo = dateTo ? mp.date <= dateTo : true;
    const matchSearch = searchTerm ? String(mp.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) : true;
    return matchEmp && matchJobDept && matchJobTitle && matchDateFrom && matchDateTo && matchSearch;
  });


  const handleApproveMissingPunch = async (punch) => {
    try {
      MySwal.fire({
        title: 'جاري الحفظ...',
        allowOutsideClick: false,
        didOpen: () => MySwal.showLoading()
      });
      await updateMissingPunchStatus(punch.id, 'موافق عليه', user?.name || 'Admin', punch);
      
      const globalSettings = await getGlobalSettings();
      const modSettings = globalSettings?.notifications?.missingPunch || {};

      await createNotification({
        settingKey: 'missingPunch',
        targetEmployeeId: punch.employeeId,
        moduleKey: 'reports',
        moduleLabel: 'تقارير الدوام',
        title: 'الموافقة على الختمة الناقصة',
        message: `تمت الموافقة على طلب الختمة الناقصة الخاصة بك بتاريخ ${punch.date}`,
        target: { tab: 'missingpunches' }
      });
      
      if (modSettings.whatsapp) {
        try {
          const emp = employees.find(e => e.id === punch.employeeId || e.name === punch.employeeName);
          if (emp && emp.phone) {
            const msg = `مرحباً ${emp.name}،\nتمت الموافقة على طلب الختمة الناقصة الخاصة بك بتاريخ ${punch.date}.\n-- الإدارة`;
            await sendWhatsAppNotification(emp.phone, msg, 'missing_punches');
          }
        } catch(err) { console.error('WhatsApp Error:', err); }
      }

      MySwal.fire('نجاح', 'تمت الموافقة وتم إضافة الختمة إلى الحضور والانصراف', 'success');
      // refresh data
      const updatedPunches = missingPunches.map(p => p.id === punch.id ? { ...p, status: 'موافق عليه' } : p);
      setMissingPunches(updatedPunches);
    } catch (err) {
      console.error(err);
      MySwal.fire('خطأ', 'حدث خطأ أثناء حفظ التحديث', 'error');
    }
  };

  const handleRejectMissingPunch = async (punch) => {
    try {
      const result = await MySwal.fire({
        title: 'تأكيد الرفض',
        text: 'هل أنت متأكد من رفض طلب الختمة الناقصة؟',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'نعم، ارفض الطلب',
        cancelButtonText: 'إلغاء'
      });
      if (result.isConfirmed) {
        MySwal.fire({
          title: 'جاري الحفظ...',
          allowOutsideClick: false,
          didOpen: () => MySwal.showLoading()
        });
        await updateMissingPunchStatus(punch.id, 'مرفوض', user?.name || 'Admin');
        
        const globalSettings = await getGlobalSettings();
        const modSettings = globalSettings?.notifications?.missingPunch || {};

        await createNotification({
          settingKey: 'missingPunch',
          targetEmployeeId: punch.employeeId,
          moduleKey: 'reports',
          moduleLabel: 'تقارير الدوام',
          title: 'رفض طلب الختمة الناقصة',
          message: `تم رفض طلب الختمة الناقصة الخاصة بك بتاريخ ${punch.date}`,
          target: { tab: 'missingpunches' }
        });
        
        if (modSettings.whatsapp) {
          try {
            const emp = employees.find(e => e.id === punch.employeeId || e.name === punch.employeeName);
            if (emp && emp.phone) {
              const msg = `مرحباً ${emp.name}،\nتم رفض طلب الختمة الناقصة الخاصة بك بتاريخ ${punch.date}.\n-- الإدارة`;
              await sendWhatsAppNotification(emp.phone, msg, 'missing_punches');
            }
          } catch(err) { console.error('WhatsApp Error:', err); }
        }

        MySwal.fire('تم', 'تم رفض الطلب بنجاح', 'success');
        const updatedPunches = missingPunches.map(p => p.id === punch.id ? { ...p, status: 'مرفوض' } : p);
        setMissingPunches(updatedPunches);
      }
    } catch (err) {
      console.error(err);
      MySwal.fire('خطأ', 'حدث خطأ أثناء الحفظ', 'error');
    }
  };
  const getMissingPunchesStats = () => {
    const total = filteredMissingPunches.length;
    const approved = filteredMissingPunches.filter(p => p.status === 'موافق عليه').length;
    const rejected = filteredMissingPunches.filter(p => p.status === 'مرفوض').length;
    
    // Most submitting employees
    const empCounts = {};
    filteredMissingPunches.forEach(p => {
      empCounts[p.employeeName] = (empCounts[p.employeeName] || 0) + 1;
    });
    const topEmployees = Object.entries(empCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
      
    return { total, approved, rejected, topEmployees };
  };
  const mpStats = getMissingPunchesStats();

  const filteredEmployeesReports = reports.filter(r => {
    if (r.isDeletedByAdmin) return false;
    const empObj = employees.find(e => e.id === r.userId || e.name === r.userName);
    const empJobDept = empObj ? (empObj.employeeType || empObj.departmentName) : '';
    const empJobTitle = empObj ? empObj.jobTitle : '';

    const matchEmp = selectedEmployee ? (r.userId === selectedEmployee || r.employeeId === selectedEmployee || (empObj && empObj.id === selectedEmployee) || r.userName === selectedEmployee) : true;
    const matchJobDept = selectedJobDepartment ? empJobDept === selectedJobDepartment : true;
    const matchJobTitle = selectedJobTitle ? empJobTitle === selectedJobTitle : true;
    const matchDateFrom = dateFrom ? r.date >= dateFrom : true;
    const matchDateTo = dateTo ? r.date <= dateTo : true;
    const matchSearch = searchTerm ? String(r.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) : true;
    return matchEmp && matchJobDept && matchJobTitle && matchDateFrom && matchDateTo && matchSearch;
  });

  const filteredSalesOrders = salesOrders.filter(o => {
    const matchCust = selectedCustomer ? o.customerId === selectedCustomer : true;
    const matchStatus = selectedStatus ? o.status === selectedStatus : true;
    const matchDateFrom = dateFrom ? o.orderDate >= dateFrom : true;
    const matchDateTo = dateTo ? o.orderDate <= dateTo : true;
    const matchOrderNum = filterOrderNumber ? (o.orderNumber || '').toString().includes(filterOrderNumber) : true;
    const matchCreatedBy = filterCreatedBy ? (o.createdBy || '').includes(filterCreatedBy) : true;
    const matchSearch = searchTerm ? (String(o.orderNumber || '').includes(searchTerm) || String(o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())) : true;
    return matchCust && matchStatus && matchDateFrom && matchDateTo && matchOrderNum && matchCreatedBy && matchSearch;
  });

  const filteredProductionOrders = productionOrders.filter(o => {
    const matchCust = selectedCustomer ? o.customerId === selectedCustomer : true;
    const matchStatus = selectedStatus ? o.status === selectedStatus : true;
    const matchDateFrom = dateFrom ? o.orderDate >= dateFrom : true;
    const matchDateTo = dateTo ? o.orderDate <= dateTo : true;
    const matchOrderNum = filterOrderNumber ? (o.orderNumber || '').toString().includes(filterOrderNumber) : true;
    const matchCreatedBy = filterCreatedBy ? (o.createdBy || '').includes(filterCreatedBy) : true;
    const matchSearch = searchTerm ? (String(o.orderNumber || '').includes(searchTerm) || String(o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(o.productName || '').toLowerCase().includes(searchTerm.toLowerCase())) : true;
    return matchCust && matchStatus && matchDateFrom && matchDateTo && matchOrderNum && matchCreatedBy && matchSearch;
  });

  const filteredDeliveryMissions = deliveryMissions.filter((mission) => {
    const missionDate = (mission.createdAt || '').split('T')[0];
    const missionType = getMissionTypeLabel(mission);
    const matchStatus = selectedStatus ? mission.status === selectedStatus : true;
    const matchDateFrom = dateFrom ? missionDate >= dateFrom : true;
    const matchDateTo = dateTo ? missionDate <= dateTo : true;
    const matchCreatedBy = filterCreatedBy ? (mission.createdBy || '').includes(filterCreatedBy) : true;
    const matchSearch = searchTerm
      ? (
        String(mission.sourceEntity || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(mission.targetEntity || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(mission.assignedEmployeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(missionType || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      : true;
    return matchStatus && matchDateFrom && matchDateTo && matchCreatedBy && matchSearch;
  });

  let filteredStockItems = stockItems.filter((item) => {
    const stockStatus = getStockItemStatus(item);
    const movementDate = item.lastMovementDate || (item.updatedAt || '').split('T')[0];
    const matchStatus = selectedStatus ? stockStatus === selectedStatus : true;
    const matchCategory = selectedCategory ? item.category === selectedCategory : true;
    const matchWarehouse = selectedWarehouse ? item.warehouse === selectedWarehouse : true;
    const matchDateFrom = (dateFrom && !isDefaultDate) ? movementDate >= dateFrom : true;
    const matchDateTo = dateTo ? movementDate <= dateTo : true;
    const matchCreatedBy = filterCreatedBy ? (item.createdBy || item.updatedBy || '').includes(filterCreatedBy) : true;
    const matchSearch = searchTerm
      ? (
        (item.itemNumber || '').toString().includes(searchTerm) ||
        String(item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(getStockVariantLabel(item) || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.warehouse || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      : true;
    return matchStatus && matchCategory && matchWarehouse && matchDateFrom && matchDateTo && matchCreatedBy && matchSearch;
  });

  const isStockFilterActive = selectedStatus || selectedCategory || selectedWarehouse || (dateFrom && !isDefaultDate) || dateTo || filterCreatedBy || searchTerm;
  if (!isStockFilterActive && activeReportTab === 'stock') {
    filteredStockItems = filteredStockItems.sort((a, b) => {
      const dateA = new Date(a.lastMovementDate || a.updatedAt || 0).getTime();
      const dateB = new Date(b.lastMovementDate || b.updatedAt || 0).getTime();
      return dateB - dateA;
    }).slice(0, 20);
  }

  const getVoucherTypeFromSubTab = (subTab) => {
    switch (subTab) {
      case 'vouchers_in': return 'إدخال';
      case 'vouchers_out': return 'إخراج';
      case 'vouchers_trf': return 'تحويل';
      case 'vouchers_dmg': return 'إتلاف';
      case 'audit': return 'خصم';
      default: return '';
    }
  };

  let filteredStockVouchers = stockVouchers.filter(v => {
    const vType = getVoucherTypeFromSubTab(selectedStockSubTab);
    if (v.type !== vType) return false;
    
    const vDate = (v.createdAt || v.date || '').split('T')[0];
    const matchDateFrom = (dateFrom && !isDefaultDate) ? vDate >= dateFrom : true;
    const matchDateTo = dateTo ? vDate <= dateTo : true;
    const matchCreatedBy = filterCreatedBy ? (v.createdBy || '').includes(filterCreatedBy) : true;
    const matchStatus = selectedStatus ? v.status === selectedStatus : true;
    const matchSearch = searchTerm
      ? (
          String(v.voucherNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(v.createdBy || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(v.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      : true;
    return matchDateFrom && matchDateTo && matchCreatedBy && matchStatus && matchSearch;
  });

  let filteredStocktakes = stocktakes.filter(st => {
    const stDate = (st.createdAt || st.date || '').split('T')[0];
    const matchDateFrom = (dateFrom && !isDefaultDate) ? stDate >= dateFrom : true;
    const matchDateTo = dateTo ? stDate <= dateTo : true;
    const matchCreatedBy = filterCreatedBy ? (st.createdBy || '').includes(filterCreatedBy) : true;
    const matchWarehouse = selectedWarehouse ? st.warehouse === selectedWarehouse : true;
    const matchStatus = selectedStatus ? st.status === selectedStatus : true;
    const matchSearch = searchTerm
      ? (
          String(st.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(st.createdBy || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(st.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(st.warehouse || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      : true;
    return matchDateFrom && matchDateTo && matchCreatedBy && matchWarehouse && matchStatus && matchSearch;
  });

  const hrCombined = [...hrAttendance.map(a => ({...a, source: 'حضور/انصراف'})), ...hrViolations.map(v => ({...v, source: 'مخالفة'}))];
  hrCombined.sort((a,b) => new Date(b.date) - new Date(a.date));

  const filteredHR = hrCombined.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchSearch = String(item.employeeName || '').toLowerCase().includes(term) || String(item.employeeId || '').toLowerCase().includes(term) || String(item.details || item.reason || '').toLowerCase().includes(term);

    const empObj = employees.find(e => String(e.id || '').trim() === String(item.employeeId || '').trim() || String(e.name || '').trim() === String(item.employeeName || '').trim());
    
    const matchEmp = selectedEmployee ? (String(item.employeeId || '').trim() === String(selectedEmployee).trim() || (empObj && String(empObj.id).trim() === String(selectedEmployee).trim()) || String(item.employeeName || '').trim() === String(selectedEmployee).trim()) : true;

    const empJobDept = empObj ? (empObj.employeeType || empObj.departmentName) : '';
    const empJobTitle = empObj ? empObj.jobTitle : '';
    const matchJobDept = selectedJobDepartment ? empJobDept === selectedJobDepartment : true;
    const matchJobTitle = selectedJobTitle ? empJobTitle === selectedJobTitle : true;

    return matchSearch && matchEmp && matchJobDept && matchJobTitle;
  });

  const filteredTasks = supervisorTasks.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchSearch = String(item.name || '').toLowerCase().includes(term) || String(item.taskNumber || '').toLowerCase().includes(term) || String(item.description || '').toLowerCase().includes(term);
    
    let matchEmp = true;
    if (selectedEmployee) {
      matchEmp = item.assigneeName === selectedEmployee || (Array.isArray(item.assigneeNames) && item.assigneeNames.includes(selectedEmployee));
    }
    
    const matchStatus = selectedStatus ? item.status === selectedStatus : true;
    return matchSearch && matchEmp && matchStatus;
  });

  const filteredSupervisorReports = supervisorReports.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchSearch = String(item.attendanceNotes || '').toLowerCase().includes(term) || String(item.supervisorName || '').toLowerCase().includes(term);
    const matchEmp = selectedEmployee ? item.supervisorName === selectedEmployee : true;
    const matchStatus = selectedStatus ? (item.status || 'قيد المراجعة') === selectedStatus : true;
    return matchSearch && matchEmp && matchStatus;
  });

  let filteredCustomersReports = customers.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchSearch = String(item.name || '').toLowerCase().includes(term) || String(item.phone || '').toLowerCase().includes(term) || String(item.location || '').toLowerCase().includes(term);
    const matchStatus = selectedStatus ? item.status === selectedStatus : true;
    const matchSector = selectedSector ? item.sector === selectedSector : true;
    const matchCity = selectedCity ? item.city === selectedCity : true;
    const matchType = selectedType ? (item.type || 'عميل') === selectedType : true;
    const actualRep = item.type === 'مورد' ? '' : (item.salesRep || 'زبائن الشركة');
    const matchSalesRep = selectedSalesRep ? actualRep === selectedSalesRep : true;
    return matchSearch && matchStatus && matchSector && matchCity && matchType && matchSalesRep;
  });

  const isCustomerFilterActive = searchTerm || selectedStatus || selectedSector || selectedCity || selectedType || selectedSalesRep;
  if (!isCustomerFilterActive && activeReportTab === 'customers') {
    filteredCustomersReports = filteredCustomersReports.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    }).slice(0, 10);
  }


  const getUniqueCreators = () => {
    const list = activeReportTab === 'sales'
      ? salesOrders
      : activeReportTab === 'production'
        ? productionOrders
        : activeReportTab === 'delivery'
          ? deliveryMissions
          : stockItems;
    const creators = list.map((item) => item.createdBy || item.updatedBy).filter(Boolean);
    return [...new Set(creators)];
  };

  const getUniqueStockCategories = () => [...new Set(stockItems.map((item) => item.category).filter(Boolean))];

  const stockDuplicateCounts = filteredStockItems.reduce((acc, item) => {
    const key = getStockIdentityKey(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const isDuplicateStockVariant = (item) => (stockDuplicateCounts[getStockIdentityKey(item)] || 0) > 1;

  const renderStockVariant = (item) => (
    <span className={`report-stock-variant-chip ${isDuplicateStockVariant(item) ? 'duplicate' : ''}`}>
      {getStockVariantLabel(item)}
    </span>
  );

  const averageScore = filteredEmployeesReports.length > 0
    ? filteredEmployeesReports.reduce((acc, curr) => acc + curr.finalScore, 0) / filteredEmployeesReports.length
    : 0;

  const currentResultsCount =
    activeReportTab === 'employees' ? filteredEmployeesReports.length :
    activeReportTab === 'sales' ? filteredSalesOrders.length :
    activeReportTab === 'production' ? filteredProductionOrders.length :
    activeReportTab === 'delivery' ? filteredDeliveryMissions.length :
    activeReportTab === 'stock' ? (
      selectedStockSubTab === 'items' ? filteredStockItems.length :
      selectedStockSubTab === 'stocktake' ? filteredStocktakes.length :
      filteredStockVouchers.length
    ) :
    activeReportTab === 'hr' ? filteredHR.length :
    activeReportTab === 'missingpunches' ? filteredMissingPunches.length :
    activeReportTab === 'tasks' ? filteredTasks.length :
    activeReportTab === 'supervisors' ? filteredSupervisorReports.length :
    activeReportTab === 'customers' ? filteredCustomersReports.length : 0;

  const currentReportTitle =
    activeReportTab === 'employees' ? 'تقارير الموظفين' :
    activeReportTab === 'sales' ? 'تقارير طلبيات العملاء' :
    activeReportTab === 'production' ? 'تقارير الإنتاج' :
    activeReportTab === 'delivery' ? 'تقارير التوصيل' :
    activeReportTab === 'stock' ? 'تقارير المخزون' :
    activeReportTab === 'hr' ? 'تقارير الموارد البشرية' :
    activeReportTab === 'missingpunches' ? 'تقارير الختمات الناقصة' :
    activeReportTab === 'tasks' ? 'تقارير إدارة المهام' :
    activeReportTab === 'supervisors' ? 'تقارير المشرفين' :
    activeReportTab === 'customers' ? 'تقارير العملاء والموردين' : 'التقارير';

  const currentReportSubtitle =
    activeReportTab === 'employees' ? 'عرض التقارير اليومية وتقييم الأداء بنفس تنسيق الجداول في الأقسام.' :
    activeReportTab === 'sales' ? 'متابعة طلبيات العملاء داخل جدول واضح وسهل القراءة.' :
    activeReportTab === 'production' ? 'متابعة أوامر الإنتاج وحالتها ضمن عرض منظم ومباشر.' :
    activeReportTab === 'delivery' ? 'متابعة مهمات التوصيل والجهات والحالات ضمن جدول واضح.' :
    activeReportTab === 'stock' ? 'متابعة حركة المخزون وحالة الأصناف ضمن عرض منظم ومباشر.' :
    activeReportTab === 'hr' ? 'متابعة الحضور والمخالفات للموظفين.' :
    activeReportTab === 'missingpunches' ? 'متابعة طلبات الختمات الناقصة والموافقة عليها.' :
    activeReportTab === 'tasks' ? 'متابعة المهام الموكلة للمشرفين.' :
    activeReportTab === 'supervisors' ? 'تقارير أداء المشرفين اليومية.' :
    activeReportTab === 'customers' ? '' : '';

  const emptyResultsColSpan =
    activeReportTab === 'employees'
      ? (selectedEmployee ? 7 : 8)
      : activeReportTab === 'sales'
        ? 6
        : activeReportTab === 'production'
          ? 7
          : activeReportTab === 'delivery'
            ? 6
            : activeReportTab === 'stock'
              ? (selectedStockSubTab === 'items' ? 9 : selectedStockSubTab === 'stocktake' ? 7 : 6)
              : activeReportTab === 'customers'
                ? 6
                : 8;

  const printColumnDefinitions = {
    employees: [
      { key: 'date', label: 'التاريخ', render: (report) => report.date || '---' },
      !selectedEmployee ? { key: 'userName', label: 'اسم الموظف', render: (report) => report.userName || '---' } : null,
      !selectedEmployee ? { key: 'employeeId', label: 'الرقم الوظيفي', render: (report) => {
        const emp = employees.find(e => e.id === report.employeeId || e.name === report.userName);
        return emp ? emp.id : '---';
      } } : null,
      { key: 'department', label: 'القسم', render: (report) => report.department || '---' },
      { key: 'timeIn', label: 'الدخول', render: (report) => {
        const emp = employees.find(e => String(e.id).trim() === String(report.userId || '').trim() || String(e.id).trim() === String(report.employeeId || '').trim() || String(e.name).trim() === String(report.userName || '').trim());
        const att = hrAttendance.find(a => {
          const matchId = String(a.employeeId || 'NO_ID').trim() === String(emp?.id || report.userId || report.employeeId || 'MISSING_ID').trim();
          const matchName = String(a.employeeName || 'NO_NAME').trim() === String(report.userName || emp?.name || 'MISSING_NAME').trim();
          const matchDate = String(a.date).trim() === String(report.date).trim();
          return (matchId || matchName) && matchDate;
        });
        return att?.timeIn || report.timeIn || '---';
      } },
      { key: 'timeOut', label: 'الخروج', render: (report) => {
        const emp = employees.find(e => String(e.id).trim() === String(report.userId || '').trim() || String(e.id).trim() === String(report.employeeId || '').trim() || String(e.name).trim() === String(report.userName || '').trim());
        const att = hrAttendance.find(a => {
          const matchId = String(a.employeeId || 'NO_ID').trim() === String(emp?.id || report.userId || report.employeeId || 'MISSING_ID').trim();
          const matchName = String(a.employeeName || 'NO_NAME').trim() === String(report.userName || emp?.name || 'MISSING_NAME').trim();
          const matchDate = String(a.date).trim() === String(report.date).trim();
          return (matchId || matchName) && matchDate;
        });
        return att?.timeOut || report.timeOut || '---';
      } },
      { key: 'phoneUsages', label: 'الهاتف', render: (report) => report.phoneUsages || 0 },
      { key: 'tasksCount', label: 'عدد المهام', render: (report) => report.tasks?.length || 0 },
      { key: 'finalScore', label: 'التقييم', render: (report) => `${Math.round(report.finalScore || 0)}%` }
    ].filter(Boolean),
    sales: [
      { key: 'orderDate', label: 'التاريخ', render: (order) => order.orderDate || '---' },
      { key: 'orderNumber', label: 'رقم الطلب', render: (order) => `#${order.orderNumber || '---'}` },
      { key: 'customerName', label: 'العميل', render: (order) => order.customerName || '---' },
      { key: 'createdBy', label: 'أُنشئت بواسطة', render: (order) => order.createdBy || '---' },
      { key: 'lastActionBy', label: 'آخر إجراء', render: (order) => order.lastActionBy || '---' },
      { key: 'itemsCount', label: 'عدد البنود', render: (order) => order.items?.length || 0 },
      { key: 'topItems', label: 'أبرز البنود', render: (order) => (order.items || []).slice(0, 3).map((item) => item.productName).filter(Boolean).join('، ') || '---' },
      { key: 'status', label: 'الحالة', render: (order) => <span className={`badge ${getStatusBadgeClass(order.status || '')}`}>{order.status || '---'}</span> }
    ],
    production: [
      { key: 'orderDate', label: 'التاريخ', render: (order) => order.orderDate || '---' },
      { key: 'orderNumber', label: 'رقم الأمر', render: (order) => `#${order.orderNumber || '---'}` },
      { key: 'customerName', label: 'العميل', render: (order) => order.customerName || '---' },
      { key: 'createdBy', label: 'أُنشئت بواسطة', render: (order) => order.createdBy || '---' },
      { key: 'lastActionBy', label: 'آخر إجراء', render: (order) => order.lastActionBy || '---' },
      { key: 'productName', label: 'الصنف', render: (order) => order.productName || '---' },
      { key: 'quantity', label: 'الكمية', render: (order) => order.quantity || 0 },
      { key: 'status', label: 'الحالة', render: (order) => <span className={`badge ${getStatusBadgeClass(order.status || '')}`}>{order.status || '---'}</span> }
    ],
    delivery: [
      { key: 'createdAt', label: 'تاريخ الإنشاء', render: (mission) => (mission.createdAt || '').split('T')[0] || '---' },
      { key: 'type', label: 'نوع المهمة', render: (mission) => getMissionTypeLabel(mission) },
      { key: 'sourceEntity', label: 'الشركة التابعة لها المشوار', render: (mission) => mission.sourceEntity || '---' },
      { key: 'targetEntity', label: 'الشركة المتجه إليها', render: (mission) => mission.targetEntity || '---' },
      { key: 'assignedEmployeeName', label: 'الموظف المسؤول', render: (mission) => mission.assignedEmployeeName || '---' },
      { key: 'dueDate', label: 'موعد التنفيذ', render: (mission) => mission.dueDate || '---' },
      { key: 'status', label: 'الحالة', render: (mission) => <span className={`badge ${getStatusBadgeClass(mission.status || '')}`}>{mission.status || '---'}</span> }
    ],
    stock: selectedStockSubTab === 'items'
      ? [
          { key: 'itemNumber', label: 'رقم الصنف', render: (item) => item.itemNumber || '---' },
          { key: 'itemCode', label: 'رمز الصنف', render: (item) => item.itemCode || '---' },
          { key: 'name', label: 'الاسم', render: (item) => item.name || '---' },
          { key: 'variant', label: 'اللون/التفصيل', render: renderStockVariant },
          { key: 'category', label: 'التصنيف', render: (item) => item.category || '---' },
          { key: 'warehouse', label: 'المستودع', render: (item) => item.warehouse || '---' },
          { key: 'quantity', label: 'الكمية', render: (item) => item.quantity ?? 0 },
          { key: 'unit', label: 'الوحدة', render: (item) => item.unit || '---' },
          { key: 'status', label: 'الحالة', render: (item) => {
            const s = getStockItemStatus(item);
            return <span className={`badge ${getStatusBadgeClass(s)}`}>{s}</span>;
          } }
        ]
      : selectedStockSubTab === 'stocktake'
      ? [
          { key: 'voucherNumber', label: 'رقم الجرد', render: (st) => st.id?.slice(-8).toUpperCase() || '---' },
          { key: 'date', label: 'التاريخ', render: (st) => (st.createdAt || st.date || '').split('T')[0] || '---' },
          { key: 'warehouse', label: 'المستودع', render: (st) => st.warehouse || '---' },
          { key: 'createdBy', label: 'المنشئ', render: (st) => st.createdBy || '---' },
          { key: 'itemsCount', label: 'عدد الأصناف', render: (st) => st.items?.length || 0 },
          { key: 'notes', label: 'الملاحظات', render: (st) => st.notes || '---' },
          { key: 'status', label: 'الحالة', render: (st) => <span className={`badge ${st.status === 'معتمد' ? 'badge-success' : 'badge-info'}`}>{st.status || '---'}</span> }
        ]
      : [
          { key: 'voucherNumber', label: 'رقم السند', render: (v) => v.voucherNumber || '---' },
          { key: 'date', label: 'التاريخ', render: (v) => (v.createdAt || v.date || '').split('T')[0] || '---' },
          { key: 'createdBy', label: 'المنشئ', render: (v) => v.createdBy || '---' },
          { key: 'itemsCount', label: 'عدد المواد', render: (v) => v.items?.length || 0 },
          { key: 'notes', label: 'الملاحظات', render: (v) => v.notes || '---' },
          { key: 'status', label: 'الحالة', render: (v) => <span className={`badge ${v.status === 'معتمد' ? 'badge-success' : 'badge-info'}`}>{v.status || '---'}</span> }
        ],
    customers: [
      { key: 'customerNumber', label: 'الرقم', render: (row) => row.customerNumber || '---' },
      { key: 'type', label: 'النوع', render: (row) => (
        <span className={`badge ${row.type === 'مورد' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
          {row.type || 'عميل'}
        </span>
      ) },
      { key: 'name', label: 'الاسم', render: (row) => row.name || '---' },
      { key: 'phone', label: 'رقم التلفون', render: (row) => row.phone || '---' },
      { key: 'city', label: 'المدينة', render: (row) => row.city || '---' },
      { key: 'location', label: 'العنوان', render: (row) => row.location || '---' },
      { key: 'sector', label: 'القطاع', render: (row) => row.sector || '---' },
      { key: 'salesRep', label: 'البائع', render: (row) => (row.type === 'مورد' ? '---' : (row.salesRep || 'زبائن الشركة')) },
      { key: 'status', label: 'الحالة', render: (row) => row.status || 'نشط' }
    ],
    tasks: [
      { key: 'createdAt', label: 'تاريخ الإنشاء', render: (task) => (task.createdAt || '').split('T')[0] || '---' },
      { key: 'taskNumber', label: 'رقم المهمة', render: (task) => task.taskNumber || '---' },
      { key: 'name', label: 'عنوان المهمة', render: (task) => task.name || '---' },
      { key: 'assignees', label: 'المسؤولون', render: (task) => Array.isArray(task.assigneeNames) && task.assigneeNames.length > 0 ? task.assigneeNames.join('، ') : (task.assigneeName || '---') },
      { key: 'priority', label: 'الأولوية', render: (task) => task.priority || '---' },
      { key: 'dueDate', label: 'تاريخ الاستحقاق', render: (task) => task.dueDate || '---' },
      { key: 'status', label: 'الحالة', render: (task) => <span className={`badge ${getStatusBadgeClass(task.status || '')}`}>{task.status || '---'}</span> }
    ],
    supervisors: [
      { key: 'date', label: 'التاريخ', render: (report) => report.date || '---' },
      { key: 'supervisorName', label: 'المشرف', render: (report) => report.supervisorName || '---' },
      { key: 'employeeEvaluations', label: 'تقييم الموظفين', render: (report) => `تم تقييم ${report.employeeEvaluations?.length || 0} موظف` },
      { key: 'status', label: 'حالة التقرير', render: (report) => <span className={`badge ${(!report.status || report.status === 'قيد المراجعة') ? 'bg-blue-100 text-blue-700' : report.status === 'معتمد' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{report.status || 'قيد المراجعة'}</span> }
    ]
  };

  const getSortedStockData = () => {
    let rawData = [];
    if (selectedStockSubTab === 'items') {
      rawData = filteredStockItems;
    } else if (selectedStockSubTab === 'stocktake') {
      rawData = filteredStocktakes;
    } else {
      rawData = filteredStockVouchers;
    }
    return getSortedData(rawData, 'stock');
  };

  const sortedRowsByTab = {
    employees: getSortedData(filteredEmployeesReports, 'employees'),
    sales: getSortedData(filteredSalesOrders, 'sales'),
    production: getSortedData(filteredProductionOrders, 'production'),
    delivery: getSortedData(filteredDeliveryMissions, 'delivery'),
    stock: getSortedStockData(),
    hr: getSortedData(filteredHR, 'hr'),
    tasks: getSortedData(filteredTasks, 'tasks'),
    supervisors: getSortedData(filteredSupervisorReports, 'supervisors'),
    customers: getSortedData(filteredCustomersReports, 'customers'),
    missingpunches: getSortedData(filteredMissingPunches, 'missingpunches')
  };

  const activeAvailablePrintColumns = printColumnDefinitions[activeReportTab] || [];
  const activeSavedPrintConfig = printConfigs[activeReportTab] || DEFAULT_PRINT_CONFIGS[activeReportTab];
  const activePrintConfig = {
    ...activeSavedPrintConfig,
    selectedColumns: activeSavedPrintConfig.selectedColumns.filter((columnKey) => activeAvailablePrintColumns.some((column) => column.key === columnKey))
  };
  const activePrintColumns = activeAvailablePrintColumns.filter((column) => activePrintConfig.selectedColumns.includes(column.key));
  const printableRows = limitRowsForPrint(sortedRowsByTab[activeReportTab] || [], activePrintConfig.rowLimit);
  const printRowsPerPage = PRINT_ROWS_PER_PAGE_BY_TAB[activeReportTab] || 18;
  const printPages = chunkRows(printableRows, printRowsPerPage);

  const getScoreTone = (score) => {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    return 'low';
  };

  const handleResetCurrentReport = () => {
    Swal.fire({
      title: 'تأكيد التصفير',
      text: `هل أنت متأكد من تصفير ${currentReportTitle} بالكامل؟ هذا الإجراء يمسح كافة السجلات ولا يمكن التراجع عنه.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'نعم، قم بالتصفير',
      cancelButtonText: 'إلغاء'
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'جاري التصفير...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });
        try {
          const { resetCollection } = await import('../../services/data_management');
          let collectionsToReset = [];
          switch (activeReportTab) {
            case 'employees': collectionsToReset = ['reports']; break;
            case 'sales': collectionsToReset = ['sales_orders']; break;
            case 'production': collectionsToReset = ['orders', 'production_logs', 'productionBatches', 'productionTasks']; break;
            case 'delivery': collectionsToReset = ['deliveryTrips', 'deliveryManifests', 'missions']; break;
            case 'stock': collectionsToReset = ['stock_vouchers', 'stocktakes']; break;
            case 'hr': collectionsToReset = ['hr_attendance', 'hr_leaves', 'hr_violations']; break;
            case 'missingpunches': collectionsToReset = ['missing_punches']; break;
            case 'tasks': collectionsToReset = ['supervisor_tasks']; break;
            case 'supervisors': collectionsToReset = ['supervisor_reports']; break;
            case 'customers': collectionsToReset = ['customers']; break;
          }
          
          if (collectionsToReset.length > 0) {
            for (const col of collectionsToReset) {
              await resetCollection(col);
            }
          }
          
          Swal.fire('تم التصفير!', `تم تصفير ${currentReportTitle} بنجاح.`, 'success').then(() => {
            window.location.reload();
          });
        } catch (error) {
          console.error(error);
          Swal.fire('خطأ', 'حدث خطأ أثناء محاولة التصفير.', 'error');
        }
      }
    });
  };

  const openPrintConfig = (action = 'print') => {
    setExportActionToRun(action);
    const currentConfig = printConfigs[activeReportTab] || DEFAULT_PRINT_CONFIGS[activeReportTab];
    setPrintDraftConfig({
      rowLimit: currentConfig.rowLimit || 'all',
      selectedColumns: activeAvailablePrintColumns.map((column) => column.key)
    });
    setPrintFilterDraft({
      selectedEmployee,
      selectedJobDepartment,
      selectedJobTitle,
      selectedCustomer,
      selectedCategory,
      selectedWarehouse,
      selectedStatus,
      selectedCity,
      selectedSector,
      dateFrom,
      dateTo,
      filterOrderNumber,
      filterCreatedBy,
      searchTerm
    });
    setShowPrintConfigModal(true);
  };

  const applyPrintCustomization = () => {
    if (!printDraftConfig?.selectedColumns?.length) return;

    setSelectedEmployee(printFilterDraft?.selectedEmployee || '');
    setSelectedJobDepartment(printFilterDraft?.selectedJobDepartment || '');
    setSelectedJobTitle(printFilterDraft?.selectedJobTitle || '');
    setSelectedCustomer(printFilterDraft?.selectedCustomer || '');
    setSelectedCategory(printFilterDraft?.selectedCategory || '');
    setSelectedWarehouse(printFilterDraft?.selectedWarehouse || '');
    setSelectedStatus(printFilterDraft?.selectedStatus || '');
    setSelectedCity(printFilterDraft?.selectedCity || '');
    setSelectedSector(printFilterDraft?.selectedSector || '');
    setDateFrom(printFilterDraft?.dateFrom || '');
    setIsDefaultDate(false);
    setDateTo(printFilterDraft?.dateTo || '');
    setFilterOrderNumber(printFilterDraft?.filterOrderNumber || '');
    setFilterCreatedBy(printFilterDraft?.filterCreatedBy || '');
    setSearchTerm(printFilterDraft?.searchTerm || '');

    setPrintConfigs((currentConfigs) => ({
      ...currentConfigs,
      [activeReportTab]: {
        rowLimit: printDraftConfig.rowLimit,
        selectedColumns: printDraftConfig.selectedColumns
      }
    }));

    setShowPrintConfigModal(false);
    setPendingExportAction(exportActionToRun);
  };

  const handleViewSupervisorReport = (report) => {
    Swal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup-report',
        confirmButton: 'btn-premium-close-teal',
        actions: 'premium-modal-actions'
      },
      buttonsStyling: false,
      width: '850px',
      confirmButtonText: 'إغلاق',
      html: `
        <div style="direction: rtl; text-align: right; font-family: 'Rubik', sans-serif; color: #1e293b; padding: 10px; max-height: 75vh; overflow-y: auto;">
          <h2 style="text-align: center; color: #1e293b; font-size: 1.8rem; margin-bottom: 25px; font-weight: 800; border-bottom: 2px solid var(--primary); padding-bottom: 10px;">
            تقرير المشرف: ${report.supervisorName || '---'}
          </h2>
          
          <h3 style="color: #1e293b; font-size: 1.3rem; font-weight: 800; margin-bottom: 15px;">الدوام</h3>
          <div style="margin-bottom: 30px; line-height: 2; font-size: 1.05rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px;">
            <div><span style="font-weight: 800; min-width: 120px; display: inline-block;">التاريخ:</span> ${report.date || '---'}</div>
            <div><span style="font-weight: 800; min-width: 120px; display: inline-block;">وقت الحضور:</span> <span dir="ltr" style="display: inline-block;">${report.timeIn || '---'}</span></div>
            <div><span style="font-weight: 800; min-width: 120px; display: inline-block;">وقت الخروج:</span> <span dir="ltr" style="display: inline-block;">${report.timeOut || '---'}</span></div>
          </div>

          <h3 style="color: #1e293b; font-size: 1.3rem; font-weight: 800; margin-bottom: 15px;">التقييم اليومي للموظفين</h3>
          <table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 30px;">
            <thead style="background-color: #f8fafc;">
              <tr>
                <th style="padding: 12px; border: 1px solid #cbd5e1; background-color: #f8fafc;">الموظف</th>
                <th style="padding: 12px; border: 1px solid #cbd5e1; background-color: #f8fafc;">التقييم</th>
                <th style="padding: 12px; border: 1px solid #cbd5e1; background-color: #f8fafc;">النسبة</th>
                <th style="padding: 12px; border: 1px solid #cbd5e1; background-color: #f8fafc;">الملاحظة</th>
              </tr>
            </thead>
            <tbody>
              ${(report.employeeEvaluations || []).map(ev => {
                 const empDailyReport = reports.find(r => (String(r.userId || '').trim() === String(ev.employeeId).trim() || String(r.employeeId || '').trim() === String(ev.employeeId).trim() || String(r.userName || '').trim() === String(ev.employeeName).trim()) && r.date === report.date);
                 let reportHtml = '';
                 
                 if (empDailyReport) {
                   reportHtml = `
                     <tr>
                       <td colspan="4" style="padding: 15px; border: 1px solid #cbd5e1; background-color: #f8fafc; text-align: right;">
                         <div style="font-weight: 800; margin-bottom: 10px; color: #1a8d9b; font-size: 1.1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">
                           تفاصيل تقرير الموظف
                         </div>
                         <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 0.9rem; margin-bottom: 10px;">
                           <thead style="background-color: #e2e8f0;">
                             <tr>
                               <th style="padding: 8px; border: 1px solid #cbd5e1;">القسم</th>
                               <th style="padding: 8px; border: 1px solid #cbd5e1;">الصنف</th>
                               <th style="padding: 8px; border: 1px solid #cbd5e1;">العملية</th>
                               <th style="padding: 8px; border: 1px solid #cbd5e1;">المنجز</th>
                               <th style="padding: 8px; border: 1px solid #cbd5e1;">الحد المطلوب</th>
                             </tr>
                           </thead>
                           <tbody>
                             ${(empDailyReport.tasks && empDailyReport.tasks.length > 0) ? empDailyReport.tasks.map(t => `
                               <tr style="background-color: #ffffff;">
                                 <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; color: #1a8d9b;">${t.departmentName || t.department || 'عام'}</td>
                                 <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${t.name}</td>
                                 <td style="padding: 8px; border: 1px solid #cbd5e1; color: #475569;">${t.operation}</td>
                                 <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; font-size: 1.1rem; color: #1a8d9b;">${t.count}</td>
                                 <td style="padding: 8px; border: 1px solid #cbd5e1;">${(t.min > 0 || t.max > 0) ? `<span dir="ltr">${t.max} - ${t.min}</span>` : '-'}</td>
                               </tr>
                             `).join('') : `
                               <tr><td colspan="5" style="padding: 10px; color: #64748b; font-style: italic;">لا توجد مهام مسجلة.</td></tr>
                             `}
                           </tbody>
                         </table>
                         
                         <div style="display: flex; justify-content: space-between; align-items: center; background-color: #eaf4f5; padding: 10px; border-radius: 8px; font-weight: bold; color: #334155; font-size: 0.9rem;">
                           <div style="display: flex; gap: 15px;">
                             <span>الهاتف بالأمانات: <span style="color: ${empDailyReport.phoneSafe ? '#16a34a' : '#ef4444'}">${empDailyReport.phoneSafe ? 'نعم' : 'لا'}</span></span>
                             <span>استخدام الهاتف: <span style="color: ${empDailyReport.phoneUsages > 0 ? '#ef4444' : '#16a34a'}">${empDailyReport.phoneUsages || 0} مرات</span></span>
                           </div>
                           <div style="display: flex; gap: 15px; color: #1a8d9b;">
                             <span>دخول: <span dir="ltr">${(() => { 
                               const attLog = hrAttendance.find(l => (String(l.employeeId || '').trim() === String(ev.employeeId || '').trim() || String(l.employeeName || '').trim() === String(ev.employeeName || '').trim()) && l.date === report.date);
                               const tIn = attLog?.timeIn || empDailyReport.timeIn;
                               if (!tIn) return '---';
                               const [h,m] = tIn.split(':'); let hh = parseInt(h,10); const ampm = hh >= 12 ? 'م' : 'ص'; hh = hh % 12 || 12; return `${hh}:${m} ${ampm}`; 
                             })()}</span></span>
                             <span>خروج: <span dir="ltr">${(() => { 
                               const attLog = hrAttendance.find(l => (String(l.employeeId || '').trim() === String(ev.employeeId || '').trim() || String(l.employeeName || '').trim() === String(ev.employeeName || '').trim()) && l.date === report.date);
                               const tOut = attLog?.timeOut || empDailyReport.timeOut;
                               if (!tOut) return '---';
                               const [h,m] = tOut.split(':'); let hh = parseInt(h,10); const ampm = hh >= 12 ? 'م' : 'ص'; hh = hh % 12 || 12; return `${hh}:${m} ${ampm}`; 
                             })()}</span></span>
                            </div>
                          </div>
                          ${empDailyReport.notes ? `
                            <div style="margin-top: 10px; padding: 10px; background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; font-size: 0.85rem; color: #78350f; text-align: right;">
                              <strong>ملاحظة الموظف في تقريره:</strong> ${empDailyReport.notes}
                            </div>
                          ` : ''}
                        </td>
                      </tr>
                    `
                    + `
                           </div>
                         </div>
                       </td>
                     </tr>
                   `;
                 }

                 return `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; background-color: #ffffff;">${ev.employeeName}</td>
                    <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; background-color: #ffffff; color: ${ev.rating === 'ممتاز' || (ev.rating && ev.rating.includes('%') && parseInt(ev.rating) >= 90) ? 'green' : ev.rating === 'سيئ' || (ev.rating && ev.rating.includes('%') && parseInt(ev.rating) < 50) ? 'red' : (ev.rating && ev.rating.includes('%')) ? 'blue' : 'inherit'}">${ev.rating}</td>
                    <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #1a8d9b; background-color: #ffffff;" dir="ltr">${ev.scorePercentage ? ev.scorePercentage + '%' : '---'}</td>
                    <td style="padding: 10px; border: 1px solid #cbd5e1; background-color: #ffffff;">${ev.reason || '---'}</td>
                  </tr>
                   ${reportHtml}
                   <tr><td colspan="4" style="height: 12px; background-color: #0f172a; padding: 0; border: none; border-top: 2px solid #000; border-bottom: 2px solid #000;"></td></tr>
                  `;
              }).join('')}
              ${(!report.employeeEvaluations || report.employeeEvaluations.length === 0) ? '<tr><td colspan="4" style="padding: 10px; border: 1px solid #cbd5e1;">لا توجد تقييمات</td></tr>' : ''}
            </tbody>
          </table>
          
          <h3 style="color: #1e293b; font-size: 1.3rem; font-weight: 800; margin-bottom: 15px;">متابعة الطلبيات والإنتاج المباشر</h3>
          <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 0.9rem;">
            <thead style="background-color: #f8fafc;">
              <tr>
                <th style="padding: 10px; border: 1px solid #cbd5e1;">الطلبية/المهمة</th>
                <th style="padding: 10px; border: 1px solid #cbd5e1;">القسم</th>
                <th style="padding: 10px; border: 1px solid #cbd5e1;">الحالة</th>
                <th style="padding: 10px; border: 1px solid #cbd5e1;">ملاحظات المشرف</th>
              </tr>
            </thead>
            <tbody>
              ${(report.ordersSnapshot && report.ordersSnapshot.length > 0) ? report.ordersSnapshot.map(o => `
                <tr>
                  <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">${o.isMission ? o.customerName : `#${o.orderNumber}`}</td>
                  <td style="padding: 10px; border: 1px solid #cbd5e1;">${o.isMission ? 'التوصيل' : (o.currentDepartment || 'الإنتاج')}</td>
                  <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; color: ${o.executionStatus === 'متوقف' || o.status === 'متوقف' ? '#ef4444' : 'inherit'}">${o.executionStatus || o.status || 'غير محدد'}</td>
                  <td style="padding: 10px; border: 1px solid #cbd5e1;">${o.supervisorNotes || '---'}</td>
                </tr>
              `).join('') : '<tr><td colspan="4" style="padding: 10px; border: 1px solid #cbd5e1;">لا توجد طلبيات مسجلة</td></tr>'}
            </tbody>
          </table>
        </div>
      `
    });
  };

  const handleChangeSupervisorReportStatus = async (report, newStatus) => {
    const actionText = newStatus === 'معتمد' ? 'اعتماد' : 'إرجاع / رفض';
    const result = await Swal.fire({
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
        setSupervisorReports(supervisorReports.map(r => r.id === report.id ? updatedReport : r));
        
        // Send WhatsApp notification
        try {
          const supEmp = employees.find(e => String(e.id) === String(report.supervisorId));
          if (supEmp && supEmp.phone) {
             const statusMsg = newStatus === 'معتمد' ? 'اعتماد ✅' : 'رفض/إرجاع ❌';
             await sendTemplatedWhatsAppNotification(supEmp.phone, 'report_approval', {
               name: report.supervisorName,
               status: statusMsg,
               date: report.date,
               reason: adminNote || 'بدون ملاحظات'
             });
          }
        } catch(e) { console.error(e); }

        Swal.fire('تم بنجاح', `تم ${actionText} التقرير.`, 'success');
      } catch (err) {
        Swal.fire('خطأ', 'حدث خطأ أثناء تغيير الحالة.', 'error');
      }
    }
  };

  const handleDeleteSupervisorReport = async (report) => {
    const result = await Swal.fire({
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
        setSupervisorReports(supervisorReports.filter((r) => r.id !== report.id));
        Swal.fire('تم الحذف!', 'تم حذف تقرير المشرف بنجاح.', 'success');
      } catch (err) {
        console.error("Error deleting report:", err);
        Swal.fire('خطأ', 'حدث خطأ أثناء حذف التقرير.', 'error');
      }
    }
  };

  const handleViewReportDetails = (report) => {
    MySwal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup-report',
        confirmButton: 'btn-premium-close-teal',
        actions: 'premium-modal-actions'
      },
      buttonsStyling: false,
      width: '600px',
      html: `
        <div style="direction: rtl; text-align: right; font-family: 'Rubik', sans-serif; color: #1e293b; padding: 10px;">
          <h2 style="text-align: center; color: #1e293b; font-size: 1.8rem; margin-bottom: 25px; font-weight: 800; border-bottom: 2px solid var(--primary); padding-bottom: 10px;">
            تفاصيل التقرير: ${report.userName}
          </h2>
          
          <div style="margin-bottom: 30px; line-height: 2.2; font-size: 1.05rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px;">
            <div style="display: flex; gap: 12px; justify-content: flex-start; align-items: center;">
               <span style="font-weight: 800; color: #1e293b; min-width: 110px;">التاريخ:</span>
               <span style="color: #475569;">${report.date}</span>
            </div>
            <div style="display: flex; gap: 12px; justify-content: flex-start; align-items: center;">
               <span style="font-weight: 800; color: #1e293b; min-width: 110px;">القسم:</span>
               <span style="color: #475569;">${report.department}</span>
            </div>
            <div style="display: flex; gap: 12px; justify-content: flex-start; align-items: center; flex-wrap: wrap;">
               <span style="font-weight: 800; color: #1e293b; min-width: 110px;">وقت الدخول:</span>
               <span style="color: #475569; min-width: 60px;">${report.timeIn || '---'}</span>
               <span style="margin: 0 15px; font-weight: bold; color: #cbd5e1;">|</span>
               <span style="font-weight: 800; color: #1e293b;">وقت الخروج:</span>
               <span style="color: #475569; margin-right: 12px;">${report.timeOut || '---'}</span>
            </div>
            <div style="display: flex; gap: 12px; justify-content: flex-start; align-items: center;">
               <span style="font-weight: 800; color: #1e293b; min-width: 110px;">استخدام الهاتف:</span>
               <span style="color: #475569;">${report.phoneUsages || 0} مرات ${report.phoneSafe ? '(بالأمانات)' : ''}</span>
            </div>
          </div>

          <h3 style="color: #1e293b; font-size: 1.3rem; font-weight: 800; margin-bottom: 15px; text-align: right;">الأعمال المنجزة:</h3>
          <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 30px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <table style="width: 100%; border-collapse: collapse; text-align: right; background-color: #fff;">
              <thead style="background-color: #f8fafc;">
                  <th style="padding: 12px 15px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 0.95rem; text-align: center;">الصنف</th>
                  <th style="padding: 12px 15px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 0.95rem; text-align: center;">العملية</th>
                  <th style="padding: 12px 15px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 0.95rem; text-align: center;">العدد</th>
                </tr>
              </thead>
              <tbody>
                ${(report.tasks || []).map(task => `
                  <tr>
                    <td style="padding: 15px; border-bottom: 1px solid #f1f5f9; color: #1e293b; text-align: center; font-weight: 500;">${task.name || '---'}</td>
                    <td style="padding: 15px; border-bottom: 1px solid #f1f5f9; color: #1e293b; text-align: center;">${task.operation || '---'}</td>
                    <td style="padding: 15px; border-bottom: 1px solid #f1f5f9; color: #1e293b; text-align: center; font-weight: 800;">${task.count || 0}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 2px dashed #e2e8f0;">
            <h2 style="font-size: 1.8rem; font-weight: 800; color: #1e293b; margin: 0;">
              التقييم النهائي الشامل: ${Math.round(report.finalScore)}%
            </h2>
            ${report.notes ? `<p style="margin-top: 15px; font-size: 1rem; color: #64748b;"><strong>ملاحظات:</strong> ${report.notes}</p>` : ''}
          </div>
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: 'إغلاق النافذة',
    });
  };

  const handleApproveReport = async (report) => {
    try {
      MySwal.fire({
        title: 'جاري الحفظ...',
        allowOutsideClick: false,
        didOpen: () => MySwal.showLoading()
      });
      await saveReport({ ...report, status: 'موافق' });
      
      await createNotification({
        settingKey: 'dailyReport',
        targetEmployeeId: report.userId,
        moduleKey: 'reports',
        moduleLabel: 'تقارير العمل',
        title: 'تمت الموافقة على تقريرك',
        message: `تمت الموافقة على تقرير العمل الخاص بك بتاريخ ${report.date}`,
        reportId: report.id
      });
      
      MySwal.fire('نجاح', 'تمت الموافقة على التقرير', 'success');
      const updatedReports = reports.map(r => r.id === report.id ? { ...r, status: 'موافق' } : r);
      setReports(updatedReports);
    } catch (err) {
      console.error(err);
      MySwal.fire('خطأ', 'حدث خطأ أثناء الحفظ', 'error');
    }
  };
  const handleRejectReport = async (report) => {
    try {
      const result = await MySwal.fire({
        title: 'تأكيد الرفض',
        text: 'هل أنت متأكد من رفض هذا التقرير؟',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'نعم، ارفض',
        cancelButtonText: 'إلغاء'
      });
      if (result.isConfirmed) {
        MySwal.fire({
          title: 'جاري الحفظ...',
          allowOutsideClick: false,
          didOpen: () => MySwal.showLoading()
        });
        await saveReport({ ...report, status: 'مرفوض' });
        
        await createNotification({
          settingKey: 'dailyReport',
          targetEmployeeId: report.userId,
          moduleKey: 'reports',
          moduleLabel: 'تقارير العمل',
          title: 'تم رفض تقريرك',
          message: `تم رفض تقرير العمل الخاص بك بتاريخ ${report.date}`,
          reportId: report.id
        });
        
        MySwal.fire('تم', 'تم رفض التقرير بنجاح', 'success');
        const updatedReports = reports.map(r => r.id === report.id ? { ...r, status: 'مرفوض' } : r);
        setReports(updatedReports);
      }
    } catch (err) {
      console.error(err);
      MySwal.fire('خطأ', 'حدث خطأ أثناء الحفظ', 'error');
    }
  };

  const handleDeleteEmployeeReport = async (report) => {
    const result = await MySwal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-confirm-delete',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions',
        title: 'premium-modal-title'
      },
      buttonsStyling: false,
      title: 'حذف التقرير',
      text: `هل أنت متأكد من حذف تقرير الموظف "${report.userName}" بتاريخ ${report.date}؟`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
      await deleteReport(report.id);
      Swal.fire({
        title: 'تم الحذف',
        text: 'تم حذف التقرير بنجاح',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
      setReports(reports.filter(r => r.id !== report.id));
    }
  };

  const handleEditEmployeeReport = async (report) => {
    let currentTasks = [...(report.tasks || [])];

    const renderTasksHtml = () => {
      return currentTasks.map((t, i) => `
        <div class="task-edit-row" style="display: grid; grid-template-columns: 2fr 1.5fr 1fr 1fr auto; gap: 8px; align-items: center; background: #f8fafc; padding: 10px; border-radius: 8px; margin-bottom: 8px; border: 1px solid #e2e8f0;">
          <input type="text" class="premium-input task-name" style="margin-bottom:0; font-size: 0.85rem;" placeholder="اسم الصنف" value="${t.name || ''}" data-index="${i}">
          <input type="text" class="premium-input task-op" style="margin-bottom:0; font-size: 0.85rem;" placeholder="العملية" value="${t.operation || ''}" data-index="${i}">
          <input type="number" class="premium-input task-count" style="margin-bottom:0; font-size: 0.85rem;" placeholder="العدد" value="${t.count || 0}" data-index="${i}">
          <input type="number" class="premium-input task-score" style="margin-bottom:0; font-size: 0.85rem;" placeholder="التقييم %" value="${t.score !== undefined ? t.score : (t.rating || 100)}" data-index="${i}">
          <button type="button" class="btn btn-outline text-danger remove-task-btn" style="padding: 4px; border:none;" data-index="${i}">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      `).join('');
    };

    const updateTasksUI = () => {
      const container = document.getElementById('swal-tasks-container');
      if (container) {
        container.innerHTML = renderTasksHtml();
        container.querySelectorAll('.remove-task-btn').forEach(btn => {
          btn.onclick = () => {
            const idx = parseInt(btn.getAttribute('data-index'));
            currentTasks.splice(idx, 1);
            updateTasksUI();
          };
        });
        container.querySelectorAll('input').forEach(input => {
          input.onchange = () => {
            const idx = parseInt(input.getAttribute('data-index'));
            const field = input.classList.contains('task-name') ? 'name' :
              input.classList.contains('task-op') ? 'operation' :
                input.classList.contains('task-count') ? 'count' : 'score';
            currentTasks[idx][field] = field === 'count' || field === 'score' ? parseInt(input.value) || 0 : input.value;
          };
        });
      }
    };

    MySwal.fire({
      title: 'تعديل تقرير الموظف',
      width: '900px',
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup premium-modal-wide',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions'
      },
      buttonsStyling: false,
      html: `
        <div style="text-align: right; direction: rtl;">
          <div class="grid grid-cols-12 gap-x-8 gap-y-4">
             <div class="col-span-3 premium-form-group">
                <label>وقت الدخول</label>
                <input id="swal-time-in" type="time" class="premium-input" value="${report.timeIn || ''}">
             </div>
             <div class="col-span-3 premium-form-group">
                <label>وقت الخروج</label>
                <input id="swal-time-out" type="time" class="premium-input" value="${report.timeOut || ''}">
             </div>
             <div class="col-span-3 premium-form-group">
                <label>استخدام الهاتف (مرات)</label>
                <input id="swal-phone" type="number" class="premium-input" value="${report.phoneUsages || 0}">
             </div>
             <div class="col-span-3 premium-form-group">
                <label>التقييم النهائي (%)</label>
                <input id="swal-final-score" type="number" class="premium-input" value="${Math.round(report.finalScore)}">
             </div>
             <div class="col-span-12 premium-form-group">
                <label>ملاحظات المدير</label>
                <textarea id="swal-notes" class="premium-input" style="height: 80px;">${report.notes || ''}</textarea>
             </div>
          </div>
          
          <div style="margin-top: 20px;">
             <div class="flex justify-between items-center mb-2">
                <h4 class="font-bold">المهام المنجزة</h4>
                <button type="button" id="add-task-btn" class="btn btn-sm btn-outline text-primary flex items-center gap-1" style="padding: 4px 12px; font-size: 0.8rem;">
                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg> إضافة مهمة
                </button>
             </div>
             <div id="swal-tasks-container" style="max-height: 300px; overflow-y: auto; padding-left: 5px;">
                ${renderTasksHtml()}
             </div>
          </div>
        </div>
      `,
      didOpen: () => {
        updateTasksUI();
        document.getElementById('add-task-btn').onclick = () => {
          currentTasks.push({ name: '', operation: '', count: 0, score: 100 });
          updateTasksUI();
        };
      },
      showCancelButton: true,
      confirmButtonText: 'حفظ التعديلات',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        const timeIn = document.getElementById('swal-time-in').value;
        const timeOut = document.getElementById('swal-time-out').value;
        const phoneUsages = parseInt(document.getElementById('swal-phone').value) || 0;
        const finalScore = parseInt(document.getElementById('swal-final-score').value) || 0;
        const notes = document.getElementById('swal-notes').value;

        return {
          ...report,
          timeIn,
          timeOut,
          phoneUsages,
          finalScore,
          notes,
          tasks: currentTasks
        };
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        await saveReport(result.value);
        Swal.fire({ title: 'تم التحديث', icon: 'success', timer: 1500, showConfirmButton: false });
        setReports(reports.map(r => r.id === report.id ? result.value : r));
      }
    });
  };

  const selectedEmpName = selectedEmployee ? employees.find(e => e.id === selectedEmployee)?.name : 'الجميع';
  const selectedJobDeptName = selectedJobDepartment ? selectedJobDepartment : 'الجميع';
  const selectedJobTitleName = selectedJobTitle ? selectedJobTitle : 'الجميع';
  const selectedCustomerName = selectedCustomer ? customers.find(c => c.id === selectedCustomer)?.name : 'جميع العملاء';
  const selectedCategoryName = selectedCategory || 'جميع التصنيفات';

  const docSubtitles = activeReportTab === 'employees'
    ? [
      `الموظف: ${selectedEmpName}`,
      `القسم الوظيفي: ${selectedJobDeptName}`,
      `المسمى الوظيفي: ${selectedJobTitleName}`
    ]
    : activeReportTab === 'stock'
      ? [
        `التصنيف: ${selectedCategoryName}`,
        `المستودع: ${selectedWarehouse || 'الجميع'}`,
        `الحالة: ${selectedStatus || 'الجميع'}`
      ]
      : activeReportTab === 'delivery'
        ? [
          `الحالة: ${selectedStatus || 'الجميع'}`,
          `أُنشئت بواسطة: ${filterCreatedBy || 'الجميع'}`
        ]
        : activeReportTab === 'customers'
          ? [
            `المدينة: ${selectedCity || 'الجميع'}`,
            `القطاع: ${selectedSector || 'الجميع'}`,
            `الحالة: ${selectedStatus || 'الجميع'}`
          ]
          : [
            `العميل: ${selectedCustomerName}`,
            `الحالة: ${selectedStatus || 'الجميع'}`
          ];

  const extractText = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string' || typeof val === 'number') return val;
    if (Array.isArray(val)) return val.map(extractText).join(' ');
    if (val.props && val.props.children) {
      return extractText(val.props.children);
    }
    return '';
  };

  const handleExportExcel = () => {
    const tableHtml = `<html xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
            <x:ExcelWorkbook>
                <x:ExcelWorksheets>
                    <x:ExcelWorksheet>
                        <x:Name>Sheet 1</x:Name>
                        <x:WorksheetOptions>
                            <x:DisplayRightToLeft/>
                        </x:WorksheetOptions>
                    </x:ExcelWorksheet>
                </x:ExcelWorksheets>
            </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body style="direction: rtl; text-align: right;">
        <table border="1" style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr style="background-color: #f1f5f9;">
              ${activePrintColumns.map(c => `<th style="padding: 8px;">${c.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${printableRows.map(row => `
              <tr>
                ${activePrintColumns.map(c => {
                  let val = c.render(row);
                  let text = extractText(val);
                  return `<td style="padding: 8px;">${text}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>`;
    
    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentReportTitle}_${dateFrom || 'الكل'}.xls`;
    a.click();
  };

  const handleExportWord = () => {
    const tableHtml = `<html xmlns:w="urn:schemas-microsoft-com:office:word">
      <head>
        <meta charset="utf-8">
      </head>
      <body style="direction: rtl; text-align: right; font-family: 'Arial';">
        <h2 style="text-align: center;">${currentReportTitle}</h2>
        <table border="1" style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr style="background-color: #f1f5f9;">
              ${activePrintColumns.map(c => `<th style="padding: 8px;">${c.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${printableRows.map(row => `
              <tr>
                ${activePrintColumns.map(c => {
                  let val = c.render(row);
                  let text = extractText(val);
                  return `<td style="padding: 8px;">${text}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>`;

    const blob = new Blob([tableHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentReportTitle}_${dateFrom || 'الكل'}.doc`;
    a.click();
  };

  const handlePrint = () => {
    openPrintConfig('print');
  };

  const employeeIdOptions = (employees || []).map(emp => ({ value: emp.id, label: emp.employeeId || emp.id }));
  const employeeNameOptions = (employees || []).map(emp => ({ value: emp.id, label: emp.name }));

  const customSelectStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      cursor: 'pointer',
      minHeight: '44px',
      height: '44px',
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
      zIndex: 9999,
      textAlign: 'right',
      direction: 'rtl'
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#0284c7' : state.isFocused ? '#f1f5f9' : 'white',
      color: state.isSelected ? 'white' : '#1e293b',
      cursor: 'pointer',
      fontSize: '0.9rem',
      fontWeight: state.isSelected ? 'bold' : 'normal',
    })
  };

  return (
    <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Tabs Grid */}
        <div className="no-print" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
          gap: '12px', 
          marginBottom: '2rem',
          direction: 'rtl'
        }}>
          {[
            { id: 'employees', label: 'تقارير الموظفين', desc: 'عدد الموظفين، الغياب، التأخير، ساعات العمل', icon: Users },
            { id: 'sales', label: 'طلبيات العملاء', desc: 'طلبيات العملاء، المبيعات، المرتجعات', icon: ShoppingCart },
            { id: 'production', label: 'تقارير الإنتاج', desc: 'الإنتاج اليومي، الإنجاز، المتأخرات، جودة الإنتاج', icon: SewingMachineIcon },
            { id: 'delivery', label: 'تقارير التوصيل', desc: 'قيد التوصيل، المكتمل، المرتجع، مناطق التوصيل', icon: Truck },
            { id: 'stock', label: 'تقارير المخزون', desc: 'الكميات، النواقص، الحركة، التالف، الجرد', icon: Package },
            { id: 'hr', label: 'الموارد البشرية', desc: 'الإجازات، السلف، العقود، الحضور والانصراف', icon: UserCheck },
            { id: 'tasks', label: 'تقارير المهام', desc: 'المهام المفتوحة، المنجزة، المتأخرة، قيد المراجعة', icon: ClipboardList },
            { id: 'supervisors', label: 'تقارير المشرفين', desc: 'متابعة الأداء، تقييم الموظفين، الإنجازات', icon: FileText },
            { id: 'customers', label: 'تقرير العملاء والموردين', desc: 'العملاء الجدد، الطلبات، المبيعات، رضا العملاء', icon: Building2 }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeReportTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                style={{
                  background: isActive ? 'linear-gradient(135deg, #14b8a6, #0f766e)' : '#ffffff',
                  color: isActive ? '#ffffff' : '#0f766e',
                  border: isActive ? 'none' : '1px solid #f1f5f9',
                  borderRadius: '16px',
                  padding: '16px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isActive ? '0 10px 25px -5px rgba(20, 184, 166, 0.4)' : '0 4px 6px -1px rgba(0,0,0,0.05)',
                  width: '100%',
                  minHeight: '160px',
                  textAlign: 'center',
                  transform: isActive ? 'translateY(-4px)' : 'none'
                }}
                className="hover:shadow-lg hover:-translate-y-1"
              >
                <div style={{
                  background: isActive ? 'rgba(255,255,255,0.2)' : '#f0fdfa',
                  padding: '12px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isActive ? '#ffffff' : '#0d9488',
                  marginBottom: '2px'
                }}>
                  <Icon size={24} strokeWidth={isActive ? 2 : 1.5} />
                </div>
                
                <span style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: '800',
                  lineHeight: '1.3'
                }}>{tab.label}</span>
                
                <span style={{
                  fontSize: '0.65rem',
                  color: isActive ? 'rgba(255,255,255,0.9)' : '#94a3b8',
                  lineHeight: '1.4',
                  flex: 1
                }}>{tab.desc}</span>

                <div style={{
                  marginTop: 'auto',
                  background: isActive ? 'rgba(255,255,255,0.2)' : '#ffffff',
                  border: isActive ? 'none' : '1px solid #e2e8f0',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isActive ? '#ffffff' : '#94a3b8'
                }}>
                  <ArrowLeft size={14} />
                </div>
              </button>
            );
          })}
        </div>

        {activeReportTab === 'hr' ? (
          <HRSalaryReports user={user} isNested={true} />
        ) : (
          <>
        {/* Advanced Stock & Export Panel */}
        {activeReportTab === 'stock' && (
          <div className="overflow-x-auto no-print mb-6 pb-2" style={{ direction: 'rtl' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, 1fr)`, gap: '12px', minWidth: `900px` }}>
              {/* Stat/Redirect Cards */}
              {[
                {
                  id: 'items',
                  label: 'الأصناف الحالية',
                  icon: <Layers />,
                  color: '#0ea5e9',
                  bgLight: '#e0f2fe',
                  onClick: () => setSelectedStockSubTab('items')
                },
                {
                  id: 'vouchers_in',
                  label: 'سندات الإدخال',
                  icon: <Download />,
                  color: '#16a34a',
                  bgLight: '#dcfce7',
                  onClick: () => setSelectedStockSubTab('vouchers_in')
                },
                {
                  id: 'vouchers_out',
                  label: 'سندات الإخراج',
                  icon: <Upload />,
                  color: '#dc2626',
                  bgLight: '#fee2e2',
                  onClick: () => setSelectedStockSubTab('vouchers_out')
                },
                {
                  id: 'vouchers_trf',
                  label: 'سندات التحويل',
                  icon: <ArrowUpDown />,
                  color: '#0284c7',
                  bgLight: '#e0f2fe',
                  onClick: () => setSelectedStockSubTab('vouchers_trf')
                },
                {
                  id: 'vouchers_dmg',
                  label: 'سندات التالف',
                  icon: <AlertTriangle />,
                  color: '#ea580c',
                  bgLight: '#ffedd5',
                  onClick: () => setSelectedStockSubTab('vouchers_dmg')
                },
                {
                  id: 'audit',
                  label: 'طلبات خصم المخزون',
                  icon: <AlertTriangle />,
                  color: '#8b5cf6',
                  bgLight: '#f3e8ff',
                  onClick: () => setSelectedStockSubTab('audit')
                },
                {
                  id: 'stocktake',
                  label: 'الجرد والتسوية',
                  icon: <ClipboardList />,
                  color: '#f59e0b',
                  bgLight: '#fef3c7',
                  onClick: () => setSelectedStockSubTab('stocktake')
                }
              ].map(item => (
                <div
                  key={item.id}
                  onClick={item.onClick}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = item.color;
                    e.currentTarget.style.boxShadow = `0 6px 15px -3px ${item.color}40`;
                    e.currentTarget.style.transform = 'translateY(-3px)';
                  }}
                  onMouseLeave={(e) => {
                    if (selectedStockSubTab !== item.id) {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = '0 4px 10px -2px rgba(0, 0, 0, 0.03)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                  style={{
                    backgroundColor: '#ffffff',
                    border: selectedStockSubTab === item.id ? `2px solid ${item.color}` : '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '16px 8px 12px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    boxShadow: selectedStockSubTab === item.id ? `0 6px 15px -3px ${item.color}40` : '0 4px 10px -2px rgba(0, 0, 0, 0.03)',
                    color: '#334155',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    height: '110px',
                    transform: selectedStockSubTab === item.id ? 'translateY(-3px)' : 'translateY(0)'
                  }}
                >
                  <div style={{ color: item.color, backgroundColor: item.bgLight, padding: '12px', borderRadius: '12px' }}>
                    {React.cloneElement(item.icon, { size: 24, strokeWidth: 2 })}
                  </div>
                  
                  <span style={{ fontSize: '13px', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2' }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}














































        {/* Controls Dashboard */}
        <div className="glass-card mb-6 flex-responsive no-print" style={{ 
          border: 'none', 
          background: '#f8fafc', 
          padding: '16px', 
          borderRadius: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          {/* Filter Controls: Conditional for Employee Reports vs Other Reports */}
          {activeReportTab === 'employees' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', flex: 1, direction: 'rtl' }}>
              {/* Date Filter */}
              <HRDateFilter 
                mode={empDateMode}
                setMode={setEmpDateMode}
                date={empSelectedDate}
                setDate={setEmpSelectedDate}
                month={empSelectedMonth}
                setMonth={setEmpSelectedMonth}
                startDate={empStartDate}
                setStartDate={setEmpStartDate}
                endDate={empEndDate}
                setEndDate={setEmpEndDate}
                allowedModes={['day', 'month', 'range']}
              />
              {/* Employee ID Selector */}
              <div style={{ width: '180px' }}>
                <Select
                  options={employeeIdOptions}
                  value={employeeIdOptions.find(opt => opt.value === selectedEmployee) || null}
                  onChange={(selected) => setSelectedEmployee(selected ? selected.value : '')}
                  styles={customSelectStyles}
                  placeholder="رقم الموظف..."
                  isSearchable={true}
                  isClearable={true}
                  menuPortalTarget={document.body}
                />
              </div>
              {/* Employee Name Selector */}
              <div style={{ width: '250px', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, color: '#94a3b8', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                  <User size={16} />
                </div>
                <Select
                  options={employeeNameOptions}
                  value={employeeNameOptions.find(opt => opt.value === selectedEmployee) || null}
                  onChange={(selected) => setSelectedEmployee(selected ? selected.value : '')}
                  styles={{
                    ...customSelectStyles,
                    control: (base) => ({
                      ...base,
                      height: '44px',
                      minHeight: '44px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      paddingLeft: '24px'
                    })
                  }}
                  placeholder="اسم الموظف..."
                  isSearchable={true}
                  isClearable={true}
                  menuPortalTarget={document.body}
                />
              </div>
            </div>
          ) : (
            /* Search Input for Other Tabs */
            <div className="flex-1 flex gap-4 items-center" style={{ minWidth: '260px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  placeholder="بحث سريع في التقرير الحالي..."
                  className="input-field"
                  style={{ 
                    margin: 0, 
                    paddingRight: '40px',
                    width: '100%',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1'
                  }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search 
                  size={18} 
                  style={{ 
                    position: 'absolute', 
                    right: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    color: '#64748b' 
                  }} 
                />
              </div>
            </div>
          )}

          {/* Action Buttons Group */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Reset Filters Button (Only for Employee Reports) */}
            {activeReportTab === 'employees' && (
              <button 
                className="btn flex items-center gap-2"
                onClick={() => {
                  setSelectedEmployee('');
                  setEmpDateMode('month');
                  setEmpSelectedDate(getLocalDateStr(new Date()));
                  setEmpSelectedMonth(new Date().toISOString().substring(0, 7));
                  setEmpStartDate(getLocalDateStr(new Date()));
                  setEmpEndDate(getLocalDateStr(new Date()));
                }}
                style={{
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1'
                }}
                title="إعادة تعيين فلاتر البحث"
              >
                <RotateCcw size={18} />
                <span className="hidden sm:inline">تصفير الفلاتر</span>
              </button>
            )}

            {/* Reset Button */}
            <button 
              className="btn flex items-center gap-2"
              onClick={handleResetCurrentReport}
              style={{
                borderRadius: '12px',
                padding: '10px 16px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fca5a5'
              }}
              title={`تصفير ${currentReportTitle}`}
            >
              <Trash2 size={18} />
              <span className="hidden sm:inline">تصفير</span>
            </button>

            {/* Filter Button (Hidden for Employee Reports since we have inline filters) */}
            {activeReportTab !== 'employees' && (
              <button 
                className="btn btn-primary flex items-center gap-2"
                onClick={() => setShowFilterModal(true)}
                style={{
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Filter size={18} />
                <span>تصفية مخصصة</span>
                {(selectedEmployee || selectedJobDepartment || selectedJobTitle || selectedCustomer || selectedCategory || selectedWarehouse || selectedStatus || selectedCity || selectedSector || (dateFrom && !isDefaultDate) || dateTo || filterOrderNumber || filterCreatedBy) && (
                  <span className="bg-white text-primary rounded-full px-2 py-0.5 text-[0.7rem] font-bold mr-1">نشط</span>
                )}
              </button>
            )}

            {/* Print Button */}
            <button 
              className="btn-export-item"
              title="طباعة التقرير"
              onClick={handlePrint}
              style={{ color: '#3b82f6' }}
            >
              <Printer size={22} strokeWidth={2.5} />
            </button>

            {/* Excel Export Button */}
            <button 
              className="btn-export-item"
              title="تصدير كـ Excel"
              onClick={() => { setExportActionToRun('excel'); openPrintConfig('excel'); }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-[28px] h-[28px]">
                <defs>
                  <linearGradient id="a-excel" x1="4.494" y1="-2092.086" x2="13.832" y2="-2075.914" gradientTransform="translate(0 2100)" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#18884f"/>
                    <stop offset="0.5" stopColor="#117e43"/>
                    <stop offset="1" stopColor="#0b6631"/>
                  </linearGradient>
                </defs>
                <title>file_type_excel</title>
                <path d="M19.581,15.35,8.512,13.4V27.809A1.192,1.192,0,0,0,9.705,29h19.1A1.192,1.192,0,0,0,30,27.809h0V22.5Z" style={{ fill: '#185c37' }}/>
                <path d="M19.581,3H9.705A1.192,1.192,0,0,0,8.512,4.191h0V9.5L19.581,16l5.861,1.95L30,16V9.5Z" style={{ fill: '#21a366' }}/>
                <path d="M8.512,9.5H19.581V16H8.512Z" style={{ fill: '#107c41' }}/>
                <path d="M16.434,8.2H8.512V24.45h7.922a1.2,1.2,0,0,0,1.194-1.191V9.391A1.2,1.2,0,0,0,16.434,8.2Z" style={{ opacity: 0.1, isolation: 'isolate' }}/>
                <path d="M15.783,8.85H8.512V25.1h7.271a1.2,1.2,0,0,0,1.194-1.191V10.041A1.2,1.2,0,0,0,15.783,8.85Z" style={{ opacity: 0.2, isolation: 'isolate' }}/>
                <path d="M15.783,8.85H8.512V23.8h7.271a1.2,1.2,0,0,0,1.194-1.191V10.041A1.2,1.2,0,0,0,15.783,8.85Z" style={{ opacity: 0.2, isolation: 'isolate' }}/>
                <path d="M15.132,8.85H8.512V23.8h6.62a1.2,1.2,0,0,0,1.194-1.191V10.041A1.2,1.2,0,0,0,15.132,8.85Z" style={{ opacity: 0.2, isolation: 'isolate' }}/>
                <path d="M3.194,8.85H15.132a1.193,1.193,0,0,1,1.194,1.191V21.959a1.193,1.193,0,0,1-1.194,1.191H3.194A1.192,1.192,0,0,1,2,21.959V10.041A1.192,1.192,0,0,1,3.194,8.85Z" style={{ fill: 'url(#a-excel)' }}/>
                <path d="M5.7,19.873l2.511-3.884-2.3-3.862H7.758L9.013,14.6c.116.234.2.408.238.524h.017c.082-.188.169-.369.26-.546l1.342-2.447h1.7l-2.359,3.84,2.419,3.905H10.821l-1.45-2.711A2.355,2.355,0,0,1,9.2,16.8H9.176a1.688,1.688,0,0,1-.168.351L7.515,19.873Z" style={{ fill: '#fff' }}/>
                <path d="M28.806,3H19.581V9.5H30V4.191A1.192,1.192,0,0,0,28.806,3Z" style={{ fill: '#33c481' }}/>
                <path d="M19.581,16H30v6.5H19.581Z" style={{ fill: '#107c41' }}/>
              </svg>
            </button>

            {/* Word Export Button */}
            <button 
              className="btn-export-item"
              title="تصدير كـ Word"
              onClick={() => { setExportActionToRun('word'); openPrintConfig('word'); }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-[28px] h-[28px]">
                <defs>
                  <linearGradient id="a-word" x1="4.494" y1="-1712.086" x2="13.832" y2="-1695.914" gradientTransform="translate(0 1720)" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#2368c4"/>
                    <stop offset="0.5" stopColor="#1a5dbe"/>
                    <stop offset="1" stopColor="#1146ac"/>
                  </linearGradient>
                </defs>
                <title>file_type_word</title>
                <path d="M28.806,3H9.705A1.192,1.192,0,0,0,8.512,4.191h0V9.5l11.069,3.25L30,9.5V4.191A1.192,1.192,0,0,0,28.806,3Z" style={{ fill: '#41a5ee' }}/>
                <path d="M30,9.5H8.512V16l11.069,1.95L30,16Z" style={{ fill: '#2b7cd3' }}/>
                <path d="M8.512,16v6.5L18.93,23.8,30,22.5V16Z" style={{ fill: '#185abd' }}/>
                <path d="M9.705,29h19.1A1.192,1.192,0,0,0,30,27.809h0V22.5H8.512v5.309A1.192,1.192,0,0,0,9.705,29Z" style={{ fill: '#103f91' }}/>
                <path d="M16.434,8.2H8.512V24.45h7.922a1.2,1.2,0,0,0,1.194-1.191V9.391A1.2,1.2,0,0,0,16.434,8.2Z" style={{ opacity: 0.1, isolation: 'isolate' }}/>
                <path d="M15.783,8.85H8.512V25.1h7.271a1.2,1.2,0,0,0,1.194-1.191V10.041A1.2,1.2,0,0,0,15.783,8.85Z" style={{ opacity: 0.2, isolation: 'isolate' }}/>
                <path d="M15.783,8.85H8.512V23.8h7.271a1.2,1.2,0,0,0,1.194-1.191V10.041A1.2,1.2,0,0,0,15.783,8.85Z" style={{ opacity: 0.2, isolation: 'isolate' }}/>
                <path d="M15.132,8.85H8.512V23.8h6.62a1.2,1.2,0,0,0,1.194-1.191V10.041A1.2,1.2,0,0,0,15.132,8.85Z" style={{ opacity: 0.2, isolation: 'isolate' }}/>
                <path d="M3.194,8.85H15.132a1.193,1.193,0,0,1,1.194,1.191V21.959a1.193,1.193,0,0,1-1.194,1.191H3.194A1.192,1.192,0,0,1,2,21.959V10.041A1.192,1.192,0,0,1,3.194,8.85Z" style={{ fill: 'url(#a-word)' }}/>
                <path d="M6.9,17.988c.023.184.039.344.046.481h.028c.01-.13.032-.287.065-.47s.062-.338.089-.465l1.255-5.407h1.624l1.3,5.326a7.761,7.761,0,0,1,.162,1h.022a7.6,7.6,0,0,1,.135-.975l1.039-5.358h1.477l-1.824,7.748H10.591L9.354,14.742q-.054-.222-.122-.578t-.084-.52H9.127q-.021.189-.084.561c-.042.249-.075.432-.1.552L7.78,19.871H6.024L4.19,12.127h1.5l1.131,5.418A4.469,4.469,0,0,1,6.9,17.988Z" style={{ fill: '#fff' }}/>
              </svg>
            </button>

            {/* PDF Export Button */}
            <button 
              className="btn-export-item"
              title="تصدير كـ PDF"
              onClick={() => { setExportActionToRun('pdf'); openPrintConfig('pdf'); }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-[28px] h-[28px]">
                <title>file_type_pdf2</title>
                <path d="M24.1,2.072h0l5.564,5.8V29.928H8.879V30H29.735V7.945L24.1,2.072" style={{ fill: '#909090' }}/>
                <path d="M24.031,2H8.808V29.928H29.664V7.873L24.03,2" style={{ fill: '#f4f4f4' }}/>
                <path d="M8.655,3.5H2.265v6.827h20.1V3.5H8.655" style={{ fill: '#7a7b7c' }}/>
                <path d="M22.472,10.211H2.395V3.379H22.472v6.832" style={{ fill: '#dd2025' }}/>
                <path d="M9.052,4.534h-.03l-.207,0H7.745v4.8H8.773V7.715L9,7.728a2.042,2.042,0,0,0,.647-.117,1.427,1.427,0,0,0,.493-.291,1.224,1.224,0,0,0,.335-.454,2.13,2.13,0,0,0,.105-.908,2.237,2.237,0,0,0-.114-.644,1.173,1.173,0,0,0-.687-.65A2.149,2.149,0,0,0,9.37,4.56a2.232,2.232,0,0,0-.319-.026M8.862,6.828l-.089,0V5.348h.193a.57.57,0,0,1,.459.181.92.92,0,0,1,.183.558c0,.246,0,.469-.222.626a.942.942,0,0,1-.524.114" style={{ fill: '#464648' }}/>
                <path d="M12.533,4.521c-.111,0-.219.008-.295.011L12,4.538h-.78v4.8h.918a2.677,2.677,0,0,0,1.028-.175,1.71,1.71,0,0,0,.68-.491,1.939,1.939,0,0,0,.373-.749,3.728,3.728,0,0,0,.114-.949,4.416,4.416,0,0,0-.087-1.127,1.777,1.777,0,0,0-.4-.733,1.63,1.63,0,0,0-.535-.4,2.413,2.413,0,0,0-.549-.178,1.282,1.282,0,0,0-.228-.017m-.182,3.937-.1,0V5.392h.013a1.062,1.062,0,0,1,.6.107,1.2,1.2,0,0,1,.324.4,1.3,1.3,0,0,1,.142.526c.009.22,0,.4,0,.549a2.926,2.926,0,0,1-.033.513,1.756,1.756,0,0,1-.169.5,1.13,1.13,0,0,1-.363.36.673.673,0,0,1-.416.106" style={{ fill: '#464648' }}/>
                <path d="M17.43,4.538H15v4.8h1.028V7.434h1.3V6.542h-1.3V5.43h1.4V4.538" style={{ fill: '#464648' }}/>
                <path d="M21.781,20.255s3.188-.578,3.188.511S22.994,21.412,21.781,20.255Zm-2.357.083a7.543,7.543,0,0,0-1.473.489l.4-.9c.4-.9.815-2.127.815-2.127a14.216,14.216,0,0,0,1.658,2.252,13.033,13.033,0,0,0-1.4.288Zm-1.262-6.5c0-.949.307-1.208.546-1.208s.508.115.517.939a10.787,10.787,0,0,1-.517,2.434A4.426,4.426,0,0,1,18.161,13.841ZM13.513,24.354c-.978-.585,2.051-2.386,2.6-2.444C16.11,21.911,14.537,24.966,13.513,24.354ZM25.9,20.895c-.01-.1-.1-1.207-2.07-1.16a14.228,14.228,0,0,0-2.453.173,12.542,12.542,0,0,1-2.012-2.655,11.76,11.76,0,0,0,.623-3.1c-.029-1.2-.316-1.888-1.236-1.878s-1.054.815-.933,2.013a9.309,9.309,0,0,0,.665,2.338s-.425,1.323-.987,2.639-.946,2.006-.946,2.006a9.622,9.622,0,0,0-2.725,1.4c-.824.767-1.159,1.356-.725,1.945.374.508,1.683.623,2.853-.91a22.549,22.549,0,0,0,1.7-2.492s1.784-.489,2.339-.623,1.226-.24,1.226-.24,1.629,1.639,3.2,1.581,1.495-.939,1.485-1.035" style={{ fill: '#dd2025' }}/>
                <path d="M23.954,2.077V7.95h5.633L23.954,2.077Z" style={{ fill: '#909090' }}/>
                <path d="M24.031,2V7.873h5.633L24.031,2Z" style={{ fill: '#f4f4f4' }}/>
                <path d="M8.975,4.457h-.03l-.207,0H7.668v4.8H8.7V7.639l.228.013a2.042,2.042,0,0,0,.647-.117,1.428,1.428,0,0,0,.493-.291A1.224,1.224,0,0,0,10.4,6.79a2.13,2.13,0,0,0,.105-.908,2.237,2.237,0,0,0-.114-.644,1.173,1.173,0,0,0-.687-.65,2.149,2.149,0,0,0-.411-.105,2.232,2.232,0,0,0-.319-.026M8.785,6.751l-.089,0V5.271H8.89a.57.57,0,0,1,.459.181.92.92,0,0,1,.183.558c0,.246,0,.469-.222.626a.942.942,0,0,1-.524.114" style={{ fill: '#fff' }}/>
                <path d="M12.456,4.444c-.111,0-.219.008-.295.011l-.235.006h-.78v4.8h.918a2.677,2.677,0,0,0,1.028-.175,1.71,1.71,0,0,0,.68-.491,1.939,1.939,0,0,0,.373-.749,3.728,3.728,0,0,0,.114-.949,4.416,4.416,0,0,0-.087-1.127,1.777,1.777,0,0,0-.4-.733,1.63,1.63,0,0,0-.535-.4,2.413,2.413,0,0,0-.549-.178,1.282,1.282,0,0,0-.228-.017m-.182,3.937-.1,0V5.315h.013a1.062,1.062,0,0,1,.6.107,1.2,1.2,0,0,1,.324.4,1.3,1.3,0,0,1,.142.526c.009.22,0,.4,0,.549a2.926,2.926,0,0,1-.033.513,1.756,1.756,0,0,1-.169.5,1.13,1.13,0,0,1-.363.36.673.673,0,0,1-.416.106" style={{ fill: '#fff' }}/>
                <path d="M17.353,4.461h-2.43v4.8h1.028V7.357h1.3V6.465h-1.3V5.353h1.4V4.461" style={{ fill: '#fff' }}/>
              </svg>
            </button>
          </div>
        </div>



        {/* Print Config Modal (Simplified Elegant Redesign) */}
        {showPrintConfigModal && (
          <div className="modal-overlay no-print" style={{ zIndex: 1000 }}>
            <div className="modal-content animate-fade-in" style={{ maxWidth: '600px', direction: 'rtl' }}>
              
              <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                  <div className="bg-primary/10 text-primary p-1.5 rounded-lg">
                    {exportActionToRun === 'excel' ? <FileSpreadsheet size={22} /> : exportActionToRun === 'word' ? <FileText size={22} /> : exportActionToRun === 'pdf' ? <FileDown size={22} /> : <Printer size={22} />}
                  </div>
                  <span>تخصيص تصدير البيانات</span>
                </h3>
                <button type="button" className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setShowPrintConfigModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-6 mt-2">
                {/* Row Limit Section */}
                <div>
                  <h4 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                    <List size={16} />
                    <span>حدد عدد الصفوف:</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {PRINT_ROW_LIMIT_OPTIONS.map(opt => {
                      const isSelected = (printDraftConfig?.rowLimit || 'all') === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setPrintDraftConfig({ ...printDraftConfig, rowLimit: opt.value })}
                          className={`btn ${isSelected ? 'btn-primary' : 'btn-outline'} flex-1 min-w-[100px]`}
                          style={{ padding: '8px 12px', fontSize: '0.9rem', borderRadius: '8px' }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Columns Selection Section */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-bold text-slate-600 flex items-center gap-2">
                      <List size={16} />
                      <span>تحديد الأعمدة المراد تضمينها:</span>
                    </h4>
                    <button 
                      onClick={() => {
                        const allKeys = (printColumnDefinitions[activeReportTab] || []).filter(Boolean).map(c => c.key);
                        const isAllSelected = printDraftConfig?.selectedColumns?.length === allKeys.length;
                        setPrintDraftConfig({ ...printDraftConfig, selectedColumns: isAllSelected ? [] : allKeys });
                      }}
                      className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '6px' }}
                    >
                      {printDraftConfig?.selectedColumns?.length === (printColumnDefinitions[activeReportTab] || []).filter(Boolean).length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto p-1">
                    {(printColumnDefinitions[activeReportTab] || []).map(col => {
                      if (!col) return null;
                      const isSelected = printDraftConfig?.selectedColumns?.includes(col.key);
                      return (
                        <button
                          key={col.key}
                          onClick={() => {
                            const newCols = isSelected 
                              ? (printDraftConfig.selectedColumns || []).filter(k => k !== col.key)
                              : [...(printDraftConfig.selectedColumns || []), col.key];
                            setPrintDraftConfig({ ...printDraftConfig, selectedColumns: newCols });
                          }}
                          className={`btn ${isSelected ? 'btn-primary' : 'btn-outline'} flex items-center justify-between w-full`}
                          style={{ padding: '10px 12px', fontSize: '0.9rem', borderRadius: '8px', textAlign: 'right' }}
                        >
                          <span className="font-bold truncate">{col.label}</span>
                          {isSelected && <CheckCircle size={16} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 mt-6 pt-4 border-t">
                <button 
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2" 
                  onClick={applyPrintCustomization}
                  disabled={!printDraftConfig?.selectedColumns?.length}
                  style={{ padding: '12px', fontSize: '1rem', borderRadius: '8px' }}
                >
                  {exportActionToRun === 'excel' ? <FileSpreadsheet size={18} /> : exportActionToRun === 'word' ? <FileText size={18} /> : exportActionToRun === 'pdf' ? <FileDown size={18} /> : <Printer size={18} />}
                  <span>تأكيد و {exportActionToRun === 'print' ? 'طباعة' : 'تصدير'}</span>
                </button>
                <button 
                  className="btn btn-outline flex-1" 
                  onClick={() => setShowPrintConfigModal(false)}
                  style={{ padding: '12px', fontSize: '1rem', borderRadius: '8px' }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Modal */}
        {showFilterModal && (
          <div className="modal-overlay no-print" style={{ zIndex: 1000 }}>
            <div className="modal-content animate-fade-in" style={{ maxWidth: '500px' }}>
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Filter className="text-primary" size={20} />
                  <span>تصفية مخصصة للتقارير</span>
                </h3>
                <button type="button" className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setShowFilterModal(false)}><X size={18} /></button>
              </div>

              <div className="space-y-4">
                {['employees', 'hr', 'missingpunches'].includes(activeReportTab) ? (
                  <>
                    <div className="input-group">
                      <label>الموظف</label>
                      <select className="input-field" value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
                        <option value="">جميع الموظفين</option>
                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                      </select>
                    </div>
                    {activeReportTab === 'employees' && (
                      <>
                        <div className="input-group">
                          <label>القسم الوظيفي</label>
                          <select className="input-field" value={selectedJobDepartment} onChange={(e) => setSelectedJobDepartment(e.target.value)}>
                            <option value="">الجميع</option>
                            {Object.values(departments || {}).map((dept, idx) => <option key={idx} value={dept}>{dept}</option>)}
                          </select>
                        </div>
                        <div className="input-group">
                          <label>المسمى الوظيفي</label>
                          <select className="input-field" value={selectedJobTitle} onChange={(e) => setSelectedJobTitle(e.target.value)}>
                            <option value="">الجميع</option>
                            {jobTitles.map((title, idx) => <option key={idx} value={title}>{title}</option>)}
                          </select>
                        </div>
                      </>
                    )}
                  </>
                ) : ['tasks', 'supervisors'].includes(activeReportTab) ? (
                  <>
                    <div className="input-group">
                      <label>المشرف</label>
                      <select className="input-field" value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
                        <option value="">جميع المشرفين</option>
                        {[...new Set([
                          ...supervisorTasks.flatMap(t => t.assigneeNames || []),
                          ...supervisorTasks.map(t => t.assigneeName),
                          ...supervisorReports.map(r => r.supervisorName)
                        ].filter(Boolean))].map((name, i) => <option key={i} value={name}>{name}</option>)}
                      </select>
                    </div>
                    {activeReportTab === 'tasks' && (
                      <div className="input-group">
                        <label>الحالة</label>
                        <select className="input-field" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                          <option value="">جميع الحالات</option>
                          <option value="جديدة">جديدة</option>
                          <option value="تم الاستلام">تم الاستلام</option>
                          <option value="جاري العمل">جاري العمل</option>
                          <option value="بانتظار الاعتماد">بانتظار الاعتماد</option>
                          <option value="مكتملة">مكتملة</option>
                        </select>
                      </div>
                    )}
                    {activeReportTab === 'supervisors' && (
                      <div className="input-group">
                        <label>الحالة</label>
                        <select className="input-field" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                          <option value="">جميع الحالات</option>
                          <option value="قيد المراجعة">قيد المراجعة</option>
                          <option value="معتمد">معتمد</option>
                        </select>
                      </div>
                    )}
                  </>
                ) : ['sales', 'production'].includes(activeReportTab) ? (
                  <>
                    <div className="input-group">
                      <label>العميل</label>
                      <select className="input-field" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                        <option value="">جميع العملاء</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>الحالة</label>
                      <select className="input-field" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                        <option value="">جميع الحالات</option>
                        {activeReportTab === 'sales'
                          ? salesStatuses.map(s => <option key={s} value={s}>{s}</option>)
                          : productionStatuses.map(s => <option key={s} value={s}>{s}</option>)
                        }
                      </select>
                    </div>
                    <div className="input-group">
                      <label>رقم الطلبية</label>
                      <input type="text" className="input-field" value={filterOrderNumber} onChange={(e) => setFilterOrderNumber(e.target.value)} placeholder="رقم الطلبية..." />
                    </div>
                    <div className="input-group">
                      <label>أُنشئت بواسطة</label>
                      <select className="input-field" value={filterCreatedBy} onChange={(e) => setFilterCreatedBy(e.target.value)}>
                        <option value="">الجميع</option>
                        {getUniqueCreators().map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </>
                ) : activeReportTab === 'delivery' ? (
                  <>
                    <div className="input-group">
                      <label>الحالة</label>
                      <select className="input-field" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                        <option value="">جميع الحالات</option>
                        {missionStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>أُنشئت بواسطة</label>
                      <select className="input-field" value={filterCreatedBy} onChange={(e) => setFilterCreatedBy(e.target.value)}>
                        <option value="">الجميع</option>
                        {getUniqueCreators().map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </>
                ) : activeReportTab === 'stock' ? (
                  <>
                    <div className="input-group">
                      <label>التصنيف</label>
                      <select className="input-field" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                        <option value="">جميع التصنيفات</option>
                        {getUniqueStockCategories().map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>المستودع</label>
                      <select className="input-field" value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)}>
                        <option value="">جميع المستودعات</option>
                        {[...new Set(stockItems.map(item => item.warehouse).filter(Boolean))].map(wh => <option key={wh} value={wh}>{wh}</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>الحالة</label>
                      <select className="input-field" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                        <option value="">جميع الحالات</option>
                        <option value="متوفر">متوفر</option>
                        <option value="يحتاج متابعة">يحتاج متابعة</option>
                        <option value="ناقص">ناقص</option>
                      </select>
                    </div>
                  </>
                ) : activeReportTab === 'customers' ? (
                  <>
                    <div className="input-group">
                      <label>النوع</label>
                      <select className="input-field" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                        <option value="">الكل (عملاء وموردين)</option>
                        <option value="عميل">العملاء</option>
                        <option value="مورد">الموردين</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>المدينة</label>
                      <select className="input-field" value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
                        <option value="">جميع المدن</option>
                         {((globalSettings.jordanianCities && globalSettings.jordanianCities.length > 0) ? globalSettings.jordanianCities : JORDANIAN_CITIES).map(city => <option key={city} value={city}>{city}</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>القطاع</label>
                      <select className="input-field" value={selectedSector} onChange={(e) => setSelectedSector(e.target.value)}>
                        <option value="">جميع القطاعات</option>
                        {[...new Set(customers.map(c => c.sector).filter(Boolean))].map(sec => <option key={sec} value={sec}>{sec}</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>الحالة</label>
                      <select className="input-field" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                        <option value="">جميع الحالات</option>
                        <option value="نشط">نشط</option>
                        <option value="غير نشط">غير نشط</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>البائع (مندوب المبيعات)</label>
                      <select className="input-field" value={selectedSalesRep} onChange={(e) => setSelectedSalesRep(e.target.value)}>
                        <option value="">جميع البائعين</option>
                        <option value="زبائن الشركة">زبائن الشركة</option>
                        {(globalSettings.salesReps || []).filter(rep => rep !== 'زبائن الشركة').map(rep => <option key={rep} value={rep}>{rep}</option>)}
                      </select>
                    </div>
                  </>
                ) : null}

                {/* Common Date Filters */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="input-group">
                    <label>من تاريخ</label>
                    <Flatpickr
                      value={dateFrom}
                      onChange={([date]) => {
                        setDateFrom(getLocalDateStr(date));
                        setIsDefaultDate(false);
                      }}
                      options={{
                        locale: Arabic,
                        dateFormat: 'Y-m-d',
                        allowInput: true
                      }}
                      className="input-field"
                      placeholder="اختر التاريخ..."
                    />
                  </div>
                  <div className="input-group">
                    <label>إلى تاريخ</label>
                    <Flatpickr
                      value={dateTo}
                      onChange={([date]) => {
                        setDateTo(getLocalDateStr(date));
                      }}
                      options={{
                        locale: Arabic,
                        dateFormat: 'Y-m-d',
                        allowInput: true
                      }}
                      className="input-field"
                      placeholder="اختر التاريخ..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-6 pt-4 border-t">
                <button className="btn btn-primary flex-1" onClick={() => { setShowFilterModal(false); fetchDynamicData(dateFrom, dateTo); }}>تطبيق</button>
                <button className="btn btn-outline flex-1" onClick={() => {
                  setSelectedEmployee('');
                  setSelectedJobDepartment('');
                  setSelectedJobTitle('');
                  setSelectedCustomer('');
                  setSelectedCategory('');
                  setSelectedWarehouse('');
                  setSelectedStatus('');
                  setSelectedCity('');
                  setSelectedSector('');
                  setDateFrom('');
                  setDateTo('');
                  setFilterOrderNumber('');
                  setFilterCreatedBy('');
                  setSearchTerm('');
                  setIsDefaultDate(false);
                  setShowFilterModal(false);
                  fetchDynamicData('', '');
                }}>تفريغ</button>
              </div>
            </div>
          </div>
        )}

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center flex-wrap gap-4">
          <div className="report-results-count">
            نتائج البحث: <strong>{currentResultsCount}</strong>
            {isDefaultDate && (
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginRight: '10px' }}>
                {activeReportTab === 'employees' 
                  ? '(يتم عرض بيانات آخر يومين افتراضياً. لجلب بيانات أقدم، استخدم الفلتر أعلاه)'
                  : (activeReportTab === 'sales' || activeReportTab === 'production')
                    ? '(يتم عرض بيانات آخر 5 أيام افتراضياً. لجلب بيانات أقدم، استخدم الفلتر أعلاه)'
                    : '(يتم عرض بيانات آخر 10 أيام افتراضياً. لجلب بيانات أقدم، استخدم الفلتر أعلاه)'
                }
              </span>
            )}
          </div>
        </div>

                  {/* Mobile view for Supervisors */}
          {activeReportTab === 'supervisors' && (
            <div className="supervisors-mobile-view mt-4 space-y-4">
              {sortedRowsByTab.supervisors.map(row => {
                const isApproved = row.status === 'معتمد';
                const isRejected = row.status === 'مرفوض/مُعاد';
                return (
                  <div key={row.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 relative overflow-hidden" style={{ direction: 'rtl' }}>
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${isApproved ? 'bg-emerald-500' : isRejected ? 'bg-rose-500' : 'bg-blue-500'}`}></div>
                    
                    <div className="flex justify-between items-center mb-3 pt-1">
                      <div className="flex items-center gap-2 text-slate-500 text-sm font-bold">
                        <Calendar size={15} className="text-slate-400" />
                        <span>{row.date}</span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${isApproved ? 'bg-emerald-100 text-emerald-700' : isRejected ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                        {isApproved ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                        {row.status || 'قيد المراجعة'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1 pr-2">
                        <h3 className="font-black text-slate-800 text-lg mb-2">{row.supervisorName || row.supervisorId}</h3>
                        <div className="flex flex-col gap-1.5 text-xs font-bold text-slate-500">
                           <div className="flex items-center gap-1">
                             <Users size={14} className="text-primary" />
                             <span>تم تقييم {row.employeeEvaluations?.length || 0} موظف</span>
                           </div>
                           <div className="flex items-center gap-1">
                             <Clock size={14} className="text-primary" />
                             <span>حضور: {row.timeIn || '---'} | انصراف: {row.timeOut || '---'}</span>
                           </div>
                        </div>
                      </div>
                      <div className="h-12 w-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center border border-slate-100 shadow-sm flex-shrink-0">
                        <User size={24} />
                      </div>
                    </div>

                    <div className="flex border-t border-slate-100 pt-3 mt-1 divide-x divide-x-reverse divide-slate-100">
                       <button onClick={() => handleViewSupervisorReport(row)} className="flex-1 flex items-center justify-center gap-2 text-primary font-bold text-xs py-1 hover:bg-slate-50 transition-colors">
                         <Eye size={14} /> عرض
                       </button>
                       {!isApproved && (
                         <button onClick={() => handleChangeSupervisorReportStatus(row, 'معتمد')} className="flex-1 flex items-center justify-center gap-2 text-emerald-600 font-bold text-xs py-1 hover:bg-slate-50 transition-colors">
                           <CheckCircle size={14} /> اعتماد
                         </button>
                       )}
                       {!isRejected && (
                         <button onClick={() => handleChangeSupervisorReportStatus(row, 'مرفوض/مُعاد')} className="flex-1 flex items-center justify-center gap-2 text-amber-600 font-bold text-xs py-1 hover:bg-slate-50 transition-colors">
                           <X size={14} /> إرجاع
                         </button>
                       )}
                       <button onClick={() => handleDeleteSupervisorReport(row)} className="flex-1 flex items-center justify-center gap-2 text-red-500 font-bold text-xs py-1 hover:bg-slate-50 transition-colors">
                         <Trash2 size={14} /> حذف
                       </button>
                    </div>
                  </div>
                );
              })}
              {sortedRowsByTab.supervisors.length === 0 && (
                <div className="text-center text-muted p-8">لا يوجد تقارير</div>
              )}
            </div>
          )}
          
          <div className={`table-container ${activeReportTab === 'supervisors' ? 'supervisors-table-view' : ''}`}>
          <table className="reports-center-table">
            {activeReportTab === 'employees' && (
              <EmployeesReportTab 
                employees={employees}
                hrAttendance={hrAttendance}
                filteredEmployeesReports={filteredEmployeesReports}
                allReports={reports}
                selectedEmployee={selectedEmployee}
                empSortKey={empSortKey}
                empSortDir={empSortDir}
                handleEmpSort={handleEmpSort}
                getEmpSortIcon={getEmpSortIcon}
                getScoreTone={getScoreTone}
                handleViewReportDetails={handleViewReportDetails}
                handleEditEmployeeReport={handleEditEmployeeReport}
                handleDeleteEmployeeReport={handleDeleteEmployeeReport}
              />
            )}
            {activeReportTab === 'sales' && (
              <SalesOrdersReportTab
                sortedSalesOrders={sortedRowsByTab.sales}
                handleSort={handleSort}
                getSortIcon={getSortIcon}
                getStatusBadgeClass={getStatusBadgeClass}
              />
            )}
            {activeReportTab === 'production' && (
              <ProductionReportTab
                sortedProductionOrders={sortedRowsByTab.production}
                handleSort={handleSort}
                getSortIcon={getSortIcon}
                getStatusBadgeClass={getStatusBadgeClass}
              />
            )}
            {activeReportTab === 'delivery' && (
              <DeliveryReportTab
                sortedDeliveryMissions={sortedRowsByTab.delivery}
                handleSort={handleSort}
                getSortIcon={getSortIcon}
                getStatusBadgeClass={getStatusBadgeClass}
                getMissionTypeLabel={getMissionTypeLabel}
              />
            )}
            {activeReportTab === 'stock' && (
              <StockReportTab
                sortedStockItems={sortedRowsByTab.stock}
                handleSort={handleSort}
                getSortIcon={getSortIcon}
                renderStockVariant={renderStockVariant}
                getStockItemStatus={getStockItemStatus}
                getStatusBadgeClass={getStatusBadgeClass}
                selectedStockSubTab={selectedStockSubTab}
              />
            )}
            {activeReportTab === 'missingpunches' && (
              <MissingPunchesReportTab
                sortedMissingPunches={sortedRowsByTab.missingpunches}
                handleSort={handleSort}
                getSortIcon={getSortIcon}
                printDraftConfig={printDraftConfig}
                pendingExportAction={pendingExportAction}
              />
            )}
            {activeReportTab === 'tasks' && (
              <TasksReportTab
                sortedTasks={sortedRowsByTab.tasks}
                handleSort={handleSort}
                getSortIcon={getSortIcon}
              />
            )}
            {activeReportTab === 'supervisors' && (
              <SupervisorsReportTab
                sortedSupervisors={sortedRowsByTab.supervisors}
                handleSort={handleSort}
                getSortIcon={getSortIcon}
                onView={handleViewSupervisorReport}
                onApprove={(report) => handleChangeSupervisorReportStatus(report, 'معتمد')}
                onReject={(report) => handleChangeSupervisorReportStatus(report, 'مرفوض/مُعاد')}
                onDelete={handleDeleteSupervisorReport}
              />
            )}
            {activeReportTab === 'customers' && (
              <CustomersReportTab
                sortedCustomers={sortedRowsByTab.customers}
                handleSort={handleSort}
                getSortIcon={getSortIcon}
              />
            )}
            <tbody>
              {((activeReportTab === 'employees' && filteredEmployeesReports.length === 0) ||
                (activeReportTab === 'hr' && filteredHR.length === 0) ||
                (activeReportTab === 'missingpunches' && filteredMissingPunches.length === 0) ||
                (activeReportTab === 'tasks' && filteredTasks.length === 0) ||
                (activeReportTab === 'supervisors' && filteredSupervisorReports.length === 0) ||
                (activeReportTab === 'customers' && filteredCustomersReports.length === 0) ||
                (activeReportTab === 'sales' && filteredSalesOrders.length === 0) ||
                (activeReportTab === 'production' && filteredProductionOrders.length === 0) ||
                (activeReportTab === 'delivery' && filteredDeliveryMissions.length === 0) ||
                (activeReportTab === 'stock' && filteredStockItems.length === 0)) && (
                  <tr>
                    <td colSpan={emptyResultsColSpan} className="text-center text-muted" style={{ padding: '2rem' }}>لا يوجد نتائج مطابقة لخيارات البحث</td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .report-print-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }
        .report-print-header-copy {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.45rem;
        }
        .report-print-header-copy h1 {
          margin: 0;
          color: #000;
          font-size: 1.6rem;
        }
        .report-print-header-copy p {
          margin: 0;
          color: #666;
        }
        .report-print-meta-row {
          display: flex;
          justify-content: space-between;
          gap: 0.6rem;
          flex-wrap: wrap;
          font-size: 0.95rem;
          border-top: 1px solid #000;
          padding-top: 0.55rem;
        }
        .report-print-score-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.35rem 0.8rem;
          border: 1px solid #cbd5e1;
          border-radius: 999px;
          background: #f8fafc;
          font-weight: 700;
        }
        .report-print-signatures {
          margin-top: 2rem;
          display: flex;
          justify-content: space-between;
        }
        .report-print-page {
          position: relative;
          box-sizing: border-box;
        }
        .report-print-footer {
          display: none;
        }
        .report-stock-variant-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          max-width: 100%;
          padding: 0.24rem 0.58rem;
          border: 1px solid #dbe4ea;
          border-radius: 999px;
          background: #f8fafc;
          color: #334155;
          font-size: 0.78rem;
          font-weight: 700;
          line-height: 1.35;
          white-space: normal;
        }
        .report-stock-variant-chip.duplicate {
          border-color: #f59e0b;
          background: #fffbeb;
          color: #92400e;
        }
        @media print {
          @page { margin: 0.7cm 0.5cm 1.4cm; }
          #root { display: none !important; }
          #print-portal { display: block !important; }
          .report-print-layout {
            display: block !important;
            background: white;
            width: 100%;
            padding-bottom: 1.6cm !important;
          }
          .report-print-page {
            display: block;
            position: relative;
            padding-bottom: 30px;
            break-after: page;
            page-break-after: always;
          }
          .report-print-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
          .report-print-layout table {
            width: 100% !important;
            margin-top: 0.75rem !important;
            border-collapse: collapse !important;
            table-layout: auto !important;
            display: table !important;
          }
          .report-print-layout thead { display: table-header-group !important; }
          .report-print-layout tbody { display: table-row-group !important; }
          .report-print-layout tr {
            display: table-row !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            height: auto !important;
          }
          .report-print-layout th,
          .report-print-layout td {
            display: table-cell !important;
            border: 1px solid black !important;
            padding: 3px 2px !important; font-size: 0.8rem !important;
            text-align: center !important;
            vertical-align: middle !important;
            white-space: normal !important;
            word-break: break-word !important;
            height: auto !important;
          }
          .report-print-layout td::before,
          .report-print-layout th::before {
            display: none !important;
            content: none !important;
          }
          .report-print-layout th { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; }
          .report-print-footer {
            display: block !important;
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 0.85rem;
            color: #475569;
            padding-bottom: 5px;
          }
          .badge, .report-stock-variant-chip, .report-stock-variant-chip.duplicate, .report-print-score-pill {
            display: inline-block !important;
            white-space: normal !important;
            height: auto !important;
        }
        .report-print-header-copy {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.45rem;
        }
        .report-print-header-copy h1 {
          margin: 0;
          color: #000;
          font-size: 1.6rem;
        }
        .report-print-header-copy p {
          margin: 0;
          color: #666;
        }
        .report-print-meta-row {
          display: flex;
          justify-content: space-between;
          gap: 0.6rem;
          flex-wrap: wrap;
          font-size: 0.95rem;
          border-top: 1px solid #000;
          padding-top: 0.55rem;
        }
        .report-print-score-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.35rem 0.8rem;
          border: 1px solid #cbd5e1;
          border-radius: 999px;
          background: #f8fafc;
          font-weight: 700;
        }
        .report-print-signatures {
          margin-top: 2rem;
          display: flex;
          justify-content: space-between;
        }
        .report-print-page {
          position: relative;
          box-sizing: border-box;
        }
        .report-print-footer {
          display: none;
        }
        .report-stock-variant-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          max-width: 100%;
          padding: 0.24rem 0.58rem;
          border: 1px solid #dbe4ea;
          border-radius: 999px;
          background: #f8fafc;
          color: #334155;
          font-size: 0.78rem;
          font-weight: 700;
          line-height: 1.35;
          white-space: normal;
        }
        .report-stock-variant-chip.duplicate {
          border-color: #f59e0b;
          background: #fffbeb;
          color: #92400e;
        }
        @media print {
          @page { margin: 0.7cm 0.5cm 1.4cm; }
          #root { display: none !important; }
          #print-portal { display: block !important; }
          .report-print-layout {
            display: block !important;
            background: white;
            width: 100%;
            padding-bottom: 1.6cm !important;
          }
          .report-print-page {
            display: block;
            position: relative;
            padding-bottom: 30px;
            break-after: page;
            page-break-after: always;
          }
          .report-print-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
          .report-print-layout table {
            width: 100% !important;
            margin-top: 0.75rem !important;
            border-collapse: collapse !important;
            table-layout: auto !important;
            display: table !important;
          }
          .report-print-layout thead { display: table-header-group !important; }
          .report-print-layout tbody { display: table-row-group !important; }
          .report-print-layout tr {
            display: table-row !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            height: auto !important;
          }
          .report-print-layout th,
          .report-print-layout td {
            display: table-cell !important;
            border: 1px solid black !important;
            padding: 3px 2px !important; font-size: 0.8rem !important;
            text-align: center !important;
            vertical-align: middle !important;
            white-space: normal !important;
            word-break: break-word !important;
            height: auto !important;
          }
          .report-print-layout td::before,
          .report-print-layout th::before {
            display: none !important;
            content: none !important;
          }
          .report-print-layout th { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; }
          .report-print-footer {
            display: block !important;
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 0.85rem;
            color: #475569;
            padding-bottom: 5px;
          }
          .badge, .report-stock-variant-chip, .report-stock-variant-chip.duplicate, .report-print-score-pill {
            display: inline-block !important;
            white-space: normal !important;
            height: auto !important;
            line-height: 1.4 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}} />
          </>
        )}
    </div>
  );
};

export default AdminReports;
