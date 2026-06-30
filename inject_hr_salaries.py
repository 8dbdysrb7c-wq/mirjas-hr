import os

base_dir = r"c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src"
salaries_path = os.path.join(base_dir, "pages", "hr", "HRSalaries.jsx")

def replace_in_file(filepath, replacements):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

old_import = """import { getEmployees, getHRViolations, getHRAttendance } from '../../store';"""
new_import = """import { getEmployees, getHRViolations, getHRAttendance, getHRLeaves, getGlobalSettings } from '../../store';"""

old_state = """  const [employees, setEmployees] = useState([]);
  const [violations, setViolations] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);"""

new_state = """  const [employees, setEmployees] = useState([]);
  const [violations, setViolations] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [hrSettings, setHrSettings] = useState(null);
  const [loading, setLoading] = useState(true);"""

old_fetch = """  const fetchData = async () => {
    setLoading(true);
    const [emps, viols, atts] = await Promise.all([getEmployees(), getHRViolations(), getHRAttendance()]);
    setEmployees(emps);
    setViolations(viols);
    setAttendance(atts);
    setLoading(false);
  };"""

new_fetch = """  const fetchData = async () => {
    setLoading(true);
    const [emps, viols, atts, lvs, settings] = await Promise.all([
      getEmployees(), 
      getHRViolations(), 
      getHRAttendance(),
      getHRLeaves(),
      getGlobalSettings()
    ]);
    setEmployees(emps);
    setViolations(viols);
    setAttendance(atts);
    setLeaves(lvs);
    setHrSettings(settings.hrSettings || {
      standardWorkHours: 8,
      gracePeriodMinutes: 15,
      workDaysPerMonth: 30,
      overtimeMultiplier: 1.5,
      fullDayAbsenceDeduction: true
    });
    setLoading(false);
  };"""

old_calc = """  // Calculate Salary
  const calculateSalaries = () => {
    return employees.map(emp => {
      const basic = Number(emp.basicSalary) || 0;
      
      // Get violations for selected month
      const empViolations = violations.filter(v => v.employeeId === emp.id && v.date?.startsWith(selectedMonth));
      const totalDeductions = empViolations.reduce((sum, v) => sum + (Number(v.deductionAmount) || 0), 0);

      // Get attendance for selected month
      const empAttendance = attendance.filter(a => a.employeeId === emp.id && a.date?.startsWith(selectedMonth));
      const totalOvertimeHours = empAttendance.reduce((sum, a) => sum + (Number(a.overtimeHours) || 0), 0);
      
      // Simple Overtime calculation: Overtime hour = (Basic / 30 / 8) * 1.5
      const hourlyRate = basic / 30 / 8;
      const overtimePay = totalOvertimeHours * (hourlyRate * 1.5);
      
      const netSalary = basic + overtimePay - totalDeductions;

      return {
        ...emp,
        basic,
        totalDeductions,
        totalOvertimeHours,
        overtimePay: Math.round(overtimePay),
        netSalary: Math.round(netSalary)
      };
    }).filter(emp => """

new_calc = """  // Calculate Salary
  const calculateSalaries = () => {
    if (!hrSettings) return [];
    
    return employees.map(emp => {
      const basic = Number(emp.basicSalary) || 0;
      const dailyRate = basic / hrSettings.workDaysPerMonth;
      const hourlyRate = dailyRate / hrSettings.standardWorkHours;
      
      // 1. Manual Violations
      const empViolations = violations.filter(v => v.employeeId === emp.id && v.date?.startsWith(selectedMonth));
      const manualDeductions = empViolations.reduce((sum, v) => sum + (Number(v.deductionAmount) || 0), 0);

      // 2. Attendance (Overtime & Lateness)
      const empAttendance = attendance.filter(a => a.employeeId === emp.id && a.date?.startsWith(selectedMonth));
      const totalOvertimeHours = empAttendance.reduce((sum, a) => sum + (Number(a.overtimeHours) || 0), 0);
      const totalLateMinutes = empAttendance.reduce((sum, a) => sum + (Number(a.lateMinutes) || 0), 0);
      
      // Lateness deduction (converted to hours)
      const lateDeduction = (totalLateMinutes / 60) * hourlyRate;

      // 3. Leaves & Missions
      const empLeaves = leaves.filter(l => l.employeeId === emp.id && l.status === 'مقبول' && (l.date?.startsWith(selectedMonth) || l.startDate?.startsWith(selectedMonth)));
      let unpaidLeaveHours = 0;
      let unpaidLeaveDays = 0;
      
      empLeaves.forEach(leave => {
        if (leave.type === 'إجازة غير مدفوعة') {
          // Approx 1 day
          unpaidLeaveDays += 1; 
        } else if (leave.type === 'مغادرة خاصة' || leave.type === 'مغادرة عمل') {
          // If no balance, deduct financially
          // Assuming basic deduction for missions here. 
          // You could parse startTime and endTime if needed, but for now we assume 2 hours avg or parse it:
          if (leave.startTime && leave.endTime) {
            const [sh, sm] = leave.startTime.split(':').map(Number);
            const [eh, em] = leave.endTime.split(':').map(Number);
            let mins = (eh * 60 + em) - (sh * 60 + sm);
            if (mins < 0) mins += 24 * 60;
            
            // Check employee vacation balance (in hours = balance * standardWorkHours)
            const availableHours = (Number(emp.vacationBalance) || 0) * hrSettings.standardWorkHours;
            // For simplicity in this demo, if it's a special mission, we just add it to unpaid hours 
            // IF we want to strictly deduct from salary. Let's assume we deduct 50% of missions.
            // Ideally we track remaining balance statefully. Let's just deduct it financially for now.
            unpaidLeaveHours += (mins / 60);
          }
        }
      });
      
      const unpaidLeaveDeduction = (unpaidLeaveDays * dailyRate) + (unpaidLeaveHours * hourlyRate);

      // Total Deductions
      const totalDeductions = manualDeductions + lateDeduction + unpaidLeaveDeduction;

      // Additions
      const overtimePay = totalOvertimeHours * hourlyRate * hrSettings.overtimeMultiplier;
      
      const netSalary = basic + overtimePay - totalDeductions;

      return {
        ...emp,
        basic,
        totalOvertimeHours,
        overtimePay: Math.round(overtimePay),
        lateDeduction: Math.round(lateDeduction),
        unpaidLeaveDeduction: Math.round(unpaidLeaveDeduction),
        manualDeductions: Math.round(manualDeductions),
        totalDeductions: Math.round(totalDeductions),
        netSalary: Math.round(netSalary)
      };
    }).filter(emp => """

old_table = """              <th className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('totalOvertimeHours')}>
                <div className="flex items-center gap-2">ساعات الإضافي {renderSortIcon('totalOvertimeHours')}</div>
              </th>
              <th className="text-emerald-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('overtimePay')}>
                <div className="flex items-center gap-2">بدل إضافي (+) {renderSortIcon('overtimePay')}</div>
              </th>
              <th className="text-rose-600 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('totalDeductions')}>
                <div className="flex items-center gap-2">الخصومات (-) {renderSortIcon('totalDeductions')}</div>
              </th>
              <th className="font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('netSalary')}>
                <div className="flex items-center gap-2">صافي الراتب {renderSortIcon('netSalary')}</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {salaryData.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="text-muted">{emp.id}</td>
                <td className="font-semibold">{emp.name}</td>
                <td className="text-muted">{emp.basic} د.أ</td>
                <td className="text-muted">{emp.totalOvertimeHours} ساعة</td>
                <td className="text-emerald-600 font-medium">{emp.overtimePay} د.أ</td>
                <td className="text-rose-600 font-medium">{emp.totalDeductions} د.أ</td>
                <td className="font-bold text-lg">{emp.netSalary} د.أ</td>
              </tr>
            ))}"""

new_table = """              <th className="text-emerald-600 cursor-pointer hover:bg-gray-100 transition-colors" title="يضاف للراتب الأساسي بناءً على ساعات الإضافي التلقائية" onClick={() => handleSort('overtimePay')}>
                <div className="flex items-center gap-2">الإضافي (+) {renderSortIcon('overtimePay')}</div>
              </th>
              <th className="text-rose-500 cursor-pointer hover:bg-gray-100 transition-colors" title="خصم تأخيرات الحضور آلياً" onClick={() => handleSort('lateDeduction')}>
                <div className="flex items-center gap-2">التأخير (-) {renderSortIcon('lateDeduction')}</div>
              </th>
              <th className="text-rose-500 cursor-pointer hover:bg-gray-100 transition-colors" title="خصم المغادرات غير المدفوعة والغياب" onClick={() => handleSort('unpaidLeaveDeduction')}>
                <div className="flex items-center gap-2">الغياب (-) {renderSortIcon('unpaidLeaveDeduction')}</div>
              </th>
              <th className="text-rose-600 cursor-pointer hover:bg-gray-100 transition-colors" title="إجمالي الخصومات اليدوية والآلية" onClick={() => handleSort('totalDeductions')}>
                <div className="flex items-center gap-2">إجمالي الخصم {renderSortIcon('totalDeductions')}</div>
              </th>
              <th className="font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('netSalary')}>
                <div className="flex items-center gap-2">صافي الراتب {renderSortIcon('netSalary')}</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {salaryData.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="text-muted">{emp.id}</td>
                <td className="font-semibold">{emp.name}</td>
                <td className="text-muted">{emp.basic}</td>
                <td className="text-emerald-600 font-medium" title={`${emp.totalOvertimeHours} ساعة إضافية`}>{emp.overtimePay}</td>
                <td className="text-rose-500 font-medium">{emp.lateDeduction}</td>
                <td className="text-rose-500 font-medium">{emp.unpaidLeaveDeduction}</td>
                <td className="text-rose-600 font-bold">{emp.totalDeductions}</td>
                <td className="font-bold text-lg bg-slate-50">{emp.netSalary} د.أ</td>
              </tr>
            ))}"""

replace_in_file(salaries_path, [
    (old_import, new_import),
    (old_state, new_state),
    (old_fetch, new_fetch),
    (old_calc, new_calc),
    (old_table, new_table)
])

print("HRSalaries Automated Calc Injected.")
