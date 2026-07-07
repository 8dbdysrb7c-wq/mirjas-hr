import React, { useState, useEffect, useRef } from 'react';
import Flatpickr from 'react-flatpickr';
import Select from 'react-select';
import { Arabic } from 'flatpickr/dist/l10n/ar.js';
import 'flatpickr/dist/themes/airbnb.css';
import { Package, Plus, Search, Edit2, Trash2, Layers, AlertTriangle, ArrowUpDown, Filter, X, Save, History, User, MapPin, Box, Copy, ChevronDown, ChevronRight, Printer, FileText, Download, Upload, Calendar, ClipboardList, Eye, Palette } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { getStock, saveStockItem, deleteStockItem, deleteMultipleStockItems, getGlobalSettings, saveGlobalSettings, isAdmin, canPerformAction, addLog, getStockVouchers, saveStockVoucher, deleteStockVoucher, getCustomers, saveCustomer, getEmployees, getSalesOrders, getMissions, canPerformStockAction, saveSalesOrder, getStocktakes, saveStocktake, approveStocktake, deleteStocktakeAndRevert, approveAuditVouchers, deleteDraftVouchers, revertAuditVouchers, getHRAssets } from '../../store';

const MySwal = withReactContent(Swal);

const AdminStock = ({ user, notificationTarget }) => {
  const [stock, setStock] = useState([]);
  const [assets, setAssets] = useState([]);
  const [showLocationsModal, setShowLocationsModal] = useState(false);
  const [selectedItemForLocations, setSelectedItemForLocations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'itemNumber', direction: 'asc' });
  const [filters, setFilters] = useState({
    warehouse: '',
    category: '',
    status: ''
  });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({});
  const [selectedItems, setSelectedItems] = useState([]);
  const [expandedRows, setExpandedRows] = useState([]);
  const stockStatusFilterRef = useRef(null);

  // States for Vouchers
  const [activeStockTab, setActiveStockTab] = useState('items'); // 'items' or 'vouchers'
  const [vouchers, setVouchers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [missions, setMissions] = useState([]);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherType, setVoucherType] = useState('إدخال');
  const [voucherForm, setVoucherForm] = useState({
    date: new Date().toISOString().split('T')[0],
    warehouse: '',
    destinationWarehouse: '',
    recipient: '',
    notes: '',
    items: []
  });
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [voucherFilters, setVoucherFilters] = useState({
    search: '',
    type: '',
    warehouse: '',
    fromDate: '',
    toDate: ''
  });

  const [stocktakes, setStocktakes] = useState([]);
  const [stocktakeWarehouse, setStocktakeWarehouse] = useState('');
  const [stocktakeItems, setStocktakeItems] = useState([]);
  const [isStocktakeHistoryView, setIsStocktakeHistoryView] = useState(true);
  const [showStocktakeModal, setShowStocktakeModal] = useState(false);
  const [stocktakeSetup, setStocktakeSetup] = useState({ warehouse: '', category: '' });
  const [hasDraft, setHasDraft] = useState(false);
  const [editingStocktakeId, setEditingStocktakeId] = useState(null);
  const [selectedStocktake, setSelectedStocktake] = useState(null);
  const [voucherFilterStatus, setVoucherFilterStatus] = useState('all');
  const [auditFilterStatus, setAuditFilterStatus] = useState('all');
  const [stocktakeFilterStatus, setStocktakeFilterStatus] = useState('all');
  
  const DRAFT_KEY = 'mirjas_stocktake_draft';

  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) setHasDraft(true);
  }, []);

  const saveDraft = (warehouse, items) => {
    if (!warehouse) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ warehouse, items, timestamp: new Date().toISOString() }));
    setHasDraft(true);
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
  };

  const resumeDraft = () => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setStocktakeWarehouse(parsed.warehouse);
        setStocktakeItems(parsed.items);
        setIsStocktakeHistoryView(false);
      } catch (e) {
        console.error("Error parsing draft", e);
      }
    }
  };

  // Helper functions for Stocktake (الجرد والتسوية)
  const handleInitializeStocktake = () => {
    const { warehouse: whName, category } = stocktakeSetup;
    if (!whName) {
      Swal.fire('تنبيه', 'يرجى اختيار المستودع لبدء الجرد', 'warning');
      return;
    }
    setStocktakeWarehouse(whName);
    
    let whStock = stock.filter(s => s.warehouse === whName);
    if (category) {
      whStock = whStock.filter(s => s.category === category);
    }
    
    if (whStock.length === 0) {
      Swal.fire('تنبيه', 'لا توجد أصناف في هذا المستودع بالقسم المحدد', 'warning');
      return;
    }

    const mapped = whStock.map(s => ({
      stockId: s.id,
      itemNumber: s.itemNumber,
      name: s.name,
      category: s.category || '',
      spec: s.spec || '',
      location: s.location || '',
      unit: s.unit || 'عدد',
      bookQuantity: Number(s.quantity || 0),
      physicalQuantity: Number(s.quantity || 0),
      notes: ''
    }));
    setStocktakeItems(mapped);
    saveDraft(whName, mapped);
    setShowStocktakeModal(false);
  };

  const handleUpdateStocktakeQty = (index, val) => {
    const updated = [...stocktakeItems];
    updated[index].physicalQuantity = val === '' ? '' : Number(val);
    setStocktakeItems(updated);
    saveDraft(stocktakeWarehouse, updated);
  };

  const handleUpdateStocktakeNotes = (index, val) => {
    const updated = [...stocktakeItems];
    updated[index].notes = val;
    setStocktakeItems(updated);
    saveDraft(stocktakeWarehouse, updated);
  };

  const handleSaveStocktake = async () => {
    if (!stocktakeWarehouse) {
      Swal.fire('خطأ', 'يرجى اختيار المستودع قبل حفظ المسودة', 'error');
      return;
    }

    const hasInvalidQty = stocktakeItems.some(item => item.physicalQuantity === '' || Number(item.physicalQuantity) < 0);
    if (hasInvalidQty) {
      Swal.fire('خطأ', 'يرجى إدخال كمية فعلية صحيحة لجميع الأصناف', 'error');
      return;
    }

    setLoading(true);

    try {
      const surplusItemsCount = stocktakeItems.filter(item => Number(item.physicalQuantity) > Number(item.bookQuantity)).length;
      const deficitItemsCount = stocktakeItems.filter(item => Number(item.physicalQuantity) < Number(item.bookQuantity)).length;

      const stocktakeReport = {
        ...(editingStocktakeId ? { id: editingStocktakeId } : {}),
        date: new Date().toISOString().split('T')[0],
        warehouse: stocktakeWarehouse,
        auditedBy: user.name || 'مجهول',
        auditedById: user.id || '',
        itemsCount: stocktakeItems.length,
        surplusCount: surplusItemsCount,
        deficitCount: deficitItemsCount,
        status: 'بانتظار الاعتماد',
        items: stocktakeItems.map(item => ({
          itemNumber: item.itemNumber,
          name: item.name,
          spec: item.spec,
          location: item.location,
          bookQuantity: item.bookQuantity,
          physicalQuantity: item.physicalQuantity,
          difference: Number(item.physicalQuantity) - Number(item.bookQuantity),
          notes: item.notes || ''
        }))
      };

      await saveStocktake(stocktakeReport);

      Swal.fire({
        icon: 'success',
        title: 'تم حفظ الجرد كمسودة بنجاح',
        timer: 1500,
        showConfirmButton: false
      });

      setStocktakeWarehouse('');
      setStocktakeItems([]);
      setEditingStocktakeId(null);
      clearDraft();
      setShowStocktakeModal(false);
      await fetchData();
    } catch (error) {
      console.error(error);
      Swal.fire('خطأ', 'حدث خطأ أثناء الحفظ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewStocktake = (report) => {
    setViewStocktakeReport(report);
  };

  const handleEditStocktake = (report) => {
    setStocktakeWarehouse(report.warehouse);
    setStocktakeItems(report.items);
    setEditingStocktakeId(report.id);
    setIsStocktakeHistoryView(false);
  };

  const handleApproveStocktake = async (report) => {
    const confirmRes = await MySwal.fire({
      title: 'تأكيد الاعتماد الرسمي',
      text: 'هل أنت متأكد من اعتماد هذا الجرد؟ سيتم تحديث أرصدة المخازن وإصدار سندات التسوية النظامية ولا يمكن التراجع أو التعديل بعد ذلك.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، اعتمد رسمياً',
      cancelButtonText: 'إلغاء'
    });

    if (!confirmRes.isConfirmed) return;

    setLoading(true);
    try {
      const surplusItems = [];
      const deficitItems = [];

      report.items.forEach(item => {
        const diff = Number(item.physicalQuantity) - Number(item.bookQuantity);
        const voucherItem = {
          itemNumber: item.itemNumber,
          name: item.name,
          spec: item.spec || '',
          location: item.location || '',
          quantity: Math.abs(diff),
          unit: item.unit || 'عدد',
          category: item.category || '',
          minLimit: 0
        };

        if (diff > 0) surplusItems.push(voucherItem);
        else if (diff < 0) deficitItems.push(voucherItem);
      });

      let incomingVoucher = null;
      let outgoingVoucher = null;

      if (surplusItems.length > 0) {
        incomingVoucher = {
          date: new Date().toISOString().split('T')[0],
          warehouse: report.warehouse,
          recipient: 'تسوية زيادة جرد',
          notes: `سند تسوية زيادة لجرد: ${report.date}`,
          type: 'تسوية',
          adjustmentType: 'زيادة',
          createdBy: user.name || 'النظام',
          createdById: user.id || '',
          items: surplusItems
        };
      }

      if (deficitItems.length > 0) {
        outgoingVoucher = {
          date: new Date().toISOString().split('T')[0],
          warehouse: report.warehouse,
          recipient: 'تسوية عجز جرد',
          notes: `سند تسوية نقصان لجرد: ${report.date}`,
          type: 'تسوية',
          adjustmentType: 'نقصان',
          createdBy: user.name || 'النظام',
          createdById: user.id || '',
          items: deficitItems
        };
      }

      await approveStocktake(report, incomingVoucher, outgoingVoucher);
      
      await addLog({
        userName: user.name,
        userId: user.id,
        module: 'المخزون',
        action: 'اعتماد جرد',
        details: `تم اعتماد جرد مستودع ${report.warehouse} نهائياً`
      });

      Swal.fire({
        icon: 'success',
        title: 'تم اعتماد الجرد وتحديث الأرصدة بنجاح',
        timer: 2000,
        showConfirmButton: false
      });

      await fetchData();
    } catch (error) {
      console.error(error);
      Swal.fire('خطأ', 'حدث خطأ أثناء الاعتماد', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStocktake = async (report) => {
    const isApproved = report.status === 'معتمد';
    const text = isApproved 
      ? 'هذا الجرد معتمد رسمياً! سيؤدي حذفه إلى عكس أرصدة المخزون وحذف سندات التسوية المرتبطة به للعودة لما قبل الجرد. هل أنت متأكد تماماً؟'
      : 'سيتم حذف مسودة الجرد هذه. لا يمكن التراجع عن هذا الإجراء.';
      
    const confirmRes = await MySwal.fire({
      title: 'تأكيد الحذف',
      text: text,
      icon: 'error',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    });

    if (!confirmRes.isConfirmed) return;

    setLoading(true);
    try {
      await deleteStocktakeAndRevert(report);
      
      await addLog({
        userName: user.name,
        userId: user.id,
        module: 'المخزون',
        action: 'حذف جرد',
        details: `تم حذف عملية جرد ${isApproved ? 'معتمدة' : 'مسودة'} لمستودع ${report.warehouse}`
      });

      Swal.fire({
        icon: 'success',
        title: 'تم حذف الجرد بنجاح',
        timer: 1500,
        showConfirmButton: false
      });

      await fetchData();
    } catch (error) {
      console.error(error);
      Swal.fire('خطأ', 'حدث خطأ أثناء الحذف', 'error');
    } finally {
      setLoading(false);
    }
  };

  const [viewStocktakeReport, setViewStocktakeReport] = useState(null);


  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditOrder, setAuditOrder] = useState(null);
  const [auditItems, setAuditItems] = useState([]);

  const JORDANIAN_CITIES = ['عمان', 'الزرقاء', 'إربد', 'العقبة', 'السلط', 'مادبا', 'الكرك', 'الطفيلة', 'معان', 'جرش', 'عجلون', 'المفرق'];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.month-picker-container')) {
        setIsMonthDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showFilterModal) return;

    const focusTimer = window.setTimeout(() => {
      stockStatusFilterRef.current?.focus();
    }, 40);

    return () => window.clearTimeout(focusTimer);
  }, [showFilterModal]);

  useEffect(() => {
    if (notificationTarget && notificationTarget.action === 'openVoucher') {
      const type = notificationTarget.data?.type;
      if (type) {
        setVoucherType(type);
        setActiveStockTab('vouchers');
        setShowVoucherModal(true);
        // Add a slight delay to ensure tab state is updated before modal shows up
      }
    } else if (notificationTarget && notificationTarget.action === 'viewVouchers') {
      const type = notificationTarget.data?.type;
      if (type) {
        setVoucherFilters(prev => ({ ...prev, type }));
        setActiveStockTab('vouchers');
      }
    }
  }, [notificationTarget]);

    const fetchData = async () => {
    setLoading(true);
    const [stockData, settingsData, vouchersData, customersData, employeesData, salesData, missionsData, stocktakesData, assetsData] = await Promise.all([
      getStock(),
      getGlobalSettings(),
      getStockVouchers(),
      getCustomers(),
      getEmployees(),
      getSalesOrders(),
      getMissions(),
      getStocktakes(),
      getHRAssets()
    ]);

    // Auto-sync locations
    const allExistingLocs = [...new Set([
      ...stockData.flatMap(s => (s.location || '').split(/[,، -]/).filter(Boolean)),
      ...assetsData.flatMap(a => (a.items || []).flatMap(i => (i.location || '').split(/[,، -]/).filter(Boolean)))
    ])];
    
    let needsUpdate = false;
    const currentLocs = settingsData.stockLocations || [];
    allExistingLocs.forEach(l => {
      if (!currentLocs.includes(l)) {
        currentLocs.push(l);
        needsUpdate = true;
      }
    });
    
    if (needsUpdate) {
       settingsData.stockLocations = currentLocs;
       try {
         await saveGlobalSettings(settingsData);
       } catch (e) {
         console.error("Failed to auto-sync locations", e);
       }
    }

    setStock(stockData);
    setGlobalSettings(settingsData);
    setVouchers(vouchersData || []);
    setCustomers(customersData || []);
    setEmployees(employeesData || []);
    setSalesOrders(salesData || []);
    setMissions(missionsData || []);
    setStocktakes(stocktakesData || []);
    setAssets(assetsData || []);
    setLoading(false);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getStatus = (item) => {
    const qty = Number(item.quantity || 0);
    const min = Number(item.minLimit || 0);
    if (qty <= 0) return { label: 'ناقص', color: 'bg-red-500', icon: '🔴' };
    if (qty <= min) return { label: 'يحتاج متابعة', color: 'bg-yellow-500', icon: '🟡' };
    return { label: 'متوفر', color: 'bg-green-500', icon: '🟢' };
  };

  const sortedStock = [...stock].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aValue = a[sortConfig.key] || '';
    const bValue = b[sortConfig.key] || '';
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    const strA = String(aValue);
    const strB = String(bValue);
    
    const cmp = strA.localeCompare(strB, 'ar', { numeric: true });
    return sortConfig.direction === 'asc' ? cmp : -cmp;
  });

  const filteredStock = sortedStock.filter(item => {
    const matchesSearch = 
      (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.itemNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesWarehouse = !filters.warehouse || item.warehouse === filters.warehouse;
    const matchesCategory = !filters.category || item.category === filters.category;
    const matchesStatus = !filters.status || getStatus(item).label === filters.status;

    return matchesSearch && matchesWarehouse && matchesCategory && matchesStatus;
  });

  const groupedStock = Object.values(filteredStock.reduce((acc, item) => {
    if (!acc[item.itemNumber]) {
      acc[item.itemNumber] = {
        ...item,
        totalQuantity: Number(item.quantity || 0),
        locations: [item]
      };
    } else {
      acc[item.itemNumber].totalQuantity += Number(item.quantity || 0);
      acc[item.itemNumber].locations.push(item);
    }
    return acc;
  }, {}));

  const handleSelectGroup = (itemNumber, locations) => {
    const allSelected = locations.every(loc => selectedItems.includes(loc.id));
    if (allSelected) {
      setSelectedItems(prev => prev.filter(id => !locations.some(loc => loc.id === id)));
    } else {
      const idsToAdd = locations.map(loc => loc.id).filter(id => !selectedItems.includes(id));
      setSelectedItems(prev => [...prev, ...idsToAdd]);
    }
  };

  const toggleRow = (itemNumber) => {
    setExpandedRows(prev => prev.includes(itemNumber) ? prev.filter(i => i !== itemNumber) : [...prev, itemNumber]);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const ids = filteredStock.map(i => i.id);
      setSelectedItems(ids);
    } else {
      setSelectedItems([]);
    }
  };

  const pendingAudits = vouchers.filter(v => v.status === 'مسودة' && v.orderNumber);
  const getDraftForOrder = (orderNumber) => pendingAudits.filter(v => v.orderNumber === orderNumber);

  const ordersToAuditRaw = salesOrders.filter(o => o.status === 'تم التوصيل' || missions.find(m => m.salesOrderNumber === o.orderNumber && m.status === 'تم الإنجاز'));
  const ordersToAudit = ordersToAuditRaw.map(o => {
    const drafts = getDraftForOrder(o.orderNumber);
    // If it's already deducted, we might want to get the actual voucher creator, but for now we just show who drafted it if there's a draft
    // If it's deducted, there are no drafts. Let's find the actual voucher to get the creator.
    let responsibleUser = '-';
    if (o.stockDeducted) {
      const deductionVouchers = vouchers.filter(v => v.orderNumber === o.orderNumber && v.status === 'معتمد');
      if (deductionVouchers.length > 0) responsibleUser = deductionVouchers[0].createdBy;
    } else if (drafts.length > 0) {
      responsibleUser = drafts[0].createdBy;
    }
    
    return { 
      ...o, 
      hasDraft: drafts.length > 0, 
      draftCreatedBy: responsibleUser 
    };
  }).sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));

  const handleApproveDraft = async (order) => {
    MySwal.fire({
      title: 'هل أنت متأكد؟',
      text: 'سيتم اعتماد الخصم والتأثير على كميات المخزون نهائياً.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، اعتماد',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#059669',
    }).then(async (result) => {
      if (result.isConfirmed) {
        const success = await approveAuditVouchers(order.orderNumber);
        if (success) {
          await saveSalesOrder({ ...order, stockDeducted: true });
          Swal.fire('تم!', 'تم اعتماد السند وخصم المخزون بنجاح.', 'success');
          fetchData(); // Refresh stock
        } else {
          Swal.fire('خطأ', 'حدث خطأ أثناء اعتماد السند.', 'error');
        }
      }
    });
  };

  const handleDeleteDraft = async (orderNumber) => {
    MySwal.fire({
      title: 'هل أنت متأكد؟',
      text: 'سيتم إلغاء المسودة المعلقة ولن يتم الخصم من المخزون.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، حذف المسودة',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#dc2626',
    }).then(async (result) => {
      if (result.isConfirmed) {
        const success = await deleteDraftVouchers(orderNumber);
        if (success) {
          Swal.fire('تم!', 'تم إلغاء المسودة.', 'success');
          fetchData(); // Refresh stock vouchers
        } else {
          Swal.fire('خطأ', 'حدث خطأ أثناء حذف المسودة.', 'error');
        }
      }
    });
  };

  const handleRevertDeduction = async (order) => {
    MySwal.fire({
      title: 'تراجع عن الخصم؟',
      text: 'سيتم إلغاء السند وإرجاع الكميات المخصومة إلى المخزون. هل أنت متأكد؟',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، إلغاء التراجع',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#dc2626',
    }).then(async (result) => {
      if (result.isConfirmed) {
        const success = await revertAuditVouchers(order.orderNumber);
        if (success) {
          await saveSalesOrder({ ...order, stockDeducted: false });
          Swal.fire('تم!', 'تم إرجاع الكميات للمخزون وإلغاء الخصم بنجاح.', 'success');
          fetchData();
        } else {
          Swal.fire('خطأ', 'حدث خطأ أثناء إرجاع الكميات.', 'error');
        }
      }
    });
  };

  const handleOpenAudit = (order) => {
    setAuditOrder(order);
    const drafts = getDraftForOrder(order.orderNumber);
    if (drafts.length > 0) {
      const draftItems = drafts.flatMap(v => v.items.map(item => ({
        ...item,
        name: item.name,
        quantity: Number(item.quantity) || 1,
        warehouse: v.warehouse,
        stockId: stock.find(s => s.itemNumber === item.itemNumber && s.warehouse === v.warehouse && s.name === item.name)?.id || '',
        availableQuantity: stock.find(s => s.itemNumber === item.itemNumber && s.warehouse === v.warehouse && s.name === item.name)?.quantity || 0,
        isExtra: !order.items.some(oi => (oi.productName || oi.name) === item.name)
      })));
      setAuditItems(draftItems);
    } else {
      const parsedItems = (order.items || []).map(item => ({
        ...item,
        name: item.productName || item.name || '',
        quantity: Number(item.quantity) || 1,
        warehouse: '',
        stockId: '',
        availableQuantity: 0,
        isExtra: false
      }));
      setAuditItems(parsedItems);
    }
    setShowAuditModal(true);
  };

  const updateAuditItem = (index, field, value) => {
    const newItems = [...auditItems];
    newItems[index][field] = value;
    
    if (field === 'warehouse' || field === 'name') {
      const currentWarehouse = field === 'warehouse' ? value : newItems[index].warehouse;
      const currentName = field === 'name' ? value : newItems[index].name;
      
      if (currentWarehouse) {
        const selectedStock = stock.find(s => s.warehouse === currentWarehouse && s.name === currentName);
        if (selectedStock) {
          newItems[index].stockId = selectedStock.id;
          newItems[index].availableQuantity = selectedStock.quantity;
          newItems[index].unit = selectedStock.unit;
        } else {
          newItems[index].stockId = '';
          newItems[index].availableQuantity = 0;
        }
      }
    }
    
    setAuditItems(newItems);
  };

  const addExtraAuditItem = () => {
    setAuditItems([...auditItems, { name: '', quantity: 1, warehouse: '', stockId: '', availableQuantity: 0, isExtra: true }]);
  };

  const removeAuditItem = (index) => {
    const newItems = [...auditItems];
    newItems.splice(index, 1);
    setAuditItems(newItems);
  };

  const handleConfirmAudit = async () => {
    // Validate items
    for (let i = 0; i < auditItems.length; i++) {
      const item = auditItems[i];
      if (!item.warehouse) {
        Swal.fire('خطأ', `يرجى تحديد المستودع للصنف في السطر ${i + 1}`, 'error');
        return;
      }
      if (!item.stockId) {
        Swal.fire('خطأ', `يرجى تحديد الصنف المقابل في المخزون للسطر ${i + 1}`, 'error');
        return;
      }
      if (Number(item.quantity) > Number(item.availableQuantity)) {
        Swal.fire('خطأ', `الكمية المطلوبة في السطر ${i + 1} تتجاوز الكمية المتوفرة (${item.availableQuantity})`, 'error');
        return;
      }
    }

    setLoading(true);
    try {
      // Group by warehouse to create multiple vouchers if needed
      const itemsByWarehouse = auditItems.reduce((acc, item) => {
        if (!acc[item.warehouse]) acc[item.warehouse] = [];
        const stockItem = stock.find(s => s.id === item.stockId);
        acc[item.warehouse].push({
          stockId: item.stockId,
          itemNumber: stockItem?.itemNumber || '',
          name: stockItem?.name || item.name,
          spec: stockItem?.spec || '',
          location: stockItem?.location || '',
          quantity: Number(item.quantity),
          unit: stockItem?.unit || '',
          category: stockItem?.category || '',
          minLimit: Number(stockItem?.minLimit || 0)
        });
        return acc;
      }, {});

      // Find max MIS number
      const misVouchers = vouchers.filter(v => v.voucherNumber?.startsWith('MIS-'));
      const maxMis = misVouchers.reduce((max, v) => {
        const match = v.voucherNumber?.match(/MIS-(\d+)/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0);
      const nextMisNumber = `MIS-${String(maxMis + 1).padStart(5, '0')} (${auditOrder.orderNumber})`;

      for (const [warehouse, wItems] of Object.entries(itemsByWarehouse)) {
        const payload = {
          voucherNumber: nextMisNumber,
          orderNumber: auditOrder.orderNumber,
          status: 'مسودة',
          date: new Date().toISOString().split('T')[0],
          warehouse,
          type: 'إخراج',
          recipient: auditOrder.customerName || 'عميل الطلبية',
          notes: `خصم آلي لطلبية رقم ${auditOrder.orderNumber}`,
          createdBy: user.name || 'النظام',
          createdById: user.id || '',
          items: wItems
        };
        await saveStockVoucher(payload);
      }

      // Mark order as deducted
      await saveSalesOrder({ ...auditOrder, stockDeducted: true });

      await addLog({
        userName: user.name,
        userId: user.id,
        module: 'المخزون',
        action: 'تدقيق وخصم',
        details: `تدقيق وخصم طلبية ${auditOrder.orderNumber} من المخزون`
      });

      Swal.fire({ icon: 'success', title: 'تم تثبيت الخصم بنجاح', timer: 1500, showConfirmButton: false });
      setShowAuditModal(false);
      fetchData();
    } catch (err) {
      setLoading(false);
      Swal.fire('خطأ', 'حدث خطأ أثناء تثبيت الخصم', 'error');
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    
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
      title: 'هل أنت متأكد؟',
      text: `هل تريد حقاً حذف ${selectedItems.length} صنف؟ لا يمكن التراجع عن هذا الإجراء!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف الكل',
      cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
      await deleteMultipleStockItems(selectedItems);
      await addLog({
        userName: user.name,
        userId: user.id,
        module: 'المخزون',
        action: 'حذف',
        details: `حذف ${selectedItems.length} أصناف من المخزون`
      });
      setSelectedItems([]);
      fetchData();
      Swal.fire({
        title: 'تم الحذف!',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  const handleBulkMerge = async () => {
    if (selectedItems.length < 2) {
      Swal.fire('تنبيه', 'يجب تحديد صنفين على الأقل للدمج', 'warning');
      return;
    }
    
    const firstItem = stock.find(s => s.id === selectedItems[0]) || {};

    const result = await MySwal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions',
        title: 'premium-modal-title'
      },
      buttonsStyling: false,
      title: 'دمج وتوحيد الأصناف المحددة',
      html: `
        <div style="font-size: 14px; margin-bottom: 15px; color: #64748b; line-height: 1.6;">
          سيتم توحيد <b>${selectedItems.length}</b> أصناف تحت رقم واسم صنف واحد، مع الاحتفاظ بكمياتها ومستودعاتها الحالية. المواصفات (الألوان/المقاسات) ستبقى كما هي لكل صنف فرعي.
        </div>
        <div class="premium-form">
          <div class="premium-form-group text-right">
            <label>رقم الصنف الموحد (SKU)</label>
            <input id="merge-item-number" class="premium-input" value="${firstItem.itemNumber || ''}" placeholder="مثال: SKU-0094">
          </div>
          <div class="premium-form-group text-right mt-3" style="margin-top: 15px;">
            <label>الاسم الموحد للصنف</label>
            <input id="merge-item-name" class="premium-input" value="${firstItem.name || ''}" placeholder="اسم الصنف الأساسي">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'تأكيد الدمج',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        const itemNumber = document.getElementById('merge-item-number').value.trim();
        const name = document.getElementById('merge-item-name').value.trim();
        if (!itemNumber || !name) {
          Swal.showValidationMessage('يرجى تعبئة الرقم والاسم');
          return false;
        }
        return { itemNumber, name };
      }
    });

    if (result.isConfirmed) {
      const { itemNumber, name } = result.value;
      
      setLoading(true);
      try {
        const promises = selectedItems.map(id => {
          const item = stock.find(s => s.id === id);
          if (item) {
            return saveStockItem({ ...item, itemNumber, name, updatedAt: new Date().toISOString() });
          }
          return Promise.resolve();
        });
        await Promise.all(promises);

        await addLog({
          userName: user.name,
          userId: user.id,
          module: 'المخزون',
          action: 'دمج',
          details: `تم توحيد ${selectedItems.length} أصناف تحت الرقم ${itemNumber}`
        });

        setSelectedItems([]);
        fetchData();
        Swal.fire({
          title: 'تم الدمج!',
          text: 'تم توحيد الأصناف بنجاح.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } catch (error) {
        console.error(error);
        Swal.fire('خطأ', 'حدث خطأ أثناء عملية الدمج', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePreviewNewSKU = () => {
    // Group by itemNumber to mimic existing grouped display logic
    const groupedBySKU = stock.reduce((acc, item) => {
      if (!acc[item.itemNumber]) acc[item.itemNumber] = [];
      acc[item.itemNumber].push(item);
      return acc;
    }, {});

    const groups = Object.values(groupedBySKU).map(items => {
      const first = items[0];
      return {
        oldItemNumber: first.itemNumber,
        name: first.name || '',
        category: first.category || 'غير محدد',
        itemsCount: items.length,
        variants: items.map(i => i.spec).filter(Boolean).join('، ')
      };
    });

    const needsReview = [];
    const processedGroups = [];
    
    // Group by base name to find exact matches with DIFFERENT SKUs
    const nameMap = {};
    groups.forEach(g => {
      const baseName = g.name.trim().replace(/\s+/g, ' ');
      if (!nameMap[baseName]) nameMap[baseName] = [];
      nameMap[baseName].push(g);
    });

    Object.values(nameMap).forEach(similarGroups => {
      if (similarGroups.length > 1) {
        similarGroups.forEach(g => {
          needsReview.push({
            name: g.name,
            oldItemNumber: g.oldItemNumber,
            category: g.category,
            reason: 'أصناف متعددة تحمل نفس الاسم الدقيق ولكن بأرقام مفصولة.',
            variants: g.variants
          });
          processedGroups.push(g);
        });
      } else {
        processedGroups.push(similarGroups[0]);
      }
    });

    // Alphabetical order
    processedGroups.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

    const counters = { FG: 1, FAB: 1, PKG: 1, CON: 1, AST: 1, UNK: 1 };
    const preview = [];

    processedGroups.forEach(g => {
      let prefix = 'UNK';
      if (g.category === 'بضاعة جاهزة' || g.category.includes('بضاعة')) prefix = 'FG';
      else if (g.category === 'أقمشة' || g.category.includes('قماش')) prefix = 'FAB';
      else if (g.category === 'تغليف' || g.category.includes('كرتون')) prefix = 'PKG';
      else if (g.category === 'مستهلكات' || g.category.includes('مستهلك')) prefix = 'CON';
      else if (g.category === 'أصول' || g.category.includes('أصل')) prefix = 'AST';
      else {
        needsReview.push({...g, reason: `تصنيف غير معروف (${g.category})`});
      }

      const newCode = `${prefix}-${String(counters[prefix]).padStart(5, '0')}`;
      counters[prefix]++;

      preview.push({
        name: g.name,
        category: g.category,
        oldCode: g.oldItemNumber,
        newCode: newCode,
        variants: g.variants
      });
    });

    let html = `
      <div style="text-align: right; direction: rtl; max-height: 65vh; overflow-y: auto; padding: 10px;">
        <h3 style="color: #0ea5e9; font-weight: bold; margin-bottom: 10px; font-size: 16px;">1. معاينة إعادة الترقيم (حسب الأقسام)</h3>
        <p style="font-size: 13px; color: #64748b; margin-bottom: 15px;">سيتم ترتيب الأصناف أبجدياً وإعطاء كل قسم عداد مستقل يبدأ من 00001.</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 25px;">
          <thead style="background: #0f172a; color: white;">
            <tr>
              <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">اسم الصنف</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">القسم</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">الكود الحالي</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; color: #fbbf24;">الكود الجديد</th>
            </tr>
          </thead>
          <tbody>
            ${preview.map(p => `
              <tr style="background: white; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${p.name}<div style="font-size: 11px; color: #94a3b8; font-weight: normal;">${p.variants || '-'}</div></td>
                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;"><span style="background: #e0f2fe; color: #0284c7; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${p.category}</span></td>
                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; color: #64748b;">${p.oldCode}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #0f172a; background: #f8fafc;">${p.newCode}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h3 style="color: #dc2626; font-weight: bold; margin-bottom: 10px; font-size: 16px;">2. أصناف تحتاج إلى مراجعة قبل التطبيق الفعلي</h3>
    `;

    if (needsReview.length === 0) {
      html += `<div style="background: #dcfce7; color: #166534; padding: 12px; border-radius: 8px; font-size: 13px;">لا توجد حالات تعارض. النظام جاهز للتطبيق.</div>`;
    } else {
      html += `
        <div style="background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; font-size: 13px; margin-bottom: 15px;">
          هذه الأصناف تحمل أسماء متطابقة ولكن بأرقام مختلفة. ينصح بدمجها يدوياً (عبر زر "دمج وتوحيد") قبل تفعيل الترقيم الجديد.
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead style="background: #dc2626; color: white;">
            <tr>
              <th style="padding: 8px; border: 1px solid #fca5a5; text-align: right;">اسم الصنف</th>
              <th style="padding: 8px; border: 1px solid #fca5a5; text-align: center;">الكود الحالي</th>
              <th style="padding: 8px; border: 1px solid #fca5a5; text-align: right;">المشكلة</th>
            </tr>
          </thead>
          <tbody>
            ${needsReview.map(r => `
              <tr style="background: #fef2f2; border-bottom: 1px solid #fca5a5;">
                <td style="padding: 8px; border: 1px solid #fca5a5; font-weight: bold;">${r.name}</td>
                <td style="padding: 8px; border: 1px solid #fca5a5; text-align: center;">${r.oldItemNumber}</td>
                <td style="padding: 8px; border: 1px solid #fca5a5; color: #b91c1c;">${r.reason}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    html += `</div>`;

    MySwal.fire({
      title: 'معاينة نظام الترقيم الجديد',
      html,
      width: '900px',
      showCloseButton: true,
      showConfirmButton: false,
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
      }
    });
  };

  const handleApplyNewSKU = async () => {
    const result = await MySwal.fire({
      title: 'تأكيد تفعيل نظام الترقيم الجديد',
      text: 'هل اطلعت على المعاينة وتأكدت من عدم وجود تعارضات؟ هذه العملية ستقوم بتحديث جميع أرقام الأصناف في قاعدة البيانات ولا يمكن التراجع عنها.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، قم بالتحديث',
      cancelButtonText: 'إلغاء',
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions'
      }
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const groupedBySKU = stock.reduce((acc, item) => {
        if (!acc[item.itemNumber]) acc[item.itemNumber] = [];
        acc[item.itemNumber].push(item);
        return acc;
      }, {});

      const groups = Object.values(groupedBySKU).map(items => {
        const first = items[0];
        return {
          oldItemNumber: first.itemNumber,
          name: first.name || '',
          category: first.category || 'غير محدد',
          items: items
        };
      });

      const nameMap = {};
      groups.forEach(g => {
        const baseName = g.name.trim().replace(/\s+/g, ' ');
        if (!nameMap[baseName]) nameMap[baseName] = [];
        nameMap[baseName].push(g);
      });

      const processedGroups = [];
      Object.values(nameMap).forEach(similarGroups => {
        similarGroups.forEach(g => processedGroups.push(g));
      });

      processedGroups.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

      const counters = { FG: 1, FAB: 1, PKG: 1, CON: 1, AST: 1, UNK: 1 };
      
      const updatePromises = [];

      processedGroups.forEach(g => {
        let prefix = 'UNK';
        if (g.category === 'بضاعة جاهزة' || g.category.includes('بضاعة')) prefix = 'FG';
        else if (g.category === 'أقمشة' || g.category.includes('قماش')) prefix = 'FAB';
        else if (g.category === 'تغليف' || g.category.includes('كرتون')) prefix = 'PKG';
        else if (g.category === 'مستهلكات' || g.category.includes('مستهلك')) prefix = 'CON';
        else if (g.category === 'أصول' || g.category.includes('أصل')) prefix = 'AST';

        const newCode = `${prefix}-${String(counters[prefix]).padStart(5, '0')}`;
        counters[prefix]++;

        g.items.forEach(item => {
          const updatedItem = { ...item, itemNumber: newCode };
          updatePromises.push(saveStockItem(updatedItem));
        });
      });

      await Promise.all(updatePromises);

      await addLog({
        userName: user.name,
        userId: user.id,
        module: 'المخزون',
        action: 'تحديث شامل',
        details: 'تم تطبيق نظام ترقيم SKU الجديد على جميع الأصناف'
      });

      const updatedStock = await getStock();
      setStock(updatedStock || []);

      MySwal.fire('نجاح', 'تم تحديث أرقام جميع الأصناف بنجاح.', 'success');
    } catch (error) {
      console.error("Error applying new SKU system:", error);
      MySwal.fire('خطأ', 'حدث خطأ أثناء تحديث الأصناف.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateNextID = (category) => {
    let prefix = 'UNK';
    if (!category) prefix = 'UNK';
    else if (category === 'بضاعة جاهزة' || category.includes('بضاعة')) prefix = 'FG';
    else if (category === 'أقمشة' || category.includes('قماش')) prefix = 'FAB';
    else if (category === 'تغليف' || category.includes('كرتون')) prefix = 'PKG';
    else if (category === 'مستهلكات' || category.includes('مستهلك')) prefix = 'CON';
    else if (category === 'أصول' || category.includes('أصل')) prefix = 'AST';

    const categoryItems = stock.filter(item => item.itemNumber && item.itemNumber.startsWith(prefix + '-'));
    
    if (categoryItems.length === 0) return `${prefix}-00001`;
    
    const ids = categoryItems.map(item => {
      const parts = item.itemNumber.split('-');
      if (parts.length > 1) {
        return parseInt(parts[1], 10) || 0;
      }
      return 0;
    });
    
    const maxID = Math.max(...ids, 0);
    return `${prefix}-${String(maxID + 1).padStart(5, '0')}`;
  };
  const getNextVoucherNumber = (type) => {
    let prefix = 'STK-IN';
    if (type === 'إخراج') prefix = 'STK-OUT';
    else if (type === 'إتلاف') prefix = 'STK-DMG';
    else if (type === 'تحويل') prefix = 'STK-TRF';
    else if (type === 'تسوية') prefix = 'STK-ADJ';

    const typeVouchers = vouchers.filter(v => v.voucherNumber && v.voucherNumber.startsWith(prefix));
    let maxNum = 0;
    typeVouchers.forEach(v => {
      const numPart = v.voucherNumber.replace(`${prefix}-`, '');
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });
    return `${prefix}-${String(maxNum + 1).padStart(4, '0')}`;
  };


  const handleAddCustomerModal = () => {
    const defaultType = voucherType === 'إدخال' ? 'مورد' : 'عميل';
    
    const getNextCustNumber = (type) => {
      const prefix = type === 'مورد' ? 'SUP-' : 'CLI-';
      let maxNum = 0;
      customers.forEach(c => {
        if (c.customerNumber && c.customerNumber.startsWith(prefix)) {
          const num = parseInt(c.customerNumber.replace(prefix, ''), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      return `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
    };

    const cities = (globalSettings.jordanianCities && globalSettings.jordanianCities.length > 0) ? globalSettings.jordanianCities : JORDANIAN_CITIES;
    const customerNumber = getNextCustNumber(defaultType);

    MySwal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions'
      },
      buttonsStyling: false,
      showCloseButton: false,
      html: `
        <div class="premium-modal-header">
          <div class="premium-modal-title">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-plus text-primary"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
             <span>إضافة عميل أو مورد جديد</span>
          </div>
          <div class="premium-modal-close" onclick="Swal.close()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </div>
        </div>
        <div class="premium-form">
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-tag text-muted"><path d="M12 2H2v10l9.29 9.29c.39.39 1.02.39 1.41 0l8.59-8.59c.39-.39.39-1.02 0-1.41z"/><line x1="7" x2="7.01" y1="7" y2="7"/></svg>
              النوع (عميل / مورد) *
            </label>
            <select id="swal-type" class="premium-input">
              <option value="عميل" ${defaultType === 'عميل' ? 'selected' : ''}>عميل</option>
              <option value="مورد" ${defaultType === 'مورد' ? 'selected' : ''}>مورد</option>
            </select>
          </div>
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hash text-muted"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>
              رقم العميل/المورد
            </label>
            <input id="swal-customerNumber" class="premium-input bg-slate-50 text-slate-500 cursor-not-allowed font-bold" value="${customerNumber}" disabled>
          </div>
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user text-muted"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              الاسم
            </label>
            <input id="swal-name" class="premium-input" placeholder="مثال: شركة مرجاس للتجارة">
          </div>
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-phone text-muted"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              رقم الهاتف
            </label>
            <input id="swal-phone" class="premium-input" placeholder="07xxxxxxxx">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; align-items: flex-end;">
            <div class="premium-form-group" style="margin-bottom: 0;">
              <label>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map text-muted"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>
                المدينة
              </label>
              <select id="swal-city" class="premium-input">
                <option value="">اختر المدينة...</option>
                ${cities.map(city => `<option value="${city}">${city}</option>`).join('')}
              </select>
            </div>
            <div class="premium-form-group" style="margin-bottom: 0;" id="swal-location-container">
              <!-- Dynamically populated -->
            </div>
          </div>
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-briefcase text-muted"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              القطاع
            </label>
            <select id="swal-sector" class="premium-input">
              <option value="">اختر القطاع...</option>
              ${(globalSettings.customerSectors || []).map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <div class="premium-form-group" id="swal-salesRep-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user text-muted"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              البائع (مندوب المبيعات) *
            </label>
            <select id="swal-salesRep" class="premium-input">
              <option value="زبائن الشركة" selected>زبائن الشركة</option>
              ${(globalSettings.salesReps || []).filter(rep => rep !== 'زبائن الشركة').map(rep => `<option value="${rep}">${rep}</option>`).join('')}
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'حفظ البيانات',
      cancelButtonText: 'إلغاء',
      focusConfirm: false,
      didOpen: () => {
        const typeSelect = document.getElementById('swal-type');
        const numberInput = document.getElementById('swal-customerNumber');
        const salesRepGroup = document.getElementById('swal-salesRep-group');
        const salesRepSelect = document.getElementById('swal-salesRep');

        const toggleSalesRep = (type) => {
          if (salesRepGroup && salesRepSelect) {
            if (type === 'مورد') {
              salesRepGroup.style.display = 'none';
              salesRepSelect.value = '';
            } else {
              salesRepGroup.style.display = 'block';
            }
          }
        };

        if (typeSelect) {
          toggleSalesRep(typeSelect.value);
          typeSelect.addEventListener('change', (e) => {
            const selectedType = e.target.value;
            toggleSalesRep(selectedType);
            if (numberInput) {
              numberInput.value = getNextCustNumber(selectedType);
            }
          });
        }

        const citySelect = document.getElementById('swal-city');
        const locationContainer = document.getElementById('swal-location-container');

        const updateLocationField = (selectedCity, currentVal) => {
          if (!locationContainer) return;
          if (selectedCity === 'عمان') {
            const areas = (globalSettings.ammanAreas && globalSettings.ammanAreas.length > 0) ? globalSettings.ammanAreas : [
              'عبدون', 'دير غبار', 'أم أذينة', 'الرابية', 'الشميساني', 'الصويفية', 'الجندويل', 
              'خلدا', 'تلاع العلي', 'أم السماق', 'ضاحية الرشيد', 'ضاحية الحسين', 'مرج الحمام', 
              'الجبيهة', 'شفا بدران', 'أبو نصير', 'طبربور', 'الهاشمي الشمالي', 'الهاشمي الجنوبي', 
              'جبل الحسين', 'جبل عمان', 'جبل اللويبدة', 'الأشرفية', 'الوحدات', 'رأس العين', 
              'وسط البلد', 'النصر', 'القويسمة', 'أبو علندا', 'خريبة السوق', 'المقابلين', 
              'الجويدة', 'سحاب', 'الموقر', 'ماركا الشمالية', 'ماركا الجنوبية', 'طارق', 
              'بسمان', 'البيادر', 'وادي السير', 'اليادودة', 'حسبان', 'البنيات'
            ];
            locationContainer.innerHTML = `
              <label>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin text-muted"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                المنطقة *
              </label>
              <select id="swal-location" class="premium-input">
                <option value="">اختر المنطقة...</option>
                ${areas.map(area => `<option value="${area}" ${currentVal === area ? 'selected' : ''}>${area}</option>`).join('')}
              </select>
            `;
          } else {
            locationContainer.innerHTML = `
              <label>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin text-muted"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                المنطقة
              </label>
              <input id="swal-location" class="premium-input" placeholder="مثال: وسط المدينة..." value="${selectedCity ? currentVal : ''}">
            `;
          }
        };

        if (citySelect) {
          updateLocationField(citySelect.value, '');
          citySelect.addEventListener('change', (e) => {
            updateLocationField(e.target.value, '');
          });
        }
      },
      preConfirm: () => {
        const type = document.getElementById('swal-type').value;
        const name = document.getElementById('swal-name').value;
        const phone = document.getElementById('swal-phone').value;
        const location = document.getElementById('swal-location').value;
        const city = document.getElementById('swal-city').value;
        const sector = document.getElementById('swal-sector').value;
        const salesRep = document.getElementById('swal-salesRep').value;

        if (!type) { Swal.showValidationMessage('يرجى اختيار النوع (عميل / مورد)'); return false; }
        if (!name) { Swal.showValidationMessage('يرجى ملء الاسم'); return false; }
        if (!phone || phone.trim().length !== 10 || isNaN(phone.trim())) { Swal.showValidationMessage('يرجى إدخال رقم هاتف يتكون من 10 أرقام'); return false; }
        if (!city) { Swal.showValidationMessage('يرجى اختيار المدينة'); return false; }
        if (city === 'عمان' && !location) {
          Swal.showValidationMessage('يرجى اختيار المنطقة لمدينة عمان');
          return false;
        }
        if (!sector) { Swal.showValidationMessage('يرجى اختيار القطاع'); return false; }
        if (type === 'عميل' && (globalSettings.salesReps || []).length > 0 && !salesRep) {
          Swal.showValidationMessage('يرجى اختيار البائع (مندوب المبيعات)');
          return false;
        }

        return { type, name, phone: phone.trim(), city, location, sector, status: 'نشط', salesRep: type === 'عميل' ? salesRep : '', customerNumber: document.getElementById('swal-customerNumber').value };
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await saveCustomer(result.value);
        if (res) {
          const logTypeLabel = result.value.type === 'مورد' ? 'مورد' : 'عميل';
          await addLog({ userName: user.name, userId: user.id, module: 'العملاء', action: 'إضافة', details: `إضافة ${logTypeLabel} من المخزون: ${result.value.name}` });
          Swal.fire({ title: 'تمت الإضافة بنجاح', icon: 'success', timer: 1500, showConfirmButton: false });
          const updatedCustomers = await getCustomers();
          setCustomers(updatedCustomers || []);
          setVoucherForm(prev => ({ ...prev, recipient: res.name }));
        }
      }
    });
  };

  const handleOpenModal = (item = null, isCopy = false) => {
    const isEdit = !!item && !isCopy;
    const initialData = (item && isCopy) ? {
      ...item,
      id: null,
      warehouse: '',
      spec: '',
      location: '',
      quantity: 0,
      lastMovement: 'إدخال',
      lastMovementDate: new Date().toISOString().split('T')[0],
      lastRecipient: '',
      notes: ''
    } : (isEdit ? { ...item } : {
      itemNumber: generateNextID(globalSettings.stockCategories?.[0]),
      itemCode: '',
      name: '',
      category: globalSettings.stockCategories?.[0] || '',
      warehouse: globalSettings.warehouses?.[0] || '',
      location: '',
      spec: '',
      unit: globalSettings.stockUnits?.[0] || '',
      quantity: 0,
      minLimit: 0,
      lastMovement: 'إدخال',
      lastMovementDate: new Date().toISOString().split('T')[0],
      lastRecipient: '',
      notes: ''
    });

    let title = 'إضافة صنف جديد للمخزون';
    if (isEdit) title = 'تعديل صنف';
    else if (isCopy) title = 'إضافة لون/موقع آخر لنفس الصنف';

    const custodyItemLocs = item ? assets.flatMap(a => (a.items || []).filter(i => i.name === item.name).flatMap(i => (i.location || '').split(/[,، -]/).filter(Boolean))) : [];
    const allItemLocations = item ? stock.filter(s => s.itemNumber === item.itemNumber).flatMap(s => (s.location || '').split(/[,، -]/).filter(Boolean)) : [];
    const uniqueItemLocations = [...new Set([...allItemLocations, ...custodyItemLocs])];
    
    const custodyAllLocs = assets.flatMap(a => (a.items || []).flatMap(i => (i.location || '').split(/[,، -]/).filter(Boolean)));
    const allSystemLocations = [...new Set([...(globalSettings.stockLocations || []), ...stock.flatMap(s => (s.location || '').split(/[,، -]/).filter(Boolean)), ...custodyAllLocs])].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));

    MySwal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup premium-modal-wide',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions'
      },
      buttonsStyling: false,
      showCloseButton: false,
      didOpen: () => {
        const categorySelect = document.getElementById('swal-category');
        const itemNumberInput = document.getElementById('swal-itemNumber');
        if (categorySelect && itemNumberInput) {
          categorySelect.addEventListener('change', (e) => {
            itemNumberInput.value = generateNextID(e.target.value);
          });
        }
        
        const addLocBtn = document.getElementById('add-new-location-btn');
        const locSelect = document.getElementById('swal-location');
        const newLocInput = document.getElementById('swal-new-location-input');
        if (addLocBtn && locSelect && newLocInput) {
          let isInputMode = false;
          addLocBtn.addEventListener('click', () => {
            isInputMode = !isInputMode;
            if (isInputMode) {
              locSelect.style.setProperty('display', 'none', 'important');
              newLocInput.style.setProperty('display', 'block', 'important');
              newLocInput.focus();
              addLocBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/></svg>';
              addLocBtn.title = "إلغاء الإضافة";
              addLocBtn.style.backgroundColor = '#ef4444';
            } else {
              locSelect.style.setProperty('display', 'block', 'important');
              newLocInput.style.setProperty('display', 'none', 'important');
              newLocInput.value = '';
              addLocBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>';
              addLocBtn.title = "إضافة موقع جديد";
              addLocBtn.style.backgroundColor = '#13898f';
            }
          });
        }
      },
      html: `
        <div class="premium-modal-header">
          <div class="premium-modal-title">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package text-primary"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
             <span>${title}</span>
          </div>
          <div class="premium-modal-close" onclick="Swal.close()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </div>
        </div>
        <div class="premium-form">
          <div class="grid grid-cols-12 gap-x-8 gap-y-6">
            
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>رقم الصنف (ID)</label>
              <input id="swal-itemNumber" class="premium-input" placeholder="SKU-0001" value="${initialData.itemNumber}" disabled style="background: var(--surface); cursor: not-allowed; font-weight: bold; color: var(--primary-dark); text-align: center;">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>اسم الصنف</label>
              <input id="swal-name" class="premium-input" placeholder="مثال: قماش أبيض تركي" value="${initialData.name}">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>التصنيف</label>
              <select id="swal-category" class="premium-input">
                <option value="" disabled>اختر التصنيف</option>
                ${globalSettings.stockCategories?.map(c => `<option value="${c}" ${initialData.category === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>

            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>رمز الصنف</label>
              <input id="swal-itemCode" class="premium-input" placeholder="" value="${initialData.itemCode || ''}">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>المخزن</label>
              <select id="swal-warehouse" class="premium-input">
                <option value="" disabled>اختر المخزن</option>
                ${globalSettings.warehouses?.map(w => `<option value="${w}" ${initialData.warehouse === w ? 'selected' : ''}>${w}</option>`).join('')}
              </select>
            </div>

            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>الموقع (داخل المخزن)</label>
              <div class="flex gap-2">
                <select id="swal-location" class="premium-input" style="flex: 1; margin-bottom: 0;">
                  <option value="">-- بدون موقع --</option>
                  ${allSystemLocations.map(loc => `<option value="${loc}" ${initialData.location === loc ? 'selected' : ''}>${loc}</option>`).join('')}
                  ${initialData.location && !allSystemLocations.includes(initialData.location) ? `<option value="${initialData.location}" selected>${initialData.location}</option>` : ''}
                </select>
                <input id="swal-new-location-input" class="premium-input" style="flex: 1; margin-bottom: 0; display: none !important;" placeholder="اسم الرف الجديد">
                <button id="add-new-location-btn" type="button" class="btn" style="background-color: #13898f; color: white; padding: 0 1rem; border-radius: 8px; flex-shrink: 0;" title="إضافة موقع جديد">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                </button>
              </div>
            </div>

            ${uniqueItemLocations.length > 0 ? `
            <div class="premium-form-group col-span-12 md:col-span-8">
               <label>أماكن تواجد الصنف الحالية</label>
               <div class="flex gap-1 flex-wrap" style="padding-top: 12px;">
                  ${uniqueItemLocations.map(loc => `<span style="border: 1.5px solid #10b981; color: #059669; background-color: #ecfdf5; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold;">${loc}</span>`).join('')}
               </div>
            </div>
            ` : '<div class="col-span-12 md:col-span-8"></div>'}

            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>اللون / المواصفة</label>
              <select id="swal-spec" class="premium-input">
                <option value="">اختر اللون/المواصفة</option>
                ${globalSettings.stockColors?.map(c => `<option value="${c}" ${initialData.spec === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>الكمية الحالية</label>
              <div class="flex gap-2">
                <input id="swal-quantity" type="number" class="premium-input" style="flex: 2; margin-bottom: 0;" value="${initialData.quantity}">
                <select id="swal-unit" class="premium-input" style="flex: 1; margin-bottom: 0;">
                  ${globalSettings.stockUnits?.map(u => `<option value="${u}" ${initialData.unit === u ? 'selected' : ''}>${u}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>الحد الأدنى (تنبيه)</label>
              <input id="swal-minLimit" type="number" class="premium-input" value="${initialData.minLimit || 0}">
            </div>

            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>آخر حركة</label>
              <select id="swal-lastMovement" class="premium-input">
                <option value="إدخال" ${initialData.lastMovement === 'إدخال' ? 'selected' : ''}>إدخال</option>
                <option value="إخراج" ${initialData.lastMovement === 'إخراج' ? 'selected' : ''}>إخراج</option>
                <option value="إتلاف" ${initialData.lastMovement === 'إتلاف' ? 'selected' : ''}>إتلاف</option>
                <option value="جرد وتسوية" ${initialData.lastMovement === 'جرد وتسوية' ? 'selected' : ''}>جرد وتسوية</option>
              </select>
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>تاريخ آخر حركة</label>
              <input id="swal-lastMovementDate" type="date" class="premium-input" value="${initialData.lastMovementDate}">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>آخر مستلم / مسؤول</label>
              <input id="swal-lastRecipient" class="premium-input" placeholder="اسم الشخص" value="${initialData.lastRecipient || ''}">
            </div>

            <div class="premium-form-group col-span-12 md:col-span-8">
              <label>ملاحظات</label>
              <textarea id="swal-notes" class="premium-input" placeholder="أي ملاحظات..." style="min-height: 80px;">${initialData.notes || ''}</textarea>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: isEdit ? 'تحديث البيانات' : 'حفظ الصنف الجديد',
      cancelButtonText: 'إلغاء',
      focusConfirm: false,
      preConfirm: () => {
        const data = {
          itemNumber: document.getElementById('swal-itemNumber').value,
          itemCode: document.getElementById('swal-itemCode').value,
          name: document.getElementById('swal-name').value,
          category: document.getElementById('swal-category').value,
          warehouse: document.getElementById('swal-warehouse').value,
          location: document.getElementById('swal-location').value,
          spec: document.getElementById('swal-spec').value,
          quantity: Number(document.getElementById('swal-quantity').value),
          unit: document.getElementById('swal-unit').value,
          minLimit: Number(document.getElementById('swal-minLimit').value),
          lastMovement: document.getElementById('swal-lastMovement').value,
          lastMovementDate: document.getElementById('swal-lastMovementDate').value,
          lastRecipient: document.getElementById('swal-lastRecipient').value,
          notes: document.getElementById('swal-notes').value,
          id: isEdit ? item.id : null
        };

        if (!data.itemNumber || !data.name || !data.warehouse) {
          Swal.showValidationMessage('يرجى ملء الاسم ورقم الصنف والمخزن');
          return false;
        }
        if (data.itemCode && data.itemCode.trim().length !== 13) {
          Swal.showValidationMessage('يجب أن يتكون رمز الصنف من 13 خانة بالضبط');
          return false;
        }

        const existingInWarehouse = stock.find(s => 
          s.itemNumber === data.itemNumber && 
          s.warehouse === data.warehouse && 
          s.spec === data.spec &&
          s.id !== data.id
        );
        if (existingInWarehouse) {
          Swal.showValidationMessage(`عذراً، يوجد بضاعة من هذا الصنف بنفس المواصفة/اللون مسبقاً في المستودع المختار (${data.warehouse})!`);
          return false;
        }

        return data;
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await saveStockItem(result.value);
        if (res) {
          await addLog({
            userName: user.name,
            userId: user.id,
            module: 'المخزون',
            action: isEdit ? 'تعديل' : 'إضافة',
            details: `${isEdit ? 'تعديل بيانات' : 'إضافة'} صنف مخزون: ${res.name} (${res.itemNumber})`
          });
          Swal.fire({
            icon: 'success',
            title: 'تم الحفظ بنجاح',
            timer: 1500,
          });
          fetchData();
        }
      }
    });
  };

  const handleQuickQuantityEdit = async (e, item) => {
    e.stopPropagation();
    const { value: newQuantity } = await MySwal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel'
      },
      buttonsStyling: false,
      title: 'تعديل سريع للكمية',
      html: `<div style="font-size: 14px; margin-bottom: 10px;">أدخل الكمية الجديدة للصنف:<br><b style="color:var(--primary);">${item.name}</b><br><span style="color:#64748b;font-size:12px;">المستودع: ${item.warehouse}</span></div>`,
      input: 'number',
      inputValue: item.quantity,
      inputAttributes: {
        min: 0,
        step: 1,
        style: 'text-align: center; font-size: 1.5rem; font-weight: bold; border: 2px solid #e2e8f0; border-radius: 8px; padding: 10px;'
      },
      showCancelButton: true,
      confirmButtonText: 'حفظ',
      cancelButtonText: 'إلغاء'
    });

    if (newQuantity !== undefined && newQuantity !== null && newQuantity !== '') {
      const parsedQty = parseInt(newQuantity);
      if (parsedQty >= 0) {
        await saveStockItem({ ...item, quantity: parsedQty, lastMovement: 'تعديل سريع', lastMovementDate: new Date().toISOString().split('T')[0] });
        fetchData();
        MySwal.fire({ icon: 'success', title: 'تم التحديث', timer: 1000, showConfirmButton: false });
      }
    }
  };

  const handleOpenVoucherModal = (type) => {
    setVoucherType(type);
    setVoucherForm({
      date: new Date().toISOString().split('T')[0],
      warehouse: globalSettings.warehouses?.[0] || '',
      destinationWarehouse: '',
      recipient: '',
      notes: '',
      items: [
        type === 'إدخال' 
          ? { itemNumber: '', name: '', category: globalSettings.stockCategories?.[0] || '', spec: '', quantity: 1, unit: globalSettings.stockUnits?.[0] || '', minLimit: 0, isNewItem: false }
          : { stockId: '', itemNumber: '', name: '', spec: '', quantity: 1, unit: '', location: '', availableQuantity: 0 }
      ]
    });
    setShowVoucherModal(true);
  };

  const addVoucherItemRow = () => {
    setVoucherForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        voucherType === 'إدخال'
          ? { itemNumber: '', name: '', category: globalSettings.stockCategories?.[0] || '', spec: '', quantity: 1, unit: globalSettings.stockUnits?.[0] || '', minLimit: 0, isNewItem: false }
          : { stockId: '', itemNumber: '', name: '', spec: '', quantity: 1, unit: '', location: '', availableQuantity: 0 }
      ]
    }));
  };

  const removeVoucherItemRow = (index) => {
    setVoucherForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateVoucherItem = (index, field, value) => {
    setVoucherForm(prev => {
      const updatedItems = [...prev.items];
      const item = { ...updatedItems[index], [field]: value };
      
      if (voucherType === 'إدخال' && field === 'itemNumber' && !item.isNewItem) {
        const existing = stock.find(s => s.itemNumber === value);
        if (existing) {
          item.name = existing.name;
          item.category = existing.category;
          item.unit = existing.unit;
          item.minLimit = existing.minLimit || 0;
        }
      }
      
      if (field === 'stockId') {
        const selectedStock = stock.find(s => s.id === value);
        if (selectedStock) {
          item.itemNumber = selectedStock.itemNumber;
          item.name = selectedStock.name;
          item.spec = selectedStock.spec;
          item.unit = selectedStock.unit;
          item.location = selectedStock.location;
          item.availableQuantity = selectedStock.quantity;
        }
      }
      
      updatedItems[index] = item;
      return { ...prev, items: updatedItems };
    });
  };

  const handleWarehouseChange = (e) => {
    const newWarehouse = e.target.value;
    setVoucherForm(prev => ({
      ...prev,
      warehouse: newWarehouse,
      items: [
        { stockId: '', itemNumber: '', name: '', spec: '', quantity: 1, unit: '', location: '', availableQuantity: 0 }
      ]
    }));
  };

  const handleSaveVoucher = async () => {
    if (!voucherForm.warehouse) {
      Swal.fire('خطأ', 'يرجى اختيار المستودع', 'error');
      return;
    }
    if (!voucherForm.date) {
      Swal.fire('خطأ', 'يرجى تحديد التاريخ', 'error');
      return;
    }
    if (voucherType === 'تحويل') {
      if (!voucherForm.destinationWarehouse) {
        Swal.fire('خطأ', 'يرجى اختيار مستودع الوجهة', 'error');
        return;
      }
      if (voucherForm.warehouse === voucherForm.destinationWarehouse) {
        Swal.fire('خطأ', 'مستودع المصدر والوجهة لا يمكن أن يكونا نفس المستودع', 'error');
        return;
      }
    } else {
      if (!voucherForm.recipient) {
        Swal.fire('خطأ', `يرجى اختيار ${voucherType === 'إدخال' ? 'المورد / الجهة المرسلة' : (voucherType === 'إتلاف' ? 'المسؤول عن الإتلاف' : 'المستلم / الجهة الطالبة')}`, 'error');
        return;
      }
    }
    if (!voucherForm.notes && voucherType !== 'تحويل' && voucherType !== 'إتلاف') {
      Swal.fire('خطأ', 'يرجى إدخال رقم السند المرجعي', 'error');
      return;
    }
    if (voucherForm.items.length === 0) {
      Swal.fire('خطأ', 'يجب إضافة صنف واحد على الأقل للسند', 'error');
      return;
    }

    for (let i = 0; i < voucherForm.items.length; i++) {
      const item = voucherForm.items[i];
      if (!item.stockId) {
        Swal.fire('خطأ', `يرجى اختيار الصنف في السطر ${i + 1}`, 'error');
        return;
      }
      if (!item.quantity || Number(item.quantity) <= 0) {
        Swal.fire('خطأ', `يجب إدخال كمية صحيحة (أكبر من صفر) في السطر ${i + 1}`, 'error');
        return;
      }
      if (!item.unit) {
        Swal.fire('خطأ', `يرجى اختيار أو إدخال الوحدة في السطر ${i + 1}`, 'error');
        return;
      }
      if ((voucherType === 'إخراج' || voucherType === 'إتلاف') && Number(item.quantity) > Number(item.availableQuantity)) {
        Swal.fire('خطأ', `الكمية ${voucherType === 'إتلاف' ? 'المتلفة' : 'المخرجة'} في السطر ${i + 1} تتجاوز الكمية المتوفرة (${item.availableQuantity})`, 'error');
        return;
      }
    }

    const payload = {
      ...voucherForm,
      type: voucherType,
      createdBy: user.name || 'مجهول',
      createdById: user.id || '',
      items: voucherForm.items.map(item => ({
        itemNumber: item.itemNumber,
        name: item.name,
        spec: item.spec || '',
        location: item.location || '',
        quantity: Number(item.quantity),
        unit: item.unit || '',
        category: item.category || '',
        minLimit: Number(item.minLimit || 0)
      }))
    };

    setLoading(true);
    const result = await saveStockVoucher(payload);
    if (result) {
      await addLog({
        userName: user.name,
        userId: user.id,
        module: 'المخزون',
        action: 'إضافة',
        details: `إنشاء سند ${voucherType}: ${result.voucherNumber} في مستودع ${result.warehouse} يحتوي على ${result.items.length} أصناف`
      });
      
      Swal.fire({
        icon: 'success',
        title: 'تم حفظ السند وتعديل الكميات بنجاح',
        timer: 1500,
        showConfirmButton: false
      });
      
      setShowVoucherModal(false);
      fetchData();
    } else {
      setLoading(false);
      Swal.fire('خطأ', 'حدث خطأ أثناء حفظ السند', 'error');
    }
  };

  const handleDelete = async (id) => {
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
      title: 'هل أنت متأكد؟',
      text: "لا يمكن التراجع عن هذا الإجراء!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
      const itemToDelete = stock.find(s => s.id === id);
      await deleteStockItem(id);
      await addLog({
        userName: user.name,
        userId: user.id,
        module: 'المخزون',
        action: 'حذف',
        details: `حذف صنف مخزون: ${itemToDelete?.name || id}`
      });
      fetchData();
      Swal.fire({
        title: 'تم الحذف!',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  const handleDeleteGroup = async (locations) => {
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
      title: 'هل أنت متأكد؟',
      text: `سيتم حذف هذا الصنف بالكامل (${locations.length} مواقع). لا يمكن التراجع!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
      const ids = locations.map(l => l.id);
      await deleteMultipleStockItems(ids);
      await addLog({
        userName: user.name,
        userId: user.id,
        module: 'المخزون',
        action: 'حذف',
        details: `حذف صنف بالكامل يضم ${locations.length} موقع/مواصفة`
      });
      fetchData();
      Swal.fire({
        title: 'تم الحذف!',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  const handleDeleteVoucher = async (voucherId, voucherNumber) => {
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
      title: 'هل أنت متأكد؟',
      text: `سيتم حذف السند رقم ${voucherNumber} بشكل نهائي ولن تتم استعادته.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
      await deleteStockVoucher(voucherId);
      await addLog({
        userName: user.name,
        userId: user.id,
        module: 'المخزون',
        action: 'حذف',
        details: `حذف السند رقم ${voucherNumber}`
      });
      fetchData();
      Swal.fire({
        title: 'تم الحذف!',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  const filteredVouchers = (vouchers || [])
    .filter(v => {
      if (!v) return false;
      const matchSearch = !voucherFilters.search || 
        v.voucherNumber?.toLowerCase().includes(voucherFilters.search.toLowerCase()) ||
        v.warehouse?.toLowerCase().includes(voucherFilters.search.toLowerCase()) ||
        v.recipient?.toLowerCase().includes(voucherFilters.search.toLowerCase()) ||
        v.createdBy?.toLowerCase().includes(voucherFilters.search.toLowerCase());
      const matchType = !voucherFilters.type || v.type === voucherFilters.type;
      const matchWarehouse = !voucherFilters.warehouse || v.warehouse === voucherFilters.warehouse;
      let matchDate = true;
      if (voucherFilters.fromDate || voucherFilters.toDate) {
        const d = new Date(v.date);
        d.setHours(0,0,0,0);
        
        if (voucherFilters.fromDate) {
          const start = new Date(voucherFilters.fromDate);
          start.setHours(0,0,0,0);
          if (d < start) matchDate = false;
        }
        if (voucherFilters.toDate) {
          const end = new Date(voucherFilters.toDate);
          end.setHours(23,59,59,999);
          if (d > end) matchDate = false;
        }
      }
      const matchesStatus = voucherFilterStatus === 'all' || 
                          (voucherFilterStatus === 'approved') || 
                          (voucherFilterStatus === 'pending' && false) || 
                          (voucherFilterStatus === 'rejected' && false);

      return matchSearch && matchType && matchWarehouse && matchDate && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = a && a.createdAt ? a.createdAt : '';
      const dateB = b && b.createdAt ? b.createdAt : '';
      return dateB.localeCompare(dateA);
    });

  const handlePrintVoucher = (v) => {
    const logoUrl = globalSettings.logoUrl || '/logo-mrsleep.png';
    const siteName = globalSettings.siteName || 'Mirjas HR';
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8"/>
        <title>سند ${v.type} - ${v.voucherNumber}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background:#fff; color:#111; direction:rtl; padding:24px; font-size:13px; }
          .voucher-page { max-width:800px; margin:0 auto; }
          .voucher-header { display:flex; align-items:center; justify-content:space-between; border-bottom:3px solid #0f172a; padding-bottom:16px; margin-bottom:20px; }
          .voucher-logo { max-height:70px; max-width:140px; object-fit:contain; }
          .voucher-title-block { text-align:center; }
          .voucher-title { font-size:22px; font-weight:800; letter-spacing:1px; color:#0f172a; }
          .voucher-subtitle { font-size:13px; color:#555; margin-top:4px; }
          .site-name { font-size:16px; font-weight:700; color:#0f172a; text-align:left; }
          .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px 18px; margin-bottom:18px; }
          .info-item label { font-size:11px; color:#64748b; font-weight:600; display:block; margin-bottom:2px; }
          .info-item span { font-size:13px; font-weight:700; color:#1e293b; }
          .type-badge { display:inline-block; padding:3px 12px; border-radius:20px; font-size:12px; font-weight:700; }
          .type-in { background:#dcfce7; color:#166534; }
          .type-out { background:#fee2e2; color:#991b1b; }
          .type-dmg { background:#fef3c7; color:#b45309; }
          table { width:100%; border-collapse:collapse; margin-bottom:18px; }
          thead tr { background:#0f172a; color:#fff; }
          thead th { padding:9px 12px; text-align:right; font-size:12px; font-weight:600; }
          tbody tr:nth-child(even) { background:#f8fafc; }
          tbody tr:nth-child(odd) { background:#fff; }
          tbody td { padding:8px 12px; border-bottom:1px solid #e2e8f0; font-size:12px; }
          .notes-box { border:1px solid #e2e8f0; border-radius:8px; padding:12px 16px; background:#fffbeb; margin-bottom:18px; }
          .notes-box label { font-size:11px; font-weight:700; color:#92400e; display:block; margin-bottom:6px; }
          .notes-box p { font-size:13px; color:#1e293b; line-height:1.6; min-height:40px; }
          .sig-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; margin-top:28px; }
          .sig-box { text-align:center; border-top:1px solid #94a3b8; padding-top:8px; }
          .sig-box label { font-size:11px; color:#64748b; font-weight:600; }
          .footer { text-align:center; font-size:10px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:10px; margin-top:10px; }
          @media print { body { padding:10px; } }
        </style>
      </head>
      <body>
        <div class="voucher-page">
          <div class="voucher-header">
            <img src="${logoUrl}" class="voucher-logo" alt="${siteName}" onerror="this.style.display='none'" />
            <div class="voucher-title-block">
              <div class="voucher-title">سند ${v.type === 'إدخال' ? 'إدخال مواد' : (v.type === 'إتلاف' ? 'إتلاف مواد' : 'إخراج مواد')}</div>
              <div class="voucher-subtitle">رقم السند: <strong>${v.voucherNumber || '-'}</strong></div>
            </div>
            <div class="site-name">${siteName}</div>
          </div>
          <div class="info-grid">
            <div class="info-item"><label>نوع السند</label><span class="type-badge ${v.type === 'إدخال' ? 'type-in' : (v.type === 'إتلاف' ? 'type-dmg' : 'type-out')}">${v.type === 'إدخال' ? '📥 إدخال' : (v.type === 'إتلاف' ? '🗑️ إتلاف' : '📤 إخراج')}</span></div>
            <div class="info-item"><label>التاريخ</label><span>${v.date || '-'}</span></div>
            <div class="info-item"><label>المستودع</label><span>${v.warehouse || '-'}</span></div>
            <div class="info-item"><label>المستلم / المسؤول</label><span>${v.recipient || '-'}</span></div>
            <div class="info-item"><label>أُنشئ بواسطة</label><span>${v.createdBy || '-'}</span></div>
            <div class="info-item"><label>تاريخ الإنشاء</label><span>${v.createdAt ? new Date(v.createdAt).toLocaleString('en-GB') : '-'}</span></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>رقم الصنف</th>
                <th>اسم الصنف</th>
                ${!(v.type === 'إدخال' || v.type === 'إخراج') ? '<th>المواصفة</th>' : ''}
                <th>الموقع</th>
                <th>الكمية</th>
                <th>الوحدة</th>
              </tr>
            </thead>
            <tbody>
              ${(v.items || []).map((item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${item.itemNumber || '-'}</strong></td>
                  <td>${item.name || '-'}</td>
                  ${!(v.type === 'إدخال' || v.type === 'إخراج') ? `<td>${item.spec || '-'}</td>` : ''}
                  <td>${item.location || '-'}</td>
                  <td><strong>${item.quantity}</strong></td>
                  <td>${item.unit || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="notes-box">
            <label>📝 الملاحظات</label>
            <p>${v.notes || 'لا توجد ملاحظات'}</p>
          </div>
          <div class="sig-grid">
            <div class="sig-box"><label>توقيع المستلم</label></div>
            <div class="sig-box"><label>توقيع المشرف</label></div>
            <div class="sig-box"><label>توقيع أمين المستودع</label></div>
          </div>
          <div class="footer">طُبع في: ${new Date().toLocaleString('en-GB')} | ${siteName}</div>
        </div>
        <script>window.onload = () => { window.print(); }<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const stockNavItems = [
    {
      id: 'items',
      label: 'الأصناف الحالية',
      icon: <Layers />,
      color: '#0ea5e9',
      bgLight: '#e0f2fe',
      customBadge: `${stock.length} صنف`,
      onClick: () => setActiveStockTab('items'),
      isActive: activeStockTab === 'items'
    },
    {
      id: 'vouchers_in',
      label: 'سندات الإدخال',
      icon: <Download />,
      color: '#16a34a',
      bgLight: '#dcfce7',
      customBadge: `${vouchers.filter(v => v.type === 'إدخال').length} سند`,
      onClick: () => { setActiveStockTab('vouchers'); setVoucherFilters(prev => ({ ...prev, type: 'إدخال' })); setVoucherFilterStatus('all'); },
      isActive: activeStockTab === 'vouchers' && voucherFilters.type === 'إدخال'
    },
    {
      id: 'vouchers_out',
      label: 'سندات الإخراج',
      icon: <Upload />,
      color: '#dc2626',
      bgLight: '#fee2e2',
      customBadge: `${vouchers.filter(v => v.type === 'إخراج').length} سند`,
      onClick: () => { setActiveStockTab('vouchers'); setVoucherFilters(prev => ({ ...prev, type: 'إخراج' })); setVoucherFilterStatus('all'); },
      isActive: activeStockTab === 'vouchers' && voucherFilters.type === 'إخراج'
    },
    {
      id: 'vouchers_trf',
      label: 'سندات التحويل',
      icon: <ArrowUpDown />,
      color: '#0284c7',
      bgLight: '#e0f2fe',
      customBadge: `${vouchers.filter(v => v.type === 'تحويل').length} سند`,
      onClick: () => { setActiveStockTab('vouchers'); setVoucherFilters(prev => ({ ...prev, type: 'تحويل' })); setVoucherFilterStatus('all'); },
      isActive: activeStockTab === 'vouchers' && voucherFilters.type === 'تحويل'
    },
    {
      id: 'vouchers_dmg',
      label: 'سندات التالف',
      icon: <AlertTriangle />,
      color: '#ea580c',
      bgLight: '#ffedd5',
      customBadge: `${vouchers.filter(v => v.type === 'إتلاف').length} سند`,
      onClick: () => { setActiveStockTab('vouchers'); setVoucherFilters(prev => ({ ...prev, type: 'إتلاف' })); setVoucherFilterStatus('all'); },
      isActive: activeStockTab === 'vouchers' && voucherFilters.type === 'إتلاف'
    },
    {
      id: 'audit',
      label: 'طلبات خصم المخزون',
      icon: <AlertTriangle />,
      color: '#8b5cf6',
      bgLight: '#f3e8ff',
      customBadge: `${ordersToAudit.length} طلبية`,
      onClick: () => setActiveStockTab('audit'),
      isActive: activeStockTab === 'audit'
    },
    {
      id: 'stocktake',
      label: 'الجرد والتسوية',
      icon: <ClipboardList />,
      color: '#f59e0b',
      bgLight: '#fef3c7',
      customBadge: `${stocktakes.length} عملية`,
      onClick: () => setActiveStockTab('stocktake'),
      isActive: activeStockTab === 'stocktake'
    }
  ];

  const visibleNavItems = stockNavItems;
  const gridColumns = visibleNavItems.length;



  return (
    <div className="animate-fade-in pb-10">

      {/* ===== HEADER ===== */}
      <div className="flex-responsive mb-5 items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="text-primary" /> إدارة المخزون
          </h2>
          <p className="text-muted">متابعة المواد الخام والمخزون في جميع المستودعات</p>
        </div>

        {/* Actions Bar */}
        {canPerformAction(user, 'ADD', 'STOCK', globalSettings) && (
          <div className="flex items-center gap-2 flex-wrap no-print">
            <button
              onClick={() => handleOpenModal()}
              className="btn-stock-action btn-stock-add"
            >
              <Plus size={16} /> إضافة صنف جديد
            </button>
            <button
              onClick={() => handleOpenVoucherModal('إدخال')}
              className="btn-stock-action btn-stock-in"
            >
              <Download size={16} /> سند إدخال
            </button>
            <button
              onClick={() => handleOpenVoucherModal('إخراج')}
              className="btn-stock-action btn-stock-out"
            >
              <Upload size={16} /> سند إخراج
            </button>
            <button
              onClick={() => handleOpenVoucherModal('إتلاف')}
              className="btn-stock-action btn-stock-damage"
            >
              <AlertTriangle size={16} /> سند إتلاف
            </button>
            <button
              onClick={() => handleOpenVoucherModal('تحويل')}
              className="btn-stock-action hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: '#ffffff', border: 'none', boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)' }}
            >
              <ArrowUpDown size={16} /> تحويل بضائع من مخزون ل مخزون
            </button>
          </div>
        )}
      </div>

      {/* ===== ACTION SQUARES BAR ===== */}
      <div className="overflow-x-auto no-print mb-6 pb-2" style={{ direction: 'rtl' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridColumns}, 1fr)`, gap: '12px', minWidth: `${gridColumns * 120}px` }}>
          {visibleNavItems.map(item => (
            <div
              key={item.id}
              onClick={item.onClick}
              onMouseEnter={(e) => {
                if (!item.isActive) {
                  e.currentTarget.style.borderColor = item.color;
                  e.currentTarget.style.boxShadow = `0 6px 15px -3px ${item.color}20`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!item.isActive) {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 4px 10px -2px rgba(0, 0, 0, 0.03)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
              style={{
                backgroundColor: item.isActive ? item.color : '#ffffff',
                border: `1.5px solid ${item.isActive ? item.color : '#e2e8f0'}`,
                borderRadius: '16px',
                padding: '16px 8px 12px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: item.isActive 
                  ? `0 10px 25px -5px ${item.color}40` 
                  : '0 4px 10px -2px rgba(0, 0, 0, 0.03)',
                color: item.isActive ? '#ffffff' : '#334155',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                height: '120px',
                transform: item.isActive ? 'scale(1.03)' : 'scale(1)',
              }}
            >
              <div style={{ color: item.isActive ? '#ffffff' : item.color, marginBottom: '4px' }}>
                {React.cloneElement(item.icon, { size: 28, strokeWidth: 1.5 })}
              </div>
              
              <span style={{ fontSize: '13px', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2' }}>
                {item.label}
              </span>
              
              <div style={{
                backgroundColor: item.isActive ? 'rgba(255,255,255,0.2)' : item.bgLight,
                color: item.isActive ? '#ffffff' : item.color,
                padding: '2px 10px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: 'auto',
                border: item.isActive ? 'none' : `1px solid ${item.color}20`
              }}>
                <span>{item.customBadge}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== TAB: ITEMS ===== */}
      {activeStockTab === 'items' && (
        <>
          <div className="flex gap-2 flex-wrap items-center mb-4 no-print">
            <select 
              className="input-field text-sm" 
              style={{ width: 'auto', marginBottom: 0, height: '40px', padding: '0 2rem 0 1rem', borderRadius: '12px' }}
              value={filters.warehouse}
              onChange={(e) => setFilters({...filters, warehouse: e.target.value})}
            >
              <option value="">جميع المستودعات</option>
              {globalSettings.warehouses?.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            <select 
              className="input-field text-sm" 
              style={{ width: 'auto', marginBottom: 0, height: '40px', padding: '0 2rem 0 1rem', borderRadius: '12px' }}
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
            >
              <option value="">جميع التصنيفات</option>
              {globalSettings.stockCategories?.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            
            <select 
              className="input-field text-sm" 
              style={{ width: 'auto', marginBottom: 0, height: '40px', padding: '0 2rem 0 1rem', borderRadius: '12px' }}
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="">جميع الحالات</option>
              <option value="متوفر">متوفر</option>
              <option value="ناقص">ناقص (تحت الحد الأدنى)</option>
              <option value="نفد">نفد (صفر)</option>
            </select>
            
            {(filters.warehouse || filters.category || filters.status) && (
              <button 
                onClick={() => setFilters({ warehouse: '', category: '', status: '' })}
                className="btn btn-outline text-sm"
                style={{ height: '40px', borderRadius: '12px', padding: '0 1rem' }}
              >
                إلغاء التصفية
              </button>
            )}

            {selectedItems.length > 0 && canPerformAction(user, 'EDIT', 'STOCK', globalSettings) && (
              <button className="btn flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white mr-auto" onClick={handleBulkMerge}>
                <Layers size={18} /> دمج وتوحيد ({selectedItems.length})
              </button>
            )}
            {selectedItems.length > 0 && canPerformAction(user, 'DELETE', 'STOCK', globalSettings) && (
              <button className="btn btn-danger flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white" onClick={handleBulkDelete}>
                <Trash2 size={18} /> حذف المحدد ({selectedItems.length})
              </button>
            )}
          </div>

          <div className="glass-panel mb-4 no-print" style={{ padding: '0.8rem 1rem' }}>
            <div className="flex gap-4 items-center justify-between w-full flex-wrap md:flex-nowrap">
              <div className="flex items-center gap-3 w-full md:max-w-md">
                <Search className="text-muted shrink-0" size={20} />
                <input 
                  type="text" 
                  placeholder="بحث برقم الصنف، الاسم، أو التصنيف..." 
                  className="input-field w-full max-w-3xl" 
                  style={{ marginBottom: 0 }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="text-sm font-medium text-muted shrink-0 whitespace-nowrap">
                إجمالي الأصناف المختلفة: <span className="text-primary">{groupedStock.length}</span>
              </div>
            </div>
          </div>

          <div className="table-container glass-panel overflow-x-auto">
            <table className="min-w-[1000px]">
              <thead>
                <tr>
                  <th className="w-10 text-center">
                    <input type="checkbox" className="w-4 h-4 cursor-pointer accent-primary"
                      checked={filteredStock.length > 0 && selectedItems.length === filteredStock.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th onClick={() => handleSort('itemNumber')} className="cursor-pointer hover:bg-slate-50 transition-colors text-center">
                    <div className="flex items-center justify-center gap-2">رقم الصنف <ArrowUpDown size={14} className="text-muted" /></div>
                  </th>
                  <th onClick={() => handleSort('itemCode')} className="cursor-pointer hover:bg-slate-50 transition-colors text-center">
                    <div className="flex items-center justify-center gap-2">رمز الصنف <ArrowUpDown size={14} className="text-muted" /></div>
                  </th>
                  <th onClick={() => handleSort('name')} className="cursor-pointer hover:bg-slate-50 transition-colors text-right w-1/4 pr-4">
                    <div className="flex items-center justify-start gap-2">الاسم <ArrowUpDown size={14} className="text-muted" /></div>
                  </th>
                  <th className="text-center">التصنيف</th>
                  <th className="text-center">المخزن</th>
                  <th className="text-center">الموقع</th>
                  <th className="text-center">المواصفة</th>
                  <th className="text-center">الكمية</th>
                  <th className="text-center">الوحدة</th>
                  <th className="text-center">الحالة</th>
                  <th className="text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {groupedStock.map(group => {
                  const isExpanded = expandedRows.includes(group.itemNumber);
                  const isAllSelected = group.locations.every(loc => selectedItems.includes(loc.id));
                  const isSomeSelected = group.locations.some(loc => selectedItems.includes(loc.id));
                  const status = getStatus({ quantity: group.totalQuantity, minLimit: group.minLimit });
                  const uniqueSpecs = [...new Set(group.locations.map(l => l.spec).filter(Boolean))];
                  const displaySpec = uniqueSpecs.length > 1 ? 'متعدد الألوان' : (uniqueSpecs[0] || group.spec || '-');
                  return (
                    <React.Fragment key={`group-${group.itemNumber}`}>
                      <tr className={`hover:bg-slate-50 transition-colors ${isSomeSelected ? 'bg-primary/5' : ''} cursor-pointer`} onClick={() => toggleRow(group.itemNumber)}>
                        <td onClick={e => e.stopPropagation()} className="text-center">
                          <input type="checkbox" className="w-4 h-4 cursor-pointer accent-primary"
                            checked={isAllSelected}
                            ref={input => { if (input) input.indeterminate = isSomeSelected && !isAllSelected; }}
                            onChange={() => handleSelectGroup(group.itemNumber, group.locations)}
                          />
                        </td>
                        <td className="font-mono text-xs font-bold text-center">
                          <div className="flex items-center justify-center gap-1">
                            {isExpanded ? <ChevronDown size={14} className="text-primary" /> : <ChevronRight size={14} className="text-muted" />}
                            {group.itemNumber}
                          </div>
                        </td>
                        <td className="font-mono text-sm text-muted text-center">{group.itemCode || '-'}</td>
                        <td className="font-semibold text-right pr-4">{group.name}</td>
                        <td className="text-center"><span className="badge badge-info">{group.category}</span></td>
                        <td className="text-sm text-center">
                          <div className="badge bg-slate-100 text-slate-700 mx-auto">
                            {group.locations.length} {group.locations.length === 1 ? 'موقع' : 'مواقع'}
                          </div>
                        </td>
                        <td className="text-sm text-center">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {(() => {
                              const custodyItemLocs = assets.flatMap(a => (a.items || []).filter(i => i.name === group.name).flatMap(i => (i.location || '').split(/[,، -]/).filter(Boolean)));
                              const locs = [...new Set([...group.locations.flatMap(loc => (loc.location || '').split(/[,، -]/).filter(Boolean)), ...custodyItemLocs])];
                              if (locs.length === 0) return <span className="text-muted">-</span>;
                              return locs.map((locStr, idx) => (
                                <span key={idx} style={{ border: '1.5px solid #10b981', color: '#059669', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                                  {locStr}
                                </span>
                              ));
                            })()}
                          </div>
                        </td>
                        <td className="text-sm text-center">{displaySpec}</td>
                        <td className="text-center" onClick={(e) => {
                          if (group.locations.length === 1 && canPerformAction(user, 'EDIT', 'STOCK', globalSettings)) {
                            handleQuickQuantityEdit(e, group.locations[0]);
                          } else {
                            e.stopPropagation();
                            toggleRow(group.itemNumber);
                          }
                        }}>
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span className={`font-bold ${status.color.replace('bg-', 'text-')} flex items-center gap-1 ${group.locations.length === 1 && canPerformAction(user, 'EDIT', 'STOCK', globalSettings) ? 'cursor-pointer hover:opacity-80 px-2 py-0.5 bg-slate-100 rounded-lg transition-all' : ''}`} title={group.locations.length === 1 ? 'انقر لتعديل الكمية سريعاً' : ''}>
                              {group.totalQuantity}
                              {group.locations.length === 1 && canPerformAction(user, 'EDIT', 'STOCK', globalSettings) && <Edit2 size={12} className="text-muted" />}
                            </span>
                            <div className="text-[10px] text-muted">الحد: {group.minLimit}</div>
                          </div>
                        </td>
                        <td className="text-center text-sm">{group.unit}</td>
                        <td className="text-center">
                          <div className="flex justify-center">
                            <span className={`badge ${status.color} text-white flex items-center justify-center gap-1 w-fit`}>{status.label}</span>
                          </div>
                        </td>
                        <td onClick={e => e.stopPropagation()} className="text-center">
                          <div className="flex justify-center gap-2">
                            <button className="icon-btn" style={{ color: '#13898f', background: '#e0f2fe' }} title="معاينة أماكن التواجد"
                              onClick={() => { setSelectedItemForLocations(group); setShowLocationsModal(true); }}>
                              <Eye size={16} strokeWidth={2} />
                            </button>
                            {canPerformAction(user, 'ADD', 'STOCK', globalSettings) && (
                              <button className="icon-btn icon-btn-add" title="إضافة لون/موقع آخر لنفس الصنف"
                                onClick={() => handleOpenModal(group.locations[0], true)}>
                                <Plus size={16} strokeWidth={2} />
                              </button>
                            )}
                            {canPerformAction(user, 'DELETE', 'STOCK', globalSettings) && (
                              <button className="icon-btn icon-btn-delete" title="حذف الصنف بالكامل"
                                onClick={() => handleDeleteGroup(group.locations)}>
                                <Trash2 size={16} strokeWidth={2} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && group.locations.map((loc, idx) => {
                        const isLocSelected = selectedItems.includes(loc.id);
                        const locStatus = getStatus(loc);
                        return (
                          <tr key={loc.id} className={`bg-slate-50/60 ${isLocSelected ? 'bg-primary/10' : ''}`}>
                            <td onClick={e => e.stopPropagation()} className="text-center">
                              <input type="checkbox" className="w-4 h-4 cursor-pointer accent-primary" checked={isLocSelected} onChange={() => handleSelectItem(loc.id)} />
                            </td>
                            <td className="font-mono text-xs text-muted text-center">↳</td>
                            <td className="font-mono text-sm text-muted text-center">-</td>
                            <td className="text-sm text-muted text-right pr-4">تفاصيل الموقع {idx + 1}</td>
                            <td className="text-center"><span className="badge badge-info opacity-70">{loc.category}</span></td>
                            <td className="text-sm text-center">
                              <div className="flex items-center justify-center gap-1"><MapPin size={12} className="text-primary" /> {loc.warehouse}</div>
                              
                            </td>
                            <td className="text-sm text-muted text-center">-</td>
                            <td className="text-sm text-muted text-center">{loc.spec}</td>
                            <td className="text-center" onClick={(e) => {
                              if (canPerformAction(user, 'EDIT', 'STOCK', globalSettings)) {
                                handleQuickQuantityEdit(e, loc);
                              }
                            }}>
                              <div className="flex justify-center">
                                <span className={`font-bold ${locStatus.color.replace('bg-', 'text-')} flex items-center gap-1 ${canPerformAction(user, 'EDIT', 'STOCK', globalSettings) ? 'cursor-pointer hover:opacity-80 px-2 py-0.5 bg-white rounded-lg shadow-sm border border-slate-100 transition-all' : ''}`} title="انقر لتعديل الكمية سريعاً">
                                  {loc.quantity}
                                  {canPerformAction(user, 'EDIT', 'STOCK', globalSettings) && <Edit2 size={12} className="text-muted" />}
                                </span>
                              </div>
                            </td>
                            <td className="text-center text-sm text-muted">{loc.unit}</td>
                            <td className="text-center">
                              <div className="flex justify-center">
                                <span className={`badge ${locStatus.color} text-white flex items-center justify-center gap-1 w-fit opacity-80`}>{locStatus.label}</span>
                              </div>
                            </td>
                            <td className="text-center">
                              <div className="flex justify-center gap-2">
                                {canPerformAction(user, 'EDIT', 'STOCK', globalSettings) && (
                                  <button className="icon-btn icon-btn-edit" title="تعديل بيانات الموقع" onClick={() => handleOpenModal(loc)}>
                                    <Edit2 size={16} />
                                  </button>
                                )}
                                {canPerformAction(user, 'DELETE', 'STOCK', globalSettings) && (
                                  <button className="icon-btn icon-btn-delete" title="حذف" onClick={() => handleDelete(loc.id)}>
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
                {groupedStock.length === 0 && (
                  <tr><td colSpan="10" className="text-center p-10 text-muted italic">لا توجد أصناف تطابق البحث</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ===== TAB: VOUCHERS ===== */}
      {activeStockTab === 'vouchers' && (
        <>
          <div className="glass-panel mb-4 no-print" style={{ padding: '1rem 1.2rem' }}>
            <div className="flex gap-3 items-center flex-wrap">
              {/* Text Search */}
              <div className="flex items-center gap-2 w-full md:max-w-xs">
                <Search className="text-muted shrink-0" size={18} />
                <input 
                  type="text" 
                  placeholder="رقم السند، المسؤول، المستودع..." 
                  className="input-field w-full" 
                  style={{ marginBottom: 0, height: '40px', borderRadius: '12px' }}
                  value={voucherFilters.search} 
                  onChange={e => setVoucherFilters({ ...voucherFilters, search: e.target.value })} 
                />
              </div>


              {/* Warehouse Filter */}
              <select 
                className="input-field text-sm" 
                style={{ width: 'auto', marginBottom: 0, height: '40px', borderRadius: '12px', padding: '0 1.5rem 0 0.8rem' }}
                value={voucherFilters.warehouse} 
                onChange={e => setVoucherFilters({ ...voucherFilters, warehouse: e.target.value })}
              >
                <option value="">كل المستودعات</option>
                {globalSettings.warehouses?.map(w => <option key={w} value={w}>{w}</option>)}
              </select>

              {/* Date Pickers */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Flatpickr
                  value={voucherFilters.fromDate}
                  onChange={([date]) => {
                    if (date) {
                      const yyyy = date.getFullYear();
                      const mm = String(date.getMonth() + 1).padStart(2, '0');
                      const dd = String(date.getDate()).padStart(2, '0');
                      setVoucherFilters({ ...voucherFilters, fromDate: `${yyyy}-${mm}-${dd}` });
                    } else {
                      setVoucherFilters({ ...voucherFilters, fromDate: '' });
                    }
                  }}
                  options={{ locale: Arabic, dateFormat: 'Y-m-d', disableMobile: true }}
                  placeholder="من تاريخ 📆"
                  className="input-field text-sm animate-fade-in"
                  style={{ width: '130px', height: '40px', borderRadius: '12px', padding: '0 1rem', marginBottom: 0 }}
                />
                <Flatpickr
                  value={voucherFilters.toDate}
                  onChange={([date]) => {
                    if (date) {
                      const yyyy = date.getFullYear();
                      const mm = String(date.getMonth() + 1).padStart(2, '0');
                      const dd = String(date.getDate()).padStart(2, '0');
                      setVoucherFilters({ ...voucherFilters, toDate: `${yyyy}-${mm}-${dd}` });
                    } else {
                      setVoucherFilters({ ...voucherFilters, toDate: '' });
                    }
                  }}
                  options={{ locale: Arabic, dateFormat: 'Y-m-d', disableMobile: true }}
                  placeholder="إلى تاريخ 📆"
                  className="input-field text-sm animate-fade-in"
                  style={{ width: '130px', height: '40px', borderRadius: '12px', padding: '0 1rem', marginBottom: 0 }}
                />
              </div>

              {/* Status Filter (Dropdown) */}
              <select 
                className="input-field text-sm" 
                style={{ width: 'auto', minWidth: '200px', marginBottom: 0, height: '40px', borderRadius: '12px', padding: '0 1.5rem 0 0.8rem' }}
                value={voucherFilterStatus} 
                onChange={e => setVoucherFilterStatus(e.target.value)}
              >
                <option value="all">سجل جميع الطلبات</option>
                <option value="pending">الطلبات المعلقة فقط</option>
                <option value="approved">الطلبات الموافق عليها</option>
                <option value="rejected">الطلبات المرفوضة</option>
              </select>

              {/* Clear Filter Button (only if active) */}
              {(voucherFilters.search || voucherFilters.warehouse || voucherFilters.fromDate || voucherFilters.toDate || voucherFilterStatus !== 'all') && (
                <button
                  type="button"
                  className="btn btn-outline flex items-center justify-center gap-1 transition-all font-semibold mr-auto"
                  style={{ borderRadius: '12px', height: '40px', padding: '0 1.2rem', fontSize: '0.85rem' }}
                  onClick={() => {
                    setVoucherFilters({ search: '', type: '', warehouse: '', fromDate: '', toDate: '' });
                    setVoucherFilterStatus('all');
                  }}
                >
                  <X size={16} /> إلغاء التصفية
                </button>
              )}

              <div className="text-sm text-muted font-medium shrink-0 whitespace-nowrap">
                إجمالي: <span className="text-primary font-bold">{filteredVouchers.length}</span>
              </div>
            </div>
          </div>

          <div className="table-container glass-panel overflow-x-auto">
            <table className="min-w-[900px]">
              <thead>
                <tr>
                  <th className="text-center">رقم السند</th>
                  <th className="text-center">النوع</th>
                  <th className="text-center">التاريخ</th>
                  <th className="text-center">المستودع</th>
                  <th className="text-center">المستلم/المسؤول</th>
                  <th className="text-center">عدد الأصناف</th>
                  <th className="text-center">أُنشئ بواسطة</th>
                  <th className="text-center">ملاحظات</th>
                  <th className="text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredVouchers.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="text-center"><span className="font-mono text-xs font-bold text-primary">{v.voucherNumber}</span></td>
                    <td className="text-center">
                      <span className={`badge font-bold ${v.type === 'إدخال' ? 'bg-green-100 text-green-800' : (v.type === 'إتلاف' ? 'bg-amber-100 text-amber-800' : v.type === 'تحويل' ? 'bg-sky-100 text-sky-800' : v.type === 'تسوية' ? 'bg-purple-100 text-purple-800' : 'bg-red-100 text-red-800')}`}>
                        {v.type === 'إدخال' ? '📥' : (v.type === 'إتلاف' ? '💥' : v.type === 'تحويل' ? '🔄' : v.type === 'تسوية' ? '⚖️' : '📤')} {v.type} {v.type === 'تسوية' && v.adjustmentType ? `(${v.adjustmentType})` : ''}
                      </span>
                    </td>
                    <td className="text-center text-sm">{v.date || '-'}</td>
                    <td className="text-center text-sm font-medium">{v.warehouse} {v.type === 'تحويل' ? ' → ' + v.destinationWarehouse : ''}</td>
                    <td className="text-center text-sm">{v.type === 'تحويل' ? '-' : v.recipient || '-'}</td>
                    <td className="text-center">
                      <span className="badge badge-info">{v.items?.length || 0} أصناف</span>
                    </td>
                    <td className="text-center text-sm">{v.createdBy || '-'}</td>
                    <td className="text-center text-sm text-muted" style={{ maxWidth:'150px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
                      title={v.notes}>{v.notes || '-'}</td>
                    <td className="text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          title="طباعة السند"
                          className="icon-btn icon-btn-print"
                          onClick={() => handlePrintVoucher(v)}
                        ><Printer size={16} /></button>
                        <button
                          title="عرض التفاصيل"
                          className="icon-btn icon-btn-view"
                          onClick={() => setSelectedVoucher(v)}
                        ><Eye size={16} /></button>
                        {canPerformAction(user, 'DELETE', 'STOCK', globalSettings) && (
                          <button
                            title="حذف السند"
                            className="icon-btn icon-btn-delete"
                            onClick={() => handleDeleteVoucher(v.id, v.voucherNumber)}
                          ><Trash2 size={16} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredVouchers.length === 0 && (
                  <tr><td colSpan="9" className="text-center p-10 text-muted italic">لا توجد سندات مسجلة</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ===== TAB: AUDIT ===== */}
      {activeStockTab === 'audit' && (
        <>
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex-wrap gap-2 mt-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">طلبات خصم المخزون</h3>
              <p className="text-slate-500 text-xs mt-0.5">سجل متابعة خصم الطلبيات من المخزون واعتمادها</p>
            </div>
            <select 
              className="input-field text-sm" 
              style={{ width: 'auto', minWidth: '200px', marginBottom: 0, height: '40px', borderRadius: '12px', padding: '0 1.5rem 0 0.8rem' }}
              value={auditFilterStatus} 
              onChange={e => setAuditFilterStatus(e.target.value)}
            >
              <option value="all">سجل جميع الطلبات</option>
              <option value="pending">الطلبات المعلقة فقط</option>
              <option value="approved">الطلبات الموافق عليها</option>
              <option value="rejected">الطلبات المرفوضة</option>
            </select>
          </div>
          <div className="table-container glass-panel overflow-x-auto mt-4">
            <table className="min-w-[800px]">
              <thead>
                <tr>
                  <th>رقم الطلبية</th>
                  <th>تاريخ الطلبية</th>
                  <th>اسم العميل</th>
                  <th>عدد الأصناف</th>
                  <th className="text-center">المسؤول</th>
                  <th className="text-center">الحالة</th>
                  <th className="text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {ordersToAudit.filter(o => {
                  if (auditFilterStatus === 'pending') return !o.stockDeducted;
                  if (auditFilterStatus === 'approved') return o.stockDeducted;
                  if (auditFilterStatus === 'rejected') return false; // Rejected states are immediately deleted
                  return true;
                }).map(order => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="font-bold text-primary">{order.orderNumber}</td>
                  <td>{order.orderDate}</td>
                  <td className="font-semibold">{order.customerName || 'بدون اسم'}</td>
                  <td><span className="badge badge-info">{order.items?.length || 0} أصناف</span></td>
                  <td className="text-center text-sm font-semibold text-slate-600">
                    {order.draftCreatedBy}
                  </td>
                  <td className="text-center">
                    {order.stockDeducted ? (
                      <span className="badge bg-emerald-100 text-emerald-800 font-bold">تم الخصم والاعتماد</span>
                    ) : order.hasDraft ? (
                      <span className="badge bg-amber-100 text-amber-800 font-bold">بانتظار موافقة المدير</span>
                    ) : (
                      <span className="badge bg-slate-100 text-slate-800 font-bold">بانتظار الخصم</span>
                    )}
                  </td>
                  <td className="text-center">
                    <div className="flex justify-center gap-2">
                      {order.stockDeducted ? (
                        isAdmin(user) ? (
                          <button 
                            className="btn flex items-center justify-center gap-1"
                            style={{ background: '#dc2626', color: 'white', padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}
                            onClick={() => handleRevertDeduction(order)}
                            title="إلغاء الخصم وإرجاع الكميات للمخزون"
                          >
                            <Trash2 size={14} /> تراجع وإلغاء الخصم
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-bold px-2 py-1 bg-slate-50 rounded-lg">لا يوجد إجراء</span>
                        )
                      ) : !order.hasDraft ? (
                        <button 
                          className="btn flex items-center justify-center gap-1 mx-auto"
                          style={{ background: 'var(--primary)', color: 'white', padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}
                          onClick={() => handleOpenAudit(order)}
                        >
                          <AlertTriangle size={14} /> تدقيق وخصم
                        </button>
                      ) : (
                        <>
                          <button 
                            className="btn flex items-center justify-center gap-1"
                            style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}
                            onClick={() => handleOpenAudit(order)}
                          >
                            <Edit2 size={14} /> معاينة وتعديل
                          </button>
                          {isAdmin(user) && (
                            <>
                              <button 
                                className="btn flex items-center justify-center gap-1"
                                style={{ background: '#059669', color: 'white', padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}
                                onClick={() => handleApproveDraft(order)}
                              >
                                اعتماد
                              </button>
                              <button 
                                className="btn flex items-center justify-center gap-1"
                                style={{ background: '#dc2626', color: 'white', padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}
                                onClick={() => handleDeleteDraft(order.orderNumber)}
                              >
                                <Trash2 size={14} /> حذف
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {ordersToAudit.length === 0 && (
                <tr><td colSpan="6" className="text-center p-10 text-muted italic">لا يوجد طلبيات بانتظار الخصم</td></tr>
              )}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* ===== TAB: STOCKTAKE ===== */}
      {activeStockTab === 'stocktake' && (
        <div className="mt-4 animate-fade-in">
          {!stocktakeWarehouse ? (
            /* 1. History / Archive List View */
            <div className="space-y-4">
              {hasDraft && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between mb-4 flex-wrap gap-4">
                  <div className="flex items-center gap-3 text-amber-800">
                    <AlertTriangle size={24} />
                    <div>
                      <p className="font-bold text-sm">يوجد عملية جرد غير مكتملة محفوظه كمسودة</p>
                      <p className="text-xs">تم حفظ البيانات تلقائياً، هل ترغب في استكمال الجرد أم إلغائه؟</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={resumeDraft} className="btn bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 text-sm rounded-lg">استكمال الجرد</button>
                    <button onClick={clearDraft} className="btn bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 font-bold px-4 py-2 text-sm rounded-lg">إلغاء المسودة</button>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex-wrap gap-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">أرشيف عمليات الجرد والتسوية</h3>
                  <p className="text-slate-500 text-xs mt-0.5">عرض سجلات الجرد السابقة والتسويات التي تمت على كميات المستودعات</p>
                </div>
                <div className="flex items-center gap-3">
                  <select 
                    className="input-field text-sm" 
                    style={{ width: 'auto', minWidth: '200px', marginBottom: 0, height: '40px', borderRadius: '12px', padding: '0 1.5rem 0 0.8rem' }}
                    value={stocktakeFilterStatus} 
                    onChange={e => setStocktakeFilterStatus(e.target.value)}
                  >
                    <option value="all">سجل جميع الطلبات</option>
                    <option value="pending">الطلبات المعلقة فقط</option>
                    <option value="approved">الطلبات الموافق عليها</option>
                    <option value="rejected">الطلبات المرفوضة</option>
                  </select>
                  {canPerformAction(user, 'ADD', 'STOCK', globalSettings) && (
                    <button
                      onClick={() => {
                        setStocktakeSetup({ warehouse: '', category: '' });
                        setShowStocktakeModal(true);
                      }}
                      className="btn btn-primary flex items-center gap-1.5 font-bold text-sm px-4 py-2 bg-primary rounded-lg text-white"
                    >
                      <Plus size={16} /> بدء عملية جرد جديدة
                    </button>
                  )}
                </div>
              </div>

              <div className="table-container glass-panel overflow-x-auto">
                <table className="min-w-[800px]">
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>المستودع</th>
                      <th>المسؤول عن الجرد</th>
                      <th className="text-center">الأصناف المجردة</th>
                      <th className="text-center">الزيادة (+)</th>
                      <th className="text-center">العجز (-)</th>
                      <th className="text-center">الحالة</th>
                      <th className="text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stocktakes.filter(st => {
                      if (stocktakeFilterStatus === 'pending') return false; // Stocktakes in DB are always approved
                      if (stocktakeFilterStatus === 'approved') return true;
                      if (stocktakeFilterStatus === 'rejected') return false;
                      return true;
                    }).map(st => (
                      <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                        <td className="font-semibold text-sm">
                          {st.createdAt ? new Date(st.createdAt).toLocaleDateString('en-GB') : st.date}
                        </td>
                        <td className="font-bold text-slate-700">{st.warehouse}</td>
                        <td className="text-slate-600 text-sm">{st.auditedBy}</td>
                        <td className="text-center font-semibold text-slate-700">{st.itemsCount || st.items?.length || 0}</td>
                        <td className="text-center">
                          <span className={`badge ${st.surplusCount > 0 ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-slate-100 text-slate-400'}`}>
                            {st.surplusCount || 0} صنف
                          </span>
                        </td>
                        <td className="text-center">
                          <span className={`badge ${st.deficitCount > 0 ? 'bg-red-100 text-red-800 font-bold' : 'bg-slate-100 text-slate-400'}`}>
                            {st.deficitCount || 0} صنف
                          </span>
                        </td>
                        <td className="text-center">
                          {st.status === 'معتمد' ? (
                            <span className="badge bg-green-100 text-green-800 font-bold">معتمد ومُسوّى</span>
                          ) : (
                            <span className="badge bg-amber-100 text-amber-800 font-bold">بانتظار الاعتماد (مسودة)</span>
                          )}
                        </td>
                        <td className="text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              title="معاينة تفاصيل الجرد"
                              className="icon-btn icon-btn-view"
                              onClick={() => handleViewStocktake(st)}
                            ><Eye size={16} /></button>
                            
                            {st.status !== 'معتمد' && canPerformAction(user, 'EDIT', 'STOCK', globalSettings) && (
                              <button
                                title="تعديل المسودة"
                                className="icon-btn"
                                style={{ background: '#e0f2fe', color: '#0284c7' }}
                                onClick={() => handleEditStocktake(st)}
                              ><Edit2 size={16} /></button>
                            )}

                            {st.status !== 'معتمد' && isAdmin(user) && (
                              <button
                                title="اعتماد رسمي"
                                className="icon-btn"
                                style={{ background: '#dcfce7', color: '#16a34a' }}
                                onClick={() => handleApproveStocktake(st)}
                              ><Save size={16} /></button>
                            )}

                            {isAdmin(user) && (
                              <button
                                title={st.status === 'معتمد' ? "حذف الجرد وإلغاء التسويات" : "حذف المسودة"}
                                className="icon-btn icon-btn-delete"
                                onClick={() => handleDeleteStocktake(st)}
                              ><Trash2 size={16} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {stocktakes.length === 0 && (
                      <tr><td colSpan="7" className="text-center p-10 text-muted italic">لا توجد عمليات جرد مسجلة مسبقاً</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* 2. Active Stocktake Audit Form View */
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4 flex-wrap sticky top-0 z-10 animate-fade-in">
                <div className="flex gap-4 md:gap-8 items-center flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary-light p-3 rounded-xl text-primary">
                      <Box size={24} />
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-xs font-bold text-slate-500 mb-0.5">المستودع قيد الجرد</span>
                      <span className="text-lg font-bold text-slate-800">{stocktakeWarehouse}</span>
                    </div>
                  </div>
                  
                  <div className="h-10 w-px bg-slate-200 hidden md:block"></div>
                  
                  <div className="flex flex-col text-right items-start">
                    <span className="text-xs font-bold text-slate-500 mb-1">رقم سند التسوية النظامي</span>
                    <span className="font-mono text-sm font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-md border border-purple-100 block text-center" style={{ direction: 'ltr' }}>{getNextVoucherNumber('تسوية')}</span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setStocktakeWarehouse('');
                      setStocktakeItems([]);
                      clearDraft();
                    }}
                    className="btn btn-outline font-bold text-sm px-4 py-2.5 rounded-lg bg-white"
                  >
                    إلغاء الجرد
                  </button>
                  
                  {stocktakeItems.length > 0 && (
                    <button
                      onClick={handleSaveStocktake}
                      className="btn flex items-center gap-1.5 font-bold text-sm px-5 py-2.5 rounded-lg text-white shadow-md hover:shadow-lg transition-all"
                      style={{ background: 'var(--primary)', border: 'none' }}
                    >
                      <Save size={16} /> اعتماد الجرد والتسوية
                    </button>
                  )}
                </div>
              </div>

              {stocktakeItems.length > 0 ? (
                <div className="table-container glass-panel overflow-x-auto">
                  <table className="min-w-[900px]">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>رقم الصنف</th>
                        <th>الاسم</th>
                        <th>المواصفة</th>
                        <th>الموقع</th>
                        <th className="text-center">الكمية الدفترية (النظام)</th>
                        <th className="text-center w-32">الجرد الفعلي</th>
                        <th className="text-center">الفرق (المطابقة)</th>
                        <th className="text-center">الحالة</th>
                        <th>ملاحظات الجرد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stocktakeItems.map((item, idx) => {
                        const diff = (item.physicalQuantity !== '' ? Number(item.physicalQuantity) : 0) - Number(item.bookQuantity);
                        let statusLabel = 'مطابق';
                        let statusColor = 'bg-green-100 text-green-800';
                        if (diff > 0) {
                          statusLabel = `زيادة (+${diff})`;
                          statusColor = 'bg-blue-100 text-blue-800 font-bold';
                        } else if (diff < 0) {
                          statusLabel = `عجز (${diff})`;
                          statusColor = 'bg-red-100 text-red-800 font-bold';
                        }

                        return (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="text-slate-400 font-bold text-sm">{idx + 1}</td>
                            <td><span className="font-mono text-xs font-bold text-slate-700">{item.itemNumber}</span></td>
                            <td className="font-medium text-slate-800">{item.name}</td>
                            <td className="text-sm text-slate-600">{item.spec || '-'}</td>
                            <td className="text-sm text-slate-600">{item.location || '-'}</td>
                            <td className="text-center font-bold text-slate-700">{item.bookQuantity}</td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                className="input-field m-0 h-10 text-center text-sm font-bold w-full"
                                style={{
                                  borderColor: item.physicalQuantity === '' || Number(item.physicalQuantity) < 0 ? 'red' : (diff !== 0 ? '#cbd5e1' : undefined)
                                }}
                                value={item.physicalQuantity}
                                onChange={e => handleUpdateStocktakeQty(idx, e.target.value)}
                              />
                            </td>
                            <td className={`text-center font-bold text-sm ${diff > 0 ? 'text-blue-600' : diff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {diff > 0 ? `+${diff}` : diff}
                            </td>
                            <td className="text-center">
                              <span className={`badge ${statusColor}`}>{statusLabel}</span>
                            </td>
                            <td>
                              <input
                                type="text"
                                className="input-field m-0 h-10 text-sm w-full"
                                placeholder="ملاحظات..."
                                value={item.notes}
                                onChange={e => handleUpdateStocktakeNotes(idx, e.target.value)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-white p-10 rounded-xl border border-slate-100 shadow-sm text-center text-slate-500 italic">
                  لا توجد أصناف مسجلة في مستودع "{stocktakeWarehouse}" حالياً. يرجى إضافة أصناف أو إدخال بضائع للمستودع أولاً.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== STOCKTAKE MODAL ===== */}
      {showStocktakeModal && (
        <div className="modal-overlay no-print" style={{ zIndex: 1100 }} onClick={() => setShowStocktakeModal(false)}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '600px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-xl font-bold flex items-center gap-2"><ClipboardList size={20} className="text-primary" /> بدء عملية جرد جديدة</h3>
              <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setShowStocktakeModal(false)}><X size={18} /></button>
            </div>
            <div className="flex flex-col items-center justify-center py-6 animate-fade-in text-center">
              <div className="w-20 h-20 bg-primary-light rounded-full flex items-center justify-center mb-6 shadow-inner text-primary">
                <ClipboardList size={40} strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">إعداد الجرد الجديد</h2>
              <p className="text-slate-500 mb-8 max-w-md">الرجاء اختيار المستودع والقسم (اختياري) لبدء الجرد الفعلي.</p>
              
              <div className="flex flex-col gap-3 w-full max-w-sm text-right">
                <label className="font-bold text-slate-700 text-sm">المستودع المستهدف *</label>
                <select
                  className="input-field text-base font-bold text-center cursor-pointer shadow-sm text-slate-800"
                  style={{ height: '56px', borderRadius: '14px', background: '#ffffff', border: '2px solid #cbd5e1' }}
                  value={stocktakeSetup.warehouse}
                  onChange={(e) => setStocktakeSetup({ ...stocktakeSetup, warehouse: e.target.value })}
                >
                  <option value="" className="text-slate-400">-- اختر المستودع --</option>
                  {globalSettings.warehouses?.map(w => <option key={w} value={w}>{w}</option>)}
                </select>

                <label className="font-bold text-slate-700 text-sm mt-2">قسم الأصناف (اختياري)</label>
                <select
                  className="input-field text-base font-bold text-center cursor-pointer shadow-sm text-slate-800"
                  style={{ height: '56px', borderRadius: '14px', background: '#ffffff', border: '2px solid #cbd5e1' }}
                  value={stocktakeSetup.category}
                  onChange={(e) => setStocktakeSetup({ ...stocktakeSetup, category: e.target.value })}
                >
                  <option value="" className="text-slate-800 font-bold">الكل (كافة الأقسام)</option>
                  {globalSettings.stockCategories?.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                
                <button
                  onClick={handleInitializeStocktake}
                  className="btn btn-primary font-bold text-lg px-5 py-3 rounded-xl mt-4 w-full shadow-md"
                >
                  إبدأ الجرد
                </button>

                <button
                  onClick={() => setShowStocktakeModal(false)}
                  className="btn font-bold text-sm px-5 py-3 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                >
                  إلغاء وإغلاق النافذة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== FILTER MODAL ===== */}
      {showFilterModal && (
        <div className="modal-overlay no-print" style={{ zIndex: 1000 }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '500px' }}>
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-xl font-bold flex items-center gap-2"><Filter size={20} className="text-primary" /> تصفية المخزون</h3>
              <button type="button" className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setShowFilterModal(false)}><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div className="input-group">
                <label>المستودع</label>
                <select className="input-field" value={filters.warehouse} onChange={(e) => setFilters({...filters, warehouse: e.target.value})}>
                  <option value="">الكل</option>
                  {globalSettings.warehouses?.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>التصنيف</label>
                <select className="input-field" value={filters.category} onChange={(e) => setFilters({...filters, category: e.target.value})}>
                  <option value="">الكل</option>
                  {globalSettings.stockCategories?.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>حالة الصنف</label>
                <select ref={stockStatusFilterRef} className="input-field" value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})}>
                  <option value="">الكل</option>
                  <option value="متوفر">متوفر 🟢</option>
                  <option value="يحتاج متابعة">يحتاج متابعة 🟡</option>
                  <option value="ناقص">ناقص 🔴</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-6 pt-4 border-t">
              <button className="btn btn-primary flex-1" onClick={() => setShowFilterModal(false)}>تطبيق</button>
              <button className="btn btn-outline flex-1" onClick={() => { setFilters({ warehouse: '', category: '', status: '' }); setShowFilterModal(false); }}>تفريغ</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== VOUCHER DETAILS MODAL ===== */}
      {selectedVoucher && (
        <div className="modal-overlay no-print" style={{ zIndex: 1100 }} onClick={() => setSelectedVoucher(null)}>
          <div className="modal-content wide animate-fade-in" style={{ maxWidth: '900px' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-xl font-bold">معاينة تفاصيل السند</h3>
              <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setSelectedVoucher(null)}><X size={18} /></button>
            </div>
            
            <div className="bg-white p-6 md:p-8 border rounded-2xl shadow-sm mb-6 relative overflow-hidden" style={{ direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full" style={{ zIndex: 0 }}></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-tr-full" style={{ zIndex: 0 }}></div>
              
              <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-100 relative" style={{ zIndex: 1 }}>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-2">
                    <span className="text-primary">سند رقم</span> #{selectedVoucher.voucherNumber}
                  </h2>
                  <div className="text-slate-500 font-bold flex items-center gap-2">
                    <Calendar size={16} /> {selectedVoucher.date}
                  </div>
                </div>
                <div className="text-left">
                  <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold ${selectedVoucher.type === 'إدخال' ? 'bg-green-100 text-green-800' : (selectedVoucher.type === 'إتلاف' ? 'bg-amber-100 text-amber-800' : selectedVoucher.type === 'تحويل' ? 'bg-sky-100 text-sky-800' : selectedVoucher.type === 'تسوية' ? 'bg-purple-100 text-purple-800' : 'bg-red-100 text-red-800')}`}>
                    {selectedVoucher.type === 'إدخال' ? '📥' : (selectedVoucher.type === 'إتلاف' ? '💥' : selectedVoucher.type === 'تحويل' ? '🔄' : selectedVoucher.type === 'تسوية' ? '⚖️' : '📤')} {selectedVoucher.type} {selectedVoucher.type === 'تسوية' && selectedVoucher.adjustmentType ? `(${selectedVoucher.adjustmentType})` : ''}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100 relative" style={{ zIndex: 1 }}>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-400 text-sm font-bold">المستودع</span>
                  <span className="text-slate-800 font-bold text-lg">{selectedVoucher.warehouse} {selectedVoucher.type === 'تحويل' ? ' → ' + selectedVoucher.destinationWarehouse : ''}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-400 text-sm font-bold">{selectedVoucher.type === 'إدخال' ? 'المورد / الجهة المُرسِلة' : (selectedVoucher.type === 'إتلاف' ? 'المسؤول عن الإتلاف' : selectedVoucher.type === 'تحويل' ? 'الوجهة' : 'المستلم / الجهة الطالبة')}</span>
                  <span className="text-slate-800 font-bold text-lg">{selectedVoucher.type === 'تحويل' ? selectedVoucher.destinationWarehouse : (selectedVoucher.recipient || '---')}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-400 text-sm font-bold">تاريخ الإنشاء</span>
                  <span className="text-slate-700 font-bold">{selectedVoucher.createdAt ? new Date(selectedVoucher.createdAt).toLocaleString('en-GB') : '---'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-400 text-sm font-bold">أُنشئ بواسطة</span>
                  <span className="text-slate-700 font-bold">{selectedVoucher.createdBy || '---'}</span>
                </div>
              </div>

              {selectedVoucher.notes && (
                <div className="mb-8 p-5 rounded-xl border relative" style={{ zIndex: 1, background:'#fffbeb', borderColor:'#fde68a' }}>
                  <p className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color:'#92400e' }}><FileText size={16} /> الملاحظات / الرقم المرجعي</p>
                  <p className="text-slate-800 font-bold">{selectedVoucher.notes}</p>
                </div>
              )}

              <h4 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2 relative" style={{ zIndex: 1 }}>
                <Package size={20} className="text-primary" /> محتويات السند
              </h4>
              
              <div className="overflow-hidden rounded-xl border-2 border-slate-300 relative" style={{ zIndex: 1 }}>
                <table className="w-full text-right" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="bg-slate-200 text-slate-800 text-sm">
                      <th className="p-3 font-bold border border-slate-300 w-12 text-center">#</th>
                      <th className="p-3 font-bold border border-slate-300 text-center">رقم الصنف</th>
                      <th className="p-3 font-bold border border-slate-300">الاسم</th>
                      {!(selectedVoucher.type === 'إدخال' || selectedVoucher.type === 'إخراج') && (
                        <th className="p-3 font-bold border border-slate-300">المواصفة</th>
                      )}
                      <th className="p-3 font-bold border border-slate-300 text-center">الكمية</th>
                      <th className="p-3 font-bold border border-slate-300 text-center">الوحدة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedVoucher.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-center text-slate-700 font-bold border border-slate-300">{idx + 1}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-600 border border-slate-300">{item.itemNumber}</td>
                        <td className="p-3 font-bold text-primary border border-slate-300">{item.name}</td>
                        {!(selectedVoucher.type === 'إدخال' || selectedVoucher.type === 'إخراج') && (
                          <td className="p-3 text-sm text-slate-600 border border-slate-300">{item.spec || '---'}</td>
                        )}
                        <td className="p-3 text-center font-black text-slate-800 bg-slate-50/50 border border-slate-300">{item.quantity}</td>
                        <td className="p-3 text-center font-bold text-slate-600 border border-slate-300">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-4">
              <button className="btn btn-primary flex-1" onClick={() => handlePrintVoucher(selectedVoucher)}><Printer size={18} /> طباعة السند</button>
              <button className="btn btn-outline flex-1" onClick={() => setSelectedVoucher(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== VOUCHER CREATION MODAL ===== */}
      {showVoucherModal && (
        <div className="modal-overlay no-print" style={{ zIndex: 1200 }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth:'1100px', maxHeight:'95vh', minHeight:'85vh', overflowY:'auto' }}>
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-5 pb-3 border-b">
              <h3 className="text-xl font-bold flex items-center gap-2">
                {voucherType === 'إدخال' ? (
                  <span style={{ background:'#dcfce7', color:'#166534', borderRadius:'8px', padding:'4px 12px', fontSize:'0.9rem' }}>📥 سند إدخال مواد <span className="font-mono bg-white/50 px-2 py-0.5 rounded text-xs mr-2">{getNextVoucherNumber(voucherType)}</span></span>
                ) : voucherType === 'إتلاف' ? (
                  <span style={{ background:'#fef3c7', color:'#b45309', borderRadius:'8px', padding:'4px 12px', fontSize:'0.9rem' }}>🗑️ سند إتلاف مواد <span className="font-mono bg-white/50 px-2 py-0.5 rounded text-xs mr-2">{getNextVoucherNumber(voucherType)}</span></span>
                ) : voucherType === 'تحويل' ? (
                  <span style={{ background:'#e0f2fe', color:'#0369a1', borderRadius:'8px', padding:'4px 12px', fontSize:'0.9rem' }}>🔄 تحويل بضائع <span className="font-mono bg-white/50 px-2 py-0.5 rounded text-xs mr-2">{getNextVoucherNumber(voucherType)}</span></span>
                ) : (
                  <span style={{ background:'#fee2e2', color:'#991b1b', borderRadius:'8px', padding:'4px 12px', fontSize:'0.9rem' }}>📤 سند إخراج مواد <span className="font-mono bg-white/50 px-2 py-0.5 rounded text-xs mr-2">{getNextVoucherNumber(voucherType)}</span></span>
                )}
              </h3>
              <button 
                onClick={() => setShowVoucherModal(false)}
                className="text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-all flex items-center justify-center"
                style={{ width: '36px', height: '36px', padding: 0, cursor: 'pointer', background: '#f1f5f9', border: 'none', borderRadius: '10px' }}
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Voucher Header Fields */}
            <div className="mb-5 p-4 rounded-xl border shadow-sm" style={{ background: 'var(--surface-hover)', borderColor: 'var(--border)' }}>
              <div className="flex items-end gap-4 w-full flex-wrap">
                {/* المستودع */}
                <div style={{ minWidth: '160px' }} className="flex-1 flex flex-col gap-1.5 shrink-0">
                  <label className="text-xs font-bold text-slate-600">{voucherType === 'تحويل' ? 'مستودع المصدر' : 'المستودع'} <span style={{ color:'red' }}>*</span></label>
                  <select className="input-field m-0 text-sm" style={{ height: '42px', padding: '0 0.75rem', borderRadius: '10px' }} value={voucherForm.warehouse} onChange={handleWarehouseChange}>
                    <option value="">اختر المستودع</option>
                    {globalSettings.warehouses?.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>

                {/* التاريخ */}
                <div style={{ minWidth: '150px' }} className="flex flex-col gap-1.5 shrink-0">
                  <label className="text-xs font-bold text-slate-600">التاريخ <span style={{ color:'red' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <Flatpickr
                      options={{ locale: Arabic, dateFormat: 'Y-m-d', disableMobile: true }}
                      className="input-field w-full text-right m-0 text-sm"
                      style={{ height: '42px', padding: '0 0.75rem', borderRadius: '10px' }}
                      value={voucherForm.date}
                      onChange={([date]) => {
                        if (date) {
                          const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                          setVoucherForm(prev => ({ ...prev, date: localDate }));
                        }
                      }}
                      placeholder="اختر التاريخ..."
                    />
                  </div>
                </div>

                {/* المورد / الوجهة */}
                {voucherType === 'تحويل' ? (
                  <div className="flex-[2] flex flex-col gap-1.5 shrink-0" style={{ minWidth: '220px' }}>
                    <label className="text-xs font-bold text-slate-600">مستودع الوجهة <span style={{ color:'red' }}>*</span></label>
                    <select className="input-field m-0 text-sm" style={{ height: '42px', padding: '0 0.75rem', borderRadius: '10px' }} 
                      value={voucherForm.destinationWarehouse || ''} 
                      onChange={e => setVoucherForm(prev => ({ ...prev, destinationWarehouse: e.target.value }))}>
                      <option value="">اختر مستودع الوجهة</option>
                      {globalSettings.warehouses?.filter(w => w !== voucherForm.warehouse).map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="flex-[2] flex flex-col gap-1.5 shrink-0" style={{ minWidth: '220px' }}>
                    <label className="text-xs font-bold text-slate-600">{voucherType === 'إدخال' ? 'المورد / الجهة المُرسِلة' : (voucherType === 'إتلاف' ? 'المسؤول عن الإتلاف' : 'المستلم / الجهة الطالبة')} <span style={{ color:'red' }}>*</span></label>
                    <Select
                      options={
                        voucherType === 'إتلاف'
                          ? employees.filter(e => e.status !== 'موقوف').map(e => ({ value: e.name, label: e.name }))
                          : voucherType === 'إدخال'
                            ? customers.filter(c => (c.type || 'عميل') === 'مورد' && c.status !== 'موقوف').map(c => ({ value: c.name, label: c.name }))
                            : customers.filter(c => (c.type || 'عميل') === 'عميل' && c.status !== 'موقوف').map(c => ({ value: c.name, label: c.name }))
                      }
                      value={voucherForm.recipient ? { value: voucherForm.recipient, label: voucherForm.recipient } : null}
                      onChange={selected => setVoucherForm(prev => ({ ...prev, recipient: selected ? selected.value : '' }))}
                      placeholder={`اختر ${voucherType === 'إدخال' ? 'المورد' : (voucherType === 'إتلاف' ? 'المسؤول' : 'المستلم')}...`}
                      isSearchable
                      isClearable
                      menuPortalTarget={document.body}
                      noOptionsMessage={() => "لا توجد نتائج"}
                      styles={{
                        control: (base) => ({
                          ...base,
                          height: '42px',
                          minHeight: '42px',
                          borderRadius: '10px',
                          borderColor: '#cbd5e1',
                          boxShadow: 'none',
                          '&:hover': {
                            borderColor: '#94a3b8'
                          }
                        }),
                        valueContainer: (base) => ({ ...base, padding: '0 0.5rem' }),
                        input: (base) => ({ ...base, margin: 0, padding: 0 }),
                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        menu: (base) => ({ ...base, zIndex: 9999 })
                      }}
                      className="text-sm react-select-container"
                      classNamePrefix="react-select"
                    />
                  </div>
                )}

                {/* زر إضافة عميل أو مورد */}
                {voucherType !== 'إتلاف' && voucherType !== 'تحويل' && (
                  <div className="flex flex-col gap-1.5 shrink-0 justify-end">
                    <label className="text-xs font-bold text-transparent select-none hidden md:block">إضافة</label>
                    <button onClick={handleAddCustomerModal} 
                      className="btn flex items-center justify-center gap-1 transition-all hover:shadow-md shrink-0"
                      style={{ background:'var(--primary)', color:'#fff', border:'none', borderRadius:'10px', height: '42px', padding:'0 1.2rem', cursor:'pointer', fontSize:'0.85rem', fontWeight:700, whiteSpace:'nowrap' }}>
                      <Plus size={14} /> إضافة عميل أو مورد
                    </button>
                  </div>
                )}

                {/* رقم السند */}
                {voucherType !== 'إتلاف' && voucherType !== 'تحويل' && (
                  <div className="flex-1 flex flex-col gap-1.5 shrink-0" style={{ minWidth: '180px' }}>
                    <label className="text-xs font-bold text-slate-600">رقم السند المرجعي <span style={{ color:'red' }}>*</span></label>
                    <input type="text" className="input-field m-0 text-sm" placeholder="الرقم المرجعي أو الملاحظات..."
                      style={{ height: '42px', padding: '0 0.75rem', borderRadius: '10px' }}
                      value={voucherForm.notes}
                      onChange={e => setVoucherForm(prev => ({ ...prev, notes: e.target.value }))} />
                  </div>
                )}
              </div>
            </div>

            {/* Items Section */}
            <div className="mb-3 flex justify-between items-center">
              <h4 className="font-bold text-base flex items-center gap-2">
                <Package size={16} className="text-primary" /> الأصناف
              </h4>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => handleOpenModal()}
                  className="btn flex items-center gap-1 transition-all hover:shadow-md"
                  style={{ background:'#f1f5f9', color:'#0d9488', border:'none', borderRadius:'12px', padding:'0.5rem 1.2rem', cursor:'pointer', fontSize:'0.85rem', fontWeight:800 }}>
                  صنف للمخزون <Plus size={16} strokeWidth={3} />
                </button>
                <button onClick={addVoucherItemRow}
                  className="btn flex items-center gap-1 transition-all hover:shadow-md"
                  style={{ background:'var(--primary)', color:'#fff', border:'none', borderRadius:'12px', padding:'0.5rem 1.2rem', cursor:'pointer', fontSize:'0.85rem', fontWeight:700 }}>
                  <Plus size={14} /> إضافة سطر جديد
                </button>
              </div>
            </div>

            <div className="modal-table-container mb-5" style={{ borderColor: 'var(--border)', minHeight: '150px' }}>
              <table className="modal-table">
                <thead style={{ background: 'var(--surface-2, #f8fafc)' }}>
                  <tr>
                    <th className="w-10 text-muted">#</th>
                    <th>الصنف المستودع *</th>
                    <th className="w-28">الكمية *</th>
                    <th className="w-24">الوحدة</th>
                    <th className="w-48">ملاحظات</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {voucherForm.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="text-muted font-bold text-xs">{idx + 1}</td>
                      <td>
                        {(() => {
                          const options = stock.filter(s => s.warehouse === voucherForm.warehouse && (voucherType === 'إخراج' ? s.quantity > 0 : true))
                            .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'))
                            .map(s => ({
                            value: s.id,
                            label: `${s.itemNumber} - ${s.name}${s.spec ? ` (${s.spec})` : ''} | متوفر: ${s.quantity} ${s.unit}`
                          }));
                          const selectedOption = options.find(o => o.value === item.stockId) || null;
                          return (
                            <Select
                              options={options}
                              value={selectedOption}
                              onChange={selected => updateVoucherItem(idx, 'stockId', selected ? selected.value : '')}
                              placeholder="اختر صنفاً..."
                              isSearchable
                              isClearable
                              menuPortalTarget={document.body}
                              noOptionsMessage={() => "لا توجد نتائج"}
                              styles={{
                                control: (base) => ({
                                  ...base,
                                  height: '40px',
                                  minHeight: '40px',
                                  minWidth: '350px',
                                  borderRadius: '10px',
                                  borderColor: '#cbd5e1',
                                  boxShadow: 'none',
                                  backgroundColor: 'transparent',
                                  '&:hover': {
                                    borderColor: '#94a3b8'
                                  }
                                }),
                                valueContainer: (base) => ({ ...base, padding: '0 0.5rem' }),
                                input: (base) => ({ ...base, margin: 0, padding: 0 }),
                                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                menu: (base) => ({ ...base, zIndex: 9999 })
                              }}
                              className="text-sm react-select-container"
                              classNamePrefix="react-select"
                            />
                          );
                        })()}
                      </td>
                      <td>
                        <div className="flex flex-col items-center">
                          <input type="number" min="1" max={voucherType === 'إخراج' ? (item.availableQuantity || 99999) : undefined} 
                            className="input-field m-0 h-10 text-center text-sm font-bold"
                            style={{ borderColor: voucherType === 'إخراج' && Number(item.quantity) > Number(item.availableQuantity) ? 'red' : undefined }}
                            value={item.quantity} onChange={e => updateVoucherItem(idx, 'quantity', e.target.value)} />
                          {voucherType === 'إخراج' && item.availableQuantity > 0 && (
                            <span className="text-[10px] text-muted mt-1 text-center whitespace-nowrap">متبقي: {item.availableQuantity}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <select className="input-field m-0 h-10 text-sm" value={item.unit} onChange={e => updateVoucherItem(idx, 'unit', e.target.value)}>
                          {globalSettings.stockUnits?.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>
                      <td>
                        <input type="text" className="input-field m-0 h-10 text-sm" placeholder="ملاحظات..." value={item.notes || ''} onChange={e => updateVoucherItem(idx, 'notes', e.target.value)} />
                      </td>
                      <td>
                        {voucherForm.items.length > 1 && (
                          <button onClick={() => removeVoucherItemRow(idx)} 
                            className="text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all flex items-center justify-center mx-auto"
                            style={{ width: '36px', height: '36px', padding: 0, cursor: 'pointer', background: '#f1f5f9', border: 'none', borderRadius: '10px' }}
                          >
                            <X size={20} strokeWidth={2.5} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Save / Cancel */}
            <div className="flex gap-3 pt-3 border-t">
              <button onClick={handleSaveVoucher}
                className="btn flex-1 flex items-center justify-center gap-2"
                style={{ background: voucherType === 'إدخال' ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#dc2626,#ef4444)', color:'#fff', border:'none', borderRadius:'12px', height:'46px', padding:'0 1.5rem', fontWeight:800, fontSize:'0.95rem', cursor:'pointer' }}>
                <Save size={18} /> حفظ السند وتحديث المخزون
              </button>
              <button onClick={() => setShowVoucherModal(false)}
                className="btn btn-outline"
                style={{ background:'#f1f5f9', color:'#475569', border:'none', borderRadius:'12px', height:'46px', padding:'0 2rem', fontWeight:700, fontSize:'0.95rem', cursor:'pointer' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ===== AUDIT MODAL ===== */}
      {showAuditModal && auditOrder && (
        <div className="modal-overlay no-print" style={{ zIndex: 10000, overflowY: 'auto' }}>
          <div className="modal-content wide animate-fade-in my-8" style={{ maxWidth: '1100px', width: '95%' }}>
            <div className="flex justify-between items-center mb-5 border-b pb-4">
              <div>
                <h3 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-600 p-2 rounded-xl">
                    <AlertTriangle size={24} />
                  </span>
                  تدقيق طلبية وخصم من المخزون
                </h3>
                <p className="text-slate-500 text-lg mt-2 font-bold">
                  طلبية رقم: <span className="text-primary">{auditOrder.orderNumber}</span> - العميل: <span className="text-primary">{auditOrder.customerName}</span>
                </p>
                <p className="text-slate-400 text-sm mt-1 font-semibold">
                  سيتم إصدار سند برقم: <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100" style={{ direction: 'ltr', display: 'inline-block' }}>
                    MIS-{String((vouchers.filter(v => v.voucherNumber?.startsWith('MIS-')).reduce((max, v) => { const m = v.voucherNumber?.match(/MIS-(\d+)/); return m ? Math.max(max, parseInt(m[1], 10)) : max; }, 0)) + 1).padStart(5, '0')} ({auditOrder.orderNumber})
                  </span>
                </p>
              </div>
              <button 
                onClick={() => setShowAuditModal(false)}
                className="text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-all flex items-center justify-center"
                style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f8fafc' }}
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            <div style={{ marginBottom: '24px', marginTop: '8px' }}>
              <button onClick={addExtraAuditItem} className="btn flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm"
                style={{ background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#e0e7ff'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.transform = 'none'; }}
              >
                <Plus size={18} strokeWidth={3} /> إضافة صنف تابع من المخزون
              </button>
            </div>

            <div className="overflow-hidden border border-slate-200 rounded-2xl mb-6 shadow-sm">
              <table className="w-full text-right bg-white">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-slate-700 font-black text-sm w-12 text-center">#</th>
                    <th className="p-4 text-slate-700 font-black text-sm">اسم الصنف</th>
                    <th className="p-4 text-slate-700 font-black text-sm" style={{ width: '250px' }}>المستودع *</th>
                    <th className="p-4 text-slate-700 font-black text-sm w-36 text-center">الكمية</th>
                    <th className="p-4 w-16 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {auditItems.map((item, idx) => (
                    <tr key={idx} className={`border-b border-slate-100 transition-colors ${item.isExtra ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}>
                      <td className="p-4 font-bold text-slate-400 text-center">{idx + 1}</td>
                      <td className="p-4">
                        {item.isExtra ? (
                          <Select
                            options={stock.filter(s => s.quantity > 0).map(s => ({ value: s.id, label: `${s.name}${s.spec ? ` (${s.spec})` : ''} - متوفر: ${s.quantity}`, stockData: s }))}
                            value={item.stockId ? { value: item.stockId, label: item.name } : null}
                            onChange={selected => {
                              const newItems = [...auditItems];
                              if (selected) {
                                newItems[idx].stockId = selected.stockData.id;
                                newItems[idx].name = selected.stockData.name;
                                newItems[idx].warehouse = selected.stockData.warehouse;
                                newItems[idx].availableQuantity = selected.stockData.quantity;
                                newItems[idx].unit = selected.stockData.unit;
                              } else {
                                newItems[idx].stockId = '';
                                newItems[idx].name = '';
                                newItems[idx].warehouse = '';
                                newItems[idx].availableQuantity = 0;
                              }
                              setAuditItems(newItems);
                            }}
                            placeholder="اختر صنفاً من المخزون..."
                            isSearchable
                            menuPortalTarget={document.body}
                            styles={{
                              control: (base) => ({ ...base, minHeight: '42px', borderRadius: '10px', borderColor: '#cbd5e1' }),
                              menuPortal: (base) => ({ ...base, zIndex: 99999 }),
                              menu: (base) => ({ ...base, zIndex: 99999 })
                            }}
                            className="text-sm"
                          />
                        ) : (
                          <div className="font-bold text-slate-800 text-base">{item.name}</div>
                        )}
                      </td>
                      <td className="p-4">
                        {item.isExtra ? (
                          <div className="h-10 flex items-center justify-center px-3 bg-slate-100 rounded-lg text-sm font-bold text-slate-600 border border-slate-200 text-center">
                            {item.warehouse || 'سيتم تحديده تلقائياً'}
                          </div>
                        ) : (
                          <>
                            <Select
                              options={globalSettings.warehouses ? globalSettings.warehouses.map(w => ({ value: w, label: w })) : []}
                              value={item.warehouse ? { value: item.warehouse, label: item.warehouse } : null}
                              onChange={selected => updateAuditItem(idx, 'warehouse', selected ? selected.value : '')}
                              placeholder="اختر المستودع..."
                              isSearchable
                              menuPortalTarget={document.body}
                              styles={{
                                control: (base) => ({ ...base, minHeight: '42px', borderRadius: '10px', borderColor: '#cbd5e1' }),
                                menuPortal: (base) => ({ ...base, zIndex: 99999 }),
                                menu: (base) => ({ ...base, zIndex: 99999 })
                              }}
                              className="text-sm react-select-container"
                              classNamePrefix="react-select"
                            />
                            {item.warehouse && !item.stockId && (
                              <span className="text-xs text-red-500 font-bold mt-1.5 flex items-center gap-1"><AlertTriangle size={12}/> لا يوجد صنف مطابق!</span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col items-center">
                          <input type="number" min="1" max={item.availableQuantity || 9999}
                            className="input-field m-0 h-10 w-full text-center font-black text-lg text-slate-800 bg-white"
                            style={{ 
                              borderColor: Number(item.quantity) > Number(item.availableQuantity) ? '#ef4444' : '#cbd5e1',
                              boxShadow: Number(item.quantity) > Number(item.availableQuantity) ? '0 0 0 2px rgba(239,68,68,0.2)' : 'none',
                              borderRadius: '10px'
                            }}
                            value={item.quantity} onChange={e => updateAuditItem(idx, 'quantity', e.target.value)} />
                          {item.stockId && (
                            <span className={`text-xs mt-1.5 text-center font-bold px-2 py-0.5 rounded-md ${Number(item.quantity) > Number(item.availableQuantity) ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                              متوفر: {item.availableQuantity}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        {item.isExtra && (
                          <button onClick={() => removeAuditItem(idx)} 
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all flex items-center justify-center mx-auto"
                            style={{ width: '38px', height: '38px', background: '#f1f5f9', border: 'none', borderRadius: '10px' }}
                            title="حذف"
                          >
                            <X size={20} strokeWidth={2.5} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {auditItems.length === 0 && (
                    <tr><td colSpan="5" className="p-8 text-center text-slate-500 font-bold bg-slate-50">لا يوجد أصناف في هذه الطلبية</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-4 pt-2">
              <button onClick={handleConfirmAudit} className="btn flex-2 flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, var(--primary), #0f766e)', color: 'white', height: '52px', fontSize: '1.05rem', fontWeight: '900', flex: 2, borderRadius: '14px', border: 'none' }}>
                <Save size={22} /> حفظ المسودة لاعتماد الخصم
              </button>
              <button onClick={() => setShowAuditModal(false)} className="btn btn-outline flex-1 transition-all hover:bg-slate-100" style={{ height: '52px', fontSize: '1rem', fontWeight: 'bold', borderRadius: '14px', color: '#475569', borderColor: '#cbd5e1' }}>
                إلغاء الأمر
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ===== STOCKTAKE VIEW MODAL ===== */}
      {viewStocktakeReport && (
        <div className="modal-overlay no-print" style={{ zIndex: 1200 }} onClick={() => setViewStocktakeReport(null)}>
          <div className="modal-content wide animate-fade-in" style={{ maxWidth: '900px' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b pb-4">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Box size={24} className="text-primary" />
                  تفاصيل عملية الجرد
                </h3>
                <p className="text-slate-500 text-sm mt-1">مستودع: <span className="font-bold">{viewStocktakeReport.warehouse}</span></p>
              </div>
              <button type="button" className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setViewStocktakeReport(null)}><X size={18} /></button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                <span className="text-slate-500 text-xs font-bold block mb-1">تاريخ الجرد</span>
                <span className="font-bold text-slate-800">{viewStocktakeReport.createdAt ? new Date(viewStocktakeReport.createdAt).toLocaleDateString('en-GB') : viewStocktakeReport.date}</span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                <span className="text-slate-500 text-xs font-bold block mb-1">المسؤول</span>
                <span className="font-bold text-slate-800">{viewStocktakeReport.auditedBy}</span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                <span className="text-slate-500 text-xs font-bold block mb-1">الحالة</span>
                <span className={`badge ${viewStocktakeReport.status === 'معتمد' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'} font-bold`}>
                  {viewStocktakeReport.status === 'معتمد' ? 'معتمد رسمياً' : 'مسودة'}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                <span className="text-slate-500 text-xs font-bold block mb-1">إجمالي الأصناف</span>
                <span className="font-bold text-slate-800">{viewStocktakeReport.itemsCount || viewStocktakeReport.items?.length}</span>
              </div>
            </div>

            <div className="overflow-x-auto border rounded-xl mb-4" style={{ maxHeight: '400px' }}>
              <table className="w-full text-right bg-white relative">
                <thead className="bg-slate-50 border-b sticky top-0" style={{ zIndex: 1 }}>
                  <tr>
                    <th className="p-3 text-slate-600 font-bold text-sm w-10">#</th>
                    <th className="p-3 text-slate-600 font-bold text-sm">اسم الصنف</th>
                    <th className="p-3 text-slate-600 font-bold text-sm text-center">الرصيد الدفتري</th>
                    <th className="p-3 text-slate-600 font-bold text-sm text-center">الجرد الفعلي</th>
                    <th className="p-3 text-slate-600 font-bold text-sm text-center">الفرق</th>
                    <th className="p-3 text-slate-600 font-bold text-sm w-48">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewStocktakeReport.items || []).map((item, idx) => (
                    <tr key={idx} className="border-b hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-400 text-sm">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-700">{item.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{item.itemNumber} {item.spec ? `| ${item.spec}` : ''}</div>
                      </td>
                      <td className="p-3 text-center font-semibold text-slate-600 bg-slate-50/50">{item.bookQuantity}</td>
                      <td className="p-3 text-center font-bold text-slate-800">{item.physicalQuantity}</td>
                      <td className="p-3 text-center">
                        <div className={`font-bold inline-flex justify-center items-center px-2 py-1 rounded text-xs ${
                          Number(item.difference) > 0 ? 'bg-blue-100 text-blue-700' :
                          Number(item.difference) < 0 ? 'bg-red-100 text-red-700' :
                          'text-slate-400'
                        }`}>
                          {Number(item.difference) > 0 ? '+' : ''}{item.difference || 0}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-slate-600">{item.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button onClick={() => setViewStocktakeReport(null)} className="btn btn-outline" style={{ padding: '0 2rem' }}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
      {/* Locations Modal */}
      {showLocationsModal && selectedItemForLocations && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="animate-fade-in" style={{ backgroundColor: '#ffffff', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative', overflow: 'hidden', maxWidth: '750px', width: '95%', direction: 'rtl', fontFamily: '"Cairo", sans-serif' }}>
            
            {/* Header Background Graphic */}
            <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(19,137,143,0.08) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%', zIndex: 0 }} />
            <div style={{ position: 'absolute', top: '-50px', left: '100px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(19,137,143,0.05) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%', zIndex: 0 }} />
            
            <div style={{ padding: '1.75rem', position: 'relative', zIndex: 10 }}>
              {/* Header Section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ backgroundColor: '#13898f', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', flexShrink: 0, boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                    <Box size={24} color="#ffffff" />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                    أماكن تواجد الصنف: <span style={{ color: '#0f172a' }}>{selectedItemForLocations.name}</span>
                  </h2>
                </div>
                <button 
                  onClick={() => setShowLocationsModal(false)}
                  style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#64748b', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Info Box */}
              <div style={{ borderRadius: '12px', border: '1px solid #f1f5f9', backgroundColor: 'rgba(248, 250, 252, 0.7)', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'right', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '1.5rem', marginBottom: '1rem', color: '#1e293b', fontWeight: 'bold', fontSize: '1.125rem' }}>
                  <div>الرقم: <span style={{ color: '#13898f' }}>{selectedItemForLocations.itemNumber}</span></div>
                  {selectedItemForLocations.category && (
                    <>
                      <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }}></div>
                      <div>التصنيف: <span style={{ color: '#334155' }}>{selectedItemForLocations.category}</span></div>
                    </>
                  )}
                </div>
                <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '1.125rem' }}>
                  إجمالي الكمية المتوفرة: <span style={{ color: '#13898f' }}>{selectedItemForLocations.totalQuantity} {selectedItemForLocations.unit || 'عدد'}</span>
                </div>
              </div>

              {/* Table */}
              <div style={{ borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '1.5rem', backgroundColor: '#ffffff', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse', display: 'table', borderRadius: '0', border: 'none', boxShadow: 'none' }}>
                  <thead style={{ display: 'table-header-group' }}>
                    <tr>
                      <th style={{ padding: '1rem', fontWeight: 'bold', textAlign: 'right', width: '50%', backgroundColor: '#13898f', color: '#ffffff', borderBottom: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.5rem' }}>
                          <MapPin size={18} color="#ffffff" /> الرف / الموقع
                        </div>
                      </th>
                      <th style={{ padding: '1rem', fontWeight: 'bold', textAlign: 'center', width: '50%', backgroundColor: '#13898f', color: '#ffffff', borderBottom: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <Box size={18} color="#ffffff" /> الكمية الموجودة
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody style={{ display: 'table-row-group' }}>
                    {(() => {
                      const stockLocs = selectedItemForLocations.locations.map(loc => ({
                        id: loc.id,
                        location: loc.location || '-',
                        quantity: loc.quantity,
                        isCustody: false
                      }));
                      
                      const custodyLocs = assets.flatMap(a => 
                        (a.items || []).filter(i => i.name === selectedItemForLocations.name).map((i, idx) => ({
                          id: `asset-${a.id}-${idx}`,
                          location: i.location ? `${i.location} (عهدة ${a.employeeName})` : `عهدة ${a.employeeName}`,
                          quantity: i.quantity || 1,
                          isCustody: true
                        }))
                      );
                      
                      const allLocs = [...stockLocs, ...custodyLocs];

                      return allLocs.map((loc, idx) => (
                        <tr key={loc.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc', display: 'table-row', border: 'none', borderRadius: '0', boxShadow: 'none', margin: '0' }}>
                          <td style={{ padding: '1rem', textAlign: 'right', borderBottom: idx !== allLocs.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.5rem' }}>
                              {loc.location !== '-' && <MapPin size={18} color={loc.isCustody ? '#10b981' : '#94a3b8'} />}
                              <span style={{ fontWeight: 'bold', color: loc.isCustody ? '#059669' : '#1e293b', fontSize: '1.125rem' }}>{loc.location}</span>
                            </div>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', fontSize: '1.5rem', color: '#1e293b', borderBottom: idx !== allLocs.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                            {loc.quantity}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setShowLocationsModal(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.5rem', borderRadius: '12px', backgroundColor: '#f1f5f9', color: '#1e293b', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                >
                  <div style={{ backgroundColor: '#1e293b', color: '#ffffff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px' }}>
                    <X size={14} color="#ffffff" strokeWidth={3} />
                  </div>
                  إغلاق
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminStock;
// Force Vite HMR reload
