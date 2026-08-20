import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, where, limit, deleteDoc, doc } from 'firebase/firestore';
import { getGlobalSettings, getEmployees } from '../store';

export const sendTemplatedWhatsAppNotification = async (phone, eventType, action = null, variables = {}) => {
  if (!phone || !eventType) return false;
  
  let actualAction = action;
  let actualVars = variables;
  if (action && typeof action === 'object') {
    actualVars = action;
    actualAction = null;
  }

  const settings = await getGlobalSettings();
  let templateStr = null;
  
  if (actualAction) {
    templateStr = settings?.whatsappConfig?.[eventType]?.templates?.[actualAction];
  }
  
  if (!templateStr) {
    templateStr = settings?.whatsappTemplates?.[eventType];
  }
  
  if (!templateStr) {
    const defaults = {
      reminders: {
        check_in: 'تذكير: لم يتبق سوى 5 دقائق على موعد بدء الدوام. يرجى تسجيل الدخول يا {employeeName}.',
        check_out: 'تذكير: لم يتبق سوى 5 دقائق على موعد انتهاء الدوام. يرجى الاستعداد لتسجيل الخروج يا {employeeName}.'
      },
      missing_punches: {
        approve: '*اعتماد طلب ختمة ناقصة* ⏱️\nمرحباً {employeeName}،\nتمت الموافقة على طلب الختمة الناقصة الخاصة بك لتاريخ {date}.\n{notes}\n-- الإدارة',
        reject: '*رفض طلب ختمة ناقصة* ❌\nمرحباً {employeeName}،\nتم رفض طلب الختمة الناقصة الخاصة بك لتاريخ {date}.\n{notes}\n-- الإدارة'
      }
    };
    templateStr = defaults[eventType]?.[actualAction] || '';
  }
  
  if (!templateStr) {
     console.error(`No template found for eventType: ${eventType}, action: ${actualAction}`);
     return false;
  }
  
  let finalMessage = templateStr;
  for (const [key, value] of Object.entries(actualVars)) {
     finalMessage = finalMessage.replace(new RegExp(`{${key}}`, 'g'), value || '');
  }
  
  return sendWhatsAppNotification(phone, finalMessage, eventType);
};

export const sendWhatsAppNotification = async (phone, message, eventType = null) => {
  if (!phone || !message) return false;
  
  try {
    const settings = await getGlobalSettings();
    if (settings?.whatsappConfig && settings.whatsappConfig.masterEnabled === false) {
      console.log('WhatsApp notification blocked (Master Switch is OFF)');
      return false;
    }
    
    if (eventType) {
      const eventMap = {
        'dailyReport': 'daily_report',
        'employeeRequest': 'leaves',
        'leaves': 'leaves',
        'earlyLeave': 'leaves',
        'leave_requests': 'leaves',
        'missingPunch': 'missing_punches',
        'supervisorsReport': 'report_approval'
      };
      const configKey = eventMap[eventType] || eventType;
      const config = settings?.whatsappConfig?.[configKey];
      
      if (config) {
        if (config.enabled === false) {
           console.log(`WhatsApp notification blocked by rules (Event ${configKey} is disabled)`);
           return false;
        }

        const allEmployees = await getEmployees();
        
        let cleanPhone = phone.replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('962')) cleanPhone = cleanPhone.substring(3);
        else if (cleanPhone.startsWith('00962')) cleanPhone = cleanPhone.substring(5);
        else if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);

        const employee = allEmployees.find(emp => {
            if(!emp.phone) return false;
            let empPhone = String(emp.phone).replace(/[^0-9]/g, '');
            if (empPhone.startsWith('962')) empPhone = empPhone.substring(3);
            else if (empPhone.startsWith('00962')) empPhone = empPhone.substring(5);
            else if (empPhone.startsWith('0')) empPhone = empPhone.substring(1);
            return empPhone === cleanPhone;
        });

        if (employee) {
            // 1. Check allowed employees checklist
            if (config.allowedEmployees && config.allowedEmployees.length > 0 && !config.allowedEmployees.includes(employee.id)) {
                console.log(`WhatsApp notification blocked by rules (Employee ${employee.name} is not allowed for ${eventType})`);
                return false;
            }

            // 2. Check department filter
            if (config.departments && config.departments.length > 0) {
                let empDept = employee.department;
                if (!empDept && employee.roles && employee.roles.length > 0 && settings.departments) {
                    empDept = settings.departments[employee.roles[0]];
                } else if (!empDept && employee.role && settings.departments) {
                    empDept = settings.departments[employee.role];
                }
                
                if (empDept && !config.departments.includes(empDept)) {
                    console.log(`WhatsApp notification blocked by rules (Department ${empDept} not allowed for ${eventType})`);
                    return false;
                }
            }
        }
      }
    }

    await addDoc(collection(db, 'whatsapp_queue_v2'), {
      phone,
      message,
      eventType: eventType || 'general',
      status: 'pending',
      createdAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error adding message to WhatsApp queue in Firebase:', error);
    return false;
  }
};

export const getWhatsAppLogs = async () => {
  try {
    const q = query(collection(db, 'whatsapp_queue_v2'), orderBy('createdAt', 'desc'), limit(500));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching WhatsApp logs:', error);
    return [];
  }
};

export const getWhatsAppLogsByDateRange = async (dateFrom, dateTo) => {
  try {
    const fromDate = new Date(dateFrom);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    
    // Firestore serverTimestamp requires Date objects for comparison
    const q = query(
      collection(db, 'whatsapp_queue_v2'), 
      where('createdAt', '>=', fromDate),
      where('createdAt', '<=', toDate),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching WhatsApp logs by date:', error);
    return [];
  }
};

export const deleteWhatsAppLogs = async (ids) => {
  if (!ids || ids.length === 0) return true;
  try {
    const promises = ids.map(id => deleteDoc(doc(db, 'whatsapp_queue_v2', id)));
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('Error deleting WhatsApp logs:', error);
    throw error;
  }
};
