import React, { useState, useEffect } from 'react';
import { getEmployees, saveEmployees, getDepartments, saveEmployee, deleteEmployee, getGlobalSettings, isAdmin, canPerformAction, addLog, getRoles } from '../../store';
import Select from '../../components/SearchSelect';
import { Plus, Edit2, Trash2, X, Key, Shield, User, Fingerprint, ArrowUpDown, Copy } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import flatpickr from 'flatpickr';
import { Arabic } from 'flatpickr/dist/l10n/ar.js';
import 'flatpickr/dist/themes/airbnb.css';
import UserAccessDesigner from '../../components/UserAccessDesigner';

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

const AdminEmployees = ({ user }) => {
  const [accessEmployee, setAccessEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });
  const [globalSettings, setGlobalSettings] = useState({ userTypes: [] });
  const [rolesList, setRolesList] = useState([]);
  
  // Search and filter states
  const [searchTermId, setSearchTermId] = useState('');
  const [searchTermName, setSearchTermName] = useState('');

  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '10px',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      cursor: 'pointer',
      minHeight: '42px',
      height: '42px',
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
    menu: (provided) => ({
      ...provided,
      zIndex: 9999,
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#0f766e' : state.isFocused ? '#f0fdf4' : 'white',
      color: state.isSelected ? 'white' : '#1e293b',
      cursor: 'pointer',
      ':active': {
        backgroundColor: '#0f766e',
      }
    })
  };
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    roles: [],
    level: 'employee',
    password: '',
    hasSalesAccess: false,
    hasProductionAccess: false,
    hasStockAccess: false
  });

  useEffect(() => {
    const fetchData = async () => {
      const [emps, depts, settings, rolesRes] = await Promise.all([
        getEmployees(),
        getDepartments(),
        getGlobalSettings(),
        getRoles()
      ]);
      setEmployees(emps);
      setDepartments(depts);
      setGlobalSettings(settings);
      setRolesList(rolesRes || []);
    };
    fetchData();
  }, []);

  const handleOpenModal = (emp = null, options = {}) => {
    const isClone = !!emp && options.clone === true;
    const isEdit = !!emp && !isClone;
    let nextId = 'EMP-0001';
    if (!isEdit && employees.length > 0) {
      let maxNum = 0;
      employees.forEach(e => {
        if (e.id && e.id.startsWith('EMP-')) {
          const num = parseInt(e.id.replace('EMP-', ''), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      nextId = `EMP-${String(maxNum + 1).padStart(4, '0')}`;
    }
    const initialData = isEdit ? {
      ...emp,
      jobTitle: emp.jobTitle || '',
      department: emp.department || (emp.roles && emp.roles[0]) || '',
      joinDate: emp.joinDate || '',
      basicSalary: emp.basicSalary || '',
      transportationAllowance: emp.transportationAllowance || '',
      phone: emp.phone || '',
      employmentStatus: emp.employmentStatus || 'فعال',
      employmentType: emp.employmentType || 'permanent',
      contractEndDate: emp.contractEndDate || '',
      terminationDate: emp.terminationDate || emp.serviceEndDate || '',
      hrNotes: emp.hrNotes || '',
      vacationBalance: emp.vacationBalance || '0',
      sickLeaveBalance: emp.sickLeaveBalance || '0',
      allowedLeaveTypes: emp.allowedLeaveTypes || ['إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'],
      allowedMissingPunches: emp.allowedMissingPunches !== undefined ? emp.allowedMissingPunches : 0,
      roles: emp.roles || [],
      role: emp.role || null, // The modern RBAC role object
      level: emp.level || (emp.roles?.includes('admin') ? 'admin' : 'employee'),
      hasSalesAccess: emp.hasSalesAccess || false,
      hasProductionAccess: emp.hasProductionAccess || false,
      hasPreparationAccess: emp.hasPreparationAccess || false,
      hasRepVisitsAccess: emp.hasRepVisitsAccess || false,
      supervisorPermissions: emp.supervisorPermissions || { attendance: true, smoking: true, absences: true, evaluations: true, orders: true },
      assignedEmployees: emp.assignedEmployees || [],
      workShiftName: emp.workShiftName || '',
      shiftStart: emp.shiftStart || '08:00',
      shiftEnd: emp.shiftEnd || '16:00',
      workLocationId: emp.workLocationId || ''
    } : isClone ? {
      id: nextId,
      name: '',
      jobTitle: emp.jobTitle || '',
      department: emp.department || (emp.roles && emp.roles[0]) || '',
      joinDate: new Date().toISOString().split('T')[0],
      dateOfBirth: '',
      basicSalary: '',
      transportationAllowance: '',
      phone: '',
      employmentStatus: 'فعال',
      employmentType: emp.employmentType || 'permanent',
      contractEndDate: '',
      terminationDate: '',
      hrNotes: '',
      vacationBalance: '14',
      sickLeaveBalance: '14',
      allowedLeaveTypes: emp.allowedLeaveTypes || ['إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'],
      allowedMissingPunches: emp.allowedMissingPunches !== undefined ? emp.allowedMissingPunches : 0,
      bonusMissingPunches: 0,
      directManager: emp.directManager || '',
      roles: [...(emp.roles || [])],
      level: emp.level || 'موظف عادي',
      password: '12345678',
      hasOverviewAccess: emp.hasOverviewAccess ?? true,
      hasLiveAccess: emp.hasLiveAccess ?? false,
      hasEmployeesAccess: emp.hasEmployeesAccess ?? false,
      hasSalesAccess: emp.hasSalesAccess ?? false,
      hasProductionAccess: emp.hasProductionAccess ?? false,
      hasProductionTasksAccess: emp.hasProductionTasksAccess ?? false,
      hasPreparationAccess: emp.hasPreparationAccess ?? false,
      hasPreparationTasksAccess: emp.hasPreparationTasksAccess ?? false,
      hasDeliveryAccess: emp.hasDeliveryAccess ?? false,
      hasReportsAccess: emp.hasReportsAccess ?? false,
      hasCustomersAccess: emp.hasCustomersAccess ?? false,
      hasRepVisitsAccess: emp.hasRepVisitsAccess ?? false,
      hasSettingsAccess: emp.hasSettingsAccess ?? false,
      hasStockAccess: emp.hasStockAccess ?? false,
      hasSupervisorTasksAccess: emp.hasSupervisorTasksAccess ?? false,
      hasSupervisorReportsAccess: emp.hasSupervisorReportsAccess ?? false,
      hasSiteSettingsAccess: emp.hasSiteSettingsAccess ?? false,
      hasLogsAccess: emp.hasLogsAccess ?? false,
      role: emp.role || null,
      permissions: emp.permissions || null,
      supervisorPermissions: { ...(emp.supervisorPermissions || { attendance: true, smoking: true, absences: true, evaluations: true, orders: true }) },
      assignedEmployees: [],
      workShiftName: emp.workShiftName || '',
      shiftStart: emp.shiftStart || '08:00',
      shiftEnd: emp.shiftEnd || '16:00',
      workLocationId: emp.workLocationId || '',
      allowAdvances: emp.allowAdvances ?? true,
      useCustomAdvancePeriods: emp.useCustomAdvancePeriods ?? false,
      customAdvancePeriods: Array.isArray(emp.customAdvancePeriods) ? emp.customAdvancePeriods.map(period => ({ ...period })) : [],
      hasSocialSecurity: false,
      socialSecuritySalary: '',
      isHazardousProfession: emp.isHazardousProfession ?? false
    } : {
      id: nextId,
      name: '',
      jobTitle: '',
      department: '',
      joinDate: new Date().toISOString().split('T')[0],
      basicSalary: '',
      transportationAllowance: '',
      phone: '',
      employmentStatus: 'فعال',
      employmentType: 'permanent',
      contractEndDate: '',
      terminationDate: '',
      hrNotes: '',
      vacationBalance: '14',
      sickLeaveBalance: '14',
      allowedLeaveTypes: ['إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'],
      allowedMissingPunches: 0,
      directManager: '',
      roles: [],
      level: 'موظف عادي',
      password: '12345678',
      hasOverviewAccess: true,
      hasEmployeesAccess: false,
      hasSalesAccess: false,
      hasProductionAccess: false,
      hasDeliveryAccess: false,
      hasReportsAccess: false,
      hasCustomersAccess: false,
      hasRepVisitsAccess: false,
      hasSettingsAccess: false,
      hasStockAccess: false,
      role: null,
      supervisorPermissions: { attendance: true, smoking: true, absences: true, evaluations: true, orders: true },
      assignedEmployees: [],
      workShiftName: '',
      shiftStart: '08:00',
      shiftEnd: '16:00',
      workLocationId: ''
    };

    const assignableEmployees = employees.filter(e => e.id !== initialData.id && e.level !== 'admin' && e.level !== 'إدارة');
    
    const assignedEmpCheckboxes = assignableEmployees.map(e => `
      <label class="premium-checkbox-item">
        <input type="checkbox" class="swal-assigned-emp-checkbox" value="${e.id}" ${initialData.assignedEmployees.includes(e.id) ? 'checked' : ''}>
        <span>${e.name}</span>
      </label>
    `).join('');

    const deptCheckboxes = Object.entries(departments).map(([key, name]) => `
      <label class="premium-checkbox-item">
        <input type="checkbox" class="swal-role-checkbox" value="${key}" ${initialData.roles.includes(key) ? 'checked' : ''}>
        <span>${name}</span>
      </label>
    `).join('');

    const managerOptions = employees.filter(e => e.level === 'مشرف' || e.level === 'admin' || e.level === 'إدارة').map(e => `
      <option value="${e.name}" ${initialData.directManager === e.name ? 'selected' : ''}>${e.name}</option>
    `).join('');

    let advancePeriodMode = 'default';
    if (initialData.useCustomAdvancePeriods && initialData.customAdvancePeriods && initialData.customAdvancePeriods.length > 0) {
       const customP = initialData.customAdvancePeriods[0];
       const globalPeriods = globalSettings?.hrSettings?.advancePeriods || [{fromDay: 15, toDay: 20}];
       const globalIndex = globalPeriods.findIndex(p => p.fromDay === customP.fromDay && p.toDay === customP.toDay);
       if (globalIndex !== -1 && initialData.customAdvancePeriods.length === 1) {
           advancePeriodMode = `global_${globalIndex}`;
       } else {
           advancePeriodMode = 'custom';
       }
    }

    const globalPeriodsList = globalSettings?.hrSettings?.advancePeriods || [{fromDay: 15, toDay: 20}];
    const periodOptionsHTML = globalPeriodsList.map((p, idx) => `
        <option value="global_${idx}" ${advancePeriodMode === `global_${idx}` ? 'selected' : ''}>الفترة المعتمدة: من يوم ${p.fromDay} إلى ${p.toDay} من الشهر</option>
    `).join('');

    MySwal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup premium-modal-wide',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions'
      },
      width: '900px',
      buttonsStyling: false,
      showCloseButton: false,
      html: `
        <div class="premium-modal-header">
          <div class="premium-modal-title">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-cog text-primary"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 16v1"/><path d="M19 21v1"/><path d="M22 19h-1"/><path d="M17 19h-1"/><circle cx="19" cy="19" r="2"/></svg>
             <span>${isEdit ? 'تعديل بيانات المستخدم' : isClone ? 'إنشاء موظف من ملف منسوخ' : 'إضافة مستخدم جديد'}</span>
          </div>
          <div class="premium-modal-close" onclick="Swal.close()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </div>
        </div>
        
        <div class="premium-form">
          ${isClone ? `<div style="margin-bottom:16px;padding:12px 14px;border:1px solid #7dd3fc;border-radius:12px;background:#f0f9ff;color:#075985;font-weight:800;line-height:1.7">تم نسخ القالب الوظيفي والصلاحيات من <strong>${emp.name}</strong>. لم تُنسخ الهوية أو الهاتف أو الراتب أو الأرصدة أو السجلات. راجع جميع الحقول قبل الاعتماد.</div>` : ''}
          <div class="grid grid-cols-12 gap-x-8 gap-y-4">
            <div class="col-span-4 premium-form-group">
              <label><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-fingerprint text-muted"><path d="M2 12a10 10 0 0 1 18-6"/><path d="M7 12a5 5 0 0 1 5-5"/><path d="M12 12h.01"/><path d="M22 12a10 10 0 0 1-18 6"/><path d="M12 17a5 5 0 0 1-5-5"/><path d="M17 12a5 5 0 0 0-5-5"/></svg> الرقم الوظيفي</label>
              <input id="swal-id" class="premium-input" placeholder="رقم الموظف" value="${initialData.id}" disabled>
            </div>
            <div class="col-span-8 premium-form-group">
              <label><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user text-muted"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> اسم المستخدم</label>
              <input id="swal-name" class="premium-input" placeholder="الاسم" value="${initialData.name}">
            </div>

            <div class="col-span-4 premium-form-group">
              <label>المسمى الوظيفي</label>
              ${globalSettings?.jobTitles?.length > 0 ? `
                <select id="swal-job-title" class="premium-input">
                  <option value="">-- اختر المسمى الوظيفي --</option>
                  ${globalSettings.jobTitles.map(title => `<option value="${title}" ${initialData.jobTitle === title ? 'selected' : ''}>${title}</option>`).join('')}
                </select>
              ` : `
                <input id="swal-job-title" type="text" class="premium-input" value="${initialData.jobTitle}" placeholder="أضف مسميات وظيفية من الإعدادات">
              `}
            </div>

            <div class="col-span-4 premium-form-group">
              <label>القسم الوظيفي</label>
              ${globalSettings?.departmentsList?.length > 0 ? `
                <select id="swal-department" class="premium-input">
                  <option value="">-- اختر القسم --</option>
                  ${globalSettings.departmentsList.map(dept => `<option value="${dept}" ${initialData.department === dept ? 'selected' : ''}>${dept}</option>`).join('')}
                </select>
              ` : `
                <select id="swal-department" class="premium-input">
                  <option value="">-- اختر القسم --</option>
                  ${Object.entries(departments).map(([k,v]) => `<option value="${k}" ${initialData.department === k ? 'selected' : ''}>${v}</option>`).join('')}
                </select>
              `}
            </div>

            <div class="col-span-4 premium-form-group">
              <label>المدير المباشر</label>
              <select id="swal-direct-manager" class="premium-input">
                <option value="">-- لا يوجد مدير --</option>
                ${managerOptions}
              </select>
            </div>

            <div class="col-span-3 premium-form-group">
              <label>رقم الهاتف</label>
              <input id="swal-phone" class="premium-input" placeholder="رقم الهاتف" value="${initialData.phone}">
            </div>

            <div class="col-span-3 premium-form-group">
              <label>تاريخ الميلاد</label>
              <input id="swal-dob" class="premium-input bg-white" placeholder="اختر تاريخ الميلاد" value="${initialData.dateOfBirth || ''}">
            </div>

            <div class="col-span-3 premium-form-group">
              <label>تاريخ التعيين</label>
              <input id="swal-join-date" class="premium-input bg-white" placeholder="اختر تاريخ التعيين" value="${initialData.joinDate || ''}">
            </div>

            <div class="col-span-3 premium-form-group">
              <label>موعد الزيادة السنوية</label>
              <input id="swal-annual-raise" class="premium-input bg-white" placeholder="اختر تاريخ الزيادة" style="color: #0f766e; font-weight: bold;" value="${initialData.annualRaiseDate || getNextAnnualRaiseDate(initialData.joinDate)}">
            </div>

            <div class="col-span-12 grid grid-cols-4 gap-4">
              <div class="premium-form-group flex flex-col justify-end">
                <label class="whitespace-nowrap">الراتب الأساسي</label>
                <input id="swal-basic-salary" type="number" class="premium-input" placeholder="الراتب الأساسي" value="${initialData.basicSalary}">
              </div>

              <div class="premium-form-group flex flex-col justify-end">
                <label class="whitespace-nowrap">بدل مواصلات</label>
                <input id="swal-transportation-allowance" type="number" class="premium-input" placeholder="بدل مواصلات" value="${initialData.transportationAllowance}">
              </div>

              <div class="premium-form-group flex flex-col justify-end">
                <label class="whitespace-nowrap">الختمات الناقصة <span class="text-muted text-xs font-normal">(شهرياً)</span></label>
                <input id="swal-missing-punches" type="number" class="premium-input" placeholder="عدد الختمات" value="${initialData.allowedMissingPunches}">
              </div>

              <div class="premium-form-group flex flex-col justify-end">
                <label class="whitespace-nowrap">بونص الختمات <span class="text-emerald-600 text-xs font-bold">(لهذا الشهر)</span></label>
                <input id="swal-bonus-missing-punches" type="number" class="premium-input text-emerald-700 font-bold" placeholder="عدد إضافي" value="${initialData.bonusMissingPunches?.[new Date().toISOString().slice(0, 7)] || 0}">
              </div>
            </div>
            
            <div class="col-span-12 grid grid-cols-4 gap-4">
              <div class="premium-form-group flex flex-col justify-end">
                <label class="whitespace-nowrap">رصيد الإجازات السنوي</label>
                <input id="swal-vacation-balance" type="number" class="premium-input" placeholder="رصيد الإجازات السنوي" value="${initialData.vacationBalance !== undefined && initialData.vacationBalance !== null && initialData.vacationBalance !== '' ? initialData.vacationBalance : 14}" ${!(initialData.allowedLeaveTypes || ['إجازة سنوية']).includes('إجازة سنوية') ? 'disabled' : ''}>
              </div>

              <div class="premium-form-group flex flex-col justify-end">
                <label class="whitespace-nowrap">رصيد الإجازات المرضية</label>
                <input id="swal-sick-balance" type="number" class="premium-input" placeholder="رصيد الإجازات المرضية" value="${initialData.sickLeaveBalance !== undefined && initialData.sickLeaveBalance !== null && initialData.sickLeaveBalance !== '' ? initialData.sickLeaveBalance : 14}" ${!(initialData.allowedLeaveTypes || ['إجازة مرضية']).includes('إجازة مرضية') ? 'disabled' : ''}>
              </div>
            </div>

            <div class="col-span-12 premium-form-group">
              <div style="display: flex; flex-direction: column; gap: 8px; padding: 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 8px;">
                <label style="font-weight: bold; display: flex; align-items: center; gap: 8px; cursor: pointer; color: #334155;">
                  <input 
                    type="checkbox" 
                    id="swal-has-social-security"
                    style="width: 18px; height: 18px; accent-color: var(--primary);"
                    ${initialData.hasSocialSecurity ? 'checked' : ''}
                    onchange="document.getElementById('ss-fields-container').style.display = this.checked ? 'block' : 'none';"
                  />
                  مُسجل في الضمان الاجتماعي
                </label>
                <div id="ss-fields-container" style="display: ${initialData.hasSocialSecurity ? 'block' : 'none'}; margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label style="font-size: 0.85rem; color: #64748b; margin-bottom: 4px; display: block;">الراتب الخاضع للضمان</label>
                      <input 
                        id="swal-ss-salary"
                        type="number" 
                        class="premium-input" 
                        placeholder="اتركه فارغاً لاستخدام الراتب الأساسي"
                        value="${initialData.socialSecuritySalary || ''}"
                      />
                    </div>
                    <div style="display: flex; align-items: flex-end;">
                      <label style="font-weight: bold; display: flex; align-items: center; gap: 8px; color: #e11d48; background: #fff1f2; padding: 10px; border-radius: 8px; border: 1px solid #ffe4e6; cursor: pointer; width: 100%;">
                        <input 
                          type="checkbox" 
                          id="swal-hazardous-profession"
                          style="width: 16px; height: 16px; accent-color: #e11d48;" 
                          ${initialData.isHazardousProfession ? 'checked' : ''}
                        />
                        يعمل ضمن مهن خطرة
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-span-12 premium-form-group">
              <label style="margin-bottom: 0.5rem; display: block;">صلاحيات أنواع الإجازة والمغادرة</label>
              <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                ${['إجازة سنوية', 'إجازة مرضية', 'مغادرة خاصة', 'مغادرة عمل', 'إجازة غير مدفوعة', 'بدل عمل إضافي', 'مغادرة الدخان'].map(type => `
                  <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9rem;">
                    <input type="checkbox" class="swal-leave-type" value="${type}" ${(initialData.allowedLeaveTypes || ['إجازة سنوية', 'إجازة مرضية', 'مغادرة خاصة', 'مغادرة عمل', 'إجازة غير مدفوعة', 'بدل عمل إضافي', 'مغادرة الدخان']).includes(type) ? 'checked' : ''} style="width: 16px; height: 16px;" onchange="if(this.value === 'إجازة مرضية') { document.getElementById('swal-sick-balance').disabled = !this.checked; } if(this.value === 'إجازة سنوية') { document.getElementById('swal-vacation-balance').disabled = !this.checked; }" />
                    ${type}
                  </label>
                `).join('')}
              </div>
            </div>

            <div class="col-span-12 premium-form-group">
              <div style="display: flex; flex-direction: column; gap: 8px; padding: 16px; background: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0; margin-top: 8px;">
                <label style="font-weight: bold; display: flex; align-items: center; gap: 8px; cursor: pointer; color: #166534;">
                  <input 
                    type="checkbox" 
                    id="swal-allow-advances"
                    style="width: 18px; height: 18px; accent-color: #16a34a;"
                    ${initialData.allowAdvances !== false ? 'checked' : ''}
                  />
                  صلاحية طلب السلف (السماح للموظف بتقديم طلب سلفة من حسابه)
                </label>
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #bbf7d0;">
                  <label style="font-size: 0.85rem; font-weight: bold; color: #166534; margin-bottom: 8px; display: block;">
                    فترة السماح لتقديم السلف الخاصة بالموظف
                  </label>
                  <select id="swal-adv-mode" class="premium-input" style="border-color: #bbf7d0; background-color: #fff;" onchange="document.getElementById('custom-advances-container').style.display = this.value === 'custom' ? 'flex' : 'none';">
                    <option value="default" ${advancePeriodMode === 'default' ? 'selected' : ''}>جميع الفترات المعتمدة للإدارة (الافتراضي)</option>
                    ${periodOptionsHTML}
                    <option value="custom" ${advancePeriodMode === 'custom' ? 'selected' : ''}>تحديد فترة مخصصة مختلفة...</option>
                  </select>

                  <div id="custom-advances-container" style="display: ${advancePeriodMode === 'custom' ? 'flex' : 'none'}; gap: 15px; align-items: center; margin-top: 12px; padding: 12px; background: #fff; border: 1px dashed #bbf7d0; border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <label style="font-size: 0.85rem; color: #166534; white-space: nowrap;">من يوم:</label>
                      <input id="swal-adv-from" type="number" min="1" max="31" class="premium-input" style="width: 70px; text-align: center; padding: 4px;" value="${initialData.customAdvancePeriods && initialData.customAdvancePeriods[0] ? initialData.customAdvancePeriods[0].fromDay : 1}" />
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <label style="font-size: 0.85rem; color: #166534; white-space: nowrap;">إلى يوم:</label>
                      <input id="swal-adv-to" type="number" min="1" max="31" class="premium-input" style="width: 70px; text-align: center; padding: 4px;" value="${initialData.customAdvancePeriods && initialData.customAdvancePeriods[0] ? initialData.customAdvancePeriods[0].toDay : 5}" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-span-4 premium-form-group">
              <label>فترة الدوام</label>
              ${globalSettings?.workShifts?.length > 0 ? `
                <select id="swal-work-shift" class="premium-input">
                  <option value="">-- اختر فترة الدوام --</option>
                  ${globalSettings.workShifts.map(shift => `<option value="${shift.name}" data-start="${shift.startTime}" data-end="${shift.endTime}" ${initialData.workShiftName === shift.name ? 'selected' : ''}>${shift.name} (${shift.startTime} - ${shift.endTime})</option>`).join('')}
                </select>
              ` : `
                <div class="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 flex items-center h-[42px]">
                  <span>يرجى إضافتها من الإعدادات.</span>
                </div>
              `}
            </div>

            <div class="col-span-4 premium-form-group">
              <label>موقع البصمة (الفرع)</label>
              ${globalSettings?.workLocations?.length > 0 ? `
                <select id="swal-work-location" class="premium-input">
                  <option value="">-- جميع الفروع / غير محدد --</option>
                  <option value="anywhere" ${initialData.workLocationId === 'anywhere' ? 'selected' : ''}>-- السماح بالبصمة من أي مكان (بدون قيود) --</option>
                  ${globalSettings.workLocations.map(loc => `<option value="${loc.id}" ${initialData.workLocationId === loc.id ? 'selected' : ''}>${loc.name}</option>`).join('')}
                </select>
              ` : `
                <div class="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 flex items-center h-[42px]">
                  <span>يرجى إضافة الفروع من الإعدادات العامة.</span>
                </div>
              `}
            </div>

            <div class="col-span-4 premium-form-group">
              <label>نوع التوظيف</label>
              <select id="swal-employment-type" class="premium-input" onchange="document.getElementById('swal-contract-end-container').style.display = this.value === 'fixed_term' ? 'block' : 'none'">
                <option value="permanent" ${initialData.employmentType === 'permanent' ? 'selected' : ''}>موظف دائم</option>
                <option value="fixed_term" ${initialData.employmentType === 'fixed_term' ? 'selected' : ''}>عقد محدد المدة</option>
                <option value="daily_worker" ${initialData.employmentType === 'daily_worker' ? 'selected' : ''}>موظف مياومة</option>
              </select>
            </div>

            <div id="swal-contract-end-container" class="col-span-4 premium-form-group" style="display: ${initialData.employmentType === 'fixed_term' ? 'block' : 'none'};">
              <label>تاريخ انتهاء العقد</label>
              <input id="swal-contract-end-date" class="premium-input bg-white" placeholder="اختر تاريخ انتهاء العقد" value="${initialData.contractEndDate || ''}">
            </div>

            <div class="col-span-4 premium-form-group">
              <label>الحالة الوظيفية</label>
              <select id="swal-employment-status" class="premium-input" onchange="const hidden = this.value === 'فعال'; document.getElementById('swal-hr-notes-container').style.display = hidden ? 'none' : 'block'; document.getElementById('swal-termination-date-container').style.display = hidden ? 'none' : 'block'">
                <option value="فعال" ${initialData.employmentStatus === 'فعال' ? 'selected' : ''}>فعال</option>
                <option value="موقوف" ${initialData.employmentStatus === 'موقوف' ? 'selected' : ''}>موقوف</option>
                <option value="مستقيل" ${initialData.employmentStatus === 'مستقيل' ? 'selected' : ''}>مستقيل</option>
                <option value="منتهي خدمات" ${initialData.employmentStatus === 'منتهي خدمات' ? 'selected' : ''}>منتهي خدمات</option>
              </select>
            </div>

            <div id="swal-termination-date-container" class="col-span-4 premium-form-group" style="display: ${initialData.employmentStatus === 'فعال' ? 'none' : 'block'};">
              <label>تاريخ انتهاء الخدمة</label>
              <input id="swal-termination-date" class="premium-input bg-white" placeholder="اختر تاريخ انتهاء الخدمة" value="${initialData.terminationDate || ''}">
            </div>

            <div id="swal-hr-notes-container" class="col-span-12 premium-form-group" style="display: ${initialData.employmentStatus === 'فعال' ? 'none' : 'block'};">
              <label>ملاحظات (سبب الإيقاف/الاستقالة/الخ)</label>
              <input id="swal-hr-notes" class="premium-input" placeholder="ملاحظات" value="${initialData.hrNotes}">
            </div>

            <div class="col-span-6 premium-form-group">
              <label><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield text-muted"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> نوع المستخدم</label>
              <select id="swal-level" class="premium-input" onchange="const val = this.value; const isSupOrAdmin = val === 'مشرف' || val === 'إدارة' || val === 'admin' || val === 'مدير' || val === 'سوبر مشرف' || val === 'supervisor' || val === 'super_admin'; document.getElementById('custom-permissions-container').style.display = isSupOrAdmin ? 'block' : 'none';">
                ${globalSettings.userTypes.map(type => {
                  const typeName = typeof type === 'string' ? type : type.name;
                  return `<option value="${typeName}" ${initialData.level === typeName ? 'selected' : ''}>${typeName}</option>`;
                }).join('')}
              </select>
            </div>
            <div class="col-span-6 premium-form-group">
              <label><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-key text-muted"><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4.1a1 1 0 0 0-1.4 0l-2.1 2.1a1 1 0 0 0 0 1.4ZM7 18l-6 6"/><path d="M5 14a7 7 0 1 0 10 10L7 16l-2 2Z"/></svg> كلمة المرور</label>
              <input id="swal-password" class="premium-input" placeholder="كلمة المرور" value="${initialData.password}">
            </div>

            <div class="col-span-12 premium-form-group">
              <label><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users text-muted"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> الموظفون التابعون (يظهرون فقط في تقرير هذا المشرف)</label>
              <div class="premium-checkbox-grid" style="grid-template-columns: repeat(3, 1fr); background: #fff; border: 1px solid #e2e8f0; max-height: 200px; overflow-y: auto;">
                ${assignedEmpCheckboxes || '<span class="text-muted text-sm col-span-3 text-center p-2">لا يوجد موظفين متاحين</span>'}
              </div>
              <p class="text-xs text-muted mt-1">إذا لم يتم تحديد أي موظف، سيظهر جميع الموظفين في تقريره (أو حسب الصلاحية).</p>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: isClone ? 'اعتماد وإنشاء الموظف' : 'حفظ البيانات',
      cancelButtonText: 'إلغاء',
      focusConfirm: false,
      didOpen: () => {
        flatpickr('#swal-dob', { locale: Arabic, disableMobile: true, dateFormat: 'Y-m-d' });
        flatpickr('#swal-annual-raise', { locale: Arabic, disableMobile: true, dateFormat: 'Y-m-d' });
        flatpickr('#swal-termination-date', { locale: Arabic, disableMobile: true, dateFormat: 'Y-m-d' });
        flatpickr('#swal-contract-end-date', { locale: Arabic, disableMobile: true, dateFormat: 'Y-m-d' });
        flatpickr('#swal-join-date', { 
          locale: Arabic, 
          disableMobile: true, 
          dateFormat: 'Y-m-d',
          onChange: (selectedDates, dateStr) => {
            const nextRaiseEl = document.getElementById('swal-annual-raise');
            if (nextRaiseEl && nextRaiseEl._flatpickr) {
              nextRaiseEl._flatpickr.setDate(getNextAnnualRaiseDate(dateStr));
            } else if (nextRaiseEl) {
              nextRaiseEl.value = getNextAnnualRaiseDate(dateStr);
            }
          }
        });
      },
      preConfirm: () => {
        const id = document.getElementById('swal-id').value;
        const name = document.getElementById('swal-name').value;
        const jobTitle = document.getElementById('swal-job-title')?.value || '';
        const department = document.getElementById('swal-department')?.value || '';
        const directManager = document.getElementById('swal-direct-manager')?.value || '';
        const phone = document.getElementById('swal-phone')?.value || '';
        const dateOfBirth = document.getElementById('swal-dob')?.value || '';
        const joinDate = document.getElementById('swal-join-date').value;
        const annualRaiseDate = document.getElementById('swal-annual-raise')?.value || '';
        const basicSalary = document.getElementById('swal-basic-salary').value;
        const transportationAllowance = document.getElementById('swal-transportation-allowance')?.value || '';
        const vBalanceRaw = document.getElementById('swal-vacation-balance').value;
        const sBalanceRaw = document.getElementById('swal-sick-balance')?.value;
        const missingPunchesRaw = document.getElementById('swal-missing-punches')?.value;
        const vacationBalance = vBalanceRaw !== '' ? parseInt(vBalanceRaw) : 0;
        const sickLeaveBalance = sBalanceRaw !== '' && sBalanceRaw !== undefined ? parseInt(sBalanceRaw) : 0;
        const allowedMissingPunches = missingPunchesRaw !== '' && missingPunchesRaw !== undefined ? parseInt(missingPunchesRaw) : 0;
        
        const bonusPunchesRaw = document.getElementById('swal-bonus-missing-punches')?.value;
        const currentMonthStr = new Date().toISOString().slice(0, 7);
        const bonusMissingPunches = { ...(initialData.bonusMissingPunches || {}) };
        bonusMissingPunches[currentMonthStr] = bonusPunchesRaw !== '' && bonusPunchesRaw !== undefined ? parseInt(bonusPunchesRaw) : 0;
        const employmentStatus = document.getElementById('swal-employment-status')?.value || 'فعال';
        const employmentType = document.getElementById('swal-employment-type')?.value || 'permanent';
        const contractEndDate = employmentType === 'fixed_term' ? (document.getElementById('swal-contract-end-date')?.value || '') : '';
        const terminationDate = employmentStatus === 'فعال' ? '' : (document.getElementById('swal-termination-date')?.value || '');
        const hrNotes = document.getElementById('swal-hr-notes')?.value || '';
        
        const hasSocialSecurity = document.getElementById('swal-has-social-security')?.checked || false;
        const socialSecuritySalaryRaw = document.getElementById('swal-ss-salary')?.value;
        const socialSecuritySalary = socialSecuritySalaryRaw !== '' && socialSecuritySalaryRaw !== undefined ? Number(socialSecuritySalaryRaw) : (hasSocialSecurity ? Number(basicSalary) : 0);
        const isHazardousProfession = document.getElementById('swal-hazardous-profession')?.checked || false;
        
        const workShiftEl = document.getElementById('swal-work-shift');
        const workShiftName = workShiftEl ? workShiftEl.value : '';
        const selectedOption = workShiftEl ? workShiftEl.options[workShiftEl.selectedIndex] : null;
        const shiftStart = selectedOption && selectedOption.dataset.start ? selectedOption.dataset.start : '08:00';
        const shiftEnd = selectedOption && selectedOption.dataset.end ? selectedOption.dataset.end : '16:00';
        
        const workLocationId = document.getElementById('swal-work-location')?.value || '';
        const allowedLeaveTypes = Array.from(document.querySelectorAll('.swal-leave-type:checked')).map(el => el.value);
        
        const level = document.getElementById('swal-level').value;
        const password = document.getElementById('swal-password').value;

        // Keep permissions and role fields intact since they are managed inside Roles Settings Tab now
        const hasOverviewAccess = initialData.hasOverviewAccess ?? false;
        const hasLiveAccess = initialData.hasLiveAccess ?? false;
        const hasEmployeesAccess = initialData.hasEmployeesAccess ?? false;
        const hasSalesAccess = initialData.hasSalesAccess ?? false;
        const hasProductionAccess = initialData.hasProductionAccess ?? false;
        const hasProductionTasksAccess = initialData.hasProductionTasksAccess ?? false;
        const hasPreparationAccess = initialData.hasPreparationAccess ?? false;
        const hasPreparationTasksAccess = initialData.hasPreparationTasksAccess ?? false;
        const hasDeliveryAccess = initialData.hasDeliveryAccess ?? false;
        const hasReportsAccess = initialData.hasReportsAccess ?? false;
        const hasCustomersAccess = initialData.hasCustomersAccess ?? false;
        const hasRepVisitsAccess = initialData.hasRepVisitsAccess ?? false;
        const hasStockAccess = initialData.hasStockAccess ?? false;
        const hasSupervisorTasksAccess = initialData.hasSupervisorTasksAccess ?? false;
        const hasSupervisorReportsAccess = initialData.hasSupervisorReportsAccess ?? false;
        const hasSiteSettingsAccess = initialData.hasSiteSettingsAccess ?? false;
        const hasLogsAccess = initialData.hasLogsAccess ?? false;
        const hasSettingsAccess = hasProductionTasksAccess;
        
        const selectedRoles = initialData.roles || [];
        const selectedRoleObj = initialData.role || null;
        const employeePermissions = initialData.permissions || null;

        const assignedEmployees = Array.from(document.querySelectorAll('.swal-assigned-emp-checkbox:checked')).map(cb => cb.value);

        const allowAdvances = document.getElementById('swal-allow-advances')?.checked ?? true;
        const advMode = document.getElementById('swal-adv-mode')?.value || 'default';
        let useCustomAdvancePeriods = false;
        let customAdvancePeriods = [];

        if (advMode === 'custom') {
           useCustomAdvancePeriods = true;
           const advFrom = parseInt(document.getElementById('swal-adv-from')?.value || 1);
           const advTo = parseInt(document.getElementById('swal-adv-to')?.value || 5);
           customAdvancePeriods = [{ fromDay: advFrom, toDay: advTo }];
        } else if (advMode.startsWith('global_')) {
           useCustomAdvancePeriods = true;
           const idx = parseInt(advMode.split('_')[1]);
           const globalPeriodsList = globalSettings?.hrSettings?.advancePeriods || [{fromDay: 15, toDay: 20}];
           if (globalPeriodsList[idx]) {
               customAdvancePeriods = [globalPeriodsList[idx]];
           }
        }

        const supervisorPermissions = {
          attendance: true,
          evaluations: true,
          orders: true
        };

        if (!id || !name || !password) {
          Swal.showValidationMessage('يرجى ملء جميع الحقول المطلوبة');
          return false;
        }
        if (employmentStatus !== 'فعال' && !terminationDate) {
          Swal.showValidationMessage('يرجى تحديد تاريخ انتهاء الخدمة للموظف غير الفعال');
          return false;
        }
        if (employmentType === 'fixed_term' && !contractEndDate) {
          Swal.showValidationMessage('يرجى تحديد تاريخ انتهاء العقد محدد المدة');
          return false;
        }
        if (contractEndDate && joinDate && contractEndDate < joinDate) {
          Swal.showValidationMessage('تاريخ انتهاء العقد لا يمكن أن يسبق تاريخ التعيين');
          return false;
        }
        if (terminationDate && joinDate && terminationDate < joinDate) {
          Swal.showValidationMessage('تاريخ انتهاء الخدمة لا يمكن أن يسبق تاريخ التعيين');
          return false;
        }
        return { 
          id, name, jobTitle, department, directManager, phone, dateOfBirth, joinDate, annualRaiseDate, basicSalary, transportationAllowance, employmentStatus, employmentType, contractEndDate, terminationDate, vacationBalance, sickLeaveBalance, allowedMissingPunches, bonusMissingPunches, allowedLeaveTypes, hrNotes, level, password, 
          workShiftName, shiftStart, shiftEnd, workLocationId, hasSocialSecurity, socialSecuritySalary, isHazardousProfession,
          allowAdvances, useCustomAdvancePeriods, customAdvancePeriods,
          hasOverviewAccess, hasLiveAccess, hasEmployeesAccess, hasSalesAccess, 
          hasProductionAccess, hasProductionTasksAccess, hasPreparationAccess, hasPreparationTasksAccess, hasDeliveryAccess, hasReportsAccess, 
          hasCustomersAccess, hasRepVisitsAccess, hasSettingsAccess, hasStockAccess, 
          hasSupervisorTasksAccess, hasSupervisorReportsAccess, hasSiteSettingsAccess, hasLogsAccess, 
          roles: selectedRoles,
          role: selectedRoleObj,
          permissions: employeePermissions,
          supervisorPermissions, assignedEmployees
        };
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const isAdminUser = result.value.level === 'admin' || result.value.level === 'إدارة' || result.value.id === 'admin';
        let newRole = result.value.role;
        if (isAdminUser) {
          newRole = 'admin';
        } else if (newRole === 'admin') {
          newRole = result.value.roles[0] || 'general';
        }
        const savingData = { ...result.value, role: newRole || (result.value.roles[0] || 'general') };
        const allEmps = await getEmployees();
        
        if (!isEdit && allEmps.some(e => e.id === savingData.id)) {
          Swal.fire('خطأ', 'رقم الموظف موجود مسبقاً', 'error');
          return;
        }

        const error = await saveEmployee(savingData);
        if (error) {
          Swal.fire('خطأ', 'فشل الحفظ: ' + (error.message || 'خطأ غير معروف'), 'error');
          return;
        }

        const emps = await getEmployees();
        setEmployees(emps);
        
        Swal.fire({
          title: 'تم الحفظ!',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        await addLog({
          userName: user.name,
          userId: user.id,
          module: 'الموظفين',
          action: isEdit ? 'تعديل' : isClone ? 'نسخ وإضافة' : 'إضافة',
          details: `${isEdit ? 'تعديل' : isClone ? `إنشاء ملف الموظف من قالب ${emp.name}` : 'إضافة'}: ${savingData.name} (${savingData.id})`
        });
      }
    });
  };

  const handleRoleToggle = (key) => {
    // This is currently unused since we moved to Swal, but could be added to Swal if needed.
    // For now, simpler management is preferred by user.
  };

  const handlePasswordChange = async (emp) => {
    const { value: newPassword } = await MySwal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions'
      },
      buttonsStyling: false,
      title: 'تغيير كلمة المرور',
      text: `تغيير كلمة المرور للمستخدم: ${emp.name}`,
      input: 'password',
      inputPlaceholder: 'أدخل كلمة المرور الجديدة',
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off'
      },
      showCancelButton: true,
      confirmButtonText: 'تغيير',
      cancelButtonText: 'إلغاء',
    });

    if (newPassword) {
      if (newPassword.length < 4) {
        Swal.fire('خطأ', 'كلمة المرور قصيرة جداً', 'error');
        return;
      }
      const updatedEmp = { ...emp, password: newPassword };
      const error = await saveEmployee(updatedEmp);
      if (!error) {
        setEmployees(employees.map(e => e.id === emp.id ? updatedEmp : e));
        Swal.fire({
          title: 'تم التغيير!',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      } else {
        Swal.fire('خطأ', 'فشل تغيير كلمة المرور', 'error');
      }
    }
  };

  const handleDelete = (id) => {
    MySwal.fire({
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
      reverseButtons: true
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const empToDelete = employees.find(e => e.id === id);
          const previousEmps = [...employees];
          setEmployees(employees.filter(e => e.id !== id));
          const error = await deleteEmployee(id);
          if (error) throw error;
          
          await addLog({
            userName: user.name,
            userId: user.id,
            module: 'الموظفين',
            action: 'حذف',
            details: `حذف الموظف: ${empToDelete?.name || id}`
          });
          
          MySwal.fire({
            customClass: {
              container: 'premium-modal-container',
              popup: 'premium-modal-popup',
              confirmButton: 'btn-premium-save',
              actions: 'premium-modal-actions'
            },
            buttonsStyling: false,
            title: 'تم الحذف!',
            text: 'تم حذف المستخدم بنجاح.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });
        } catch (error) {
          console.error("Delete failed:", error);
          MySwal.fire({
            customClass: {
              container: 'premium-modal-container',
              popup: 'premium-modal-popup',
              confirmButton: 'btn-premium-save',
              actions: 'premium-modal-actions'
            },
            buttonsStyling: false,
            title: 'خطأ',
            text: 'فشل الحذف: ' + (error.message || 'خطأ غير معروف'),
            icon: 'error'
          });
          const emps = await getEmployees();
          setEmployees(emps);
        }
      }
    });
  };
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredEmployees = employees.filter(emp => {
    const matchId = searchTermId ? String(emp.id) === String(searchTermId) : true;
    const matchName = searchTermName ? String(emp.name) === String(searchTermName) : true;
    return matchId && matchName;
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    if (!sortConfig.key) return 0;
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    
    if (sortConfig.key === 'id') {
      aVal = parseInt(aVal) || 0;
      bVal = parseInt(bVal) || 0;
    }
    
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const employeeIdOptions = [
    { value: '', label: 'رقم الموظف...' },
    ...[...new Set(employees.map(e => e.id))].filter(Boolean).map(id => ({ value: id, label: id }))
  ];

  const employeeNameOptions = [
    { value: '', label: 'اسم الموظف...' },
    ...[...new Set(employees.map(e => e.name))].filter(Boolean).map(name => ({ value: name, label: name }))
  ];

  return (
    <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {accessEmployee && isAdmin(user) && (
        <UserAccessDesigner 
          employee={accessEmployee} 
          employees={employees} 
          actor={user} 
          onClose={() => setAccessEmployee(null)} 
          onSaved={(updatedEmp) => {
            setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
            setAccessEmployee(updatedEmp);
          }}
        />
      )}
      <div className="glass-card flex justify-between items-center">
        <div>
          <h3>إدارة الموظفين والصلاحيات</h3>
          <p className="text-muted">إضافة، تعديل وحذف حسابات الموظفين والمدراء</p>
        </div>
        {canPerformAction(user, 'ADD', 'EMPLOYEES', globalSettings) && (
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} /> إضافة موظف جديد
          </button>
        )}
      </div>

      <div className="glass-card">
        {/* Filters Bar */}
        <div className="flex gap-4 items-center mb-6 flex-wrap no-print" dir="rtl" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          {/* Employee ID Filter */}
          <div style={{ width: '180px', minWidth: '180px', flexShrink: 0 }}>
              <Select
                options={employeeIdOptions}
                value={employeeIdOptions.find(opt => opt.value === searchTermId) || null}
                onChange={(selected) => setSearchTermId(selected ? selected.value : '')}
                styles={{...customSelectStyles, control: (base) => ({...base, height: '42px', minHeight: '42px', borderRadius: '10px', border: '1px solid #e2e8f0'})}}
                placeholder="رقم الموظف..."
                isSearchable={true}
                isClearable={true}
              />
          </div>

          {/* Employee Name Filter */}
          <div style={{ width: '250px', minWidth: '250px', flexShrink: 0, position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, color: '#94a3b8', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                <User size={16} />
              </div>
              <Select
                options={employeeNameOptions}
                value={employeeNameOptions.find(opt => opt.value === searchTermName) || null}
                onChange={(selected) => setSearchTermName(selected ? selected.value : '')}
                styles={{...customSelectStyles, control: (base) => ({...base, height: '42px', minHeight: '42px', borderRadius: '10px', border: '1px solid #e2e8f0', paddingLeft: '24px'})}}
                placeholder="اسم الموظف..."
                isSearchable={true}
                isClearable={true}
              />
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('id')} className="cursor-pointer hover:text-primary transition-colors text-center">
                  <div className="flex items-center justify-center gap-2"><Fingerprint size={14}/> الرقم الوظيفي <ArrowUpDown size={12} className="text-muted" /></div>
                </th>
                <th onClick={() => handleSort('name')} className="cursor-pointer hover:text-primary transition-colors">
                  <div className="flex items-center gap-2"><User size={14}/> اسم المستخدم <ArrowUpDown size={12} className="text-muted" /></div>
                </th>
                <th onClick={() => handleSort('level')} className="cursor-pointer hover:text-primary transition-colors">
                  <div className="flex items-center gap-2"><Shield size={14}/> نوع المستخدم <ArrowUpDown size={12} className="text-muted" /></div>
                </th>
                <th onClick={() => handleSort('department')} className="cursor-pointer hover:text-primary transition-colors">
                  <div className="flex items-center gap-2">القسم الوظيفي <ArrowUpDown size={12} className="text-muted" /></div>
                </th>
                <th onClick={() => handleSort('jobTitle')} className="cursor-pointer hover:text-primary transition-colors">
                  <div className="flex items-center gap-2">المسمى الوظيفي <ArrowUpDown size={12} className="text-muted" /></div>
                </th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {sortedEmployees.map(emp => {
                const empRoles = emp.roles || (emp.role ? [emp.role] : []);
                const empLevel = emp.level || (isAdmin(emp) ? 'admin' : 'employee');
                
                return (
                  <tr key={emp.id}>
                    <td data-label="الرقم الوظيفي" style={{ fontWeight: 'bold', textAlign: 'center' }}>{emp.id}</td>
                    <td data-label="اسم المستخدم">{emp.name}</td>
                    <td data-label="نوع المستخدم">
                      <span className="badge" style={{ 
                        backgroundColor: (globalSettings.userTypes.find(t => t.name === empLevel || t === empLevel)?.color || '#f1f5f9') + '20',
                        color: globalSettings.userTypes.find(t => t.name === empLevel || t === empLevel)?.color || '#475569',
                        border: `1px solid ${globalSettings.userTypes.find(t => t.name === empLevel || t === empLevel)?.color || '#e2e8f0'}40`
                      }}>
                        {empLevel}
                      </span>
                    </td>
                    <td data-label="القسم الوظيفي">{emp.department || '-'}</td>
                    <td data-label="المسمى الوظيفي">{emp.jobTitle || '-'}</td>
                    <td data-label="إجراءات">
                      <div className="flex gap-2 justify-center">
                        {isAdmin(user) && <button className="icon-btn" title="تخصيص واجهة وصلاحيات المستخدم" onClick={() => setAccessEmployee(emp)}><Shield size={16} /></button>}
                        {canPerformAction(user, 'EDIT', 'EMPLOYEES', globalSettings) && (
                          <button className="icon-btn icon-btn-edit" title="تعديل" onClick={() => handleOpenModal(emp)}>
                            <Edit2 size={16} />
                          </button>
                        )}
                        {canPerformAction(user, 'ADD', 'EMPLOYEES', globalSettings) && (
                          <button className="icon-btn" title="نسخ كقالب لموظف جديد" onClick={() => handleOpenModal(emp, { clone: true })} style={{ backgroundColor: '#ecfeff', color: '#0891b2', border: '1px solid #a5f3fc' }}>
                            <Copy size={16} />
                          </button>
                        )}
                        {canPerformAction(user, 'EDIT', 'EMPLOYEES', globalSettings) && (
                          <button className="icon-btn" title="تغيير كلمة المرور" onClick={() => handlePasswordChange(emp)} style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
                            <Key size={16} />
                          </button>
                        )}
                        {canPerformAction(user, 'DELETE', 'EMPLOYEES') && (
                          <button className="icon-btn icon-btn-delete" title="حذف" onClick={() => handleDelete(emp.id)}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminEmployees;
