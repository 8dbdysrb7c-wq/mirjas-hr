import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, X, Save, Lock, User, Users, ChevronDown } from 'lucide-react';
import Swal from 'sweetalert2';
import Select from '../../components/SearchSelect';
import { getRoles, getEmployees, saveEmployee, getGlobalSettings } from '../../store';

const GENERAL_MODULES = {
  overview: 'الرئيسية',
  live: 'التحكم المباشر',
  production: 'إنتاج قيد الخياطة',
  preparation: 'إنتاج قيد التحضير',
  production_packaging: 'قسم التغليف (إنتاج قيد التغليف)',
  production_tasks: 'مهام الإنتاج',
  orders: 'الطلبيات',
  delivery: 'التوصيل',
  customers: 'الزبائن',
  reports: 'التقارير',
  supervisor_tasks: 'مهام المشرفين',
  supervisor_reports: 'تقارير المشرفين',
  rep_visits: 'زيارات المندوبين',
  assigned_missions: 'المهمات المكلّف بها',
  scoring: 'التقييمات / النقاط',
  site_settings: 'إعدادات النظام / الصلاحيات',
  employees: 'إعدادات الموظفين',
  logs: 'سجل العمليات',
  quotes: 'عروض الأسعار',
  pricelists: 'قوائم الأسعار',
  product_costing: 'حاسبة تسعير المنتج (إداري سري)',
  fabric_library: 'مكتبة الأقمشة',
  customer_statements: 'كشوفات حساب الزبائن',
};

const STOCK_MODULES = {
  stock_quick_add: 'إضافة صنف جديد (من شاشات الطلبيات والإنتاج)',
  stock_view: 'معاينة الأرصدة والمخزون',
  stock_vouchers: 'السندات المخزنية (إدخال وإخراج)',
  stock_audit: 'تدقيق وصرف المبيعات',
  stock_production: 'صرف الإنتاج',
  stock_production_receipt: 'استلام منتجات PRO&PREP',
  stock_take: 'الجرد والتسوية المخزنية',
};

const HR_MODULES = {
  hr_employees: 'بيانات وعقود الموظفين',
  hr_salaries: 'احتساب ومسيرات الرواتب',
  hr_advances: 'السلف والخصومات المالية',
  hr_leaves: 'الإجازات والمغادرات',
  hr_overtime: 'ساعات العمل الإضافي',
  hr_attendance: 'سجلات الحضور والغياب',
  hr_attendance_alerts: 'تنبيهات الحضور والانصراف',
  hr_missing_punches: 'الختمات الناقصة',
  hr_petitions: 'الاستدعاءات',
  hr_assets: 'العهدة',
  hr_bonuses_violations: 'المكافآت والمخالفات',
  hr_salary_reports: 'تقارير الرواتب',
  hr_settlement: 'المخالصة وبراءة الذمة',
  hr_employee_alerts: 'تنبيهات الموظفين',
};

const PETTY_CASH_MODULES = { hr_petty_cash: 'السلفة النثرية' };

const REPORTS_MODULES = {
  reports_employees: 'تقرير الموظفين وساعات العمل',
  reports_sales: 'تقرير المبيعات والطلبيات',
  reports_quotes: 'تقرير عروض الأسعار',
  reports_production: 'تقرير مراحل الإنتاج',
  reports_delivery: 'تقرير التوصيل والمندوبين',
  reports_stock: 'تقرير حركة وأرصدة المخزون',
  reports_hr: 'تقرير الموارد البشرية والرواتب',
  reports_tasks: 'تقرير إنجاز المهام',
  reports_supervisors: 'تقرير أداء المشرفين',
  reports_customers: 'تقرير حسابات ومبيعات الزبائن',
  scoring: 'التقييمات والنقاط الإدارية',
};

const MODULES = {
  ...GENERAL_MODULES,
  ...STOCK_MODULES,
  ...HR_MODULES,
  ...PETTY_CASH_MODULES,
  ...REPORTS_MODULES
};

const ACTIONS = {
  view: 'معاينة',
  add: 'إضافة',
  edit: 'تعديل',
  delete: 'حذف',
  final_approve: 'الموافقة النهائية',
  complete_delivery: 'تم الإنجاز',
  assign_delivery: 'تعيين السائق وطريقة التسليم',
  approve: 'اعتماد',
  print: 'طباعة',
  export: 'تصدير',
  add_expense: 'إضافة صرف',
  manage_expense: 'تعديل/حذف صرف',
  view_invoice: 'صور الفواتير'
};

export default function RolesSettingsTab() {
  const [roles, setRoles] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [globalSettings, setGlobalSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Unified selection states
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  
  // Selected employee permissions state
  const [editingEmp, setEditingEmp] = useState(null);
  const [activePermTab, setActivePermTab] = useState('general');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fetchedRoles, fetchedEmployees, fetchedSettings] = await Promise.all([
        getRoles(),
        getEmployees(),
        getGlobalSettings()
      ]);
      setRoles(fetchedRoles);
      setEmployeesList(fetchedEmployees);
      setGlobalSettings(fetchedSettings);
    } catch (error) {
      console.error(error);
      Swal.fire('خطأ', 'حدث خطأ أثناء جلب البيانات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLevelChange = (lvl) => {
    setSelectedLevel(lvl);
    setSelectedEmpIds([]);

    if (!lvl) {
      setEditingEmp(null);
      return;
    }

    // Initialize group permissions matrix (all false by default)
    const groupPermissions = {};
    Object.keys(MODULES).forEach(mod => {
      groupPermissions[mod] = {};
      Object.keys(ACTIONS).forEach(act => {
        groupPermissions[mod][act] = false;
      });
    });

    // Populate from the first employee of this level (if any exists) as a prototype preview
    const prototypeEmp = employeesList.find(e => String(e.level) === String(lvl));
    if (prototypeEmp && prototypeEmp.permissions) {
      Object.keys(MODULES).forEach(mod => {
        Object.keys(ACTIONS).forEach(act => {
          groupPermissions[mod][act] = prototypeEmp.permissions[mod]?.[act] || false;
        });
      });
    }

    setEditingEmp({
      isGroup: true,
      level: lvl,
      name: `كافة مستخدمي نوع (${lvl})`,
      permissions: groupPermissions
    });
  };

  const handleEmployeeChange = (selectedOptions) => {
    // selectedOptions is either an array (multi-select) or a single value (depends on react-select invocation)
    let ids = [];
    if (selectedOptions) {
      if (Array.isArray(selectedOptions)) {
        ids = selectedOptions.map(opt => String(opt.value)).filter(Boolean);
      } else {
        ids = [String(selectedOptions.value)].filter(Boolean);
      }
    }
    
    setSelectedEmpIds(ids);
    if (ids.length === 0) {
      if (selectedLevel) {
        handleLevelChange(selectedLevel);
      } else {
        setEditingEmp(null);
      }
      return;
    }

    if (ids.length === 1) {
      const emp = employeesList.find(e => String(e.id) === ids[0]);
      if (emp) {
        const currentPermissions = emp.permissions || {};
        const fullPermissions = {};
        
        const LEGACY_ACCESS_KEYS = {
          'production': 'hasProductionAccess',
          'orders': 'hasSalesAccess',
          'delivery': 'hasDeliveryAccess',
          'stock': 'hasStockAccess',
          'hr': 'hasHRAccess',
          'employees': 'hasEmployeesAccess',
          'customers': 'hasCustomersAccess',
          'reports': 'hasReportsAccess',
          'settings': 'hasSettingsAccess',
          'supervisor_tasks': 'hasSupervisorTasksAccess',
          'supervisor_reports': 'hasSupervisorReportsAccess',
          'production_tasks': 'hasProductionTasksAccess',
          'scoring': 'hasScoringAccess',
          'logs': 'hasLogsAccess',
          'overview': 'hasOverviewAccess',
          'live': 'hasLiveAccess',
          'rep_visits': 'hasRepVisitsAccess',
          'assigned_missions': 'hasDeliveryAccess',
          'site_settings': 'hasSiteSettingsAccess',
          'hr_attendance_alerts': 'hasHRAccess',
          'hr_missing_punches': 'hasHRAccess',
          'hr_petitions': 'hasHRAccess',
          'hr_assets': 'hasHRAccess',
          'hr_bonuses_violations': 'hasHRAccess',
          'hr_salary_reports': 'hasHRAccess',
          'hr_settlement': 'hasHRAccess',
          'hr_employee_alerts': 'hasHRAccess'
        };

        Object.keys(MODULES).forEach(mod => {
          fullPermissions[mod] = {};
          Object.keys(ACTIONS).forEach(act => {
            let legacyVal = false;
            if (act === 'view') {
              const legacyKey = LEGACY_ACCESS_KEYS[mod];
              if (legacyKey) {
                legacyVal = emp[legacyKey] || false;
              }
            }
            fullPermissions[mod][act] = currentPermissions[mod]?.[act] ?? legacyVal;
          });
        });

        setEditingEmp({
          ...emp,
          permissions: fullPermissions
        });
      }
    } else {
      // Multiple employees selected
      const firstEmp = employeesList.find(e => String(e.id) === ids[0]);
      const groupPermissions = {};
      Object.keys(MODULES).forEach(mod => {
        groupPermissions[mod] = {};
        Object.keys(ACTIONS).forEach(act => {
          groupPermissions[mod][act] = firstEmp?.permissions?.[mod]?.[act] || false;
        });
      });

      setEditingEmp({
        isMultiGroup: true,
        targetIds: ids,
        name: `مجموعة موظفين مخصصة (${ids.length} موظفين)`,
        permissions: groupPermissions
      });
    }
  };

  const handleTogglePermission = (mod, act) => {
    if (!editingEmp) return;
    setEditingEmp(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [mod]: {
          ...prev.permissions[mod],
          [act]: !prev.permissions[mod][act]
        }
      }
    }));
  };

  const handleToggleRow = (mod) => {
    if (!editingEmp) return;
    const allTrue = Object.keys(ACTIONS).every(act => editingEmp.permissions[mod][act]);
    
    const newRow = {};
    Object.keys(ACTIONS).forEach(act => {
      newRow[act] = !allTrue;
    });

    setEditingEmp(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [mod]: newRow
      }
    }));
  };

  const getActiveModules = () => {
    if (activePermTab === 'stock') return STOCK_MODULES;
    if (activePermTab === 'hr') return HR_MODULES;
    if (activePermTab === 'petty_cash') return PETTY_CASH_MODULES;
    if (activePermTab === 'reports') return REPORTS_MODULES;
    return GENERAL_MODULES;
  };

  const isColumnAllChecked = (actKey) => {
    if (!editingEmp) return false;
    const activeMods = getActiveModules();
    return Object.keys(activeMods).every(modKey => editingEmp.permissions[modKey]?.[actKey] || false);
  };

  const handleToggleColumn = (actKey) => {
    if (!editingEmp) return;
    const activeMods = getActiveModules();
    const allChecked = isColumnAllChecked(actKey);

    setEditingEmp(prev => {
      const updatedPerms = { ...prev.permissions };
      Object.keys(activeMods).forEach(modKey => {
        if (!updatedPerms[modKey]) {
          updatedPerms[modKey] = {};
        }
        updatedPerms[modKey][actKey] = !allChecked;
      });
      return {
        ...prev,
        permissions: updatedPerms
      };
    });
  };

  const handleSavePermissions = async () => {
    if (!editingEmp) return;
    try {
      if (editingEmp.isGroup) {
        // Save permissions to ALL matching employees at once!
        const matchedEmps = employeesList.filter(e => String(e.level) === String(editingEmp.level));
        if (matchedEmps.length === 0) {
          Swal.fire('تنبيه', 'لا يوجد موظفون مسجلون بهذا المستوى لتحديث صلاحياتهم.', 'warning');
          return;
        }
        
        await Promise.all(matchedEmps.map(emp => {
          const updatedEmp = {
            ...emp,
            permissions: editingEmp.permissions
          };
          return saveEmployee(updatedEmp);
        }));

        Swal.fire({
          title: 'نجاح',
          text: `تم حفظ وتحديث صلاحيات كافة الموظفين من نوع (${editingEmp.level}) بنجاح!`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } else if (editingEmp.isMultiGroup) {
        // Save permissions to ALL selected targetIds
        const matchedEmps = employeesList.filter(e => editingEmp.targetIds.includes(String(e.id)));
        await Promise.all(matchedEmps.map(emp => {
          const updatedEmp = {
            ...emp,
            permissions: editingEmp.permissions
          };
          return saveEmployee(updatedEmp);
        }));

        Swal.fire({
          title: 'نجاح',
          text: `تم تحديث وحفظ صلاحيات الموظفين المحددين (${editingEmp.targetIds.length} موظفين) بنجاح!`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        // Save single employee permissions
        await saveEmployee(editingEmp);
        Swal.fire({
          title: 'نجاح',
          text: 'تم حفظ صلاحيات الموظف بنجاح',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      }
      
      // Refresh list to update state
      const fetchedEmployees = await getEmployees();
      setEmployeesList(fetchedEmployees);
    } catch (error) {
      console.error(error);
      Swal.fire('خطأ', 'فشل حفظ الصلاحيات', 'error');
    }
  };

  const handleCancel = () => {
    setEditingEmp(null);
    setSelectedLevel('');
    setSelectedEmpIds([]);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold">جاري التحميل...</div>;
  }

  // Filter lists based on selected level/user type
  const filteredEmployeesList = selectedLevel
    ? employeesList.filter(e => String(e.level) === String(selectedLevel))
    : employeesList;

  // Options lists for dropdowns
  const employeeIdOptions = [
    { value: '', label: 'رقم الموظف...' },
    ...filteredEmployeesList.filter(e => e.id).map(e => ({ value: String(e.id), label: String(e.id) }))
  ];

  const employeeNameOptions = [
    { value: '', label: 'اسم الموظف...' },
    ...filteredEmployeesList.filter(e => e.name && e.id).map(e => ({ value: String(e.id), label: e.name }))
  ];

  const userTypeOptions = [
    { value: '', label: 'نوع المستخدم...' },
    ...[...new Set(employeesList.map(e => e.level))].filter(Boolean).map(lvl => ({ value: lvl, label: lvl }))
  ];

  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      cursor: 'pointer',
      minHeight: '44px',
      height: '44px',
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: '0 12px',
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

  return (
    <div className="w-full space-y-6">
      <style>{`
        /* Premium custom checkbox matrix styles */
        .premium-checkbox-container {
          display: inline-block;
          position: relative;
          cursor: pointer;
          width: 22px;
          height: 22px;
          user-select: none;
        }
        .premium-checkbox-container input {
          position: absolute;
          opacity: 0;
          cursor: pointer;
          height: 0;
          width: 0;
        }
        .premium-checkbox-checkmark {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          height: 22px;
          width: 22px;
          background-color: #fff;
          border: 2px solid #cbd5e1;
          border-radius: 6px;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .premium-checkbox-container:hover input ~ .premium-checkbox-checkmark {
          border-color: #0f766e;
          transform: translateX(-50%) scale(1.05);
        }
        .premium-checkbox-container input:checked ~ .premium-checkbox-checkmark {
          background-color: #0f766e;
          border-color: #0f766e;
          box-shadow: 0 0 10px rgba(15, 118, 110, 0.25);
        }
        .premium-checkbox-checkmark:after {
          content: "";
          position: absolute;
          display: none;
        }
        .premium-checkbox-container input:checked ~ .premium-checkbox-checkmark:after {
          display: block;
        }
        .premium-checkbox-container .premium-checkbox-checkmark:after {
          left: 7px;
          top: 3px;
          width: 5px;
          height: 9px;
          border: solid white;
          border-width: 0 2.5px 2.5px 0;
          transform: rotate(45deg);
        }

        /* Pill select all */
        .select-all-pill {
          font-size: 0.75rem;
          font-weight: 700;
          color: #0f766e;
          background-color: #f0fdf4;
          border: 1px solid #ccfbf1;
          padding: 4px 10px;
          border-radius: 12px;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .select-all-pill:hover {
          background-color: #0f766e;
          color: #ffffff;
          border-color: #0f766e;
          transform: translateY(-1px);
        }

        /* Modernized table container shadow */
        .premium-roles-table-container {
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03);
          border: 1px solid #e2e8f0;
        }

        /* Custom buttons styling */
        .btn-premium-cancel {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 20px;
          font-size: 0.875rem;
          font-weight: 700;
          color: #475569;
          background-color: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-premium-cancel:hover {
          background-color: #f1f5f9;
          border-color: #94a3b8;
          color: #1e293b;
          transform: translateY(-1px);
        }

        .btn-premium-save {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 22px;
          font-size: 0.875rem;
          font-weight: 700;
          color: #ffffff;
          background: linear-gradient(135deg, #0f766e, #0d9488);
          border: none;
          border-radius: 12px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(15, 118, 110, 0.2);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-premium-save:hover {
          background: linear-gradient(135deg, #115e59, #0f766e);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(15, 118, 110, 0.3);
        }

        /* Premium custom sub-tabs styles */
        .perm-tabs-container {
          display: flex;
          gap: 20px;
          border-bottom: 2px solid #f1f5f9;
          padding-bottom: 16px;
          margin-top: 28px;
          margin-bottom: 20px;
        }
        .perm-tab-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          font-size: 0.9rem;
          font-weight: 700;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          color: #475569;
        }
        .perm-tab-button:hover {
          background-color: #f8fafc;
          border-color: #94a3b8;
          color: #1e293b;
          transform: translateY(-1px);
        }
        .perm-tab-button.active {
          background: linear-gradient(135deg, #0f766e, #0d9488);
          color: #ffffff;
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(15, 118, 110, 0.2);
        }
      `}</style>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Shield className="text-teal-700 w-7 h-7" />
            أدوار وصلاحيات الموظفين
          </h2>
          <p className="text-sm text-slate-500">اختر موظفاً باستخدام الرقم أو الاسم لعرض وإدارة صلاحياته مباشرة</p>
        </div>
      </div>

      {/* Search Selection Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" dir="rtl">
          {/* User Type Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700">نوع المستخدم</label>
            <Select
              options={userTypeOptions}
              value={userTypeOptions.find(opt => opt.value === selectedLevel) || null}
              onChange={(selected) => handleLevelChange(selected ? selected.value : '')}
              styles={customSelectStyles}
              placeholder="نوع المستخدم..."
              isSearchable={true}
              isClearable={true}
            />
          </div>

          {/* Employee Name Selector */}
          <div className="space-y-2 relative">
            <label className="block text-sm font-bold text-slate-700">اسم الموظف</label>
            <div style={{ position: 'absolute', left: '12px', top: '44px', zIndex: 10, color: '#94a3b8', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
              <User size={16} />
            </div>
            <Select
              isMulti={true}
              options={employeeNameOptions}
              value={employeeNameOptions.filter(opt => selectedEmpIds.includes(String(opt.value)))}
              onChange={(selected) => handleEmployeeChange(selected)}
              styles={{...customSelectStyles, control: (base) => ({...base, ...customSelectStyles.control(), paddingLeft: '24px'})}}
              placeholder="اسم الموظف..."
              isSearchable={true}
              isClearable={true}
            />
          </div>

          {/* Employee ID Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700">رقم الموظف</label>
            <Select
              isMulti={true}
              options={employeeIdOptions}
              value={employeeIdOptions.filter(opt => selectedEmpIds.includes(String(opt.value)))}
              onChange={(selected) => handleEmployeeChange(selected)}
              styles={customSelectStyles}
              placeholder="رقم الموظف..."
              isSearchable={true}
              isClearable={true}
            />
          </div>
        </div>
      </div>

      {/* Matrix view or Placeholder */}
      {editingEmp ? (
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 md:p-8 animate-fade-in space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-800">
                {editingEmp.isGroup 
                  ? `تعديل صلاحيات كافة مستخدمي نوع: ${editingEmp.level}` 
                  : editingEmp.isMultiGroup 
                    ? `تعديل صلاحيات الموظفين المحددين (${editingEmp.targetIds.length} موظفين)` 
                    : `صلاحيات الموظف: ${editingEmp.name}`}
              </h3>
              {!editingEmp.isGroup && !editingEmp.isMultiGroup ? (
                <p className="text-xs text-slate-400 mt-1">الرقم الوظيفي: {editingEmp.id} | المسمى الوظيفي: {editingEmp.jobTitle || 'غير محدد'}</p>
              ) : editingEmp.isGroup ? (
                <p className="text-xs text-slate-400 mt-1">سيتم تطبيق الصلاحيات المحددة أدناه على جميع الموظفين الذين ينتمون إلى هذا النوع دفعة واحدة.</p>
              ) : (
                <p className="text-xs text-slate-400 mt-1">سيتم تطبيق الصلاحيات المحددة أدناه على جميع الموظفين الذين تم تحديدهم في القائمة دفعة واحدة.</p>
              )}
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleCancel}
                className="btn-premium-cancel"
              >
                <X className="w-4 h-4" />
                إلغاء الإجراء
              </button>
              <button
                onClick={handleSavePermissions}
                className="btn-premium-save"
              >
                <Save className="w-4 h-4" />
                حفظ الصلاحيات
              </button>
            </div>
          </div>



          {/* Sub-tabs for Permissions categories */}
          <div className="perm-tabs-container animate-fade-in" dir="rtl">
            <button
              onClick={() => setActivePermTab('general')}
              className={`perm-tab-button ${activePermTab === 'general' ? 'active' : ''}`}
            >
              <span>⚙️</span> الصلاحيات العامة
            </button>
            <button
              onClick={() => setActivePermTab('stock')}
              className={`perm-tab-button ${activePermTab === 'stock' ? 'active' : ''}`}
            >
              <span>📦</span> صلاحيات المخزون التفصيلية
            </button>
            <button
              onClick={() => setActivePermTab('hr')}
              className={`perm-tab-button ${activePermTab === 'hr' ? 'active' : ''}`}
            >
              <span>👥</span> صلاحيات الموارد البشرية التفصيلية
            </button>
            <button
              onClick={() => setActivePermTab('petty_cash')}
              className={`perm-tab-button ${activePermTab === 'petty_cash' ? 'active' : ''}`}
            >
              <span>💵</span> صلاحيات السلفة النثرية
            </button>
            <button
              onClick={() => setActivePermTab('reports')}
              className={`perm-tab-button ${activePermTab === 'reports' ? 'active' : ''}`}
            >
              <span>📊</span> صلاحيات أقسام التقارير التفصيلية
            </button>
          </div>

          {/* Permissions Matrix Table */}
          <div className="premium-roles-table-container overflow-hidden rounded-2xl bg-white mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200">
                    <th className="px-6 py-4.5 font-bold text-slate-700 w-56 text-sm">القسم / الشاشة</th>
                    <th className="px-4 py-4.5 text-center text-slate-400 font-medium"></th>
                    {Object.entries(ACTIONS).map(([actKey, actName]) => (
                      <th key={actKey} className="px-4 py-4.5 font-bold text-slate-700 text-center text-sm">
                        <div className="flex flex-col items-center gap-1.5 justify-center">
                          <span>{actName}</span>
                          <label className="premium-checkbox-container" title="تحديد / إلغاء تحديد العمود بالكامل">
                            <input
                              type="checkbox"
                              checked={isColumnAllChecked(actKey)}
                              onChange={() => handleToggleColumn(actKey)}
                            />
                            <span className="premium-checkbox-checkmark"></span>
                          </label>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(getActiveModules()).map(([modKey, modName]) => (
                    <tr key={modKey} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4 align-middle">
                        <span className="font-extrabold text-slate-800 text-sm">{modName}</span>
                      </td>
                      <td className="px-2 py-4 text-center align-middle">
                        <button 
                          type="button"
                          onClick={() => handleToggleRow(modKey)}
                          className="select-all-pill"
                        >
                          تحديد الكل
                        </button>
                      </td>
                      {Object.keys(ACTIONS).map(actKey => (
                        <td key={actKey} className="px-4 py-4 text-center align-middle">
                          {((['add_expense', 'manage_expense', 'view_invoice'].includes(actKey) && modKey !== 'hr_petty_cash') || (['final_approve', 'complete_delivery', 'assign_delivery'].includes(actKey) && modKey !== 'orders')) ? null : <label className="premium-checkbox-container">
                            <input
                              type="checkbox"
                              checked={editingEmp.permissions[modKey]?.[actKey] || false}
                              onChange={() => handleTogglePermission(modKey, actKey)}
                            />
                            <span className="premium-checkbox-checkmark"></span>
                          </label>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
