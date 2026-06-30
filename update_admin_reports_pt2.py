import re

with open('src/pages/admin/AdminReports.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Define filtered arrays
new_filters = """
  const filteredHR = hrCombined.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchSearch = (item.employeeName || '').toLowerCase().includes(term) || (item.employeeId || '').toLowerCase().includes(term) || (item.details || item.reason || '').toLowerCase().includes(term);
    const matchEmp = selectedEmployee ? item.employeeId === selectedEmployee : true;
    return matchSearch && matchEmp;
  });

  const filteredTasks = supervisorTasks.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchSearch = (item.title || '').toLowerCase().includes(term) || (item.supervisorName || '').toLowerCase().includes(term);
    const matchEmp = selectedEmployee ? item.supervisorId === selectedEmployee : true;
    return matchSearch && matchEmp;
  });

  const filteredSupervisorReports = supervisorReports.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchSearch = (item.content || '').toLowerCase().includes(term) || (item.supervisorName || '').toLowerCase().includes(term);
    const matchEmp = selectedEmployee ? item.supervisorId === selectedEmployee : true;
    return matchSearch && matchEmp;
  });

  const filteredCustomersReports = customers.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchSearch = (item.name || '').toLowerCase().includes(term) || (item.phone || '').toLowerCase().includes(term) || (item.location || '').toLowerCase().includes(term);
    const matchStatus = selectedStatus ? item.status === selectedStatus : true;
    return matchSearch && matchStatus;
  });
"""

# Find where filteredStockItems ends
pattern = re.compile(r'(const filteredStockItems = stockItems\.filter.*?\}\);)', re.DOTALL)
content = pattern.sub(r'\1\n' + new_filters, content)

# 2. currentResultsCount
count_replace = """  const currentResultsCount = activeReportTab === 'employees'
    ? filteredEmployeesReports.length
    : activeReportTab === 'sales'
      ? filteredSalesOrders.length
      : activeReportTab === 'production'
        ? filteredProductionOrders.length
        : activeReportTab === 'delivery'
          ? filteredDeliveryMissions.length
          : activeReportTab === 'stock'
            ? filteredStockItems.length
            : 0;"""

count_new = """  const currentResultsCount = activeReportTab === 'employees'
    ? filteredEmployeesReports.length
    : activeReportTab === 'sales'
      ? filteredSalesOrders.length
      : activeReportTab === 'production'
        ? filteredProductionOrders.length
        : activeReportTab === 'delivery'
          ? filteredDeliveryMissions.length
          : activeReportTab === 'stock'
            ? filteredStockItems.length
            : activeReportTab === 'hr'
              ? filteredHR.length
              : activeReportTab === 'tasks'
                ? filteredTasks.length
                : activeReportTab === 'supervisors'
                  ? filteredSupervisorReports.length
                  : activeReportTab === 'customers'
                    ? filteredCustomersReports.length
                    : 0;"""
content = content.replace(count_replace, count_new)

# 3. emptyResultsColSpan
span_replace = """  const emptyResultsColSpan = activeReportTab === 'employees'
    ? 8 : activeReportTab === 'stock'
      ? 8 : 7;"""

span_new = """  const emptyResultsColSpan = activeReportTab === 'employees'
    ? 8 : activeReportTab === 'stock'
      ? 8 : activeReportTab === 'hr' ? 4 : activeReportTab === 'tasks' ? 5 : activeReportTab === 'supervisors' ? 4 : activeReportTab === 'customers' ? 4 : 7;"""
content = content.replace(span_replace, span_new)

# 4. Table headers
headers_replace = """                  <th onClick={() => handleSort('status')} className="cursor-pointer hover:text-primary transition-colors">
                    <div className="flex items-center gap-1">الحالة {getSortIcon('status')}</div>
                  </th>
                </tr>
              )}
            </thead>"""

headers_new = """                  <th onClick={() => handleSort('status')} className="cursor-pointer hover:text-primary transition-colors">
                    <div className="flex items-center gap-1">الحالة {getSortIcon('status')}</div>
                  </th>
                </tr>
              ) : activeReportTab === 'hr' ? (
                <tr>
                  <th onClick={() => handleSort('date')} className="cursor-pointer hover:text-primary transition-colors">
                    <div className="flex items-center gap-1">التاريخ {getSortIcon('date')}</div>
                  </th>
                  <th onClick={() => handleSort('employeeName')} className="cursor-pointer hover:text-primary transition-colors">
                    <div className="flex items-center gap-1">الموظف {getSortIcon('employeeName')}</div>
                  </th>
                  <th onClick={() => handleSort('type')} className="cursor-pointer hover:text-primary transition-colors">
                    <div className="flex items-center gap-1">النوع {getSortIcon('type')}</div>
                  </th>
                  <th>التفاصيل</th>
                </tr>
              ) : activeReportTab === 'tasks' ? (
                <tr>
                  <th onClick={() => handleSort('createdAt')} className="cursor-pointer hover:text-primary transition-colors">
                    <div className="flex items-center gap-1">تاريخ الإنشاء {getSortIcon('createdAt')}</div>
                  </th>
                  <th onClick={() => handleSort('supervisorName')} className="cursor-pointer hover:text-primary transition-colors">
                    <div className="flex items-center gap-1">المشرف {getSortIcon('supervisorName')}</div>
                  </th>
                  <th onClick={() => handleSort('title')} className="cursor-pointer hover:text-primary transition-colors">
                    <div className="flex items-center gap-1">المهمة {getSortIcon('title')}</div>
                  </th>
                  <th onClick={() => handleSort('dueDate')} className="cursor-pointer hover:text-primary transition-colors">
                    <div className="flex items-center gap-1">تاريخ التسليم {getSortIcon('dueDate')}</div>
                  </th>
                  <th onClick={() => handleSort('status')} className="cursor-pointer hover:text-primary transition-colors">
                    <div className="flex items-center gap-1">الحالة {getSortIcon('status')}</div>
                  </th>
                </tr>
              ) : activeReportTab === 'supervisors' ? (
                <tr>
                  <th onClick={() => handleSort('date')} className="cursor-pointer hover:text-primary transition-colors">
                    <div className="flex items-center gap-1">التاريخ {getSortIcon('date')}</div>
                  </th>
                  <th onClick={() => handleSort('supervisorName')} className="cursor-pointer hover:text-primary transition-colors">
                    <div className="flex items-center gap-1">المشرف {getSortIcon('supervisorName')}</div>
                  </th>
                  <th onClick={() => handleSort('type')} className="cursor-pointer hover:text-primary transition-colors">
                    <div className="flex items-center gap-1">النوع {getSortIcon('type')}</div>
                  </th>
                  <th>المحتوى</th>
                </tr>
              ) : activeReportTab === 'customers' ? (
                <tr>
                  <th onClick={() => handleSort('name')} className="cursor-pointer hover:text-primary transition-colors">
                    <div className="flex items-center gap-1">الاسم {getSortIcon('name')}</div>
                  </th>
                  <th onClick={() => handleSort('phone')} className="cursor-pointer hover:text-primary transition-colors">
                    <div className="flex items-center gap-1">الهاتف {getSortIcon('phone')}</div>
                  </th>
                  <th onClick={() => handleSort('location')} className="cursor-pointer hover:text-primary transition-colors">
                    <div className="flex items-center gap-1">الموقع {getSortIcon('location')}</div>
                  </th>
                  <th onClick={() => handleSort('status')} className="cursor-pointer hover:text-primary transition-colors">
                    <div className="flex items-center gap-1">الحالة {getSortIcon('status')}</div>
                  </th>
                </tr>
              ) : null}
            </thead>"""
content = content.replace(headers_replace, headers_new)

# 5. Table body rows
body_replace = """                  </td>
                </tr>
              ))}
              {((activeReportTab === 'employees' && filteredEmployeesReports.length === 0) ||"""

body_new = """                  </td>
                </tr>
              ))}
              {activeReportTab === 'hr' && getSortedData(filteredHR).map(row => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 'bold' }}>{row.date}</td>
                  <td>{row.employeeName || row.employeeId}</td>
                  <td>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${row.source === 'مخالفة' ? 'bg-red-100 text-red-700' : (row.type === 'check_in' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700')}`}>
                      {row.source === 'حضور/انصراف' ? (row.type === 'check_in' ? 'حضور' : 'انصراف') : 'مخالفة'}
                    </span>
                  </td>
                  <td>{row.source === 'حضور/انصراف' ? (row.type === 'check_in' ? 'وقت الحضور: ' + row.timeIn : 'وقت الانصراف: ' + row.timeOut) : row.reason}</td>
                </tr>
              ))}
              {activeReportTab === 'tasks' && getSortedData(filteredTasks).map(row => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 'bold' }}>{row.createdAt?.split('T')[0] || '---'}</td>
                  <td>{row.supervisorName || row.supervisorId}</td>
                  <td>{row.title}</td>
                  <td>{row.dueDate || '---'}</td>
                  <td>
                    <span className={`badge ${row.status === 'منجز' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {row.status || 'قيد التنفيذ'}
                    </span>
                  </td>
                </tr>
              ))}
              {activeReportTab === 'supervisors' && getSortedData(filteredSupervisorReports).map(row => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 'bold' }}>{row.date}</td>
                  <td>{row.supervisorName || row.supervisorId}</td>
                  <td>{row.type}</td>
                  <td>{row.content}</td>
                </tr>
              ))}
              {activeReportTab === 'customers' && getSortedData(filteredCustomersReports).map(row => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 'bold' }}>{row.name}</td>
                  <td>{row.phone}</td>
                  <td>{row.location || '---'}</td>
                  <td>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      (row.status || 'نشط') === 'نشط' ? 'bg-emerald-100 text-emerald-700' :
                      (row.status === 'غير نشط') ? 'bg-slate-100 text-slate-700' :
                      (row.status === 'عميل جديد') ? 'bg-blue-100 text-blue-700' :
                      (row.status === 'عميل محتمل') ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {row.status || 'نشط'}
                    </span>
                  </td>
                </tr>
              ))}
              {((activeReportTab === 'employees' && filteredEmployeesReports.length === 0) ||
                (activeReportTab === 'hr' && filteredHR.length === 0) ||
                (activeReportTab === 'tasks' && filteredTasks.length === 0) ||
                (activeReportTab === 'supervisors' && filteredSupervisorReports.length === 0) ||
                (activeReportTab === 'customers' && filteredCustomersReports.length === 0) ||"""
content = content.replace(body_replace, body_new)

with open('src/pages/admin/AdminReports.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
