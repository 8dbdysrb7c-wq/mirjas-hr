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
  'reports_supervisors': 'hasReportsAccess',
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
    const stockSubmods = ['stock_view', 'stock_vouchers', 'stock_audit', 'stock_production', 'stock_take'];
    
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

  if (targetModule === 'reports') {
    const reportSubmods = [
      'reports_employees', 'reports_sales', 'reports_quotes', 'reports_production',
      'reports_delivery', 'reports_stock', 'reports_hr', 'reports_tasks',
      'reports_supervisors', 'reports_customers', 'scoring'
    ];
    const hasAnyGranularSetting = reportSubmods.some(sm => user.permissions?.[sm] !== undefined);
    if (hasAnyGranularSetting) {
      return reportSubmods.some(sm => user.permissions[sm]?.[action] === true);
    }
    return Boolean(user.hasReportsAccess);
  }

  if (targetModule.startsWith('reports_')) {
    if (user.permissions?.[targetModule]) {
      const directVal = user.permissions[targetModule][action];
      if (directVal !== undefined) return Boolean(directVal);
    }
    if (user.permissions?.['reports']) {
      const parentVal = user.permissions['reports'][action];
      if (parentVal !== undefined) return Boolean(parentVal);
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

  // Special legacy cases
  if (targetModule === 'supervisor_reports') {
     if (user.hasSupervisorReportsAccess === true || (user.hasSupervisorReportsAccess !== false && (user.level === 'supervisor' || user.level === 'مشرف' || user.level === 'مشرف قسم'))) {
       return true;
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
