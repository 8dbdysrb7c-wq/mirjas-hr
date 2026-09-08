import { hasPermission } from './permissions.js';

export const ACCESS_ACTIONS = { view: 'مشاهدة', create: 'إضافة', edit: 'تعديل', delete: 'حذف', print: 'طباعة', approve: 'اعتماد', transfer: 'تحويل', export: 'تصدير', cancel: 'إلغاء', reopen: 'إعادة فتح' };
export const ACCESS_FIELDS = { quantity: 'الموجود', reserved: 'المحجوز', available: 'المتاح', minimum: 'الحد الأدنى', cost: 'التكلفة', purchasePrice: 'سعر الشراء', salePrice: 'سعر البيع', margin: 'هامش الربح' };
export const ACCESS_WAREHOUSES = ['مصنع المخدة', 'مصنع البياضات'];
export const ACCESS_SECTIONS = [
  ['home', 'الرئيسية', [['overview', 'الرئيسية'], ['live', 'التحكم المباشر']]],
  ['tasks', 'إدارة المهام', [['supervisor_tasks', 'مهام المشرفين'], ['supervisor_reports', 'تقارير المشرفين'], ['assigned_missions', 'المهمات المكلّف بها']]],
  ['inventory', 'المخزون', [['stock_view', 'الأصناف'], ['stock_vouchers', 'سندات المخزون'], ['stock_audit', 'تدقيق المبيعات'], ['stock_production', 'صرف واستلام الإنتاج'], ['stock_take', 'الجرد'], ['stock_quick_add', 'الإضافة السريعة']]],
  ['production', 'إدارة الإنتاج', [['production', 'الخياطة'], ['preparation', 'التحضير'], ['production_tasks', 'مهام الإنتاج']]],
  ['sales', 'المبيعات', [['orders', 'الطلبيات'], ['quotes', 'عروض الأسعار'], ['pricelists', 'قوائم الأسعار'], ['customers', 'العملاء'], ['customer_statements', 'كشوفات الحساب'], ['rep_visits', 'زيارات المندوبين']]],
  ['delivery', 'التوصيل', [['delivery', 'التوصيل']]],
  ['costing', 'تسعير المنتج', [['product_costing', 'حاسبة تسعير المنتج'], ['fabric_library', 'مكتبة القماش']]],
  ['hr', 'الموارد البشرية', [['hr_employees', 'الموظفون'], ['hr_salaries', 'الرواتب'], ['hr_advances', 'السلف'], ['hr_leaves', 'الإجازات'], ['hr_overtime', 'الإضافي'], ['hr_attendance', 'الحضور'], ['hr_attendance_alerts', 'تنبيهات الحضور'], ['hr_missing_punches', 'الختمات الناقصة'], ['hr_petitions', 'الاستدعاءات'], ['hr_assets', 'العهدة'], ['hr_bonuses_violations', 'المكافآت والمخالفات'], ['hr_salary_reports', 'تقارير الرواتب'], ['hr_settlement', 'المخالصة'], ['hr_employee_alerts', 'تنبيهات الموظفين']]],
  ['reports', 'التقارير', [['reports', 'مركز التقارير'], ['scoring', 'التقييمات']]],
  ['settings', 'الإعدادات', [['employees', 'حسابات الموظفين'], ['site_settings', 'إعدادات النظام'], ['logs', 'سجل العمليات']]],
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

export function setAccessMode(policy, sectionId, mode) {
  const next = structuredClone(policy);
  const section = next.sections[sectionId];
  section.mode = mode;
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
