import { useEffect, useRef } from 'react';
import { getEmployees, getHRAttendance, getHolidays, addLog, createNotification, getGlobalSettings } from '../store';
import { sendWhatsAppNotification, sendTemplatedWhatsAppNotification } from '../utils/whatsappService';

export const useAttendanceReminders = (isAdminOnline) => {
  const sentReminders = useRef(new Set());

  useEffect(() => {
    if (!isAdminOnline) return;
    let cachedEmployees = null;
    let employeesLoadedAt = 0;
    let checking = false;

    const checkReminders = async () => {
      if (checking) return;
      checking = true;
      try {
        const settings = await getGlobalSettings();
        const remindersConfig = settings?.whatsappConfig?.reminders || {};
        if (remindersConfig.enabled === false) return; // Reminders module is disabled globally

        const now = new Date();
        // Skip Fridays
        if (now.getDay() === 5) return;

        const dateStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD local
        const currentH = now.getHours();
        const currentM = now.getMinutes();
        const currentTotalMins = currentH * 60 + currentM;

        if (!cachedEmployees || Date.now() - employeesLoadedAt >= 300000) {
          cachedEmployees = await getEmployees();
          employeesLoadedAt = Date.now();
        }
        const employees = cachedEmployees.filter(emp => [emp.shiftStart, emp.shiftEnd].some(time => {
          if (!time) return false;
          const [hours, minutes] = time.split(':').map(Number);
          return currentTotalMins === hours * 60 + minutes - 5;
        }));
        if (!employees.length) return;
        const todayAttendance = await getHRAttendance(dateStr);
        const holidays = await getHolidays();

        // Get today's active holidays
        const todayHolidays = holidays.filter(h => 
          h.isActive !== false && 
          dateStr >= h.fromDate && 
          dateStr <= h.toDate
        );

        for (const emp of employees) {
          if (!emp.shiftStart || !emp.shiftEnd) continue;

          // Check if employee is on holiday today
          const isOnHoliday = todayHolidays.some(h => 
            h.targetAudience === 'all' || 
            h.targetAudience === `dept_${emp.department}`
          );
          if (isOnHoliday) continue;

          const [startH, startM] = emp.shiftStart.split(':').map(Number);
          const startTotalMins = startH * 60 + startM;

          const [endH, endM] = emp.shiftEnd.split(':').map(Number);
          const endTotalMins = endH * 60 + endM;

          // 5 mins before start
          if (currentTotalMins === startTotalMins - 5) {
            const key = `${emp.id}_${dateStr}_start`;
            if (!sentReminders.current.has(key)) {
              // Check if already checked in
              const hasCheckedIn = todayAttendance.some(a => String(a.employeeId) === String(emp.id) && a.type === 'دخول');
              if (!hasCheckedIn) {
                if (remindersConfig.triggers?.check_in !== false) {
                  sentReminders.current.add(key);
                  
                  // Send Notification
                  const msg = `تذكير: لم يتبق سوى 5 دقائق على موعد بدء الدوام. يرجى تسجيل الدخول.`;
                  await createNotification({
                    settingKey: 'attendance',
                    targetEmployeeId: emp.id,
                    moduleKey: 'hr',
                    moduleLabel: 'الموارد البشرية',
                    title: 'تذكير تسجيل دخول',
                    message: msg,
                    target: { tab: 'hr_requests' }
                  });

                  await sendTemplatedWhatsAppNotification(emp.phone, 'reminders', 'check_in', {
                    employeeName: emp.name
                  });

                  await addLog({
                    action: 'إرسال تذكير تلقائي',
                    module: 'الحضور والانصراف',
                    details: `تم إرسال تذكير تسجيل دخول للموظف: ${emp.name} (بقي 5 دقائق)`,
                    userName: 'النظام الآلي'
                  });
                }
              }
            }
          }

          // 5 mins before end
          if (currentTotalMins === endTotalMins - 5) {
            const key = `${emp.id}_${dateStr}_end`;
            if (!sentReminders.current.has(key)) {
              // Check if already checked out
              const hasCheckedOut = todayAttendance.some(a => String(a.employeeId) === String(emp.id) && a.type === 'خروج');
              if (!hasCheckedOut) {
                if (remindersConfig.triggers?.check_out !== false) {
                  sentReminders.current.add(key);
                  
                  const msg = `تذكير: لم يتبق سوى 5 دقائق على موعد انتهاء الدوام. يرجى الاستعداد لتسجيل الخروج.`;
                  await createNotification({
                    settingKey: 'attendance',
                    targetEmployeeId: emp.id,
                    moduleKey: 'hr',
                    moduleLabel: 'الموارد البشرية',
                    title: 'تذكير تسجيل خروج',
                    message: msg,
                    target: { tab: 'hr_requests' }
                  });

                  await sendTemplatedWhatsAppNotification(emp.phone, 'reminders', 'check_out', {
                    employeeName: emp.name
                  });

                  await addLog({
                    action: 'إرسال تذكير تلقائي',
                    module: 'الحضور والانصراف',
                    details: `تم إرسال تذكير تسجيل خروج للموظف: ${emp.name} (بقي 5 دقائق)`,
                    userName: 'النظام الآلي'
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error in attendance reminder cron:", error);
      } finally {
        checking = false;
      }
    };

    // Run check immediately, then every 1 minute
    checkReminders();
    const intervalId = setInterval(checkReminders, 60000);

    return () => clearInterval(intervalId);
  }, [isAdminOnline]);
};
