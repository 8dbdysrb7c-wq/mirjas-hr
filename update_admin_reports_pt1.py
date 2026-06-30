import re

with open('src/pages/admin/AdminReports.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { getReports, getEmployees, getDepartments, saveReport, deleteReport, getSalesOrders, getOrders, getCustomers, getMissions, getStock, getReportsByDateRange, getSalesOrdersByDateRange, getOrdersByDateRange, getMissionsByDateRange } from '../../store';",
    "import { getReports, getEmployees, getDepartments, saveReport, deleteReport, getSalesOrders, getOrders, getCustomers, getMissions, getStock, getReportsByDateRange, getSalesOrdersByDateRange, getOrdersByDateRange, getMissionsByDateRange, getHRAttendanceByDateRange, getHRViolationsByDateRange, getSupervisorTasksByDateRange, getSupervisorReportsByDateRange } from '../../store';"
)

content = content.replace(
    "import { FileText, Calendar, Search, Printer, List, Trash2, ShoppingCart, ShoppingBag, Users, X, Filter, Eye, Edit2, Plus, Trash, ArrowUpDown, Truck, Package } from 'lucide-react';",
    "import { FileText, Calendar, Search, Printer, List, Trash2, ShoppingCart, ShoppingBag, Users, X, Filter, Eye, Edit2, Plus, Trash, ArrowUpDown, Truck, Package, Building2, ClipboardList, UserCheck } from 'lucide-react';"
)

# 2. DEFAULT_PRINT_CONFIGS
content = content.replace(
    "stock: { selectedColumns: ['itemNumber', 'name', 'variant', 'category', 'warehouse', 'quantity', 'unit', 'status'], rowLimit: 'all' }",
    "stock: { selectedColumns: ['itemNumber', 'name', 'variant', 'category', 'warehouse', 'quantity', 'unit', 'status'], rowLimit: 'all' },\n  hr: { selectedColumns: ['date', 'employeeName', 'type', 'details'], rowLimit: 'all' },\n  tasks: { selectedColumns: ['createdAt', 'supervisorName', 'title', 'dueDate', 'status'], rowLimit: 'all' },\n  supervisors: { selectedColumns: ['date', 'supervisorName', 'type', 'content'], rowLimit: 'all' },\n  customers: { selectedColumns: ['name', 'phone', 'location', 'status'], rowLimit: 'all' }"
)

# 3. PRINT_ROWS_PER_PAGE_BY_TAB
content = content.replace(
    "stock: 26\n};",
    "stock: 26,\n  hr: 24,\n  tasks: 24,\n  supervisors: 24,\n  customers: 24\n};"
)

# 4. State
content = content.replace(
    "const [stockItems, setStockItems] = useState([]);",
    "const [stockItems, setStockItems] = useState([]);\n  const [hrAttendance, setHRAttendance] = useState([]);\n  const [hrViolations, setHRViolations] = useState([]);\n  const [supervisorTasks, setSupervisorTasks] = useState([]);\n  const [supervisorReports, setSupervisorReports] = useState([]);"
)

# 5. fetchDataByRange
fetch_replace = """    } else if (activeReportTab === 'delivery') {
      const missions = await getMissionsByDateRange(dateFrom, dateTo);
      setDeliveryMissions(missions);
    } else if (activeReportTab === 'stock') {"""

fetch_new = """    } else if (activeReportTab === 'delivery') {
      const missions = await getMissionsByDateRange(dateFrom, dateTo);
      setDeliveryMissions(missions);
    } else if (activeReportTab === 'hr') {
      const [atts, viols] = await Promise.all([
        getHRAttendanceByDateRange(dateFrom, dateTo),
        getHRViolationsByDateRange(dateFrom, dateTo)
      ]);
      setHRAttendance(atts);
      setHRViolations(viols);
    } else if (activeReportTab === 'tasks') {
      const tasks = await getSupervisorTasksByDateRange(dateFrom, dateTo);
      setSupervisorTasks(tasks);
    } else if (activeReportTab === 'supervisors') {
      const reps = await getSupervisorReportsByDateRange(dateFrom, dateTo);
      setSupervisorReports(reps);
    } else if (activeReportTab === 'customers') {
      const custs = await getCustomers();
      const filteredCusts = custs.filter(c => {
        if (!c.createdAt) return true;
        const cDate = c.createdAt.split('T')[0];
        return cDate >= dateFrom && cDate <= dateTo;
      });
      setCustomers(filteredCusts);
    } else if (activeReportTab === 'stock') {"""
content = content.replace(fetch_replace, fetch_new)

# 6. printableRows list switch
list_replace = """    const list = activeReportTab === 'sales'
      ? salesOrders
      : activeReportTab === 'production'
        ? productionOrders
        : activeReportTab === 'delivery'
          ? deliveryMissions
          : activeReportTab === 'stock'
            ? stockItems
            : reports;"""

list_new = """    const hrCombined = [...hrAttendance.map(a => ({...a, source: 'حضور/انصراف'})), ...hrViolations.map(v => ({...v, source: 'مخالفة'}))];
    hrCombined.sort((a,b) => new Date(b.date) - new Date(a.date));

    const list = activeReportTab === 'sales'
      ? salesOrders
      : activeReportTab === 'production'
        ? productionOrders
        : activeReportTab === 'delivery'
          ? deliveryMissions
          : activeReportTab === 'stock'
            ? stockItems
            : activeReportTab === 'hr'
              ? hrCombined
              : activeReportTab === 'tasks'
                ? supervisorTasks
                : activeReportTab === 'supervisors'
                  ? supervisorReports
                  : activeReportTab === 'customers'
                    ? customers
                    : reports;"""
content = content.replace(list_replace, list_new)

# 7. Print Meta Summary length calculation
summary_replace = """  const printMetaSummary = activeReportTab === 'employees'
    ? `${reports.length} تقييم موظف`
    : activeReportTab === 'sales'
      ? `${salesOrders.length} طلبية مبيعات`
      : activeReportTab === 'production'
        ? `${productionOrders.length} طلب إنتاج`
        : activeReportTab === 'stock'
          ? `${stockItems.length} عنصر في المخزون`
          : activeReportTab === 'delivery'
            ? `${deliveryMissions.length} مهمة توصيل`
            : '';"""

summary_new = """  const hrCombinedLen = hrAttendance.length + hrViolations.length;
  const printMetaSummary = activeReportTab === 'employees'
    ? `${reports.length} تقييم موظف`
    : activeReportTab === 'sales'
      ? `${salesOrders.length} طلبية مبيعات`
      : activeReportTab === 'production'
        ? `${productionOrders.length} طلب إنتاج`
        : activeReportTab === 'stock'
          ? `${stockItems.length} عنصر في المخزون`
          : activeReportTab === 'delivery'
            ? `${deliveryMissions.length} مهمة توصيل`
            : activeReportTab === 'hr'
              ? `${hrCombinedLen} سجل موارد بشرية`
              : activeReportTab === 'tasks'
                ? `${supervisorTasks.length} مهمة`
                : activeReportTab === 'supervisors'
                  ? `${supervisorReports.length} تقرير مشرف`
                  : activeReportTab === 'customers'
                    ? `${customers.length} عميل`
                    : '';"""
content = content.replace(summary_replace, summary_new)

# 8. Add tabs to the UI
tabs_replace = """        <button
          className={`premium-tab ${activeReportTab === 'stock' ? 'premium-tab-active' : 'premium-tab-inactive'}`}
          onClick={() => handleTabChange('stock')}
        >
          <Package size={20} />
          <span>تقارير المخزون</span>
        </button>
      </div>"""

tabs_new = """        <button
          className={`premium-tab ${activeReportTab === 'stock' ? 'premium-tab-active' : 'premium-tab-inactive'}`}
          onClick={() => handleTabChange('stock')}
        >
          <Package size={20} />
          <span>تقارير المخزون</span>
        </button>
        <button
          className={`premium-tab ${activeReportTab === 'hr' ? 'premium-tab-active' : 'premium-tab-inactive'}`}
          onClick={() => handleTabChange('hr')}
        >
          <UserCheck size={20} />
          <span>تقارير الموارد البشرية</span>
        </button>
        <button
          className={`premium-tab ${activeReportTab === 'tasks' ? 'premium-tab-active' : 'premium-tab-inactive'}`}
          onClick={() => handleTabChange('tasks')}
        >
          <ClipboardList size={20} />
          <span>تقارير المهام</span>
        </button>
        <button
          className={`premium-tab ${activeReportTab === 'supervisors' ? 'premium-tab-active' : 'premium-tab-inactive'}`}
          onClick={() => handleTabChange('supervisors')}
        >
          <FileText size={20} />
          <span>تقارير المشرفين</span>
        </button>
        <button
          className={`premium-tab ${activeReportTab === 'customers' ? 'premium-tab-active' : 'premium-tab-inactive'}`}
          onClick={() => handleTabChange('customers')}
        >
          <Building2 size={20} />
          <span>تقرير العملاء</span>
        </button>
      </div>"""
content = content.replace(tabs_replace, tabs_new)

# 9. Add print headers logic
# We need to add the headers for the 4 new tabs
# Let's find:
#                               {activeReportTab === 'employees'
#                                 ? 'تقرير أداء الموظفين'
#                                 : activeReportTab === 'sales'
#                                   ? 'تقرير المبيعات والطلبيات'
#                                   : activeReportTab === 'production'
#                                     ? 'تقرير الإنتاج'
#                                     : activeReportTab === 'delivery'
#                                       ? 'تقرير مهام التوصيل'
#                                       : activeReportTab === 'stock'
#                                         ? 'تقرير المخزون العام'
#                                         : 'التقرير الشامل'}
title_replace = """                              {activeReportTab === 'employees'
                                ? 'تقرير أداء الموظفين'
                                : activeReportTab === 'sales'
                                  ? 'تقرير المبيعات والطلبيات'
                                  : activeReportTab === 'production'
                                    ? 'تقرير الإنتاج'
                                    : activeReportTab === 'delivery'
                                      ? 'تقرير مهام التوصيل'
                                      : activeReportTab === 'stock'
                                        ? 'تقرير المخزون العام'
                                        : 'التقرير الشامل'}"""

title_new = """                              {activeReportTab === 'employees'
                                ? 'تقرير أداء الموظفين'
                                : activeReportTab === 'sales'
                                  ? 'تقرير المبيعات والطلبيات'
                                  : activeReportTab === 'production'
                                    ? 'تقرير الإنتاج'
                                    : activeReportTab === 'delivery'
                                      ? 'تقرير مهام التوصيل'
                                      : activeReportTab === 'stock'
                                        ? 'تقرير المخزون العام'
                                        : activeReportTab === 'hr'
                                          ? 'تقرير الموارد البشرية'
                                          : activeReportTab === 'tasks'
                                            ? 'تقرير إدارة المهام'
                                            : activeReportTab === 'supervisors'
                                              ? 'تقرير المشرفين'
                                              : activeReportTab === 'customers'
                                                ? 'تقرير العملاء'
                                                : 'التقرير الشامل'}"""
content = content.replace(title_replace, title_new)

# 10. Add print table headers for new tabs
headers_replace = """                  {activeReportTab === 'stock' && (
                    <React.Fragment>
                      {activePrintColumns.includes('itemNumber') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>رقم الصنف</th>}
                      {activePrintColumns.includes('name') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>اسم الصنف</th>}
                      {activePrintColumns.includes('variant') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>الموديل/التفصيل</th>}
                      {activePrintColumns.includes('category') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>التصنيف</th>}
                      {activePrintColumns.includes('warehouse') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>المستودع</th>}
                      {activePrintColumns.includes('quantity') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>الكمية</th>}
                      {activePrintColumns.includes('unit') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>الوحدة</th>}
                      {activePrintColumns.includes('status') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>الحالة</th>}
                    </React.Fragment>
                  )}"""

headers_new = """                  {activeReportTab === 'stock' && (
                    <React.Fragment>
                      {activePrintColumns.includes('itemNumber') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>رقم الصنف</th>}
                      {activePrintColumns.includes('name') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>اسم الصنف</th>}
                      {activePrintColumns.includes('variant') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>الموديل/التفصيل</th>}
                      {activePrintColumns.includes('category') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>التصنيف</th>}
                      {activePrintColumns.includes('warehouse') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>المستودع</th>}
                      {activePrintColumns.includes('quantity') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>الكمية</th>}
                      {activePrintColumns.includes('unit') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>الوحدة</th>}
                      {activePrintColumns.includes('status') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>الحالة</th>}
                    </React.Fragment>
                  )}
                  {activeReportTab === 'hr' && (
                    <React.Fragment>
                      {activePrintColumns.includes('date') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>التاريخ</th>}
                      {activePrintColumns.includes('employeeName') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>الموظف</th>}
                      {activePrintColumns.includes('type') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>النوع</th>}
                      {activePrintColumns.includes('details') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>التفاصيل</th>}
                    </React.Fragment>
                  )}
                  {activeReportTab === 'tasks' && (
                    <React.Fragment>
                      {activePrintColumns.includes('createdAt') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>التاريخ</th>}
                      {activePrintColumns.includes('supervisorName') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>المشرف</th>}
                      {activePrintColumns.includes('title') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>المهمة</th>}
                      {activePrintColumns.includes('dueDate') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>موعد التسليم</th>}
                      {activePrintColumns.includes('status') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>الحالة</th>}
                    </React.Fragment>
                  )}
                  {activeReportTab === 'supervisors' && (
                    <React.Fragment>
                      {activePrintColumns.includes('date') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>التاريخ</th>}
                      {activePrintColumns.includes('supervisorName') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>المشرف</th>}
                      {activePrintColumns.includes('type') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>النوع</th>}
                      {activePrintColumns.includes('content') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>المحتوى</th>}
                    </React.Fragment>
                  )}
                  {activeReportTab === 'customers' && (
                    <React.Fragment>
                      {activePrintColumns.includes('name') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>الاسم</th>}
                      {activePrintColumns.includes('phone') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>الهاتف</th>}
                      {activePrintColumns.includes('location') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>الموقع</th>}
                      {activePrintColumns.includes('status') && <th style={{ border: '1px solid #ccc', padding: '0.4rem', backgroundColor: '#f1f5f9' }}>الحالة</th>}
                    </React.Fragment>
                  )}"""
content = content.replace(headers_replace, headers_new)

# 11. Print Rows render
print_rows_replace = """                      ) : activeReportTab === 'stock' ? (
                        <React.Fragment>
                          {activePrintColumns.includes('itemNumber') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{row.itemNumber || '---'}</td>}
                          {activePrintColumns.includes('name') && <td style={{ border: '1px solid #ccc', padding: '0.4rem', fontWeight: 'bold' }}>{row.name}</td>}
                          {activePrintColumns.includes('variant') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{getStockVariantLabel(row)}</td>}
                          {activePrintColumns.includes('category') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{row.category || '---'}</td>}
                          {activePrintColumns.includes('warehouse') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{row.warehouse || '---'}</td>}
                          {activePrintColumns.includes('quantity') && <td style={{ border: '1px solid #ccc', padding: '0.4rem', fontWeight: 'bold' }}>{row.quantity || 0}</td>}
                          {activePrintColumns.includes('unit') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{row.unit || '---'}</td>}
                          {activePrintColumns.includes('status') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{getStockItemStatus(row)}</td>}
                        </React.Fragment>
                      ) : null}"""

print_rows_new = """                      ) : activeReportTab === 'stock' ? (
                        <React.Fragment>
                          {activePrintColumns.includes('itemNumber') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{row.itemNumber || '---'}</td>}
                          {activePrintColumns.includes('name') && <td style={{ border: '1px solid #ccc', padding: '0.4rem', fontWeight: 'bold' }}>{row.name}</td>}
                          {activePrintColumns.includes('variant') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{getStockVariantLabel(row)}</td>}
                          {activePrintColumns.includes('category') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{row.category || '---'}</td>}
                          {activePrintColumns.includes('warehouse') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{row.warehouse || '---'}</td>}
                          {activePrintColumns.includes('quantity') && <td style={{ border: '1px solid #ccc', padding: '0.4rem', fontWeight: 'bold' }}>{row.quantity || 0}</td>}
                          {activePrintColumns.includes('unit') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{row.unit || '---'}</td>}
                          {activePrintColumns.includes('status') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{getStockItemStatus(row)}</td>}
                        </React.Fragment>
                      ) : activeReportTab === 'hr' ? (
                        <React.Fragment>
                          {activePrintColumns.includes('date') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{row.date}</td>}
                          {activePrintColumns.includes('employeeName') && <td style={{ border: '1px solid #ccc', padding: '0.4rem', fontWeight: 'bold' }}>{row.employeeName || row.employeeId}</td>}
                          {activePrintColumns.includes('type') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{row.source === 'حضور/انصراف' ? (row.type === 'check_in' ? 'حضور' : 'انصراف') : 'مخالفة'}</td>}
                          {activePrintColumns.includes('details') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{row.source === 'حضور/انصراف' ? (row.type === 'check_in' ? 'وقت الحضور: ' + row.timeIn : 'وقت الانصراف: ' + row.timeOut) : row.reason}</td>}
                        </React.Fragment>
                      ) : activeReportTab === 'tasks' ? (
                        <React.Fragment>
                          {activePrintColumns.includes('createdAt') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{row.createdAt?.split('T')[0] || '---'}</td>}
                          {activePrintColumns.includes('supervisorName') && <td style={{ border: '1px solid #ccc', padding: '0.4rem', fontWeight: 'bold' }}>{row.supervisorName || row.supervisorId}</td>}
                          {activePrintColumns.includes('title') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{row.title}</td>}
                          {activePrintColumns.includes('dueDate') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{row.dueDate || '---'}</td>}
                          {activePrintColumns.includes('status') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{row.status || 'قيد التنفيذ'}</td>}
                        </React.Fragment>
                      ) : activeReportTab === 'supervisors' ? (
                        <React.Fragment>
                          {activePrintColumns.includes('date') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{row.date}</td>}
                          {activePrintColumns.includes('supervisorName') && <td style={{ border: '1px solid #ccc', padding: '0.4rem', fontWeight: 'bold' }}>{row.supervisorName || row.supervisorId}</td>}
                          {activePrintColumns.includes('type') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{row.type}</td>}
                          {activePrintColumns.includes('content') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{row.content}</td>}
                        </React.Fragment>
                      ) : activeReportTab === 'customers' ? (
                        <React.Fragment>
                          {activePrintColumns.includes('name') && <td style={{ border: '1px solid #ccc', padding: '0.4rem', fontWeight: 'bold' }}>{row.name}</td>}
                          {activePrintColumns.includes('phone') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{row.phone}</td>}
                          {activePrintColumns.includes('location') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{row.location || '---'}</td>}
                          {activePrintColumns.includes('status') && <td style={{ border: '1px solid #ccc', padding: '0.4rem' }}>{row.status || 'نشط'}</td>}
                        </React.Fragment>
                      ) : null}"""
content = content.replace(print_rows_replace, print_rows_new)

with open('src/pages/admin/AdminReports.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
