/**
 * src/utils/permissions.js
 * 
 * Centralized utility for checking Role-Based Access Control (RBAC) permissions.
 */

// A map from module keys used in the RBAC system to legacy user property keys
// for backward compatibility with users who haven't been assigned a role yet.
const LEGACY_ACCESS_KEYS = {
  'production': 'hasProductionAccess',
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
  'site_settings': 'hasSiteSettingsAccess',
  'preparation': 'hasPreparationAccess',
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

  const targetModule = (module === 'production_sewing' || module === 'production_preparation') 
    ? 'production' 
    : module;

  // Admins always have full access
  const isUserAdmin = user.role === 'admin' || user.level === 'admin' || user.level === 'إدارة' || user.id === 'admin' || user.type === 'super_admin' || user.isAdmin;
  if (isUserAdmin) {
    return true;
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
    const hrSubmods = ['hr_employees', 'hr_salaries', 'hr_advances', 'hr_leaves', 'hr_overtime', 'hr_attendance'];
    
    const hasAnyGranularSetting = hrSubmods.some(sm => user.permissions?.[sm] !== undefined);
    
    if (hasAnyGranularSetting) {
      return hrSubmods.some(sm => user.permissions[sm]?.[action] === true);
    }
    
    return Boolean(user.hasHRAccess || user.hasEmployeesAccess);
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
