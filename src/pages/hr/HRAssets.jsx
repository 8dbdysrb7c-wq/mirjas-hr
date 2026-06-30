import React, { useState, useEffect } from 'react';
import { getHRAssets, saveHRAsset, deleteHRAsset, getEmployees, getGlobalSettings, getStock, saveStockItem } from '../../store';
import { Package, Plus, Search, Filter, AlertTriangle, CheckCircle, XCircle, ArrowRightLeft, Edit2, Trash2, Calendar, FileText, User, RefreshCw, BarChart2, Eye, X, Activity, ArrowUp, ArrowDown, Printer, FileDown } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import SearchableDropdown from '../../components/SearchableDropdown';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';

const MySwal = withReactContent(Swal);

const getLocalDateStr = (d) => {
  if (!d) return '';
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const ASSET_STATUS_COLORS = {
  'نشطة': 'badge-primary',
  'مسترجعة': 'badge-success',
  'منقولة لموظف آخر': 'badge-warning',
  'تالفة': 'badge-danger',
  'مفقودة': 'badge-danger',
  'قيد الصيانة': 'badge-warning'
};

const HRAssets = ({ user }) => {
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [globalSettings, setGlobalSettings] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('جميع الحالات');
  const [filterEmployee, setFilterEmployee] = useState('');

  const [view, setView] = useState('list'); // 'list' or 'form'
  const [editingAsset, setEditingAsset] = useState(null);
  const [formData, setFormData] = useState({
    assetNumber: '',
    name: '',
    employeeId: '',
    employeeName: '',
    handoverDate: new Date().toISOString().split('T')[0],
    status: 'نشطة',
    notes: '',
    items: [],
    lastInspectionDate: '',
    inspectionResult: '',
    nextInspectionDate: ''
  });

  const [newItemCategory, setNewItemCategory] = useState('الأصول');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    const [assetsData, empsData, stockData, settingsData] = await Promise.all([
      getHRAssets(),
      getEmployees(),
      getStock(),
      getGlobalSettings()
    ]);
    setAssets(assetsData);
    setEmployees(empsData.filter(e => e.status !== 'مفصول' && e.status !== 'مستقيل'));
    setStockItems(stockData || []);
    setGlobalSettings(settingsData || {});
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (asset = null) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        ...asset,
        employeeId: asset.employeeId || '',
        items: asset.items || (asset.name ? [{ id: Date.now().toString(), name: asset.name, category: asset.category || 'الأصول', quantity: 1, status: asset.status || 'نشطة' }] : [])
      });
      setNewItemCategory('الأصول');
      setNewItemName('');
      setNewItemQuantity(1);
    } else {
      setEditingAsset(null);
      // Generate automatic asset number
      let maxNum = 0;
      assets.forEach(a => {
        if (a.assetNumber && a.assetNumber.startsWith('AST-')) {
          const num = parseInt(a.assetNumber.replace('AST-', ''), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      const nextNum = `AST-${String(maxNum + 1).padStart(4, '0')}`;
      
      setFormData({
        assetNumber: nextNum,
        name: '',
        items: [],
        employeeId: '',
        employeeName: '',
        handoverDate: new Date().toISOString().split('T')[0],
        status: 'نشطة',
        notes: '',
        lastInspectionDate: '',
        inspectionResult: '',
        nextInspectionDate: ''
      });
      setNewItemCategory('الأصول');
      setNewItemName('');
      setNewItemQuantity(1);
    }
    setView('form');
  };

  const handleAddStockItem = async () => {
    const initialData = {
      itemNumber: `SKU-${String(
        stockItems.reduce((max, s) => {
          if (s.itemNumber && s.itemNumber.startsWith('SKU-')) {
            const num = parseInt(s.itemNumber.replace('SKU-', ''), 10);
            return !isNaN(num) && num > max ? num : max;
          }
          return max;
        }, 0) + 1
      ).padStart(4, '0')}`,
      lastMovementDate: getLocalDateStr(new Date()),
      lastRecipient: user?.name || ''
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
            <div class="premium-form-group col-span-12 md:col-span-3">
              <label>رقم الصنف (ID)</label>
              <input id="swal-itemNumber" class="premium-input" value="${initialData.itemNumber}" disabled style="background: var(--surface); cursor: not-allowed; font-weight: bold; color: var(--primary-dark); text-align: center;">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-3">
              <label>رمز الصنف</label>
              <input id="swal-itemCode" class="premium-input" placeholder="" value="">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-3">
              <label>اسم الصنف</label>
              <input id="swal-name" class="premium-input" placeholder="مثال: قماش أبيض تركي" value="">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-3">
              <label>التصنيف</label>
              <select id="swal-category" class="premium-input">
                <option value="" disabled selected>اختر التصنيف</option>
                ${(globalSettings?.stockCategories || ['الأصول', 'مستهلكات الخياطة']).map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>

            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>المخزن</label>
              <select id="swal-warehouse" class="premium-input">
                <option value="" disabled selected>اختر المخزن</option>
                ${(globalSettings?.warehouses || ['المستودع الرئيسي']).map(w => `<option value="${w}">${w}</option>`).join('')}
              </select>
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>الموقع (داخل المخزن)</label>
              <input id="swal-location" class="premium-input" placeholder="مثال: رف 5، قسم B" value="">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>اللون / المواصفة</label>
              <select id="swal-spec" class="premium-input">
                <option value="">اختر اللون/المواصفة</option>
                ${(globalSettings?.stockColors || []).map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>

            <div class="premium-form-group col-span-12 md:col-span-4">
              <label class="text-primary">الكمية الحالية</label>
              <div class="flex gap-2">
                <input id="swal-quantity" type="number" class="premium-input" style="flex: 2;" value="1">
                <select id="swal-unit" class="premium-input" style="flex: 1;">
                  ${(globalSettings?.stockUnits || ['عدد', 'متر', 'كغم']).map(u => `<option value="${u}">${u}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>الحد الأدنى (تنبيه)</label>
              <input id="swal-minLimit" type="number" class="premium-input" value="0">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>آخر حركة</label>
              <select id="swal-lastMovement" class="premium-input">
                <option value="إدخال" selected>إدخال</option>
                <option value="إخراج">إخراج</option>
                <option value="تحويل">تحويل</option>
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
              <input id="swal-notes" class="premium-input" placeholder="أي ملاحظات..." value="">
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
          notes: document.getElementById('swal-notes').value
        };

        if (!data.name || !data.warehouse || !data.category) {
          Swal.showValidationMessage('يرجى ملء الاسم والتصنيف والمخزن');
          return false;
        }

        const existingInWarehouse = stockItems.find(s => 
          s.itemNumber === data.itemNumber && 
          s.warehouse === data.warehouse
        );
        if (existingInWarehouse) {
          Swal.showValidationMessage(`عذراً، يوجد بضاعة من هذا الصنف مسبقاً في المستودع المختار (${data.warehouse})!`);
          return false;
        }

        return data;
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await saveStockItem(result.value);
        if (res) {
          setStockItems(prev => [...prev, res]);
          Swal.fire({
            icon: 'success',
            title: 'تم الحفظ بنجاح',
            timer: 1500,
            showConfirmButton: false
          });
        }
      }
    });
  };

  const handleEmployeeChange = (e) => {
    const empId = e.target.value;
    const emp = employees.find(emp => emp.id === empId);
    setFormData({
      ...formData,
      employeeId: empId,
      employeeName: emp ? emp.name : ''
    });
  };

  const handleAddItemToAsset = () => {
    if (!newItemName) {
      Swal.fire('تنبيه', 'يرجى اختيار صنف من المخزون', 'warning');
      return;
    }
    const itemStock = stockItems.find(s => s.name === newItemName);
    const itemNumber = itemStock ? itemStock.itemNumber : '';
    
    const newItem = {
      id: Date.now().toString(),
      name: newItemName,
      category: newItemCategory,
      quantity: newItemQuantity,
      itemNumber: itemNumber,
      status: 'نشطة'
    };
    
    setFormData({
      ...formData,
      items: [...formData.items, newItem]
    });
    
    setNewItemName('');
    setNewItemQuantity(1);
  };

  const handleRemoveItemFromAsset = (itemId) => {
    setFormData({
      ...formData,
      items: formData.items.filter(i => i.id !== itemId)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.employeeId || !formData.handoverDate || !formData.nextInspectionDate) {
      Swal.fire('خطأ', 'يرجى إدخال جميع الحقول الإجبارية (الاسم، الموظف، وتواريخ التسليم والفحص القادم)', 'error');
      return;
    }
    if (!formData.items || formData.items.length === 0) {
      Swal.fire('خطأ', 'يجب إضافة صنف واحد على الأقل للعهدة', 'error');
      return;
    }
    const hasEmptyItems = formData.items.some(i => !i.name || !i.quantity || i.quantity <= 0);
    if (hasEmptyItems) {
      Swal.fire('خطأ', 'يرجى التأكد من اختيار اسم الصنف وإدخال كمية صحيحة لجميع سطور العهدة', 'error');
      return;
    }

    const dataToSave = { ...formData };
    if (!dataToSave.history) dataToSave.history = [];
    
    // Track major changes
    if (!editingAsset) {
      dataToSave.history.push({
        date: new Date().toISOString(),
        action: 'تسليم جديد',
        details: `تم تسليم العهدة للموظف: ${dataToSave.employeeName}`,
        by: user?.name
      });
    } else {
      if (editingAsset.employeeId !== dataToSave.employeeId) {
         dataToSave.history.push({
            date: new Date().toISOString(),
            action: 'نقل عهدة',
            details: `تم نقل العهدة من ${editingAsset.employeeName} إلى ${dataToSave.employeeName}`,
            by: user?.name
         });
      }
      if (editingAsset.status !== dataToSave.status) {
         dataToSave.history.push({
            date: new Date().toISOString(),
            action: 'تغيير حالة',
            details: `تغيرت الحالة من ${editingAsset.status} إلى ${dataToSave.status}`,
            by: user?.name
         });
      }
    }

    const saved = await saveHRAsset(dataToSave, user);
    if (saved) {
      Swal.fire({
        title: 'تم الحفظ',
        text: 'تم حفظ بيانات العهدة بنجاح',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
      setView('list');
      fetchData();
    }
  };

  const handleDelete = async (id) => {
    const result = await MySwal.fire({
      title: 'هل أنت متأكد؟',
      text: "سيتم حذف هذه العهدة نهائياً من سجلات الشركة!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
      await deleteHRAsset(id, user);
      Swal.fire('تم الحذف', 'تم حذف العهدة بنجاح', 'success');
      fetchData();
    }
  };

  const handleInspect = async (asset) => {
    const { value: formValues } = await MySwal.fire({
      title: 'فحص دوري لمحتويات العهدة',
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup premium-modal-wide',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions',
        title: 'premium-modal-title'
      },
      buttonsStyling: false,
      html: `
        <div class="text-right mt-2" style="direction: rtl;">
          <div class="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 class="font-bold text-lg mb-3 text-slate-800">تفاصيل العهدة المجمعة</h3>
            <div class="grid grid-cols-2 gap-4 text-sm mb-4">
               <div><span class="text-slate-500">اسم المجموعة:</span> <strong class="text-primary">${asset.name}</strong></div>
               <div><span class="text-slate-500">رقم العهدة:</span> <strong>${asset.assetNumber}</strong></div>
               <div class="col-span-2"><span class="text-slate-500">الموظف المسؤول:</span> <strong>${asset.employeeName}</strong></div>
            </div>
            
            ${(asset.items && asset.items.length > 0) ? `
              <div class="overflow-hidden rounded-lg border border-slate-200">
                <table class="w-full text-right border-collapse text-sm bg-white">
                  <thead class="bg-slate-100 border-b border-slate-200">
                     <tr>
                        <th class="p-2">الصنف</th>
                        <th class="p-2 text-center w-20">الكمية</th>
                        <th class="p-2 w-40 text-center">تحديث الحالة</th>
                     </tr>
                  </thead>
                  <tbody>
                     ${asset.items.map(item => `
                        <tr class="border-b border-slate-100 last:border-0">
                           <td class="p-2 font-bold">${item.name} <span class="text-xs text-slate-400 font-normal">(${item.category})</span></td>
                           <td class="p-2 text-center font-bold">${item.quantity}</td>
                           <td class="p-2">
                              <select id="status-${item.id}" class="premium-input w-full py-1 px-2 text-xs font-bold bg-slate-50" style="min-height: 32px">
                                 <option value="نشطة" ${item.status === 'نشطة' ? 'selected' : ''}>نشطة</option>
                                 <option value="قيد الصيانة" ${item.status === 'قيد الصيانة' ? 'selected' : ''}>قيد الصيانة</option>
                                 <option value="تالفة" ${item.status === 'تالفة' ? 'selected' : ''}>تالفة</option>
                                 <option value="مفقودة" ${item.status === 'مفقودة' ? 'selected' : ''}>مفقودة</option>
                                 <option value="مسترجعة" ${item.status === 'مسترجعة' ? 'selected' : ''}>مسترجعة</option>
                              </select>
                           </td>
                        </tr>
                     `).join('')}
                  </tbody>
                </table>
              </div>
            ` : '<p class="text-slate-500 text-center p-4">لا يوجد أصناف مسجلة داخل هذه العهدة.</p>'}
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="mb-3">
              <label class="block mb-1 font-bold text-sm">تاريخ الفحص</label>
              <input type="date" id="swal-inspect-date" class="premium-input w-full" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="mb-3">
              <label class="block mb-1 font-bold text-sm">تاريخ الفحص القادم (اختياري)</label>
              <input type="date" id="swal-next-date" class="premium-input w-full" value="${asset.nextInspectionDate || ''}">
            </div>
          </div>
          <div class="mb-3">
            <label class="block mb-1 font-bold text-sm">نتيجة الفحص وملاحظات عامة</label>
            <textarea id="swal-inspect-result" class="premium-input w-full min-h-[80px]" placeholder="أدخل أي ملاحظات عامة حول حالة العهدة ككل..."></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'حفظ نتيجة الفحص',
      cancelButtonText: 'إلغاء',
      focusConfirm: false,
      preConfirm: () => {
        const updatedItems = (asset.items || []).map(item => ({
            ...item,
            status: document.getElementById(`status-${item.id}`)?.value || item.status
        }));
        
        return {
          date: document.getElementById('swal-inspect-date').value,
          result: document.getElementById('swal-inspect-result').value,
          nextDate: document.getElementById('swal-next-date').value,
          updatedItems
        }
      }
    });

    if (formValues) {
      const updatedAsset = { ...asset };
      if (!updatedAsset.history) updatedAsset.history = [];
      
      updatedAsset.lastInspectionDate = formValues.date;
      updatedAsset.inspectionResult = formValues.result;
      if (formValues.nextDate) updatedAsset.nextInspectionDate = formValues.nextDate;
      updatedAsset.items = formValues.updatedItems;

      updatedAsset.history.push({
        date: new Date().toISOString(),
        action: 'فحص دوري وتحديث حالة الأصناف',
        details: `تاريخ الفحص: ${formValues.date} | النتيجة: ${formValues.result || 'تم تحديث حالات الأصناف'}`,
        by: user?.name
      });

      await saveHRAsset(updatedAsset, user);
      Swal.fire('تم الحفظ', 'تم تسجيل نتيجة الفحص وتحديث حالات الأصناف بنجاح', 'success');
      fetchData();
    }
  };

  const handleShowHistory = (asset) => {
     let historyHtml = '<div class="text-right" style="direction: rtl; max-height: 300px; overflow-y: auto;">';
     if (!asset.history || asset.history.length === 0) {
        historyHtml += '<p class="text-slate-500">لا يوجد سجل حركات لهذه العهدة.</p>';
     } else {
        const sortedHistory = [...asset.history].sort((a,b) => new Date(b.date) - new Date(a.date));
        sortedHistory.forEach(h => {
           const d = new Date(h.date);
           historyHtml += `
             <div class="mb-4 p-3 border-r-4 border-primary bg-slate-50 rounded">
               <div class="flex justify-between items-center mb-1">
                 <strong class="text-primary">${h.action}</strong>
                 <span class="text-xs text-slate-500" dir="ltr">${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'})}</span>
               </div>
               <p class="text-sm text-slate-700">${h.details}</p>
               <p class="text-xs text-slate-500 mt-1">بواسطة: ${h.by || 'النظام'}</p>
             </div>
           `;
        });
     }
     historyHtml += '</div>';

     MySwal.fire({
        title: `سجل الحركات: ${asset.name}`,
        html: historyHtml,
        showConfirmButton: true,
        confirmButtonText: 'إغلاق',
        customClass: {
           popup: 'premium-modal-popup',
           confirmButton: 'btn-premium-save',
        }
     });
  };

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
           const win = window.open('', '_blank');
           win.document.write(html);
           win.document.close();
           setTimeout(() => { win.print(); }, 200);
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

  const handleViewDetails = (asset) => {
    let itemsHtml = `
      <div class="text-right mt-2" style="direction: rtl;">
        <div class="grid grid-cols-2 gap-4 text-sm mb-4">
           <div><span class="text-slate-500">رقم العهدة:</span> <strong>${asset.assetNumber}</strong></div>
           <div><span class="text-slate-500">الموظف المسؤول:</span> <strong>${asset.employeeName}</strong></div>
        </div>
    `;

    if (asset.items && asset.items.length > 0) {
      itemsHtml += `
        <div class="overflow-hidden rounded-lg border border-slate-200">
          <table class="w-full text-right border-collapse text-sm bg-white">
            <thead class="bg-slate-100 border-b border-slate-200">
               <tr>
                  <th class="p-3 font-bold text-slate-700">الصنف</th>
                  <th class="p-3 font-bold text-slate-700 text-center">الموقع (داخل المخزن)</th>
                  <th class="p-3 font-bold text-slate-700 text-center">الكمية</th>
                  <th class="p-3 font-bold text-slate-700 text-center">الحالة</th>
               </tr>
            </thead>
            <tbody>
               ${asset.items.map(item => `
                  <tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                     <td class="p-3 font-bold text-primary">${item.name} <span class="text-xs text-slate-400 font-normal">(${item.category})</span></td>
                     <td class="p-3 text-center font-bold text-slate-600">${(() => {
                        const stockItem = stockItems.find(s => s.name === item.name);
                        return stockItem?.location || '-';
                     })()}</td>
                     <td class="p-3 text-center font-bold">${item.quantity}</td>
                     <td class="p-3 text-center">
                        <span class="badge ${ASSET_STATUS_COLORS[item.status] || 'badge-secondary'}">${item.status}</span>
                     </td>
                  </tr>
               `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      itemsHtml += '<p class="text-slate-500 text-center p-4 bg-slate-50 rounded-lg">لا يوجد أصناف مسجلة داخل هذه العهدة.</p>';
    }

    itemsHtml += '</div>';

    MySwal.fire({
      title: `تفاصيل محتويات: ${asset.name}`,
      html: itemsHtml,
      showConfirmButton: true,
      confirmButtonText: 'إغلاق',
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup premium-modal-wide',
        confirmButton: 'btn-premium-save',
      },
      buttonsStyling: false
    });
  };

  // Filter logic
  const filteredAssets = assets.filter(a => {
    const matchSearch = searchTerm ? 
       (a.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        a.assetNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.employeeName?.toLowerCase().includes(searchTerm.toLowerCase())) : true;
    const matchStatus = filterStatus !== 'جميع الحالات' ? a.status === filterStatus : true;
    const matchEmp = filterEmployee ? a.employeeId === filterEmployee : true;
    return matchSearch && matchStatus && matchEmp;
  });

  // Stats
  const activeCount = assets.filter(a => a.status === 'نشطة').length;
  const lostDamagedCount = assets.filter(a => ['تالفة', 'مفقودة'].includes(a.status)).length;
  
  const today = new Date().toISOString().split('T')[0];
  const needsInspectionCount = assets.filter(a => a.status === 'نشطة' && a.nextInspectionDate && a.nextInspectionDate < today).length;

  return (
    <div className="space-y-6 animate-fade-in" style={{ direction: 'rtl' }}>
      {view === 'list' && (
        <>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                <Package color="#0ea5e9" size={28} />
                العهد والأصول
              </h2>
              <p style={{ color: '#64748b', marginTop: '4px', fontSize: '14px', marginBottom: 0 }}>إدارة ممتلكات الشركة المسلمة للموظفين وتتبع حالتها</p>
            </div>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              backgroundColor: '#ffffff', 
              padding: '6px 6px', 
              borderRadius: '16px', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: '1px solid #f1f5f9',
              flexWrap: 'wrap'
            }}>
              
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search style={{ position: 'absolute', right: '12px', color: '#94a3b8' }} size={18} />
                <input 
                  type="text" 
                  style={{ 
                    padding: '8px 36px 8px 16px', 
                    backgroundColor: '#f8fafc', 
                    border: 'none', 
                    borderRadius: '12px', 
                    fontSize: '13px',
                    width: '180px',
                    outline: 'none'
                  }}
                  placeholder="بحث سريع..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              
              <select 
                style={{ 
                  backgroundColor: '#f8fafc', 
                  border: 'none', 
                  borderRadius: '12px', 
                  fontSize: '13px', 
                  padding: '8px 16px', 
                  fontWeight: 'bold', 
                  color: '#475569',
                  outline: 'none',
                  cursor: 'pointer'
                }}
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="جميع الحالات">الحالة: الكل</option>
                {Object.keys(ASSET_STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              
              <select 
                style={{ 
                  backgroundColor: '#f8fafc', 
                  border: 'none', 
                  borderRadius: '12px', 
                  fontSize: '13px', 
                  padding: '8px 16px', 
                  fontWeight: 'bold', 
                  color: '#475569',
                  outline: 'none',
                  cursor: 'pointer'
                }}
                value={filterEmployee}
                onChange={e => setFilterEmployee(e.target.value)}
              >
                <option value="">الموظف: الكل</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>

              <button 
                style={{ 
                  backgroundColor: '#0ea5e9', 
                  color: '#ffffff', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px', 
                  padding: '8px 20px', 
                  borderRadius: '14px', 
                  fontWeight: 'bold', 
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
                }}
                onClick={() => handleOpenModal()}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Plus size={20} strokeWidth={3} />
                <span style={{ fontSize: '14px' }}>إضافة عهدة جديدة</span>
              </button>
            </div>
          </div>

          {/* Stats Cards using exact HR style */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              backgroundColor: '#ffffff',
              border: '1.5px solid #f1f5f9',
              borderRadius: '16px',
              padding: '20px 8px 16px 8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              boxShadow: '0 4px 10px -2px rgba(0, 0, 0, 0.03)',
              color: '#334155',
            }}>
              <div style={{ color: '#0ea5e9' }}>
                <CheckCircle size={42} strokeWidth={1.5} />
              </div>
              <span style={{ fontSize: '16px', fontWeight: 'bold', textAlign: 'center' }}>العهد النشطة</span>
              <div style={{
                backgroundColor: '#e0f2fe',
                color: '#0ea5e9',
                padding: '4px 14px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '4px'
              }}>
                <span>{activeCount}</span>
                <CheckCircle size={14} strokeWidth={2.5} />
              </div>
            </div>

            <div style={{
              backgroundColor: '#ffffff',
              border: '1.5px solid #f1f5f9',
              borderRadius: '16px',
              padding: '20px 8px 16px 8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              boxShadow: '0 4px 10px -2px rgba(0, 0, 0, 0.03)',
              color: '#334155',
            }}>
              <div style={{ color: '#f43f5e' }}>
                <X size={42} strokeWidth={1.5} />
              </div>
              <span style={{ fontSize: '16px', fontWeight: 'bold', textAlign: 'center' }}>تالفة / مفقودة</span>
              <div style={{
                backgroundColor: '#ffe4e6',
                color: '#f43f5e',
                padding: '4px 14px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '4px'
              }}>
                <span>{lostDamagedCount}</span>
                <X size={14} strokeWidth={3} />
              </div>
            </div>

            <div style={{
              backgroundColor: '#ffffff',
              border: '1.5px solid #f1f5f9',
              borderRadius: '16px',
              padding: '20px 8px 16px 8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              boxShadow: '0 4px 10px -2px rgba(0, 0, 0, 0.03)',
              color: '#334155',
            }}>
              <div style={{ color: '#f59e0b' }}>
                <AlertTriangle size={42} strokeWidth={1.5} />
              </div>
              <span style={{ fontSize: '16px', fontWeight: 'bold', textAlign: 'center' }}>بحاجة لفحص</span>
              <div style={{
                backgroundColor: '#fef3c7',
                color: '#f59e0b',
                padding: '4px 14px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '4px'
              }}>
                <span>{needsInspectionCount}</span>
                <AlertTriangle size={14} strokeWidth={2.5} />
              </div>
            </div>
          </div>

      {/* Assets Table */}
      <div className="glass-panel p-0 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-500">جاري تحميل البيانات...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-bold text-slate-700 whitespace-nowrap">رقم العهدة</th>
                  <th className="p-4 font-bold text-slate-700">اسم المجموعة</th>
                  <th className="p-4 font-bold text-slate-700">الموظف المسؤول</th>
                  <th className="p-4 font-bold text-slate-700 text-center">محتويات العهدة</th>
                  <th className="p-4 font-bold text-slate-700 whitespace-nowrap">تاريخ التسليم</th>
                  <th className="p-4 font-bold text-slate-700 text-center">تاريخ الفحص القادم</th>
                  <th className="p-4 font-bold text-slate-700 text-center">الحالة</th>
                  <th className="p-4 font-bold text-slate-700 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.length > 0 ? (
                  filteredAssets.map(asset => {
                    const isLate = asset.status === 'نشطة' && asset.nextInspectionDate && asset.nextInspectionDate < today;
                    return (
                      <tr key={asset.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-4 align-middle whitespace-nowrap font-bold text-slate-600" dir="ltr">{asset.assetNumber}</td>
                        <td className="p-4 align-middle font-bold text-primary">{asset.name}</td>
                        <td className="p-4 align-middle font-medium">{asset.employeeName}</td>
                        <td className="p-4 align-middle text-center">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {asset.items ? asset.items.length : 0} صنف
                          </span>
                        </td>
                        <td className="p-4 align-middle whitespace-nowrap">{asset.handoverDate || '---'}</td>
                        <td className="p-4 align-middle text-center whitespace-nowrap">
                           {asset.nextInspectionDate ? (
                             <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${isLate ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                               {isLate && <AlertTriangle size={12} />}
                               {asset.nextInspectionDate}
                             </span>
                           ) : '---'}
                        </td>
                        <td className="p-4 align-middle text-center">
                          <span className={`badge ${ASSET_STATUS_COLORS[asset.status] || 'badge-secondary'}`}>
                            {asset.status}
                          </span>
                        </td>
                        <td className="p-4 align-middle text-center">
                          <div className="flex justify-center items-center gap-2">
                            <button className="icon-btn icon-btn-edit" onClick={() => handleViewDetails(asset)} title="عرض التفاصيل">
                              <Eye size={16} />
                            </button>
                            <button className="icon-btn" style={{ color: '#6366f1', backgroundColor: '#e0e7ff' }} onClick={() => handleExportAsset(asset)} title="طباعة / تصدير التقرير">
                              <Printer size={16} />
                            </button>
                            <button className="icon-btn icon-btn-edit" onClick={() => handleInspect(asset)} title="فحص دوري وتحديث حالة الأصناف">
                              <RefreshCw size={16} />
                            </button>
                            <button className="icon-btn icon-btn-edit" onClick={() => handleShowHistory(asset)} title="سجل الحركات">
                              <FileText size={16} />
                            </button>
                            <button className="icon-btn icon-btn-edit" onClick={() => handleOpenModal(asset)} title="تعديل">
                              <Edit2 size={16} />
                            </button>
                            <button className="icon-btn icon-btn-delete" onClick={() => handleDelete(asset.id)} title="حذف">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-500 font-medium">
                      لا يوجد عهد أو أصول مطابقة للبحث
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}

      {/* Add/Edit Form View as Modal */}
      {view === 'form' && (
        <div className="modal-overlay">
          <div className="modal-content wide animate-fade-in">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-xl font-bold">
                  {editingAsset ? `تعديل عهدة ${formData.assetNumber}` : 'إضافة عهدة مجمعة جديدة'}
                </h3>
              <button type="button" className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setView('list')}><X size={18} /></button>
            </div>
            
            <form id="assetForm" onSubmit={handleSubmit}>
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  {/* الصف الأول: رقم العهدة، التاريخ، الحالة */}
                  <div className="md:col-span-4 input-group mb-0">
                    <label className="font-bold text-slate-700 mb-2 block flex items-center gap-2"><Package size={16} className="text-primary"/> رقم العهدة</label>
                    <input type="text" className="input-field bg-slate-100 font-bold text-primary" style={{ height: '42px', textAlign: 'center' }} value={formData.assetNumber || ''} readOnly disabled dir="ltr" />
                  </div>
                  
                  <div className="md:col-span-4 input-group mb-0">
                    <label className="font-bold text-slate-700 mb-2 block flex items-center gap-2"><Calendar size={16} className="text-primary"/> تاريخ التسليم <span className="text-rose-500">*</span></label>
                    <Flatpickr className="input-field" style={{ height: '42px', backgroundColor: 'white' }} required value={formData.handoverDate || ''} onChange={([d]) => setFormData({...formData, handoverDate: getLocalDateStr(d)})} options={{ dateFormat: 'Y-m-d', disableMobile: true }} />
                  </div>
                  
                  <div className="md:col-span-4 input-group mb-0">
                    <label className="font-bold text-slate-700 mb-2 block flex items-center gap-2"><Activity size={16} className="text-orange-500"/> الحالة العامة للعهدة</label>
                    <select className="input-field font-bold" style={{ height: '42px', backgroundColor: 'white' }} value={formData.status || 'نشطة'} onChange={e => setFormData({...formData, status: e.target.value})}>
                      {Object.keys(ASSET_STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* الصف الثاني: الموظف، اسم المجموعة */}
                  <div className="md:col-span-12 input-group mb-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="flex items-center gap-2 mb-2 font-bold text-slate-700"><User size={16} className="text-primary"/> الموظف المستلم <span className="text-rose-500">*</span></label>
                        <select className="input-field" style={{ height: '42px', backgroundColor: 'white' }} required value={formData.employeeId} onChange={handleEmployeeChange}>
                          <option value="">-- اختر الموظف --</option>
                          {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="flex items-center gap-2 mb-2 font-bold text-slate-700"><FileText size={16} className="text-primary"/> اسم العهدة <span className="text-rose-500">*</span></label>
                        <input type="text" className="input-field" style={{ height: '42px', backgroundColor: 'white' }} required placeholder="أدخل اسماً للعهدة ككل" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100 flex-wrap gap-3">
                  <h4 className="font-bold text-lg flex items-center gap-2 text-slate-800"><Package size={20} className="text-primary" /> محتويات العهدة</h4>
                  <div className="flex gap-2">
                    <button type="button" className="flex items-center gap-1 transition-all hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color:'#fff', fontWeight:'600', border:'none', borderRadius:'8px', padding:'0 1rem', height: '36px', boxShadow:'0 4px 12px rgba(14,165,233,0.25)' }} onClick={handleAddStockItem}>
                      <Plus size={14} /> صنف للمخزون
                    </button>
                    <button type="button" className="btn btn-primary flex items-center gap-1 h-9 px-3 text-sm shadow-sm" onClick={() => {
                      const newItems = [...(formData.items || []), { id: Date.now().toString(), name: '', quantity: 1, category: 'الأصول', status: 'نشطة' }];
                      setFormData({...formData, items: newItems});
                    }}>
                      <Plus size={14} /> سطر جديد للعهدة
                    </button>
                  </div>
                </div>
                
                <div className="modal-table-container rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <table className="modal-table w-full">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th style={{ width: '130px', padding: '12px 10px', textAlign: 'center' }}>التصنيف</th>
                        <th style={{ padding: '12px 10px', textAlign: 'center', width: '30%' }}>اسم الصنف من المخزون</th>
                        <th style={{ padding: '12px 10px', textAlign: 'center', width: '130px' }}>الموقع (داخل المخزن)</th>
                        <th style={{ width: '90px', padding: '12px 10px', textAlign: 'center' }}>الكمية</th>
                        <th style={{ width: '130px', padding: '12px 10px', textAlign: 'center' }}>حالة الصنف</th>
                        <th style={{ width: '60px', padding: '12px 10px', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {(formData.items || []).map((item, index) => (
                        <tr key={item.id || index} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2 text-center align-middle">
                            <select 
                              className="w-full border border-slate-200 rounded-lg px-2 bg-slate-50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-center mx-auto" 
                              style={{ height: '38px', fontSize: '0.85rem' }} 
                              value={item.category || 'الأصول'} 
                              onChange={(e) => {
                                const newItems = [...formData.items];
                                newItems[index].category = e.target.value;
                                newItems[index].name = ''; // reset name when category changes
                                setFormData({...formData, items: newItems});
                              }}
                            >
                              <option value="الأصول">الأصول</option>
                              <option value="مستهلكات الخياطة">مستهلكات الخياطة</option>
                            </select>
                          </td>
                          <td className="p-2 text-center align-middle">
                            <SearchableDropdown
                              options={stockItems.filter(s => {
                                const cat = item.category || 'الأصول';
                                const c = s.category || '';
                                if (cat === 'الأصول') return c.includes('أصول') || c.includes('اصول') || c === 'الأصول';
                                if (cat === 'مستهلكات الخياطة') return c.includes('خياطة') || c.includes('مستهلكات');
                                return c === cat;
                              }).map(s => s.name)}
                              value={item.name}
                              onChange={(val) => {
                                const newItems = [...formData.items];
                                newItems[index].name = val;
                                setFormData({...formData, items: newItems});
                              }}
                              onBlur={() => {}}
                            />
                          </td>
                          <td className="p-2 text-center align-middle">
                            <div className="w-full border border-slate-200 rounded-lg px-2 bg-slate-50 text-slate-600 font-bold flex items-center justify-center mx-auto" style={{ height: '38px', fontSize: '0.85rem' }}>
                              {(() => {
                                const stockItem = stockItems.find(s => s.name === item.name);
                                return stockItem?.location || '-';
                              })()}
                            </div>
                          </td>
                          <td className="p-2 text-center align-middle">
                            <input 
                              type="number" 
                              min="1"
                              className="w-full border border-slate-200 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-center mx-auto" 
                              style={{ height: '38px', maxWidth: '80px' }} 
                              value={item.quantity} 
                              onChange={(e) => {
                                const newItems = [...formData.items];
                                newItems[index].quantity = Number(e.target.value) || 1;
                                setFormData({...formData, items: newItems});
                              }} 
                            />
                          </td>
                          <td className="p-2 text-center align-middle">
                             <select 
                               className="w-full border border-slate-200 rounded-lg px-2 bg-slate-50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-center mx-auto" 
                               style={{ height: '38px', fontSize: '0.85rem' }} 
                               value={item.status || 'نشطة'} 
                               onChange={(e) => {
                                  const newItems = [...formData.items];
                                  newItems[index].status = e.target.value;
                                  setFormData({...formData, items: newItems});
                               }}
                             >
                               <option value="نشطة">نشطة</option>
                               <option value="قيد الصيانة">قيد الصيانة</option>
                               <option value="تالفة">تالفة</option>
                               <option value="مفقودة">مفقودة</option>
                               <option value="مسترجعة">مسترجعة</option>
                             </select>
                           </td>
                          <td className="p-2 text-center align-middle">
                             <div className="flex gap-2 justify-center items-center">
                               <button type="button" className="icon-btn icon-btn-delete" onClick={() => {
                                  const newItems = [...formData.items];
                                  newItems.splice(index, 1);
                                  setFormData({...formData, items: newItems});
                               }}>
                                 <Trash2 size={16} strokeWidth={2} />
                               </button>
                             </div>
                          </td>
                        </tr>
                      ))}
                      {(!formData.items || formData.items.length === 0) && (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-slate-500 font-bold bg-slate-50">
                            لم يتم إضافة أصناف. اضغط على "سطر جديد للعهدة" للبدء.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6">
                <div className="input-group mb-0">
                  <label className="font-bold text-slate-700 mb-2 block flex items-center gap-2"><Calendar size={16} className="text-primary"/> موعد الفحص الدوري القادم <span className="text-rose-500">*</span></label>
                  <Flatpickr className="input-field" style={{ height: '42px', backgroundColor: 'white' }} required value={formData.nextInspectionDate || ''} onChange={([d]) => setFormData({...formData, nextInspectionDate: getLocalDateStr(d)})} options={{ dateFormat: 'Y-m-d', disableMobile: true, minDate: 'today' }} />
                </div>
                <div className="input-group mb-0">
                  <label className="font-bold text-slate-700 mb-2 block flex items-center gap-2"><FileText size={16} className="text-primary"/> ملاحظات إضافية</label>
                  <textarea className="input-field" style={{ minHeight: '42px', backgroundColor: 'white' }} placeholder="أي ملاحظات حول العهدة..." value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
                </div>
              </div>

              <div className="premium-modal-actions mt-6">
                <button type="submit" className="btn-premium-save flex items-center gap-2">
                  <Package size={18} /> {editingAsset ? 'تحديث العهدة' : 'حفظ العهدة'}
                </button>
                <button type="button" className="btn-premium-cancel flex items-center gap-2" onClick={() => setView('list')}>
                  <X size={18} /> إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default HRAssets;
