import { collection, doc, onSnapshot, query, setDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { isAdmin } from './settings';

const salaryFields = ['id', 'employeeId', 'name', 'jobTitle', 'basic', 'basicSalaryEntitlement', 'transportAllowanceAddition', 'totalOvertimeHours', 'overtimePay', 'holidayPay', 'totalBonusAmount', 'advanceAddition', 'lateDeduction', 'unpaidLeaveDeduction', 'unexcusedAbsenceDeduction', 'manualDeductions', 'healthInsuranceDeduction', 'socialSecurityEmployeeDeduction', 'advanceDeduction', 'totalDeductions', 'netSalary', 'violationsList', 'salaryDetails'];
export const shareSalarySlip = async (admin, employee, month, visible) => {
  if (!isAdmin(admin)) throw new Error('هذه العملية متاحة للأدمن فقط');
  if (!employee?.id || !/^\d{4}-\d{2}$/.test(month)) throw new Error('يرجى اختيار الموظف والشهر');
  const salary = Object.fromEntries(salaryFields.filter(field => employee[field] !== undefined).map(field => [field, employee[field]]));
  await setDoc(doc(db, 'employee_salary_slips', `${employee.id}_${month}`), {
    employeeId: String(employee.id), month, visible, salary,
    updatedAt: new Date().toISOString(), updatedBy: admin.id
  });
};
export const shareSalarySlips = async (admin, employees, month, visible) => {
  if (!isAdmin(admin)) throw new Error('هذه العملية متاحة للأدمن فقط');
  if (!/^\d{4}-\d{2}$/.test(month) || employees.some(employee => !employee?.id)) throw new Error('يرجى اختيار الموظفين والشهر');
  const updatedAt = new Date().toISOString();
  for (let start = 0; start < employees.length; start += 450) {
    const batch = writeBatch(db);
    employees.slice(start, start + 450).forEach(employee => {
      const salary = Object.fromEntries(salaryFields.filter(field => employee[field] !== undefined).map(field => [field, employee[field]]));
      batch.set(doc(db, 'employee_salary_slips', `${employee.id}_${month}`), {
        employeeId: String(employee.id), month, visible, salary, updatedAt, updatedBy: admin.id
      });
    });
    await batch.commit();
  }
};
export const subscribeSharedSalaryMonth = (month, callback, onError) => onSnapshot(
  query(collection(db, 'employee_salary_slips'), where('month', '==', month)),
  snapshot => callback(snapshot.docs.map(record => ({ ...record.data(), id: record.id }))), onError
);
export const subscribeMySalarySlips = (employeeId, callback, onError) => onSnapshot(
  query(collection(db, 'employee_salary_slips'), where('employeeId', '==', String(employeeId))),
  snapshot => callback(snapshot.docs.map(record => ({ ...record.data(), id: record.id })).filter(record => record.visible === true)
    .sort((a, b) => b.month.localeCompare(a.month))), onError
);
