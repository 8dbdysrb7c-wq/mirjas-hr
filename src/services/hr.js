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
import { getGlobalSettings, createNotification } from './settings';

export const saveHRAuditLog = async (logData) => {
  try {
    const fullLog = {
      ...logData,
      userName: logData.user,
      details: logData.description,
      date: new Date().toLocaleDateString('ar-EG'),
      time: new Date().toLocaleTimeString('ar-EG')
    };
    const docRef = await addDoc(collection(db, 'operations_log'), fullLog);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error saving HR audit log:", error);
    return { success: false, error };
  }
};

export const getHRAuditLogs = async () => {
  try {
    const q = query(collection(db, 'hr_audit_logs'), orderBy('timestamp', 'desc'), limit(500));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching HR audit logs:", error);
    return [];
  }
};

export const getHRSalaryPeriods = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'hr_salary_periods'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching salary periods:", error);
    return [];
  }
};

export const saveHRSalaryPeriod = async (periodId, status, userContext) => {
  try {
    const docRef = doc(db, 'hr_salary_periods', periodId);
    await setDoc(docRef, { status, updatedAt: new Date().toISOString() }, { merge: true });
    
    if (userContext) {
      let actionLabel = 'تغيير حالة الدورة';
      if (status === 'open') actionLabel = 'إلغاء مراجعة رواتب';
      if (status === 'review') actionLabel = 'إرسال الرواتب للمراجعة';
      if (status === 'archived') actionLabel = 'ترحيل رواتب';

      await saveHRAuditLog({
         user: userContext.name || userContext,
         action: actionLabel,
         module: 'الرواتب',
         description: `تم تغيير حالة شهر ${periodId} إلى ${status}`,
         timestamp: new Date().toISOString()
      });
    }
    
    return true;
  } catch (error) {
    console.error("Error saving salary period:", error);
    return false;
  }
};

export const archiveHRSalaryPeriod = async (periodId, salaryData, userContext) => {
  try {
    await saveHRSalaryPeriod(periodId, 'archived', userContext);
    const archiveRef = doc(db, 'hr_salary_archives', periodId);
    await setDoc(archiveRef, {
      periodId,
      salaryData,
      archivedAt: new Date().toISOString(),
      archivedBy: userContext.name || userContext
    });
    return true;
  } catch (error) {
    console.error("Error archiving salary period:", error);
    return false;
  }
};

export const unarchiveHRSalaryPeriod = async (periodId, userContext) => {
  try {
    const archiveRef = doc(db, 'hr_salary_archives', periodId);
    await deleteDoc(archiveRef);
    await saveHRSalaryPeriod(periodId, 'open', userContext);
    
    if (userContext) {
      await saveHRAuditLog({
         user: userContext.name || userContext,
         action: 'إلغاء ترحيل رواتب (طوارئ)',
         module: 'الرواتب',
         description: `تم إلغاء ترحيل رواتب شهر ${periodId} وحذف النسخة المحفوظة`,
         timestamp: new Date().toISOString()
      });
    }
    return true;
  } catch (error) {
    console.error("Error unarchiving salary period:", error);
    return false;
  }
};

export const getHRSalaryArchive = async (periodId) => {
  try {
    const docRef = doc(db, 'hr_salary_archives', periodId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().salaryData;
    }
    return null;
  } catch (error) {
    console.error("Error fetching salary archive:", error);
    return null;
  }
};

export const isDateLocked = async (dateStr) => {
  try {
    const settings = await getGlobalSettings();
    const cycleStart = settings.hrSettings?.salaryCycleStartDay || 1;
    
    let dateObj = new Date(dateStr);
    let d = dateObj.getDate();
    let m = dateObj.getMonth() + 1;
    let y = dateObj.getFullYear();
    
    let cycleMonth = m;
    let cycleYear = y;
    if (cycleStart > 1 && d >= cycleStart) {
      cycleMonth += 1;
      if (cycleMonth > 12) {
        cycleMonth = 1;
        cycleYear += 1;
      }
    }
    const periodKey = `${cycleYear}-${String(cycleMonth).padStart(2, '0')}`;
    
    const periods = await getHRSalaryPeriods();
    const period = periods.find(p => p.id === periodKey);
    return period && period.status === 'locked';
  } catch (error) {
    console.error("Error in isDateLocked:", error);
    return false;
  }
};

export const syncToHRAttendance = async (userId, userName, date, timeIn, timeOut) => {
  if (!timeIn) return;
  try {
    const attId = `${userId}_${date}`;
    const attRef = doc(db, 'hr_attendance', attId);
    const attSnap = await getDoc(attRef);
    
    const globalSettings = await getGlobalSettings();
    const hrSettings = globalSettings.hrSettings || {
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
    };
    
    let calculatedStatus = 'مداوم';
    let overtimeHours = 0;
    let lateMinutes = 0;
    let actualHours = 0;
    
    const empRef = doc(db, 'users', userId);
    const empSnap = await getDoc(empRef);
    if (empSnap.exists()) {
      const empData = empSnap.data();
      const shiftStart = empData.shiftStart || '08:00';
      const [shiftH, shiftM] = shiftStart.split(':').map(Number);
      
      const [inH, inM] = timeIn.split(':').map(Number);
      
      const shiftStartTotalMins = shiftH * 60 + shiftM;
      const inTotalMins = inH * 60 + inM;
      
      if (inTotalMins > shiftStartTotalMins + hrSettings.gracePeriodMinutes) {
        calculatedStatus = 'متأخر';
        lateMinutes = inTotalMins - shiftStartTotalMins;
        
        if (lateMinutes > (hrSettings.latenessViolationThreshold || 15)) {
           const violsQ = query(collection(db, 'hr_violations'), where('employeeId', '==', userId), where('date', '==', date), where('type', '==', 'تأخير'));
           const violsSnap = await getDocs(violsQ);
           if (violsSnap.empty) {
             await addDoc(collection(db, 'hr_violations'), {
               employeeId: userId,
               employeeName: userName,
               department: empData.department || 'غير محدد',
               date: date,
               type: 'تأخير',
               deductionAmount: 0,
               reason: `تأخير تلقائي مسجل بواسطة النظام بمقدار ${lateMinutes} دقيقة عن الدوام.`,
               createdAt: new Date().toISOString()
             });
           }
        }
      }
      
      if (timeOut) {
        const [outH, outM] = timeOut.split(':').map(Number);
        let outTotalMins = outH * 60 + outM;
        if (outTotalMins < inTotalMins) {
           outTotalMins += 24 * 60; // Cross midnight
        }
        const totalWorkedMins = outTotalMins - inTotalMins;
        
        if (totalWorkedMins > 0) {
          actualHours = totalWorkedMins / 60;
          if (actualHours > hrSettings.standardWorkHours) {
            overtimeHours = actualHours - hrSettings.standardWorkHours;
          }
        }
      }
    }

    const payload = {
      employeeId: userId,
      employeeName: userName,
      date: date,
      timeIn: timeIn,
      timeOut: timeOut || '',
      status: calculatedStatus,
      actualHours: parseFloat(actualHours.toFixed(2)),
      overtimeHours: parseFloat(overtimeHours.toFixed(2)),
      lateMinutes: lateMinutes,
      notes: 'تم سحب الدوام وحساب الساعات تلقائياً'
    };

    if (attSnap.exists()) {
      await setDoc(attRef, payload, { merge: true });
    } else {
      await setDoc(attRef, payload);
    }
  } catch (err) {
    console.error("Error syncing attendance:", err);
  }
};

export const getHRAttendance = async () => {
  try {
    const q = query(collection(db, 'hr_attendance'), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error in getHRAttendance:", error);
    return [];
  }
};

export const saveHRAttendance = async (attendance, userContext = null) => {
  try {
    if (attendance.date) {
       const isLocked = await isDateLocked(attendance.date);
       if (isLocked) throw new Error("لا يمكن التعديل: تم إغلاق رواتب هذه الفترة");
    }

    const docRef = attendance.id ? doc(db, 'hr_attendance', attendance.id) : doc(collection(db, 'hr_attendance'));
    const data = { ...attendance, updatedAt: new Date().toISOString() };
    await setDoc(docRef, data, { merge: true });
    
    if (userContext) {
       await saveHRAuditLog({
          user: userContext.name || userContext,
          action: attendance.id ? 'تعديل بصمة حضور' : 'تسجيل بصمة حضور يدوي',
          module: 'الحضور والانصراف',
          description: `الموظف: ${attendance.employeeName} | التاريخ: ${attendance.date}`,
          timestamp: new Date().toISOString()
       });
    }
    
    return { ...data, id: docRef.id };
  } catch (error) {
    console.error("Error in saveHRAttendance:", error);
    throw error;
  }
};

export const getHRAttendanceByDateRange = async (dateFrom, dateTo) => {
  try {
    const q = query(
      collection(db, 'hr_attendance'),
      where('date', '>=', dateFrom),
      where('date', '<=', dateTo),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error in getHRAttendanceByDateRange:", error);
    return [];
  }
};

export const getEmployeeAttendanceByDate = async (userId, employeeId, dateStr, employeeName = '') => {
  try {
    const q = query(
      collection(db, 'hr_attendance'),
      where('date', '==', dateStr)
    );
    const snapshot = await getDocs(q);
    const targetUserId = String(userId || '').trim();
    const targetEmpId = String(employeeId || '').trim();
    const targetName = String(employeeName || '').trim();
    
    const doc = snapshot.docs.find(d => {
      const data = d.data();
      const matchUserId = targetUserId && String(data.userId || '').trim() === targetUserId;
      const matchEmpId = targetEmpId && String(data.employeeId || '').trim() === targetEmpId;
      const matchName = targetName && String(data.employeeName || '').trim() === targetName;
      return matchUserId || matchEmpId || matchName;
    });
    
    if (doc) {
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error("Error in getEmployeeAttendanceByDate:", error);
    return null;
  }
};

export const getHRAdvances = async () => {
  try {
    const q = query(collection(db, 'hr_advances'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error in getHRAdvances:", error);
    return [];
  }
};

export const saveHRAdvance = async (advance, userContext = null) => {
  try {
    const docRef = advance.id ? doc(db, 'hr_advances', advance.id) : doc(collection(db, 'hr_advances'));
    const data = { ...advance, updatedAt: new Date().toISOString() };
    if (!advance.id) data.createdAt = new Date().toISOString();
    await setDoc(docRef, data, { merge: true });

    if (userContext) {
       await saveHRAuditLog({
          user: userContext.name || userContext,
          action: advance.id ? 'تعديل طلب سلفة' : 'إنشاء طلب سلفة',
          module: 'السلف',
          description: `الموظف: ${advance.employeeName} | القيمة: ${advance.amount} د.أ`,
          timestamp: new Date().toISOString()
       });
    }

    return { ...data, id: docRef.id };
  } catch (error) {
    console.error("Error in saveHRAdvance:", error);
    throw error;
  }
};

export const deleteHRAdvance = async (id, userContext = null) => {
  try {
    await updateDoc(doc(db, 'hr_advances', id), {
      status: 'محذوف',
      deletedAt: new Date().toISOString()
    });
    
    if (userContext) {
       await saveHRAuditLog({
          user: userContext.name || userContext,
          action: 'حذف طلب سلفة',
          module: 'السلف',
          description: `تم حذف الطلب رقم ${id}`,
          timestamp: new Date().toISOString()
       });
    }
    
    return true;
  } catch (error) {
    console.error("Error in deleteHRAdvance:", error);
    throw error;
  }
};

export const getHRBonuses = async () => {
  try {
    const q = query(collection(db, 'hr_bonuses'), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error in getHRBonuses:", error);
    return [];
  }
};

export const saveHRBonus = async (bonus, userContext = null) => {
  try {
    const docRef = bonus.id ? doc(db, 'hr_bonuses', bonus.id) : doc(collection(db, 'hr_bonuses'));
    const data = { ...bonus, updatedAt: new Date().toISOString() };
    if (!bonus.id) data.createdAt = new Date().toISOString();
    
    await setDoc(docRef, data, { merge: true });

    if (userContext) {
       await saveHRAuditLog({
          user: userContext.name || userContext,
          action: bonus.id ? 'تعديل مكافأة' : 'تسجيل مكافأة',
          module: 'المكافآت',
          description: `الموظف: ${bonus.employeeName} | القيمة: ${bonus.amount} د.أ`,
          timestamp: new Date().toISOString()
       });
    }

    return { ...data, id: docRef.id };
  } catch (error) {
    console.error("Error in saveHRBonus:", error);
    throw error;
  }
};

export const deleteHRBonus = async (id, userContext = null) => {
  try {
    await updateDoc(doc(db, 'hr_bonuses', id), {
      status: 'محذوف',
      deletedAt: new Date().toISOString()
    });
    
    if (userContext) {
       await saveHRAuditLog({
          user: userContext.name || userContext,
          action: 'حذف مكافأة',
          module: 'المكافآت',
          description: `تم حذف المكافأة رقم ${id}`,
          timestamp: new Date().toISOString()
       });
    }
    
    return true;
  } catch (error) {
    console.error("Error in deleteHRBonus:", error);
    throw error;
  }
};

export const getHRViolations = async () => {
  try {
    const q = query(collection(db, 'hr_violations'), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error in getHRViolations:", error);
    return [];
  }
};

export const saveHRViolation = async (violation, userContext = null) => {
  try {
    if (violation.date) {
       const isLocked = await isDateLocked(violation.date);
       if (isLocked) throw new Error("لا يمكن التعديل: تم إغلاق رواتب هذه الفترة");
    }

    const docRef = violation.id ? doc(db, 'hr_violations', violation.id) : doc(collection(db, 'hr_violations'));
    const data = { ...violation, updatedAt: new Date().toISOString() };
    if (!violation.id) data.createdAt = new Date().toISOString();
    await setDoc(docRef, data, { merge: true });
    
    if (userContext) {
       await saveHRAuditLog({
          user: userContext.name || userContext,
          action: violation.id ? 'تعديل خصم/مخالفة' : 'إضافة خصم/مخالفة',
          module: 'الخصومات والمخالفات',
          description: `الموظف: ${violation.employeeName} | المبلغ: ${violation.deductionAmount} د.أ`,
          timestamp: new Date().toISOString()
       });
    }
    
    return { ...data, id: docRef.id };
  } catch (error) {
    console.error("Error in saveHRViolation:", error);
    throw error;
  }
};

export const deleteHRViolation = async (id, userContext = null, violationDate = null) => {
  try {
    if (violationDate) {
       const isLocked = await isDateLocked(violationDate);
       if (isLocked) throw new Error("لا يمكن الحذف: تم إغلاق رواتب هذه الفترة");
    }
    await updateDoc(doc(db, 'hr_violations', id), {
      status: 'محذوف',
      deletedAt: new Date().toISOString()
    });
    
    if (userContext) {
       await saveHRAuditLog({
          user: userContext.name || userContext,
          action: 'حذف خصم/مخالفة',
          module: 'الخصومات والمخالفات',
          description: `تم حذف المخالفة رقم ${id}`,
          timestamp: new Date().toISOString()
       });
    }
    
    return true;
  } catch (error) {
    console.error("Error in deleteHRViolation:", error);
    throw error;
  }
};

export const getHRViolationsByDateRange = async (dateFrom, dateTo) => {
  try {
    const q = query(
      collection(db, 'hr_violations'),
      where('date', '>=', dateFrom),
      where('date', '<=', dateTo),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error in getHRViolationsByDateRange:", error);
    return [];
  }
};

export const getHRLeaves = async () => {
  try {
    const q = query(collection(db, 'hr_leaves'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error in getHRLeaves:", error);
    return [];
  }
};

export const saveHRLeave = async (leave, userContext = null) => {
  try {
    if (leave.date || leave.startDate) {
       const isLocked = await isDateLocked(leave.date || leave.startDate);
       if (isLocked) throw new Error("لا يمكن التعديل: تم إغلاق رواتب هذه الفترة");
    }

    const docRef = leave.id ? doc(db, 'hr_leaves', leave.id) : doc(collection(db, 'hr_leaves'));
    const data = { ...leave, updatedAt: new Date().toISOString() };
    if (!leave.id) data.createdAt = new Date().toISOString();
    await setDoc(docRef, data, { merge: true });

    if (userContext) {
       await saveHRAuditLog({
          user: userContext.name || userContext,
          action: leave.id ? 'تعديل طلب إجازة/مغادرة' : 'إنشاء طلب إجازة/مغادرة',
          module: 'الإجازات والمغادرات',
          description: `الموظف: ${leave.employeeName} | النوع: ${leave.type}`,
          timestamp: new Date().toISOString()
       });
    }

    return { ...data, id: docRef.id };
  } catch (error) {
    console.error("Error in saveHRLeave:", error);
    throw error;
  }
};

export const deleteHRLeave = async (id, userContext = null, leaveDate = null) => {
  try {
    if (leaveDate) {
       const isLocked = await isDateLocked(leaveDate);
       if (isLocked) throw new Error("لا يمكن الحذف: تم إغلاق رواتب هذه الفترة");
    }
    await updateDoc(doc(db, 'hr_leaves', id), {
      status: 'محذوف',
      deletedAt: new Date().toISOString()
    });
    
    if (userContext) {
       await saveHRAuditLog({
          user: userContext.name || userContext,
          action: 'حذف طلب إجازة/مغادرة',
          module: 'الإجازات والمغادرات',
          description: `تم حذف الطلب رقم ${id}`,
          timestamp: new Date().toISOString()
       });
    }
    
    return true;
  } catch (error) {
    console.error("Error in deleteHRLeave:", error);
    throw error;
  }
};

export const getHRAssets = async () => {
  try {
    const q = query(collection(db, 'hr_assets'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error in getHRAssets:", error);
    return [];
  }
};

export const saveHRAsset = async (asset, userContext = null) => {
  try {
    const docRef = asset.id ? doc(db, 'hr_assets', asset.id) : doc(collection(db, 'hr_assets'));
    const data = { ...asset, updatedAt: new Date().toISOString() };
    if (!asset.id) data.createdAt = new Date().toISOString();
    await setDoc(docRef, data, { merge: true });

    if (userContext) {
       await saveHRAuditLog({
          user: userContext.name || userContext,
          action: asset.id ? 'تعديل عهدة' : 'تسليم عهدة جديدة',
          module: 'العهد والأصول',
          description: `العهدة: ${asset.name} | الموظف: ${asset.employeeName}`,
          timestamp: new Date().toISOString()
       });
    }

    return { ...data, id: docRef.id };
  } catch (error) {
    console.error("Error in saveHRAsset:", error);
    return null;
  }
};

export const deleteHRAsset = async (id, userContext = null) => {
  try {
    await deleteDoc(doc(db, 'hr_assets', id));
    if (userContext) {
       await saveHRAuditLog({
          user: userContext.name || userContext,
          action: 'حذف عهدة',
          module: 'العهد والأصول',
          description: `تم حذف العهدة بمعرف ${id}`,
          timestamp: new Date().toISOString()
       });
    }
    return true;
  } catch (error) {
    console.error("Error in deleteHRAsset:", error);
    return false;
  }
};

export const getHolidays = async () => {
  try {
    const q = query(collection(db, 'hr_holidays'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching holidays:", error);
    return [];
  }
};

export const saveHoliday = async (holidayData) => {
  try {
    const { id, ...data } = holidayData;
    if (id) {
      await updateDoc(doc(db, 'hr_holidays', id), data);
      return { success: true, id };
    } else {
      const docRef = await addDoc(collection(db, 'hr_holidays'), data);
      return { success: true, id: docRef.id };
    }
  } catch (error) {
    console.error("Error saving holiday:", error);
    return { success: false, error };
  }
};

export const deleteHoliday = async (id) => {
  try {
    await deleteDoc(doc(db, 'hr_holidays', id));
    return { success: true };
  } catch (error) {
    console.error("Error deleting holiday:", error);
    return { success: false, error };
  }
};

export const getMissingPunches = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'missing_punches'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching missing punches:", error);
    return [];
  }
};

export const saveMissingPunch = async (request) => {
  try {
    const docRef = request.id ? doc(db, 'missing_punches', request.id) : doc(collection(db, 'missing_punches'));
    const data = { ...request, updatedAt: new Date().toISOString() };
    if (!request.id) data.createdAt = new Date().toISOString();
    await setDoc(docRef, data, { merge: true });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error saving missing punch:", error);
    return { success: false, error };
  }
};

export const updateMissingPunchStatus = async (id, status, adminName, punchData) => {
  try {
    const docRef = doc(db, 'missing_punches', id);
    await setDoc(docRef, {
      status,
      approvedBy: adminName,
      approvedAt: new Date().toISOString()
    }, { merge: true });
    
    if (status === 'موافق عليه' && punchData) {
      // Find existing attendance for this day
      const existing = await getEmployeeAttendanceByDate(punchData.employeeId, punchData.employeeId, punchData.date, punchData.employeeName);
      
      const attData = {
        employeeId: punchData.employeeId,
        employeeName: punchData.employeeName,
        date: punchData.date,
        isMissingPunch: true,
        status: 'مداوم'
      };

      if (existing) {
        attData.id = existing.id;
        const oldNotes = existing.notes || '';
        const newNote = `ختمة ناقصة معتمدة من قبل ${adminName} (${punchData.reason})`;
        attData.notes = oldNotes.includes(newNote) ? oldNotes : (oldNotes ? `${oldNotes} | ${newNote}` : newNote);
        
        if (punchData.type === 'دخول') {
          attData.timeIn = punchData.time;
          // preserve existing timeOut if it exists
          attData.timeOut = existing.timeOut || '';
        } else {
          attData.timeOut = punchData.time;
          // preserve existing timeIn if it exists
          attData.timeIn = existing.timeIn || '';
        }
      } else {
        attData.notes = `ختمة ناقصة معتمدة من قبل ${adminName} (${punchData.reason})`;
        if (punchData.type === 'دخول') {
          attData.timeIn = punchData.time;
        } else {
          attData.timeOut = punchData.time;
        }
      }

      await saveHRAttendance(attData);
    }
    
    if (punchData && punchData.employeeId) {
      let msg = `تم ${status === 'موافق عليه' ? 'الموافقة على' : 'رفض'} طلب الختمة الناقصة الخاص بك لتاريخ ${punchData.date}`;
      await createNotification({
        title: 'تحديث طلب ختمة ناقصة',
        message: msg,
        visibleUserIds: [punchData.employeeId],
        category: 'info'
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error updating missing punch status:", error);
    return { success: false, error };
  }
};

export const deleteMissingPunch = async (id) => {
  try {
    await setDoc(doc(db, 'missing_punches', id), {
      status: 'محذوف',
      deletedAt: new Date().toISOString()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Error deleting missing punch:", error);
    return { success: false, error };
  }
};

export const processDailyAbsences = async (dateFrom, dateTo, userContext) => {
  try {
    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    const endProcessDate = dateTo > todayStr ? todayStr : dateTo;
    
    // 1. Fetch data
    const usersSnap = await getDocs(query(collection(db, 'users'), where('status', '==', 'active')));
    const employees = usersSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(e => e.role !== 'admin');
    
    const settings = await getGlobalSettings();
    const hrSettings = settings.hrSettings || {};
    const weekends = hrSettings.weekendDays || ['الجمعة'];
    
    const attSnap = await getDocs(query(collection(db, 'hr_attendance'), where('date', '>=', dateFrom), where('date', '<=', endProcessDate)));
    const attendances = attSnap.docs.map(d => d.data());
    
    const leavesSnap = await getDocs(collection(db, 'hr_leaves'));
    const leaves = leavesSnap.docs.map(d => d.data()).filter(l => l.status === 'موافق' || l.status === 'مقبول');
    
    const holidaysSnap = await getDocs(collection(db, 'hr_holidays'));
    const holidays = holidaysSnap.docs.map(d => d.data()).filter(h => h.isActive !== false);

    const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    let addedCount = 0;

    // Helper to get dates array
    const getDatesInRange = (start, end) => {
      const dates = [];
      let current = new Date(start);
      const last = new Date(end);
      while (current <= last) {
        dates.push(current.toLocaleDateString('en-CA'));
        current.setDate(current.getDate() + 1);
      }
      return dates;
    };

    const datesToProcess = getDatesInRange(dateFrom, endProcessDate);

    for (const dateStr of datesToProcess) {
      const dateObj = new Date(dateStr);
      const dayName = arabicDays[dateObj.getDay()];
      
      // Skip if it's a global weekend
      if (weekends.includes(dayName)) continue;
      
      for (const emp of employees) {
        // Skip if date is in holiday for this employee
        const empHolidays = holidays.filter(hol => {
          if (hol.targetAudience !== 'all' && hol.targetAudience !== `dept_${emp.department}`) return false;
          return dateStr >= hol.fromDate && dateStr <= hol.toDate;
        });
        if (empHolidays.length > 0) continue;

        // Check if employee has attendance
        const hasAtt = attendances.some(a => a.employeeId === emp.id && a.date === dateStr);
        if (hasAtt) continue;

        // Check if employee has leave
        const hasLeave = leaves.some(l => 
          l.employeeId === emp.id && 
          ((l.date && l.date === dateStr) || (l.startDate && l.startDate <= dateStr && l.endDate >= dateStr))
        );
        if (hasLeave) continue;

        // Generate Absence Record
        const attId = `${emp.id}_${dateStr}_absence`;
        const attRef = doc(db, 'hr_attendance', attId);
        
        await setDoc(attRef, {
          employeeId: emp.id,
          employeeName: emp.name,
          date: dateStr,
          timeIn: '--:--',
          timeOut: '--:--',
          status: 'غياب غير مبرر',
          actualHours: 0,
          overtimeHours: 0,
          lateMinutes: 0,
          notes: 'تم تسجيل غياب آلياً بواسطة النظام',
          createdAt: new Date().toISOString()
        });
        addedCount++;
      }
    }
    
    if (addedCount > 0 && userContext) {
      await saveHRAuditLog({
        user: userContext.name || userContext,
        action: 'تسجيل غيابات آلياً',
        module: 'الحضور والانصراف',
        description: `تم تسجيل ${addedCount} يوم غياب غير مبرر للفترة من ${dateFrom} إلى ${endProcessDate}`,
        timestamp: new Date().toISOString()
      });
    }

    return { success: true, count: addedCount };
  } catch (error) {
    console.error("Error processing daily absences:", error);
    return { success: false, error };
  }
};

