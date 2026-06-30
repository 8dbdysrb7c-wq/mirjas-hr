import re

with open('src/pages/admin/AdminReports.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "getSupervisorReportsByDateRange } from '../../store';",
    "getSupervisorReportsByDateRange, getMissingPunches } from '../../store';"
)
content = content.replace(
    "import { FileText, Download, Calendar, ArrowUpDown, Filter, ChevronDown, Check, Printer, Settings } from 'lucide-react';",
    "import { FileText, Download, Calendar, ArrowUpDown, Filter, ChevronDown, Check, Printer, Settings, Fingerprint, Users, AlertCircle, CheckCircle2 } from 'lucide-react';"
)

# 2. State
content = content.replace(
    "const [stockItems, setStockItems] = useState([]);",
    "const [stockItems, setStockItems] = useState([]);\n  const [missingPunches, setMissingPunches] = useState([]);"
)

# 3. Fetch
content = content.replace(
    "const [emps, depts, custs, stock] = await Promise.all([",
    "const [emps, depts, custs, stock, mpData] = await Promise.all(["
)
content = content.replace(
    "getStock()",
    "getStock(),\n          getMissingPunches()"
)
content = content.replace(
    "setStockItems(stock);",
    "setStockItems(stock);\n        setMissingPunches(mpData);"
)

# 4. Filters
filters_logic = """  const filteredMissingPunches = missingPunches.filter(mp => {
    const matchEmp = selectedEmployee ? mp.employeeId === selectedEmployee : true;
    const matchDateFrom = dateFrom ? mp.date >= dateFrom : true;
    const matchDateTo = dateTo ? mp.date <= dateTo : true;
    const matchSearch = searchTerm ? (mp.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) : true;
    return matchEmp && matchDateFrom && matchDateTo && matchSearch;
  });

  const getMissingPunchesStats = () => {
    const total = filteredMissingPunches.length;
    const approved = filteredMissingPunches.filter(p => p.status === 'موافق عليه').length;
    const rejected = filteredMissingPunches.filter(p => p.status === 'مرفوض').length;
    
    // Most submitting employees
    const empCounts = {};
    filteredMissingPunches.forEach(p => {
      empCounts[p.employeeName] = (empCounts[p.employeeName] || 0) + 1;
    });
    const topEmployees = Object.entries(empCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
      
    return { total, approved, rejected, topEmployees };
  };
  const mpStats = getMissingPunchesStats();"""

content = content.replace("  const filteredEmployeesReports = reports.filter(r => {", filters_logic + "\n\n  const filteredEmployeesReports = reports.filter(r => {")

# 5. Print configs
print_config_old = """    supervisors: {
      columns: [
        { key: 'supervisorName', label: 'المشرف' },"""
print_config_new = """    missingpunches: {
      columns: [
        { key: 'employeeName', label: 'الموظف' },
        { key: 'date', label: 'التاريخ' },
        { key: 'type', label: 'النوع' },
        { key: 'time', label: 'الوقت' },
        { key: 'reason', label: 'السبب' },
        { key: 'status', label: 'الحالة' }
      ],
      selectedColumns: ['employeeName', 'date', 'type', 'time', 'status'],
      rowLimit: 'all'
    },
    supervisors: {
      columns: [
        { key: 'supervisorName', label: 'المشرف' },"""
content = content.replace(print_config_old, print_config_new)

# 6. Tab Menu
tab_menu = """        <div 
          onClick={() => handleTabChange('hr')}
          className={`premium-tab ${activeReportTab === 'hr' ? 'premium-tab-active' : 'premium-tab-inactive'}`}
        >
          <Calendar size={18} />
          <span>الحضور والمخالفات</span>
        </div>
        <div 
          onClick={() => handleTabChange('missingpunches')}
          className={`premium-tab ${activeReportTab === 'missingpunches' ? 'premium-tab-active' : 'premium-tab-inactive'}`}
        >
          <Fingerprint size={18} />
          <span>الختمات الناقصة</span>
        </div>"""
content = content.replace("""        <div 
          onClick={() => handleTabChange('hr')}
          className={`premium-tab ${activeReportTab === 'hr' ? 'premium-tab-active' : 'premium-tab-inactive'}`}
        >
          <Calendar size={18} />
          <span>الحضور والمخالفات</span>
        </div>""", tab_menu)

# 7. Render Header
render_header = """              ) : activeReportTab === 'missingpunches' ? (
                <tr>
                  <th onClick={() => handleSort('employeeName')} className="p-4 cursor-pointer hover:bg-slate-200/50 transition-colors">
                    <div className="flex items-center gap-2">الموظف {getSortIcon('employeeName')}</div>
                  </th>
                  <th onClick={() => handleSort('date')} className="p-4 cursor-pointer hover:bg-slate-200/50 transition-colors">
                    <div className="flex items-center gap-2">التاريخ {getSortIcon('date')}</div>
                  </th>
                  <th onClick={() => handleSort('type')} className="p-4 cursor-pointer hover:bg-slate-200/50 transition-colors">
                    <div className="flex items-center gap-2">النوع {getSortIcon('type')}</div>
                  </th>
                  <th onClick={() => handleSort('time')} className="p-4 cursor-pointer hover:bg-slate-200/50 transition-colors">
                    <div className="flex items-center gap-2">الوقت {getSortIcon('time')}</div>
                  </th>
                  <th className="p-4 w-1/4">السبب</th>
                  <th onClick={() => handleSort('status')} className="p-4 cursor-pointer hover:bg-slate-200/50 transition-colors">
                    <div className="flex items-center gap-2">الحالة {getSortIcon('status')}</div>
                  </th>
                </tr>"""
content = content.replace("              ) : activeReportTab === 'tasks' ? (", render_header + "\n              ) : activeReportTab === 'tasks' ? (")

# 8. Render Stats Card for Missing Punches
stats_card = """      {activeReportTab === 'missingpunches' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 animate-fade-in no-print">
          <div className="glass-card flex items-center gap-4 bg-gradient-to-r from-blue-50 to-white">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><FileText size={24} /></div>
            <div><p className="text-sm text-slate-500">إجمالي الطلبات</p><p className="text-2xl font-bold text-slate-800">{mpStats.total}</p></div>
          </div>
          <div className="glass-card flex items-center gap-4 bg-gradient-to-r from-green-50 to-white">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg"><CheckCircle2 size={24} /></div>
            <div><p className="text-sm text-slate-500">الطلبات المقبولة</p><p className="text-2xl font-bold text-slate-800">{mpStats.approved}</p></div>
          </div>
          <div className="glass-card flex items-center gap-4 bg-gradient-to-r from-red-50 to-white">
            <div className="p-3 bg-red-100 text-red-600 rounded-lg"><AlertCircle size={24} /></div>
            <div><p className="text-sm text-slate-500">الطلبات المرفوضة</p><p className="text-2xl font-bold text-slate-800">{mpStats.rejected}</p></div>
          </div>
          <div className="glass-card flex flex-col justify-center bg-gradient-to-r from-purple-50 to-white p-4">
            <p className="text-sm text-slate-500 mb-2 flex items-center gap-2"><Users size={16} className="text-purple-600" /> الأكثر تقديماً</p>
            {mpStats.topEmployees.length > 0 ? (
              <div className="space-y-1">
                {mpStats.topEmployees.map((emp, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="font-bold text-slate-700 truncate ml-2" title={emp.name}>{emp.name}</span>
                    <span className="bg-purple-100 text-purple-700 px-2 rounded font-bold text-xs">{emp.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-sm text-slate-400">لا يوجد بيانات</span>
            )}
          </div>
        </div>
      )}"""

content = content.replace("      <div className=\"bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden\">", stats_card + "\n      <div className=\"bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden\">")

# 9. Render Rows
render_rows = """              {activeReportTab === 'missingpunches' && getSortedData(filteredMissingPunches).map(row => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  {(printDraftConfig.selectedColumns.includes('employeeName') || !pendingPrint) && (
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{row.employeeName}</div>
                      <div className="text-xs text-slate-500">{row.employeeId}</div>
                    </td>
                  )}
                  {(printDraftConfig.selectedColumns.includes('date') || !pendingPrint) && <td className="p-4 text-slate-600">{row.date}</td>}
                  {(printDraftConfig.selectedColumns.includes('type') || !pendingPrint) && (
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs font-bold rounded ${row.type === 'دخول' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                        {row.type}
                      </span>
                    </td>
                  )}
                  {(printDraftConfig.selectedColumns.includes('time') || !pendingPrint) && <td className="p-4 font-bold text-slate-700" dir="ltr">{row.time}</td>}
                  {(printDraftConfig.selectedColumns.includes('reason') || !pendingPrint) && <td className="p-4 text-slate-600 text-sm">{row.reason}</td>}
                  {(printDraftConfig.selectedColumns.includes('status') || !pendingPrint) && (
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                        row.status === 'موافق عليه' ? 'bg-green-100 text-green-700' :
                        row.status === 'مرفوض' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  )}
                </tr>
              ))}"""
content = content.replace("              {activeReportTab === 'tasks' && getSortedData(filteredTasks).map(row => (", render_rows + "\n              {activeReportTab === 'tasks' && getSortedData(filteredTasks).map(row => (")

empty_state = """                (activeReportTab === 'missingpunches' && filteredMissingPunches.length === 0) ||"""
content = content.replace("                (activeReportTab === 'hr' && filteredHR.length === 0) ||", "                (activeReportTab === 'hr' && filteredHR.length === 0) ||\n" + empty_state)

with open('src/pages/admin/AdminReports.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
