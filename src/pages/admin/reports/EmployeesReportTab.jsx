import React from 'react';
import { Eye, Edit2, Trash2 } from 'lucide-react';

const formatTimeArabic = (timeStr) => {
  if (!timeStr || timeStr === '--:--') return '--:--';
  if (timeStr.includes('صباح') || timeStr.includes('مساء')) return timeStr;
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? 'مساءً' : 'صباحاً';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${ampm}`;
};

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
  handleDeleteEmployeeReport,
  allReports
}) => {
  
  const getOverallAverage = (empId, empName) => {
    if (!allReports || allReports.length === 0) return 0;
    const empReports = allReports.filter(r => {
      const matchId = String(r.userId || r.employeeId || '').trim() === String(empId || '').trim();
      const matchName = String(r.userName || '').trim() === String(empName || '').trim();
      return matchId || matchName;
    });
    if (empReports.length === 0) return 0;
    const sum = empReports.reduce((acc, curr) => acc + (Number(curr.finalScore) || 0), 0);
    return sum / empReports.length;
  };
  
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
    
    // Overall average handling
    if (empSortKey === 'overallAverage') {
      const numA = a ? getOverallAverage(a.userId || a.employeeId, a.userName) : 0;
      const numB = b ? getOverallAverage(b.userId || b.employeeId, b.userName) : 0;
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
            <div className="flex items-center justify-center gap-1">التقييم اليومي {getEmpSortIcon('finalScore')}</div>
          </th>
          <th onClick={() => handleEmpSort('overallAverage')} className="cursor-pointer hover:text-primary transition-colors p-4">
            <div className="flex items-center justify-center gap-1">متوسط التقييم الإجمالي {getEmpSortIcon('overallAverage')}</div>
          </th>
          <th className="no-print p-4" style={{ textAlign: 'center' }}>إجراءات</th>
        </tr>
      </thead>
      <tbody>
        {(() => {
          const uniqueReports = [];
          const seenKeys = new Set();
          sorted.forEach(report => {
            const empId = String(report.userId || report.employeeId || '').trim();
            const date = String(report.date || '').trim();
            const key = `${empId}_${date}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              uniqueReports.push(report);
            }
          });
          const normalizeEmpId = (id) => String(id || '').toUpperCase().replace(/^EMP-0*/i, '').trim();
          const normalizeArabic = (str) => String(str || '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim();

          const empIdMap = new Map();
          const empNameMap = new Map();
          employees.forEach(e => {
            if (e.id) empIdMap.set(normalizeEmpId(e.id), e);
            if (e.name) empNameMap.set(normalizeArabic(e.name), e);
          });

          const hrAttMap = new Map();
          hrAttendance.forEach(a => {
            const id = normalizeEmpId(a.employeeId || a.id);
            const name = normalizeArabic(a.employeeName || a.name || '');
            const date = String(a.date).trim();
            
            const updateMap = (key, log) => {
              const existing = hrAttMap.get(key);
              if (!existing || (log.timeIn || log.timeOut) || (!existing.timeIn && !existing.timeOut)) {
                hrAttMap.set(key, log);
              }
            };
            
            if (id) updateMap(`${id}_${date}`, a);
            if (name) updateMap(`${name}_${date}`, a);
          });

          return uniqueReports.map(report => {
            const repUserId = String(report.userId || report.employeeId || '').trim();
            const repUserName = String(report.userName || '').trim();
            const repDate = String(report.date || '').trim();
            
            const emp = empIdMap.get(normalizeEmpId(repUserId)) || empNameMap.get(normalizeArabic(repUserName));
            const resolvedEmpId = emp ? (emp.employeeId || emp.id) : (repUserId || '---');
            
            const normEmpId = normalizeEmpId(emp?.id || repUserId);
            const normEmpName = normalizeArabic(repUserName || emp?.name || '');
            const att = hrAttMap.get(`${normEmpId}_${repDate}`) || hrAttMap.get(`${normEmpName}_${repDate}`);

            return (
            <tr key={report.id}>
            {!selectedEmployee && (
              <td className="text-right font-mono text-slate-500 font-bold" dir="ltr">
                {resolvedEmpId}
              </td>
            )}
            {!selectedEmployee && <td className="text-right font-bold">{report.userName}</td>}
            <td style={{ fontWeight: 'bold' }}>{report.date}</td>
            <td>{(() => {
              const tIn = String(att?.timeIn || '').trim() || String(report.timeIn || '').trim();
              return formatTimeArabic(tIn);
            })()}</td>
            <td>{(() => {
              const tOut = String(att?.timeOut || '').trim() || String(report.timeOut || '').trim();
              return formatTimeArabic(tOut);
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
            <td>
              {(() => {
                const avg = getOverallAverage(resolvedEmpId, report.userName);
                return (
                  <span className={`report-score-badge ${getScoreTone(avg)}`} title="متوسط التقييم خلال الفترة المحددة">
                    {Math.round(avg)}%
                  </span>
                );
              })()}
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
          );
        })})()}
      </tbody>
    </>
  );
};
