import os

base_dir = r"c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src"
store_path = os.path.join(base_dir, "store.js")

def replace_in_file(filepath, replacements):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

old_sync = """const syncToHRAttendance = async (userId, userName, date, timeIn, timeOut) => {
  if (!timeIn) return;
  try {
    const attId = `${userId}_${date}`;
    const attRef = doc(db, 'hr_attendance', attId);
    const attSnap = await getDoc(attRef);
    
    let calculatedStatus = 'مداوم';
    const empRef = doc(db, 'users', userId);
    const empSnap = await getDoc(empRef);
    if (empSnap.exists()) {
      const empData = empSnap.data();
      const shiftStart = empData.shiftStart || '08:00';
      const [hours, minutes] = shiftStart.split(':').map(Number);
      const graceTime = new Date();
      graceTime.setHours(hours, minutes + 15, 0);
      const graceTimeString = `${graceTime.getHours().toString().padStart(2, '0')}:${graceTime.getMinutes().toString().padStart(2, '0')}`;
      calculatedStatus = timeIn > graceTimeString ? 'متأخر' : 'مداوم';
    }

    if (attSnap.exists()) {
      await setDoc(attRef, { timeIn, timeOut: timeOut || '', status: calculatedStatus }, { merge: true });
    } else {
      await setDoc(attRef, {
        employeeId: userId,
        employeeName: userName,
        date: date,
        timeIn: timeIn,
        timeOut: timeOut || '',
        status: calculatedStatus,
        overtimeHours: '',
        notes: 'تم سحب الدوام من التقرير تلقائياً'
      });
    }
  } catch (err) {
    console.error("Error syncing attendance:", err);
  }
};"""

new_sync = """const syncToHRAttendance = async (userId, userName, date, timeIn, timeOut) => {
  if (!timeIn) return;
  try {
    const attId = `${userId}_${date}`;
    const attRef = doc(db, 'hr_attendance', attId);
    const attSnap = await getDoc(attRef);
    
    // Fetch global settings to get HR Config
    const globalSettings = await getGlobalSettings();
    const hrSettings = globalSettings.hrSettings || {
      standardWorkHours: 8,
      gracePeriodMinutes: 15,
      workDaysPerMonth: 30,
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
      
      // Calculate Late Minutes
      const shiftStartTotalMins = shiftH * 60 + shiftM;
      const inTotalMins = inH * 60 + inM;
      
      if (inTotalMins > shiftStartTotalMins + hrSettings.gracePeriodMinutes) {
        calculatedStatus = 'متأخر';
        lateMinutes = inTotalMins - shiftStartTotalMins;
      }
      
      // Calculate Actual Hours and Overtime if timeOut exists
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
};"""

replace_in_file(store_path, [(old_sync, new_sync)])
print("Attendance Auto Calc Injected.")
