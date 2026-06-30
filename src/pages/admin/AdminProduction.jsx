import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  ShoppingBag, Plus, Search, Trash2, Edit2, 
  Printer, X, User, Calendar, Layers, UserPlus, Eye, Phone,
  ArrowUpDown, ArrowUp, ArrowDown, GripVertical, AlertCircle, FileText, Info, Truck, Filter, CheckCircle, Navigation, MapPin, Lock
} from 'lucide-react';
import SewingMachineIcon from '../../components/SewingMachineIcon';
import { getOrders, saveOrder, deleteOrder, updateOrderStatus, getCustomers, saveCustomer, getGlobalSettings, isAdmin, canPerformAction, addLog, getStock, saveStockItem, getSalesOrders, saveSalesOrder } from '../../store';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import Select from 'react-select';

const MySwal = withReactContent(Swal);

const getLocalDateStr = (d) => {
  if (!d) return '';
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const AdminProduction = ({ user, notificationTarget }) => {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'orderNumber', direction: 'desc' });
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({ productionStatuses: [], salesStatuses: [], itemStatuses: [], logoUrl: '/logo-mrsleep.png', siteName: 'Mirjas HR' });
  const [stockItems, setStockItems] = useState([]);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterCreatedBy, setFilterCreatedBy] = useState('');
  const [filterOrderNumber, setFilterOrderNumber] = useState('');

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
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [ordersData, customersData, settings, stockData] = await Promise.all([
      getOrders(),
      getCustomers(),
      getGlobalSettings(),
      getStock()
    ]);
    setOrders(ordersData);
    setCustomers(customersData);
    setGlobalSettings(settings);
    setStockItems(stockData);
    setLoading(false);
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

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
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
    const JORDANIAN_CITIES = ['عمان', 'الزرقاء', 'إربد', 'المفرق', 'عجلون', 'جرش', 'البلقاء', 'مأدبا', 'الكرك', 'الطفيلة', 'معان', 'العقبة'];
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
                ${JORDANIAN_CITIES.map(city => `<option value="${city}">${city}</option>`).join('')}
              </select>
            </div>
            <div class="premium-form-group" style="margin-bottom: 0;">
              <label>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin text-muted"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                المنطقة
              </label>
              <input id="swal-location" class="premium-input" placeholder="مثال: خلدا، شارع المدينة..." value="${initialData.location || ''}">
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
        if (!location) {
          Swal.showValidationMessage('يرجى إدخال المنطقة');
          return false;
        }
        if (!sector) {
          Swal.showValidationMessage('يرجى اختيار القطاع');
          return false;
        }
        return { name, phone: phone.trim(), city, location, sector, status, customerNumber: initialData.customerNumber };
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerName || formData.items.some(item => !item.productName || !item.quantity)) {
      Swal.fire('خطأ', 'يرجى اختيار العميل وتعبئة جميع بيانات الأصناف المطلوبة', 'error');
      return;
    }



    // For backward compatibility and reporting, we store the first item's details at top level too
    const firstItem = formData.items[0];
    const dataToSave = {
      ...formData,
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
              const prodItem = dataToSave.items?.find(pi => pi.productName === item.productName);
              if (prodItem && prodItem.status === 'منتهي' && item.itemStatus === 'قيد الإنتاج') {
                changed = true;
                return { ...item, itemStatus: 'جاهز' };
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
      const orderToDelete = orders.find(o => o.id === id);
      await deleteOrder(id);
      await addLog({
        userName: user.name,
        userId: user.id,
        module: 'طلبيات الإنتاج',
        action: 'حذف',
        details: `حذف طلبية إنتاج رقم: ${orderToDelete?.orderNumber || id}`
      });
      Swal.fire({
        customClass: {
          container: 'premium-modal-container',
          popup: 'premium-modal-popup',
          confirmButton: 'btn-premium-save',
          actions: 'premium-modal-actions'
        },
        buttonsStyling: false,
        title: 'تم الحذف',
        text: 'تم حذف الطلبية بنجاح',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
      fetchData();
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return;
    
    
    await saveOrder({ 
      ...orderToUpdate, 
      status: newStatus,
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
            const prodItem = orderToUpdate.items?.find(pi => pi.productName === item.productName);
            if (prodItem && prodItem.status === 'منتهي' && item.itemStatus === 'قيد الإنتاج') {
              changed = true;
              return { ...item, itemStatus: 'جاهز' };
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

  const triggerPrint = () => {
    const originalTitle = document.title;
    if (selectedOrder && selectedOrder.orderNumber) {
      document.title = selectedOrder.orderNumber;
    }
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  const sortedOrders = [...orders].sort((a, b) => {
    if (!sortConfig.key) return 0;
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    
    // Handle numeric fields
    if (sortConfig.key === 'orderNumber') {
      aVal = parseInt(String(aVal || '').replace(/\D/g, '') || 0, 10);
      bVal = parseInt(String(bVal || '').replace(/\D/g, '') || 0, 10);
    }
    
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredOrders = sortedOrders.filter(o => {
    const matchOrderNum = filterOrderNumber ? (o.orderNumber || '').toString().includes(filterOrderNumber) : true;
    const matchSearch = searchTerm ? (
      (o.orderNumber || '').toString().includes(searchTerm) || 
      (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (o.items || []).some(item => (item.productName || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.productName || '').toLowerCase().includes(searchTerm.toLowerCase())
    ) : true;
    const matchDateFrom = dateFrom ? o.orderDate >= dateFrom : true;
    const matchDateTo = dateTo ? o.orderDate <= dateTo : true;
    const matchCust = selectedCustomer ? o.customerId === selectedCustomer : true;
    const matchStatus = selectedStatus ? o.status === selectedStatus : true;
    const matchCreatedBy = filterCreatedBy ? (o.createdBy || '').includes(filterCreatedBy) : true;
    return matchOrderNum && matchSearch && matchDateFrom && matchDateTo && matchCust && matchStatus && matchCreatedBy;
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
      case 'مرحلة المستودع': return 'badge-warehouse';
      default: return 'badge-info';
    }
  };

  const isLinkedOrder = !!formData.salesOrderNumber || (formData.orderNotes && formData.orderNotes.includes('مرتبط'));

  return (
    <div className="animate-fade-in">
      {/* Printable Area using Portal */}
      {selectedOrder && createPortal(
        <div className="order-print-layout" style={{ direction: 'rtl', padding: '1.5cm', fontFamily: 'Tajawal, sans-serif', background: 'white', color: '#333' }}>
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

          {/* Order Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
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
                      <td style={{ color: '#64748b', fontWeight: 'bold' }}>مرتبط بمبيعات:</td>
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

            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
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
          </div>

          {selectedOrder.orderNotes && (
            <div style={{ background: '#fff', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid #93c5fd', borderRight: '4px solid #3b82f6', marginBottom: '2rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '1.2rem', fontWeight: 'bold' }}>ملاحظات عامة على الطلبية:</h4>
              <p style={{ margin: 0, color: '#334155', lineHeight: '1.6', fontSize: '1.1rem', fontWeight: '500' }}>{selectedOrder.orderNotes}</p>
            </div>
          )}

          {/* Items Table */}
          <h3 style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', fontWeight: 'bold' }}>تفاصيل أصناف الإنتاج</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'center', width: '40px', color: '#334155', fontSize: '1.1rem' }}>#</th>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#334155', fontSize: '1.1rem' }}>الصنف</th>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'center', width: '90px', color: '#334155', fontSize: '1.1rem' }}>المقاس</th>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'center', width: '90px', color: '#334155', fontSize: '1.1rem' }}>السماكة</th>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'center', width: '80px', color: '#334155', fontSize: '1.1rem' }}>الكمية</th>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'center', width: '110px', color: '#334155', fontSize: '1.1rem' }}>الموديل</th>
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
                  <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 'bold', color: '#64748b', fontSize: '1.1rem' }}>{idx + 1}</td>
                  <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 'bold', color: '#0f172a', fontSize: '1.2rem' }}>{item.productName}</td>
                  <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 'bold', color: '#0f172a', fontSize: '1.1rem' }}>{item.sizeCm} سم</td>
                  <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 'bold', color: '#0f172a', fontSize: '1.1rem' }}>{item.thickness} سم</td>
                  <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: '900', color: '#0f172a', fontSize: '1.3rem' }}>{item.quantity}</td>
                  <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 'bold', color: '#0f172a', fontSize: '1.1rem' }}>{item.colorModel}</td>
                  <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#334155', fontSize: '1.1rem', fontWeight: '500' }}>
                    {item.notes}
                    {item.packagingType && <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>تغليف: {item.packagingType}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Signatures */}
          <div style={{ marginTop: '5rem', display: 'flex', justifyContent: 'space-around', padding: '0 2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '2px solid #cbd5e1', width: '220px', paddingTop: '1rem', fontWeight: 'bold', color: '#334155', fontSize: '1.1rem' }}>توقيع مسؤول المخزون</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '2px solid #cbd5e1', width: '220px', paddingTop: '1rem', fontWeight: 'bold', color: '#334155', fontSize: '1.1rem' }}>توقيع مسؤول الطلبيات</div>
            </div>
          </div>
          
          <div style={{ marginTop: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            تم طباعة هذا المستند من نظام {globalSettings.siteName}
          </div>
        </div>,
        document.getElementById('print-portal')
      )}
      {/* Main Content */}
      <div className="no-print">
        <div className="flex-responsive mb-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <SewingMachineIcon className="text-primary" /> إدارة الإنتاج
            </h2>
            <p className="text-muted">متابعة تنفيذ طلبيات الإنتاج</p>
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

      {/* Filter Bar */}
      <div className="glass-panel mb-4 no-print" style={{ padding: '1rem' }}>
        <div className="flex gap-4 items-center justify-between w-full flex-wrap">
          <div className="flex items-center gap-3 w-full md:max-w-md">
            <Search className="text-muted" size={20} />
            <input 
              type="text" 
              placeholder="بحث سريع (رقم، عميل، صنف)..."
              className="input-field flex-1" 
              style={{ marginBottom: 0 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center" style={{ gap: '2rem' }}>
            <select 
              className="input-field" 
              style={{ marginBottom: 0, minWidth: '150px' }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">جميع الحالات</option>
              {globalSettings.productionStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button 
              className="btn btn-primary flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md"
              onClick={() => setShowFilterModal(true)}
              style={{
                padding: '10px 24px',
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
        </div>
      </div>

      {showFilterModal && (
        <div className="modal-overlay no-print" style={{ zIndex: 1000 }}>
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
                  {globalSettings.productionStatuses.map(s => <option key={s} value={s}>{s}</option>)}
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
                setFilterOrderNumber(''); setDateFrom(''); setDateTo(''); setSelectedCustomer(''); setSelectedStatus(''); setFilterCreatedBy('');
              }}>تفريغ</button>
            </div>
          </div>
        </div>
      )}

        {loading ? (
          <div className="text-center py-10">جاري التحميل...</div>
        ) : (
          <div className="table-container glass-panel">
            <table>
              <thead>
                <tr>
                  <th className="text-center cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('orderNumber')}>
                    <div className="flex items-center justify-center gap-1">رقم الإنتاج <ArrowUpDown size={14} className="text-muted" /></div>
                  </th>
                  <th className="text-center cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('customerName')}>
                    <div className="flex items-center justify-center gap-1">العميل <ArrowUpDown size={14} className="text-muted" /></div>
                  </th>
                  <th className="text-center">أنشئت بواسطة</th>
                  <th className="text-center">آخر إجراء</th>
                  <th className="text-center cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('deliveryDate')}>
                    <div className="flex items-center justify-center gap-1">تاريخ التسليم <ArrowUpDown size={14} className="text-muted" /></div>
                  </th>
                  <th className="text-center cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('status')}>
                    <div className="flex items-center justify-center gap-1">الحالة <ArrowUpDown size={14} className="text-muted" /></div>
                  </th>
                  <th className="text-center" style={{ textAlign: 'center' }}>تغيير الحالة</th>
                  <th className="text-center" style={{ textAlign: 'center' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length > 0 ? (
                    filteredOrders.map(order => (
                      <tr key={order.id}>
                        <td data-label="رقم الإنتاج" className="font-bold text-primary text-center">{order.orderNumber}</td>
                        <td data-label="العميل" className="text-center">{order.customerName}</td>
                        <td data-label="أنشئت بواسطة" className="text-xs text-center">{order.createdBy || '---'}</td>
                        <td data-label="آخر إجراء" className="text-xs font-semibold text-center">{order.lastActionBy || '---'}</td>
                        <td data-label="تاريخ التسليم" className="text-center">{order.deliveryDate || '---'}</td>
                        <td data-label="الحالة" className="text-center">
                          <span 
                            className={`badge ${getStatusBadgeClass(order.status)}`}
                            style={{ width: '130px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          >
                            {order.status || 'تحت الإنتاج'}
                          </span>
                        </td>
                        <td data-label="تغيير الحالة" style={{ textAlign: 'center' }}>
                          <select 
                            className="input-field" 
                            style={{ padding: '0 0.5rem', width: '130px', height: '36px', fontSize: '13px', borderRadius: '8px', marginBottom: 0, border: '1px solid var(--primary-light)', backgroundColor: '#f8fafc', margin: '0 auto' }}
                            value={order.status}
                            onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                          >
                            {globalSettings.productionStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td data-label="إجراءات" style={{ textAlign: 'center' }}>
                          <div className="flex flex-wrap gap-2 justify-center items-center">
                            <button className="btn-premium-view" title="معاينة" onClick={() => handleOpenPreview(order)}>
                              <Eye size={16} />
                            </button>
                            {canPerformAction(user, 'EDIT', 'SALES', globalSettings) && (
                              <button className="btn-premium-edit" title="تعديل" onClick={() => handleOpenModal(order)}>
                                <Edit2 size={16} />
                              </button>
                            )}
                            {canPerformAction(user, 'DELETE', 'SALES', globalSettings) && (
                              <button 
                                className={`btn-premium-delete ${order.status !== 'لم يتم التنفيذ' ? 'opacity-50 cursor-not-allowed' : ''}`} 
                                title={order.status !== 'لم يتم التنفيذ' ? 'لا يمكن حذف الطلبية بعد استلامها والبدء بها' : 'حذف'} 
                                onClick={() => order.status === 'لم يتم التنفيذ' && handleDelete(order.id)}
                                disabled={order.status !== 'لم يتم التنفيذ'}
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

      {/* Order Modal */}
      {showModal && (
        <div className="modal-overlay no-print">
        <div className="modal-content wide animate-fade-in">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-xl font-bold">
                {editingOrder ? `تعديل طلبية ${editingOrder.orderNumber}` : 'إنشاء طلبية إنتاج جديدة'}
              </h3>
              <button type="button" className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  <div className="md:col-span-4 input-group mb-0">
                    <label className="font-bold text-slate-700 mb-2 block flex items-center gap-2"><ShoppingBag size={16} className="text-primary"/> رقم الإنتاج</label>
                    <input type="text" className="input-field bg-slate-100 font-bold text-primary" style={{ height: '42px', textAlign: 'center' }} value={formData.orderNumber || ''} readOnly disabled />
                  </div>
                  
                  <div className="md:col-span-4 input-group mb-0">
                    <label className="font-bold text-slate-700 mb-2 block flex items-center gap-2"><Calendar size={16} className="text-primary"/> تاريخ الطلب</label>
                    <Flatpickr disabled={!isAdmin(user) || isLinkedOrder} className="input-field" style={{ height: '42px', backgroundColor: (!isAdmin(user) || isLinkedOrder) ? '#f1f5f9' : 'white' }} value={formData.orderDate || ''} onChange={([d]) => setFormData({...formData, orderDate: getLocalDateStr(d)})} options={{ dateFormat: 'Y-m-d', disableMobile: true }} />
                  </div>

                  <div className="md:col-span-4 input-group mb-0">
                    <label className="font-bold text-slate-700 mb-2 block flex items-center gap-2"><Calendar size={16} className="text-orange-500"/> تاريخ التسليم المتوقع</label>
                    <Flatpickr disabled={!isAdmin(user) || isLinkedOrder} className="input-field" style={{ height: '42px', backgroundColor: (!isAdmin(user) || isLinkedOrder) ? '#f1f5f9' : 'white' }} value={formData.deliveryDate || ''} onChange={([d]) => setFormData({...formData, deliveryDate: getLocalDateStr(d)})} options={{ dateFormat: 'Y-m-d', disableMobile: true }} placeholder="اختر تاريخ التسليم" />
                  </div>

                  <div className="md:col-span-12 input-group mb-0 mt-3">
                    <label className="flex items-center gap-2 mb-2 font-bold text-slate-700"><User size={16} className="text-primary"/> العميل</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Select 
                          isDisabled={!isAdmin(user) || isLinkedOrder}
                          options={customers.map(c => ({ value: c.id, label: c.name }))}
                          value={formData.customerId ? { value: formData.customerId, label: formData.customerName || customers.find(c => c.id === formData.customerId)?.name || 'غير معروف' } : null}
                          onChange={(selected) => handleCustomerChange({ target: { value: selected ? selected.value : '' } })}
                          placeholder="اختر عميل أو ابحث هنا..."
                          isClearable
                          isSearchable
                          styles={{
                            control: (base) => ({
                              ...base,
                              borderColor: '#e2e8f0',
                              borderRadius: '8px',
                              minHeight: '42px',
                              boxShadow: 'none',
                              backgroundColor: (!isAdmin(user) || isLinkedOrder) ? '#f1f5f9' : 'white',
                              '&:hover': {
                                borderColor: 'var(--primary-light)'
                              }
                            }),
                            option: (base, state) => ({
                              ...base,
                              backgroundColor: state.isSelected ? 'var(--primary)' : state.isFocused ? '#f1f5f9' : 'white',
                              color: state.isSelected ? 'white' : '#1e293b',
                              textAlign: 'right'
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999
                            })
                          }}
                        />
                      </div>
                      {isAdmin(user) && !isLinkedOrder && (
                        <button type="button" className="btn btn-primary flex items-center justify-center gap-2 shadow-sm transition-all h-[42px]" onClick={handleAddNewCustomer} style={{ whiteSpace: 'nowrap', height: '42px' }}>
                          <UserPlus size={16} strokeWidth={2} /> عميل جديد
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-bold flex items-center gap-2">
                      <Layers size={18} className="text-primary" /> أصناف الطلبية
                    </h4>
                    {isAdmin(user) && !isLinkedOrder && (
                      <button type="button" className="btn btn-primary btn-sm flex items-center gap-2" onClick={handleAddItem}>
                        <Plus size={16} /> صنف جديد
                      </button>
                    )}
                  </div>

                  <div className="modal-table-container glass-panel" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="modal-table" style={{ minWidth: '1500px' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc' }}>
                        <tr>
                          <th style={{ width: '90px', textAlign: 'center' }}>الترتيب</th>
                          <th style={{ minWidth: '250px', textAlign: 'center' }}>الصنف</th>
                          <th style={{ minWidth: '200px', textAlign: 'center' }}>الموديل/اللون</th>
                          <th style={{ width: '100px', textAlign: 'center' }}>الكمية</th>
                          <th style={{ width: '150px', textAlign: 'center' }}>المقاس</th>
                          <th style={{ width: '100px', textAlign: 'center' }}>السماكة</th>
                          <th style={{ minWidth: '250px', textAlign: 'center' }}>ملاحظات</th>
                          <th style={{ width: '150px', textAlign: 'center' }}>الحالة</th>
                          <th style={{ width: '50px', textAlign: 'center' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.items.map((item, index) => (
                          <tr
                            key={index}
                            className={`drag-sort-row ${draggedItemIndex === index ? 'dragging' : ''}`}
                            onDragOver={handleItemDragOver}
                            onDrop={(e) => handleItemDrop(e, index)}
                            onDragEnd={() => setDraggedItemIndex(null)}
                          >
                            <td>
                              {isAdmin(user) && !isLinkedOrder ? (
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
                            <td style={{ minWidth: '250px' }}>
                              <Select
                                isDisabled={!isAdmin(user) || isLinkedOrder}
                                options={stockItems.map(s => ({ value: s.name, label: s.name }))}
                                value={item.productName ? { value: item.productName, label: item.productName } : null}
                                onChange={(selected) => handleItemChange(index, 'productName', selected ? selected.value : '')}
                                placeholder="اختر صنفاً..."
                                isClearable
                                menuPortalTarget={document.body}
                                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }), control: base => ({ ...base, minHeight: '38px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', backgroundColor: (!isAdmin(user) || isLinkedOrder) ? '#f1f5f9' : 'white' }) }}
                              />
                            </td>
                            <td style={{ minWidth: '200px' }}>
                              <Select
                                isDisabled={!isAdmin(user) || isLinkedOrder}
                                options={(globalSettings.stockColors || []).map(c => ({ value: c, label: c }))}
                                value={item.colorModel ? { value: item.colorModel, label: item.colorModel } : null}
                                onChange={(selected) => handleItemChange(index, 'colorModel', selected ? selected.value : '')}
                                placeholder="الموديل..."
                                isClearable
                                menuPortalTarget={document.body}
                                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }), control: base => ({ ...base, minHeight: '38px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', backgroundColor: (!isAdmin(user) || isLinkedOrder) ? '#f1f5f9' : 'white' }) }}
                              />
                            </td>
                            <td className="text-center align-middle">
                              <input type="text" disabled={!isAdmin(user) || isLinkedOrder} className="input-field mb-0 text-center mx-auto" style={{ padding: '0.4rem', height: '38px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', maxWidth: '100px', backgroundColor: (!isAdmin(user) || isLinkedOrder) ? '#f1f5f9' : 'white' }} placeholder="0" value={item.quantity} onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d{1,4}$/.test(val)) {
                                  handleItemChange(index, 'quantity', val);
                                }
                              }} required />
                            </td>
                            <td className="text-center align-middle">
                              <input type="text" disabled={!isAdmin(user) || isLinkedOrder} className="input-field mb-0 text-center mx-auto" style={{ padding: '0.4rem', height: '38px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', maxWidth: '140px', backgroundColor: (!isAdmin(user) || isLinkedOrder) ? '#f1f5f9' : 'white' }} placeholder="200*180" value={item.sizeCm} onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d{1,3}\s*([\*xX]\s*\d{0,3})?$/.test(val)) {
                                  handleItemChange(index, 'sizeCm', val);
                                }
                              }} />
                            </td>
                            <td className="text-center align-middle">
                              <input type="text" disabled={!isAdmin(user) || isLinkedOrder} className="input-field mb-0 text-center mx-auto" style={{ padding: '0.4rem', height: '38px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', maxWidth: '90px', backgroundColor: (!isAdmin(user) || isLinkedOrder) ? '#f1f5f9' : 'white' }} placeholder="سم" value={item.thickness} onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d{1,2}$/.test(val)) {
                                  handleItemChange(index, 'thickness', val);
                                }
                              }} />
                            </td>

                            <td>
                              <input type="text" disabled={!isAdmin(user) || isLinkedOrder} className="input-field mb-0" style={{ padding: '0.4rem', height: '38px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', backgroundColor: (!isAdmin(user) || isLinkedOrder) ? '#f1f5f9' : 'white' }} placeholder="ملاحظات..." value={item.notes} onChange={(e) => handleItemChange(index, 'notes', e.target.value)} />
                            </td>
                            <td>
                              <select className="input-field mb-0" style={{ padding: '0.4rem', fontSize: '0.8rem', height: '38px', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} value={item.status || 'لم يتم التنفيذ'} onChange={(e) => handleItemChange(index, 'status', e.target.value)}>
                                {(globalSettings.productionStatuses || []).map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </td>
                            <td className="text-center">
                              {isAdmin(user) && !isLinkedOrder && formData.items.length > 1 && (
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                  <div className="input-group">
                    <label className="font-bold mb-2 block">حالة الطلبية العامة</label>
                    <select className="input-field" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                      {globalSettings.productionStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="font-bold mb-2 block">ملاحظات الطلبية</label>
                    <textarea
                      disabled={!isAdmin(user) || isLinkedOrder}
                      className="input-field"
                      rows="2"
                      style={{ backgroundColor: (!isAdmin(user) || isLinkedOrder) ? '#f1f5f9' : 'white' }}
                      value={formData.orderNotes || ''}
                      onChange={(e) => setFormData({...formData, orderNotes: e.target.value})}
                      placeholder="ملاحظات عامة على الطلبية..."
                    />
                  </div>
                </div>

                <div className="premium-modal-actions" style={{ justifyContent: 'center' }}>
                  <button type="submit" className="btn-premium-save">
                    {editingOrder ? 'تحديث الطلبية' : 'حفظ الطلبية'}
                  </button>
                  <button type="button" className="btn-premium-cancel" onClick={() => setShowModal(false)}>
                    إلغاء
                  </button>
                </div>
            </form>
          </div>
        </div>
      )}

      {showPreview && selectedOrder && (
        <div className="modal-overlay no-print">
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
                      <th className="border p-2 text-center">الموديل/اللون</th>
                      <th className="border p-2 text-center">المقاس</th>
                      <th className="border p-2 text-center">السماكة</th>
                      <th className="border p-2 text-center">الكمية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedOrder.items || [{
                      productName: selectedOrder.productName,
                      colorModel: selectedOrder.colorModel,
                      sizeCm: selectedOrder.sizeCm,
                      thickness: selectedOrder.thickness,
                      quantity: selectedOrder.quantity
                    }]).map((item, idx) => (
                      <tr key={idx}>
                        <td className="border p-2 font-bold">{item.productName}</td>
                        <td className="border p-2 text-center">{item.colorModel}</td>
                        <td className="border p-2 text-center" dir="ltr">{item.sizeCm}</td>
                        <td className="border p-2 text-center">{item.thickness}</td>
                        <td className="border p-2 text-center font-bold text-primary">{item.quantity}</td>
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
              <button className="btn btn-primary flex-1" onClick={triggerPrint}><Printer size={18} /> طباعة / تصدير PDF</button>
              <button className="btn btn-outline flex-1" onClick={() => setShowPreview(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        #print-portal { display: none; }
        @media print {
          @page { margin: 0.5cm; }
          #root { display: none !important; }
          #print-portal { display: block !important; }
          .order-print-layout { display: block !important; background: white; width: 100%; }
        }
        .badge-info { background: #e0f2f1; color: #00796b; border: 1px solid #b2dfdb; }
        .badge-cutting { background: #fff3e0; color: #ef6c00; border: 1px solid #ffcc80; }
        .badge-sewing { background: #e3f2fd; color: #1976d2; border: 1px solid #90caf9; }
        .badge-packaging { background: #f3e5f5; color: #7b1fa2; border: 1px solid #ce93d8; }
        .badge-warehouse { background: #fffde7; color: #fbc02d; border: 1px solid #fff59d; }
        .badge-success { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
        .badge-danger { background: #ffebee; color: #c62828; border: 1px solid #ef9a9a; }
      `}} />
    </div>
  );
};

export default AdminProduction;

