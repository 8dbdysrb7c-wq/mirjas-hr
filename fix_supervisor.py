import re

filepath = r"c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\admin\AdminSupervisorReports.jsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add sortConfig state
sort_state = """
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnName) => {
    if (sortConfig.key !== columnName) {
      return <ArrowUpDown size={14} className="text-gray-400 inline ml-1" />;
    }
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-primary inline ml-1" /> : <ArrowDown size={14} className="text-primary inline ml-1" />;
  };
"""
# inject after dateTo
content = content.replace("const [dateTo, setDateTo] = useState('');", "const [dateTo, setDateTo] = useState('');\n" + sort_state)


# modify visibleReports sort
old_visible_reports = """  const visibleReports = reports.filter(report => {
    if (!isSuperAdmin && report.supervisorId !== user.id) return false;
    const matchFrom = dateFrom ? report.date >= dateFrom : true;
    const matchTo = dateTo ? report.date <= dateTo : true;
    return matchFrom && matchTo;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));"""

new_visible_reports = """  const visibleReports = reports.filter(report => {
    if (!isSuperAdmin && report.supervisorId !== user.id) return false;
    const matchFrom = dateFrom ? report.date >= dateFrom : true;
    const matchTo = dateTo ? report.date <= dateTo : true;
    return matchFrom && matchTo;
  }).sort((a, b) => {
    if (!sortConfig.key) return new Date(b.date) - new Date(a.date);
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    
    if (sortConfig.key === 'employeeEvaluations') {
      aVal = a.employeeEvaluations?.length || 0;
      bVal = b.employeeEvaluations?.length || 0;
    }

    if (aVal == null) aVal = '';
    if (bVal == null) bVal = '';

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });"""

content = content.replace(old_visible_reports, new_visible_reports)

# inject icons in header
old_headers = """                  <th>التاريخ</th>
                  <th>المشرف</th>
                  <th>حالة الحضور</th>
                  <th>تقييم الموظفين</th>
                  <th>حالة التقرير</th>"""

new_headers = """                  <th onClick={() => handleSort('date')} className="cursor-pointer hover:bg-slate-50 transition-colors">التاريخ {getSortIcon('date')}</th>
                  <th onClick={() => handleSort('supervisorName')} className="cursor-pointer hover:bg-slate-50 transition-colors">المشرف {getSortIcon('supervisorName')}</th>
                  <th onClick={() => handleSort('employeeAttendanceStatus')} className="cursor-pointer hover:bg-slate-50 transition-colors">حالة الحضور {getSortIcon('employeeAttendanceStatus')}</th>
                  <th onClick={() => handleSort('employeeEvaluations')} className="cursor-pointer hover:bg-slate-50 transition-colors">تقييم الموظفين {getSortIcon('employeeEvaluations')}</th>
                  <th onClick={() => handleSort('status')} className="cursor-pointer hover:bg-slate-50 transition-colors">حالة التقرير {getSortIcon('status')}</th>"""

content = content.replace(old_headers, new_headers)

# ensure ArrowUpDown, ArrowUp, ArrowDown are imported
if 'ArrowUpDown' not in content:
    content = content.replace('import { ', 'import { ArrowUpDown, ArrowUp, ArrowDown, ')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated AdminSupervisorReports.jsx")
