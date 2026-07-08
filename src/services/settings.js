import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  addDoc,
  limit,
  orderBy,
  updateDoc
} from 'firebase/firestore';

export const defaultEmployees = [
  { id: "admin", name: "المدير العام", role: "admin", level: "admin", password: "admin", avatar: "" }
];

export const defaultDepartments = {
  sewing: "مسطرة الخياطة",
  logistics: "مسطرة اللوجيستي",
  packaging: "مسطرة التغليف"
};

export const defaultTasksData = {
  sewing: [
    { name: "شرشف مطاط مفرد", ops: { "رش": [125, 175], "حبكة": [250, 400], "حبكة مطاط": [225, 300] } },
    { name: "شرشف مطاط مفرد ونص", ops: { "رش": [100, 150], "حبكة": [250, 400], "حبكة مطاط": [225, 300] } },
    { name: "شرشف مطاط مزدوج", ops: { "رش": [80, 120], "حبكة": [250, 400], "حبكة مطاط": [175, 200] } },
    { name: "وجه فلات مفرد", ops: { "درزة": [110, 175] } }
  ],
  logistics: [
    { name: "حشوة قرن 45*45 سم", ops: { "انتاج": [100, 200] } },
    { name: "حشوة توبر مفرد", ops: { "انتاج": [30, 50] } }
  ],
  packaging: [
    { name: "وجه مخدة عطاء", ops: { "انتاج": [500, 700] } },
    { name: "طقم شرشف مطاط مفرد - بكيت", ops: { "انتاج": [100, 150] } }
  ]
};

export const defaultScoring = {
  excellent: 100,
  good: 80,
  poor: 40,
  phoneSafePenalty: 5,
  phoneUnsafePenalty: 10,
  phoneUnsafeBase: 20
};

export const defaultGlobalSettings = {
  siteName: "Mirjas HR",
  logoUrl: "/logo-mrsleep.png",
  primaryColor: "#0f172a",
  itemStatuses: ["مخزون", "قيد التشغيل", "مباع", "تالف", "مفقود", "مرتجع"],
  productionStatuses: ["لم يتم التنفيذ", "مرحلة القص", "مرحلة الخياطة", "مرحلة التغليف", "مرحلة المستودع", "منتهي", "ملغي"],
  salesStatuses: ["جديد", "قيد التجهيز", "جاهز للتوصيل", "تم تسليمها للتوصيل", "تم التوصيل", "ملغي", "مرفوض"],
  salesItemStatuses: ["جديد", "قيد التجهيز", "جاهز للتسليم", "تم التسليم", "مرتجع"],
  customerSectors: ["المستشفيات", "شركات خاصة", "شخصي", "مول", "اثاث مكتبي", "اثاث منزلي ومفروشات", "أطفال وبيبي", "ستائر", "مستلزمات طبية", "الحرامات", "الأدوات المنزلية", "الفنادق", "الشقق الفندقية", "بياضات", "الفرشات", "جمعيات ومنظمات", "حكومي", "جهة عسكرية", "الجامعات والمدارس"],
  stockLocations: Array.from({ length: 45 }, (_, i) => `A${i + 1}`),
  userTypes: [
    { name: "إدارة", color: "#6366f1", permissions: { canAdd: true, canEdit: true, canDelete: true, isFullAdmin: true } },
    { name: "مشرف قسم", color: "#f59e0b", permissions: { canAdd: true, canEdit: true, canDelete: false, isFullAdmin: false } },
    { name: "موظف عادي", color: "#10b981", permissions: { canAdd: true, canEdit: false, canDelete: false, isFullAdmin: false } }
  ],
  hrSettings: {
    standardWorkHours: 8,
    workDaysPerMonth: 30,
    gracePeriodMinutes: 15,
    monthlyMissionBalanceMinutes: 120,
    latenessHandling: 'deduct_from_balance',
    absenceHandling: 'full_day',
    latenessViolationThreshold: 15,
    overtimeRequiresApproval: true,
    overtimeCalculationMethod: 'hourly_rate',
    overtimeFixedAmount: 10,
    timeRounding: 'minute',
    overtimeMultiplier: 1.5,
    fullDayAbsenceDeduction: true
  },
  notificationSettings: {}
};

export const NOTIFICATION_ROLE_OPTIONS = [
  { key: 'management', label: 'إدارة' },
  { key: 'supervisor', label: 'مشرف' },
  { key: 'production', label: 'موظف إنتاج' }
];

export const DEFAULT_NOTIFICATION_ROLE_MAP = {
  employees: ['management'],
  settings: ['management'],
  tasks: ['management', 'supervisor'],
  customers: ['management', 'supervisor'],
  sales: ['management', 'supervisor'],
  production: ['management', 'supervisor'],
  stock: ['management', 'supervisor'],
  delivery: ['management', 'supervisor'],
  reports: ['management', 'supervisor'],
  announcements: ['management', 'supervisor', 'production']
};

export const NOTIFICATION_MODULE_OPTIONS = [
  { key: 'employees', label: 'الموظفين' },
  { key: 'customers', label: 'العملاء والموردين' },
  { key: 'sales', label: 'طلبات العملاء' },
  { key: 'production', label: 'طلبات الإنتاج' },
  { key: 'stock', label: 'المخزون' },
  { key: 'delivery', label: 'التوصيل' },
  { key: 'reports', label: 'التقارير' },
  { key: 'tasks', label: 'المهام والإعدادات' },
  { key: 'announcements', label: 'الإشعارات الخاصة' }
];

export const createDefaultNotificationSettings = () => ({
  specialSenders: ['management'],
  specialSenderUserIds: [],
  hideReadNotifications: true,
  soundEnabled: true,
  moduleRules: NOTIFICATION_MODULE_OPTIONS.map((moduleItem) => ({
    moduleKey: moduleItem.key,
    moduleLabel: moduleItem.label,
    enabled: true,
    visibleRoles: [...(DEFAULT_NOTIFICATION_ROLE_MAP[moduleItem.key] || ['management'])],
    visibleUserIds: []
  }))
});

export const ACTIVITY_ITEM_LABELS = {
  employees: 'مستخدم',
  customers: 'عميل/مورد',
  sales: 'طلب',
  production: 'طلب إنتاج',
  stock: 'صنف',
  delivery: 'مهمة',
  reports: 'تقرير',
  tasks: 'إعداد'
};

export const normalizeActionValue = (value) => String(value || '').trim().toLowerCase();

export const isAddAction = (value) => {
  const normalized = normalizeActionValue(value);
  return normalized === 'إضافة' || normalized === 'اضافة' || normalized === 'add';
};

export const resolveModuleKeyFromLog = (moduleLabel) => {
  const value = String(moduleLabel || '');
  if (value.includes('طلبات العملاء')) return 'sales';
  if (value.includes('طلبات الإنتاج')) return 'production';
  if (value.includes('الموظف')) return 'employees';
  if (value.includes('العملاء') || value.includes('الموردين')) return 'customers';
  if (value.includes('المخزون')) return 'stock';
  if (value.includes('التوصيل')) return 'delivery';
  if (value.includes('التقارير') || value.includes('تقارير')) return 'reports';
  if (value.includes('المهام') || value.includes('الإعدادات')) return 'tasks';
  return 'announcements';
};

export const normalizeNotificationRoleKey = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'management' || normalized === 'admin' || normalized === 'إدارة' || normalized === 'ادارة') return 'management';
  if (normalized === 'supervisor' || normalized === 'مشرف') return 'supervisor';
  return 'production';
};

export const getRoleConfigByUser = (user, settings) => {
  if (!user || !settings?.userTypes) return null;
  return settings.userTypes.find((type) => type.name === user.level) || null;
};

export const getNotificationRoleOptions = () => NOTIFICATION_ROLE_OPTIONS;
export const getNotificationModuleOptions = () => NOTIFICATION_MODULE_OPTIONS;

export const getNotificationRoleLabel = (roleKey) => {
  const matchedRole = NOTIFICATION_ROLE_OPTIONS.find((role) => role.key === roleKey);
  return matchedRole ? matchedRole.label : roleKey;
};

export const normalizeNotificationSettings = (settings) => {
  const source = settings?.notificationSettings || settings || {};
  const defaults = createDefaultNotificationSettings();

  const moduleRules = NOTIFICATION_MODULE_OPTIONS.map((moduleItem) => {
    const defaultRule = defaults.moduleRules.find((rule) => rule.moduleKey === moduleItem.key) || {
      moduleKey: moduleItem.key,
      moduleLabel: moduleItem.label,
      enabled: true,
      visibleRoles: ['management'],
      visibleUserIds: []
    };
    const incomingRule = Array.isArray(source.moduleRules)
      ? source.moduleRules.find((rule) => rule?.moduleKey === moduleItem.key)
      : null;
    const resolvedRoles = incomingRule?.visibleRoles?.length
      ? incomingRule.visibleRoles
      : defaultRule.visibleRoles;

    return {
      moduleKey: moduleItem.key,
      moduleLabel: incomingRule?.moduleLabel || defaultRule.moduleLabel || moduleItem.label,
      enabled: incomingRule?.enabled ?? defaultRule.enabled,
      visibleRoles: [...new Set((resolvedRoles || []).map(normalizeNotificationRoleKey))],
      visibleUserIds: [...new Set((incomingRule?.visibleUserIds || []).filter(Boolean))]
    };
  });

  return {
    specialSenders: [...new Set(((source.specialSenders || defaults.specialSenders) || []).map(normalizeNotificationRoleKey))],
    specialSenderUserIds: [...new Set((source.specialSenderUserIds || []).filter(Boolean))],
    hideReadNotifications: source.hideReadNotifications ?? defaults.hideReadNotifications,
    soundEnabled: source.soundEnabled ?? defaults.soundEnabled,
    moduleRules
  };
};

export const getNotificationRule = (settings, moduleKey) => {
  const notificationSettings = normalizeNotificationSettings(settings);
  return notificationSettings.moduleRules.find((rule) => rule.moduleKey === moduleKey) || null;
};

export const isAdmin = (user) => {
  if (!user) return false;
  return (
    user.role === 'admin' || 
    user.level === 'admin' || 
    user.level === 'إدارة' || 
    user.id === 'admin'
  );
};

export const getUserNotificationRole = (user, settings) => {
  if (!user) return 'production';
  if (isAdmin(user)) return 'management';

  const roleConfig = getRoleConfigByUser(user, settings);
  if (roleConfig?.permissions?.isFullAdmin) return 'management';

  if (
    roleConfig?.permissions?.canAdd ||
    roleConfig?.permissions?.canEdit ||
    user.hasEmployeesAccess ||
    user.hasSalesAccess ||
    user.hasProductionAccess ||
    user.hasDeliveryAccess ||
    user.hasReportsAccess ||
    user.hasCustomersAccess ||
    user.hasScoringAccess ||
    user.hasSettingsAccess ||
    user.hasStockAccess
  ) {
    return 'supervisor';
  }

  return normalizeNotificationRoleKey(user.level || user.role);
};

export const canSendSpecialNotification = (user, settings) => {
  if (!user) return false;
  if (isAdmin(user)) return true;

  const notificationSettings = normalizeNotificationSettings(settings);
  if (notificationSettings.specialSenderUserIds.includes(user.id)) return true;

  const userRole = getUserNotificationRole(user, settings);
  return notificationSettings.specialSenders.includes(userRole);
};

export const notificationMatchesUser = (notification, user, settings) => {
  if (!user || !notification) return false;

  const userRole = getUserNotificationRole(user, settings);

  if (userRole === 'management') {
    if (notification.createdById && notification.createdById === user.id) return false;
    return (notification.visibleRoles || []).includes('management') || notification.visibleToAll || (notification.visibleUserIds || []).includes(user.id);
  }

  if (notification.createdById && notification.createdById === user.id) return false;
  if ((notification.excludedUserIds || []).includes(user.id)) return false;
  
  if (userRole === 'supervisor' && notification.targetEmployeeId) {
    if (user.assignedEmployees && user.assignedEmployees.length > 0) {
      const assignedIds = user.assignedEmployees.map(id => String(id).trim());
      if (!assignedIds.includes(String(notification.targetEmployeeId).trim())) {
        return false;
      }
    }
  }

  if (notification.visibleToAll) return true;
  if ((notification.visibleUserIds || []).includes(user.id)) return true;

  return (notification.visibleRoles || []).includes(userRole);
};

export const createNotification = async (notification) => {
  try {
    const globalSettings = await getGlobalSettings();
    let visibleRoles = [...new Set((notification.visibleRoles || []).map(normalizeNotificationRoleKey))];
    let visibleUserIds = [...new Set((notification.visibleUserIds || []).filter(Boolean))];
    let excludedUserIds = [...new Set((notification.excludedUserIds || []).filter(Boolean))];

    if (notification.settingKey && globalSettings?.notifications?.[notification.settingKey]) {
      const modSettings = globalSettings.notifications[notification.settingKey];
      if (modSettings.employee && notification.targetEmployeeId) {
        visibleUserIds.push(notification.targetEmployeeId);
      }
      if (modSettings.management !== false) {
        visibleRoles.push('management');
      }
      if (modSettings.supervisor) {
        visibleRoles.push('supervisor');
        if (modSettings.supervisorExceptions && modSettings.supervisorExceptions.length > 0) {
          excludedUserIds.push(...modSettings.supervisorExceptions);
        }
      }
    }

    const createdAt = new Date().toISOString();
    const payload = {
      category: notification.category || 'activity',
      moduleKey: notification.moduleKey || 'general',
      moduleLabel: notification.moduleLabel || 'النظام',
      title: notification.title || 'إشعار جديد',
      message: notification.message || '',
      visibleToAll: Boolean(notification.visibleToAll),
      visibleRoles: [...new Set(visibleRoles)],
      visibleUserIds: [...new Set(visibleUserIds)],
      excludedUserIds: [...new Set(excludedUserIds)],
      createdById: notification.createdById || '',
      createdByName: notification.createdByName || 'النظام',
      createdByRole: notification.createdByRole || '',
      target: notification.target || null,
      createdAt,
      readBy: notification.createdById ? { [notification.createdById]: createdAt } : {}
    };

    await addDoc(collection(db, 'notifications'), payload);

    if (!notification.skipWhatsApp && notification.settingKey && globalSettings?.notifications?.[notification.settingKey]?.whatsapp) {
      try {
        const { sendWhatsAppNotification } = await import('../utils/whatsappService.js');
        const employeesRef = await getDocs(collection(db, 'employees'));
        const allEmployees = employeesRef.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const sentPhones = new Set();
        for (const emp of allEmployees) {
          if (emp.phone && notificationMatchesUser(payload, emp, globalSettings)) {
            let cleanPhone = String(emp.phone).replace(/[^0-9]/g, '');
            if (sentPhones.has(cleanPhone)) continue;
            sentPhones.add(cleanPhone);

            let waMsg = `*إشعار :*\n${notification.title}\n${notification.message}`;
            const eventTypeMap = { dailyReport: 'daily_report', employeeRequest: 'leave_requests' };
            const evType = eventTypeMap[notification.settingKey] || notification.settingKey;
            await sendWhatsAppNotification(emp.phone, waMsg, evType);
          }
        }
      } catch (err) {
        console.error('Failed to send auto-whatsapp for notification', err);
      }
    }

    return payload;
  } catch (error) {
    console.error('Error in createNotification:', error);
    return null;
  }
};

export const createActivityNotification = async ({
  actor,
  moduleKey,
  moduleLabel,
  itemLabel,
  itemName,
  title,
  message,
  target,
  visibleRoles,
  visibleUserIds,
  visibleToAll = false
}) => {
  const settingKeyMap = {
    sales: 'orders',
    production: 'production',
    stock: 'inventory',
    delivery: 'delivery',
    tasks: 'tasks',
    reports: 'supervisorsReport'
  };
  const settingKey = settingKeyMap[moduleKey];

  const safeItemLabel = itemLabel || 'عنصر';
  const safeItemName = itemName ? `: ${itemName}` : '';

  return createNotification({
    category: 'activity',
    settingKey,
    moduleKey,
    moduleLabel,
    title: title || `إضافة ${safeItemLabel}`,
    message: message || `تمت إضافة ${safeItemLabel}${safeItemName}`,
    visibleToAll,
    visibleRoles: visibleRoles || [],
    visibleUserIds: visibleUserIds || [],
    createdById: actor?.id || '',
    createdByName: actor?.name || 'النظام',
    createdByRole: actor?.level || actor?.role || '',
    target
  });
};

export const getNotificationsForUser = async (user, settings) => {
  try {
    const resolvedSettings = settings || await getGlobalSettings();
    const notificationSettings = normalizeNotificationSettings(resolvedSettings);
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(150));
    const querySnapshot = await getDocs(q);
    const notificationList = querySnapshot.docs.map((notificationDoc) => ({
      ...notificationDoc.data(),
      id: notificationDoc.id
    }));

    return notificationList.filter((notification) => {
      if (!notificationMatchesUser(notification, user, resolvedSettings)) return false;
      if (notificationSettings.hideReadNotifications && notification.readBy?.[user.id]) return false;
      return true;
    });
  } catch (error) {
    console.error('Error in getNotificationsForUser:', error);
    return [];
  }
};

export const markNotificationAsRead = async (notificationId, userId) => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    const notificationSnap = await getDoc(notificationRef);

    if (!notificationSnap.exists()) return;

    const currentData = notificationSnap.data();
    await setDoc(notificationRef, {
      readBy: {
        ...(currentData.readBy || {}),
        [userId]: new Date().toISOString()
      }
    }, { merge: true });
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
  }
};

export const getDocData = async (collectionName, docId, defaultVal) => {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().value;
    } else {
      await setDoc(docRef, { value: defaultVal });
      return defaultVal;
    }
  } catch (error) {
    console.error(`Error in getDocData (${collectionName}/${docId}):`, error);
    return defaultVal;
  }
};

export const setDocData = async (collectionName, docId, value) => {
  try {
    await setDoc(doc(db, collectionName, docId), { value });
  } catch (error) {
    console.error(`Error in setDocData (${collectionName}/${docId}):`, error);
  }
};

export const getEmployees = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'employees'));
    const employees = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    if (employees.length === 0) {
      for (const emp of defaultEmployees) {
        await setDoc(doc(db, 'employees', emp.id), emp);
      }
      return defaultEmployees;
    }
    return employees;
  } catch (error) {
    console.error("Error in getEmployees:", error);
    return defaultEmployees;
  }
};

export const saveEmployees = async (employees) => {
  try {
    for (const emp of employees) {
      await setDoc(doc(db, 'employees', emp.id), emp);
    }
  } catch (error) {
    console.error("Error in saveEmployees:", error);
  }
};

export const saveEmployee = async (employee) => {
  try {
    await setDoc(doc(db, 'employees', employee.id), employee);
    return null;
  } catch (error) {
    console.error("Error in saveEmployee:", error);
    return error;
  }
};

export const deleteEmployee = async (id) => {
  try {
    const empRef = doc(db, 'employees', id);
    const empSnap = await getDoc(empRef);
    if (!empSnap.exists()) {
      const userRef = doc(db, 'users', id);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, { isActive: false, status: 'مستقيل' });
      }
    } else {
      await updateDoc(empRef, { isActive: false, status: 'مستقيل' });
      const userRef = doc(db, 'users', id);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, { isActive: false, status: 'مستقيل' });
      }
    }
    return null;
  } catch (error) {
    console.error("Error in deleteEmployee:", error);
    return error;
  }
};

export const getDepartments = async () => {
  return await getDocData('settings', 'departments', defaultDepartments);
};

export const saveDepartments = async (depts) => {
  await setDocData('settings', 'departments', depts);
};

export const getTasksData = async () => {
  return await getDocData('settings', 'tasksData', defaultTasksData);
};

export const saveTasksData = async (data) => {
  await setDocData('settings', 'tasksData', data);
};

export const getScoringConfig = async () => {
  return await getDocData('settings', 'scoringConfig', defaultScoring);
};

export const saveScoringConfig = async (config) => {
  await setDocData('settings', 'scoringConfig', config);
};

export const getGlobalSettings = async () => {
  const data = await getDocData('settings', 'globalSettings', defaultGlobalSettings);
  return {
    ...defaultGlobalSettings,
    ...data,
    notificationSettings: normalizeNotificationSettings(data)
  };
};

export const saveGlobalSettings = async (settings) => {
  await setDocData('settings', 'globalSettings', {
    ...settings,
    notificationSettings: normalizeNotificationSettings(settings)
  });
};

export const clearAllData = async () => {
  console.warn("clearAllData not fully implemented for Firestore");
};

export const canPerformAction = (user, action, module, settings) => {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (!settings || !settings.userTypes) return isAdmin(user);
  
  const userLevel = user.level || '';
  const typeConfig = settings.userTypes.find(t => t.name === userLevel);
  
  if (!typeConfig) return isAdmin(user); 
  
  const perms = typeConfig.permissions || {};
  if (perms.isFullAdmin) return true;
  
  if (module === 'SETTINGS' || module === 'EMPLOYEES') {
     return perms.isFullAdmin;
  }
  if (module === 'STOCK' && userLevel === 'مشرف') {
     return true;
  }

  if (action === 'ADD') return perms.canAdd;
  if (action === 'EDIT') return perms.canEdit;
  if (action === 'DELETE') return perms.canDelete;
  if (action === 'VIEW') return true; 
  
  return false;
};

export const canPerformStockAction = (user, action, settings) => {
  if (!user) return false;
  if (isAdmin(user)) return true;

  const isSupervisor = user.level === 'supervisor' || user.level === 'مشرف' || user.role === 'supervisor' || user.role === 'مشرف';

  if (!settings || !settings.userTypes) {
    if (isSupervisor && (action === 'INWARD' || action === 'OUTWARD' || action === 'DAMAGED')) return true;
    return false;
  }
  
  const userLevel = user.level || user.role || '';
  const typeConfig = settings.userTypes.find(t => t.name === userLevel);
  
  if (!typeConfig) {
    if (isSupervisor && (action === 'INWARD' || action === 'OUTWARD' || action === 'DAMAGED')) return true;
    return false;
  }
  
  const perms = typeConfig.permissions || {};
  if (perms.isFullAdmin) return true;
  
  switch(action) {
    case 'INWARD': return perms.canStockInward !== undefined ? !!perms.canStockInward : isSupervisor;
    case 'OUTWARD': return perms.canStockOutward !== undefined ? !!perms.canStockOutward : isSupervisor;
    case 'DAMAGED': return perms.canStockDamaged !== undefined ? !!perms.canStockDamaged : isSupervisor;
    case 'AUDIT': return perms.canAuditDeductions !== undefined ? !!perms.canAuditDeductions : false;
    default: return false;
  }
};
