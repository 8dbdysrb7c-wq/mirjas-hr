with open("c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/store.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if i == 1611:  # line 1612
        new_lines.append("""
// ==========================================
// HR Holidays Management
// ==========================================

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
      await saveHRAuditLog({
         user: userContext.name || userContext,
         action: status === 'locked' ? 'إغلاق دورة رواتب' : 'فتح دورة رواتب',
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

export const saveHRAuditLog = async (logData) => {
  try {
    const docRef = await addDoc(collection(db, 'hr_audit_logs'), logData);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error saving HR audit log:", error);
    return { success: false, error };
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
""")
        skip = True
    if i == 1648:  # line 1649 is empty line before // HR Advances
        skip = False
    
    if not skip:
        new_lines.append(line)

with open("c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/store.js", "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("Fixed store.js")
