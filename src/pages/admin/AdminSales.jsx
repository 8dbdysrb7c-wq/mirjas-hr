import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingCart, Plus, Search, Trash2, Package, Printer, X, User, UserPlus, Edit2, Eye, Phone, ArrowUpDown, ArrowUp, ArrowDown, GripVertical, Calendar, Activity, FileText } from 'lucide-react';
import { getSalesOrders, saveSalesOrder, deleteSalesOrder, getCustomers, saveCustomer, getGlobalSettings, saveGlobalSettings, isAdmin, canPerformAction, addLog, getStock, saveStockItem, getOrders, saveOrder, getMissions, saveMission, deleteMission } from '../../store';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import Select from 'react-select';
import SearchableDropdown from '../../components/SearchableDropdown';
const MySwal = withReactContent(Swal);

const getLocalDateStr = (d) => {
  if (!d) return '';
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const AdminSales = ({ user }) => {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'orderNumber', direction: 'desc' });
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [linkedProductionOrder, setLinkedProductionOrder] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({ productionStatuses: [], salesStatuses: [], itemStatuses: [], salesItemStatuses: [], logoUrl: '/logo-mrsleep.png', siteName: 'Mirjas HR' });

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterCreatedBy, setFilterCreatedBy] = useState('');
  const [filterOrderNumber, setFilterOrderNumber] = useState('');

  // Production Variants Modal
  const [showVariantsModal, setShowVariantsModal] = useState(false);
  const [variantModalIndex, setVariantModalIndex] = useState(null);
  const [productionVariants, setProductionVariants] = useState([]);

  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    orderDate: getLocalDateStr(new Date()),
    deliveryDate: '',
    status: 'جديد',
    orderNotes: '',
    items: [{ productName: '', quantity: '', notes: '', itemStatus: '' }]
  });

  const [customerFormData, setCustomerFormData] = useState({
    name: '',
    phone: '',
    sector: ''
  });

  const [stock, setStock] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [ordersData, customersData, settingsData, stockData] = await Promise.all([
      getSalesOrders(),
      getCustomers(),
      getGlobalSettings(),
      getStock()
    ]);
    setOrders(ordersData);
    setCustomers(customersData.filter(c => (c.type || 'عميل') === 'عميل'));
    setGlobalSettings(settingsData);
    setStock(stockData);
    setLoading(false);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleOpenModal = async (order = null) => {
    if (order) {
      setEditingOrder(order);
      setFormData({
        ...order,
        items: (order.items || [{ productName: order.productName, quantity: order.quantity, notes: order.notes || '' }]).map(item => ({
          ...item,
          hasProductionDetails: item.itemStatus === 'قيد الإنتاج'
        }))
      });
      // Fetch linked production order if any
      const prodOrders = await getOrders();
      const linked = prodOrders.find(po => po.salesOrderNumber === order.orderNumber);
      setLinkedProductionOrder(linked || null);

      setFormData(prev => ({
        ...prev,
        items: prev.items.map(item => {
          if (item.itemStatus === 'قيد الإنتاج' && linked && linked.items) {
            const linkedItem = linked.items.find(li => li.productName === item.productName);
            if (linkedItem) {
              return {
                ...item,
                hasProductionDetails: true,
                colorModel: linkedItem.colorModel || item.colorModel || '',
                sizeCm: linkedItem.sizeCm || item.sizeCm || '',
                thickness: linkedItem.thickness || item.thickness || '',
                productionNotes: linkedItem.notes || item.productionNotes || ''
              };
            }
          }
          return { ...item, hasProductionDetails: item.itemStatus === 'قيد الإنتاج' };
        })
      }));
    } else {
      setEditingOrder(null);
      setLinkedProductionOrder(null);
      const maxNum = orders.reduce((max, o) => {
        const str = String(o.orderNumber || '');
        if (str.startsWith('ORD-')) {
          const match = str.match(/ORD-(\d+)/);
          return match ? Math.max(max, parseInt(match[1], 10)) : max;
        }
        return max;
      }, 0);
      const nextOrderNumber = `ORD-${String(maxNum + 1).padStart(4, '0')}`;
      
      setFormData({
        orderNumber: nextOrderNumber,
        customerId: '',
        customerName: '',
        orderDate: getLocalDateStr(new Date()),
        status: 'جديد',
        orderNotes: '',
        items: [{ productName: '', quantity: '', notes: '', itemStatus: '' }]
      });
    }
    setShowModal(true);
  };

  const handleOpenPreview = async (order) => {
    let orderToPreview = { ...order };
    if (order.items && order.items.some(i => i.itemStatus === 'قيد الإنتاج')) {
      const prodOrders = await getOrders();
      const linked = prodOrders.find(po => po.salesOrderNumber === order.orderNumber);
      if (linked) {
        orderToPreview.productionOrderNumber = linked.orderNumber;
      }
    }
    setSelectedOrder(orderToPreview);
    setShowPreview(true);
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productName: '', quantity: '', notes: '', itemStatus: '' }]
    });
  };

  const handleAddNewStockItem = () => {
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

    const categories = globalSettings?.stockCategories || ['الأصول', 'مستهلكات الخياطة'];
    const defaultCategory = categories[0] || 'الأصول';
    const initialData = {
      itemNumber: generateNextID(defaultCategory),
      category: defaultCategory,
      warehouse: globalSettings?.warehouses?.[0] || 'المستودع الرئيسي',
      itemCode: '',
      name: '',
      location: '',
      spec: '',
      unit: globalSettings.stockUnits?.[0] || 'عدد',
      quantity: 1,
      minLimit: 0,
      lastMovement: 'إدخال',
      lastMovementDate: new Date().toISOString().split('T')[0],
      lastRecipient: user?.name || '',
      notes: ''
    };

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

        // Location select management
        const locationSelect = document.getElementById('swal-location');
        const addBtn = document.getElementById('swal-add-location-btn');
        if (addBtn && locationSelect) {
          addBtn.addEventListener('click', async () => {
            const { value: newLoc } = await Swal.fire({
              title: 'إضافة رف جديد',
              input: 'text',
              inputPlaceholder: 'مثال: رف 6',
              showCancelButton: true,
              confirmButtonText: 'إضافة',
              cancelButtonText: 'إلغاء'
            });
            if (newLoc && newLoc.trim()) {
              const name = newLoc.trim();
              const optionExists = Array.from(locationSelect.options).some(opt => opt.value === name);
              if (!optionExists) {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                locationSelect.appendChild(opt);
              }
              locationSelect.value = name;

              const updatedLocations = [...(globalSettings.stockLocations || [])];
              if (!updatedLocations.includes(name)) {
                updatedLocations.push(name);
                await saveGlobalSettings({
                  ...globalSettings,
                  stockLocations: updatedLocations
                });
                globalSettings.stockLocations = updatedLocations;
              }
            }
          });
        }
      },
      html: `
        <div class="premium-modal-header">
          <div class="premium-modal-title">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package text-primary"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
             <span>إضافة صنف جديد للمخزون</span>
          </div>
          <div class="premium-modal-close" onclick="Swal.close()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </div>
        </div>
        <div class="premium-form text-right" style="direction: rtl;">
          <div class="grid grid-cols-12 gap-x-8 gap-y-8">
            <!-- Row 1: Item Number, Name, Category -->
            <div class="premium-form-group col-span-12 md:col-span-3">
              <label>رقم الصنف (ID)</label>
              <input id="swal-itemNumber" class="premium-input" placeholder="SKU-00001" value="${initialData.itemNumber}" disabled style="background: var(--surface); cursor: not-allowed; font-weight: bold; color: var(--primary-dark); text-align: center;">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-6">
              <label>اسم الصنف</label>
              <input id="swal-name" class="premium-input" placeholder="مثال: قماش أبيض تركي" value="${initialData.name}">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-3">
              <label>التصنيف</label>
              <select id="swal-category" class="premium-input">
                <option value="" disabled>اختر التصنيف</option>
                ${categories.map(c => `<option value="${c}" ${initialData.category === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>

            <!-- Row 2: Item Code, Warehouse -->
            <div class="premium-form-group col-span-12 md:col-span-3">
              <label>رمز الصنف</label>
              <input id="swal-itemCode" class="premium-input" placeholder="" value="${initialData.itemCode || ''}">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>المخزن</label>
              <select id="swal-warehouse" class="premium-input">
                <option value="" disabled>اختر المخزن</option>
                ${(globalSettings?.warehouses || ['المستودع الرئيسي']).map(w => `<option value="${w}" ${initialData.warehouse === w ? 'selected' : ''}>${w}</option>`).join('')}
              </select>
            </div>

            <!-- Row 3: Location (Full Width Dropdown + Add Button) -->
            <div class="premium-form-group col-span-12" id="swal-location-container">
              <label>الموقع (داخل المخزن)</label>
              <div class="flex gap-2">
                <select id="swal-location" class="premium-input" style="flex: 1;">
                  <option value="">-- اختر الرف --</option>
                  ${(globalSettings.stockLocations || []).map(l => `<option value="${l}" ${initialData.location === l ? 'selected' : ''}>${l}</option>`).join('')}
                </select>
                <button type="button" id="swal-add-location-btn" style="width: 42px; height: 42px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer; margin-top: 0;">+</button>
              </div>
            </div>

            <!-- Row 4: Spec, Quantity, MinLimit -->
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>اللون / المواصفة</label>
              <select id="swal-spec" class="premium-input">
                <option value="">اختر اللون/المواصفة</option>
                ${(globalSettings?.stockColors || []).map(c => `<option value="${c}" ${initialData.spec === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>

            <div class="premium-form-group col-span-12 md:col-span-4">
              <label class="text-primary">الكمية الحالية</label>
              <div class="flex gap-2">
                <input id="swal-quantity" type="number" class="premium-input" style="flex: 2;" value="${initialData.quantity}">
                <select id="swal-unit" class="premium-input" style="flex: 1;">
                  ${(globalSettings?.stockUnits || ['عدد', 'متر', 'كغم']).map(u => `<option value="${u}" ${initialData.unit === u ? 'selected' : ''}>${u}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>الحد الأدنى (تنبيه)</label>
              <input id="swal-minLimit" type="number" class="premium-input" value="${initialData.minLimit}">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>آخر حركة</label>
              <select id="swal-lastMovement" class="premium-input">
                <option value="إدخال" ${initialData.lastMovement === 'إدخال' ? 'selected' : ''}>إدخال</option>
                <option value="إخراج" ${initialData.lastMovement === 'إخراج' ? 'selected' : ''}>إخراج</option>
                <option value="تحويل" ${initialData.lastMovement === 'تحويل' ? 'selected' : ''}>تحويل</option>
              </select>
            </div>

            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>تاريخ آخر حركة</label>
              <input id="swal-lastMovementDate" type="date" class="premium-input" value="${initialData.lastMovementDate}">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>آخر مستلم / مسؤول</label>
              <input id="swal-lastRecipient" class="premium-input" placeholder="اسم الشخص" value="${initialData.lastRecipient}">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>ملاحظات</label>
              <input id="swal-notes" class="premium-input" placeholder="أي ملاحظات..." value="${initialData.notes}">
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'حفظ الصنف الجديد',
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
          id: null
        };

        if (!data.itemNumber || !data.name || !data.warehouse || !data.category) {
          Swal.showValidationMessage('يرجى ملء الاسم والتصنيف ورقم الصنف والمخزن');
          return false;
        }
        if (data.itemCode && data.itemCode.trim().length !== 13) {
          Swal.showValidationMessage('يجب أن يتكون رمز الصنف من 13 خانة بالضبط');
          return false;
        }

        const existingInWarehouse = stock.find(s => 
          s.itemNumber === data.itemNumber && 
          s.warehouse === data.warehouse &&
          s.spec === data.spec
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
            action: 'إضافة',
            details: 'إضافة صنف مخزون من شاشة الطلبيات: ' + res.name + ' (' + res.itemNumber + ')'
          });
          
          Swal.fire({
            icon: 'success',
            title: 'تم الحفظ بنجاح',
            text: 'تمت إضافة الصنف للمخزون. يمكنك الآن اختياره من القائمة.',
            timer: 2000,
            showConfirmButton: false
          });
          
          const updatedStock = await getStock();
          setStock(updatedStock);
        }
      }
    });
  };
  const handleAddProductionItem = async (index) => {
    const item = formData.items[index];
    
    // Check if we already have variants for this item in the linked production order
    let existingVariants = [];
    if (linkedProductionOrder && linkedProductionOrder.items) {
      existingVariants = linkedProductionOrder.items.filter(i => i.productName === item.productName);
    }
    
    if (existingVariants.length > 0) {
      setProductionVariants(existingVariants);
    } else {
      setProductionVariants([{ 
        productName: item.productName,
        quantity: item.quantity || '', 
        colorModel: '', 
        sizeCm: '', 
        thickness: '', 
        productionNotes: '',
        status: 'لم يتم التنفيذ'
      }]);
    }
    
    setVariantModalIndex(index);
    setShowVariantsModal(true);
  };

  const handleAddVariant = () => {
    const item = formData.items[variantModalIndex];
    setProductionVariants([...productionVariants, {
      productName: item.productName,
      quantity: '',
      colorModel: '',
      sizeCm: '',
      thickness: '',
      productionNotes: '',
      status: 'لم يتم التنفيذ'
    }]);
  };

  const handleRemoveVariant = (idx) => {
    const newV = [...productionVariants];
    newV.splice(idx, 1);
    setProductionVariants(newV);
  };

  const handleVariantChange = (idx, field, val) => {
    const newV = [...productionVariants];
    
    if (field === 'thickness') {
      val = val.replace(/[^0-9]/g, '').slice(0, 2);
    } else if (field === 'sizeCm') {
      let cleaned = val.replace(/[^0-9*]/g, '');
      let parts = cleaned.split('*');
      if (parts.length > 2) {
        cleaned = parts[0] + '*' + parts.slice(1).join('');
        parts = cleaned.split('*');
      }
      if (parts[0].length > 3) parts[0] = parts[0].slice(0, 3);
      if (parts.length > 1 && parts[1].length > 3) parts[1] = parts[1].slice(0, 3);
      val = parts.join('*');
    }

    newV[idx][field] = val;
    setProductionVariants(newV);
  };

  const handleSaveVariants = async () => {
    const item = formData.items[variantModalIndex];
    const targetQty = Number(item.quantity) || 0;
    const sumQty = productionVariants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);
    
    const invalidColorIdx = productionVariants.findIndex(v => !v.colorModel);
    if (invalidColorIdx !== -1) {
      Swal.fire('خطأ في الإدخال', `يرجى اختيار اللون / الموديل في السطر رقم ${invalidColorIdx + 1}`, 'error');
      return;
    }

    const invalidEmptySizeIdx = productionVariants.findIndex(v => !v.sizeCm || v.sizeCm.trim() === '');
    if (invalidEmptySizeIdx !== -1) {
      Swal.fire('خطأ في الإدخال', `يرجى إدخال المقاس في السطر رقم ${invalidEmptySizeIdx + 1}`, 'error');
      return;
    }

    const invalidThicknessIdx = productionVariants.findIndex(v => !v.thickness || v.thickness.trim() === '');
    if (invalidThicknessIdx !== -1) {
      Swal.fire('خطأ في الإدخال', `يرجى إدخال السماكة في السطر رقم ${invalidThicknessIdx + 1}`, 'error');
      return;
    }

    if (sumQty !== targetQty) {
      Swal.fire('خطأ في الكمية', `مجموع كميات الألوان والموديلات (${sumQty}) لا يساوي الكمية المطلوبة للصنف (${targetQty})`, 'error');
      return;
    }

    const invalidSizeIdx = productionVariants.findIndex(v => !v.sizeCm || !/^\d{1,3}\*\d{1,3}$/.test(v.sizeCm.trim()));
    if (invalidSizeIdx !== -1) {
      Swal.fire('خطأ في الإدخال', `يرجى إدخال المقاس بالصيغة الصحيحة (مثال: 200*180) مستخدماً إشارة * فقط، في السطر رقم ${invalidSizeIdx + 1}`, 'error');
      return;
    }

    let prodNum = linkedProductionOrder?.orderNumber;
    if (!prodNum) {
       try {
         const allProd = await getOrders();
         const maxNum = allProd.reduce((max, o) => {
           const match = String(o.orderNumber || '').match(/\d+/);
           return match ? Math.max(max, parseInt(match[0], 10)) : max;
         }, 0);
         prodNum = `PRO-${String(maxNum + 1).padStart(4, '0')}`;
       } catch (e) {
         prodNum = 'سيتم إنشاؤه تلقائياً';
        }
    }

    if (linkedProductionOrder) {
      const filteredItems = (linkedProductionOrder.items || []).filter(i => i.productName !== item.productName);
      setLinkedProductionOrder({
        ...linkedProductionOrder,
        orderNumber: linkedProductionOrder.orderNumber || prodNum,
        items: [...filteredItems, ...productionVariants]
      });
    } else {
      setLinkedProductionOrder({
        id: null,
        orderNumber: prodNum,
        salesOrderNumber: formData.orderNumber,
        customerId: formData.customerId,
        customerName: formData.customerName,
        orderDate: formData.orderDate,
        deliveryDate: formData.deliveryDate,
        status: 'لم يتم التنفيذ',
        orderNotes: `مرتبط بطلبية مبيعات رقم ${formData.orderNumber}`,
        items: [...productionVariants]
      });
    }
    
    const updatedItems = [...formData.items];
    updatedItems[variantModalIndex] = { ...updatedItems[variantModalIndex], hasProductionDetails: true };
    setFormData({ ...formData, items: updatedItems });

    Swal.fire({
      icon: 'success',
      title: 'تم الإضافة مؤقتاً',
      text: 'تمت إضافة الأصناف الفرعية لكرت الإنتاج في الذاكرة، سيتم الحفظ النهائي عند الضغط على "حفظ الطلبية".',
      timer: 3000,
      showConfirmButton: false
    });
    
    setShowVariantsModal(false);
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
              البائع (مندوب المبيعات) *
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
          Swal.showValidationMessage('يرجى اختيار البائع (مندوب المبيعات)');
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
            details: `إضافة العميل (من الطلبيات): ${result.value.name}`
          });
          Swal.fire({ title: 'تم الحفظ', text: 'تمت إضافة العميل بنجاح', icon: 'success', timer: 1500, showConfirmButton: false });
        }
      }
    });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerName || formData.items.some(item => !item.productName || !item.quantity)) {
      Swal.fire('خطأ', 'يرجى ملء جميع الحقول المطلوبة (العميل والأصناف)', 'error');
      return;
    }

    if (formData.items.some(item => !item.itemStatus)) {
      Swal.fire('خطأ', 'يرجى تحديد حالة الصنف لكل الأصناف المطلوبة', 'error');
      return;
    }

    const productNames = formData.items.map(i => i.productName).filter(Boolean);
    const uniqueProductNames = new Set(productNames);
    if (uniqueProductNames.size !== productNames.length) {
      Swal.fire('خطأ', 'لا يمكن تكرار نفس الصنف في نفس الطلبية. يرجى تجميع الكمية في سطر واحد.', 'error');
      return;
    }



    const unlinkedProductionItem = formData.items.find(item => item.itemStatus === 'قيد الإنتاج' && !item.hasProductionDetails);
    
    if (unlinkedProductionItem) {
      Swal.fire('تنبيه', `الصنف "${unlinkedProductionItem.productName}" قيد الإنتاج ولكن لم يتم إضافة تفاصيله لكرت الإنتاج. يرجى الضغط على زر (+) بجانبه لإضافتها.`, 'warning');
      return;
    }

    const dataToSave = {
      ...formData,
      createdBy: formData.createdBy || user?.name || 'مدير',
      lastActionBy: user?.name || 'مدير',
      statusUpdateDate: getLocalDateStr(new Date())
    };

    const result = await saveSalesOrder(dataToSave);

    if (result) {
      if (linkedProductionOrder && linkedProductionOrder.items?.length > 0) {
        const prodData = {
          ...linkedProductionOrder,
          customerId: result.customerId,
          customerName: result.customerName,
          deliveryDate: result.deliveryDate || linkedProductionOrder.deliveryDate,
          salesOrderId: result.id,
          salesOrderNumber: result.orderNumber,
          createdBy: linkedProductionOrder.createdBy || user?.name || 'مدير',
          lastActionBy: user?.name || 'مدير'
        };
        try {
          const savedProd = await saveOrder(prodData);
          if (!savedProd) {
            Swal.fire('خطأ في الإنتاج', 'تم حفظ الطلبية بنجاح، ولكن تعذر إنشاء كرت الإنتاج. يرجى مراجعة الإدارة.', 'error');
            console.error("Failed to save production order with data:", prodData);
          }
        } catch (e) {
          console.error("Error saving production order:", e, prodData);
          Swal.fire('خطأ', 'حدث خطأ غير متوقع أثناء حفظ كرت الإنتاج.', 'error');
        }
      }

      await addLog({
        userName: user.name,
        userId: user.id,
        module: 'طلبيات العملاء',
        action: editingOrder ? 'تعديل' : 'إضافة',
        details: `${editingOrder ? 'تعديل' : 'إضافة'} طلبية رقم: ${result.orderNumber} للعميل: ${result.customerName}`
      });
      await checkAndCreateMission(result, dataToSave.status);

      Swal.fire({
        title: editingOrder ? 'تم التعديل' : 'تمت الإضافة',
        text: editingOrder ? 'تم تحديث الطلبية بنجاح' : 'تم إضافة الطلبية بنجاح برقم ' + result.orderNumber,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      setShowModal(false);
      fetchData();
    }
  };

  const checkAndCreateMission = async (order, newStatus) => {
    if (newStatus === 'تم التسليم للتوصيل' || newStatus === 'تم تسليمها للتوصيل' || newStatus === 'جاهز للتوصيل') {
      try {
        const allMissions = await getMissions();
        const existingMission = allMissions.find(m => m.salesOrderNumber === order.orderNumber);
        
        if (!existingMission) {
          const maxNum = allMissions.reduce((max, o) => {
            const str = String(o.missionNumber || '');
            if (str.startsWith('DEL-')) {
              const match = str.match(/DEL-(\d+)/);
              return match ? Math.max(max, parseInt(match[1], 10)) : max;
            }
            return max;
          }, 0);
          const nextMissionNumber = `DEL-${String(maxNum + 1).padStart(4, '0')}`;
          
          await saveMission({
            id: null,
            missionNumber: nextMissionNumber,
            type: 'تسليم طلبية',
            customType: '',
            sourceEntity: 'مرجاس للتجارة - قسم البياضات',
            targetEntity: order.customerName || '',
            details: `توصيل تلقائي لطلبية المبيعات رقم ${order.orderNumber} ${order.orderNotes ? '- ' + order.orderNotes : ''}`,
            assignedEmployeeId: '',
            assignedEmployeeName: '',
            dueDate: getLocalDateStr(new Date()),
            status: 'بانتظار الاستلام',
            salesOrderNumber: order.orderNumber
          });
        }
      } catch (err) {
        console.error("Error creating mission for sales order:", err);
      }
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
      await deleteSalesOrder(id);
      await addLog({
        userName: user.name,
        userId: user.id,
        module: 'طلبيات العملاء',
        action: 'حذف',
        details: `حذف طلبية رقم: ${orderToDelete?.orderNumber || id}`
      });
      Swal.fire({
        customClass: {
          container: 'premium-modal-container',
          popup: 'premium-modal-popup',
          confirmButton: 'btn-premium-save',
          actions: 'premium-modal-actions'
        },
        buttonsStyling: false,
        title: 'تم الحفظ',
        text: 'تم حذف الطلبية بنجاح',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
      fetchData();
    }
  };

  const handleUpdateStatus = async (order, newStatus) => {
    if ((order.status === 'تم التسليم للتوصيل' || order.status === 'تم تسليمها للتوصيل' || order.status === 'جاهز للتوصيل') && 
        (newStatus !== 'تم التسليم للتوصيل' && newStatus !== 'تم تسليمها للتوصيل' && newStatus !== 'جاهز للتوصيل')) {
      try {
        const allMissions = await getMissions();
        const linkedMission = allMissions.find(m => m.salesOrderNumber === order.orderNumber);
        if (linkedMission) {
          if (linkedMission.status !== 'بانتظار الاستلام') {
            MySwal.fire({
              title: 'لا يمكن سحب الطلبية',
              text: 'لقد قام قسم التوصيل باستلام الطلبية والبدء بها، لا يمكنك التراجع.',
              icon: 'error',
              confirmButtonText: 'حسناً',
              customClass: {
                container: 'premium-modal-container',
                popup: 'premium-modal-popup',
                confirmButton: 'btn-premium-save'
              }
            });
            fetchData();
            return;
          } else {
            await deleteMission(linkedMission.id);
          }
        }
      } catch (err) {
        console.error("Error checking linked mission:", err);
      }
    }

    if (newStatus === 'تم التوصيل' && order.status !== 'تم التوصيل') {
      try {
        const currentStock = await getStock();
        for (const item of (order.items || [])) {
          if (!item.productName || !item.quantity) continue;
          const stockItem = currentStock.find(s => s.name === item.productName);
          if (stockItem) {
            const deduction = Number(item.quantity) || 0;
            // السماح بالسالب كما طلبنا في التقرير
            const newQuantity = Number(stockItem.quantity) - deduction;
            await saveStockItem({
              ...stockItem,
              quantity: newQuantity,
              lastMovement: 'إخراج',
              lastMovementDate: getLocalDateStr(new Date()),
              lastRecipient: order.customerName,
              notes: `خصم تلقائي - طلبية مبيعات رقم ${order.orderNumber}`
            });
          }
        }
      } catch (err) {
        console.error("Error updating stock:", err);
      }
    }

    await checkAndCreateMission(order, newStatus);

    await saveSalesOrder({ ...order, status: newStatus, lastActionBy: user?.name || 'مدير', statusUpdateDate: getLocalDateStr(new Date()) });
    await addLog({
      userName: user.name,
      userId: user.id,
      module: 'طلبيات العملاء',
      action: 'تعديل حالة',
      details: `تغيير حالة طلبية رقم: ${order.orderNumber} إلى: ${newStatus}`
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
    
    if (sortConfig.key === 'orderNumber') {
      aVal = parseInt(aVal);
      bVal = parseInt(bVal);
    }
    
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredOrders = sortedOrders.filter(o => {
    const matchOrderNum = filterOrderNumber ? (o.orderNumber || '').toString().includes(filterOrderNumber) : true;
    const matchSearch = searchTerm ? ((o.orderNumber || '').toString().includes(searchTerm) || (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())) : true;
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
      case 'تم التوصيل': return 'badge-success';
      case 'التحضير': return 'badge-info';
      case 'قيد التوصيل': return 'badge-delivery';
      case 'تم تسليمها للتوصيل': return 'badge-delivery';
      case 'تم تأجيل التوصيل': return 'badge-warning';
      case 'لم يتم التنفيذ': return 'badge-danger';
      case 'ملغي': return 'badge-danger';
      default: return 'badge-info';
    }
  };

  return (
    <>
      {selectedOrder && createPortal(
        <div className="sales-print-layout" style={{ direction: 'rtl', padding: '1.5cm', fontFamily: 'Tajawal, sans-serif', background: 'white', color: '#333' }}>
          {/* Header */}
          <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src={globalSettings.logoUrl} alt={globalSettings.siteName} style={{ height: '75px', objectFit: 'contain' }} />
              <div>
                <h1 style={{ margin: 0, fontSize: '1.7rem', color: '#0f172a' }}>{globalSettings.siteName}</h1>
                <p style={{ margin: '4px 0 0', fontSize: '1.1rem', color: '#64748b' }}>تقرير طلبية تفصيلي</p>
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
                    <td style={{ color: '#64748b', fontWeight: 'bold' }}>حالة الطلبية:</td>
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
          <h3 style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', fontWeight: 'bold' }}>تفاصيل الأصناف المطلوبة</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'center', width: '40px', color: '#334155', fontSize: '1.1rem' }}>#</th>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#334155', fontSize: '1.1rem' }}>اسم الصنف</th>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'center', width: '100px', color: '#334155', fontSize: '1.1rem' }}>الكمية</th>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'center', width: '140px', color: '#334155', fontSize: '1.1rem' }}>حالة الصنف</th>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#334155', fontSize: '1.1rem' }}>ملاحظات إضافية</th>
              </tr>
            </thead>
            <tbody>
              {(selectedOrder.items || []).map((item, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 'bold', color: '#64748b', fontSize: '1.1rem' }}>{idx + 1}</td>
                  <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 'bold', color: '#0f172a', fontSize: '1.2rem' }}>{item.productName}</td>
                  <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: '900', color: '#0f172a', fontSize: '1.3rem' }}>{item.quantity}</td>
                  <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: '900', color: '#0f172a' }}>{item.itemStatus || '---'}</span>
                  </td>
                  <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#334155', fontSize: '1.1rem', fontWeight: '500' }}>{item.notes || '---'}</td>
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

      <div className="no-print">
        <div className="flex-responsive mb-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="text-primary" /> إدارة الطلبيات
            </h2>
            <p className="text-muted">تسجيل وتتبع طلبيات العملاء</p>
          </div>
        </div>

        <div className="glass-panel mb-4 no-print" style={{ padding: '1rem' }}>
          <div className="flex gap-4 items-center justify-between w-full flex-wrap">
            <div className="flex items-center gap-3 w-full md:max-w-md">
              <Search className="text-muted" size={20} />
              <input 
                type="text" 
                placeholder="بحث سريع (رقم، عميل)..." 
                className="input-field flex-1" 
                style={{ marginBottom: 0 }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select 
                className="input-field hidden md:block" 
                style={{ marginBottom: 0, minWidth: '150px' }}
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="">جميع الحالات</option>
                {globalSettings.salesStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              
              <button 
                className="btn btn-primary flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md"
                onClick={() => setShowFilterModal(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                <span>تصفية</span>
                {(filterOrderNumber || dateFrom || dateTo || selectedCustomer || selectedStatus || filterCreatedBy) && (
                  <span className="bg-white text-primary rounded-full px-2 py-0.5 text-[0.7rem] font-bold mr-1">نشط</span>
                )}
              </button>

              {canPerformAction(user, 'ADD', 'SALES', globalSettings) && (
                <button 
                  className="btn btn-primary flex items-center gap-2 shadow-sm" 
                  onClick={() => handleOpenModal()} 
                  disabled={loading}
                  style={loading ? {opacity: 0.6, cursor: 'not-allowed'} : {}}
                >
                  <Plus size={18} /> طلبية جديدة
                </button>
              )}
            </div>
          </div>
        </div>

        {showFilterModal && (
          <div className="modal-overlay no-print" style={{ zIndex: 1000 }}>
            <div className="modal-content animate-fade-in" style={{ maxWidth: '500px' }}>
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-xl font-bold flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-filter text-primary"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> تصفية مخصصة</h3>
                <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setShowFilterModal(false)}><X size={18} /></button>
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
                    {globalSettings.salesStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>أنشئت بواسطة</label>
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
                    <div className="flex items-center justify-center gap-1">رقم الطلب <ArrowUpDown size={14} className="text-muted" /></div>
                  </th>
                  <th className="text-right cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('customerName')}>
                    <div className="flex items-center justify-start gap-1">العميل <ArrowUpDown size={14} className="text-muted" /></div>
                  </th>
                  <th className="text-center">أنشئت بواسطة</th>
                  <th className="text-center">آخر إجراء</th>
                  <th className="text-center cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('orderDate')}>
                    <div className="flex items-center justify-center gap-1">التاريخ <ArrowUpDown size={14} className="text-muted" /></div>
                  </th>
                  <th className="text-center cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('status')}>
                    <div className="flex items-center justify-center gap-1">الحالة <ArrowUpDown size={14} className="text-muted" /></div>
                  </th>
                  <th className="text-center" style={{ textAlign: 'center' }}>تغيير الحالة</th>
                  <th className="text-center" style={{ textAlign: 'center' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => (
                  <tr key={order.id}>
                    <td data-label="رقم الطلب" className="font-bold text-primary text-center">{order.orderNumber}</td>
                    <td data-label="العميل" className="text-right font-bold text-slate-800">{order.customerName}</td>
                    <td data-label="أنشئت بواسطة" className="text-xs text-center">{order.createdBy || '---'}</td>
                    <td data-label="آخر إجراء" className="text-xs font-semibold text-center">{order.lastActionBy || '---'}</td>
                    <td data-label="التاريخ" className="text-center">{order.orderDate}</td>
                    <td data-label="الحالة" className="text-center">
                      <span 
                        className={`badge ${getStatusBadgeClass(order.status)}`}
                        style={{ width: '130px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      >
                        {order.status || 'جديد'}
                        {order.status === 'تم تأجيل التوصيل' && order.postponedDate && ` (${order.postponedDate})`}
                      </span>
                    </td>
                    <td data-label="تغيير الحالة" style={{ textAlign: 'center' }}>
                      <select 
                        className="input-field cursor-pointer" 
                        style={{ padding: '0 0.5rem', minWidth: '160px', width: 'auto', height: '36px', fontSize: '13px', borderRadius: '8px', marginBottom: 0, border: '1px solid var(--primary-light)', backgroundColor: '#f8fafc', margin: '0 auto', textAlign: 'center' }}
                        value={order.status || 'جديد'}
                        onChange={(e) => handleUpdateStatus(order, e.target.value)}
                      >
                        {globalSettings.salesStatuses.map(s => <option key={s} value={s}>{s}</option>)}
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
                          <button className="btn-premium-delete" title="حذف" onClick={() => handleDelete(order.id)}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content wide animate-fade-in">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h3 className="text-xl font-bold">
                    {editingOrder ? `تعديل طلبية ${editingOrder.orderNumber}` : 'إنشاء طلبية جديدة'}
                  </h3>
                <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    {/* الصف الأول: رقم الطلب والتاريخين */}
                    <div className="md:col-span-4 input-group mb-0">
                      <label className="font-bold text-slate-700 mb-2 block flex items-center gap-2"><ShoppingCart size={16} className="text-primary"/> رقم الطلب</label>
                      <input type="text" className="input-field bg-slate-100 font-bold text-primary" style={{ height: '42px', textAlign: 'center' }} value={formData.orderNumber || ''} readOnly disabled />
                    </div>
                    
                    <div className="md:col-span-4 input-group mb-0">
                      <label className="font-bold text-slate-700 mb-2 block flex items-center gap-2"><Calendar size={16} className="text-primary"/> تاريخ الطلب</label>
                      <Flatpickr className="input-field" style={{ height: '42px', backgroundColor: 'white' }} value={formData.orderDate} onChange={([d]) => setFormData({...formData, orderDate: getLocalDateStr(d)})} options={{ dateFormat: 'Y-m-d', disableMobile: true }} />
                    </div>
                    
                    <div className="md:col-span-4 input-group mb-0">
                      <label className="font-bold text-slate-700 mb-2 block flex items-center gap-2"><Calendar size={16} className="text-orange-500"/> تاريخ التسليم</label>
                      <Flatpickr className="input-field" style={{ height: '42px', backgroundColor: 'white' }} value={formData.deliveryDate || ''} onChange={([d]) => setFormData({...formData, deliveryDate: getLocalDateStr(d)})} options={{ dateFormat: 'Y-m-d', disableMobile: true }} />
                    </div>

                    {/* الصف الثاني: العميل وزر الإضافة */}
                    <div className="md:col-span-12 input-group mb-0">
                      <label className="flex items-center gap-2 mb-2 font-bold text-slate-700"><User size={16} className="text-primary"/> العميل</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Select 
                            options={customers.map(c => ({ value: c.id, label: c.name }))}
                            value={formData.customerId ? { value: formData.customerId, label: formData.customerName } : null}
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
                        <button type="button" className="btn btn-primary flex items-center justify-center gap-2 shadow-sm transition-all h-[42px]" onClick={handleAddNewCustomer} style={{ whiteSpace: 'nowrap', height: '42px' }}>
                          <Plus size={16} strokeWidth={2} /> إضافة عميل جديد
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100 flex-wrap gap-3">
                    <h4 className="font-bold text-lg flex items-center gap-2 text-slate-800"><Package size={20} className="text-primary" /> الأصناف المطلوبـة</h4>
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-outline flex items-center gap-1 border-primary text-primary hover:bg-primary hover:text-white transition-colors h-9 px-3 text-sm" onClick={handleAddNewStockItem}>
                        <Plus size={14} /> صنف للمخزون
                      </button>
                      <button type="button" className="btn btn-primary flex items-center gap-1 h-9 px-3 text-sm shadow-sm" onClick={handleAddItem}>
                        <Plus size={14} /> سطر جديد للطلبية
                      </button>
                    </div>
                  </div>
                  
                  <div className="modal-table-container rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="modal-table w-full">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th style={{ width: '60px', padding: '12px 10px', textAlign: 'center' }}>الترتيب</th>
                          <th style={{ padding: '12px 10px', textAlign: 'center', width: '35%' }}>اسم الصنف</th>
                          <th style={{ width: '90px', padding: '12px 10px', textAlign: 'center' }}>الكمية</th>
                          <th style={{ padding: '12px 10px', textAlign: 'center', width: '30%' }}>ملاحظات</th>
                          <th style={{ width: '130px', padding: '12px 10px', textAlign: 'center' }}>حالة الصنف</th>
                          <th style={{ width: '100px', padding: '12px 10px', textAlign: 'center' }}></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {formData.items.map((item, index) => (
                          <tr
                            key={index}
                            className={`drag-sort-row ${draggedItemIndex === index ? 'bg-slate-50 opacity-50' : 'hover:bg-slate-50 transition-colors'}`}
                            onDragOver={handleItemDragOver}
                            onDrop={(e) => handleItemDrop(e, index)}
                            onDragEnd={() => setDraggedItemIndex(null)}
                          >
                            <td className="p-2 text-center align-middle">
                              <div className="flex justify-center items-center gap-2">
                                <div className="flex items-center gap-2 px-1">
                                  <button type="button" style={{ background: 'transparent', border: 'none', padding: 0, margin: 0, outline: 'none', boxShadow: 'none' }} className="text-slate-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex justify-center items-center" title="رفع الصنف" onClick={() => handleMoveItem(index, -1)} disabled={index === 0}>
                                    <ArrowUp size={16} />
                                  </button>
                                  <button type="button" style={{ background: 'transparent', border: 'none', padding: 0, margin: 0, outline: 'none', boxShadow: 'none' }} className="text-slate-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex justify-center items-center" title="تنزيل الصنف" onClick={() => handleMoveItem(index, 1)} disabled={index === formData.items.length - 1}>
                                    <ArrowDown size={16} />
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="p-2 text-center align-middle">
                              <SearchableDropdown
                                options={Array.from(new Set(stock.map(s => s.name).filter(Boolean)))}
                                value={item.productName}
                                onChange={(val) => handleItemChange(index, 'productName', val)}
                                onBlur={() => {
                                  const val = item.productName;
                                  const validOptions = Array.from(new Set(stock.map(s => s.name).filter(Boolean)));
                                  if (val && !validOptions.includes(val)) {
                                    Swal.fire('تنبيه', 'يجب اختيار صنف موجود في المخزون أو إضافته أولاً', 'warning');
                                    handleItemChange(index, 'productName', '');
                                  }
                                }}
                              />
                            </td>
                            <td className="p-2 text-center align-middle">
                              <input 
                                type="text" 
                                className="w-full border border-slate-200 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-center mx-auto" 
                                style={{ height: '38px', maxWidth: '80px' }} 
                                value={item.quantity} 
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '' || /^\d{1,4}$/.test(val)) {
                                    handleItemChange(index, 'quantity', val);
                                  }
                                }} 
                              />
                            </td>
                            <td className="p-2 text-center align-middle">
                              <input type="text" className="w-full border border-slate-200 rounded-lg px-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-center" style={{ height: '38px' }} value={item.notes} onChange={(e) => handleItemChange(index, 'notes', e.target.value)} placeholder="ملاحظات..." />
                            </td>
                            <td className="p-2 text-center align-middle">
                               <select 
                                 className="w-full border border-slate-200 rounded-lg px-2 bg-slate-50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-center mx-auto disabled:opacity-70 disabled:cursor-not-allowed" 
                                 style={{ height: '38px', fontSize: '0.85rem' }} 
                                 value={item.itemStatus || ''} 
                                 onChange={(e) => handleItemChange(index, 'itemStatus', e.target.value)}
                                 disabled={item.itemStatus === 'قيد الإنتاج' || item.itemStatus === 'جاهز'}
                                 title={item.itemStatus === 'قيد الإنتاج' ? 'لا يمكن تعديل حالة الصنف من قسم المبيعات لأنه قيد الإنتاج' : (item.itemStatus === 'جاهز' ? 'الصنف جاهز ومجمد تلقائياً من الإنتاج' : '')}
                               >
                                 <option value="">-- اختر --</option>
                                 {(globalSettings.salesItemStatuses || []).map(s => <option key={s} value={s}>{s}</option>)}
                               </select>
                             </td>
                            <td className="p-2 text-center align-middle">
                               <div className="flex gap-2 justify-center items-center">
                                 {item.itemStatus === 'قيد الإنتاج' && isAdmin(user) && (
                                   <button type="button" className={item.hasProductionDetails ? "icon-btn text-primary hover:bg-primary/10" : "icon-btn icon-btn-add"} onClick={() => handleAddProductionItem(index)} title={item.hasProductionDetails ? 'تعديل تفاصيل الإنتاج' : 'إضافة لكرت الإنتاج'}>
                                     {item.hasProductionDetails ? <Edit2 size={16} strokeWidth={2} /> : <Plus size={16} strokeWidth={2} />}
                                   </button>
                                 )}
                                 {(() => {
                                   const isStarted = item.hasProductionDetails && linkedProductionOrder && (
                                     (linkedProductionOrder.items?.find(pi => pi.productName === item.productName)?.status || 'لم يتم التنفيذ') !== 'لم يتم التنفيذ'
                                   );
                                   const isDisabled = formData.items.length === 1 || isStarted;
                                   
                                   return (
                                     <button 
                                       type="button" 
                                       className={`icon-btn ${isDisabled ? 'opacity-50 cursor-not-allowed text-slate-400' : 'icon-btn-delete'}`} 
                                       onClick={() => handleRemoveItem(index)} 
                                       disabled={isDisabled} 
                                       title={isStarted ? 'لا يمكن حذف الصنف لأن قسم الإنتاج قد بدأ العمل عليه' : 'حذف الصنف'}
                                     >
                                       <Trash2 size={16} strokeWidth={2} />
                                     </button>
                                   );
                                 })()}
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    <div className="md:col-span-4 input-group mb-0">
                      <label className="font-bold text-slate-700 mb-2 block flex items-center gap-2"><Activity size={16} className="text-primary"/> حالة الطلبية</label>
                      <select className="input-field" style={{ height: '42px', backgroundColor: 'white' }} value={formData.status || 'جديد'} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                        {globalSettings.salesStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-8 input-group mb-0">
                      <label className="font-bold text-slate-700 mb-2 block flex items-center gap-2"><FileText size={16} className="text-slate-500"/> ملاحظات الطلبية</label>
                      <textarea
                        className="input-field"
                        rows="1"
                        style={{ minHeight: '42px', backgroundColor: 'white', resize: 'vertical' }}
                        value={formData.orderNotes || ''}
                        onChange={(e) => setFormData({...formData, orderNotes: e.target.value})}
                        placeholder="أضف أية ملاحظات عامة تخص هذه الطلبية..."
                      />
                    </div>
                  </div>
                </div>

                <div className="premium-modal-actions">
                  <button type="submit" className="btn-premium-save">{editingOrder ? 'حفظ التعديلات' : 'حفظ الطلبية'}</button>
                  <button type="button" className="btn-premium-cancel" onClick={() => setShowModal(false)}>إلغاء</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showPreview && selectedOrder && (
          <div className="modal-overlay no-print">
            <div className="modal-content wide animate-fade-in">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-xl font-bold">معاينة الطلبية وتصدير PDF</h3>
                <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setShowPreview(false)}><X size={18} /></button>
              </div>
              
              <div className="bg-white p-8 border rounded-2xl shadow-sm mb-6 relative overflow-hidden" style={{ direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full" style={{ zIndex: 0 }}></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-tr-full" style={{ zIndex: 0 }}></div>
                
                <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-100 relative" style={{ zIndex: 1 }}>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-2">
                      <span className="text-primary">طلبية رقم</span> #{selectedOrder.orderNumber}
                    </h2>
                    {selectedOrder.productionOrderNumber && (
                      <div className="mb-2 inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl">
                        <span className="text-red-600 font-black text-xl">مرتبطة بكرت إنتاج:</span>
                        <span className="text-red-700 font-black text-2xl tracking-wider" dir="ltr">{selectedOrder.productionOrderNumber}</span>
                      </div>
                    )}
                    <div className="text-slate-500 font-bold flex items-center gap-2">
                      <Calendar size={16} /> {selectedOrder.orderDate}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-primary/10 text-primary">
                      الحالة: {selectedOrder.status || '---'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100 relative" style={{ zIndex: 1 }}>
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 text-sm font-bold">اسم العميل</span>
                    <span className="text-slate-800 font-bold text-lg">{selectedOrder.customerName}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 text-sm font-bold">تاريخ التسليم</span>
                    <span className="text-slate-800 font-bold text-lg" style={{ color: '#dc2626' }}>{selectedOrder.deliveryDate || 'غير محدد'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 text-sm font-bold">ملاحظات الطلبية</span>
                    <span className="text-slate-800 font-bold">{selectedOrder.orderNotes || 'لا توجد ملاحظات'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 text-sm font-bold">أُنشئت بواسطة</span>
                    <span className="text-slate-700 font-bold">{selectedOrder.createdBy || '---'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 text-sm font-bold">آخر إجراء</span>
                    <span className="text-slate-700 font-bold">{selectedOrder.lastActionBy || '---'}</span>
                  </div>
                </div>

                <h4 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2 relative" style={{ zIndex: 1 }}>
                  <Package size={20} className="text-primary" /> الأصناف المطلوبة
                </h4>
                
                <div className="overflow-hidden rounded-xl border-2 border-slate-300 relative" style={{ zIndex: 1 }}>
                  <table className="w-full text-right" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="bg-slate-200 text-slate-800 text-sm">
                        <th className="p-3 font-bold border border-slate-300 w-12 text-center">#</th>
                        <th className="p-3 font-bold border border-slate-300">اسم الصنف</th>
                        <th className="p-3 font-bold border border-slate-300 text-center">الكمية</th>
                        <th className="p-3 font-bold border border-slate-300 text-center">الحالة</th>
                        <th className="p-3 font-bold border border-slate-300">ملاحظات الصنف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedOrder.items || []).map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-center text-slate-700 font-bold border border-slate-300">{i + 1}</td>
                          <td className="p-3 font-bold text-primary border border-slate-300">{item.productName}</td>
                          <td className="p-3 text-center font-black text-slate-800 bg-slate-50/50 border border-slate-300">{item.quantity}</td>
                          <td className="p-3 text-center border border-slate-300">
                            <span className="inline-flex px-3 py-1 rounded-md text-xs font-bold bg-white text-slate-700 border border-slate-300 shadow-sm">
                              {item.itemStatus || '---'}
                            </span>
                          </td>
                          <td className="p-3 text-sm text-slate-700 font-bold border border-slate-300">{item.notes || '---'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-4">
                <button className="btn btn-primary flex-1" onClick={triggerPrint}><Printer size={18} /> طباعة / تصدير PDF</button>
                <button className="btn btn-outline flex-1" onClick={() => setShowPreview(false)}>إغلاق</button>
              </div>
            </div>
          </div>
        )}

        {/* Variants Modal */}
        {showVariantsModal && variantModalIndex !== null && (
          <div className="modal-overlay no-print" style={{ zIndex: 2000 }}>
            <div className="modal-content wide animate-fade-in" style={{ maxWidth: '900px' }}>
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Package className="text-primary" />
                  <span>تفصيل الألوان والكميات للصنف: {formData.items[variantModalIndex]?.productName}</span>
                </h3>
                <button type="button" className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setShowVariantsModal(false)}><X size={18} /></button>
              </div>

              <div className="mb-4 bg-primary/10 border border-primary/20 p-4 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-slate-600 font-bold">الكمية المطلوبة الإجمالية للصنف:</span>
                  <span className="font-black text-primary text-xl mr-2">{formData.items[variantModalIndex]?.quantity}</span>
                </div>
                <div>
                  <span className="text-slate-600 font-bold">المجموع الحالي للألوان:</span>
                  <span className={`font-black text-xl mr-2 ${productionVariants.reduce((s, v) => s + (Number(v.quantity)||0), 0) !== Number(formData.items[variantModalIndex]?.quantity) ? 'text-red-500' : 'text-emerald-600'}`}>
                    {productionVariants.reduce((s, v) => s + (Number(v.quantity)||0), 0)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto mb-4 border border-slate-200 rounded-xl">
                <table className="w-full text-right bg-white" style={{ borderCollapse: 'collapse' }}>
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-3 text-slate-700 font-bold" style={{ width: '25%' }}>اللون / الموديل</th>
                      <th className="p-3 text-slate-700 font-bold text-center" style={{ width: '15%' }}>الكمية</th>
                      <th className="p-3 text-slate-700 font-bold text-center" style={{ width: '15%' }}>المقاس (سم)</th>
                      <th className="p-3 text-slate-700 font-bold text-center" style={{ width: '15%' }}>السماكة (سم)</th>
                      <th className="p-3 text-slate-700 font-bold" style={{ width: '20%' }}>ملاحظات</th>
                      <th className="p-3 text-slate-700 font-bold text-center" style={{ width: '10%' }}>حذف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productionVariants.map((variant, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-2">
                          <select 
                            className="input-field w-full mb-0 bg-white" 
                            value={variant.colorModel} 
                            onChange={(e) => handleVariantChange(idx, 'colorModel', e.target.value)}
                          >
                            <option value="">اختر اللون...</option>
                            {(globalSettings.stockColors || []).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="p-2">
                          <input 
                            type="number" 
                            className="input-field w-full mb-0 text-center font-bold text-primary" 
                            value={variant.quantity} 
                            onChange={(e) => handleVariantChange(idx, 'quantity', e.target.value)}
                            min="1"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="text" 
                            className="input-field w-full mb-0 text-center" 
                            placeholder="مثال 200*200"
                            value={variant.sizeCm} 
                            onChange={(e) => handleVariantChange(idx, 'sizeCm', e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="text" 
                            className="input-field w-full mb-0 text-center" 
                            value={variant.thickness} 
                            onChange={(e) => handleVariantChange(idx, 'thickness', e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="text" 
                            className="input-field w-full mb-0" 
                            placeholder="ملاحظات..."
                            value={variant.productionNotes} 
                            onChange={(e) => handleVariantChange(idx, 'productionNotes', e.target.value)}
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button 
                            type="button" 
                            className="icon-btn icon-btn-delete mx-auto disabled:opacity-50"
                            onClick={() => handleRemoveVariant(idx)}
                            disabled={productionVariants.length <= 1}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-start mb-6">
                <button type="button" className="btn btn-outline border-dashed border-2 flex items-center gap-2 text-slate-600 hover:text-primary hover:border-primary transition-colors" onClick={handleAddVariant}>
                  <Plus size={16} /> إضافة لون آخر
                </button>
              </div>

              <div className="flex gap-4">
                <button className="btn btn-primary flex-1" onClick={handleSaveVariants}>حفظ الألوان للإنتاج</button>
                <button className="btn btn-outline flex-1" onClick={() => setShowVariantsModal(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        )}

      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        #print-portal { display: none; }
        @media print {
          @page { margin: 0.5cm; }
          #root { display: none !important; }
          #print-portal { display: block !important; }
          .sales-print-layout { display: block !important; background: white; width: 100%; }
        }
        .badge-info { background: #e0f2f1; color: #00796b; border: 1px solid #b2dfdb; }
        .badge-cutting { background: #fff3e0; color: #ef6c00; border: 1px solid #ffcc80; }
        .badge-warehouse { background: #fffde7; color: #fbc02d; border: 1px solid #fff59d; }
        .badge-success { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
        .badge-danger { background: #ffebee; color: #c62828; border: 1px solid #ef9a9a; }
        .badge-delivery { background: #e3f2fd; color: #1e3a8a; border: 1px solid #bfdbfe; }
        .badge-warning { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
      `}} />
    </>
  );
};

export default AdminSales;
