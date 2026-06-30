import React, { useEffect, useState } from 'react';
import { Truck, Search, Plus, Trash2, Edit2, ArrowUpDown, Calendar } from 'lucide-react';
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
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { sendWhatsAppNotification } from '../../utils/whatsappService';
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
  const [statusFilter, setStatusFilter] = useState('الكل');
  const [sourceFilter, setSourceFilter] = useState('الكل');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

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
            <input id="swal-employee-name" class="premium-input" placeholder="اكتب اسم الموظف..." value="${initialData.assignedEmployeeName || ''}">
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
        const employeeName = document.getElementById('swal-employee-name').value.trim();
        const matchingEmployee = employees.find((employee) => employee.name === employeeName);
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
          assignedEmployeeId: matchingEmployee ? matchingEmployee.id : '',
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

    await addLog({
      userName: user.name,
      userId: user.id,
      module: 'التوصيل',
      action: 'تعديل حالة',
      details: `تغيير حالة المهمة (${getMissionTypeLabel(mission)}) إلى: ${status}`
    });
    fetchData();
  };

  const getSortedData = (data) => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const valueA = sortConfig.key === 'type' ? getMissionTypeLabel(a) : (a[sortConfig.key] || '');
      const valueB = sortConfig.key === 'type' ? getMissionTypeLabel(b) : (b[sortConfig.key] || '');

      if (valueA < valueB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const filteredMissions = getSortedData(
    missions.filter((mission) => {
      const normalizedSearch = searchTerm.toLowerCase();
      const matchesSearch =
        (mission.sourceEntity || '').toLowerCase().includes(normalizedSearch) ||
        (mission.targetEntity || '').toLowerCase().includes(normalizedSearch) ||
        (mission.assignedEmployeeName || '').toLowerCase().includes(normalizedSearch) ||
        getMissionTypeLabel(mission).toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === 'الكل' || mission.status === statusFilter;
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

      return matchesSearch && matchesStatus && matchesSource && matchesDate;
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
        {canPerformAction(user, 'ADD', 'MISSIONS', globalSettings) && (
          <button className="btn btn-primary flex items-center gap-2" onClick={() => handleOpenModal()}>
            <Plus size={18} /> إنشاء مهمة
          </button>
        )}
      </div>

      <div className="glass-panel mb-4 no-print" style={{ padding: '0.8rem 1rem' }}>
        <div className="flex gap-4 items-center justify-between w-full flex-wrap">
          <div className="flex items-center gap-3 w-full md:max-w-[200px]">
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
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-500">تصفية:</span>
            <select
              className="input-field"
              style={{ width: 'auto', marginBottom: 0, height: '44px' }}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="الكل">الحالة: الكل</option>
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
        <div className="table-container glass-panel">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('missionNumber')} className="cursor-pointer hover:text-primary transition-colors">
                  <div className="flex items-center gap-1">رقم الطلب <ArrowUpDown size={14} className="text-muted" /></div>
                </th>
                <th onClick={() => handleSort('type')} className="cursor-pointer hover:text-primary transition-colors">
                  <div className="flex items-center gap-1">نوع المهمة <ArrowUpDown size={14} className="text-muted" /></div>
                </th>
                <th onClick={() => handleSort('sourceEntity')} className="cursor-pointer hover:text-primary transition-colors">
                  <div className="flex items-center gap-1">الشركة التابع لها المشوار <ArrowUpDown size={14} className="text-muted" /></div>
                </th>
                <th onClick={() => handleSort('targetEntity')} className="cursor-pointer hover:text-primary transition-colors">
                  <div className="flex items-center gap-1">الشركة المتجه إليها <ArrowUpDown size={14} className="text-muted" /></div>
                </th>
                <th onClick={() => handleSort('assignedEmployeeName')} className="cursor-pointer hover:text-primary transition-colors">
                  <div className="flex items-center gap-1">الموظف المسؤول <ArrowUpDown size={14} className="text-muted" /></div>
                </th>
                <th onClick={() => handleSort('dueDate')} className="cursor-pointer hover:text-primary transition-colors">
                  <div className="flex items-center gap-1">موعد التنفيذ <ArrowUpDown size={14} className="text-muted" /></div>
                </th>
                <th onClick={() => handleSort('status')} className="cursor-pointer hover:text-primary transition-colors text-center">
                  <div className="flex items-center justify-center gap-1">الحالة <ArrowUpDown size={14} className="text-muted" /></div>
                </th>
                <th style={{ textAlign: 'center' }}>تغيير الحالة</th>
                <th style={{ textAlign: 'center' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredMissions.map((mission) => (
                <tr key={mission.id}>
                  <td data-label="رقم الطلب" className="font-bold text-primary">{mission.missionNumber || '---'}</td>
                  <td data-label="نوع المهمة" className="font-bold text-slate-700">{getMissionTypeLabel(mission)}</td>
                  <td data-label="الشركة التابع لها المشوار" className="text-slate-600">{mission.sourceEntity}</td>
                  <td data-label="الشركة المتجه إليها" className="text-primary font-semibold">
                    {mission.targetEntity}
                    {mission.salesOrderNumber && <div className="text-xs text-slate-400 font-normal mt-1">{mission.salesOrderNumber}</div>}
                  </td>
                  <td data-label="الموظف المسؤول">{mission.assignedEmployeeName}</td>
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
                        {canPerformAction(user, 'EDIT', 'MISSIONS', globalSettings) && (
                          <button className="icon-btn icon-btn-edit" title="تعديل" onClick={() => handleOpenModal(mission)}>
                            <Edit2 size={16} />
                          </button>
                        )}
                        {canPerformAction(user, 'DELETE', 'MISSIONS', globalSettings) && (
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
      )}
    </div>
  );
};

export default AdminDelivery;
