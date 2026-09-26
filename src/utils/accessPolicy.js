import { hasPermission } from './permissions.js';

export const ACCESS_ACTIONS = { 
  view: 'مشاهدة', 
  create: 'إضافة', 
  edit: 'تعديل', 
  delete: 'حذف', 
  approve: 'اعتماد', 
  print: 'طباعة', 
  export: 'تصدير',
  add_expense: 'إضافة صرف',
  manage_expense: 'تعديل/حذف صرف',
  view_invoice: 'مشاهدة صور الفواتير'
};

// Logical actions allowed per screen to eliminate clutter and irrelevant checkboxes
export const SCREEN_ALLOWED_ACTIONS = {
  // الرئيسية
  overview: ['view'],
  live: ['view', 'edit'],

  // إدارة المهام
  supervisor_tasks: ['view', 'create', 'edit', 'delete', 'export'],
  supervisor_reports: ['view', 'create', 'edit', 'delete', 'print', 'export'],
  assigned_missions: ['view', 'edit'],

  // المخزون
  stock_view: ['view', 'print', 'export'],
  stock_vouchers: ['view', 'create', 'edit', 'delete', 'approve', 'print', 'export'],
  stock_audit: ['view', 'approve', 'print', 'export'],
  stock_production: ['view', 'create', 'edit', 'delete', 'approve', 'print'],
  stock_production_receipt: ['view', 'create'],
  stock_take: ['view', 'create', 'edit', 'approve', 'print', 'export'],
  stock_quick_add: ['view', 'create'],

  // إدارة الإنتاج
  production: ['view', 'create', 'edit', 'delete', 'print', 'export'],
  preparation: ['view', 'create', 'edit', 'delete', 'print', 'export'],
  production_packaging: ['view', 'create', 'edit', 'print', 'export'],
  production_tasks: ['view', 'create', 'edit', 'delete', 'export'],

  // المبيعات
  orders: ['view', 'create', 'edit', 'delete', 'print', 'export'],
  quotes: ['view', 'create', 'edit', 'delete', 'print', 'export'],
  pricelists: ['view', 'create', 'edit', 'delete', 'export'],
  customers: ['view', 'create', 'edit', 'delete', 'export'],
  customer_statements: ['view', 'print', 'export'],
  rep_visits: ['view', 'create', 'edit', 'delete', 'export'],

  // التوصيل
  delivery: ['view', 'create', 'edit', 'delete', 'print', 'export'],

  // تسعير المنتج
  product_costing: ['view', 'create', 'edit', 'delete', 'print', 'export'],
  fabric_library: ['view', 'create', 'edit', 'delete', 'export'],

  // الموارد البشرية
  hr_employees: ['view', 'create', 'edit', 'delete', 'print', 'export'],
  hr_attendance: ['view', 'create', 'edit', 'delete', 'print', 'export'],
  hr_leaves: ['view', 'create', 'edit', 'delete', 'approve', 'print', 'export'],
  hr_overtime: ['view', 'create', 'edit', 'delete', 'approve', 'print', 'export'],
  hr_advances: ['view', 'create', 'edit', 'delete', 'approve', 'print', 'export'],
  hr_petty_cash: ['view', 'create', 'add_expense', 'manage_expense', 'view_invoice'],
  hr_salaries: ['view', 'create', 'edit', 'delete', 'approve', 'print', 'export'],
  hr_salary_reports: ['view', 'print', 'export'],
  hr_bonuses_violations: ['view', 'create', 'edit', 'delete', 'approve', 'print', 'export'],
  hr_settlement: ['view', 'create', 'edit', 'delete', 'approve', 'print', 'export'],
  hr_assets: ['view', 'create', 'edit', 'delete', 'print', 'export'],
  hr_petitions: ['view', 'create', 'edit', 'delete', 'approve', 'print', 'export'],
  hr_attendance_alerts: ['view', 'print', 'export'],
  hr_missing_punches: ['view', 'edit', 'approve', 'export'],
  hr_employee_alerts: ['view', 'create', 'delete', 'export'],

  // التقارير (شاشات استعراض وتحليل وطباعة وتصدير فقط)
  reports_employees: ['view', 'print', 'export'],
  reports_sales: ['view', 'print', 'export'],
  reports_quotes: ['view', 'print', 'export'],
  reports_production: ['view', 'print', 'export'],
  reports_delivery: ['view', 'print', 'export'],
  reports_stock: ['view', 'print', 'export'],
  reports_hr: ['view', 'print', 'export'],
  reports_tasks: ['view', 'print', 'export'],
  reports_supervisors: ['view', 'print', 'export'],
  reports_customers: ['view', 'print', 'export'],
  scoring: ['view', 'create', 'edit', 'delete', 'approve', 'print', 'export'],

  // الإعدادات
  employees: ['view', 'create', 'edit', 'delete', 'export'],
  site_settings: ['view', 'edit'],
  logs: ['view', 'print', 'export'],
  data_management: ['view', 'edit', 'delete']
};

export const getScreenAllowedActions = (screenId) => {
  return SCREEN_ALLOWED_ACTIONS[screenId] || ['view', 'create', 'edit', 'delete', 'print', 'export'];
};
export const ACCESS_FIELDS = { quantity: 'الموجود', reserved: 'المحجوز', available: 'المتاح', minimum: 'الحد الأدنى', cost: 'التكلفة', purchasePrice: 'سعر الشراء', salePrice: 'سعر البيع', margin: 'هامش الربح' };
export const ACCESS_WAREHOUSES = ['مصنع المخدة', 'مصنع البياضات'];
export const SCREEN_DESCRIPTIONS = {
  // الرئيسية
  overview: 'لوحة المؤشرات والتحليلات العامة والإحصائيات الشاملة للنظام',
  live: 'شاشة المراقبة والتحكم المباشر وحركات النشاط اللحظية',

  // إدارة المهام
  supervisor_tasks: 'مهام المشرفين وتكليفات الإنجاز ومتابعة التنفيذ اليومي',
  supervisor_reports: 'تقارير المشرفين الميدانية وملاحظات الجولات التفقدية',
  assigned_missions: 'المهمات المسندة إلى الموظف شخصياً لتنفيذها ومتابعتها',

  // المخزون
  stock_view: 'معاينة الأصناف والأرصدة الحالية في المستودعات وتفاصيلها',
  stock_vouchers: 'إصدار وتعديل وحذف سندات الإدخال والإخراج المخزنية',
  stock_audit: 'تدقيق سندات المبيعات وصرف بضائع الطلبيات من المستودع',
  stock_production: 'صرف مستلزمات الإنتاج والأقمشة والمواد الخام',
  stock_production_receipt: 'استلام المنتجات من أوامر الإنتاج والتحضير إلى المخزون',
  stock_take: 'عمليات الجرد والتسويات الجردية الدورية للمستودعات',
  stock_quick_add: 'الإضافة السريعة للأصناف والمنتجات مباشرة للمخزون',

  // إدارة الإنتاج
  production: 'أوامر تشغيل الخياطة، خطوط الإنتاج، بطاقات الخياطة، ونقل الكميات إلى التغليف',
  preparation: 'أوامر التحضير والقص، تجهيز الأقمشة والمواد، وكروت طلبات التحضير',
  production_packaging: 'قسم التغليف: استلام المنتجات الجاهزة من الخياطة، التغليف النهائي، وتجهيز التسليم',
  production_tasks: 'متابعة وإسناد مهام كروت الإنتاج اليومية وتكاليف التشغيل',

  // المبيعات
  orders: 'إدارة وإنشاء ومتابعة طلبيات البيع للعملاء وتحديث حالاتها',
  quotes: 'إعداد عروض الأسعار ومتابعة نسب القبول والرفض من العملاء',
  pricelists: 'قوائم الأسعار المعتمدة للعملاء وإدارة شرائح الخصومات',
  customers: 'دليل بيانات وسجلات العملاء ومعلومات التواصل معهم',
  customer_statements: 'كشوفات الحساب المالية للعملاء والمطالبات والتحصيلات',
  rep_visits: 'سجلات زيارات مندوبي المبيعات الميدانية وجدولة المتابعات',

  // التوصيل
  delivery: 'جدولة وإدارة مهمات التوصيل للسائقين والمركبات وتأكيد التسليم',

  // تسعير المنتج
  product_costing: 'حاسبة تسعير وتكاليف المنتجات (قسم إداري سري وحساس)',
  fabric_library: 'مكتبة الأقمشة، الموردين، والمواصفات الفنية للخامات',

  // الموارد البشرية
  hr_employees: 'سجلات وبيانات الموظفين وعقود العمل والملفات الشخصية',
  hr_attendance: 'سجلات الحضور والدوام والانصراف اليومي وساعات العمل',
  hr_leaves: 'طلبات الإجازات والمغادرات ومتابعة الأرصدة والاعتمادات',
  hr_overtime: 'تسجيل ساعات العمل الإضافي واحتسابها واعتمادها للموظفين',
  hr_advances: 'طلبات السلف المالية وجدولة الأقساط الشهرية والخصومات',
  hr_petty_cash: 'سجل السلف النثرية وحركات الصرف والفواتير والمتبقي',
  hr_salaries: 'احتساب ومسيرات الرواتب الشهرية والبدلات والاقتطاعات',
  hr_salary_reports: 'تقارير وكشوفات الرواتب الإجمالية والتحليلات المالية للموظفين',
  hr_bonuses_violations: 'تسجيل واعتماد المكافآت التشجيعية والخصومات والمخالفات',
  hr_settlement: 'مخالصة وبراءة الذمة واحتساب مستحقات نهاية الخدمة للموظف',
  hr_assets: 'تسليم واسترجاع العهد العينية والأجهزة للموظفين وفحصها الدوري',
  hr_petitions: 'استلام الاستدعاءات ومراجعتها والرد على طلبات وتظلمات الموظفين',
  hr_attendance_alerts: 'متابعة وتدقيق إشعارات التأخير والمغادرات المبكرة للموظفين',
  hr_missing_punches: 'معالجة وتصحيح البصمات والختمات غير المسجلة ومراجعتها',
  hr_employee_alerts: 'إرسال واستلام التعاميم والتنبيهات الإدارية للموظفين',

  // التقارير
  reports_employees: 'تحليلات دوام الموظفين، الغياب، التأخير، وساعات العمل الشهرية',
  reports_sales: 'كشوفات طلبيات البيع، المبيعات المكتملة، وحجم المرتجعات',
  reports_quotes: 'تحليل عروض الأسعار ونسب القبول والرفض وأداء المبيعات',
  reports_production: 'أداء خطوط الإنتاج والخياطة، الإنجاز اليومي، والمتأخرات',
  reports_delivery: 'حالة طلبيات التوصيل، الإنجاز، أداء السائقين، ومناطق التوزيع',
  reports_stock: 'جرد المستودعات، النواقص، حركات السندات، والمنتجات التالفة',
  reports_hr: 'تقارير شاملة للرواتب، السلف، الإجازات، وتكاليف الموظفين',
  reports_tasks: 'تقارير مهام العمل المفتوحة والمنجزة ومعدلات سرعة الإنجاز',
  reports_supervisors: 'تقييمات المشرفين الميدانية ومتابعة فِرق العمل والأداء',
  reports_customers: 'تحليل نشاط الزبائن، والعملاء الجدد، ومستويات رضاهم',
  scoring: 'نظام النقاط والتقييم الشهري وإحصائيات كفاءة الموظفين',

  // الإعدادات
  employees: 'إدارة حسابات الموظفين، كلمات المرور، والصلاحيات على النظام',
  site_settings: 'إعدادات النظام العامة وتخصيص الخيارات والشعار والمصانع',
  logs: 'سجل النشاط والعمليات والتدقيق الأمني لجميع حركات المستخدمين',
  data_management: 'إدارة وتصفير البيانات المتقدم والنسخ الاحتياطي للنظام'
};

export const ACCESS_SECTIONS = [
  ['home', 'الرئيسية', [['overview', 'الرئيسية'], ['live', 'التحكم المباشر']]],
  ['tasks', 'إدارة المهام', [['supervisor_tasks', 'مهام المشرفين'], ['supervisor_reports', 'تقارير المشرفين'], ['assigned_missions', 'المهمات المكلّف بها']]],
  ['inventory', 'المخزون', [['stock_view', 'الأصناف'], ['stock_vouchers', 'سندات المخزون'], ['stock_audit', 'تدقيق المبيعات'], ['stock_production', 'صرف الإنتاج'], ['stock_production_receipt', 'استلام منتجات PRO&PREP'], ['stock_take', 'الجرد'], ['stock_quick_add', 'الإضافة السريعة']]],
  ['production', 'إدارة الإنتاج', [['production', 'إنتاج قيد الخياطة'], ['preparation', 'إنتاج قيد التحضير'], ['production_packaging', 'قسم التغليف (إنتاج قيد التغليف)'], ['production_tasks', 'مهام الإنتاج']]],
  ['sales', 'المبيعات', [['orders', 'الطلبيات'], ['quotes', 'عروض الأسعار'], ['pricelists', 'قوائم الأسعار'], ['customers', 'العملاء'], ['customer_statements', 'كشوفات الحساب'], ['rep_visits', 'زيارات المندوبين']]],
  ['delivery', 'التوصيل', [['delivery', 'التوصيل']]],
  ['costing', 'تسعير المنتج', [['product_costing', 'حاسبة تسعير المنتج'], ['fabric_library', 'مكتبة القماش']]],
  ['hr', 'الموارد البشرية', [
    ['hr_employees', 'ملفات وبيانات الموظفين والعقود'],
    ['hr_attendance', 'الحضور والانصراف وسجلات الدوام'],
    ['hr_leaves', 'الإجازات والمغادرات والأرصدة'],
    ['hr_overtime', 'العمل الإضافي والساعات المعتمدة'],
    ['hr_advances', 'السلف المالية والخصومات'],
    ['hr_salaries', 'احتساب ومسيرات الرواتب'],
    ['hr_salary_reports', 'تقارير الرواتب والكشوفات'],
    ['hr_bonuses_violations', 'المكافآت والمخالفات والجزاءات'],
    ['hr_settlement', 'مخالصة وبراءة الذمة ومستحقات نهاية الخدمة'],
    ['hr_assets', 'العهدة والأصول العينية المسلّمة'],
    ['hr_petitions', 'الاستدعاءات والطلبات الإدارية'],
    ['hr_attendance_alerts', 'تنبيهات الحضور والتأخير'],
    ['hr_missing_punches', 'الختمات الناقصة وتصحيح البصمات'],
    ['hr_employee_alerts', 'تنبيهات وتعاميم الموظفين']
  ]],
  ['petty_cash', 'السلفة النثرية', [['hr_petty_cash', 'السلفة النثرية']]],
  ['reports', 'التقارير', [
    ['reports_employees', 'تقارير الموظفين والدوام'],
    ['reports_sales', 'تقارير طلبيات المبيعات'],
    ['reports_quotes', 'تقارير عروض الأسعار'],
    ['reports_production', 'تقارير الإنتاج والخياطة'],
    ['reports_delivery', 'تقارير التوصيل والشحن'],
    ['reports_stock', 'تقارير المخزون والحركات'],
    ['reports_hr', 'تقارير الموارد البشرية والرواتب'],
    ['reports_tasks', 'تقارير المهام المنجزة'],
    ['reports_supervisors', 'تقارير المشرفين والزيارات'],
    ['reports_customers', 'تقارير العملاء والموردين'],
    ['scoring', 'التقييمات ونظام النقاط']
  ]],
  ['settings', 'الإعدادات', [
    ['employees', 'حسابات الموظفين والصلاحيات'],
    ['site_settings', 'إعدادات النظام العامة'],
    ['logs', 'سجل العمليات والتدقيق الأمني'],
    ['data_management', 'إدارة وتصفير البيانات المتقدمة']
  ]],
].map(([id, label, screens]) => ({ id, label, screens: screens.map(([id, label]) => ({ id, label })) }));

const screenKey = (section, screen) => `${section}.${screen}`;
export function createAccessDraft(user, importCurrent = true) {
  const policy = { version: 1, userId: user.id, status: 'draft', sections: {} };
  for (const section of ACCESS_SECTIONS) {
    const screens = {};
    for (const screen of section.screens) {
      screens[screen.id] = Object.fromEntries(Object.keys(ACCESS_ACTIONS).map(action => [action,
        importCurrent && ['view', 'create', 'edit', 'delete', 'print', 'approve', 'export'].includes(action)
          ? hasPermission(user, screen.id, action === 'create' ? 'add' : action) : false]));
    }
    policy.sections[section.id] = { mode: Object.values(screens).some(s => s.view) ? 'custom' : 'hidden', screens,
      fields: Object.fromEntries(Object.keys(ACCESS_FIELDS).map(field => [field, false])),
      scope: 'all', warehouses: [...ACCESS_WAREHOUSES], expiresAt: '' };
  }
  return policy;
}

export function normalizePolicy(policy, user) {
  if (!policy || !policy.sections) return createAccessDraft(user || {});
  const next = structuredClone(policy);
  for (const section of ACCESS_SECTIONS) {
    if (!next.sections[section.id]) {
      next.sections[section.id] = {
        mode: 'hidden',
        screens: {},
        fields: Object.fromEntries(Object.keys(ACCESS_FIELDS).map(field => [field, false])),
        scope: 'all',
        warehouses: [...ACCESS_WAREHOUSES],
        expiresAt: ''
      };
    }
    const sec = next.sections[section.id];
    if (!sec.screens) sec.screens = {};
    for (const screen of section.screens) {
      if (!sec.screens[screen.id]) {
        sec.screens[screen.id] = Object.fromEntries(Object.keys(ACCESS_ACTIONS).map(action => [action, false]));
      }
    }
  }
  return next;
}

export function setAccessMode(policy, sectionId, mode) {
  const next = structuredClone(policy);
  const section = next.sections[sectionId];
  if (!section) return next;
  section.mode = mode;
  if (!section.screens) section.screens = {};
  const metaSection = ACCESS_SECTIONS.find(s => s.id === sectionId);
  if (metaSection) {
    for (const sc of metaSection.screens) {
      if (!section.screens[sc.id]) {
        section.screens[sc.id] = Object.fromEntries(Object.keys(ACCESS_ACTIONS).map(a => [a, false]));
      }
    }
  }
  if (mode !== 'custom') for (const screen of Object.values(section.screens)) {
    for (const action of Object.keys(ACCESS_ACTIONS)) screen[action] = mode === 'use'
      ? ['view', 'create', 'edit', 'print'].includes(action) : mode === 'view' && action === 'view';
  }
  return next;
}

// Draft evaluator only. Never used to grant live access until server enforcement is ready.
export function evaluateDraft(policy, sectionId, screenId, action, now = Date.now()) {
  const section = policy?.sections?.[sectionId];
  if (!ACCESS_SECTIONS.some(s => s.id === sectionId && s.screens.some(sc => sc.id === screenId))) return false;
  if (!section || !['view', 'use', 'custom'].includes(section.mode) || !Object.hasOwn(ACCESS_ACTIONS, action)) return false;
  if (section.mode === 'view' && action !== 'view') return false;
  if (section.mode === 'use' && !['view', 'create', 'edit', 'print'].includes(action)) return false;
  if (section.expiresAt && (!Number.isFinite(Date.parse(section.expiresAt)) || Date.parse(section.expiresAt) <= now)) return false;
  return section.screens?.[screenId]?.view === true && section.screens[screenId][action] === true;
}

export function describeDraftChanges(before, after) {
  const changes = [];
  const walk = (a, b, path) => {
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[key], b[key], path ? `${path}.${key}` : key);
    } else changes.push({ key: path, before: a ?? null, after: b ?? null });
  };
  walk(before, after, '');
  return changes;
}

export function draftPermissionKeys(policy) {
  return ACCESS_SECTIONS.flatMap(section => section.screens.flatMap(screen => Object.keys(ACCESS_ACTIONS)
    .filter(action => evaluateDraft(policy, section.id, screen.id, action))
    .map(action => `${screenKey(section.id, screen.id)}.${action}`)));
}

const SECTION_ALIASES = {
  stock: 'inventory',
  inventory: 'inventory',
  sales: 'sales',
  hr: 'hr',
  petty_cash: 'petty_cash',
  costing: 'costing',
  delivery: 'delivery',
  production: 'production',
  reports: 'reports',
  settings: 'settings',
  tasks: 'tasks',
  home: 'home'
};

export function evaluateAccessPolicy(policy, targetModule, action = 'view', now = Date.now()) {
  if (!policy || !policy.sections) return undefined;

  const normAction = action === 'add' ? 'create' : action;

  // 1. Check if checking a whole section or section alias
  const secId = SECTION_ALIASES[targetModule];
  if (secId) {
    const section = policy.sections[secId];
    if (!section) return false;
    if (section.expiresAt && (!Number.isFinite(Date.parse(section.expiresAt)) || Date.parse(section.expiresAt) <= now)) {
      return false;
    }
    if (section.mode === 'hidden') return false;
    if (normAction === 'view') {
      if (section.mode === 'view' || section.mode === 'use') return true;
      if (section.mode === 'custom') {
        return Object.values(section.screens || {}).some(sc => sc.view === true);
      }
    }
    if (section.mode === 'view') return false;
    if (section.mode === 'use') return ['view', 'create', 'edit', 'print'].includes(normAction);
    if (section.mode === 'custom') {
      return Object.values(section.screens || {}).some(sc => sc[normAction] === true);
    }
    return false;
  }

  // 2. Check if checking a specific screen
  const foundSection = ACCESS_SECTIONS.find(s => s.screens.some(sc => sc.id === targetModule));
  if (foundSection) {
    return evaluateDraft(policy, foundSection.id, targetModule, normAction, now);
  }

  return undefined;
}

export function syncLegacyPermissionsFromPolicy(policy) {
  const permissions = {};
  for (const section of ACCESS_SECTIONS) {
    for (const screen of section.screens) {
      permissions[screen.id] = {};
      for (const action of Object.keys(ACCESS_ACTIONS)) {
        const allowed = evaluateDraft(policy, section.id, screen.id, action);
        permissions[screen.id][action] = allowed;
        if (action === 'create') {
          permissions[screen.id]['add'] = allowed;
        }
      }
    }
  }

  const canViewSection = (secId) => {
    const sec = policy?.sections?.[secId];
    if (!sec || sec.mode === 'hidden') return false;
    if (sec.expiresAt && (!Number.isFinite(Date.parse(sec.expiresAt)) || Date.parse(sec.expiresAt) <= Date.now())) return false;
    if (sec.mode === 'view' || sec.mode === 'use') return true;
    return Object.values(sec.screens || {}).some(sc => sc.view === true);
  };

  return {
    permissions,
    hasStockAccess: canViewSection('inventory'),
    hasSalesAccess: canViewSection('sales'),
    hasProductionAccess: canViewSection('production'),
    hasDeliveryAccess: canViewSection('delivery'),
    hasHRAccess: canViewSection('hr'),
    hasEmployeesAccess: evaluateDraft(policy, 'settings', 'employees', 'view') || evaluateDraft(policy, 'hr', 'hr_employees', 'view'),
    hasReportsAccess: canViewSection('reports'),
    hasSettingsAccess: canViewSection('settings'),
    hasSupervisorTasksAccess: evaluateDraft(policy, 'tasks', 'supervisor_tasks', 'view'),
    hasSupervisorReportsAccess: evaluateDraft(policy, 'tasks', 'supervisor_reports', 'view'),
    hasPreparationAccess: evaluateDraft(policy, 'production', 'preparation', 'view'),
    hasCustomersAccess: evaluateDraft(policy, 'sales', 'customers', 'view'),
    hasSiteSettingsAccess: evaluateDraft(policy, 'settings', 'site_settings', 'view'),
    hasLogsAccess: evaluateDraft(policy, 'settings', 'logs', 'view'),
    hasOverviewAccess: evaluateDraft(policy, 'home', 'overview', 'view'),
    hasLiveAccess: evaluateDraft(policy, 'home', 'live', 'view'),
    hasScoringAccess: evaluateDraft(policy, 'reports', 'scoring', 'view'),
  };
}

export function canViewStockField(user, fieldKey) {
  if (!user) return false;
  const isUserAdmin = user.role === 'admin' || user.level === 'admin' || user.level === 'إدارة' || user.id === 'admin' || user.type === 'super_admin' || user.isAdmin;
  if (isUserAdmin) return true;
  const policy = user.accessPolicy;
  if (!policy || !policy.sections?.inventory) return true;
  const inv = policy.sections.inventory;
  if (inv.mode === 'hidden') return false;
  if (inv.fields && typeof inv.fields[fieldKey] === 'boolean') {
    return inv.fields[fieldKey];
  }
  return true;
}

export function getAllowedWarehouses(user) {
  if (!user) return ACCESS_WAREHOUSES;
  const isUserAdmin = user.role === 'admin' || user.level === 'admin' || user.level === 'إدارة' || user.id === 'admin' || user.type === 'super_admin' || user.isAdmin;
  if (isUserAdmin) return ACCESS_WAREHOUSES;
  const policy = user.accessPolicy;
  if (!policy || !policy.sections?.inventory) return ACCESS_WAREHOUSES;
  const inv = policy.sections.inventory;
  if (inv.mode === 'hidden') return [];
  return Array.isArray(inv.warehouses) && inv.warehouses.length > 0 ? inv.warehouses : ACCESS_WAREHOUSES;
}

export function getDataScope(user, sectionId) {
  if (!user) return 'all';
  const isUserAdmin = user.role === 'admin' || user.level === 'admin' || user.level === 'إدارة' || user.id === 'admin' || user.type === 'super_admin' || user.isAdmin;
  if (isUserAdmin) return 'all';
  return user.accessPolicy?.sections?.[sectionId]?.scope || 'all';
}
