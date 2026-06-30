import re

with open('src/pages/admin/AdminReports.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix default dates in useEffect
content = content.replace(
    """    const d = new Date();
    d.setDate(d.getDate() - 10);
    const defaultStart = getLocalDateStr(d);
    
    setDefaultDateFrom(defaultStart);
    setDateFrom(defaultStart);
    setIsDefaultDate(true);

    fetchDynamicData(defaultStart, '');""",
    """    setDefaultDateFrom('');
    setDateFrom('');
    setIsDefaultDate(true);

    fetchDynamicData('', '');"""
)

content = content.replace(
    "نتائج البحث: <strong>{currentResultsCount}</strong> <span className=\"text-muted text-sm font-normal mr-2\">(يتم عرض بيانات آخر 10 أيام افتراضياً. لجلب بيانات أقدم، استخدم الفلتر أعلاه)</span>",
    "نتائج البحث: <strong>{currentResultsCount}</strong>"
)

# 2. Fix Titles & Counts & Subtitles
counts_old = """  const currentResultsCount =
    activeReportTab === 'employees'
      ? filteredEmployeesReports.length
      : activeReportTab === 'sales'
        ? filteredSalesOrders.length
        : activeReportTab === 'production'
          ? filteredProductionOrders.length
          : activeReportTab === 'delivery'
            ? filteredDeliveryMissions.length
            : filteredStockItems.length;"""

counts_new = """  const currentResultsCount =
    activeReportTab === 'employees' ? filteredEmployeesReports.length :
    activeReportTab === 'sales' ? filteredSalesOrders.length :
    activeReportTab === 'production' ? filteredProductionOrders.length :
    activeReportTab === 'delivery' ? filteredDeliveryMissions.length :
    activeReportTab === 'stock' ? filteredStockItems.length :
    activeReportTab === 'hr' ? filteredHR.length :
    activeReportTab === 'missingpunches' ? filteredMissingPunches.length :
    activeReportTab === 'tasks' ? filteredTasks.length :
    activeReportTab === 'supervisors' ? filteredSupervisorReps.length :
    activeReportTab === 'customers' ? filteredCustomersData.length : 0;"""

content = content.replace(counts_old, counts_new)

titles_old = """  const currentReportTitle =
    activeReportTab === 'employees'
      ? 'تقارير الموظفين'
      : activeReportTab === 'sales'
        ? 'تقارير طلبيات العملاء'
        : activeReportTab === 'production'
          ? 'تقارير الإنتاج'
          : activeReportTab === 'delivery'
            ? 'تقارير التوصيل'
            : 'تقارير المخزون';"""

titles_new = """  const currentReportTitle =
    activeReportTab === 'employees' ? 'تقارير الموظفين' :
    activeReportTab === 'sales' ? 'تقارير طلبيات العملاء' :
    activeReportTab === 'production' ? 'تقارير الإنتاج' :
    activeReportTab === 'delivery' ? 'تقارير التوصيل' :
    activeReportTab === 'stock' ? 'تقارير المخزون' :
    activeReportTab === 'hr' ? 'تقارير الموارد البشرية' :
    activeReportTab === 'missingpunches' ? 'تقارير الختمات الناقصة' :
    activeReportTab === 'tasks' ? 'تقارير إدارة المهام' :
    activeReportTab === 'supervisors' ? 'تقارير المشرفين' :
    activeReportTab === 'customers' ? 'تقارير العملاء' : 'التقارير';"""

content = content.replace(titles_old, titles_new)

subtitles_old = """  const currentReportSubtitle =
    activeReportTab === 'employees'
      ? 'عرض التقارير اليومية وتقييم الأداء بنفس تنسيق الجداول في الأقسام.'
      : activeReportTab === 'sales'
        ? 'متابعة طلبيات العملاء داخل جدول واضح وسهل القراءة.'
        : activeReportTab === 'production'
          ? 'متابعة أوامر الإنتاج وحالتها ضمن عرض منظم ومباشر.'
          : activeReportTab === 'delivery'
            ? 'متابعة مهمات التوصيل والجهات والحالات ضمن جدول واضح.'
            : 'متابعة حركة المخزون وحالة الأصناف ضمن عرض منظم ومباشر.';"""

subtitles_new = """  const currentReportSubtitle =
    activeReportTab === 'employees' ? 'عرض التقارير اليومية وتقييم الأداء بنفس تنسيق الجداول في الأقسام.' :
    activeReportTab === 'sales' ? 'متابعة طلبيات العملاء داخل جدول واضح وسهل القراءة.' :
    activeReportTab === 'production' ? 'متابعة أوامر الإنتاج وحالتها ضمن عرض منظم ومباشر.' :
    activeReportTab === 'delivery' ? 'متابعة مهمات التوصيل والجهات والحالات ضمن جدول واضح.' :
    activeReportTab === 'stock' ? 'متابعة حركة المخزون وحالة الأصناف ضمن عرض منظم ومباشر.' :
    activeReportTab === 'hr' ? 'متابعة الحضور والمخالفات للموظفين.' :
    activeReportTab === 'missingpunches' ? 'متابعة طلبات الختمات الناقصة والموافقة عليها.' :
    activeReportTab === 'tasks' ? 'متابعة المهام الموكلة للمشرفين.' :
    activeReportTab === 'supervisors' ? 'تقارير أداء المشرفين اليومية.' :
    activeReportTab === 'customers' ? 'قائمة العملاء وأرصدتهم.' : '';"""

content = content.replace(subtitles_old, subtitles_new)

# 3. Add buttons to HR section header
hr_buttons = """              {activeReportTab === 'hr' && (
                <div className="flex gap-4 mb-6 mt-4">
                  <button onClick={() => window.location.hash = '#/admin/salary-reports'} className="btn btn-outline flex items-center gap-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors">
                    <FileText size={18} /> الرواتب وكشف الموظفين
                  </button>
                  <button onClick={() => window.location.hash = '#/admin/salary-reports'} className="btn btn-outline flex items-center gap-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors">
                    <ClipboardList size={18} /> قسيمة الراتب
                  </button>
                  <button className="btn btn-primary flex items-center gap-2 cursor-default">
                    <UserCheck size={18} /> تقرير الدوام والمخالفات
                  </button>
                </div>
              )}"""

content = content.replace(
    "{activeReportTab === 'employees' && selectedEmployee && (",
    hr_buttons + "\n              {activeReportTab === 'employees' && selectedEmployee && ("
)

# 4. Fix Filter Modal for HR / Tasks / Supervisors / MissingPunches
filter_modal_old = """              {activeReportTab === 'employees' ? (
                <>
                  <div className="input-group">
                    <label>الموظف</label>
                    <select className="input-field" value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
                      <option value="">جميع الموظفين</option>
                      {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>القسم</label>
                    <select className="input-field" value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
                      <option value="">جميع المساطر</option>
                      {Object.entries(departments).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </>
              ) : ("""

filter_modal_new = """              {['employees', 'hr', 'missingpunches'].includes(activeReportTab) ? (
                <>
                  <div className="input-group">
                    <label>الموظف</label>
                    <select className="input-field" value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
                      <option value="">جميع الموظفين</option>
                      {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                    </select>
                  </div>
                  {activeReportTab === 'employees' && (
                    <div className="input-group">
                      <label>القسم</label>
                      <select className="input-field" value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
                        <option value="">جميع المساطر</option>
                        {Object.entries(departments).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                  )}
                </>
              ) : ['tasks', 'supervisors'].includes(activeReportTab) ? (
                <>
                  <div className="input-group">
                    <label>المشرف</label>
                    <select className="input-field" value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
                      <option value="">جميع المشرفين</option>
                      {[...new Set([...supervisorTasks.map(t=>t.supervisorName), ...supervisorReports.map(r=>r.supervisorName)].filter(Boolean))].map((name, i) => <option key={i} value={name}>{name}</option>)}
                    </select>
                  </div>
                  {activeReportTab === 'tasks' && (
                    <div className="input-group">
                      <label>الحالة</label>
                      <select className="input-field" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                        <option value="">جميع الحالات</option>
                        <option value="قيد التنفيذ">قيد التنفيذ</option>
                        <option value="مكتملة">مكتملة</option>
                      </select>
                    </div>
                  )}
                </>
              ) : ("""

content = content.replace(filter_modal_old, filter_modal_new)

with open('src/pages/admin/AdminReports.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
