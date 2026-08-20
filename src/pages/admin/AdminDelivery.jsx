import React, { useEffect, useState } from 'react';
import { Truck, Search, Plus, Trash2, Edit2, ArrowUpDown, ArrowUp, ArrowDown, Calendar, Pin, ClipboardList, Store, MapPin, ChevronRight, ChevronDown, Send, FileText, ChevronLeft, UserCheck, Eye, X, Package } from 'lucide-react';
import {
  getMissions,
  saveMission,
  deleteMission,
  getEmployees,
  getGlobalSettings,
  updateMissionStatus,
  canPerformAction,
  addLog,
  createNotification,
  getSalesOrders
} from '../../store';
import { matchesSearch, useDebounce } from '../../utils/searchEngine';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { sendWhatsAppNotification } from '../../utils/whatsappService';
import { triggerWhatsAppRouting } from '../../services/whatsappRouter';
import flatpickr from 'flatpickr';
import Flatpickr from 'react-flatpickr';
import { Arabic } from 'flatpickr/dist/l10n/ar.js';
import 'flatpickr/dist/themes/light.css';

const MySwal = withReactContent(Swal);
const DELIVERY_TYPE_OPTIONS = ['تسليم طلبية', 'أخرى'];
const SOURCE_ENTITY_OPTIONS = [
  'مرجاس للتجارة - قسم الاثاث',
  'مرجاس للتجارة - قسم البياضات',
  'القوة المتكاملة',
  'الشعلة لتوريد المعدات الصناعية',
  'شخصي - اصحاب الشركة',
  'الدائرة المالية'
];

const AdminDelivery = ({ user }) => {
  const [missions, setMissions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [globalSettings, setGlobalSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState('معلق');
  const [sourceFilter, setSourceFilter] = useState('الكل');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [showOrderPreview, setShowOrderPreview] = useState(false);
  const [previewOrder, setPreviewOrder] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [missionsData, employeesData, settingsData, salesData] = await Promise.all([
      getMissions(),
      getEmployees(),
      getGlobalSettings(),
      getSalesOrders()
    ]);
    setMissions(missionsData);
    setEmployees(employeesData);
    setGlobalSettings(settingsData);
    setSalesOrders(salesData);
    setLoading(false);
  };

  const getMissionTypeLabel = (mission) => {
    if (!mission) return '';
    if (mission.type === 'أخرى' && mission.customType) {
      return `أخرى - ${mission.customType}`;
    }
    return mission.type || '';
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnName) => {
    if (sortConfig.key !== columnName) {
      return <ArrowUpDown size={14} className="text-muted opacity-40" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp size={14} className="text-primary font-bold" />;
    }
    return <ArrowDown size={14} className="text-primary font-bold" />;
  };

  const handleOpenModal = (mission = null) => {
    const isEdit = Boolean(mission);
    let nextMissionNumber = '';
    if (!isEdit) {
      const maxNum = missions.reduce((max, o) => {
        const str = String(o.missionNumber || '');
        if (str.startsWith('DEL-')) {
          const match = str.match(/DEL-(\d+)/);
          return match ? Math.max(max, parseInt(match[1], 10)) : max;
        }
        return max;
      }, 0);
      nextMissionNumber = `DEL-${String(maxNum + 1).padStart(4, '0')}`;
    }
    const initialData = mission
      ? {
        ...mission,
        type: DELIVERY_TYPE_OPTIONS.includes(mission.type) ? mission.type : 'أخرى',
        customType: mission.customType || (DELIVERY_TYPE_OPTIONS.includes(mission.type) ? '' : mission.type)
      }
      : {
        type: 'تسليم طلبية',
        customType: '',
        sourceEntity: '',
        targetEntity: '',
        details: '',
        assignedEmployeeId: '',
        assignedEmployeeName: '',
        dueDate: '',
        status: 'بانتظار الاستلام',
        salesOrderNumber: ''
      };

    const toggleCustomTypeField = () => {
      const typeField = document.getElementById('swal-type');
      const customWrapper = document.getElementById('swal-custom-type-wrapper');
      const customInput = document.getElementById('swal-custom-type');
      const orderWrapper = document.getElementById('swal-related-order-wrapper');
      const orderSelect = document.getElementById('swal-related-order');

      if (!typeField) return;

      const shouldShowCustom = typeField.value === 'أخرى';
      if (customWrapper && customInput) {
        customWrapper.style.display = shouldShowCustom ? 'block' : 'none';
        customInput.required = shouldShowCustom;
        if (!shouldShowCustom) customInput.value = '';
      }

      const shouldShowOrder = typeField.value === 'تسليم طلبية';
      if (orderWrapper && orderSelect) {
        orderWrapper.style.display = shouldShowOrder ? 'block' : 'none';
        orderSelect.required = shouldShowOrder;
        if (!shouldShowOrder) orderSelect.value = '';
      }
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
      title: isEdit ? 'تعديل المهمة' : 'إنشاء مهمة جديدة',
      width: '800px',
      html: `
        <div class="premium-form grid grid-cols-12 gap-5 mt-4">
          <div class="premium-form-group col-span-12">
            <label>رقم الطلب</label>
            <input id="swal-mission-number" type="text" class="premium-input bg-slate-100 font-bold text-primary text-center" value="${isEdit ? (initialData.missionNumber || '') : nextMissionNumber}" readonly disabled>
          </div>
          <div class="premium-form-group col-span-12 md:col-span-6">
            <label>موعد التنفيذ</label>
            <input id="swal-date" type="text" class="premium-input bg-white" placeholder="اختر التاريخ..." value="${initialData.dueDate || ''}">
          </div>
          <div class="premium-form-group col-span-12 md:col-span-6">
            <label>نوع المهمة</label>
            <select id="swal-type" class="premium-input">
              ${DELIVERY_TYPE_OPTIONS.map((typeOption) => `<option value="${typeOption}" ${initialData.type === typeOption ? 'selected' : ''}>${typeOption}</option>`).join('')}
            </select>
          </div>
          <div id="swal-custom-type-wrapper" class="premium-form-group col-span-12 md:col-span-6" style="display:none;">
            <label>اكتب نوع المهمة</label>
            <input id="swal-custom-type" class="premium-input" placeholder="مثال: استلام أوراق أو مراجعة جهة" value="${initialData.customType || ''}">
          </div>
          <div id="swal-related-order-wrapper" class="premium-form-group col-span-12 md:col-span-6" style="display:none;">
            <label class="text-primary font-bold">الطلبية المرتبطة (إجباري)</label>
            <select id="swal-related-order" class="premium-input bg-blue-50">
              <option value="">اختر الطلبية...</option>
              ${salesOrders.filter(o => ['تم التسليم للتوصيل', 'تم تسليمها للتوصيل', 'جاهز للتوصيل'].includes(o.status)).map(o => `<option value="${o.orderNumber}" data-customer="${o.customerName || ''}" ${initialData.salesOrderNumber === o.orderNumber ? 'selected' : ''}>${o.orderNumber} - ${o.customerName || 'بدون اسم'}</option>`).join('')}
              ${initialData.salesOrderNumber && !salesOrders.find(o => o.orderNumber === initialData.salesOrderNumber) ? `<option value="${initialData.salesOrderNumber}" selected>${initialData.salesOrderNumber} (مؤرشفة/مخفية)</option>` : ''}
            </select>
          </div>
          <div class="premium-form-group col-span-12 md:col-span-6">
            <label>الشركة التابع لها المشوار</label>
            <select id="swal-source" class="premium-input">
              <option value="" disabled ${!initialData.sourceEntity ? 'selected' : ''}>اختر الشركة</option>
              ${SOURCE_ENTITY_OPTIONS.map(opt => `<option value="${opt}" ${initialData.sourceEntity === opt ? 'selected' : ''}>${opt}</option>`).join('')}
              ${initialData.sourceEntity && !SOURCE_ENTITY_OPTIONS.includes(initialData.sourceEntity) ? `<option value="${initialData.sourceEntity}" selected>${initialData.sourceEntity}</option>` : ''}
            </select>
          </div>
          <div class="premium-form-group col-span-12 md:col-span-6">
            <label>الشركة المتجه إليها</label>
            <input id="swal-target" class="premium-input" placeholder="اكتب اسم الشركة المتجه إليها" value="${initialData.targetEntity || ''}">
          </div>
          <div class="premium-form-group col-span-12 md:col-span-6">
            <label>الموظف المسؤول</label>
            <select id="swal-employee-select" class="premium-input bg-white">
              <option value="">اختر الموظف المسؤول...</option>
              ${employees.map(emp => `<option value="${emp.id}" ${(initialData.assignedEmployeeId === emp.id || initialData.assignedEmployeeName === emp.name) ? 'selected' : ''}>${emp.name}</option>`).join('')}
            </select>
          </div>

          <div class="premium-form-group col-span-12">
            <label>ملاحظات</label>
            <textarea id="swal-details" class="premium-input" style="height: 100px; resize: none;" placeholder="اكتب تفاصيل المهمة هنا...">${initialData.details || ''}</textarea>
          </div>
        </div>
      `,
      didOpen: () => {
        const typeField = document.getElementById('swal-type');
        const orderField = document.getElementById('swal-related-order');

        toggleCustomTypeField();
        typeField?.addEventListener('change', toggleCustomTypeField);

        orderField?.addEventListener('change', (e) => {
          const selectedOption = e.target.options[e.target.selectedIndex];
          if (selectedOption && selectedOption.value) {
            const customerName = selectedOption.getAttribute('data-customer');
            const targetField = document.getElementById('swal-target');
            if (targetField && customerName) {
              targetField.value = customerName;
            }
          }
        });

        const fp = flatpickr(document.getElementById('swal-date'), {
          locale: Arabic,
          dateFormat: "Y-m-d",
          allowInput: true,
          onOpen: function (selectedDates, dateStr, instance) {
            // Fix z-index issue for SweetAlert
            if (instance.calendarContainer) {
              instance.calendarContainer.style.zIndex = 99999;
            }
          }
        });
        // Make the input look nicer
        const swalDate = document.getElementById('swal-date');
        if (swalDate) {
          swalDate.style.border = '1px solid #cbd5e1';
          swalDate.style.borderRadius = '8px';
          swalDate.style.padding = '0.5rem 1rem';
        }
      },
      showCancelButton: true,
      confirmButtonText: isEdit ? 'تحديث المهمة' : 'إرسال المهمة',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        const employeeSelect = document.getElementById('swal-employee-select');
        const employeeId = employeeSelect ? employeeSelect.value : '';
        const matchingEmployee = employees.find((emp) => emp.id === employeeId);
        const employeeName = matchingEmployee ? matchingEmployee.name : '';
        const selectedType = document.getElementById('swal-type').value;
        const customType = document.getElementById('swal-custom-type').value.trim();
        const sourceEntity = document.getElementById('swal-source').value.trim();
        const targetEntity = document.getElementById('swal-target').value.trim();
        const relatedOrder = document.getElementById('swal-related-order')?.value;

        const data = {
          ...initialData,
          type: selectedType,
          customType: selectedType === 'أخرى' ? customType : '',
          sourceEntity,
          targetEntity,
          assignedEmployeeName: employeeName,
          assignedEmployeeId: employeeId,
          dueDate: document.getElementById('swal-date').value,
          details: document.getElementById('swal-details').value,
          salesOrderNumber: selectedType === 'تسليم طلبية' ? relatedOrder : ''
        };

        if (!data.targetEntity || !data.sourceEntity || !data.assignedEmployeeName || !data.dueDate) {
          Swal.showValidationMessage('يرجى تعبئة جميع الخانات المطلوبة بنسبة 100%');
          return false;
        }

        if (selectedType === 'تسليم طلبية' && !relatedOrder) {
          Swal.showValidationMessage('يرجى اختيار الطلبية المرتبطة من قسم الطلبيات');
          return false;
        }

        if (selectedType === 'أخرى' && !customType) {
          Swal.showValidationMessage('يرجى كتابة نوع المهمة عند اختيار "أخرى"');
          return false;
        }

        return data;
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const savedMission = await saveMission(result.value);
        if (savedMission) {
          await addLog({
            userName: user.name,
            userId: user.id,
            module: 'التوصيل',
            action: isEdit ? 'تعديل' : 'إضافة',
            details: `${isEdit ? 'تعديل' : 'إضافة'} مهمة: ${getMissionTypeLabel(savedMission)} إلى ${savedMission.targetEntity}`
          });

          // Trigger WhatsApp notification for new mission
          if (!isEdit) {
            triggerWhatsAppRouting('delivery', 'create', {
              orderNumber: savedMission.relatedOrder || savedMission.id || 'غير محدد',
              driverName: savedMission.assignedEmployeeName || 'غير محدد',
              employeeId: savedMission.assignedEmployeeId || ''
            });
          }

          Swal.fire({ icon: 'success', title: 'تمت العملية بنجاح', timer: 1500, showConfirmButton: false });
          fetchData();
        }
      }
    });
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
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
      text: 'لا يمكن التراجع عن هذا الإجراء!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
      const missionToDelete = missions.find((mission) => mission.id === id);
      await deleteMission(id);
      await addLog({
        userName: user.name,
        userId: user.id,
        module: 'التوصيل',
        action: 'حذف',
        details: `حذف مهمة: ${getMissionTypeLabel(missionToDelete) || id}`
      });
      fetchData();
    }
  };

  const handleViewDetails = (mission) => {
    if (mission.salesOrderNumber && mission.type === 'تسليم طلبية') {
      const order = salesOrders.find(o => o.orderNumber === mission.salesOrderNumber);
      if (order) {
        setPreviewOrder(order);
        setShowOrderPreview(true);
        return;
      }
    }
    MySwal.fire({
      title: 'تفاصيل المهمة / الطلبية',
      html: `
        <div style="text-align: right; direction: rtl; font-size: 14px; line-height: 1.6;">
          <p><strong>رقم الطلب:</strong> <span style="color: #0ea5e9;">${mission.missionNumber || '---'}</span></p>
          ${mission.salesOrderNumber ? `<p><strong>رقم الطلبية المرتبطة:</strong> <span style="color: #ef4444;">${mission.salesOrderNumber}</span></p>` : ''}
          <p><strong>نوع المهمة:</strong> ${getMissionTypeLabel(mission)}</p>
          <p><strong>من شركة:</strong> ${mission.sourceEntity || '---'}</p>
          <p><strong>الوجهة:</strong> ${mission.targetEntity || '---'}</p>
          <p><strong>الموظف المسؤول:</strong> ${mission.assignedEmployeeName || '---'}</p>
          <p><strong>تاريخ التنفيذ:</strong> ${mission.dueDate || '---'}</p>
          <p><strong>حالة المهمة:</strong> ${mission.status}</p>
          <hr style="margin: 15px 0; border: 0; border-top: 1px solid #e2e8f0;"/>
          <p><strong>تفاصيل وملاحظات إضافية:</strong></p>
          <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; min-height: 60px;">
            ${mission.details ? mission.details.replace(/\n/g, '<br/>') : '<span style="color: #94a3b8;">لا توجد تفاصيل إضافية</span>'}
          </div>
        </div>
      `,
      confirmButtonText: 'إغلاق',
      customClass: {
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-cancel'
      }
    });
  };

  const handleUpdateStatus = async (id, status) => {
    const mission = missions.find((item) => item.id === id);
    await updateMissionStatus(id, status);

    await createNotification({
      settingKey: 'delivery',
      moduleKey: 'delivery',
      moduleLabel: 'التوصيل',
      title: 'تحديث حالة توصيل',
      message: `تم تحديث حالة المهمة (${getMissionTypeLabel(mission)}) إلى: ${status}`,
      targetEmployeeId: mission.assignedEmployeeId,
      createdById: user.id,
      createdByName: user.name,
      createdByRole: user.level || user.role,
      target: { tab: 'missions' }
    });

    // Trigger WhatsApp notification for status change
    triggerWhatsAppRouting('delivery', 'update', {
      orderNumber: mission.relatedOrder || mission.id || 'غير محدد',
      status: status,
      driverName: mission.assignedEmployeeName || 'غير محدد',
      employeeId: mission.assignedEmployeeId || ''
    });

    await addLog({
      userName: user.name,
      userId: user.id,
      module: 'التوصيل',
      action: 'تعديل حالة',
      details: `تغيير حالة المهمة (${getMissionTypeLabel(mission)}) إلى: ${status}`
    });
    fetchData();
  };

  const handleUpdateEmployee = async (id, employeeId) => {
    const mission = missions.find((item) => item.id === id);
    const matchingEmployee = employees.find((emp) => emp.id === employeeId);
    const employeeName = matchingEmployee ? matchingEmployee.name : '';

    const updatedMission = {
      ...mission,
      assignedEmployeeId: employeeId,
      assignedEmployeeName: employeeName
    };

    const saved = await saveMission(updatedMission);
    if (saved) {
      await createNotification({
        settingKey: 'delivery',
        moduleKey: 'delivery',
        moduleLabel: 'التوصيل',
        title: 'تعيين موظف توصيل',
        message: `تم تعيين الموظف (${employeeName || 'غير محدد'}) للمهمة (${getMissionTypeLabel(mission)})`,
        targetEmployeeId: employeeId,
        createdById: user.id,
        createdByName: user.name,
        createdByRole: user.level || user.role,
        target: { tab: 'missions' }
      });

      // Trigger WhatsApp notification for driver assignment
      triggerWhatsAppRouting('delivery', 'create', {
        orderNumber: mission.relatedOrder || mission.id || 'غير محدد',
        driverName: employeeName || 'غير محدد',
        employeeId: employeeId || ''
      });

      await addLog({
        userName: user.name,
        userId: user.id,
        module: 'التوصيل',
        action: 'تعديل',
        details: `تعيين الموظف ${employeeName || 'بدون اسم'} للمهمة: ${getMissionTypeLabel(mission)}`
      });
      fetchData();
    }
  };

  const getSortedData = (data) => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      let valueA = sortConfig.key === 'type' ? getMissionTypeLabel(a) : (a[sortConfig.key] || '');
      let valueB = sortConfig.key === 'type' ? getMissionTypeLabel(b) : (b[sortConfig.key] || '');

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortConfig.direction === 'asc' ? valueA - valueB : valueB - valueA;
      }

      const strA = String(valueA);
      const strB = String(valueB);

      return sortConfig.direction === 'asc'
        ? strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' })
        : strB.localeCompare(strA, undefined, { numeric: true, sensitivity: 'base' });
    });
  };

  const filteredMissions = getSortedData(
    missions.filter((mission) => {
      const searchMatches = matchesSearch([
        mission.id, mission.sourceEntity, mission.targetEntity,
        mission.assignedEmployeeName, getMissionTypeLabel(mission)
      ], debouncedSearchTerm);
      const matchesStatus = statusFilter === 'معلق' 
        ? (mission.status !== 'تم الإنجاز' && mission.status !== 'ملغي / تعذر التنفيذ')
        : (statusFilter === 'الكل' || mission.status === statusFilter);
      const matchesSource = sourceFilter === 'الكل' || mission.sourceEntity === sourceFilter;

      let matchesDate = true;
      const missionDueDateStr = mission.dueDate || '';

      if (dateFrom && dateFrom.length > 0) {
        const startDate = dateFrom[0].toLocaleDateString('en-CA');
        if (!missionDueDateStr || missionDueDateStr < startDate) matchesDate = false;
      }
      if (matchesDate && dateTo && dateTo.length > 0) {
        const endDate = dateTo[0].toLocaleDateString('en-CA');
        if (!missionDueDateStr || missionDueDateStr > endDate) matchesDate = false;
      }

      return searchMatches && matchesStatus && matchesSource && matchesDate;
    })
  );

  const getStatusColor = (statusName) => {
    const status = globalSettings.missionStatuses?.find((item) => item.name === statusName);
    return status ? status.color : '#94a3b8';
  };

  return (
    <div className="animate-fade-in">
      <div className="flex-responsive mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="text-primary" /> إدارة التوصيل
          </h2>
        </div>
        {(canPerformAction(user, 'ADD', 'MISSIONS', globalSettings)) && (
          <button className="btn btn-primary flex items-center gap-2" onClick={() => handleOpenModal()}>
            <Plus size={18} /> إنشاء مهمة
          </button>
        )}
      </div>

      <div className="glass-panel mb-4 no-print" style={{ padding: '0.8rem 1rem' }}>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between w-full">
          <div className="flex items-center gap-3 w-full md:max-w-[250px]">
            <Search className="text-muted" size={20} />
            <input
              type="text"
              placeholder="ابحث عن مهمة أو موظف..."
              className="input-field flex-1"
              style={{ marginBottom: 0 }}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            <span className="text-sm font-bold text-slate-500">تصفية:</span>
            <select
              className="input-field"
              style={{ width: 'auto', marginBottom: 0, height: '44px' }}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="الكل">الحالة: الكل</option>
              <option value="معلق">معلق</option>
              {globalSettings.missionStatuses?.map((status) => (
                <option key={status.name} value={status.name}>
                  {status.name}
                </option>
              ))}
            </select>
            <select
              className="input-field"
              style={{ width: 'auto', marginBottom: 0, height: '44px' }}
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
            >
              <option value="الكل">الشركة: الكل</option>
              {SOURCE_ENTITY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', width: 'auto' }}>
                <Flatpickr
                  value={dateFrom}
                  onChange={date => setDateFrom(date)}
                  options={{
                    locale: Arabic,
                    dateFormat: "Y-m-d"
                  }}
                  placeholder="من تاريخ"
                  className="input-field"
                  style={{ width: '180px', marginBottom: 0, height: '44px', paddingRight: '35px', paddingLeft: dateFrom && dateFrom.length > 0 ? '30px' : '15px' }}
                />
                <Calendar size={18} className="text-muted" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                {dateFrom && dateFrom.length > 0 && (
                  <button
                    onClick={() => setDateFrom(null)}
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontWeight: 'bold' }}
                    title="مسح"
                  >
                    X
                  </button>
                )}
              </div>

              <div style={{ position: 'relative', width: 'auto' }}>
                <Flatpickr
                  value={dateTo}
                  onChange={date => setDateTo(date)}
                  options={{
                    locale: Arabic,
                    dateFormat: "Y-m-d"
                  }}
                  placeholder="إلى تاريخ"
                  className="input-field"
                  style={{ width: '180px', marginBottom: 0, height: '44px', paddingRight: '35px', paddingLeft: dateTo && dateTo.length > 0 ? '30px' : '15px' }}
                />
                <Calendar size={18} className="text-muted" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                {dateTo && dateTo.length > 0 && (
                  <button
                    onClick={() => setDateTo(null)}
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontWeight: 'bold' }}
                    title="مسح"
                  >
                    X
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">جارٍ التحميل...</div>
      ) : (
        <>
          {/* Mobile View */}
          <div className="md:hidden flex flex-col gap-4">
            {filteredMissions.map((mission) => (
              <div key={mission.id} style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                
                {/* Row 1: Order Number */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <div style={{ background: '#e0f2f1', color: '#1a8d9b', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                    رقم الطلب
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', direction: 'ltr', color: '#1e293b' }}>
                    {mission.salesOrderNumber ? (
                      <>
                        <span style={{ color: '#ef4444' }}>{mission.salesOrderNumber}</span>
                        <span style={{ color: '#cbd5e1' }}>×</span>
                        <span style={{ color: '#1e293b' }}>{mission.missionNumber || '---'}</span>
                      </>
                    ) : (
                      <span style={{ color: '#1e293b' }}>{mission.missionNumber || '---'}</span>
                    )}
                  </div>
                </div>

                {/* Row 2: Mission Type */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontWeight: 'bold' }}>
                    <ClipboardList size={16} color="#1a8d9b" />
                    <span>نوع المهمة</span>
                  </div>
                  <div style={{ flex: 1, textAlign: 'left', fontWeight: 'bold', color: '#1e293b', fontSize: '14px', direction: 'rtl' }}>
                    {getMissionTypeLabel(mission)}
                  </div>
                </div>

                {/* Row 3: Source Entity */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontWeight: 'bold' }}>
                    <Store size={16} color="#1a8d9b" />
                    <span>من شركة</span>
                  </div>
                  <div style={{ flex: 1, textAlign: 'left', fontWeight: 'bold', color: '#1e293b', fontSize: '14px', direction: 'rtl' }}>
                    {mission.sourceEntity || '---'}
                  </div>
                </div>

                {/* Row 4: Destination */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontWeight: 'bold' }}>
                    <MapPin size={16} color="#1a8d9b" />
                    <span>الوجهة</span>
                  </div>
                  <div style={{ flex: 1, textAlign: 'left', fontWeight: 'bold', color: '#1a8d9b', fontSize: '14px', direction: 'rtl' }}>
                    {mission.targetEntity}
                  </div>
                </div>

                {/* Row 5: Date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontWeight: 'bold' }}>
                    <Calendar size={16} color="#1a8d9b" />
                    <span>تاريخ التنفيذ</span>
                  </div>
                  <div style={{ flex: 1, textAlign: 'left', fontWeight: 'bold', color: '#1e293b', fontSize: '14px', direction: 'rtl' }}>
                    {mission.dueDate || '---'}
                  </div>
                </div>

                {/* Row 6: Employee */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontWeight: 'bold' }}>
                    <UserCheck size={16} color="#1a8d9b" />
                    <span>الموظف</span>
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <select
                      style={{ width: '100%', maxWidth: '200px', appearance: 'none', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: '8px', padding: '8px 12px', fontWeight: 'bold', fontSize: '13px', textAlign: 'right', direction: 'rtl', outline: 'none' }}
                      value={mission.assignedEmployeeId || employees.find(emp => emp.name === mission.assignedEmployeeName)?.id || ''}
                      onChange={(event) => handleUpdateEmployee(mission.id, event.target.value)}
                    >
                      <option value="">-- اختر الموظف --</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '4px' }}>
                  {/* Status Dropdown disguised as a Green Button */}
                  <div style={{ position: 'relative', background: '#1a8d9b', borderRadius: '12px', boxShadow: '0 4px 12px rgba(26, 141, 155, 0.2)' }}>
                    <select
                      style={{ width: '100%', appearance: 'none', border: 'none', color: '#ffffff', padding: '12px 40px', fontWeight: 'bold', fontSize: '14px', backgroundColor: 'transparent', textAlign: 'center', textAlignLast: 'center', direction: 'rtl', outline: 'none', cursor: 'pointer' }}
                      value={mission.status}
                      onChange={(event) => handleUpdateStatus(mission.id, event.target.value)}
                      disabled={!canPerformAction(user, 'EDIT', 'MISSIONS', globalSettings)}
                    >
                      <option value="" disabled style={{ color: '#1e293b' }}>تحديث الحالة</option>
                      {globalSettings.missionStatuses?.map((status) => (
                        <option key={status.name} value={status.name} style={{ color: '#1e293b' }}>
                          {status.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#ffffff', pointerEvents: 'none' }} />
                    <Send size={18} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%) scaleX(-1)', color: '#ffffff', pointerEvents: 'none', opacity: 0.9 }} />
                  </div>

                  {/* Edit & Delete Actions (Admin only) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                     <div 
                        onClick={() => handleViewDetails(mission)}
                        style={{ background: '#f8fafc', border: '1px solid #f1f5f9', color: '#1a8d9b', cursor: 'pointer', borderRadius: '12px', padding: '12px 16px', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '13px' }}
                      >
                      <ChevronRight size={18} style={{ opacity: 0.5 }} />
                      <span>معاينة التفاصيل</span>
                      <Eye size={18} />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        {(canPerformAction(user, 'EDIT', 'MISSIONS', globalSettings)) && (
                          <button style={{ background: '#eff6ff', color: '#3b82f6', padding: '12px', borderRadius: '12px', border: '1px solid #dbeafe', cursor: 'pointer' }} onClick={() => handleOpenModal(mission)}>
                            <Edit2 size={18} />
                          </button>
                        )}
                        {(canPerformAction(user, 'DELETE', 'MISSIONS', globalSettings)) && (
                          <button style={{ background: '#fef2f2', color: '#ef4444', padding: '12px', borderRadius: '12px', border: '1px solid #fee2e2', cursor: 'pointer' }} onClick={() => handleDelete(mission.id)}>
                            <Trash2 size={18} />
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredMissions.length === 0 && (
               <div className="text-center py-10 text-muted glass-panel font-bold">لا توجد مهام مسجلة حالياً</div>
            )}
          </div>

          <div className="hidden md:block table-container glass-panel">
            <table>
              <thead>
              <tr>
                <th onClick={() => handleSort('missionNumber')} className="cursor-pointer hover:text-primary transition-colors">
                  <div className="flex items-center gap-1">رقم الطلب {getSortIcon('missionNumber')}</div>
                </th>
                <th onClick={() => handleSort('type')} className="cursor-pointer hover:text-primary transition-colors">
                  <div className="flex items-center gap-1">نوع المهمة {getSortIcon('type')}</div>
                </th>
                <th onClick={() => handleSort('sourceEntity')} className="cursor-pointer hover:text-primary transition-colors">
                  <div className="flex items-center gap-1">الشركة التابع لها المشوار {getSortIcon('sourceEntity')}</div>
                </th>
                <th onClick={() => handleSort('targetEntity')} className="cursor-pointer hover:text-primary transition-colors">
                  <div className="flex items-center gap-1">الشركة المتجه إليها {getSortIcon('targetEntity')}</div>
                </th>
                <th onClick={() => handleSort('assignedEmployeeName')} className="cursor-pointer hover:text-primary transition-colors">
                  <div className="flex items-center gap-1">الموظف المسؤول {getSortIcon('assignedEmployeeName')}</div>
                </th>
                <th onClick={() => handleSort('dueDate')} className="cursor-pointer hover:text-primary transition-colors">
                  <div className="flex items-center gap-1">موعد التنفيذ {getSortIcon('dueDate')}</div>
                </th>
                <th onClick={() => handleSort('status')} className="cursor-pointer hover:text-primary transition-colors text-center">
                  <div className="flex items-center justify-center gap-1">الحالة {getSortIcon('status')}</div>
                </th>
                <th style={{ textAlign: 'center' }}>تغيير الحالة</th>
                <th style={{ textAlign: 'center' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredMissions.map((mission) => (
                <tr key={mission.id}>
                  <td data-label="رقم الطلب" className="font-bold text-primary">
                    <div>{mission.missionNumber || '---'}</div>
                    {mission.salesOrderNumber && (
                      <div className="flex items-center gap-1 text-xs text-red-500 font-bold mt-1 justify-center md:justify-start" style={{ direction: 'rtl', color: '#ef4444' }}>
                        <Pin size={11} className="text-red-500" style={{ transform: 'rotate(45deg)', flexShrink: 0, color: '#ef4444' }} />
                        <span>{mission.salesOrderNumber}</span>
                      </div>
                    )}
                  </td>
                  <td data-label="نوع المهمة" className="font-bold text-slate-700">{getMissionTypeLabel(mission)}</td>
                  <td data-label="الشركة التابع لها المشوار" className="text-slate-600">{mission.sourceEntity}</td>
                  <td data-label="الشركة المتجه إليها" className="text-primary font-semibold">
                    {mission.targetEntity}
                  </td>
                  <td data-label="الموظف المسؤول">
                    <select
                      className="input-field"
                      style={{ padding: '0 0.5rem', width: '220px', height: '36px', fontSize: '13px', borderRadius: '8px', marginBottom: 0, border: '1px solid var(--primary-light)', fontWeight: 'bold' }}
                      value={mission.assignedEmployeeId || employees.find(emp => emp.name === mission.assignedEmployeeName)?.id || ''}
                      onChange={(event) => handleUpdateEmployee(mission.id, event.target.value)}
                      disabled={!canPerformAction(user, 'EDIT', 'MISSIONS', globalSettings)}
                    >
                      <option value="">-- اختر الموظف --</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td data-label="موعد التنفيذ" className="text-warning font-bold">{mission.dueDate || '---'}</td>
                  <td data-label="الحالة" style={{ textAlign: 'center' }}>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: getStatusColor(mission.status),
                        color: 'white',
                        width: '130px',
                        height: '36px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {mission.status}
                    </span>
                  </td>
                  <td data-label="تغيير الحالة" style={{ textAlign: 'center' }}>
                    <div className="flex justify-center items-center">
                      <select
                        className="input-field"
                        style={{ padding: '0 0.5rem', width: '130px', height: '36px', fontSize: '13px', borderRadius: '8px', marginBottom: 0, border: '1px solid var(--primary-light)' }}
                        value={mission.status}
                        onChange={(event) => handleUpdateStatus(mission.id, event.target.value)}
                        disabled={!canPerformAction(user, 'EDIT', 'MISSIONS', globalSettings)}
                      >
                        {globalSettings.missionStatuses?.map((status) => (
                          <option key={status.name} value={status.name}>
                            {status.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td data-label="إجراءات" style={{ textAlign: 'center' }}>
                    <div className="flex flex-wrap gap-2 justify-center items-center">
                      <div className="flex gap-2 justify-center">
                        <button className="icon-btn" style={{ color: '#1a8d9b', backgroundColor: '#e0f2f1' }} title="معاينة التفاصيل" onClick={() => handleViewDetails(mission)}>
                          <Eye size={16} />
                        </button>
                        {(canPerformAction(user, 'EDIT', 'MISSIONS', globalSettings)) && (
                          <button className="icon-btn icon-btn-edit" title="تعديل" onClick={() => handleOpenModal(mission)}>
                            <Edit2 size={16} />
                          </button>
                        )}
                        {(canPerformAction(user, 'DELETE', 'MISSIONS', globalSettings)) && (
                          <button className="icon-btn icon-btn-delete" title="حذف" onClick={() => handleDelete(mission.id)}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredMissions.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-muted">لا توجد مهام مسجلة حالياً</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Sales Order Preview Modal */}
      {showOrderPreview && previewOrder && (
        <div className="modal-overlay no-print" style={{ zIndex: 10500 }}>
          <div className="modal-content wide animate-fade-in">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-xl font-bold">معاينة الطلبية</h3>
              <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setShowOrderPreview(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="bg-white p-6 border rounded-2xl shadow-sm mb-6 relative overflow-hidden" style={{ direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full" style={{ zIndex: 0 }}></div>
              
              <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-100 relative" style={{ zIndex: 1 }}>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-2">
                    <span className="text-primary">طلبية رقم</span> #{previewOrder.orderNumber}
                  </h2>
                  <div className="text-slate-500 font-bold flex items-center gap-2">
                    <Calendar size={16} /> {previewOrder.orderDate}
                  </div>
                </div>
                <div className="text-left">
                  <div className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-primary/10 text-primary">
                    الحالة: {previewOrder.status || '---'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100 relative" style={{ zIndex: 1 }}>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-400 text-sm font-bold">اسم العميل</span>
                  <span className="text-slate-800 font-bold text-lg">{previewOrder.customerName}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-400 text-sm font-bold">تاريخ التسليم</span>
                  <span className="text-slate-800 font-bold text-lg" style={{ color: '#dc2626' }}>{previewOrder.deliveryDate || 'غير محدد'}</span>
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <span className="text-slate-400 text-sm font-bold">ملاحظات الطلبية</span>
                  <span className="text-slate-800 font-bold">{previewOrder.orderNotes || 'لا توجد ملاحظات'}</span>
                </div>
              </div>

              <h4 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2 relative" style={{ zIndex: 1 }}>
                <Package size={20} className="text-primary" /> الأصناف المطلوبة
              </h4>

              <div className="overflow-x-auto rounded-xl border-2 border-slate-300 relative" style={{ zIndex: 1 }}>
                <table className="w-full text-right" style={{ borderCollapse: 'collapse', minWidth: '600px' }}>
                  <thead>
                    <tr className="bg-slate-200 text-slate-800 text-sm text-right">
                      <th className="p-3 font-bold border border-slate-300 w-12 text-right">#</th>
                      <th className="p-3 font-bold border border-slate-300 text-right">اسم الصنف</th>
                      <th className="p-3 font-bold border border-slate-300 text-right" style={{ width: '130px' }}>الكمية المطلوبة</th>
                      <th className="p-3 font-bold border border-slate-300 text-right">الحالة</th>
                      <th className="p-3 font-bold border border-slate-300 text-right">ملاحظات الصنف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(previewOrder.items || []).map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors text-right">
                        <td className="p-3 text-right text-slate-700 font-bold border border-slate-300">{i + 1}</td>
                        <td className="p-3 font-bold text-primary border border-slate-300 text-right">{item.productName}</td>
                        <td className="p-3 text-right font-black text-slate-800 bg-slate-50/50 border border-slate-300">{item.quantity}</td>
                        <td className="p-3 text-right border border-slate-300">
                          <span className="inline-flex px-3 py-1 rounded-md text-xs font-bold bg-white text-slate-700 border border-slate-300 shadow-sm text-right">
                            {item.itemStatus || '---'}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-slate-700 font-bold border border-slate-300 text-right">{item.notes || '---'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button className="btn btn-outline" onClick={() => setShowOrderPreview(false)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDelivery;
