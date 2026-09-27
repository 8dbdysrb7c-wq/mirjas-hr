/**
 * src/utils/permissions.js
 * 
 * Centralized utility for checking Role-Based Access Control (RBAC) permissions.
 */

import { evaluateAccessPolicy } from './accessPolicy.js';

// A map from module keys used in the RBAC system to legacy user property keys
// for backward compatibility with users who haven't been assigned a role yet.
const LEGACY_ACCESS_KEYS = {
  'production': 'hasProductionAccess',
  'production_sewing': 'hasProductionAccess',
  'production_packaging': 'hasProductionAccess',
  'orders': 'hasSalesAccess', // Historically 'sales'
  'delivery': 'hasDeliveryAccess',
  'stock': 'hasStockAccess',
  'stock_view': 'hasStockAccess',
  'stock_vouchers': 'hasStockAccess',
  'stock_audit': 'hasStockAccess',
  'stock_production': 'hasStockAccess',
  'stock_take': 'hasStockAccess',
  'hr': 'hasHRAccess',
  'hr_employees': 'hasEmployeesAccess',
  'hr_salaries': 'hasHRAccess',
  'hr_advances': 'hasHRAccess',
  'hr_leaves': 'hasHRAccess',
  'hr_overtime': 'hasHRAccess',
  'hr_attendance': 'hasHRAccess',
  'hr_attendance_alerts': 'hasHRAccess',
  'hr_missing_punches': 'hasHRAccess',
  'hr_petitions': 'hasHRAccess',
  'hr_assets': 'hasHRAccess',
  'hr_bonuses_violations': 'hasHRAccess',
  'hr_salary_reports': 'hasHRAccess',
  'hr_settlement': 'hasHRAccess',
  'hr_employee_alerts': 'hasHRAccess',
  'employees': 'hasEmployeesAccess',
  'customers': 'hasCustomersAccess',
  'reports': 'hasReportsAccess',
  'reports_employees': 'hasReportsAccess',
  'reports_sales': 'hasReportsAccess',
  'reports_quotes': 'hasReportsAccess',
  'reports_production': 'hasReportsAccess',
  'reports_delivery': 'hasReportsAccess',
  'reports_stock': 'hasReportsAccess',
  'reports_hr': 'hasReportsAccess',
  'reports_tasks': 'hasReportsAccess',
  'reports_supervisors': 'hasSupervisorReportsAccess',
  'reports_customers': 'hasReportsAccess',
  'settings': 'hasSettingsAccess',
  'data_management': 'hasSettingsAccess',
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
  'preparation': 'hasPreparationAccess',
  'production_preparation': 'hasPreparationAccess',
  'preparation_tasks': 'hasPreparationTasksAccess'
};

/**
 * Check if a user has a specific permission for a module.
 * 
 * @param {Object} user - The user object (must contain role object or legacy fields)
 * @param {String} module - The module name (e.g., 'production', 'orders')
 * @param {String} action - The action to check ('view', 'add', 'edit', 'delete', 'approve', 'print', 'export')
 * @returns {Boolean} - True if the user has permission, false otherwise.
 */
export const hasPermission = (user, module, action = 'view') => {
  if (!user) return false;

  let targetModule = module;
  if (module === 'production_sewing') targetModule = 'production';
  else if (module === 'production_preparation') targetModule = 'preparation';
  else if (module === 'production_packaging' || module === 'production-packaging') targetModule = 'production_packaging';

  // Admins always have full access
  const isUserAdmin = user.role === 'admin' || user.level === 'admin' || user.level === 'إدارة' || user.id === 'admin' || user.type === 'super_admin' || user.isAdmin || user.accessAdmin === true;
  if (isUserAdmin) {
    return true;
  }

  // 1. Direct accessPolicy check (High-fidelity source of truth if configured)
  if (user.accessPolicy && user.accessPolicy.sections) {
    const policyResult = evaluateAccessPolicy(user.accessPolicy, targetModule, action);
    if (typeof policyResult === 'boolean') {
      return policyResult;
    }
  }

  // Handle grouped modules (stock, hr) logic BEFORE legacy fallback
  if (targetModule === 'stock') {
    const stockSubmods = ['stock_view', 'stock_vouchers', 'stock_audit', 'stock_production', 'stock_production_receipt', 'stock_take'];
    
    // Check if new granular permissions exist at all for any stock submodule
    const hasAnyGranularSetting = stockSubmods.some(sm => user.permissions?.[sm] !== undefined);
    
    if (hasAnyGranularSetting) {
      // If granular permissions exist, strictly follow them (no legacy fallback!)
      return stockSubmods.some(sm => user.permissions[sm]?.[action] === true);
    }
    
    // Fallback to legacy
    return Boolean(user.hasStockAccess);
  }

  if (targetModule === 'hr') {
    const hrSubmods = [
      'hr_employees', 'hr_salaries', 'hr_advances', 'hr_leaves', 'hr_overtime',
      'hr_attendance', 'hr_attendance_alerts', 'hr_missing_punches', 'hr_petitions',
      'hr_assets', 'hr_bonuses_violations', 'hr_salary_reports', 'hr_settlement',
      'hr_employee_alerts'
    ];
    
    const hasAnyGranularSetting = hrSubmods.some(sm => user.permissions?.[sm] !== undefined);
    
    if (hasAnyGranularSetting) {
      return hrSubmods.some(sm => user.permissions[sm]?.[action] === true);
    }
    
    return Boolean(user.hasHRAccess || user.hasEmployeesAccess);
  }

  // Alias and handling between reports_supervisors and supervisor_reports
  if (targetModule === 'reports_supervisors' || targetModule === 'supervisor_reports') {
    const isSupervisor = user.level === 'supervisor' || user.level === 'مشرف' || user.level === 'مشرف قسم';

    // 1. If explicitly granted true on either key
    if (user.permissions?.reports_supervisors?.[action] === true || user.permissions?.supervisor_reports?.[action] === true) {
      return true;
    }

    // 2. Supervisor level inherently has view/add/edit/print/export for supervisor reports
    if (isSupervisor && ['view', 'add', 'edit', 'print', 'export'].includes(action)) {
      return true;
    }

    // 3. Legacy flags
    if (user.hasSupervisorReportsAccess === true) return true;
    if (action === 'view' && user.hasReportsAccess === true) return true;

    // 4. If explicitly denied on either matrix key (for non-supervisors)
    if (user.permissions?.reports_supervisors?.[action] === false || user.permissions?.supervisor_reports?.[action] === false) {
      return false;
    }

    return false;
  }

  if (targetModule === 'reports') {
    const isSupervisor = user.level === 'supervisor' || user.level === 'مشرف' || user.level === 'مشرف قسم';
    if (isSupervisor && ['view', 'print', 'export'].includes(action)) {
      return true;
    }
    if (user.hasReportsAccess === true || user.hasSupervisorReportsAccess === true) {
      return true;
    }

    const reportSubmods = [
      'reports_employees', 'reports_sales', 'reports_quotes', 'reports_production',
      'reports_delivery', 'reports_stock', 'reports_hr', 'reports_tasks',
      'reports_supervisors', 'reports_customers', 'scoring', 'supervisor_reports'
    ];
    return reportSubmods.some(sm => hasPermission(user, sm, action));
  }

  if (targetModule.startsWith('reports_')) {
    if (user.permissions?.[targetModule]) {
      const directVal = user.permissions[targetModule][action];
      if (directVal !== undefined) return Boolean(directVal);
    }

    const isSupervisor = user.level === 'supervisor' || user.level === 'مشرف' || user.level === 'مشرف قسم';

    if (targetModule === 'reports_employees') {
      if (user.permissions?.employees?.[action] !== undefined) return Boolean(user.permissions.employees[action]);
      if (user.hasEmployeesAccess || (isSupervisor && ['view', 'print', 'export'].includes(action))) return true;
    }

    if (targetModule === 'reports_production') {
      if (user.permissions?.production?.[action] !== undefined) return Boolean(user.permissions.production[action]);
      if (user.hasProductionAccess || user.hasPreparationAccess || user.role === 'sewing') {
        if (['view', 'print', 'export'].includes(action)) return true;
      }
    }

    if (targetModule === 'reports_sales') {
      if (user.permissions?.orders?.[action] !== undefined) return Boolean(user.permissions.orders[action]);
      if (user.permissions?.sales?.[action] !== undefined) return Boolean(user.permissions.sales[action]);
      if (user.hasSalesAccess) return true;
    }

    if (targetModule === 'reports_delivery') {
      if (user.permissions?.delivery?.[action] !== undefined) return Boolean(user.permissions.delivery[action]);
      if (user.hasDeliveryAccess) return true;
    }

    if (targetModule === 'reports_stock') {
      if (user.permissions?.stock?.[action] !== undefined) return Boolean(user.permissions.stock[action]);
      if (user.hasStockAccess) return true;
    }

    if (targetModule === 'reports_tasks') {
      if (user.permissions?.supervisor_tasks?.[action] !== undefined) return Boolean(user.permissions.supervisor_tasks[action]);
      if (user.permissions?.production_tasks?.[action] !== undefined) return Boolean(user.permissions.production_tasks[action]);
      if (user.hasSupervisorTasksAccess || user.hasProductionTasksAccess) return true;
    }

    // Only inherit broad reports permission if explicitly granted true
    if (user.permissions?.['reports']?.[action] === true) {
      return true;
    }

    return Boolean(user.hasReportsAccess);
  }

  // 1. Check direct employee permissions matrix (edited via RolesSettingsTab.jsx)
  if (user.permissions && user.permissions[targetModule]) {
    const directVal = user.permissions[targetModule][action];
    if (directVal !== undefined) {
      return Boolean(directVal);
    }
  }

  // Petty cash is a new financial module; never inherit broad legacy HR access.
  if (targetModule === 'hr_petty_cash') return false;

  // Check individual legacy override checkboxes first (if explicitly set to true)
  const legacyKey = LEGACY_ACCESS_KEYS[targetModule];
  if (legacyKey && user[legacyKey] === true) {
    return true;
  }

  // 2. If user has an explicit role object with a permissions matrix attached (modern RBAC)
  if (user.role && user.role.permissions) {
    const modulePermissions = user.role.permissions[targetModule];
    if (modulePermissions && modulePermissions[action] !== undefined) {
      return Boolean(modulePermissions[action]);
    }
  }

  if (targetModule === 'hr_employees') {
     if (user.hasEmployeesAccess || user.hasHRAccess) {
       return true;
     }
  }

  // If no role and no legacy flag matches, access denied.
  return false;
};
