import { canSafelyDeleteProduction } from '../../utils/productionSafety.js';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { 
  ShoppingBag, Plus, Search, Trash2, Edit2, 
  Printer, X, User, Calendar, Layers, UserPlus, Eye, Phone,
  ArrowUpDown, ArrowUp, ArrowDown, GripVertical, AlertCircle, FileText, Info, Truck, Filter, CheckCircle, Navigation, MapPin, Lock,
  RefreshCw, MoreVertical, ChevronLeft, MoreHorizontal, Flag, Package, Clock, Clipboard, Briefcase, Check, Copy
} from 'lucide-react';
import SewingMachineIcon from '../../components/SewingMachineIcon';
import html2pdf from 'html2pdf.js';
import { getOrders, saveOrder, deleteOrder, updateOrderStatus, getCustomers, saveCustomer, getGlobalSettings, isAdmin, canPerformAction, addLog, getStock, saveStockItem, getSalesOrders, saveSalesOrder, revertAuditVouchers, revertReceiptVouchers, deleteDraftVouchers } from '../../store';
import { advancedSearch, useDebounce } from '../../utils/searchEngine';
import { hasPermission } from '../../utils/permissions';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import Select from '../../components/SearchSelect';
import MultiColorSelectionModal from '../../components/MultiColorSelectionModal';
import ProductionLineBoard from './ProductionLineBoard';

const MySwal = withReactContent(Swal);

const canonicalizeProductionStatus = value => {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (normalized === 'تم استلام كرت الانتاج' || normalized === 'تم استلام كرت الإنتاج') return 'تم استلام كرت الإنتاج';
  if (['مرحلة المستودع', 'مرحلة مستودع قبل الخياطة', 'مستودع قبل الخياطة'].includes(normalized)) return 'مرحلة المستودع';
  return normalized;
};

const getSalesItemStatusForProductionStatus = (status) => {
  status = canonicalizeProductionStatus(status);
  if (['مرحلة التغليف', 'بانتظار استلام التغليف', 'تحويل جزئي للتغليف', 'تغليف جزئي', 'تم التحويل إلى قسم التغليف'].includes(status)) return 'إنتاج قيد التغليف';
  if (status === 'منتهي' || status === 'جاهز') return 'جاهز';
  if (status === 'ملغي') return 'ملغي';
  if (['تم استلام كرت الإنتاج', 'مرحلة القص', 'مرحلة المستودع', 'مرحلة الخياطة', 'تحت التنفيذ'].includes(status)) {
    return 'إنتاج قيد الخياطة';
  }
  return null;
};

const FINISHED_PRODUCTION_STATUSES = ['منتهي', 'جاهز'];
const NON_SEWING_PRODUCTION_STATUSES = ['مرحلة التغليف', 'منتهي', 'جاهز', 'ملغي'];

const getItemStageQuantities = (item = {}, orderStatus = '') => {
  const total = Math.max(0, Number(item.quantity || 0));
  if (item.stageQuantities && typeof item.stageQuantities === 'object') {
    const finished = Math.min(total, Math.max(0, Number(item.stageQuantities.finished || 0)));
    const packaging = Math.min(total - finished, Math.max(0, Number(item.stageQuantities.packaging || 0)));
    const pendingPackaging = Math.min(total - finished - packaging, Math.max(0, Number(item.stageQuantities.pendingPackaging || 0)));
    const sewing = Math.max(0, total - finished - packaging - pendingPackaging);
    return { sewing, pendingPackaging, packaging, finished, total };
  }
  const status = canonicalizeProductionStatus(item.status || orderStatus || 'لم يتم التنفيذ');
  if (FINISHED_PRODUCTION_STATUSES.includes(status)) return { sewing: 0, pendingPackaging: 0, packaging: 0, finished: total, total };
  if (status === 'مرحلة التغليف') return { sewing: 0, pendingPackaging: 0, packaging: total, finished: 0, total };
  if (status === 'بانتظار استلام التغليف' || status === 'تم التحويل إلى قسم التغليف') return { sewing: 0, pendingPackaging: total, packaging: 0, finished: 0, total };
  return { sewing: total, pendingPackaging: 0, packaging: 0, finished: 0, total };
};

const deriveItemStatusFromQuantities = quantities => {
  const { sewing, pendingPackaging, packaging, finished, total } = quantities;
  if (total > 0 && finished === total) return 'منتهي';
  if (total > 0 && packaging === total) return 'مرحلة التغليف';
  if (total > 0 && pendingPackaging === total) return 'بانتظار استلام التغليف';
  if (sewing > 0 && (pendingPackaging > 0 || packaging > 0 || finished > 0)) return 'تحويل جزئي للتغليف';
  if (packaging > 0 || finished > 0) return 'تغليف جزئي';
  if (pendingPackaging > 0) return 'بانتظار استلام التغليف';
  return 'مرحلة الخياطة';
};

const getOrderItemsForStage = order => (
  Array.isArray(order?.items) && order.items.length
    ? order.items.map(item => ({
        ...item,
        status: canonicalizeProductionStatus((!item.status || (item.status === 'لم يتم التنفيذ' && order.status && order.status !== 'لم يتم التنفيذ' && order.status !== 'إنتاج مختلط'))
          ? order.status
          : item.status)
      }))
    : (order ? [{ status: order.status || 'لم يتم التنفيذ' }] : [])
);

const deriveProductionOrderStatus = (items = [], fallback = 'لم يتم التنفيذ') => {
  if (items.some(item => item.stageQuantities)) {
    const quantityStages = new Set();
    items.filter(item => item.status !== 'ملغي').forEach(item => {
      const quantities = getItemStageQuantities(item, fallback);
      if (quantities.sewing > 0) quantityStages.add('sewing');
      if (quantities.pendingPackaging > 0) quantityStages.add('pendingPackaging');
      if (quantities.packaging > 0) quantityStages.add('packaging');
      if (quantities.finished > 0) quantityStages.add('finished');
    });
    if (quantityStages.size > 1) return 'إنتاج مختلط';
    if (quantityStages.has('finished')) return 'منتهي';
    if (quantityStages.has('packaging')) return 'مرحلة التغليف';
    if (quantityStages.has('pendingPackaging')) return 'بانتظار استلام التغليف';
  }
  const statuses = items.map(item => item.status || fallback).filter(status => status !== 'ملغي');
  if (!statuses.length) return items.length ? 'ملغي' : fallback;
  if (statuses.every(status => FINISHED_PRODUCTION_STATUSES.includes(status))) return 'منتهي';
  const uniqueStatuses = [...new Set(statuses.map(status => FINISHED_PRODUCTION_STATUSES.includes(status) ? 'منتهي' : status))];
  return uniqueStatuses.length === 1 ? uniqueStatuses[0] : 'إنتاج مختلط';
};

const getPackagingOrderStatus = order => {
  const items = getOrderItemsForStage(order).filter(item => canonicalizeProductionStatus(item.status) !== 'ملغي');
  if (!items.length) return '';
  const quantities = items.map(item => getItemStageQuantities(item, order.status));
  const hasReachedPackaging = quantities.some(q => q.pendingPackaging > 0 || q.packaging > 0 || q.finished > 0);
  if (!hasReachedPackaging) return '';
  if (quantities.every(q => q.total > 0 && q.finished === q.total)) return 'منتهي';
  if (quantities.some(q => q.packaging > 0 || q.finished > 0)) return 'قيد التغليف';
  return 'بانتظار استلام التغليف';
};
const orderHasPackagingItems = order => ['بانتظار استلام التغليف', 'قيد التغليف'].includes(getPackagingOrderStatus(order));
const orderHasSewingItems = order => getOrderItemsForStage(order).some(item => getItemStageQuantities(item, order.status).sewing > 0);
const isSewingOrderComplete = order => {
  const items = getOrderItemsForStage(order);
  return items.length > 0 && items.every(item => getItemStageQuantities(item, order.status).sewing === 0);
};

const getProductionStageCounts = order => getOrderItemsForStage(order).reduce((counts, item) => {
  const quantities = getItemStageQuantities(item, order.status);
  counts.total += 1;
  if (quantities.sewing > 0) counts.sewing += 1;
  if (quantities.pendingPackaging > 0 || quantities.packaging > 0) counts.packaging += 1;
  if (quantities.total > 0 && quantities.finished === quantities.total) counts.finished += 1;
  return counts;
}, { sewing: 0, packaging: 0, finished: 0, total: 0 });

const getProductionStatusLabel = status => canonicalizeProductionStatus(status);

const SEWING_ITEM_STATUS_OPTIONS = [
  'لم يتم التنفيذ',
  'تم استلام كرت الإنتاج',
  'مرحلة القص',
  'مرحلة المستودع',
  'مرحلة الخياطة',
  'تم التحويل إلى قسم التغليف',
  'ملغي'
];

const getSewingItemSelectValue = (item, orderStatus = '') => {
  const status = canonicalizeProductionStatus(item?.status || orderStatus || 'لم يتم التنفيذ');
  if (SEWING_ITEM_STATUS_OPTIONS.includes(status)) return status;
  const quantities = getItemStageQuantities(item, orderStatus);
  if (quantities.sewing > 0) return 'مرحلة الخياطة';
  if (quantities.pendingPackaging > 0 || quantities.packaging > 0 || quantities.finished > 0) return 'تم التحويل إلى قسم التغليف';
  return 'لم يتم التنفيذ';
};

const getMobileSewingItemSelectValue = (item, orderStatus = '') => {
  const status = getSewingItemSelectValue(item, orderStatus);
  return status === 'تم التحويل إلى قسم التغليف' ? 'مرحلة الخياطة' : status;
};

const PRODUCTION_STAGE_FLOW = ['لم يتم التنفيذ', 'تم استلام كرت الإنتاج', 'مرحلة القص', 'مرحلة المستودع', 'مرحلة الخياطة', 'مرحلة التغليف', 'منتهي'];
const getAllowedItemTransitions = status => {
  const current = canonicalizeProductionStatus(status || 'لم يتم التنفيذ');
  const currentIndex = PRODUCTION_STAGE_FLOW.indexOf(current);
  if (currentIndex === -1 || current === 'منتهي') return [current];
  return [current, PRODUCTION_STAGE_FLOW[currentIndex + 1]].filter(Boolean);
};

const getLocalDateStr = (d) => {
  if (!d) return '';
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const isExcludedCategory = (cat) => {
  const normalized = String(cat || '').replace(/أ|إ|آ/g, 'ا').replace(/ى/g, 'ي').trim().toLowerCase();
  const excluded = [
    'الاصول',
    'اصول',
    'الاقمشة',
    'الاقمشه',
    'اقمشة',
    'اقمشه',
    'مستهلكات الخياطة',
    'مستهلكات الخياطه',
    'التغليف',
    'تغليف'
  ];
  return excluded.includes(normalized);
};

const AdminProduction = ({ user, notificationTarget, initialSection = 'sewing' }) => {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [showModal, setShowModal] = useState(false);
  const [showOperationsModal, setShowOperationsModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'orderNumber', direction: 'desc' });
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({ productionStatuses: [], salesStatuses: [], itemStatuses: [], logoUrl: '/logo-mrsleep.png', siteName: 'Mirjas HR' });
  const [stockItems, setStockItems] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const handleSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown size={14} className="text-muted" />;
    }

    const SortIcon = sortConfig.direction === 'asc' ? ArrowUp : ArrowDown;
    return <SortIcon size={14} className="text-primary" />;
  };

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('معلق');
  const [productionSection, setProductionSection] = useState(initialSection);
  const [productionView, setProductionView] = useState('cards');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterCreatedBy, setFilterCreatedBy] = useState('');
  const [filterOrderNumber, setFilterOrderNumber] = useState('');
  
  const [showMultiColorModal, setShowMultiColorModal] = useState(false);

  useEffect(() => {
    setProductionSection(initialSection);
    setSelectedStatus(initialSection === 'packaging' ? '' : 'معلق');
  }, [initialSection]);

  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    orderDate: getLocalDateStr(new Date()),
    deliveryDate: '',
    status: 'لم يتم التنفيذ',
    orderNotes: '',
    items: [{
      productName: '',
      colorModel: '',
      sizeCm: '',
      thickness: '',
      quantity: '',
      flapSize: '',
      packagingType: '',
      clothMeters: '',
      notes: '',
      status: 'لم يتم التنفيذ'
    }]
  });

  const [customerFormData, setCustomerFormData] = useState({
    name: '',
    phone: '',
    sector: ''
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) setProductionView('cards');
  }, [isMobile]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersData, customersData, settings, stockData] = await Promise.all([
        getOrders(),
        getCustomers(),
        getGlobalSettings(),
        getStock()
      ]);
      setOrders(ordersData.map(order => ({
        ...order,
        status: canonicalizeProductionStatus(order.status),
        items: (order.items || []).map(item => ({ ...item, status: canonicalizeProductionStatus(item.status) }))
      })));
      setCustomers(customersData.filter(c => (c.type || 'عميل') === 'عميل'));
      setGlobalSettings(settings);
      setStockItems(stockData);
    } catch (err) {
      console.error("Error loading data in AdminProduction:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!notificationTarget || notificationTarget.moduleKey !== 'production' || orders.length === 0) return;

    const matchedOrder = orders.find((order) => (
      (notificationTarget.orderId && order.id === notificationTarget.orderId) ||
      (notificationTarget.entityId && order.id === notificationTarget.entityId) ||
      (notificationTarget.orderNumber && String(order.orderNumber) === String(notificationTarget.orderNumber))
    ));

    if (matchedOrder) {
      setSelectedOrder(matchedOrder);
      setShowPreview(true);
      setFilterOrderNumber(String(matchedOrder.orderNumber || ''));
      return;
    }

    if (notificationTarget.orderNumber) {
      setFilterOrderNumber(String(notificationTarget.orderNumber));
    }
  }, [notificationTarget, orders]);

  const getBandsText = (count) => {
    if (count === 1) return 'بند واحد';
    if (count === 2) return 'بندان';
    if (count >= 3 && count <= 10) return `${count} بنود`;
    return `${count} بند`;
  };

  const generateNextID = (category) => {
    let prefix = 'UNK';
    if (!category) prefix = 'UNK';
    else if (category === 'بضاعة جاهزة' || category.includes('بضاعة')) prefix = 'FG';
    else if (category === 'أقمشة' || category.includes('قماش')) prefix = 'FAB';
    else if (category === 'تغليف' || category.includes('كرتون')) prefix = 'PKG';
    else if (category === 'مستهلكات' || category.includes('مستهلك')) prefix = 'CON';
    else if (category === 'أصول' || category.includes('أصل')) prefix = 'AST';

    const categoryItems = (stockItems || []).filter(item => item.itemNumber && item.itemNumber.startsWith(prefix + '-'));
    
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

  const handleOpenAddStockItemModal = () => {
    const initialData = {
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
    };

    const title = 'إضافة صنف جديد للمخزون';
    
    const allSystemLocations = [...new Set([...(globalSettings.stockLocations || []), ...(stockItems || []).flatMap(s => (s.location || '').split(/[,، -]/).filter(Boolean))])].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));

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
                </select>
                <input id="swal-new-location-input" class="premium-input" style="flex: 1; margin-bottom: 0; display: none !important;" placeholder="اسم الرف الجديد">
                <button id="add-new-location-btn" type="button" class="btn" style="background-color: #13898f; color: white; padding: 0 1rem; border-radius: 8px; flex-shrink: 0;" title="إضافة موقع جديد">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                </button>
              </div>
            </div>

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

            <div class="premium-form-group col-span-12">
              <label>ملاحظات</label>
              <input id="swal-notes" class="premium-input" placeholder="أية ملاحظات إضافية..." value="${initialData.notes || ''}">
            </div>

          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'حفظ الصنف',
      cancelButtonText: 'إلغاء',
      focusConfirm: false,
      preConfirm: () => {
        const name = document.getElementById('swal-name').value.trim();
        const category = document.getElementById('swal-category').value;
        const warehouse = document.getElementById('swal-warehouse').value;
        
        const locSelect = document.getElementById('swal-location');
        const newLocInput = document.getElementById('swal-new-location-input');
        const location = (newLocInput.style.display !== 'none') ? newLocInput.value.trim() : locSelect.value;
        
        const spec = document.getElementById('swal-spec').value;
        const quantity = parseFloat(document.getElementById('swal-quantity').value);
        const unit = document.getElementById('swal-unit').value;
        const minLimit = parseFloat(document.getElementById('swal-minLimit').value);
        const notes = document.getElementById('swal-notes').value.trim();
        const itemNumber = document.getElementById('swal-itemNumber').value;
        const itemCode = document.getElementById('swal-itemCode').value.trim();

        if (!name) { Swal.showValidationMessage('يرجى إدخال اسم الصنف'); return false; }
        if (!category) { Swal.showValidationMessage('يرجى اختيار التصنيف'); return false; }
        if (!warehouse) { Swal.showValidationMessage('يرجى اختيار المخزن'); return false; }
        if (isNaN(quantity) || quantity < 0) { Swal.showValidationMessage('يرجى إدخال كمية صحيحة'); return false; }
        if (!unit) { Swal.showValidationMessage('يرجى اختيار وحدة القياس'); return false; }

        return {
          itemNumber,
          itemCode,
          name,
          category,
          warehouse,
          location,
          spec,
          quantity,
          unit,
          minLimit: isNaN(minLimit) ? 0 : minLimit,
          notes,
          lastMovement: 'إدخال جديد',
          lastMovementDate: new Date().toISOString().split('T')[0],
          lastRecipient: '',
          updatedAt: new Date().toISOString()
        };
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        try {
          await saveStockItem(result.value);
          await addLog({
            userName: user.name,
            userId: user.id,
            module: 'المخزون',
            action: 'إضافة',
            details: `إضافة صنف جديد للمخزون من شاشة الإنتاج: ${result.value.name} (SKU: ${result.value.itemNumber})`
          });
          
          Swal.fire({
            icon: 'success',
            title: 'تم حفظ الصنف بنجاح',
            timer: 1500,
            showConfirmButton: false
          });
          
          await fetchData();
        } catch (error) {
          console.error(error);
          Swal.fire('خطأ', 'حدث خطأ أثناء حفظ الصنف', 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleCopyOrder = (order) => {
    if (!order) return;
    const todayStr = getLocalDateStr(new Date());

    const maxNum = orders.reduce((max, o) => {
      const str = String(o.orderNumber || '');
      if (str.startsWith('PRO-')) {
        const match = str.match(/PRO-(\d+)/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }
      return max;
    }, 0);
    const newOrderNumber = 'PRO-' + String(maxNum + 1).padStart(4, '0');

    const duplicatedData = {
      ...order,
      id: '',
      orderNumber: newOrderNumber,
      orderDate: todayStr,
      status: 'لم يتم التنفيذ',
      items: (order.items || [{
        productName: order.productName || '',
        colorModel: order.colorModel || '',
        sizeCm: order.sizeCm || '',
        thickness: order.thickness || '',
        quantity: order.quantity || '',
        flapSize: order.flapSize || '',
        packagingType: order.packagingType || '',
        clothMeters: order.clothMeters || '',
        notes: order.notes || '',
        status: 'لم يتم التنفيذ'
      }]).map(item => ({
        ...item,
        id: '',
        status: 'لم يتم التنفيذ'
      }))
    };

    setEditingOrder(null);
    setFormData(duplicatedData);
    setShowModal(true);
  };

  const handleOpenModal = (order = null) => {
    if (order) {
      setEditingOrder(order);
      setFormData({ 
        ...order,
        items: order.items || [{
          productName: order.productName || '',
          colorModel: order.colorModel || '',
          sizeCm: order.sizeCm || '',
          thickness: order.thickness || '',
          quantity: order.quantity || '',
          flapSize: order.flapSize || '',
          packagingType: order.packagingType || '',
          clothMeters: order.clothMeters || '',
          notes: order.notes || '',
          status: order.items?.[0]?.status || order.status || 'لم يتم التنفيذ'
        }]
      });
    } else {
      setEditingOrder(null);
      const maxNum = orders.reduce((max, o) => {
        const str = String(o.orderNumber || '');
        if (str.startsWith('PRO-')) {
          const match = str.match(/PRO-(\d+)/);
          return match ? Math.max(max, parseInt(match[1], 10)) : max;
        }
        return max;
      }, 0);
      const nextOrderNumber = `PRO-${String(maxNum + 1).padStart(4, '0')}`;
      
      setFormData({
        orderNumber: nextOrderNumber,
        customerId: '',
        customerName: '',
        orderDate: getLocalDateStr(new Date()),
        deliveryDate: '',
        status: 'لم يتم التنفيذ',
        orderNotes: '',
        items: [{
          productName: '',
          colorModel: '',
          sizeCm: '',
          thickness: '',
          quantity: '',
          flapSize: '',
          packagingType: '',
          clothMeters: '',
          notes: '',
          status: 'لم يتم التنفيذ'
        }]
      });
    }
    setShowModal(true);
  };

  const handleAddMultiColors = (itemsToAdd) => {
    setFormData({
      ...formData,
      items: [...formData.items, ...itemsToAdd]
    });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        productName: '',
        colorModel: '',
        sizeCm: '',
        thickness: '',
        quantity: '',
        flapSize: '',
        packagingType: '',
        clothMeters: '',
        notes: '',
        status: 'لم يتم التنفيذ'
      }]
    });
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length === 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleMoveItemToIndex = (sourceIndex, targetIndex) => {
    if (sourceIndex === targetIndex || sourceIndex < 0 || targetIndex < 0 || sourceIndex >= formData.items.length || targetIndex >= formData.items.length) return;

    const newItems = [...formData.items];
    const [movedItem] = newItems.splice(sourceIndex, 1);
    newItems.splice(targetIndex, 0, movedItem);
    setFormData({ ...formData, items: newItems });
  };

  const handleMoveItem = (index, direction) => {
    handleMoveItemToIndex(index, index + direction);
  };

  const handleItemDragStart = (event, index) => {
    setDraggedItemIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  };

  const handleItemDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleItemDrop = (event, targetIndex) => {
    event.preventDefault();
    const rawSourceIndex = draggedItemIndex ?? event.dataTransfer.getData('text/plain');
    const sourceIndex = Number(rawSourceIndex);
    if (Number.isInteger(sourceIndex)) {
      handleMoveItemToIndex(sourceIndex, targetIndex);
    }
    setDraggedItemIndex(null);
  };

  const handleOpenPreview = (order) => {
    setSelectedOrder(order);
    setShowPreview(true);
  };

  const handleCustomerChange = (e) => {
    const custId = e.target.value;
    const cust = customers.find(c => c.id === custId);
    setFormData({
      ...formData,
      customerId: custId,
      customerName: cust ? cust.name : ''
    });
  };

  const handleAddNewCustomer = () => {
    let maxNum = 0;
    customers.forEach(c => {
      if (c.customerNumber && c.customerNumber.startsWith('CLI-')) {
        const num = parseInt(c.customerNumber.replace('CLI-', ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    const JORDANIAN_CITIES = ['عمان', 'الزرقاء', 'إربد', 'العقبة', 'السلط', 'مادبا', 'الكرك', 'الطفيلة', 'معان', 'جرش', 'عجلون', 'المفرق'];
    const cities = (globalSettings.jordanianCities && globalSettings.jordanianCities.length > 0) ? globalSettings.jordanianCities : JORDANIAN_CITIES;
    const customerNumber = `CLI-${String(maxNum + 1).padStart(4, '0')}`;
    const initialData = { name: '', phone: '', city: '', location: '', status: 'نشط', customerNumber, sector: '' };

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
             <span>إضافة عميل جديد</span>
          </div>
          <div class="premium-modal-close" onclick="Swal.close()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </div>
        </div>
        <div class="premium-form">
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hash text-muted"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>
              رقم العميل
            </label>
            <input id="swal-customerNumber" class="premium-input bg-slate-50 text-slate-500 cursor-not-allowed font-bold" value="${initialData.customerNumber}" disabled>
          </div>
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user text-muted"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              اسم العميل
            </label>
            <input id="swal-name" class="premium-input" placeholder="مثال: شركة مرجاس للتجارة" value="${initialData.name}">
          </div>
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-phone text-muted"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              رقم الهاتف
            </label>
            <input id="swal-phone" class="premium-input" placeholder="07xxxxxxxx" value="${initialData.phone || ''}">
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
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user text-muted"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              البائع (مندوب الطلبيات) *
            </label>
            <select id="swal-salesRep" class="premium-input">
              <option value="زبائن الشركة" selected>زبائن الشركة</option>
              ${(globalSettings.salesReps || []).filter(rep => rep !== 'زبائن الشركة').map(rep => `<option value="${rep}">${rep}</option>`).join('')}
            </select>
          </div>
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-activity text-muted"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>
              حالة العميل
            </label>
            <select id="swal-status" class="premium-input">
              <option value="نشط" selected>نشط</option>
              <option value="غير نشط">غير نشط</option>
              <option value="عميل محتمل">عميل محتمل</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'حفظ العميل',
      cancelButtonText: 'إلغاء',
      focusConfirm: false,
      didOpen: () => {
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
        const name = document.getElementById('swal-name').value;
        const phone = document.getElementById('swal-phone').value;
        const location = document.getElementById('swal-location').value;
        const city = document.getElementById('swal-city').value;
        const sector = document.getElementById('swal-sector').value;
        const status = document.getElementById('swal-status').value;
        if (!name) {
          Swal.showValidationMessage('يرجى ملء اسم العميل');
          return false;
        }
        if (!phone || phone.trim().length !== 10 || isNaN(phone.trim())) {
          Swal.showValidationMessage('يرجى إدخال رقم هاتف يتكون من 10 أرقام حصراً');
          return false;
        }
        if (!city) {
          Swal.showValidationMessage('يرجى اختيار المدينة');
          return false;
        }
        if (city === 'عمان' && !location) {
          Swal.showValidationMessage('يرجى اختيار المنطقة لمدينة عمان');
          return false;
        }
        if (!sector) {
          Swal.showValidationMessage('يرجى اختيار القطاع');
          return false;
        }
        const salesRep = document.getElementById('swal-salesRep').value;
        if ((globalSettings.salesReps || []).length > 0 && !salesRep) {
          Swal.showValidationMessage('يرجى اختيار البائع (مندوب الطلبيات)');
          return false;
        }
        return { name, phone: phone.trim(), city, location, sector, status, salesRep, type: 'عميل', customerNumber: initialData.customerNumber };
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const newCust = await saveCustomer(result.value);
        if (newCust) {
          const updatedCustomers = [...customers, newCust];
          setCustomers(updatedCustomers);
          setFormData({
            ...formData,
            customerId: newCust.id,
            customerName: newCust.name
          });
          await addLog({
            userName: user.name,
            userId: user.id,
            module: 'العملاء',
            action: 'إضافة',
            details: `إضافة العميل (من الإنتاج): ${result.value.name}`
          });
          Swal.fire({ title: 'تم الحفظ', text: 'تمت إضافة العميل بنجاح', icon: 'success', timer: 1500, showConfirmButton: false });
        }
      }
    });
  };

  const productionSaveInFlight = useRef(false);
  const [savingProduction, setSavingProduction] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (productionSaveInFlight.current) return;
    productionSaveInFlight.current = true;
    setSavingProduction(true);
    try { await submitProduction(e); }
    catch (error) { Swal.fire('تعذر الحفظ', error.message || 'يرجى إعادة المحاولة', 'error'); }
    finally { productionSaveInFlight.current = false; setSavingProduction(false); }
  };
  const submitProduction = async (e) => {
    e.preventDefault();

    const isProductionEditable = isAdmin(user) || hasPermission(user, 'production', 'edit');
    const isLinkedOrder = !!formData.salesOrderNumber || (formData.orderNotes && formData.orderNotes.includes('مرتبط'));
    const isAuditLockedForSupervisor = !isAdmin(user) && (formData.stockDeducted || formData.stockReceived);
    const isSubmitLocked = !isProductionEditable || (isLinkedOrder && formData.status !== 'لم يتم التنفيذ') || isAuditLockedForSupervisor;

    if (isSubmitLocked) {
      Swal.fire('مرفوض', 'الطلب مجمد فقط للمعاينة ولا يمكن تعديله نظراً للتدقيق أو الصرف المخزني السابق.', 'error');
      return;
    }

    if (!formData.customerName || formData.items.some(item => !item.productName || !item.quantity)) {
      Swal.fire('خطأ', 'يرجى اختيار العميل وتعبئة جميع بيانات الأصناف المطلوبة', 'error');
      return;
    }



    if (formData.status === 'منتهي') {
      const allItemsFinished = (formData.items || []).every(item => item.status === 'منتهي');
      if (!allItemsFinished) {
        Swal.fire('خطأ', 'لا يمكنك جعل حالة الطلب "منتهي" إلا عندما تكون جميع بنود الأصناف منتهية.', 'error');
        return;
      }
    }

    // For backward compatibility and reporting, we store the first item's details at top level too
    const firstItem = formData.items[0];
    const dataToSave = {
      ...formData,
      status: deriveProductionOrderStatus(formData.items || [], formData.status),
      productName: firstItem.productName,
      quantity: firstItem.quantity,
      createdBy: formData.createdBy || user?.name || 'مدير',
      lastActionBy: user?.name || 'مدير',
      statusUpdateDate: getLocalDateStr(new Date())
    };

    const result = await saveOrder(dataToSave);
    if (result) {
      if (dataToSave.salesOrderId) {
        try {
          const salesOrders = await getSalesOrders();
          const salesOrder = salesOrders.find(so => so.id === dataToSave.salesOrderId);
          if (salesOrder && salesOrder.items) {
            let changed = false;
            const updatedItems = salesOrder.items.map(item => {
              const normalize = (str) => String(str || '').replace(/أ|إ|آ/g, 'ا').replace(/ى/g, 'ي').trim().replace(/\s+/g, ' ');
              const prodItem = dataToSave.items?.find(pi => {
                const name1 = normalize(pi.productName);
                const name2 = normalize(item.productName);
                return name1 === name2 || name1.includes(name2) || name2.includes(name1);
              });
              if (prodItem) {
                const productionStatus = ['مرحلة التغليف', 'منتهي', 'ملغي'].includes(dataToSave.status)
                  ? dataToSave.status
                  : (prodItem.status || dataToSave.status);
                const targetSalesStatus = getSalesItemStatusForProductionStatus(productionStatus);
                if (targetSalesStatus && targetSalesStatus !== 'ملغي' && item.itemStatus !== targetSalesStatus) {
                  changed = true;
                  return { ...item, itemStatus: targetSalesStatus };
                } else if (targetSalesStatus === 'ملغي') {
                  let currentItem = item;
                  if (currentItem.itemStatus !== 'ملغي') {
                    changed = true;
                    currentItem = { ...currentItem, itemStatus: 'ملغي' };
                  }
                  const noteText = '(تم إلغاء الصنف في الإنتاج)';
                  const currentNotes = currentItem.notes || '';
                  if (!currentNotes.includes(noteText)) {
                    changed = true;
                    currentItem = { ...currentItem, notes: currentNotes ? `${currentNotes} ${noteText}` : noteText };
                  }
                  return currentItem;
                }
              }
              return item;
            });
            if (changed) {
              await saveSalesOrder({ ...salesOrder, items: updatedItems, lastActionBy: 'نظام الإنتاج' });
            }
          }
        } catch (err) {
          console.error("Error syncing status to sales order:", err);
        }
      }
      await addLog({
        userName: user.name,
        userId: user.id,
        module: 'طلبيات الإنتاج',
        action: editingOrder ? 'تعديل' : 'إضافة',
        details: `${editingOrder ? 'تعديل' : 'إضافة'} طلبية إنتاج رقم: ${result.orderNumber} للعميل: ${result.customerName}`,
        target: {
          tab: 'production-orders',
          moduleKey: 'production',
          entityType: 'productionOrder',
          entityId: result.id,
          orderId: result.id,
          orderNumber: String(result.orderNumber || '')
        }
      });
      Swal.fire({
        title: editingOrder ? 'تم التحديث' : 'تمت الإضافة',
        text: editingOrder ? 'تم تحديث بيانات الطلبية بنجاح' : 'تم إضافة الطلبية بنجاح برقم ' + result.orderNumber,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      setShowModal(false);
      fetchData();
    }
  };

  const handleDelete = async (id) => {
    if (!isAdmin(user) && !canSafelyDeleteProduction(user)) {
      Swal.fire('غير مصرح', 'صلاحية الحذف مخصصة لحساب المدير العام فقط.', 'warning');
      return;
    }
    const orderToDelete = orders.find(o => o.id === id);
    if (!orderToDelete) return;
    const hasStockEffects = Boolean(orderToDelete.stockDeducted || orderToDelete.stockReceived);

    const result = await MySwal.fire({
      title: 'حذف آمن لكرت الإنتاج؟',
      html: `
        <div style="direction:rtl;text-align:right;font-size:14px;line-height:1.7;">
          <p>سيتم حذف الكرت <b>${orderToDelete.orderNumber || ''}</b>${hasStockEffects ? ' وعكس سندات صرف المواد أو استلام المنتج المرتبطة به' : ''}، ثم فك ارتباطه بطلبية المبيع وإعادة أصنافه إلى «قيد التجهيز» مع الاحتفاظ بنسخة مؤرشفة للرجوع إليها.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، حذف آمن',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
      title: 'جاري الحذف الآمن...',
      text: 'يرجى الانتظار ثوانٍ معدودة...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      // 1. Revert stock vouchers if any exist
      try {
        await revertAuditVouchers(orderToDelete.orderNumber);
        await revertReceiptVouchers(orderToDelete.orderNumber);
        await deleteDraftVouchers(orderToDelete.orderNumber);
      } catch (stockErr) {
        console.warn("Could not revert all stock vouchers, continuing safe delete:", stockErr);
      }

      // 2. Unlink from Sales Order safely
      try {
        const salesOrders = await getSalesOrders();
        const linkedSalesOrder = salesOrders.find(salesOrder =>
          (orderToDelete.salesOrderId && salesOrder.id === orderToDelete.salesOrderId)
          || (orderToDelete.salesOrderNumber && salesOrder.orderNumber === orderToDelete.salesOrderNumber)
        );
        if (linkedSalesOrder) {
          const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('ar');
          const cardItems = orderToDelete.items || [];
          const updatedItems = (linkedSalesOrder.items || []).map(salesItem => {
            const matchesCard = cardItems.some(cardItem =>
              (cardItem.itemNumber && salesItem.itemNumber && cardItem.itemNumber === salesItem.itemNumber)
              || normalize(cardItem.productName || cardItem.name) === normalize(salesItem.productName || salesItem.name)
            );
            return matchesCard ? { ...salesItem, itemStatus: 'قيد التجهيز', receivedReservedQuantity: 0 } : salesItem;
          });
          const updatedSalesOrder = { ...linkedSalesOrder, items: updatedItems };
          if (['جاهز للتسليم للتوصيل', 'جاهز للتوصيل'].includes(updatedSalesOrder.status)) updatedSalesOrder.status = 'جديد';
          if (updatedSalesOrder.productionOrderNumber === orderToDelete.orderNumber) delete updatedSalesOrder.productionOrderNumber;
          await saveSalesOrder(updatedSalesOrder);
        }
      } catch (salesErr) {
        console.warn("Error unlinking sales order:", salesErr);
      }

      // 3. Delete the order (with automatic archiving)
      await deleteOrder(id, user);

      // 4. Add audit log
      try {
        await addLog({
          userName: user?.name || 'المدير العام',
          userId: user?.id || 'admin',
          module: 'طلبيات الإنتاج',
          action: 'حذف آمن',
          details: `حذف وأرشفة كرت إنتاج رقم: ${orderToDelete.orderNumber || id}`
        });
      } catch (logErr) {
        console.warn("Log notice:", logErr);
      }

      await fetchData();
      Swal.fire({
        icon: 'success',
        title: 'تم الحذف الآمن',
        text: `تم حذف كرت الإنتاج ${orderToDelete.orderNumber || ''} بنجاح وأرشفته وفك ارتباطه بالطلبية.`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Error in safe delete:", error);
      Swal.fire('تعذر الحذف', error.message || 'حدث خطأ أثناء الحذف، يرجى إعادة المحاولة.', 'error');
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return;
    if (newStatus === orderToUpdate.status) return;
    if (newStatus === 'إنتاج مختلط') {
      MySwal.fire('تنبيه', 'حالة "إنتاج مختلط" تُحتسب تلقائياً عند اختلاف مراحل الأصناف ولا يتم اختيارها يدوياً.', 'info');
      return;
    }
    
    if (newStatus === 'منتهي') {
      const allItemsFinished = (orderToUpdate.items || []).every(item => item.status === 'منتهي');
      if (!allItemsFinished) {
        MySwal.fire({
          title: 'لا يمكن تغيير الحالة',
          text: 'لا يمكنك جعل حالة الطلب "منتهي" إلا عندما تكون جميع بنود الأصناف منتهية.',
          icon: 'error',
          confirmButtonText: 'حسناً',
          customClass: {
            container: 'premium-modal-container',
            popup: 'premium-modal-popup',
            confirmButton: 'btn-premium-save'
          }
        });
        return;
      }
    }

    const activeItemsCount = (orderToUpdate.items || []).filter(item => item.status !== 'ملغي').length;
    if (activeItemsCount > 0) {
      const confirmation = await MySwal.fire({
        title: 'نقل جميع الأصناف؟',
        html: `سيتم نقل <b>${activeItemsCount}</b> صنفًا في الكرت ${orderToUpdate.orderNumber || ''} إلى <b>${getProductionStatusLabel(newStatus)}</b>.<br><small>لن يُنقل صنف واحد فقط؛ هذا إجراء جماعي.</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'نعم، نقل جميع الأصناف',
        cancelButtonText: 'إلغاء',
        confirmButtonColor: '#0f766e'
      });
      if (!confirmation.isConfirmed) {
        await fetchData();
        return;
      }
    }
    
    const bulkUpdatedItems = (orderToUpdate.items || []).map(item => (
      item.status === 'ملغي' ? item : {
        ...item,
        status: newStatus,
        movementHistory: item.status === newStatus ? (item.movementHistory || []) : [
          ...(Array.isArray(item.movementHistory) ? item.movementHistory : []),
          { from: item.status || orderToUpdate.status || '', to: newStatus, quantity: Number(item.quantity || 0), changedAt: new Date().toISOString(), changedBy: user?.name || 'مدير' }
        ]
      }
    ));

    await saveOrder({ 
      ...orderToUpdate, 
      status: newStatus,
      items: bulkUpdatedItems,
      lastActionBy: user?.name || 'مدير',
      statusUpdateDate: getLocalDateStr(new Date())
    });
    
    // Sync with sales order based on individual item status
    if (orderToUpdate.salesOrderId) {
      try {
        const salesOrders = await getSalesOrders();
        const salesOrder = salesOrders.find(so => so.id === orderToUpdate.salesOrderId);
        if (salesOrder && salesOrder.items) {
          let changed = false;
          const updatedItems = salesOrder.items.map(item => {
            const normalize = (str) => String(str || '').replace(/أ|إ|آ/g, 'ا').replace(/ى/g, 'ي').trim().replace(/\s+/g, ' ');
            const prodItem = orderToUpdate.items?.find(pi => {
              const name1 = normalize(pi.productName);
              const name2 = normalize(item.productName);
              return name1 === name2 || name1.includes(name2) || name2.includes(name1);
            });
            if (prodItem) {
              const targetSalesStatus = getSalesItemStatusForProductionStatus(newStatus);
              if (targetSalesStatus && targetSalesStatus !== 'ملغي') {
                if (item.itemStatus !== targetSalesStatus) {
                  changed = true;
                  return { ...item, itemStatus: targetSalesStatus };
                }
              } else if (targetSalesStatus === 'ملغي') {
                let currentItem = item;
                if (currentItem.itemStatus !== 'ملغي') {
                  changed = true;
                  currentItem = { ...currentItem, itemStatus: 'ملغي' };
                }
                const noteText = '(تم إلغاء الصنف في الإنتاج)';
                const currentNotes = currentItem.notes || '';
                if (!currentNotes.includes(noteText)) {
                  changed = true;
                  currentItem = { ...currentItem, notes: currentNotes ? `${currentNotes} ${noteText}` : noteText };
                }
                return currentItem;
              }
            }
            return item;
          });
          if (changed) {
            await saveSalesOrder({ ...salesOrder, items: updatedItems, lastActionBy: 'نظام الإنتاج' });
          }
        }
      } catch (err) {
        console.error("Error syncing status to sales order:", err);
      }
    }

    await addLog({
      userName: user.name,
      userId: user.id,
      module: 'طلبيات الإنتاج',
      action: 'تعديل حالة',
      details: `تغيير حالة طلبية إنتاج رقم: ${orderToUpdate.orderNumber} إلى: ${newStatus}`
    });
    fetchData();
  };

  const printOrder = (order) => {
    const originalTitle = document.title;
    if (order && order.orderNumber) {
      document.title = order.orderNumber;
    }
    
    // Call print immediately
    window.print();
    
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  const triggerPrint = () => printOrder(selectedOrder);

  const handlePrintOrder = (order) => {
    // Render this order's print portal before opening the browser print dialog.
    flushSync(() => setSelectedOrder(order));
    printOrder(order);
  };

  const triggerSharePDF = async () => {
    const printEl = document.querySelector('.order-print-layout');
    if (!printEl) {
      Swal.fire({
        icon: 'error',
        title: 'خطأ',
        text: 'تعذر العثور على محتوى الطباعة لتوليد الـ PDF.'
      });
      return;
    }

    Swal.fire({
      title: 'جاري تجهيز ملف PDF...',
      html: 'يرجى الانتظار لحين إنشاء ملف PDF ومشاركته.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const portal = document.getElementById('print-portal');
      const originalDisplay = portal.style.display;
      const originalPosition = portal.style.position;
      const originalTop = portal.style.top;
      const originalLeft = portal.style.left;
      const originalZIndex = portal.style.zIndex;
      const originalWidth = portal.style.width;

      portal.style.display = 'block';
      portal.style.position = 'absolute';
      portal.style.top = '-9999px';
      portal.style.left = '-9999px';
      portal.style.width = '800px';
      portal.style.zIndex = '1';

      const originalPrintElWidth = printEl.style.width;
      const originalPrintElMinWidth = printEl.style.minWidth;
      printEl.style.width = '800px';
      printEl.style.minWidth = '800px';

      const opt = {
        margin:       [10, 10, 10, 10],
        filename:     `انتاج_${selectedOrder.orderNumber}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false, windowWidth: 800, width: 800 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const pdfBlob = await html2pdf().set(opt).from(printEl).output('blob');
      
      printEl.style.width = originalPrintElWidth;
      printEl.style.minWidth = originalPrintElMinWidth;

      portal.style.display = originalDisplay;
      portal.style.position = originalPosition;
      portal.style.top = originalTop;
      portal.style.left = originalLeft;
      portal.style.width = originalWidth;
      portal.style.zIndex = originalZIndex;

      Swal.close();

      const fileName = `انتاج_${selectedOrder.orderNumber}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `كرت إنتاج رقم #${selectedOrder.orderNumber}`,
          text: `مرفق تفاصيل كرت إنتاج رقم #${selectedOrder.orderNumber}`
        });
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(pdfBlob);
        link.download = fileName;
        link.click();
        
        Swal.fire({
          icon: 'success',
          title: 'تم تحميل ملف PDF',
          text: 'تم تحميل ملف الـ PDF بنجاح لعدم دعم متصفحك لميزة المشاركة التلقائية.'
        });
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error generating PDF or sharing:', error);
        Swal.fire({
          icon: 'error',
          title: 'فشلت المشاركة',
          text: 'حدث خطأ أثناء محاولة إنشاء ملف PDF أو مشاركته.'
        });
      } else {
        Swal.close();
      }
    }
  };

  const sortedOrders = [...orders].sort((a, b) => {
    if (!sortConfig.key) return 0;
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    
    // Handle numeric fields
    if (sortConfig.key === 'orderNumber') {
      aVal = parseInt(String(aVal || '').replace(/\D/g, '') || 0, 10);
      bVal = parseInt(String(bVal || '').replace(/\D/g, '') || 0, 10);
    } else if (sortConfig.key === 'deliveryDate') {
      aVal = aVal ? new Date(aVal).getTime() : null;
      bVal = bVal ? new Date(bVal).getTime() : null;
    }

    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    const comparison = typeof aVal === 'string' && typeof bVal === 'string'
      ? aVal.localeCompare(bVal, 'ar', { numeric: true, sensitivity: 'base' })
      : aVal - bVal;

    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  const filteredOrders = advancedSearch(sortedOrders, debouncedSearchTerm, ['orderNumber', 'customerName', 'items', 'productName']).filter(o => {
    const matchOrderNum = filterOrderNumber ? (o.orderNumber || '').toString().includes(filterOrderNumber) : true;
    const matchDateFrom = dateFrom ? o.orderDate >= dateFrom : true;
    const matchDateTo = dateTo ? o.orderDate <= dateTo : true;
    const matchCust = selectedCustomer ? o.customerId === selectedCustomer : true;
    const matchStatus = productionSection === 'packaging'
      ? (selectedStatus === 'بانتظار استلام التغليف'
          ? getPackagingOrderStatus(o) === 'بانتظار استلام التغليف'
          : selectedStatus === 'مرحلة التغليف'
            ? getPackagingOrderStatus(o) === 'قيد التغليف'
            : true)
      : selectedStatus === 'معلق' ? (o.status !== 'منتهي' && o.status !== 'ملغي') : (selectedStatus ? o.status === selectedStatus : true);
    const matchSection = productionSection === 'packaging'
      ? orderHasPackagingItems(o)
      : productionSection === 'sewing'
        ? (orderHasSewingItems(o) || o.sewingStatus === 'منتهي' || isSewingOrderComplete(o))
        : true;
    const matchCreatedBy = filterCreatedBy ? (o.createdBy || '').includes(filterCreatedBy) : true;
    return matchOrderNum && matchDateFrom && matchDateTo && matchCust && matchStatus && matchSection && matchCreatedBy;
  });

  const productionLineOrders = advancedSearch(sortedOrders, debouncedSearchTerm, ['orderNumber', 'customerName', 'items', 'productName']).filter(order => {
    if (order.status === 'ملغي') return false;
    if (filterOrderNumber && !String(order.orderNumber || '').includes(filterOrderNumber)) return false;
    if (dateFrom && order.orderDate < dateFrom) return false;
    if (dateTo && order.orderDate > dateTo) return false;
    if (selectedCustomer && order.customerId !== selectedCustomer) return false;
    if (filterCreatedBy && !String(order.createdBy || '').includes(filterCreatedBy)) return false;
    return true;
  });

  const getUniqueCreators = () => {
    const creators = orders.map(o => o.createdBy).filter(Boolean);
    return [...new Set(creators)];
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'منتهي': return 'badge-success';
      case 'لم يتم التنفيذ': return 'badge-danger';
      case 'ملغي': return 'badge-danger';
      case 'مرحلة القص': return 'badge-cutting';
      case 'مرحلة الخياطة': return 'badge-sewing';
      case 'مرحلة التغليف': return 'badge-packaging';
      case 'إنتاج مختلط': return 'badge-warning';
      case 'مرحلة المستودع': return 'badge-warehouse';
      default: return 'badge-info';
    }
  };
  const getStatusStyles = (status) => {
    const badgeClass = getStatusBadgeClass(status);
    switch (badgeClass) {
      case 'badge-success': return { bg: '#dcfce7', text: '#166534' };
      case 'badge-danger': return { bg: '#fee2e2', text: '#991b1b' };
      case 'badge-warning': return { bg: '#fef9c3', text: '#854d0e' };
      case 'badge-cutting': return { bg: '#e0e7ff', text: '#3730a3' };
      case 'badge-sewing': return { bg: '#fae8ff', text: '#86198f' };
      case 'badge-packaging': return { bg: '#ffedd5', text: '#9a3412' };
      case 'badge-warehouse': return { bg: '#f3f4f6', text: '#374151' };
      case 'badge-delivery': return { bg: '#cffafe', text: '#155e75' };
      default: return { bg: '#dbeafe', text: '#1e40af' };
    }
  };

  const handleMobileStatusClick = async (order) => {
    const { value: selectedStatus } = await MySwal.fire({
      title: 'تحديث حالة كرت الإنتاج',
      input: 'select',
      inputOptions: globalSettings.productionStatuses.reduce((acc, status) => {
        acc[status] = status;
        return acc;
      }, {}),
      inputValue: order.status,
      showCancelButton: true,
      confirmButtonText: 'تحديث',
      cancelButtonText: 'إلغاء',
      customClass: {
        confirmButton: 'btn btn-primary px-5 py-2.5 rounded-xl font-bold ml-2',
        cancelButton: 'btn btn-outline px-5 py-2.5 rounded-xl font-bold'
      },
      buttonsStyling: false
    });
    if (selectedStatus) {
      handleUpdateStatus(order.id, selectedStatus);
    }
  };

  const handleUpdateItemStatus = async (order, itemIndex, newItemStatus) => {
    const updatedItems = (order.items || []).map((item, idx) => {
      if (idx === itemIndex) {
        if (item.status === newItemStatus) return item;
        return {
          ...item,
          status: newItemStatus,
          stageQuantities: ['لم يتم التنفيذ', 'تم استلام كرت الإنتاج', 'مرحلة القص', 'مرحلة المستودع', 'مرحلة الخياطة'].includes(canonicalizeProductionStatus(newItemStatus))
            ? { sewing: Number(item.quantity || 0), pendingPackaging: 0, packaging: 0, finished: 0 }
            : item.stageQuantities,
          movementHistory: [
            ...(Array.isArray(item.movementHistory) ? item.movementHistory : []),
            { from: item.status || order.status || '', to: newItemStatus, quantity: Number(item.quantity || 0), changedAt: new Date().toISOString(), changedBy: user?.name || 'مدير' }
          ]
        };
      }
      return item;
    });

    const allItemsReady = updatedItems.length > 0 && updatedItems.every(
      item => item.status === 'منتهي' || item.status === 'جاهز'
    );

    const updatedOrder = {
      ...order,
      items: updatedItems,
      status: deriveProductionOrderStatus(updatedItems, order.status),
      sewingStatus: updatedItems.length > 0 && updatedItems.every(item => getItemStageQuantities(item, order.status).sewing === 0) ? 'منتهي' : 'قيد الخياطة',
      sewingCompletedAt: updatedItems.length > 0 && updatedItems.every(item => getItemStageQuantities(item, order.status).sewing === 0)
        ? (order.sewingCompletedAt || new Date().toISOString())
        : null,
      lastActionBy: user?.name || 'مدير',
      statusUpdateDate: getLocalDateStr(new Date())
    };

    await saveOrder(updatedOrder);

    // Sync with sales order based on individual item status
    if (order.salesOrderId) {
      try {
        const salesOrders = await getSalesOrders();
        const salesOrder = salesOrders.find(so => so.id === order.salesOrderId);
        if (salesOrder && salesOrder.items) {
          let changed = false;
          const updatedSalesItems = salesOrder.items.map(item => {
            const normalize = (str) => String(str || '').replace(/أ|إ|آ/g, 'ا').replace(/ى/g, 'ي').trim().replace(/\s+/g, ' ');
            const name1 = normalize(item.productName);
            const name2 = normalize(updatedItems[itemIndex].productName);
            const isMatch = name1 === name2 || name1.includes(name2) || name2.includes(name1);
            
            if (isMatch) {
              const targetSalesStatus = getSalesItemStatusForProductionStatus(newItemStatus);
              if (targetSalesStatus && targetSalesStatus !== 'ملغي') {
                if (item.itemStatus !== targetSalesStatus) {
                  changed = true;
                  return { ...item, itemStatus: targetSalesStatus };
                }
              } else if (targetSalesStatus === 'ملغي') {
                let currentItem = item;
                if (currentItem.itemStatus !== 'ملغي') {
                  changed = true;
                  currentItem = { ...currentItem, itemStatus: 'ملغي' };
                }
                const noteText = '(تم إلغاء الصنف في الإنتاج)';
                const currentNotes = currentItem.notes || '';
                if (!currentNotes.includes(noteText)) {
                  changed = true;
                  currentItem = { ...currentItem, notes: currentNotes ? `${currentNotes} ${noteText}` : noteText };
                }
                return currentItem;
              }
            }
            return item;
          });
          if (changed) {
            await saveSalesOrder({ ...salesOrder, items: updatedSalesItems, lastActionBy: 'نظام الإنتاج' });
          }
        }
      } catch (err) {
        console.error("Error syncing item status to sales order:", err);
      }
    }

    await addLog({
      userName: user.name,
      userId: user.id,
      module: 'طلبيات الإنتاج',
      action: 'تعديل حالة صنف',
      details: `تغيير حالة الصنف (${updatedItems[itemIndex].productName}) للطلبية رقم: ${order.orderNumber} إلى: ${newItemStatus}`
    });

    await fetchData();
    setSelectedOrder(updatedOrder);
    MySwal.fire({
      icon: 'success',
      title: allItemsReady ? 'تم إنهاء الطلبية تلقائياً' : 'تم تحديث حالة الصنف والكرت',
      timer: 1200,
      showConfirmButton: false
    });
  };

  const handleOpenOperations = (order) => {
    setSelectedOrder(order);
    setShowOperationsModal(true);
  };

  const handleModalItemStatusChange = async (itemIndex, newItemStatus) => {
    if (!editingOrder) {
      handleItemChange(itemIndex, 'status', newItemStatus);
      return;
    }
    const orderSnapshot = { ...editingOrder, items: formData.items };
    await handleUpdateItemStatus(orderSnapshot, itemIndex, newItemStatus);
    const nextItems = formData.items.map((item, index) => index === itemIndex ? { ...item, status: newItemStatus } : item);
    const nextStatus = deriveProductionOrderStatus(nextItems, editingOrder.status);
    setFormData(previous => ({ ...previous, items: nextItems, status: nextStatus }));
    setEditingOrder(previous => ({ ...previous, items: nextItems, status: nextStatus }));
  };

  const persistStageQuantityMovement = async (order, itemIndex, nextQuantities, actionLabel) => {
    const currentItem = (order.items || [])[itemIndex];
    if (!currentItem) return;
    const nextItemStatus = deriveItemStatusFromQuantities(nextQuantities);
    const movedQuantity = Number(nextQuantities._movedQuantity || 0);
    const cleanQuantities = {
      sewing: Number(nextQuantities.sewing || 0),
      pendingPackaging: Number(nextQuantities.pendingPackaging || 0),
      packaging: Number(nextQuantities.packaging || 0),
      finished: Number(nextQuantities.finished || 0)
    };
    const updatedItems = (order.items || []).map((item, index) => index === itemIndex ? {
      ...item,
      status: nextItemStatus,
      stageQuantities: cleanQuantities,
      movementHistory: [
        ...(Array.isArray(item.movementHistory) ? item.movementHistory : []),
        { action: actionLabel, from: item.status || order.status || '', to: nextItemStatus, quantity: movedQuantity, changedAt: new Date().toISOString(), changedBy: user?.name || 'مدير' }
      ]
    } : item);
    const updatedOrder = {
      ...order,
      items: updatedItems,
      status: deriveProductionOrderStatus(updatedItems, order.status),
      lastActionBy: user?.name || 'مدير',
      statusUpdateDate: getLocalDateStr(new Date())
    };
    await saveOrder(updatedOrder);

    if (order.salesOrderId) {
      const salesOrders = await getSalesOrders();
      const salesOrder = salesOrders.find(sales => sales.id === order.salesOrderId);
      if (salesOrder?.items) {
        const normalize = value => String(value || '').replace(/أ|إ|آ/g, 'ا').replace(/ى/g, 'ي').trim().replace(/\s+/g, ' ');
        const targetName = normalize(currentItem.productName);
        const salesStatus = cleanQuantities.sewing > 0
          ? 'إنتاج قيد الخياطة'
          : (cleanQuantities.pendingPackaging > 0 || cleanQuantities.packaging > 0)
            ? 'إنتاج قيد التغليف'
            : 'جاهز';
        const salesItems = salesOrder.items.map(item => {
          const name = normalize(item.productName);
          return (name === targetName || name.includes(targetName) || targetName.includes(name)) ? { ...item, itemStatus: salesStatus } : item;
        });
        await saveSalesOrder({ ...salesOrder, items: salesItems, lastActionBy: 'نظام الإنتاج' });
      }
    }

    await addLog({
      userName: user?.name || 'مدير', userId: user?.id || '', module: 'طلبيات الإنتاج', action: actionLabel,
      details: `${actionLabel} للصنف (${currentItem.productName}) بكمية ${movedQuantity} من الكرت ${order.orderNumber}`
    });
    setOrders(previous => previous.map(item => item.id === order.id ? updatedOrder : item));
    setSelectedOrder(previous => previous?.id === order.id ? updatedOrder : previous);
    setEditingOrder(previous => previous?.id === order.id ? updatedOrder : previous);
    setFormData(previous => previous?.id === order.id || editingOrder?.id === order.id ? { ...previous, items: updatedItems, status: updatedOrder.status } : previous);
    return updatedOrder;
  };

  const askStageQuantity = async ({ title, available, confirmButtonText }) => {
    const result = await MySwal.fire({
      title,
      html: `<div dir="rtl">الكمية المتاحة: <b>${available}</b></div>`,
      input: 'number',
      inputValue: available,
      inputAttributes: { min: 1, max: available, step: 1 },
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText: 'إلغاء',
      inputValidator: value => {
        const quantity = Number(value);
        if (!Number.isFinite(quantity) || quantity <= 0 || quantity > available) return `أدخل كمية بين 1 و ${available}`;
        return null;
      }
    });
    return result.isConfirmed ? Number(result.value) : 0;
  };

  const handleSendQuantityToPackaging = async (order, itemIndex) => {
    const item = order.items[itemIndex];
    const quantities = getItemStageQuantities(item, order.status);
    if (quantities.sewing <= 0) return;
    const amount = await askStageQuantity({ title: `إرسال ${item.productName} إلى التغليف`, available: quantities.sewing, confirmButtonText: 'إرسال الكمية' });
    if (!amount) return;
    await persistStageQuantityMovement(order, itemIndex, { ...quantities, sewing: quantities.sewing - amount, pendingPackaging: quantities.pendingPackaging + amount, _movedQuantity: amount }, 'إرسال كمية إلى التغليف');
  };

  const handleSendAllToPackaging = async (order, itemIndex) => {
    const item = order.items[itemIndex];
    const quantities = getItemStageQuantities(item, order.status);
    if (quantities.sewing <= 0) return;
    const result = await MySwal.fire({
      icon: 'question', title: 'تسليم كامل الكمية إلى التغليف',
      html: `<div dir="rtl">سيتم تسليم كامل الكمية المتبقية من <b>${item.productName}</b><br><strong>${quantities.sewing} قطعة</strong></div>`,
      showCancelButton: true, confirmButtonText: 'نعم، تسليم كامل', cancelButtonText: 'إلغاء'
    });
    if (!result.isConfirmed) return;
    await persistStageQuantityMovement(order, itemIndex, {
      ...quantities, sewing: 0,
      pendingPackaging: quantities.pendingPackaging + quantities.sewing,
      _movedQuantity: quantities.sewing
    }, 'تسليم كامل الكمية إلى التغليف');
  };

  const handleAdvanceProductionItem = async (order, itemIndex, nextStatus) => {
    const item = order.items?.[itemIndex];
    if (!item) return;
    const result = await MySwal.fire({
      icon: 'question', title: 'تأكيد انتقال الصنف',
      html: `<div dir="rtl"><b>${item.productName || 'الصنف'}</b><br>الانتقال إلى: <strong>${getProductionStatusLabel(nextStatus)}</strong></div>`,
      showCancelButton: true, confirmButtonText: 'تأكيد الانتقال', cancelButtonText: 'إلغاء'
    });
    if (!result.isConfirmed) return;
    await handleUpdateItemStatus(order, itemIndex, nextStatus);
  };

  const handleReceivePackagingQuantity = async (order, itemIndex) => {
    const item = order.items[itemIndex];
    const quantities = getItemStageQuantities(item, order.status);
    if (quantities.pendingPackaging <= 0) return;
    const amount = await askStageQuantity({ title: `تأكيد استلام ${item.productName}`, available: quantities.pendingPackaging, confirmButtonText: 'تأكيد الاستلام' });
    if (!amount) return;
    await persistStageQuantityMovement(order, itemIndex, { ...quantities, pendingPackaging: quantities.pendingPackaging - amount, packaging: quantities.packaging + amount, _movedQuantity: amount }, 'استلام كمية في التغليف');
  };

  const handleFinishPackagingQuantity = async (order, itemIndex) => {
    const item = order.items[itemIndex];
    const quantities = getItemStageQuantities(item, order.status);
    if (quantities.packaging <= 0) return;
    const amount = await askStageQuantity({ title: `تسجيل الكمية المغلفة من ${item.productName}`, available: quantities.packaging, confirmButtonText: 'تسجيل الكمية المغلفة' });
    if (!amount) return;
    await persistStageQuantityMovement(order, itemIndex, { ...quantities, packaging: quantities.packaging - amount, finished: quantities.finished + amount, _movedQuantity: amount }, 'تسجيل كمية مكتملة التغليف');
  };

  const handleReturnQuantityToSewing = async (order, itemIndex) => {
    const item = order.items[itemIndex];
    const quantities = getItemStageQuantities(item, order.status);
    const available = quantities.pendingPackaging + quantities.packaging + quantities.finished;
    if (available <= 0) return;
    const result = await MySwal.fire({
      title: `إرجاع ${item.productName} إلى الخياطة`,
      html: `<div dir="rtl">الكمية المتاحة للإرجاع: <b>${available}</b></div>`,
      input: 'number', inputValue: available,
      inputAttributes: { min: 1, max: available, step: 1 },
      showCancelButton: true, confirmButtonText: 'تأكيد الإرجاع', cancelButtonText: 'إلغاء',
      inputValidator: value => Number(value) > 0 && Number(value) <= available ? null : `أدخل كمية بين 1 و ${available}`
    });
    if (!result.isConfirmed) return;
    let amount = Number(result.value);
    const fromPackaging = Math.min(amount, quantities.packaging);
    const afterPackaging = amount - fromPackaging;
    const fromPending = Math.min(afterPackaging, quantities.pendingPackaging);
    const fromFinished = afterPackaging - fromPending;
    await persistStageQuantityMovement(order, itemIndex, {
      ...quantities,
      sewing: quantities.sewing + amount,
      packaging: quantities.packaging - fromPackaging,
      pendingPackaging: quantities.pendingPackaging - fromPending,
      finished: quantities.finished - fromFinished,
      _movedQuantity: amount
    }, 'إرجاع كمية إلى الخياطة');
  };

  const handleSectionItemStatusChange = async (itemIndex, newStatus) => {
    const orderSnapshot = editingOrder ? { ...editingOrder, items: formData.items } : null;
    if (['تم التحويل إلى قسم التغليف', 'بانتظار استلام التغليف', 'مرحلة التغليف'].includes(newStatus) && orderSnapshot) {
      await handleSendQuantityToPackaging(orderSnapshot, itemIndex);
      return;
    }
    await handleModalItemStatusChange(itemIndex, newStatus);
  };

  const getNormalizedItems = (order) => {
    if (!order) return [];
    if (order.items && order.items.length > 0) return order.items;
    return [{
      productName: order.productName || '',
      colorModel: order.colorModel || '',
      sizeCm: order.sizeCm || '',
      thickness: order.thickness || '',
      quantity: order.quantity || 0,
      status: order.status || 'لم يتم التنفيذ'
    }];
  };

  const getOrderStats = (order) => {
    const items = getNormalizedItems(order);
    
    // Filter out cancelled items as they do not require production
    const prodItems = items.filter(item => item.status !== 'ملغي');
    
    // Total number of active item rows
    const totalItemsCount = prodItems.length;
    
    // Count of item rows that are not started (status is "لم يتم التنفيذ" or empty)
    const unexecutedQty = prodItems.filter(item => !item.status || item.status === 'لم يتم التنفيذ').length;
      
    // Count of item rows that are completed (status is "منتهي" or "مرحلة المستودع")
    const completedQty = prodItems.filter(item => item.status === 'منتهي' || item.status === 'مرحلة المستودع').length;
      
    // Count of remaining item rows to be produced (Total active rows minus completed rows)
    const remainingQty = Math.max(0, totalItemsCount - completedQty);
    
    return { totalItemsCount, unexecutedQty, completedQty, remainingQty };
  };

  const stats = selectedOrder ? getOrderStats(selectedOrder) : { totalItemsCount: 0, unexecutedQty: 0, completedQty: 0, remainingQty: 0 };
  const selectedOrderStageCounts = selectedOrder ? getProductionStageCounts(selectedOrder) : { sewing: 0, packaging: 0, finished: 0, total: 0 };
  const normalizedItems = selectedOrder
    ? getNormalizedItems(selectedOrder)
        .map((item, originalIndex) => ({ ...item, _originalIndex: originalIndex }))
    : [];

  const isProductionEditable = isAdmin(user) || 
    hasPermission(user, 'production', 'edit');

  const isLinkedOrder = !!formData.salesOrderNumber || (formData.orderNotes && formData.orderNotes.includes('مرتبط'));
  const isAuditLockedForSupervisor = !isAdmin(user) && (formData.stockDeducted || formData.stockReceived);
  const isEditLocked = !isProductionEditable || (isLinkedOrder && formData.status !== 'لم يتم التنفيذ') || isAuditLockedForSupervisor;
  const visibleFormItemEntries = (formData.items || [])
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      if (productionSection !== 'packaging' || !editingOrder) return true;
      const quantities = getItemStageQuantities(item, editingOrder.status);
      return quantities.pendingPackaging + quantities.packaging + quantities.finished > 0;
    });

  return (
    <div className="animate-fade-in">
      {/* Printable Area using Portal */}
      {selectedOrder && createPortal(
        <div className="order-print-layout" style={{ direction: 'rtl', padding: '1.5cm', fontFamily: 'Tajawal, sans-serif', background: 'white', color: '#333' }}>
          <style dangerouslySetInnerHTML={{ __html: `
            .order-print-layout table {
              display: table !important;
              width: 100% !important;
            }
            .order-print-layout thead {
              display: table-header-group !important;
            }
            .order-print-layout tbody {
              display: table-row-group !important;
            }
            .order-print-layout tr {
              display: table-row !important;
            }
            .order-print-layout th, .order-print-layout td {
              display: table-cell !important;
            }
            .order-print-layout .signatures-container {
              display: table !important;
              width: 100% !important;
            }
          `}} />
          {/* Header */}
          <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src={globalSettings.logoUrl} alt={globalSettings.siteName} style={{ height: '75px', objectFit: 'contain' }} />
              <div>
                <h1 style={{ margin: 0, fontSize: '1.7rem', color: '#0f172a' }}>{globalSettings.siteName}</h1>
                <p style={{ margin: '4px 0 0', fontSize: '1.1rem', color: '#64748b' }}>تقرير طلبية إنتاج تفصيلي</p>
              </div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#0f172a', letterSpacing: '1px' }}>{selectedOrder.orderNumber}</div>
              <div style={{ fontSize: '1.2rem', color: '#64748b', marginTop: '4px', fontWeight: 'bold' }}>تاريخ الطلب: {selectedOrder.orderDate}</div>
            </div>
          </div>

          {/* Order Details Grid Table */}
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '1.5rem 0', margin: '0 -1.5rem 2rem -1.5rem', tableLayout: 'fixed' }}>
            <tbody>
              <tr>
                {/* معلومات العميل والطلب */}
                <td style={{ width: '50%', verticalAlign: 'top', padding: 0 }}>
                  <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', height: '100%' }}>
                    <h3 style={{ fontSize: '1.3rem', margin: '0 0 1rem 0', color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', fontWeight: 'bold' }}>معلومات العميل والطلب</h3>
                    <table style={{ width: '100%', fontSize: '1.1rem', lineHeight: '1.8' }}>
                      <tbody>
                        <tr>
                          <td style={{ color: '#64748b', width: '130px', fontWeight: 'bold' }}>اسم العميل:</td>
                          <td style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '1.2rem' }}>{selectedOrder.customerName}</td>
                        </tr>
                        <tr>
                          <td style={{ color: '#64748b', fontWeight: 'bold' }}>الحالة:</td>
                          <td><span style={{ background: '#e2e8f0', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold', color: '#334155' }}>{selectedOrder.status || '---'}</span></td>
                        </tr>
                        {selectedOrder.deliveryDate && (
                          <tr>
                            <td style={{ color: '#64748b', fontWeight: 'bold' }}>تاريخ التسليم:</td>
                            <td>
                              <span style={{ fontWeight: '900', color: '#dc2626', fontSize: '1.4rem', borderBottom: '2px solid #fca5a5', paddingBottom: '2px' }}>
                                {selectedOrder.deliveryDate}
                              </span>
                            </td>
                          </tr>
                        )}
                        {(selectedOrder.salesOrderNumber || (selectedOrder.orderNotes && selectedOrder.orderNotes.includes('مرتبط بطلبية'))) && (
                          <tr>
                            <td style={{ color: '#64748b', fontWeight: 'bold' }}>مرتبط بطلبية:</td>
                            <td>
                              <span style={{ fontWeight: '900', color: '#0369a1', fontSize: '1.4rem', borderBottom: '2px solid #bae6fd', paddingBottom: '2px' }}>
                                {selectedOrder.salesOrderNumber || selectedOrder.orderNotes.match(/ORD-\d+/)?.[0] || 'نعم'}
                              </span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </td>

                {/* معلومات إدارية */}
                <td style={{ width: '50%', verticalAlign: 'top', padding: 0 }}>
                  <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', height: '100%' }}>
                    <h3 style={{ fontSize: '1.3rem', margin: '0 0 1rem 0', color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', fontWeight: 'bold' }}>معلومات إدارية</h3>
                    <table style={{ width: '100%', fontSize: '1.1rem', lineHeight: '1.8' }}>
                      <tbody>
                        <tr>
                          <td style={{ color: '#64748b', width: '140px', fontWeight: 'bold' }}>أُنشئت بواسطة:</td>
                          <td style={{ fontWeight: 'bold', color: '#0f172a' }}>{selectedOrder.createdBy || '---'}</td>
                        </tr>
                        <tr>
                          <td style={{ color: '#64748b', fontWeight: 'bold' }}>آخر إجراء بواسطة:</td>
                          <td style={{ fontWeight: 'bold', color: '#0f172a' }}>{selectedOrder.lastActionBy || '---'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {selectedOrder.orderNotes && (
            <div style={{ background: '#fff', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid #93c5fd', borderRight: '4px solid #3b82f6', marginBottom: '2rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '1.2rem', fontWeight: 'bold' }}>ملاحظات عامة على الطلبية:</h4>
              <p style={{ margin: 0, color: '#334155', lineHeight: '1.6', fontSize: '1.1rem', fontWeight: '500' }}>{selectedOrder.orderNotes}</p>
            </div>
          )}

          {/* Items Table */}
          <h3 style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', fontWeight: 'bold' }}>تفاصيل أصناف الإنتاج</h3>
          <table className="print-items-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', width: '40px', color: '#334155', fontSize: '1.1rem' }}>#</th>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#334155', fontSize: '1.1rem' }}>الصنف</th>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', width: '90px', color: '#334155', fontSize: '1.1rem' }}>المقاس</th>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', width: '90px', color: '#334155', fontSize: '1.1rem' }}>السماكة</th>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', width: '80px', color: '#334155', fontSize: '1.1rem' }}>الكمية</th>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', width: '110px', color: '#334155', fontSize: '1.1rem' }}>الموديل</th>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#334155', fontSize: '1.1rem' }}>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {(selectedOrder.items || [{
                productName: selectedOrder.productName,
                sizeCm: selectedOrder.sizeCm,
                thickness: selectedOrder.thickness,
                quantity: selectedOrder.quantity,
                colorModel: selectedOrder.colorModel,
                notes: selectedOrder.notes
              }]).map((item, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 'bold', color: '#64748b', fontSize: '1.1rem' }}>{idx + 1}</td>
                  <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 'bold', color: '#0f172a', fontSize: '1.2rem' }}>{item.productName}</td>
                  <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 'bold', color: '#0f172a', fontSize: '1.1rem' }}>{item.sizeCm} سم</td>
                  <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 'bold', color: '#0f172a', fontSize: '1.1rem' }}>{item.thickness} سم</td>
                  <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: '900', color: '#0f172a', fontSize: '1.3rem' }}>{item.quantity}</td>
                  <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 'bold', color: '#0f172a', fontSize: '1.1rem' }}>{item.colorModel}</td>
                  <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#334155', fontSize: '1.1rem', fontWeight: '500' }}>
                    {item.notes || item.productionNotes}
                    {item.packagingType && <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>تغليف: {item.packagingType}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Signatures Table */}
          <table className="signatures-container" style={{ width: '100%', marginTop: '5rem', marginBottom: '2rem', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ width: '50%', textAlign: 'center', border: 'none', padding: 0 }}>
                  <div style={{ display: 'inline-block', borderTop: '2px solid #cbd5e1', width: '220px', paddingTop: '1rem', fontWeight: 'bold', color: '#334155', fontSize: '1.1rem' }}>توقيع مسؤول المخزون</div>
                </td>
                <td style={{ width: '50%', textAlign: 'center', border: 'none', padding: 0 }}>
                  <div style={{ display: 'inline-block', borderTop: '2px solid #cbd5e1', width: '220px', paddingTop: '1rem', fontWeight: 'bold', color: '#334155', fontSize: '1.1rem' }}>توقيع مسؤول الطلبيات</div>
                </td>
              </tr>
            </tbody>
          </table>
          
          <div style={{ marginTop: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            تم طباعة هذا المستند من نظام {globalSettings.siteName}
          </div>
        </div>,
        document.getElementById('print-portal')
      )}
      {/* Main Content */}
      <div className="no-print">
        <div className="flex justify-between items-center" style={{ marginBottom: isMobile ? '8px' : '18px', marginTop: isMobile ? '8px' : '0', gap: '12px', flexWrap: 'wrap' }}>
          <h2 className="text-2xl font-bold flex items-center gap-2 m-0 text-right">
            <SewingMachineIcon className="text-primary" /> إدارة الإنتاج
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="production-view-switch">
            <button className={productionView === 'line' ? 'active' : ''} onClick={() => setProductionView('line')}><Layers size={16}/> خط الإنتاج</button>
            <button className={productionView === 'cards' ? 'active' : ''} onClick={() => setProductionView('cards')}><Clipboard size={16}/> كروت الإنتاج</button>
          </div>
          {isAdmin(user) && (
          <button 
            className="btn btn-primary flex items-center gap-2" 
            onClick={() => handleOpenModal()}
            disabled={loading}
            style={loading ? {opacity: 0.6, cursor: 'not-allowed'} : {}}
          >
            <Plus size={18} /> طلبية إنتاج جديدة
          </button>
          )}
          </div>
        </div>

        {productionView === 'line' && <>
        <div className="production-line-toolbar">
          <div><Search size={18}/><input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="بحث برقم الكرت أو العميل أو الصنف..." /></div>
          <button onClick={() => { const today = getLocalDateStr(new Date()); setDateFrom(today); setDateTo(today); }}><Calendar size={17}/> اليوم</button>
          <button onClick={() => setShowFilterModal(true)}><Filter size={17}/> فلترة {(filterOrderNumber || dateFrom || dateTo || selectedCustomer || filterCreatedBy) && <b>نشط</b>}</button>
          {(filterOrderNumber || dateFrom || dateTo || selectedCustomer || filterCreatedBy) && <button className="clear" onClick={() => { setFilterOrderNumber(''); setDateFrom(''); setDateTo(''); setSelectedCustomer(''); setFilterCreatedBy(''); }}>مسح الفلاتر</button>}
        </div>
        {showFilterModal && <div className="production-line-filters">
          <label>رقم كرت الإنتاج<input value={filterOrderNumber} onChange={event => setFilterOrderNumber(event.target.value)} placeholder="مثال: PRO-0056" /></label>
          <label>من تاريخ<input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} /></label>
          <label>إلى تاريخ<input type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} /></label>
          <label>العميل<select value={selectedCustomer} onChange={event => setSelectedCustomer(event.target.value)}><option value="">جميع العملاء</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
          <button onClick={() => setShowFilterModal(false)}><Check size={16}/> تطبيق وإغلاق</button>
        </div>}
        <ProductionLineBoard
          section={productionSection}
          orders={productionLineOrders}
          selectedOrder={selectedOrder}
          onSelectOrder={setSelectedOrder}
          onOpenPreview={handleOpenPreview}
          onSend={handleSendQuantityToPackaging}
          onSendAll={handleSendAllToPackaging}
          onAdvance={handleAdvanceProductionItem}
          onReceive={handleReceivePackagingQuantity}
          onFinish={handleFinishPackagingQuantity}
          onReturn={handleReturnQuantityToSewing}
          editable={isProductionEditable}
        /></>}

        <div style={{ display: productionView === 'cards' ? 'block' : 'none' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, minmax(180px, 1fr))', gap: '10px', marginBottom: '16px' }} className="no-print">
          {[
            { key: 'sewing', label: 'قسم الخياطة', count: orders.filter(order => orderHasSewingItems(order) || order.sewingStatus === 'منتهي' || isSewingOrderComplete(order)).length, color: '#0f766e' },
            { key: 'packaging', label: 'قسم التغليف', count: orders.filter(orderHasPackagingItems).length, color: '#c2410c' },
            { key: 'all', label: 'جميع أوامر الإنتاج', count: orders.length, color: '#475569' }
          ].filter(section => !isMobile || section.key !== 'all').map(section => {
            const active = productionSection === section.key;
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => { setProductionSection(section.key); setSelectedStatus(section.key === 'packaging' || section.key === 'all' ? '' : 'معلق'); }}
                style={{
                  gridColumn: isMobile && section.key === 'all' ? 'span 2' : 'auto',
                  minHeight: '64px', borderRadius: '14px', cursor: 'pointer',
                  border: active ? `2px solid ${section.color}` : '1px solid #e2e8f0',
                  background: active ? `${section.color}12` : '#fff',
                  color: active ? section.color : '#475569',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', fontWeight: 900, fontSize: '15px',
                  boxShadow: active ? `0 4px 12px ${section.color}20` : '0 1px 3px rgba(15,23,42,0.05)'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {section.key === 'packaging' ? <Package size={20} /> : section.key === 'sewing' ? <SewingMachineIcon size={20} /> : <Layers size={20} />}
                  {section.label}
                </span>
                <span style={{ minWidth: '30px', height: '30px', padding: '0 8px', borderRadius: '15px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: active ? section.color : '#f1f5f9', color: active ? '#fff' : '#64748b' }}>{section.count}</span>
              </button>
            );
          })}
        </div>

      {/* Filter Bar */}
      <div className="glass-panel mb-4 no-print" style={{ padding: '1rem' }}>
        <div className="flex flex-col gap-3 w-full">
          {/* Row 1: Search and Advanced Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
            <Search className="text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="بحث سريع (رقم، عميل، صنف)..."
              className="input-field flex-1" 
              style={{ marginBottom: 0, height: '44px', borderRadius: '12px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button 
              className="btn btn-primary flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md shrink-0"
              onClick={() => setShowFilterModal(true)}
              style={{
                height: '44px',
                padding: '0 20px',
                borderRadius: '12px',
                fontWeight: 'bold',
                fontSize: '15px',
                border: 'none',
                color: 'white',
                backgroundColor: 'var(--primary)'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-filter"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              <span>تصفية</span>
              {(filterOrderNumber || dateFrom || dateTo || selectedCustomer || selectedStatus || filterCreatedBy) && (
                <span className="bg-white text-primary rounded-full px-2 py-0.5 text-[0.7rem] font-bold mr-1">نشط</span>
              )}
            </button>
          </div>
          
          {/* Row 2: Status Quick Filters */}
          <div className="flex items-center gap-3 w-full" style={{ display: isMobile ? 'none' : 'flex' }}>
            <div className="flex-1 flex gap-2 overflow-x-auto pb-1 no-scrollbar items-center" style={{ WebkitOverflowScrolling: 'touch' }}>
              {productionSection === 'packaging' && [
                { value: '', label: 'الكل', count: orders.filter(orderHasPackagingItems).length },
                { value: 'بانتظار استلام التغليف', label: 'بانتظار استلام التغليف', count: orders.filter(order => getPackagingOrderStatus(order) === 'بانتظار استلام التغليف').length },
                { value: 'مرحلة التغليف', label: 'قيد التغليف', count: orders.filter(order => getPackagingOrderStatus(order) === 'قيد التغليف').length }
              ].map(filter => {
                const active = selectedStatus === filter.value;
                return <button key={filter.value || 'packaging-all'} onClick={() => setSelectedStatus(filter.value)} style={{ padding: '8px 16px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', border: active ? 'none' : '1px solid #e2e8f0', backgroundColor: active ? '#c2410c' : '#fff', color: active ? '#fff' : '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: active ? '0 4px 6px -1px rgba(194,65,12,.2)' : '0 1px 2px rgba(0,0,0,.05)' }}><span>{filter.label}</span><span style={{ background: active ? 'rgba(255,255,255,.2)' : '#f1f5f9', color: active ? '#fff' : '#64748b', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{filter.count}</span></button>;
              })}
              {productionSection !== 'packaging' && <>
              <button 
                onClick={() => setSelectedStatus('')}
                style={{
                  padding: '8px 16px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap',
                  border: selectedStatus === '' ? 'none' : '1px solid #e2e8f0',
                  backgroundColor: selectedStatus === '' ? '#1a8d9b' : '#ffffff',
                  color: selectedStatus === '' ? 'white' : '#475569',
                  display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: selectedStatus === '' ? '0 4px 6px -1px rgba(26,141,155,0.2)' : '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <span>الكل</span>
                <span style={{ backgroundColor: selectedStatus === '' ? 'rgba(255,255,255,0.2)' : '#f1f5f9', color: selectedStatus === '' ? 'white' : '#64748b', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{orders.length}</span>
              </button>
              
              <button 
                onClick={() => setSelectedStatus('معلق')}
                style={{
                  padding: '8px 16px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap',
                  border: selectedStatus === 'معلق' ? 'none' : '1px solid #e2e8f0',
                  backgroundColor: selectedStatus === 'معلق' ? '#f59e0b' : '#ffffff',
                  color: selectedStatus === 'معلق' ? 'white' : '#475569',
                  display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: selectedStatus === 'معلق' ? '0 4px 6px -1px rgba(245,158,11,0.2)' : '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <span>معلق</span>
                <span style={{ backgroundColor: selectedStatus === 'معلق' ? 'rgba(255,255,255,0.2)' : '#f1f5f9', color: selectedStatus === 'معلق' ? 'white' : '#64748b', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{orders.filter(o => o.status !== 'منتهي' && o.status !== 'ملغي').length}</span>
              </button>
              
              {globalSettings.productionStatuses.filter(s => !['مرحلة التغليف', 'إنتاج مختلط', 'منتهي'].includes(canonicalizeProductionStatus(s))).map(s => {
                const count = orders.filter(o => o.status === s).length;
                return (
                  <button 
                    key={s}
                    onClick={() => setSelectedStatus(s)}
                    style={{
                      padding: '8px 16px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap',
                      border: selectedStatus === s ? 'none' : '1px solid #e2e8f0',
                      backgroundColor: selectedStatus === s ? '#1a8d9b' : '#ffffff',
                      color: selectedStatus === s ? 'white' : '#475569',
                      display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s',
                      boxShadow: selectedStatus === s ? '0 4px 6px -1px rgba(26,141,155,0.2)' : '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                  >
                    <span>{s}</span>
                    <span style={{ backgroundColor: selectedStatus === s ? 'rgba(255,255,255,0.2)' : '#f1f5f9', color: selectedStatus === s ? 'white' : '#64748b', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{count}</span>
                  </button>
                );
              })}
              </>}
            </div>
          </div>
        </div>
      </div>

      {showFilterModal && (
        <div className="modal-overlay no-print" style={{ zIndex: 10500 }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '500px' }}>
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-xl font-bold flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-filter text-primary"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> تصفية مخصصة</h3>
              <button type="button" className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setShowFilterModal(false)}><X size={18} /></button>
            </div>
            
            <div className="space-y-4">
              <div className="input-group">
                <label>رقم الطلبية</label>
                <input type="text" className="input-field" value={filterOrderNumber} onChange={(e) => setFilterOrderNumber(e.target.value)} placeholder="بحث برقم الطلبية..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="input-group mb-0">
                  <label>من تاريخ</label>
                  <Flatpickr className="input-field w-full" value={dateFrom} onChange={([d]) => setDateFrom(getLocalDateStr(d))} options={{ dateFormat: 'Y-m-d', disableMobile: true }} placeholder="من تاريخ" />
                </div>
                <div className="input-group mb-0">
                  <label>إلى تاريخ</label>
                  <Flatpickr className="input-field w-full" value={dateTo} onChange={([d]) => setDateTo(getLocalDateStr(d))} options={{ dateFormat: 'Y-m-d', disableMobile: true }} placeholder="إلى تاريخ" />
                </div>
              </div>
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
                  {(productionSection === 'packaging'
                    ? [
                        { value: 'بانتظار استلام التغليف', label: 'بانتظار استلام التغليف' },
                        { value: 'مرحلة التغليف', label: 'قيد التغليف' }
                      ]
                    : [
                        { value: 'معلق', label: 'معلق' },
                        ...(globalSettings.productionStatuses || [])
                          .filter(s => !['مرحلة التغليف', 'إنتاج مختلط', 'منتهي'].includes(canonicalizeProductionStatus(s)))
                          .map(s => ({ value: s, label: getProductionStatusLabel(s) }))
                      ]
                  ).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>أُنشئت بواسطة</label>
                <select className="input-field" value={filterCreatedBy} onChange={(e) => setFilterCreatedBy(e.target.value)}>
                  <option value="">الجميع</option>
                  {getUniqueCreators().map((creator, i) => (
                    <option key={i} value={creator}>{creator}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-4 mt-6 pt-4 border-t">
              <button className="btn btn-primary flex-1" onClick={() => setShowFilterModal(false)}>تطبيق</button>
              <button className="btn btn-outline flex-1" onClick={() => {
                setFilterOrderNumber(''); setDateFrom(''); setDateTo(''); setSelectedCustomer(''); setSelectedStatus('معلق'); setFilterCreatedBy('');
              }}>تفريغ</button>
            </div>
          </div>
        </div>
      )}

        {loading ? (
          <div className="text-center py-10">جاري التحميل...</div>
        ) : isMobile ? (
          <div className="flex flex-col gap-4 no-print" style={{ padding: '0 8px 120px 8px' }}>
            {filteredOrders.length > 0 ? (
             filteredOrders.map(order => (
                <div 
                  key={order.id} 
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginBottom: '16px'
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', direction: 'rtl', gap: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'right', flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontStyle: 'normal', fontWeight: '800', color: '#0284c7', fontSize: '1.25rem', whiteSpace: 'nowrap', wordBreak: 'keep-all' }}>{order.orderNumber}</span>
                        <div 
                          style={{ 
                            padding: '0 8px',
                            height: '24px', 
                            borderRadius: '6px', 
                            backgroundColor: '#0d9488', 
                            color: '#ffffff', 
                            fontWeight: 'bold', 
                            fontSize: '0.7rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(13,148,136,0.15)',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}
                          title="عدد الأصناف"
                        >
                          {getBandsText(order.items ? order.items.length : 0)}
                        </div>
                      </div>
                      {(() => {
                        const notes = order.orderNotes || order.notes || '';
                        const linkedMatch = notes.match(/ORD-\d+/);
                        if (linkedMatch) {
                          return (
                            <span style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '6px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#fef2f2', padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                              {linkedMatch[0]} 📌
                            </span>
                          );
                        }
                        return null;
                      })()}
                      {(() => {
                        const stageCounts = getProductionStageCounts(order);
                        return <span style={{ marginTop: '6px', color: '#64748b', fontSize: '0.72rem', fontWeight: 900 }}>
                          خياطة {stageCounts.sewing} | تغليف {stageCounts.packaging}
                        </span>;
                      })()}
                    </div>
                     
                    {(() => {
                      const displayStatus = productionSection === 'packaging'
                        ? getPackagingOrderStatus(order)
                        : productionSection === 'sewing' && (order.sewingStatus === 'منتهي' || isSewingOrderComplete(order))
                          ? 'منتهي'
                        : canonicalizeProductionStatus(order.status) === 'إنتاج مختلط'
                          ? 'مرحلة الخياطة'
                          : (order.status || 'مرحلة الخياطة');
                      const styles = getStatusStyles(displayStatus);
                      return <div style={{ minHeight: '34px', padding: '7px 12px', borderRadius: '18px', background: styles.bg, color: styles.text, fontSize: '0.76rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                        {productionSection === 'packaging' ? <Package size={15} /> : <SewingMachineIcon size={15} />}
                        <span>{getProductionStatusLabel(displayStatus)}</span>
                      </div>;
                    })()}
                  </div>
                  
                  {/* Card Details Grid */}
                  <div 
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr',
                      gap: '10px',
                      direction: 'rtl',
                      marginTop: '4px'
                    }}
                  >
                    {/* Item 1: العميل */}
                    <div 
                      style={{ 
                        backgroundColor: '#f8fafc', 
                        borderRadius: '12px', 
                        padding: '10px 12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        direction: 'rtl',
                        borderLeft: '3px solid #22c55e',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        minWidth: 0
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'right', minWidth: 0, flex: 1 }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '2px' }}>العميل</span>
                        <span style={{ color: '#1e293b', fontSize: '0.85rem', fontWeight: '800', width: '100%' }} className="truncate">{order.customerName}</span>
                      </div>
                      <div 
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          backgroundColor: '#f0fdf4', 
                          color: '#22c55e', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          marginLeft: '8px',
                          flexShrink: 0
                        }}
                      >
                        <User size={16} />
                      </div>
                    </div>

                    {/* Item 2: تاريخ التسليم */}
                    <div 
                      style={{ 
                        backgroundColor: '#f8fafc', 
                        borderRadius: '12px', 
                        padding: '10px 12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        direction: 'rtl',
                        borderLeft: '3px solid #3b82f6',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        minWidth: 0
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'right', minWidth: 0, flex: 1 }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '2px' }}>تاريخ التسليم</span>
                        <span style={{ color: '#1e293b', fontSize: '0.85rem', fontWeight: '800', width: '100%' }} className="truncate">{order.deliveryDate || '---'}</span>
                      </div>
                      <div 
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          backgroundColor: '#eff6ff', 
                          color: '#3b82f6', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          marginLeft: '8px',
                          flexShrink: 0
                        }}
                      >
                        <Calendar size={16} />
                      </div>
                    </div>

                  </div>
                  
                  {/* Card Actions Footer */}
                  <div 
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '12px',
                      marginTop: '8px',
                      width: '100%',
                      direction: 'rtl'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', width: '100%' }}>
                      {/* Button 1: معاينة */}
                      <button 
                        onClick={() => handleOpenPreview(order)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          borderRadius: '12px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#f8fafc',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 'bold',
                          color: '#475569',
                          flex: 1
                        }}
                      >
                        <Eye size={15} className="text-slate-500" />
                        <span>معاينة</span>
                      </button>

                      {/* Button 2: تعديل */}
                      {isProductionEditable && (
                        <button 
                          onClick={() => isMobile ? handleOpenModal(order) : handleOpenOperations(order)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            borderRadius: '12px',
                            border: '1px solid #bfdbfe',
                            backgroundColor: '#eff6ff',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            color: '#1d4ed8',
                            flex: 1
                          }}
                        >
                          <Edit2 size={15} className="text-blue-500" />
                          <span>تحديث</span>
                        </button>
                      )}

                      {/* Button 3: حذف */}
                      {(isAdmin(user) || canSafelyDeleteProduction(user)) && (
                        <button 
                          onClick={() => handleDelete(order.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            borderRadius: '12px',
                            border: '1px solid #fca5a5',
                            backgroundColor: '#fef2f2',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            color: '#ef4444',
                            flex: 1
                          }}
                        >
                          <Trash2 size={15} className="text-red-500" />
                          <span>حذف</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="glass-panel text-center py-10 text-muted">لا يوجد طلبيات حالياً</div>
            )}
          </div>
        ) : (
          <div className="table-container glass-panel">
            <table>
              <thead>
                <tr>
                  <th className="text-center cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('orderNumber')}>
                    <div className="flex items-center justify-center gap-1">رقم الإنتاج {renderSortIcon('orderNumber')}</div>
                  </th>
                  <th className="text-right pr-6 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('customerName')}>
                    <div className="flex items-center justify-start gap-1">العميل {renderSortIcon('customerName')}</div>
                  </th>
                  <th className="text-center">أنشئت بواسطة</th>
                  <th className="text-center">آخر إجراء</th>
                  <th className="text-center cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('deliveryDate')}>
                    <div className="flex items-center justify-center gap-1">تاريخ التسليم {renderSortIcon('deliveryDate')}</div>
                  </th>
                  <th className="text-center cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('status')}>
                    <div className="flex items-center justify-center gap-1">الحالة {renderSortIcon('status')}</div>
                  </th>
                  <th className="text-center" style={{ textAlign: 'center' }}>{productionSection === 'all' ? 'نقل جميع الأصناف' : 'حركة الأصناف'}</th>
                  <th className="text-center" style={{ textAlign: 'center' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length > 0 ? (
                    filteredOrders.map(order => (
                      <tr key={order.id}>
                        <td data-label="رقم الإنتاج" className="font-bold text-primary text-center">
                          <div>{order.orderNumber}</div>
                          {(() => {
                            const counts = getProductionStageCounts(order);
                            return (
                              <div style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                {(counts.sewing > 0 || counts.packaging > 0) && <span style={{ color: '#64748b', fontSize: '10px', fontWeight: 800 }}>خياطة {counts.sewing} | تغليف {counts.packaging}</span>}
                              </div>
                            );
                          })()}
                          {(() => {
                            const notes = order.orderNotes || order.notes || '';
                            const linkedMatch = notes.match(/ORD-\d+/);
                            if (linkedMatch) {
                              return (
                                <div style={{ fontSize: '13px', color: '#dc2626', fontWeight: 'bold', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                  📌 {linkedMatch[0]}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </td>
                        <td data-label="العميل" className="text-right pr-6 font-bold">{order.customerName}</td>
                        <td data-label="أنشئت بواسطة" className="text-xs text-center">{order.createdBy || '---'}</td>
                        <td data-label="آخر إجراء" className="text-xs font-semibold text-center">{order.lastActionBy || '---'}</td>
                        <td data-label="تاريخ التسليم" className="text-center">{order.deliveryDate || '---'}</td>
                        <td data-label="الحالة" className="text-center">
                          {(() => {
                            const displayStatus = productionSection === 'packaging' ? getPackagingOrderStatus(order) : (order.status || 'تحت الإنتاج');
                            return <span className={`badge ${getStatusBadgeClass(displayStatus === 'قيد التغليف' ? 'مرحلة التغليف' : displayStatus)}`} style={{ width: '150px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayStatus}</span>;
                          })()}
                        </td>
                        <td data-label="تغيير الحالة" style={{ textAlign: 'center' }}>
                          {productionSection === 'all' ? (
                            <select
                              className="input-field"
                              disabled={!isProductionEditable}
                              style={{ padding: '0 0.5rem', width: '130px', height: '36px', fontSize: '13px', borderRadius: '8px', marginBottom: 0, border: '1px solid var(--primary-light)', backgroundColor: !isProductionEditable ? '#f1f5f9' : '#f8fafc', cursor: !isProductionEditable ? 'not-allowed' : 'pointer', margin: '0 auto' }}
                              value={order.status}
                              onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                            >
                              {globalSettings.productionStatuses.map(s => <option key={s} value={s} disabled={s === 'إنتاج مختلط'}>{getProductionStatusLabel(s)}</option>)}
                            </select>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 800 }}>افتح الكرت لنقل كل صنف</span>
                          )}
                        </td>
                        <td data-label="إجراءات" style={{ textAlign: 'center' }}>
                          <div className="flex flex-wrap gap-2 justify-center items-center">
                            <button className="btn-premium-view" title="معاينة" onClick={() => handleOpenPreview(order)}>
                              <Eye size={16} />
                            </button>
                            <button type="button" className="btn-premium-view" title="طباعة / تصدير PDF" aria-label={`طباعة الأمر ${order.orderNumber}`} style={{ color: 'var(--primary)' }} onClick={() => handlePrintOrder(order)}>
                              <Printer size={16} />
                            </button>
                            <button className="btn-premium-copy" title="نسخ الكرت كمسودة جديدة" onClick={() => handleCopyOrder(order)}>
                              <Copy size={16} />
                            </button>
                            {isProductionEditable && (
                              <button className="btn-premium-edit" title="إدارة أصناف الكرت" onClick={() => isMobile ? handleOpenModal(order) : handleOpenOperations(order)}>
                                <Edit2 size={16} />
                              </button>
                            )}
                            {(isAdmin(user) || canSafelyDeleteProduction(user)) && (
                              <button 
                                className="btn-premium-delete"
                                title="حذف آمن للكرت مع الأرشفة وعكس الآثار"
                                onClick={() => handleDelete(order.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-10 text-muted">لا يوجد طلبيات حالياً</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

        </div>
      {showOperationsModal && selectedOrder && (
        <div className="modal-overlay no-print production-operations-overlay" style={{ zIndex: 10600 }}>
          <div className="production-operations-modal">
            <div className="production-operations-modal__head">
              <div><Layers size={20}/><div><strong>إدارة أصناف كرت الإنتاج</strong><span>{selectedOrder.orderNumber} · {selectedOrder.customerName}</span></div></div>
              <button type="button" onClick={() => setShowOperationsModal(false)} aria-label="إغلاق"><X size={19}/></button>
            </div>
            <ProductionLineBoard
              detailsOnly
              section={productionSection}
              orders={[selectedOrder]}
              selectedOrder={selectedOrder}
              onSelectOrder={setSelectedOrder}
              onOpenPreview={handleOpenPreview}
              onSend={handleSendQuantityToPackaging}
              onSendAll={handleSendAllToPackaging}
              onAdvance={handleAdvanceProductionItem}
              onReceive={handleReceivePackagingQuantity}
              onFinish={handleFinishPackagingQuantity}
              onReturn={handleReturnQuantityToSewing}
              editable={isProductionEditable}
            />
          </div>
        </div>
      )}

      {/* Order Modal */}
      {showModal && (
        <div className="modal-overlay no-print" style={{ zIndex: 10500 }}>
        <div 
          className="modal-content wide animate-fade-in production-items-modal"
          style={isMobile ? {
            width: '100vw',
            height: '100vh',
            maxWidth: '100%',
            maxHeight: '100%',
            margin: 0,
            borderRadius: 0,
            padding: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#ffffff'
          } : {
            width: '90%',
            width: '97%',
            maxWidth: '1700px',
            maxHeight: '92vh',
            overflowY: 'auto'
          }}
        >
            <div className={`flex justify-between items-center ${!editingOrder ? 'mb-4' : 'mb-0'} border-b`} style={isMobile ? { padding: '12px 8px 8px 8px', backgroundColor: '#ffffff', zIndex: 10 } : { paddingBottom: '8px' }}>
              <div className="flex items-center" style={{ minWidth: 0 }}>
                <Layers size={isMobile ? 16 : 20} className="text-primary" style={{ flexShrink: 0, marginLeft: isMobile ? '8px' : '10px' }} />
                <h3 className="font-bold truncate" style={{ fontSize: isMobile ? '0.9rem' : '1.25rem', margin: 0, color: '#0f172a' }}>
                  {editingOrder ? `إدارة مراحل أصناف طلبية ${editingOrder.orderNumber}` : 'إنشاء طلبية إنتاج جديدة'}
                </h3>
              </div>
              <div className="flex items-center gap-1.5" style={{ flexShrink: 0 }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: isMobile ? '34px' : '38px',
                    height: isMobile ? '34px' : '38px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    backgroundColor: '#ffffff',
                    padding: 0
                  }}
                >
                  <X size={isMobile ? 14 : 18} className="text-slate-600" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} style={isMobile ? { flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 16px 120px 16px', display: 'flex', flexDirection: 'column' } : {}}>
              {!editingOrder && (
                <div 
                  style={isMobile ? {
                  backgroundColor: '#f8fafc',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '16px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  direction: 'rtl'
                } : {
                  backgroundColor: '#f8fafc',
                  padding: '20px',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '24px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(12, 1fr)',
                  gap: '16px',
                  direction: 'rtl'
                }}
              >
                {/* رقم الإنتاج */}
                <div style={{ gridColumn: isMobile ? 'span 1' : 'span 4', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#475569', textAlign: 'right' }}>رقم الإنتاج</label>
                  <input 
                    type="text" 
                    className="input-field bg-slate-100 font-bold text-primary text-center" 
                    style={{ height: '36px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: 0 }} 
                    value={formData.orderNumber || ''} 
                    readOnly 
                    disabled 
                  />
                </div>
                
                {/* تاريخ الطلب */}
                <div style={{ gridColumn: isMobile ? 'span 1' : 'span 4', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#475569', textAlign: 'right' }}>تاريخ الطلب</label>
                  <Flatpickr 
                    disabled={isEditLocked} 
                    className="input-field text-center" 
                    style={{ height: '36px', borderRadius: '8px', fontSize: '0.85rem', backgroundColor: isEditLocked ? '#f1f5f9' : 'white', marginBottom: 0 }} 
                    value={formData.orderDate || ''} 
                    onChange={([d]) => setFormData({...formData, orderDate: getLocalDateStr(d)})} 
                    options={{ dateFormat: 'Y-m-d', disableMobile: true }} 
                  />
                </div>

                {/* تاريخ التسليم المتوقع */}
                <div style={{ gridColumn: isMobile ? 'span 1' : 'span 4', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#475569', textAlign: 'right' }}>تاريخ التسليم المتوقع</label>
                  <Flatpickr 
                    disabled={isEditLocked} 
                    className="input-field text-center" 
                    style={{ height: '36px', borderRadius: '8px', fontSize: '0.85rem', backgroundColor: isEditLocked ? '#f1f5f9' : 'white', marginBottom: 0 }} 
                    value={formData.deliveryDate || ''} 
                    onChange={([d]) => setFormData({...formData, deliveryDate: getLocalDateStr(d)})} 
                    options={{ dateFormat: 'Y-m-d', disableMobile: true }} 
                    placeholder="اختر تاريخ" 
                  />
                </div>

                {/* العميل */}
                <div style={{ gridColumn: isMobile ? 'span 2' : 'span 12', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: isMobile ? '0' : '8px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#475569', textAlign: 'right' }}>العميل</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Select 
                        isDisabled={isEditLocked}
                        options={customers.map(c => ({ value: c.id, label: c.name }))}
                        value={formData.customerId ? { value: formData.customerId, label: formData.customerName || customers.find(c => c.id === formData.customerId)?.name || 'غير معروف' } : null}
                        onChange={(selected) => handleCustomerChange({ target: { value: selected ? selected.value : '' } })}
                        placeholder="اختر عميل..."
                        isClearable
                        isSearchable
                        menuPortalTarget={document.body}
                        styles={{
                          control: (base) => ({
                            ...base,
                            borderColor: '#e2e8f0',
                            borderRadius: '8px',
                            minHeight: '36px',
                            height: '36px',
                            fontSize: '0.85rem',
                            backgroundColor: isEditLocked ? '#f1f5f9' : 'white',
                            boxShadow: 'none',
                          }),
                          valueContainer: (base) => ({
                            ...base,
                            height: '36px',
                            padding: '0 8px',
                            textAlign: 'right'
                          }),
                          indicatorsContainer: (base) => ({
                            ...base,
                            height: '36px',
                          }),
                          menuPortal: base => ({ ...base, zIndex: 10505 })
                        }}
                      />
                    </div>
                    {!isEditLocked && (
                      <button 
                        type="button" 
                        className="btn btn-primary flex items-center justify-center gap-1 shadow-sm transition-all text-xs" 
                        onClick={handleAddNewCustomer} 
                        style={{ whiteSpace: 'nowrap', height: '36px', padding: '0 12px', borderRadius: '8px' }}
                      >
                        <UserPlus size={14} /> عميل جديد
                      </button>
                    )}
                  </div>
                </div>
              </div>
              )}

              <div className={!editingOrder ? "border-t pt-4" : ""} style={isMobile && editingOrder ? { marginTop: '8px' } : {}}>
                  {!isEditLocked && (
                    <div className="flex items-center gap-2 mb-4" style={{ direction: 'rtl', padding: isMobile ? '0 4px' : '0' }}>
                      <button type="button" className="btn btn-primary btn-sm flex items-center gap-1" onClick={handleAddItem} style={{ height: '34px', borderRadius: '8px', fontSize: '0.85rem', padding: '0 12px', fontWeight: 'bold' }}>
                        <Plus size={14} /> سطر جديد
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm flex items-center gap-1 shadow-sm" style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', height: '34px', borderRadius: '8px', fontSize: '0.85rem', padding: '0 12px', fontWeight: 'bold' }} onClick={() => setShowMultiColorModal(true)}>
                        <Layers size={14} className="text-primary" /> ألوان متعددة
                      </button>
                      {hasPermission(user, 'stock_quick_add', 'add') && (
                        <button type="button" className="btn flex items-center gap-1 shadow-sm" onClick={handleOpenAddStockItemModal} style={{ backgroundColor: '#1a8d9b', color: '#ffffff', border: 'none', height: '34px', borderRadius: '8px', fontSize: '0.85rem', padding: '0 12px', fontWeight: 'bold' }}>
                          <Package size={14} />
                          <span>إضافة صنف للمخزون</span>
                        </button>
                      )}
                    </div>
                  )}
                  {isMobile ? (
                    <div className="flex flex-col gap-3" style={{ padding: '0 4px 4px 4px' }}>
                      {visibleFormItemEntries.length === 0 && (
                        <div style={{ padding: '24px 14px', border: '1px dashed #cbd5e1', borderRadius: '12px', background: '#f8fafc', color: '#64748b', textAlign: 'center', fontWeight: 800 }}>
                          لا توجد أصناف محوّلة من قسم الخياطة حاليًا.
                        </div>
                      )}
                      {visibleFormItemEntries.map(({ item, index }) => (
                        <div key={index} style={{ backgroundColor: '#ffffff', borderRadius: '13px', border: '2px solid #94a3b8', padding: '13px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', direction: 'rtl', boxShadow: '0 4px 10px rgba(51,65,85,.10)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                <div style={{ backgroundColor: '#148995', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', minWidth: '32px', minHeight: '32px', borderRadius: '8px', color: '#ffffff', fontWeight: 'bold', fontSize: '0.95rem', boxShadow: '0 2px 4px rgba(20, 137, 149, 0.3)' }}>
                                  {String(index + 1).padStart(2, '0')}
                                </div>
                                <select 
                                  className="input-field mb-0 text-center font-bold" 
                                  style={{ 
                                    flex: 1,
                                    margin: 0,
                                    textAlign: 'center',
                                    textAlignLast: 'center',
                                    height: '38px', 
                                    borderRadius: '0.5rem', 
                                    border: '1px solid #e2e8f0', 
                                    backgroundColor: getStatusStyles(item.status || "لم يتم التنفيذ").bg,
                                    color: getStatusStyles(item.status || "لم يتم التنفيذ").text,
                                    appearance: 'none',
                                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(getStatusStyles(item.status || "لم يتم التنفيذ").text)}' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'left 12px center',
                                    backgroundSize: '14px',
                                    paddingLeft: '28px',
                                    paddingRight: '12px',
                                    fontSize: '0.75rem'
                                  }} 
                                  value={productionSection === 'packaging' ? canonicalizeProductionStatus(item.status || "لم يتم التنفيذ") : getMobileSewingItemSelectValue(item, editingOrder?.status)}
                                  disabled={productionSection === 'packaging'}
                                  onChange={(e) => handleSectionItemStatusChange(index, e.target.value)}
                                >
                                  {(productionSection === 'packaging'
                                    ? [canonicalizeProductionStatus(item.status || 'لم يتم التنفيذ')]
                                    : SEWING_ITEM_STATUS_OPTIONS.filter(status => status !== 'تم التحويل إلى قسم التغليف')
                                  ).map(s => <option key={s} value={s} className="bg-white text-slate-800 font-normal">{getProductionStatusLabel(s)}</option>)}
                                </select>
                              </div>
                              {!isEditLocked && formData.items.length > 1 && (
                                <button 
                                  type="button" 
                                  className="icon-btn text-red-500 hover:bg-red-50" 
                                  onClick={() => handleRemoveItem(index)}
                                  style={{ padding: '6px', cursor: 'pointer', background: 'none', border: 'none', borderRadius: '8px' }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>

                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px', textAlign: 'right' }}>الصنف</label>
                              <Select
                                isDisabled={!isAdmin(user) || isLinkedOrder}
                                options={stockItems
                                  .filter(s => !isExcludedCategory(s.category))
                                  .map(s => ({ 
                                    value: s.name, 
                                    label: s.name,
                                    quantity: s.quantity ?? 0,
                                    unit: s.unit || '',
                                    warehouse: s.warehouse || '---'
                                  }))}
                                value={item.productName ? { value: item.productName, label: item.productName } : null}
                                onChange={(selected) => handleItemChange(index, 'productName', selected ? selected.value : '')}
                                placeholder="اختر صنفاً..."
                                isClearable
                                menuPortalTarget={document.body}
                                formatOptionLabel={(option, { context }) => {
                                  if (context === 'value') {
                                    return option.label;
                                  }
                                  return (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '10px' }}>
                                      <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{option.label}</span>
                                      <span style={{ fontSize: '11px', color: '#047857', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '12px', whiteSpace: 'nowrap' }}>
                                        المتوفر: {option.quantity ?? 0} {option.unit || ''} | {option.warehouse || '---'}
                                      </span>
                                    </div>
                                  );
                                }}
                                styles={{ 
                                  menuPortal: base => ({ ...base, zIndex: 10505 }), 
                                  control: base => ({ ...base, minHeight: '38px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', backgroundColor: (!isAdmin(user) || isLinkedOrder) ? '#f1f5f9' : 'white' }),
                                  singleValue: base => ({ ...base, fontSize: '0.75rem', fontWeight: 'bold' }),
                                  input: base => ({ ...base, fontSize: '0.75rem' }),
                                  placeholder: base => ({ ...base, fontSize: '0.75rem' }),
                                  option: base => ({ ...base, fontSize: '0.85rem' })
                                }}
                              />
                            </div>

                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px', textAlign: 'right' }}>اللون</label>
                              <Select
                                isDisabled={!isAdmin(user) || isLinkedOrder}
                                options={(globalSettings.stockColors || []).map(c => ({ value: c, label: c }))}
                                value={item.colorModel ? { value: item.colorModel, label: item.colorModel } : null}
                                onChange={(selected) => handleItemChange(index, 'colorModel', selected ? selected.value : '')}
                                placeholder="اللون..."
                                isClearable
                                menuPortalTarget={document.body}
                                styles={{ 
                                  menuPortal: base => ({ ...base, zIndex: 10505 }), 
                                  control: base => ({ ...base, minHeight: '38px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', backgroundColor: (!isAdmin(user) || isLinkedOrder) ? '#f1f5f9' : 'white' }),
                                  singleValue: base => ({ ...base, fontSize: '0.8rem', fontWeight: 'bold' }),
                                  input: base => ({ ...base, fontSize: '0.8rem' }),
                                  placeholder: base => ({ ...base, fontSize: '0.8rem' }),
                                  option: base => ({ ...base, fontSize: '0.85rem' })
                                }}
                              />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr 1fr', gap: '8px' }}>
                              <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px', textAlign: 'center' }}>الكمية</label>
                                <input 
                                  type="text" 
                                  className="input-field mb-0 text-center font-bold" 
                                  style={{ height: '38px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', width: '100%', backgroundColor: (!isAdmin(user) || isLinkedOrder) ? '#f1f5f9' : 'white', fontSize: '0.8rem' }}
                                  value={item.quantity} 
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || /^\d{1,4}$/.test(val)) {
                                      handleItemChange(index, 'quantity', val);
                                    }
                                  }} 
                                  disabled={!isAdmin(user) || isLinkedOrder} 
                                  placeholder="0"
                                  required 
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px', textAlign: 'center' }}>المقاس</label>
                                <input 
                                  type="text" 
                                  className="input-field mb-0 text-center font-bold" 
                                  style={{ height: '38px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', width: '100%', backgroundColor: (!isAdmin(user) || isLinkedOrder) ? '#f1f5f9' : 'white', fontSize: '0.8rem' }}
                                  value={item.sizeCm} 
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || /^\d{1,3}\s*([\*xX]\s*\d{0,3})?$/.test(val)) {
                                      handleItemChange(index, 'sizeCm', val);
                                    }
                                  }} 
                                  disabled={!isAdmin(user) || isLinkedOrder} 
                                  placeholder="مثال: 200x200" 
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px', textAlign: 'center' }}>السماكة</label>
                                <input 
                                  type="text" 
                                  className="input-field mb-0 text-center font-bold" 
                                  style={{ height: '38px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', width: '100%', backgroundColor: (!isAdmin(user) || isLinkedOrder) ? '#f1f5f9' : 'white', fontSize: '0.8rem' }}
                                  value={item.thickness} 
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || /^\d{1,2}$/.test(val)) {
                                      handleItemChange(index, 'thickness', val);
                                    }
                                  }} 
                                  disabled={!isAdmin(user) || isLinkedOrder} 
                                  placeholder="سم"
                                />
                              </div>
                            </div>

                            {editingOrder && (() => {
                              const quantities = getItemStageQuantities(item, editingOrder.status);
                              const delivered = quantities.pendingPackaging + quantities.packaging + quantities.finished;
                              const deliveryLabel = delivered <= 0 ? 'لم يُسلّم' : delivered >= quantities.total ? 'تسليم كامل' : 'تسليم جزئي';
                              const percent = quantities.total > 0 ? Math.min(100, Math.round((delivered / quantities.total) * 100)) : 0;
                              return <div style={{ padding: '8px 10px', borderRadius: '9px', border: '1px solid #dbe7ef', background: '#f8fafc' }}>
                                <div style={{ marginBottom: '6px', color: delivered > 0 ? '#1d4f91' : '#64748b', fontSize: '0.72rem', fontWeight: 900, textAlign: 'center' }}>تم تسليم {delivered} من {quantities.total} للتغليف · {deliveryLabel}</div>
                                <div style={{ height: '5px', overflow: 'hidden', borderRadius: '999px', background: '#dfe7ef' }}>
                                  <div style={{ width: `${percent}%`, height: '100%', borderRadius: '999px', background: '#2878d0', transition: 'width .2s ease' }} />
                                </div>
                              </div>;
                            })()}

                            {editingOrder && productionSection === 'packaging' && (() => {
                              const quantities = getItemStageQuantities(item, editingOrder.status);
                              const delivered = quantities.pendingPackaging + quantities.packaging + quantities.finished;
                              const percent = delivered > 0 ? Math.min(100, Math.round((quantities.finished / delivered) * 100)) : 0;
                              return <div style={{ padding: '8px 10px', borderRadius: '9px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                <div style={{ marginBottom: '6px', color: '#52677d', fontSize: '0.72rem', fontWeight: 900, textAlign: 'center' }}>تم تغليف {quantities.finished} من {delivered}</div>
                                <div style={{ height: '5px', overflow: 'hidden', borderRadius: '999px', background: '#dfe7ef' }}>
                                  <div style={{ width: `${percent}%`, height: '100%', borderRadius: '999px', background: '#148995', transition: 'width .2s ease' }} />
                                </div>
                              </div>;
                            })()}

                            {editingOrder && (() => {
                              const quantities = getItemStageQuantities(item, editingOrder.status);
                              const orderSnapshot = { ...editingOrder, items: formData.items };

                              if (productionSection === 'packaging') {
                                return <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                  {quantities.pendingPackaging > 0 && <button type="button" onClick={() => handleReceivePackagingQuantity(orderSnapshot, index)} style={{ minHeight: '42px', width: '100%', border: '1px solid #fdba74', borderRadius: '10px', background: '#fff7ed', color: '#c2410c', fontWeight: 900, cursor: 'pointer', boxShadow: '0 2px 6px rgba(194,65,12,.10)' }}>استلام ({quantities.pendingPackaging})</button>}
                                  {quantities.packaging > 0 && <button type="button" onClick={() => handleFinishPackagingQuantity(orderSnapshot, index)} style={{ minHeight: '42px', width: '100%', border: '1px solid #86efac', borderRadius: '10px', background: '#ecfdf5', color: '#047857', fontWeight: 900, cursor: 'pointer', boxShadow: '0 2px 6px rgba(4,120,87,.10)' }}>إنهاء التغليف ({quantities.packaging})</button>}
                                  {(quantities.pendingPackaging + quantities.packaging + quantities.finished) > 0 && <button type="button" onClick={() => handleReturnQuantityToSewing(orderSnapshot, index)} style={{ minHeight: '42px', width: '100%', border: '1px solid #fca5a5', borderRadius: '10px', background: '#fff', color: '#dc2626', fontWeight: 900, cursor: 'pointer' }}>إرجاع إلى قسم الخياطة</button>}
                                </div>;
                              }

                              if (productionSection === 'sewing' && quantities.sewing > 0) {
                                return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                                  <button type="button" onClick={() => handleSendAllToPackaging(orderSnapshot, index)} style={{ minHeight: '40px', border: '1px solid #148995', borderRadius: '9px', background: '#148995', color: '#fff', fontWeight: 900, cursor: 'pointer', boxShadow: '0 3px 8px rgba(20,137,149,.2)' }}>تسليم كامل ({quantities.sewing})</button>
                                  <button type="button" onClick={() => handleSendQuantityToPackaging(orderSnapshot, index)} style={{ minHeight: '40px', border: '1px solid #5bb7bf', borderRadius: '9px', background: '#eefafb', color: '#0f7781', fontWeight: 900, cursor: 'pointer' }}>تسليم جزئي</button>
                                </div>;
                              }

                              return null;
                            })()}

                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px', textAlign: 'right' }}>نوع التغليف</label>
                              <Select
                                isDisabled={!isAdmin(user) || isLinkedOrder}
                                options={stockItems
                                  .filter(s => {
                                    const cat = String(s.category || '').replace(/أ|إ|آ/g, 'ا').replace(/ى/g, 'ي').trim().toLowerCase();
                                    return cat === 'التغليف' || cat === 'تغليف';
                                  })
                                  .map(s => ({ 
                                    value: s.name, 
                                    label: s.name,
                                    quantity: s.quantity ?? 0,
                                    unit: s.unit || '',
                                    warehouse: s.warehouse || '---'
                                  }))}
                                value={item.packagingType ? { value: item.packagingType, label: item.packagingType } : null}
                                onChange={(selected) => handleItemChange(index, 'packagingType', selected ? selected.value : '')}
                                placeholder="اختر نوع التغليف..."
                                isClearable
                                menuPortalTarget={document.body}
                                formatOptionLabel={(option, { context }) => {
                                  if (context === 'value') {
                                    return option.label;
                                  }
                                  return (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '10px' }}>
                                      <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{option.label}</span>
                                      <span style={{ fontSize: '11px', color: '#047857', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '12px', whiteSpace: 'nowrap' }}>
                                        المتوفر: {option.quantity ?? 0} {option.unit || ''} | {option.warehouse || '---'}
                                      </span>
                                    </div>
                                  );
                                }}
                                styles={{ 
                                  menuPortal: base => ({ ...base, zIndex: 10505 }), 
                                  control: base => ({ ...base, minHeight: '38px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', backgroundColor: (!isAdmin(user) || isLinkedOrder) ? '#f1f5f9' : 'white' }),
                                  singleValue: base => ({ ...base, fontSize: '0.8rem', fontWeight: 'bold' }),
                                  input: base => ({ ...base, fontSize: '0.8rem' }),
                                  placeholder: base => ({ ...base, fontSize: '0.8rem' }),
                                  option: base => ({ ...base, fontSize: '0.85rem' })
                                }}
                              />
                            </div>

                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px', textAlign: 'right' }}>ملاحظات الصنف</label>
                              <input 
                                type="text" 
                                className="input-field mb-0" 
                                style={{ height: '38px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', width: '100%', backgroundColor: (!isAdmin(user) || isLinkedOrder) ? '#f1f5f9' : 'white', fontSize: '0.8rem' }}
                                value={item.notes || item.productionNotes || ''} 
                                onChange={(e) => handleItemChange(index, 'notes', e.target.value)} 
                                disabled={!isAdmin(user) || isLinkedOrder}
                                placeholder="أية تفاصيل إضافية..."
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="modal-table-container glass-panel" style={{ maxHeight: '62vh', overflow: 'auto' }}>
                      <table className="modal-table" style={{ minWidth: '1450px', fontSize: '13px' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc' }}>
                        <tr>
                          <th style={{ width: '90px', minWidth: '90px', textAlign: 'center' }}>#</th>
                          <th style={{ width: '320px', minWidth: '320px', textAlign: 'center' }}>الصنف</th>
                          <th style={{ width: '220px', minWidth: '220px', textAlign: 'center' }}>اللون</th>
                          <th style={{ width: '180px', minWidth: '180px', textAlign: 'center' }}>توزيع الكمية</th>
                          <th style={{ width: '120px', minWidth: '120px', textAlign: 'center' }}>المقاس</th>
                          <th style={{ width: '90px', minWidth: '90px', textAlign: 'center' }}>السماكة</th>
                          <th style={{ width: '220px', minWidth: '220px', textAlign: 'center' }}>نوع التغليف</th>
                          <th style={{ width: '250px', minWidth: '250px', textAlign: 'center' }}>ملاحظات</th>
                          <th style={{ width: '150px', minWidth: '150px', textAlign: 'center' }}>الحالة</th>
                          <th style={{ width: '180px', minWidth: '180px', textAlign: 'center' }}>{productionSection === 'packaging' ? 'إجراء التغليف' : 'إجراء'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleFormItemEntries.length === 0 && (
                          <tr><td colSpan="10" style={{ padding: '28px', textAlign: 'center', color: '#64748b', fontWeight: 800 }}>لا توجد أصناف في هذا القسم حاليًا.</td></tr>
                        )}
                        {visibleFormItemEntries.map(({ item, index }) => (
                          <tr
                            key={index}
                            className={`drag-sort-row ${draggedItemIndex === index ? 'dragging' : ''}`}
                            style={productionSection === 'packaging' && editingOrder && (() => { const q = getItemStageQuantities(item, editingOrder.status); return q.pendingPackaging <= 0 && q.packaging <= 0; })() ? { opacity: 0.55, background: '#f8fafc' } : undefined}
                            onDragOver={handleItemDragOver}
                            onDrop={(e) => handleItemDrop(e, index)}
                            onDragEnd={() => setDraggedItemIndex(null)}
                          >
                            <td style={{ width: '90px', minWidth: '90px' }}>
                              {!isEditLocked ? (
                                <div className="flex justify-center items-center gap-1">
                                  <span
                                    className="drag-sort-handle"
                                    draggable
                                    title="اسحب لتغيير الترتيب"
                                    onDragStart={(e) => handleItemDragStart(e, index)}
                                  >
                                    <GripVertical size={16} />
                                  </span>
                                  <button type="button" className="icon-btn" title="رفع الصنف" onClick={() => handleMoveItem(index, -1)} disabled={index === 0}>
                                    <ArrowUp size={15} />
                                  </button>
                                  <button type="button" className="icon-btn" title="تنزيل الصنف" onClick={() => handleMoveItem(index, 1)} disabled={index === formData.items.length - 1}>
                                    <ArrowDown size={15} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex justify-center items-center font-bold text-slate-400">{index + 1}</div>
                              )}
                            </td>
                            <td style={{ width: '320px', minWidth: '320px' }}>
                              <Select
                                isDisabled={isEditLocked}
                                options={stockItems
                                  .filter(s => !isExcludedCategory(s.category))
                                  .map(s => ({ 
                                    value: s.name, 
                                    label: s.name,
                                    quantity: s.quantity ?? 0,
                                    unit: s.unit || '',
                                    warehouse: s.warehouse || '---'
                                  }))}
                                value={item.productName ? { value: item.productName, label: item.productName } : null}
                                onChange={(selected) => handleItemChange(index, 'productName', selected ? selected.value : '')}
                                placeholder="اختر صنفاً..."
                                isClearable
                                menuPortalTarget={document.body}
                                formatOptionLabel={(option, { context }) => {
                                  if (context === 'value') {
                                    return option.label;
                                  }
                                  return (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '10px' }}>
                                      <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{option.label}</span>
                                      <span style={{ fontSize: '11px', color: '#047857', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '12px', whiteSpace: 'nowrap' }}>
                                        المتوفر: {option.quantity ?? 0} {option.unit || ''} | {option.warehouse || '---'}
                                      </span>
                                    </div>
                                  );
                                }}
                                styles={{ menuPortal: base => ({ ...base, zIndex: 10505 }), control: base => ({ ...base, minHeight: '38px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', backgroundColor: isEditLocked ? '#f1f5f9' : 'white' }), menu: base => ({ ...base, width: '450px' }) }}
                              />
                            </td>
                            <td style={{ width: '220px', minWidth: '220px' }}>
                              <Select
                                isDisabled={isEditLocked}
                                options={(globalSettings.stockColors || []).map(c => ({ value: c, label: c }))}
                                value={item.colorModel ? { value: item.colorModel, label: item.colorModel } : null}
                                onChange={(selected) => handleItemChange(index, 'colorModel', selected ? selected.value : '')}
                                placeholder="اختر اللون..."
                                isClearable
                                menuPortalTarget={document.body}
                                styles={{ menuPortal: base => ({ ...base, zIndex: 10505 }), control: base => ({ ...base, minHeight: '38px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', backgroundColor: isEditLocked ? '#f1f5f9' : 'white' }) }}
                              />
                            </td>
                            <td className="text-center align-middle" style={{ width: '180px', minWidth: '180px' }}>
                              <input type="text" disabled={isEditLocked} className="input-field mb-0 text-center mx-auto" style={{ padding: '0.4rem', height: '38px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', width: '100%', backgroundColor: isEditLocked ? '#f1f5f9' : 'white' }} placeholder="0" value={item.quantity} onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d{1,4}$/.test(val)) {
                                  handleItemChange(index, 'quantity', val);
                                }
                              }} required />
                              {editingOrder && (() => {
                                const quantities = getItemStageQuantities(item, editingOrder.status);
                                return <div style={{ marginTop: '4px', fontSize: '9px', lineHeight: 1.5, color: '#475569', fontWeight: 800 }}>خياطة {quantities.sewing} | انتظار {quantities.pendingPackaging}<br/>تغليف {quantities.packaging} | منتهي {quantities.finished}</div>;
                              })()}
                            </td>
                            <td className="text-center align-middle" style={{ width: '120px', minWidth: '120px' }}>
                              <input type="text" disabled={isEditLocked} className="input-field mb-0 text-center mx-auto" style={{ padding: '0.4rem', height: '38px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', width: '100%', backgroundColor: isEditLocked ? '#f1f5f9' : 'white' }} placeholder="200*180" value={item.sizeCm} onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d{1,3}\s*([\*xX]\s*\d{0,3})?$/.test(val)) {
                                  handleItemChange(index, 'sizeCm', val);
                                }
                              }} />
                            </td>
                            <td className="text-center align-middle" style={{ width: '90px', minWidth: '90px' }}>
                              <input type="text" disabled={isEditLocked} className="input-field mb-0 text-center mx-auto" style={{ padding: '0.4rem', height: '38px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', width: '100%', backgroundColor: isEditLocked ? '#f1f5f9' : 'white' }} placeholder="سم" value={item.thickness} onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d{1,2}$/.test(val)) {
                                  handleItemChange(index, 'thickness', val);
                                }
                              }} />
                            </td>
                            <td style={{ width: '220px', minWidth: '220px' }}>
                               <Select
                                 isDisabled={isEditLocked}
                                 options={stockItems
                                   .filter(s => {
                                     const cat = String(s.category || '').replace(/أ|إ|آ/g, 'ا').replace(/ى/g, 'ي').trim().toLowerCase();
                                     return cat === 'التغليف' || cat === 'تغليف';
                                   })
                                   .map(s => ({ 
                                     value: s.name, 
                                     label: s.name,
                                     quantity: s.quantity ?? 0,
                                     unit: s.unit || '',
                                     warehouse: s.warehouse || '---'
                                   }))}
                                 value={item.packagingType ? { value: item.packagingType, label: item.packagingType } : null}
                                 onChange={(selected) => handleItemChange(index, 'packagingType', selected ? selected.value : '')}
                                 placeholder="نوع التغليف..."
                                 isClearable
                                 menuPortalTarget={document.body}
                                 formatOptionLabel={(option, { context }) => {
                                   if (context === 'value') {
                                     return option.label;
                                   }
                                   return (
                                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '10px' }}>
                                       <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{option.label}</span>
                                       <span style={{ fontSize: '11px', color: '#047857', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '12px', whiteSpace: 'nowrap' }}>
                                         المتوفر: {option.quantity ?? 0} {option.unit || ''} | {option.warehouse || '---'}
                                       </span>
                                     </div>
                                   );
                                 }}
                                 styles={{ menuPortal: base => ({ ...base, zIndex: 10505 }), control: base => ({ ...base, minHeight: '38px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', backgroundColor: isEditLocked ? '#f1f5f9' : 'white' }), menu: base => ({ ...base, width: '380px' }) }}
                               />
                             </td>
                            <td>
                              <input type="text" disabled={isEditLocked} className="input-field mb-0" style={{ padding: '0.4rem', height: '38px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', width: '100%', backgroundColor: isEditLocked ? '#f1f5f9' : 'white' }} placeholder="ملاحظات..." value={item.notes || item.productionNotes || ''} onChange={(e) => handleItemChange(index, 'notes', e.target.value)} />
                            </td>
                            <td>
                              <select disabled={productionSection === 'packaging'} className="input-field mb-0" style={{ padding: '0.4rem', fontSize: '0.8rem', height: '38px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: productionSection === 'packaging' ? '#f1f5f9' : '#fff' }} value={productionSection === 'packaging' ? canonicalizeProductionStatus(item.status || 'لم يتم التنفيذ') : getSewingItemSelectValue(item, editingOrder?.status)} onChange={(e) => handleSectionItemStatusChange(index, e.target.value)}>
                                {(productionSection === 'packaging'
                                  ? [canonicalizeProductionStatus(item.status || 'لم يتم التنفيذ')]
                                  : SEWING_ITEM_STATUS_OPTIONS
                                ).map(s => <option key={s} value={s}>{getProductionStatusLabel(s)}</option>)}
                              </select>
                            </td>
                            <td className="text-center">
                              {productionSection === 'packaging' && editingOrder ? (() => {
                                const quantities = getItemStageQuantities(item, editingOrder.status);
                                const orderSnapshot = { ...editingOrder, items: formData.items };
                                if (quantities.pendingPackaging <= 0 && quantities.packaging <= 0) {
                                  return <span style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 800 }}>بانتظار التحويل من الخياطة</span>;
                                }
                                return <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                  {quantities.pendingPackaging > 0 && <button type="button" onClick={() => handleReceivePackagingQuantity(orderSnapshot, index)} style={{ border: 0, borderRadius: '7px', padding: '6px', background: '#fff7ed', color: '#c2410c', fontWeight: 900, cursor: 'pointer', fontSize: '10px' }}>استلام ({quantities.pendingPackaging})</button>}
                                  {quantities.packaging > 0 && <button type="button" onClick={() => handleFinishPackagingQuantity(orderSnapshot, index)} style={{ border: 0, borderRadius: '7px', padding: '6px', background: '#ecfdf5', color: '#047857', fontWeight: 900, cursor: 'pointer', fontSize: '10px' }}>إنهاء ({quantities.packaging})</button>}
                                </div>;
                              })() : !isEditLocked && formData.items.length > 1 && (
                                <button type="button" className="text-danger hover:scale-110 transition-transform" onClick={() => handleRemoveItem(index)}>
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  )}
                </div>

                {!editingOrder && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                    <div className="input-group">
                      <label className="font-bold mb-2 block">حالة الطلبية العامة</label>
                       <select 
                         className="input-field" 
                         disabled={!isProductionEditable}
                         style={{ backgroundColor: !isProductionEditable ? '#f1f5f9' : 'white' }}
                         value={formData.status} 
                         onChange={(e) => setFormData({...formData, status: e.target.value})}
                       >
                         {globalSettings.productionStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                    </div>
                    <div className="input-group">
                      <label className="font-bold mb-2 block">ملاحظات الطلبية</label>
                      <textarea
                        disabled={isEditLocked}
                        className="input-field"
                        rows="2"
                        style={{ backgroundColor: isEditLocked ? '#f1f5f9' : 'white' }}
                        value={formData.orderNotes || ''}
                        onChange={(e) => setFormData({...formData, orderNotes: e.target.value})}
                        placeholder="ملاحظات عامة على الطلبية..."
                      />
                    </div>
                  </div>
                )}

                <div className="premium-modal-actions" style={{ justifyContent: 'center', marginTop: isMobile ? '12px' : '2rem' }}>
                  {!isEditLocked ? (
                    <button type="submit" disabled={savingProduction} className="btn-premium-save">
                      {editingOrder ? 'تحديث الطلبية' : 'حفظ الطلبية'}
                    </button>
                  ) : (
                    <button type="button" className={isMobile ? '' : 'btn-premium-cancel'} onClick={() => setShowModal(false)} style={isMobile ? { width: '100%', maxWidth: '320px', minHeight: '46px', border: '1px solid #148995', borderRadius: '12px', background: '#148995', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 900, fontSize: '0.95rem', boxShadow: '0 4px 10px rgba(20,137,149,.22)', cursor: 'pointer' } : { width: '200px' }}>
                      {isMobile && <X size={17} strokeWidth={2.5} />}
                      <span>إغلاق المعاينة</span>
                    </button>
                  )}
                  {!editingOrder && !isEditLocked && (
                    <button type="button" className="btn-premium-cancel" onClick={() => setShowModal(false)}>
                      إلغاء
                    </button>
                  )}
                </div>
            </form>
          </div>
        </div>
      )}

      {showPreview && selectedOrder && (
        isMobile ? (
          <div className="modal-overlay no-print" style={{ zIndex: 10500 }}>
            <div 
              className="modal-content animate-fade-in" 
              style={{
                width: '100vw',
                height: '100vh',
                maxWidth: '100%',
                maxHeight: '100%',
                margin: 0,
                borderRadius: 0,
                padding: 0,
                backgroundColor: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              {/* Header */}
              <div 
                style={{
                  backgroundColor: '#ffffff',
                  borderBottom: '1px solid #e2e8f0',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  direction: 'rtl'
                }}
              >
                {/* Empty placeholder to balance flex space-between */}
                <div style={{ width: '38px' }} />
                
                {/* Center Title */}
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>تفاصيل أمر الإنتاج</h3>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px', fontWeight: 'bold' }}>{selectedOrder.orderNumber}#</div>
                </div>

                {/* Close (X) button */}
                <div 
                  onClick={() => setShowPreview(false)} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <X size={18} className="text-slate-600" />
                </div>
              </div>

              {/* Scrollable Content Pane */}
              <div 
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  paddingBottom: '120px',
                  direction: 'rtl'
                }}
              >
                {/* First Block: Stats cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Left Card: Order No & Status */}
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ backgroundColor: '#ecfdf5', color: '#059669', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={20} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: '#0284c7', fontWeight: '800', fontSize: '0.9rem' }}>{selectedOrder.orderNumber}#</span>
                      <span 
                        style={{
                          backgroundColor: getStatusStyles(selectedOrder.status).bg,
                          color: getStatusStyles(selectedOrder.status).text,
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          display: 'inline-block',
                          marginTop: '4px',
                          fontWeight: 'bold',
                          width: 'fit-content'
                        }}
                      >
                        {selectedOrder.status}
                      </span>
                    </div>
                  </div>

                  {/* Right Card: Due Date */}
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Calendar size={20} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold' }}>تاريخ التسليم</span>
                      <span style={{ color: '#1e293b', fontSize: '0.85rem', fontWeight: '800', marginTop: '4px' }}>{selectedOrder.deliveryDate || '---'}</span>
                    </div>
                  </div>
                </div>

                {/* Second Block: Details Grid Card */}
                <div 
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div 
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      border: '1px solid #f1f5f9',
                      borderRadius: '12px',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Row 1 Right: اسم العميل */}
                    <div style={{ gridColumn: '2', gridRow: '1', borderBottom: '1px solid #f1f5f9', borderLeft: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', padding: '10px 8px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <User size={12} style={{ color: '#0284c7' }} /> اسم العميل
                      </span>
                      <span style={{ color: '#1e293b', fontSize: '0.82rem', fontWeight: '800' }}>{selectedOrder.customerName}</span>
                    </div>

                    {/* Row 1 Left: الحالة */}
                    <div style={{ gridColumn: '1', gridRow: '1', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', padding: '10px 8px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <Flag size={12} style={{ color: getStatusStyles(selectedOrder.status).text }} /> الحالة
                      </span>
                      <span style={{ color: getStatusStyles(selectedOrder.status).text, fontSize: '0.82rem', fontWeight: '800' }}>{selectedOrder.status || 'تحت الإنتاج'}</span>
                    </div>

                    {/* Row 2 Right: أنشئت بواسطة */}
                    <div style={{ gridColumn: '2', gridRow: '2', borderBottom: '1px solid #f1f5f9', borderLeft: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', padding: '10px 8px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <User size={12} style={{ color: '#64748b' }} /> أنشئت بواسطة
                      </span>
                      <span style={{ color: '#1e293b', fontSize: '0.82rem', fontWeight: '800' }}>{selectedOrder.createdBy || '---'}</span>
                    </div>

                    {/* Row 2 Left: تاريخ الإنشاء */}
                    <div style={{ gridColumn: '1', gridRow: '2', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', padding: '10px 8px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <Calendar size={12} style={{ color: '#64748b' }} /> تاريخ الإنشاء
                      </span>
                      <span style={{ color: '#1e293b', fontSize: '0.82rem', fontWeight: '800' }}>{selectedOrder.orderDate || '---'}</span>
                    </div>

                    {/* Row 3 Right: آخر إجراء */}
                    <div style={{ gridColumn: '2', gridRow: '3', borderLeft: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', padding: '10px 8px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <User size={12} style={{ color: '#64748b' }} /> آخر إجراء
                      </span>
                      <span style={{ color: '#1e293b', fontSize: '0.82rem', fontWeight: '800' }}>{selectedOrder.lastActionBy || '---'}</span>
                    </div>

                    {/* Row 3 Left: تاريخ آخر تحديث */}
                    <div style={{ gridColumn: '1', gridRow: '3', display: 'flex', flexDirection: 'column', padding: '10px 8px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <Clock size={12} style={{ color: '#64748b' }} /> تاريخ آخر تحديث
                      </span>
                      <span style={{ color: '#1e293b', fontSize: '0.78rem', fontWeight: '800' }}>{selectedOrder.statusUpdateDate || '---'}</span>
                    </div>
                  </div>
                </div>

                {/* Third Block: Items details Card */}
                <div 
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  {/* Card Title */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    <Package size={18} className="text-primary" />
                    <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>تفاصيل الأصناف</span>
                    <span style={{ marginRight: 'auto', borderRadius: '10px', padding: '4px 8px', background: '#f1f5f9', color: '#475569', fontSize: '0.72rem', fontWeight: 900 }}>
                      خياطة {selectedOrderStageCounts.sewing} | تغليف {selectedOrderStageCounts.packaging} | منتهي {selectedOrderStageCounts.finished}
                    </span>
                  </div>

                   {/* Items Cards Layout */}
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                     {normalizedItems.map((item, idx) => (
                       <div 
                         key={idx} 
                         style={{ 
                           backgroundColor: '#ffffff', 
                           borderRadius: '12px', 
                           border: '1px solid #e2e8f0', 
                           padding: '12px', 
                           display: 'flex', 
                           flexDirection: 'column', 
                           gap: '10px',
                           direction: 'rtl' 
                         }}
                       >
                          {/* Status & Number Badge Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                            <div 
                              style={{ 
                                width: '32px', 
                                height: '32px', 
                                borderRadius: '8px', 
                                backgroundColor: '#0d9488', 
                                color: '#ffffff', 
                                fontWeight: 'bold', 
                                fontSize: '0.85rem', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                boxShadow: '0 2px 4px rgba(13,148,136,0.15)'
                              }}
                            >
                              {String(idx + 1).padStart(2, '0')}
                            </div>
                            <span 
                              className={`badge ${getStatusBadgeClass(item.status || 'لم يتم التنفيذ')} preview-item-badge`}
                             style={{
                               display: 'flex',
                               alignItems: 'center',
                               justifyContent: 'center',
                               height: '36px',
                               fontSize: '0.82rem',
                               fontWeight: 'bold',
                               width: 'auto',
                               backgroundColor: getStatusStyles(item.status || 'لم يتم التنفيذ').bg,
                               color: getStatusStyles(item.status || 'لم يتم التنفيذ').text,
                               border: '1px solid #e2e8f0',
                               borderRadius: '8px',
                               paddingRight: '0',
                               direction: 'rtl',
                               backgroundImage: 'none'
                             }}
                           >
                             {getProductionStatusLabel(item.status || 'لم يتم التنفيذ')}
                           </span>
                         </div>

                         {productionSection !== 'all' && (
                           (productionSection === 'packaging' && item.status === 'مرحلة التغليف') ||
                           (productionSection === 'sewing' && !NON_SEWING_PRODUCTION_STATUSES.includes(item.status || selectedOrder.status))
                         ) && (
                           <div style={{ alignSelf: 'flex-start', borderRadius: '999px', padding: '3px 9px', background: productionSection === 'packaging' ? '#fff7ed' : '#ecfdf5', color: productionSection === 'packaging' ? '#c2410c' : '#047857', fontSize: '0.7rem', fontWeight: 900 }}>
                             هذا الصنف موجود في {productionSection === 'packaging' ? 'قسم التغليف' : 'قسم الخياطة'}
                           </div>
                         )}

                         {/* Item details */}
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
                             <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.9rem' }}>{item.productName}</span>
                             <span style={{ color: '#64748b', fontSize: '0.78rem' }}>
                               المقاس: {item.sizeCm || '-'} سم {item.colorModel && `| اللون: ${item.colorModel}`} {item.thickness && `| السماكة: ${item.thickness} سم`}
                             </span>
                             {(item.notes || item.productionNotes) && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px' }}>ملاحظة: {item.notes || item.productionNotes}</span>}
                           </div>
                           <div style={{ textAlign: 'center', minWidth: '40px' }}>
                             <span style={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 'bold', display: 'block' }}>الكمية</span>
                             <span style={{ color: '#0891b2', fontSize: '1.15rem', fontWeight: '900' }}>{item.quantity}</span>
                           </div>
                         </div>
                         {isProductionEditable && (
                           <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                             <span style={{ color: '#475569', fontSize: '0.76rem', fontWeight: '800' }}>نقل الصنف إلى</span>
                             <select
                               value={canonicalizeProductionStatus(item.status || selectedOrder.status || 'لم يتم التنفيذ')}
                               onChange={(event) => handleUpdateItemStatus(selectedOrder, item._originalIndex ?? idx, event.target.value)}
                               style={{ height: '38px', border: '1px solid #cbd5e1', borderRadius: '9px', background: '#fff', padding: '0 10px', fontWeight: '800', color: '#334155' }}
                             >
                               {getAllowedItemTransitions(item.status).map(status => (
                                 <option key={status} value={status}>{getProductionStatusLabel(status)}</option>
                               ))}
                             </select>
                           </div>
                         )}
                         <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: '700', textAlign: 'right' }}>
                           {(item.movementHistory || []).length > 0
                             ? <>آخر انتقال: {getProductionStatusLabel(item.movementHistory[item.movementHistory.length - 1]?.from || '—')} ← {getProductionStatusLabel(item.movementHistory[item.movementHistory.length - 1]?.to || '—')} بواسطة {(item.movementHistory[item.movementHistory.length - 1]?.changedBy || 'النظام')} · {item.movementHistory[item.movementHistory.length - 1]?.changedAt ? new Date(item.movementHistory[item.movementHistory.length - 1].changedAt).toLocaleString('ar-JO') : ''}</>
                             : <>آخر تحديث: {selectedOrder.statusUpdateDate || selectedOrder.orderDate || '—'}</>}
                         </div>
                       </div>
                     ))}
                   </div>

                  {/* Summary Grid underneath Table */}
                  <div 
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      marginTop: '8px',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    {/* إجمالي الأصناف */}
                    <div style={{ borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 4px', textAlign: 'center' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 'bold', marginBottom: '4px' }}>إجمالي الأصناف</span>
                      <Layers size={14} style={{ color: '#64748b', marginBottom: '4px' }} />
                      <span style={{ color: '#1e293b', fontSize: '0.85rem', fontWeight: 'bold' }}>{stats.totalItemsCount}</span>
                    </div>

                     {/* غير منفذ */}
                     <div style={{ borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 4px', textAlign: 'center' }}>
                       <span style={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 'bold', marginBottom: '4px' }}>غير منفذ</span>
                       <Clipboard size={14} style={{ color: '#ef4444', marginBottom: '4px' }} />
                       <span style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 'bold' }}>{stats.unexecutedQty}</span>
                     </div>

                    {/* المنفذ */}
                    <div style={{ borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 4px', textAlign: 'center' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 'bold', marginBottom: '4px' }}>المنفذ</span>
                      <CheckCircle size={14} style={{ color: '#10b981', marginBottom: '4px' }} />
                      <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 'bold' }}>{stats.completedQty}</span>
                    </div>

                    {/* المتبقي */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 4px', textAlign: 'center' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 'bold', marginBottom: '4px' }}>المتبقي</span>
                      <Clock size={14} style={{ color: '#f59e0b', marginBottom: '4px' }} />
                      <span style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: 'bold' }}>{stats.remainingQty}</span>
                    </div>
                  </div>
                </div>

                {/* Fourth Block: Notes */}
                {(selectedOrder.orderNotes || selectedOrder.notes) && (
                  <div 
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                      <Info size={16} className="text-primary" />
                      <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>ملاحظات</span>
                    </div>
                    <div style={{ color: '#475569', fontSize: '0.82rem', lineHeight: '1.5' }}>
                      {selectedOrder.orderNotes || selectedOrder.notes}
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div 
                style={{
                  backgroundColor: '#ffffff',
                  borderTop: '1px solid #e2e8f0',
                  padding: '16px 16px calc(24px + env(safe-area-inset-bottom, 0px)) 16px',
                  display: 'flex',
                  gap: '8px',
                  direction: 'rtl',
                  boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.05)'
                }}
              >
                <button 
                  onClick={triggerPrint}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '10px 8px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: 'var(--primary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    color: 'white',
                    flex: 1
                  }}
                >
                  <Printer size={15} />
                  <span>طباعة / تصدير PDF</span>
                </button>
                <button 
                  onClick={() => setShowPreview(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '10px 8px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    color: '#475569',
                    flex: 1
                  }}
                >
                  <span>إغلاق</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="modal-overlay no-print" style={{ zIndex: 10500 }}>
            <div className="modal-content wide animate-fade-in">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-xl font-bold">معاينة أمر الإنتاج وتصدير PDF</h3>
                <button type="button" className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setShowPreview(false)}><X size={18} /></button>
              </div>
              
              <div className="bg-white p-6 border rounded-lg shadow-inner mb-6 text-right" style={{ direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                  <h2 className="text-primary font-bold">أمر إنتاج رقم #{selectedOrder.orderNumber}</h2>
                  <div className="text-muted">{selectedOrder.orderDate}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div><strong>اسم العميل:</strong> {selectedOrder.customerName}</div>
                  <div><strong>أُنشئت بواسطة:</strong> {selectedOrder.createdBy || '---'}</div>
                  <div><strong>تاريخ التسليم:</strong> <span style={{ color: '#dc2626', fontWeight: 'bold' }}>{selectedOrder.deliveryDate || 'غير محدد'}</span></div>
                  <div><strong>آخر إجراء:</strong> {selectedOrder.lastActionBy || '---'}</div>
                  <div><strong>الحالة العامة:</strong> {selectedOrder.status}</div>
                </div>

                <div className="mt-4 mb-4">
                  <strong>تفاصيل الأصناف:</strong>
                  <table className="w-full text-sm mt-2 border border-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="border p-2 text-right">الصنف</th>
                        <th className="border p-2 text-right">اللون</th>
                        <th className="border p-2 text-right">المقاس</th>
                        <th className="border p-2 text-right">السماكة</th>
                        <th className="border p-2 text-right">نوع التغليف</th>
                        <th className="border p-2 text-right">الكمية</th>
                        <th className="border p-2 text-right">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {normalizedItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="border p-2 text-right font-bold">
                            <div>{item.productName}</div>
                            {(item.notes || item.productionNotes) && (
                              <div style={{ marginTop: '4px', color: '#64748b', fontWeight: 'normal', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                                ملاحظات: {item.notes || item.productionNotes}
                              </div>
                            )}
                          </td>
                          <td className="border p-2 text-right">{item.colorModel}</td>
                          <td className="border p-2 text-right" dir="ltr">{item.sizeCm}</td>
                          <td className="border p-2 text-right">{item.thickness}</td>
                          <td className="border p-2 text-right">{item.packagingType || '---'}</td>
                          <td className="border p-2 text-right font-bold text-primary">{item.quantity}</td>
                          <td className="border p-2 text-right">
                            <span 
                              className={`badge ${getStatusBadgeClass(item.status || 'لم يتم التنفيذ')}`}
                              style={{
                                backgroundColor: getStatusStyles(item.status || 'لم يتم التنفيذ').bg,
                                color: getStatusStyles(item.status || 'لم يتم التنفيذ').text,
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 'bold',
                                display: 'inline-block'
                              }}
                            >
                              {item.status || 'لم يتم التنفيذ'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {(selectedOrder.orderNotes || selectedOrder.notes) && (
                  <div className="mt-4 p-3 bg-slate-50 rounded">
                    <strong>ملاحظات:</strong>
                    <p>{selectedOrder.orderNotes || selectedOrder.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button className="btn btn-primary flex-1" onClick={isMobile ? triggerSharePDF : triggerPrint}><Printer size={18} /> طباعة / تصدير PDF</button>
                <button className="btn btn-outline flex-1" onClick={() => setShowPreview(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        )
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        #print-portal { display: none; }
        .badge-info { background: #e0f2f1; color: #00796b; border: 1px solid #b2dfdb; }
        .badge-cutting { background: #fff3e0; color: #ef6c00; border: 1px solid #ffcc80; }
        .badge-sewing { background: #e3f2fd; color: #1976d2; border: 1px solid #90caf9; }
        .badge-packaging { background: #f3e5f5; color: #7b1fa2; border: 1px solid #ce93d8; }
        .badge-warehouse { background: #fffde7; color: #fbc02d; border: 1px solid #fff59d; }
        .badge-success { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
        .badge-danger { background: #ffebee; color: #c62828; border: 1px solid #ef9a9a; }
        @media (max-width: 767px) {
          .preview-item-badge {
            display: inline-flex !important;
            height: 28px !important;
            font-size: 0.78rem !important;
            width: auto !important;
            padding: 0 10px !important;
            border-radius: 6px !important;
          }
        }
      `}} />
      <MultiColorSelectionModal
        isOpen={showMultiColorModal}
        onClose={() => setShowMultiColorModal(false)}
        onAddItems={handleAddMultiColors}
        stockColors={globalSettings.stockColors || []}
        stock={stockItems}
      />
    </div>
  );
};

export default AdminProduction;
