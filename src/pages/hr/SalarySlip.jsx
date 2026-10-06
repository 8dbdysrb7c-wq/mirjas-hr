import React from 'react';
import './SalarySlip.css';

export const SalarySlip = ({ employee, monthLabel, previewButton, formatVal }) => {
  const basic = employee.basicSalaryEntitlement ?? employee.basic;
  const absence = (employee.unpaidLeaveDeduction || 0) + (employee.unexcusedAbsenceDeduction || 0);
  const earnings = [
    ['الراتب الأساسي المستحق', basic],
    ['بدل المواصلات', employee.transportAllowanceAddition, 'fixed'],
    [`بدل إضافي (${Number(employee.totalOvertimeHours || 0).toFixed(1)} ساعة)`, employee.overtimePay, 'overtime', 'تفاصيل العمل الإضافي'],
    ['تعويض العطل الرسمية', employee.holidayPay, 'fixed'],
    ['بدلات ومكافآت', employee.totalBonusAmount, 'bonuses'],
    ['سلفة عمل مضافة', employee.advanceAddition, 'fixed']
  ].filter((row, index) => index === 0 || Number(row[1]) > 0);
  const deductions = [
    ['خصم التأخير والمغادرات', Number(employee.lateDeduction || 0) + Number(employee.manualDeductions || 0), 'late-combined'],
    ['خصم الغياب والإجازات', absence, 'absence'],
    ['التأمين الصحي', employee.healthInsuranceDeduction],
    ['اقتطاع الضمان الاجتماعي', employee.socialSecurityEmployeeDeduction],
    ['سلفة مقتطعة', employee.advanceDeduction, 'advances']
  ].filter(row => Number(row[1]) > 0);
  const earningsTotal = Number(basic || 0) + Number(employee.transportAllowanceAddition || 0)
    + Number(employee.overtimePay || 0) + Number(employee.holidayPay || 0)
    + Number(employee.totalBonusAmount || 0) + Number(employee.advanceAddition || 0);
  const renderTable = (title, rows, total, color) => <div style={{ flex: '1 1 280px', minWidth: 0, border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
    <table className="salary-slip-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, lineHeight: 1.5 }}>
      <thead><tr><th colSpan={3} style={{ textAlign: 'right', padding: '10px 12px', background: '#f8fafc', color: '#0f172a', fontSize: 13 }}>{title}</th></tr></thead>
      <tbody>{rows.map(([label, amount, kind, previewTitle]) => <tr key={label}>
        <td style={{ padding: '9px 10px', borderTop: '1px solid #f1f5f9', color: '#475569', fontSize: 13 }}>{label}</td>
        <td className="no-print" style={{ width: 30, padding: '4px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>{kind && previewButton(kind, previewTitle || label, amount)}</td>
        <td style={{ padding: '9px 10px', borderTop: '1px solid #f1f5f9', textAlign: 'left', whiteSpace: 'nowrap', color, fontWeight: 700, fontSize: 13 }}>{formatVal(amount, false)} د.أ</td>
      </tr>)}{!rows.length && <tr><td colSpan={3} style={{ padding: 12, textAlign: 'center', color: '#64748b' }}>لا توجد استقطاعات</td></tr>}</tbody>
      <tfoot><tr style={{ background: '#f8fafc' }}><th colSpan={2} style={{ padding: '10px', textAlign: 'right', borderTop: '1px solid #e2e8f0', fontSize: 13 }}>إجمالي {title}</th><td style={{ padding: '10px', textAlign: 'left', whiteSpace: 'nowrap', borderTop: '1px solid #e2e8f0', fontSize: 13, fontWeight: 800, color }}>{formatVal(total, false)} د.أ</td></tr></tfoot>
    </table>
  </div>;
  return <div className="salary-slip bg-white printable-card print-no-border" style={{ direction: 'rtl', maxWidth: 800, margin: '0 auto', padding: 22, border: '1px solid #e2e8f0', borderRadius: 14, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
    <header className="salary-slip-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, paddingBottom: 14, marginBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 5px', color: '#0f172a' }}>قسيمة الراتب</h1>
        <div style={{ fontSize: 13, color: '#64748b' }}>{monthLabel}</div>
      </div>
      <div className="salary-slip-employee" style={{ textAlign: 'left', fontSize: 13, lineHeight: 1.7 }}>
        <strong style={{ color: '#0f172a' }}>{employee.name}</strong>
        <div style={{ color: '#64748b' }}><span dir="ltr">{employee.employeeId || employee.id}</span> · {employee.jobTitle || '—'}</div>
      </div>
    </header>
    <div className="salary-slip-sections" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
      {renderTable('الاستحقاقات', earnings, earningsTotal, '#0f766e')}
      {renderTable('الاستقطاعات', deductions, employee.totalDeductions, '#e11d48')}
    </div>
    <div className="salary-slip-net" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 10, fontSize: 13, color: '#0f766e', fontWeight: 800 }}>
      <span>صافي الراتب المستحق</span><span>{formatVal(employee.netSalary, false)} د.أ</span>
    </div>
  </div>;
};
