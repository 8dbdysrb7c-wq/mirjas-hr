import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  onSnapshot,
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
  productionStatuses: ["لم يتم التنفيذ", "تم استلام كرت الإنتاج", "مرحلة القص", "مرحلة المستودع", "مرحلة الخياطة", "بانتظار استلام التغليف", "مرحلة التغليف", "إنتاج مختلط", "منتهي", "ملغي"],
  preparationStatuses: ["لم يتم التنفيذ", "تم استلام كرت الانتاج", "مرحلة المستودع", "مرحلة الحشوة", "مرحلة التطريز", "مرحلة التشطيب", "منتهي", "ملغي"],
  salesStatuses: ["جديد", "قيد التجهيز", "جاهز للتوصيل", "تم تسليمها للتوصيل", "تم التوصيل", "ملغي", "مرفوض"],
  salesItemStatuses: ["جديد", "قيد التجهيز", "إنتاج قيد الخياطة", "إنتاج قيد التغليف", "جاهز للتسليم", "تم التسليم", "مرتجع", "قيد التحضير"],
  salesCommissionTiers: {},
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
  notificationSettings: {},
  quoteTaxRates: [0, 4, 16],
  quoteValidities: ["أسبوع", "أسبوعين", "شهر", "شهرين", "حتى إشعار آخر"],
  quoteTerms: ["الأسعار أعلاه لا تشمل ضريبة المبيعات", "الأسعار أعلاه تشمل ضريبة المبيعات", "التسليم في موقع العميل", "التوصيل مجاني داخل عمان", "الدفع نقداً عند الاستلام", "تخضع هذه الأسعار للتغيير دون إشعار مسبق"],
  quoteStatuses: ["مسودة", "مرسل", "مقبول", "مرفوض", "ملغي"],
  quotePriorities: ["منخفضة", "متوسطة", "عالية", "عاجلة جداً"]
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
    if (notification.settingKey === 'dailyReport') {
      const assignedIds = (user.assignedEmployees || []).map(id => String(id).trim());
      if (!assignedIds.includes(String(notification.targetEmployeeId).trim())) {
        return false;
      }
    } else {
      if (user.assignedEmployees && user.assignedEmployees.length > 0) {
        const assignedIds = user.assignedEmployees.map(id => String(id).trim());
        if (!assignedIds.includes(String(notification.targetEmployeeId).trim())) {
          return false;
        }
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
      settingKey: notification.settingKey || '',
      targetEmployeeId: notification.targetEmployeeId || '',
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

export const watchNotificationsForUser = (user, settings, next, error) => {
  const preferences = normalizeNotificationSettings(settings);
  const source = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(150));
  return onSnapshot(source, snapshot => next(snapshot.docs
    .map(row => ({ ...row.data(), id: row.id }))
    .filter(notification => notificationMatchesUser(notification, user, settings)
      && !(preferences.hideReadNotifications && notification.readBy?.[user.id]))), error);
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
  const removedVirtualWarehouses = new Set([
    'مستودع إنتاج قيد الخياطة',
    'مستودع إنتاج قيد التغليف',
    'مستودع قبل الخياطة',
    'بانتظار استلام التغليف',
    'مستودع إنتاج قيد التحضير'
  ]);
  if (data && Array.isArray(data.warehouses)) {
    const physicalWarehouses = data.warehouses.filter(warehouse => !removedVirtualWarehouses.has(warehouse));
    if (physicalWarehouses.length !== data.warehouses.length) {
      data.warehouses = physicalWarehouses;
      await setDocData('settings', 'globalSettings', data);
    }
  }
  
  if (data && Array.isArray(data.productionStatuses)) {
    const canonicalizeProductionStatus = value => {
      const normalized = String(value || '').replace(/\s+/g, ' ').trim();
      if (normalized === 'تم استلام كرت الانتاج' || normalized === 'تم استلام كرت الإنتاج') return 'تم استلام كرت الإنتاج';
      if (['مرحلة المستودع', 'مرحلة مستودع قبل الخياطة', 'مستودع قبل الخياطة'].includes(normalized)) return 'مرحلة المستودع';
      return normalized;
    };
    const originalStatuses = [...data.productionStatuses];
    const statuses = [...new Set(originalStatuses.map(canonicalizeProductionStatus).filter(Boolean))];
    if (!statuses.includes('تم استلام كرت الإنتاج')) {
      const cuttingIdx = statuses.indexOf('مرحلة القص');
      statuses.splice(cuttingIdx === -1 ? 1 : cuttingIdx, 0, 'تم استلام كرت الإنتاج');
    }
    if (!statuses.includes('إنتاج مختلط')) {
      const finishedIdx = statuses.indexOf('منتهي');
      statuses.splice(finishedIdx === -1 ? statuses.length : finishedIdx, 0, 'إنتاج مختلط');
    }
    if (!statuses.includes('بانتظار استلام التغليف')) {
      const packagingIdx = statuses.indexOf('مرحلة التغليف');
      statuses.splice(packagingIdx === -1 ? statuses.length : packagingIdx, 0, 'بانتظار استلام التغليف');
    }
    const warehouseIdx = statuses.indexOf('مرحلة المستودع');
    const cuttingIdx = statuses.indexOf('مرحلة القص');
    if (warehouseIdx !== -1 && cuttingIdx !== -1 && warehouseIdx !== cuttingIdx + 1) {
      statuses.splice(warehouseIdx, 1);
      const newCuttingIdx = statuses.indexOf('مرحلة القص');
      statuses.splice(newCuttingIdx + 1, 0, 'مرحلة المستودع');
    }
    const productionStatusesChanged = JSON.stringify(statuses) !== JSON.stringify(originalStatuses);
    if (productionStatusesChanged) {
      data.productionStatuses = statuses;
      await setDocData('settings', 'globalSettings', data);
    }
  }

  if (data) {
    const requiredProductionSalesStatuses = ['إنتاج قيد الخياطة', 'إنتاج قيد التغليف'];
    const salesItemStatuses = Array.isArray(data.salesItemStatuses)
      ? [...data.salesItemStatuses]
      : [...defaultGlobalSettings.salesItemStatuses];
    let statusesChanged = false;
    requiredProductionSalesStatuses.forEach((status) => {
      if (!salesItemStatuses.includes(status)) {
        const readyIndex = salesItemStatuses.indexOf('جاهز للتسليم');
        salesItemStatuses.splice(readyIndex === -1 ? salesItemStatuses.length : readyIndex, 0, status);
        statusesChanged = true;
      }
    });
    if (statusesChanged) {
      data.salesItemStatuses = salesItemStatuses;
      await setDocData('settings', 'globalSettings', data);
    }
  }

  if (data && Array.isArray(data.stockColors)) {
    data.stockColors.sort((a, b) => {
      const isModelA = String(a).trim().startsWith('موديل');
      const isModelB = String(b).trim().startsWith('موديل');
      if (isModelA && !isModelB) return -1;
      if (!isModelA && isModelB) return 1;
      return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  if (data && Array.isArray(data.customerSectors)) {
    data.customerSectors.sort((a, b) => String(a).localeCompare(String(b), 'ar', { sensitivity: 'base', numeric: true }));
  }
  if (data && Array.isArray(data.ammanAreas)) {
    data.ammanAreas.sort((a, b) => String(a).localeCompare(String(b), 'ar', { sensitivity: 'base', numeric: true }));
  }
  if (data && Array.isArray(data.jordanianCities)) {
    data.jordanianCities.sort((a, b) => {
      const isAmmanA = String(a).trim() === 'عمان';
      const isAmmanB = String(b).trim() === 'عمان';
      if (isAmmanA && !isAmmanB) return -1;
      if (!isAmmanA && isAmmanB) return 1;
      return String(a).localeCompare(String(b), 'ar', { sensitivity: 'base', numeric: true });
    });
  }

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
  
  // Convert old ALL CAPS module names to new module keys
  const moduleMap = {
    'MISSIONS': 'delivery',
    'SALES': 'orders',
    'CUSTOMERS': 'customers',
    'SETTINGS': 'site_settings',
    'STOCK': 'stock_view',
    'EMPLOYEES': 'hr_employees',
    'TASKS': 'supervisor_tasks',
    'PREPARATION': 'preparation',
    'QUOTES': 'quotes'
  };
  
  const mappedModule = moduleMap[module] || module;
  const actionLower = String(action).toLowerCase();
  
  // 1. Check NEW granular user.permissions object (Absolute Source of Truth if present)
  if (user.permissions && user.permissions[mappedModule] && typeof user.permissions[mappedModule][actionLower] !== 'undefined') {
    return !!user.permissions[mappedModule][actionLower];
  }
  
  // 2. Fallback to legacy user boolean flags if no new permissions are set
  const LEGACY_KEYS = {
    'delivery': 'hasDeliveryAccess',
    'orders': 'hasSalesAccess',
    'preparation': 'hasPreparationAccess',
    'production': 'hasProductionAccess',
    'stock_view': 'hasStockAccess',
    'hr_employees': 'hasEmployeesAccess',
    'customers': 'hasCustomersAccess',
    'site_settings': 'hasSettingsAccess',
    'live': 'hasLiveAccess',
    'rep_visits': 'hasRepVisitsAccess'
  };
  
  const legacyKey = LEGACY_KEYS[mappedModule];
  if (legacyKey && user[legacyKey]) {
     return true; // Legacy flags granted full access implicitly
  }

  // 3. Fallback to legacy Global Settings (userTypes)
  if (settings && settings.userTypes) {
    const userLevel = user.level || '';
    const typeConfig = settings.userTypes.find(t => t.name === userLevel);
    
    if (typeConfig) {
      const perms = typeConfig.permissions || {};
      if (perms.isFullAdmin) return true;
      if (mappedModule === 'site_settings' || mappedModule === 'hr_employees') {
         return perms.isFullAdmin;
      }
      if (action === 'ADD') return perms.canAdd;
      if (action === 'EDIT') return perms.canEdit;
      if (action === 'DELETE') return perms.canDelete;
      if (action === 'VIEW') return true; 
    }
  }

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
