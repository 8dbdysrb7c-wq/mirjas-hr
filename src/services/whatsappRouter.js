import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { getGlobalSettings } from '../store';
import { hasPermission } from '../utils/permissions';

// Predefined Arabic templates for WhatsApp notifications
const TEMPLATES = {
  orders: {
    create: '*طلب شراء جديد* 🛒\nتم إنشاء طلب شراء جديد رقم {orderNumber} بقيمة {totalPrice} دينار للعميل {customerName}.',
    update: '*تحديث حالة الطلب* 🛒\nتم تعديل حالة طلب الشراء رقم {orderNumber} إلى ({status}) بمجموع {totalPrice} دينار.',
    delete: '*إلغاء طلب شراء* ❌\nتم إلغاء طلب الشراء رقم {orderNumber}.'
  },
  production: {
    create: '*أمر إنتاج جديد* ⚙️\nتم إصدار كرت إنتاج جديد رقم {orderNumber} للصنف {productName} بكمية {quantity}.',
    update: '*تحديث حالة الإنتاج* ⚙️\nتم تعديل حالة أمر الإنتاج رقم {orderNumber} إلى ({status}).',
    delete: '*إلغاء أمر إنتاج* ❌\nتم إلغاء كرت الإنتاج رقم {orderNumber}.'
  },
  delivery: {
    create: '*طلب توصيل جديد* 🚚\nتم تجهيز الشحنة للطلب رقم {orderNumber} وتعيين المندوب: {driverName}.',
    update: '*حالة التوصيل* 🚚\nتم تحديث حالة الشحنة للطلب رقم {orderNumber} إلى ({status}). المندوب: {driverName}.'
  },
  daily_report: {
    create: '*تقرير عمل جديد* 📝\nقام الموظف {employeeName} بتقديم تقرير العمل اليومي لتاريخ {date}.',
    approve: '*اعتماد تقرير العمل* ✅\nتم اعتماد تقرير العمل للموظف {employeeName} لتاريخ {date}.\nالتقييم: {rating}\nالملاحظات: {notes}'
  },
  overtime: {
    create: '*طلب عمل إضافي جديد* ⏰\nقدم الموظف {employeeName} طلب عمل إضافي لتاريخ {date}.\nالسبب: {reason}',
    approve: '*تحديث طلب العمل الإضافي* ⏰\nالزميل {employeeName}، تم {status} طلب العمل الإضافي الخاص بك لتاريخ {date}.\nالملاحظات: {reason}'
  },
  leaves: {
    create: '*طلب إجازة جديد* 📅\nقدم الموظف {employeeName} طلب إجازة ({leaveType}) لمدة {days} أيام تبدأ من {startDate}.',
    approve: '*تحديث طلب الإجازة* ✅\nالزميل {employeeName}، تم {status} طلب الإجازة ({leaveType}) الخاص بك لمدة {days} أيام تبدأ من {startDate}.'
  },
  supervisor_reports: {
    reminder: '*تذكير المشرفين* 📝\nمرحباً {supervisorName}، يرجى تقديم تقرير العمل اليومي لمشرفي القسم لتاريخ اليوم.',
    approve: '*اعتماد تقرير المشرف* ✅\nتم اعتماد تقرير العمل اليومي للمشرف {supervisorName} لتاريخ اليوم بنجاح.\nملاحظات الإدارة: {adminNotes}'
  },
  rep_visits: {
    submit_visit: '*تقرير زيارة جديد* 📍\nقام المندوب {repName} بزيارة العميل: {customerName}.\nتفاصيل الزيارة: {visitDetails}',
    quotation_request: '*طلب عرض سعر* 📄\nطلب المندوب {repName} عرض سعر للعميل: {customerName}.\nالأصناف المطلوبة: {itemsList}',
    order_approved: '*طلبية جديدة معتمدة* 🎉\nاعتمد العميل {customerName} طلبية جديدة بقيمة {orderValue}.\nالمندوب المتابع: {repName}'
  },
  rewards: {
    create: '*مكافأة تقديرية* 🎉\nمرحباً {employeeName}، يسعدنا إبلاغك بأنه قد تم تسجيل مكافأة مالية بقيمة {amount} دينار تقديراً لجهودك المتميزة في العمل. شكراً لعطائك المستمر! 🌟'
  },
  penalties: {
    create: '*إشعار إداري رسمي* ⚠️\nالزميل {employeeName}، يرجى العلم بأنه قد تم تسجيل تنبيه/مخالفة إدارية ({penaltyType}) لتاريخ {date}. نرجو منكم الالتزام باللوائح والتعليمات الداخلية للعمل. شاكرين تعاونكم.'
  },
  violations: {
    create: '*تنبيه حضور وانصراف* ⏱️\nالزميل {employeeName}، يرجى العلم بأن النظام سجل تنبيه حضور وانصراف ({violationType}) لتاريخ {date}. يرجى التنسيق مع الموارد البشرية لتسوية الأمر. دمتم بخير.'
  },
  custody: {
    create: '*تسليم عهدة جديدة* 📦\nمرحباً {employeeName}، تم تسجيل تسليم عهدة جديدة لك: {custodyName} بتاريخ {date}. يرجى الحفاظ عليها وإعادتها عند اللزوم.'
  },
  advances: {
    create: '*طلب سلفة جديد* 💵\nقدم الموظف {employeeName} طلب سلفة جديدة بقيمة {amount} دينار.\nالسبب: {reason}',
    approve: '*تحديث طلب السلفة* 💵\nالزميل {employeeName}، تم {status} طلب السلفة الخاص بك بقيمة {amount} دينار.\nملاحظة: {reason}'
  },
  tasks: {
    create: '*مهمة جديدة مسندة* 📋\nتم إسناد مهمة جديدة بعنوان: {taskTitle}.\nالموظف المسؤول: {employeeName}\nتاريخ التسليم: {dueDate}',
    update: '*تحديث على المهمة* 📋\nحدث تغيير أو رد على المهمة: {taskTitle}.\nالحالة الحالية: {status}\nالمسؤول: {employeeName}\nالتحديث: {updateDetails}'
  },
  petitions: {
    create: '*طلب استدعاء جديد* 📝\nقدم الموظف {employeeName} طلب استدعاء بعنوان: {title}.',
    approve: '*تحديث الاستدعاء* 📝\nالزميل {employeeName}، تم {status} طلب الاستدعاء الخاص بك بعنوان: {title}.\nالملاحظات: {reason}'
  }
};

/**
 * Trigger permission-based routing for WhatsApp notifications.
 *
 * @param {String} eventType - The module key (orders, production, delivery, daily_report, overtime, leaves)
 * @param {String} action - The trigger action (create, update, delete, approve)
 * @param {Object} details - Variables to interpolate into the message template
 */
export const triggerWhatsAppRouting = async (eventType, action, details = {}) => {
  try {
    const settings = await getGlobalSettings();
    
    // Check master enabled switch
    if (settings?.whatsappConfig && settings.whatsappConfig.masterEnabled === false) {
      console.log('[Router] WhatsApp notifications blocked: Master switch is OFF');
      return false;
    }

    const eventConfig = settings?.whatsappConfig?.[eventType];
    if (!eventConfig || eventConfig.enabled === false) {
      console.log(`[Router] WhatsApp notifications blocked: ${eventType} is disabled or unconfigured`);
      return false;
    }

    // Check if the specific action trigger is disabled
    if (eventConfig.triggers && eventConfig.triggers[action] === false) {
      console.log(`[Router] WhatsApp notification blocked: Action ${action} is disabled for ${eventType}`);
      return false;
    }

    // Get the template (prefer the user-configured one, fallback to the predefined one)
    let template = eventConfig.templates?.[action];
    if (!template) {
      const fallbackEvent = (eventType === 'production_sewing' || eventType === 'production_preparation') 
        ? 'production' 
        : eventType;
      template = TEMPLATES[fallbackEvent]?.[action];
    }
    if (!template) {
      console.error(`[Router] No template found for eventType: ${eventType}, action: ${action}`);
      return false;
    }

    // Retrieve all active employees and merge with their user accounts to audit permissions and match targets
    const empsSnapshot = await getDocs(collection(db, 'employees'));
    const employees = empsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const usersSnapshot = await getDocs(collection(db, 'users'));
    const usersMap = {};
    usersSnapshot.forEach(doc => {
      usersMap[doc.id] = doc.data();
    });

    const allEmployees = employees.map(emp => {
      const userAccount = usersMap[emp.id] || {};
      return {
        ...emp,
        role: userAccount.role || emp.role,
        level: userAccount.level || emp.level,
        permissions: userAccount.permissions || emp.permissions,
        hasSupervisorReportsAccess: userAccount.hasSupervisorReportsAccess || emp.hasSupervisorReportsAccess,
        isAdmin: userAccount.role === 'admin' || userAccount.level === 'admin' || userAccount.level === 'إدارة' || userAccount.id === 'admin' || userAccount.type === 'super_admin' || userAccount.isAdmin || emp.isAdmin
      };
    });

    const resolvedRecipients = new Set(); // Keep track of unique phone numbers

    // Helper to queue message to a recipient phone
    const queueMessage = async (phone, name, roleType) => {
      let cleanPhone = String(phone).replace(/[^0-9]/g, '');
      if (!cleanPhone) return;

      if (resolvedRecipients.has(cleanPhone)) return;
      resolvedRecipients.add(cleanPhone);

      // Interpolate details into template
      let message = template;
      for (const [key, val] of Object.entries(details)) {
        message = message.replace(new RegExp(`{${key}}`, 'g'), val || '');
      }

      console.log(`[Router] Queued WhatsApp message to ${roleType} (${name}) at ${cleanPhone}`);
      await addDoc(collection(db, 'whatsapp_queue_v2'), {
        phone: cleanPhone,
        message,
        eventType,
        status: 'pending',
        createdAt: serverTimestamp()
      });
    };

    // 1. Send to Employee (الموظف صاحب الشأن)
    if (eventConfig.employee !== false && details.employeeId) {
      const targetEmp = allEmployees.find(e => String(e.id) === String(details.employeeId));
      if (targetEmp && targetEmp.phone) {
        // Validate allowed employee list (if configured)
        const isAllowed = !Array.isArray(eventConfig.allowedEmployees) || eventConfig.allowedEmployees.includes(targetEmp.id);
        if (isAllowed) {
          // Validate department constraints
          const empDept = targetEmp.department || '';
          if (!eventConfig.departments || eventConfig.departments.length === 0 || eventConfig.departments.includes(empDept)) {
            await queueMessage(targetEmp.phone, targetEmp.name, 'Employee');
          }
        }
      }
    }

    // 2. Send to Supervisor (المشرف المباشر/مشرف القسم)
    if (eventConfig.supervisor !== false) {
      const supervisors = allEmployees.filter(e => {
        const isSuper = e.level === 'supervisor' || e.level === 'مشرف' || e.level === 'مشرف قسم' || e.hasSupervisorReportsAccess === true || e.permissions?.supervisor_reports?.view;
        return isSuper && e.phone;
      });

      for (const supervisor of supervisors) {
        // Validate allowed employee list (if configured)
        if (Array.isArray(eventConfig.allowedEmployees) && !eventConfig.allowedEmployees.includes(supervisor.id)) {
          continue;
        }

        // A. Validate department constraints
        const superDept = supervisor.department || '';
        if (eventConfig.departments && eventConfig.departments.length > 0 && !eventConfig.departments.includes(superDept)) {
          continue;
        }

        // B. Validate module access permissions
        if (!hasPermission(supervisor, eventType, 'view')) {
          continue;
        }

        // C. Validate supervisor assigned employees relationship (if applicable)
        if (details.employeeId && supervisor.assignedEmployees && supervisor.assignedEmployees.length > 0) {
          const assignedIds = supervisor.assignedEmployees.map(id => String(id).trim());
          if (!assignedIds.includes(String(details.employeeId).trim())) {
            continue;
          }
        }

        await queueMessage(supervisor.phone, supervisor.name, 'Supervisor');
      }
    }

    // 3. Send to Management (الإدارة العليا)
    if (eventConfig.management !== false) {
      const managers = allEmployees.filter(e => {
        const isManager = e.role === 'admin' || e.level === 'admin' || e.level === 'إدارة' || e.isAdmin || e.type === 'super_admin';
        return isManager && e.phone;
      });

      for (const manager of managers) {
        // Validate allowed employee list (if configured)
        if (Array.isArray(eventConfig.allowedEmployees) && !eventConfig.allowedEmployees.includes(manager.id)) {
          continue;
        }

        // Validate module access permissions
        if (!hasPermission(manager, eventType, 'view')) {
          continue;
        }
        await queueMessage(manager.phone, manager.name, 'Management');
      }
    }

    return true;
  } catch (error) {
    console.error('[Router] Error in triggerWhatsAppRouting:', error);
    return false;
  }
};
