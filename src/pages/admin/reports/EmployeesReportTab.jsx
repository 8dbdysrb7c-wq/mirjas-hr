import React from 'react';
import { Eye, Edit2, Trash2 } from 'lucide-react';

export const EmployeesReportTab = ({
  employees,
  hrAttendance,
  filteredEmployeesReports,
  selectedEmployee,
  empSortKey,
  empSortDir,
  handleEmpSort,
  getEmpSortIcon,
  getScoreTone,
  handleViewReportDetails,
  handleEditEmployeeReport,
  handleDeleteEmployeeReport
}) => {
  
  // Inline safe sorting strictly for Employee Reports
  const sorted = [...filteredEmployeesReports].sort((a, b) => {
    if (!empSortKey) return 0;
    
    let aVal = a ? a[empSortKey] : '';
    let bVal = b ? b[empSortKey] : '';
    
    // Number handling
    if (empSortKey === 'phoneUsages' || empSortKey === 'tasksCount' || empSortKey === 'finalScore') {
      const numA = Number(aVal) || 0;
      const numB = Number(bVal) || 0;
      if (numA < numB) return empSortDir === 'asc' ? -1 : 1;
      if (numA > numB) return empSortDir === 'asc' ? 1 : -1;
      return 0;
    }
    
    // Date handling
    if (empSortKey === 'date') {
      const dateA = new Date(aVal || 0).getTime();
      const dateB = new Date(bVal || 0).getTime();
      if (!isNaN(dateA) && !isNaN(dateB)) {
        if (dateA < dateB) return empSortDir === 'asc' ? -1 : 1;
        if (dateA > dateB) return empSortDir === 'asc' ? 1 : -1;
        return 0;
      }
    }
    
    // String handling
    const strA = String(aVal || '').trim().toLowerCase();
    const strB = String(bVal || '').trim().toLowerCase();
    if (strA < strB) return empSortDir === 'asc' ? -1 : 1;
    if (strA > strB) return empSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <>
      <thead>
        <tr>
          {!selectedEmployee && (
            <th onClick={() => handleEmpSort('userId')} className="cursor-pointer hover:text-primary transition-colors p-4 text-right">
              <div className="flex items-center justify-start gap-1">الرقم الوظيفي {getEmpSortIcon('userId')}</div>
            </th>
          )}
          {!selectedEmployee && (
            <th onClick={() => handleEmpSort('userName')} className="cursor-pointer hover:text-primary transition-colors p-4 text-right">
              <div className="flex items-center justify-start gap-1">اسم الموظف {getEmpSortIcon('userName')}</div>
            </th>
          )}
          <th onClick={() => handleEmpSort('date')} className="cursor-pointer hover:text-primary transition-colors p-4">
            <div className="flex items-center justify-center gap-1">التاريخ {getEmpSortIcon('date')}</div>
          </th>
          <th onClick={() => handleEmpSort('timeIn')} className="cursor-pointer hover:text-primary transition-colors p-4">
            <div className="flex items-center justify-center gap-1">الدخول {getEmpSortIcon('timeIn')}</div>
          </th>
          <th onClick={() => handleEmpSort('timeOut')} className="cursor-pointer hover:text-primary transition-colors p-4">
            <div className="flex items-center justify-center gap-1">الخروج {getEmpSortIcon('timeOut')}</div>
          </th>
          <th onClick={() => handleEmpSort('phoneUsages')} className="cursor-pointer hover:text-primary transition-colors p-4">
            <div className="flex items-center justify-center gap-1">استخدام الهاتف {getEmpSortIcon('phoneUsages')}</div>
          </th>
          <th onClick={() => handleEmpSort('tasksCount')} className="cursor-pointer hover:text-primary transition-colors p-4">
            <div className="flex items-center justify-center gap-1">المهام {getEmpSortIcon('tasksCount')}</div>
          </th>
          <th onClick={() => handleEmpSort('finalScore')} className="cursor-pointer hover:text-primary transition-colors p-4">
            <div className="flex items-center justify-center gap-1">التقييم {getEmpSortIcon('finalScore')}</div>
          </th>
          <th className="no-print p-4" style={{ textAlign: 'center' }}>إجراءات</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map(report => (
          <tr key={report.id}>
            {!selectedEmployee && (
              <td className="text-right font-mono text-slate-500 font-bold" dir="ltr">
                {(() => {
                  const emp = employees.find(e => String(e.id).trim() === String(report.userId || report.employeeId || '').trim() || String(e.name).trim() === String(report.userName || '').trim());
                  return emp ? (emp.employeeId || emp.id) : (report.userId || report.employeeId || '---');
                })()}
              </td>
            )}
            {!selectedEmployee && <td className="text-right font-bold">{report.userName}</td>}
            <td style={{ fontWeight: 'bold' }}>{report.date}</td>
            <td>{(() => {
              const emp = employees.find(e => String(e.id).trim() === String(report.userId || report.employeeId || '').trim() || String(e.name).trim() === String(report.userName || '').trim());
              const att = hrAttendance.find(a => {
                const matchId = String(a.employeeId || '').trim() === String(emp?.id || report.userId || report.employeeId || '').trim();
                const matchName = String(a.employeeName || '').trim() === String(report.userName || emp?.name || '').trim();
                const matchDate = String(a.date).trim() === String(report.date).trim();
                return (matchId || matchName) && matchDate;
              });
              const tIn = (att?.timeIn || '').trim() || (report.timeIn || '').trim();
              return tIn || '---';
            })()}</td>
            <td>{(() => {
              const emp = employees.find(e => String(e.id).trim() === String(report.userId || report.employeeId || '').trim() || String(e.name).trim() === String(report.userName || '').trim());
              const att = hrAttendance.find(a => {
                const matchId = String(a.employeeId || '').trim() === String(emp?.id || report.userId || report.employeeId || '').trim();
                const matchName = String(a.employeeName || '').trim() === String(report.userName || emp?.name || '').trim();
                const matchDate = String(a.date).trim() === String(report.date).trim();
                return (matchId || matchName) && matchDate;
              });
              const tOut = (att?.timeOut || '').trim() || (report.timeOut || '').trim();
              return tOut || '---';
            })()}</td>
            <td>{report.phoneUsages || 0}</td>
            <td>
              <span className="report-inline-badge">{report.tasks?.length || 0} مهام</span>
            </td>
            <td>
              <span className={`report-score-badge ${getScoreTone(report.finalScore)}`}>
                {Math.round(report.finalScore)}%
              </span>
            </td>

            <td className="no-print">
              <div className="flex gap-2 justify-center">
                <button className="btn-premium-view" title="عرض التفاصيل" onClick={() => handleViewReportDetails(report)}>
                  <Eye size={16} />
                </button>
                <button className="btn-premium-edit" title="تعديل" onClick={() => handleEditEmployeeReport(report)}>
                  <Edit2 size={16} />
                </button>
                <button className="btn-premium-delete" title="حذف" onClick={() => handleDeleteEmployeeReport(report)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </>
  );
};
