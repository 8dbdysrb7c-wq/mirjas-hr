export const roundMinutes = (minutes, roundingMethod) => {
  if (!roundingMethod || roundingMethod === 'minute') return minutes;
  if (roundingMethod === '15_minutes') return Math.round(minutes / 15) * 15;
  if (roundingMethod === '30_minutes') return Math.round(minutes / 30) * 30;
  if (roundingMethod === 'hour') return Math.round(minutes / 60) * 60;
  return minutes;
};

export const getCycleDates = (monthStr, startDay) => {
  const [year, month] = monthStr.split('-').map(Number);
  const day = startDay || 1;

  if (day === 1) {
    const lastDay = new Date(year, month, 0).getDate();
    return {
      start: `${year}-${String(month).padStart(2, '0')}-01`,
      end: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    };
  } else {
    let prevM = month - 1; let prevY = year;
    if (prevM === 0) { prevM = 12; prevY -= 1; }
    let currentLastDay = day - 1; let currentM = month; let currentY = year;
    if (currentLastDay === 0) {
      currentM = prevM; currentY = prevY;
      currentLastDay = new Date(currentY, currentM, 0).getDate();
    }
    return {
      start: `${prevY}-${String(prevM).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      end: `${currentY}-${String(currentM).padStart(2, '0')}-${String(currentLastDay).padStart(2, '0')}`
    };
  }
};

export const calculateSalaries = ({
  employees,
  hrSettings,
  holidays,
  violations,
  bonuses,
  attendance,
  leaves,
  advances,
  selectedMonth
}) => {
  if (!selectedMonth) {
    const today = new Date();
    selectedMonth = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
  }
  const cycle = getCycleDates(selectedMonth, hrSettings.salaryCycleStartDay || 1);

  return employees.map(emp => {
    const basic = Number(emp.basicSalary) || 0;

    const [yStr, mStr] = selectedMonth.split('-');
    const daysInMonth = new Date(parseInt(yStr, 10), parseInt(mStr, 10), 0).getDate();
    
    let workDays = hrSettings.workDaysPerMonth || daysInMonth;
    if (hrSettings.workDaysStrategy === 'actual' || !hrSettings.workDaysStrategy) {
       workDays = daysInMonth;
    } else if (hrSettings.workDaysStrategy === 'custom' && hrSettings.customWorkDays) {
      const mIndex = parseInt(mStr, 10) - 1;
      if (!isNaN(mIndex) && hrSettings.customWorkDays[mIndex]) {
        workDays = hrSettings.customWorkDays[mIndex];
      }
    }
    
    const dailyRate = basic / workDays;
    
    // Get applicable holidays for this month
    const empHolidays = (holidays || []).filter(hol => {
      if (hol.isActive === false) return false;
      if (hol.targetAudience !== 'all' && hol.targetAudience !== `dept_${emp.department}`) return false;
      return (hol.fromDate >= cycle.start && hol.toDate <= cycle.end) || (hol.fromDate <= cycle.end && hol.toDate >= cycle.start);
    });
    
    const isDateInHoliday = (dateStr) => {
      return empHolidays.find(hol => dateStr >= hol.fromDate && dateStr <= hol.toDate);
    };
    
    let empStandardWorkHours = hrSettings.standardWorkHours || 8;
    if (emp.shiftStart && emp.shiftEnd) {
      const [sh, sm] = emp.shiftStart.split(':').map(Number);
      const [eh, em] = emp.shiftEnd.split(':').map(Number);
      if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
        let mins = (eh * 60 + em) - (sh * 60 + sm);
        if (mins < 0) mins += 24 * 60; // handle overnight shifts
        empStandardWorkHours = mins / 60;
        if (empStandardWorkHours <= 0) empStandardWorkHours = hrSettings.standardWorkHours || 8; // fallback if invalid
      }
    }
    
    const hourlyRate = dailyRate / empStandardWorkHours;
    
    // 1. Manual Violations
    const empViolations = violations.filter(v => {
      if (v.employeeId !== emp.id || v.status === 'محذوف') return false;
      if (v.processedInPeriod && v.processedInPeriod !== selectedMonth) return false;
      if (!v.processedInPeriod) return v.date >= cycle.start && v.date <= cycle.end;
      return true;
    });
    const manualDeductions = empViolations.reduce((sum, v) => sum + (Number(v.deductionAmount) || 0), 0);

    // 1.5 Bonuses
    const empBonuses = bonuses.filter(b => {
      if (b.employeeId !== emp.id || b.status === 'محذوف') return false;
      if (b.processedInPeriod && b.processedInPeriod !== selectedMonth) return false;
      if (!b.processedInPeriod) return b.date >= cycle.start && b.date <= cycle.end;
      return true;
    });
    const bonusAddition = empBonuses.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    const bonusesList = empBonuses.map(b => ({ type: b.type, amount: Number(b.amount) || 0 }));

    // 2. Attendance (Lateness & Absences)
    const empAttendance = attendance.filter(a => a.employeeId === emp.id && a.date >= cycle.start && a.date <= cycle.end);
    const rawLateMinutes = empAttendance.reduce((sum, a) => sum + (Number(a.lateMinutes) || 0), 0);
    const manualUnpaidLeaveDays = empAttendance.filter(a => a.status === 'إجازة غير مدفوعة').length;
    const manualUnexcused = empAttendance.filter(a => a.status === 'غياب غير مبرر').length;
    
    const empLeaves = leaves.filter(l => {
      if (l.employeeId !== emp.id || (l.status !== 'موافق' && l.status !== 'مقبول')) return false;
      if (l.date) return l.date >= cycle.start && l.date <= cycle.end;
      if (l.startDate && l.endDate) return l.startDate <= cycle.end && l.endDate >= cycle.start;
      return false;
    });
    
    let missionMinutes = 0;
    
    empLeaves.forEach(leave => {
      if (leave.type === 'مغادرة خاصة' || leave.type === 'مغادرة عمل') {
        if (leave.startTime && leave.endTime) {
          const [sh, sm] = leave.startTime.split(':').map(Number);
          const [eh, em] = leave.endTime.split(':').map(Number);
          let mins = (eh * 60 + em) - (sh * 60 + sm);
          if (mins < 0) mins += 24 * 60;
          missionMinutes += mins;
        }
      }
    });
    
    // Automatic Unexcused Absence Detection
    let autoUnexcusedAbsenceDays = 0;
    let multiDayUnpaidLeaves = 0;
    
    const todayStr = new Date().toLocaleDateString('en-CA');
    const endProcessDate = cycle.end > todayStr ? todayStr : cycle.end;
    
    const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const weekends = hrSettings.weekendDays || ['الجمعة'];
    
    let currentDay = new Date(cycle.start);
    const lastDay = new Date(endProcessDate);
    
    while (currentDay <= lastDay) {
      const dateStr = currentDay.toLocaleDateString('en-CA');
      const dayName = arabicDays[currentDay.getDay()];
      
      // Skip weekends
      if (weekends.includes(dayName)) {
        currentDay.setDate(currentDay.getDate() + 1);
        continue;
      }
      
      // Skip holidays
      if (isDateInHoliday(dateStr)) {
        currentDay.setDate(currentDay.getDate() + 1);
        continue;
      }
      
      // Skip if attendance exists (and not deleted)
      if (empAttendance.some(a => a.date === dateStr && a.status !== 'لم يسجل دخول' && a.status !== 'محذوف')) {
        currentDay.setDate(currentDay.getDate() + 1);
        continue;
      }
      
      // Check if leave exists
      const leaveForDay = empLeaves.find(l => (l.date && l.date === dateStr) || (l.startDate && l.startDate <= dateStr && l.endDate >= dateStr));
      if (leaveForDay) {
        if (leaveForDay.type === 'إجازة غير مدفوعة') {
          multiDayUnpaidLeaves++;
        }
        currentDay.setDate(currentDay.getDate() + 1);
        continue;
      }
      
      // Unexcused absence
      autoUnexcusedAbsenceDays++;
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    const unexcusedAbsenceDays = manualUnexcused + autoUnexcusedAbsenceDays;
    const unpaidLeaveDays = manualUnpaidLeaveDays + multiDayUnpaidLeaves;
    
    const roundedLateMinutes = roundMinutes(rawLateMinutes, hrSettings.timeRounding);
    const roundedMissionMinutes = roundMinutes(missionMinutes, hrSettings.timeRounding);
    
    let lateDeduction = 0;
    let unpaidLeaveDeduction = 0;
    
    // Lateness & Missions Handling
    if (hrSettings.latenessHandling === 'deduct_from_balance' || !hrSettings.latenessHandling) {
      const totalMinutesToDeduct = roundedLateMinutes + roundedMissionMinutes;
      const balance = hrSettings.monthlyMissionBalanceMinutes || 120;
      if (totalMinutesToDeduct > balance) {
        const overBalanceMins = totalMinutesToDeduct - balance;
        lateDeduction = (overBalanceMins / 60) * hourlyRate;
      }
    } else if (hrSettings.latenessHandling === 'financial_deduction') {
      lateDeduction = ((roundedLateMinutes + roundedMissionMinutes) / 60) * hourlyRate;
    } // If warning_only, deduction is 0
    
    let unexcusedAbsenceDeduction = 0;
    
    // Absence Handling
    if (hrSettings.absenceHandling === 'full_day' || (!hrSettings.absenceHandling && hrSettings.fullDayAbsenceDeduction)) {
      unpaidLeaveDeduction = unpaidLeaveDays * dailyRate;
      unexcusedAbsenceDeduction = unexcusedAbsenceDays * dailyRate;
    } else if (hrSettings.absenceHandling === 'work_hours') {
      unpaidLeaveDeduction = unpaidLeaveDays * (empStandardWorkHours * hourlyRate);
      unexcusedAbsenceDeduction = unexcusedAbsenceDays * (empStandardWorkHours * hourlyRate);
    } // needs_approval means 0 automatic deduction
    
    // 2.5 Approved Overtime Requests
    const overtimeReqs = leaves.filter(l => {
      if (l.employeeId !== emp.id || (l.type !== 'بدل عمل إضافي' && l.type !== 'عمل إضافي') || (l.status !== 'موافق' && l.status !== 'مقبول')) return false;
      if (l.date) return l.date >= cycle.start && l.date <= cycle.end;
      if (l.startDate && l.endDate) return l.startDate <= cycle.end && l.endDate >= cycle.start;
      return false;
    });
    let rawOvertimeMins = 0;
    let overtimeRequestsCount = 0;
    
    overtimeReqs.forEach(req => {
      overtimeRequestsCount++;
      if (req.startTime && req.endTime) {
        const [sh, sm] = req.startTime.split(':').map(Number);
        const [eh, em] = req.endTime.split(':').map(Number);
        let mins = (eh * 60 + em) - (sh * 60 + sm);
        if (mins < 0) mins += 24 * 60;
        
        if (hrSettings.maxDailyOvertimeHours) {
           const maxMins = hrSettings.maxDailyOvertimeHours * 60;
           if (mins > maxMins) mins = maxMins;
        }
        
        rawOvertimeMins += mins;
      }
    });
    
    const roundedOvertimeMins = roundMinutes(rawOvertimeMins, hrSettings.timeRounding);
    const totalOvertimeHours = roundedOvertimeMins / 60;

    // Additions (Overtime)
    let overtimePay = 0;
    if (hrSettings.overtimeCalculationMethod === 'fixed_amount') {
       overtimePay = overtimeRequestsCount * (hrSettings.overtimeFixedAmount || 10);
    } else {
       overtimePay = totalOvertimeHours * hourlyRate * (hrSettings.overtimeMultiplier || 1); 
    }

    // Holiday Compensation
    let holidayPay = 0;
    let holidayAlternativeDays = 0;
    
    empAttendance.forEach(att => {
      if (att.date) {
        const hol = isDateInHoliday(att.date);
        if (hol) {
          const holSettings = hol.useDefaultSettings === false ? hol.customSettings : (hrSettings.holidayDefaults || { attendanceCompensation: 'alternative_day_and_overtime' });
          const comp = holSettings?.attendanceCompensation || 'none';
          
          if (comp.includes('alternative_day')) {
            holidayAlternativeDays += 1;
          }
          if (comp.includes('overtime_1_5')) {
            holidayPay += dailyRate * 1.5;
          } else if (comp.includes('overtime_1_25')) {
            holidayPay += dailyRate * 1.25;
          } else if (comp === 'overtime') {
            // Legacy fallback
            holidayPay += dailyRate * (hrSettings.overtimeMultiplier || 1.5);
          } else if (comp === 'alternative_day_and_overtime') {
            // Legacy fallback
            holidayPay += dailyRate * (hrSettings.overtimeMultiplier || 1.5);
          }
        }
      }
    });

    // Social Security Calculation
    let socialSecurityEmployeeDeduction = 0;
    let socialSecurityCompanyContribution = 0;
    
    if (emp.hasSocialSecurity) {
      const ssSalary = Number(emp.socialSecuritySalary) || basic;
      const employeePercentage = hrSettings.socialSecurityEmployeePercentage ?? 7.5;
      let companyPercentage = hrSettings.socialSecurityCompanyPercentage ?? 14.25;
      
      if (emp.isHazardousProfession) {
        companyPercentage += hrSettings.socialSecurityHazardousPercentage ?? 1;
      }
      
      socialSecurityEmployeeDeduction = ssSalary * (employeePercentage / 100);
      socialSecurityCompanyContribution = ssSalary * (companyPercentage / 100);
    }

    let advanceDeduction = 0;
    let advanceAddition = 0;

    const empAdvancesList = advances ? advances.filter(a => {
      if (a.employeeId !== emp.id || a.status !== 'موافق') return false;
      
      if (a.isInstallment && a.installments && a.installments.length > 0) {
        return a.installments.some(inst => inst.month === selectedMonth);
      }
      
      if (a.processedInPeriod && a.processedInPeriod !== selectedMonth) return false;
      if (!a.processedInPeriod) return ((a.date || a.createdAt) >= cycle.start && (a.date || a.createdAt) <= cycle.end);
      return true;
    }) : [];

    empAdvancesList.forEach(a => {
      let amountToProcess = 0;
      if (a.isInstallment && a.installments && a.installments.length > 0) {
        const dueInst = a.installments.find(inst => inst.month === selectedMonth);
        if (dueInst) amountToProcess = Number(dueInst.amount) || 0;
      } else {
        amountToProcess = Number(a.approvedAmount) || Number(a.amount) || 0;
      }

      if (a.type === 'سلفة شخصية') {
        advanceDeduction += amountToProcess;
      } else if (a.type === 'سلفة عمل' && a.paymentMethod === 'تصرف على الراتب القادم') {
        advanceAddition += amountToProcess;
      }
    });
    
    const totalDeductions = manualDeductions + lateDeduction + unpaidLeaveDeduction + unexcusedAbsenceDeduction + socialSecurityEmployeeDeduction + advanceDeduction;

    const transportAllowanceFull = Number(emp.transportationAllowance) || 0;
    const transportDailyRate = transportAllowanceFull / daysInMonth;
    const transportAllowanceAddition = Math.max(0, transportAllowanceFull - (unpaidLeaveDays * transportDailyRate));

    const totalBonusAmount = bonusAddition;
    const netSalary = basic + transportAllowanceAddition + overtimePay + holidayPay + advanceAddition + totalBonusAmount - totalDeductions;

    return {
      ...emp,
      basic,
      transportAllowanceAddition: Math.round(transportAllowanceAddition || 0),
      totalOvertimeHours: totalOvertimeHours || 0,
      overtimePay: Math.round(overtimePay || 0),
      holidayPay: Math.round(holidayPay || 0),
      holidayAlternativeDays,
      lateDeduction: Math.round(lateDeduction || 0),
      unpaidLeaveDeduction: Math.round(unpaidLeaveDeduction || 0),
      unexcusedAbsenceDays,
      unexcusedAbsenceDeduction: Math.round(unexcusedAbsenceDeduction || 0),
      manualDeductions: Math.round(manualDeductions || 0),
      advanceDeduction: Math.round(advanceDeduction || 0),
      advanceAddition: Math.round(advanceAddition || 0),
      bonusAddition: Math.round(totalBonusAmount || 0),
      totalBonusAmount: Math.round(totalBonusAmount || 0),
      bonusesList,
      socialSecurityEmployeeDeduction: Math.round(socialSecurityEmployeeDeduction || 0),
      socialSecurityCompanyContribution: Math.round(socialSecurityCompanyContribution || 0),
      totalDeductions: Math.round(totalDeductions || 0),
      netSalary: Math.round(netSalary || 0),
      violationsList: empViolations
    };
  });
};
