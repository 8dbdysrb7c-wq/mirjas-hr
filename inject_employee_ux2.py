import os

def replace_in_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
        else:
            print(f"Warning: Could not find snippet in {filepath}: {old[:50]}...")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

admin_path = 'src/pages/admin/AdminReports.jsx'

old_state = """  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedDept, setSelectedDept] = useState('');"""
new_state = """  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedJobDepartment, setSelectedJobDepartment] = useState('');
  const [selectedJobTitle, setSelectedJobTitle] = useState('');"""

old_deps = """  }, [pendingPrint, activeReportTab, printConfigs, selectedEmployee, selectedDept, selectedCustomer, selectedCategory, selectedStatus, dateFrom, dateTo, filterOrderNumber, filterCreatedBy, searchTerm]);"""
new_deps = """  }, [pendingPrint, activeReportTab, printConfigs, selectedEmployee, selectedJobDepartment, selectedJobTitle, selectedCustomer, selectedCategory, selectedStatus, dateFrom, dateTo, filterOrderNumber, filterCreatedBy, searchTerm]);"""

old_missing_punches = """  const filteredMissingPunches = missingPunches.filter(mp => {
    const matchEmp = selectedEmployee ? mp.employeeId === selectedEmployee : true;
    const matchDateFrom = dateFrom ? mp.date >= dateFrom : true;
    const matchDateTo = dateTo ? mp.date <= dateTo : true;
    const matchSearch = searchTerm ? (mp.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) : true;
    return matchEmp && matchDateFrom && matchDateTo && matchSearch;
  });"""
new_missing_punches = """  const filteredMissingPunches = missingPunches.filter(mp => {
    const empObj = employees.find(e => e.id === mp.employeeId || e.name === mp.employeeName);
    const empJobDept = empObj ? (empObj.employeeType || empObj.departmentName) : '';
    const empJobTitle = empObj ? empObj.jobTitle : '';

    const matchEmp = selectedEmployee ? mp.employeeId === selectedEmployee : true;
    const matchJobDept = selectedJobDepartment ? empJobDept === selectedJobDepartment : true;
    const matchJobTitle = selectedJobTitle ? empJobTitle === selectedJobTitle : true;
    const matchDateFrom = dateFrom ? mp.date >= dateFrom : true;
    const matchDateTo = dateTo ? mp.date <= dateTo : true;
    const matchSearch = searchTerm ? (mp.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) : true;
    return matchEmp && matchJobDept && matchJobTitle && matchDateFrom && matchDateTo && matchSearch;
  });"""

old_employees_reports = """  const filteredEmployeesReports = reports.filter(r => {
    if (r.isDeletedByAdmin) return false;
    const matchEmp = selectedEmployee ? r.userId === selectedEmployee : true;
    const matchDept = selectedDept ? (r.department === departments[selectedDept] || (r.tasks && r.tasks.some(t => t.department === selectedDept || t.departmentName === departments[selectedDept]))) : true;
    const matchDateFrom = dateFrom ? r.date >= dateFrom : true;
    const matchDateTo = dateTo ? r.date <= dateTo : true;
    const matchSearch = searchTerm ? (r.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) : true;
    return matchEmp && matchDept && matchDateFrom && matchDateTo && matchSearch;
  });"""
new_employees_reports = """  const filteredEmployeesReports = reports.filter(r => {
    if (r.isDeletedByAdmin) return false;
    const empObj = employees.find(e => e.id === r.userId || e.name === r.userName);
    const empJobDept = empObj ? (empObj.employeeType || empObj.departmentName) : '';
    const empJobTitle = empObj ? empObj.jobTitle : '';

    const matchEmp = selectedEmployee ? r.userId === selectedEmployee : true;
    const matchJobDept = selectedJobDepartment ? empJobDept === selectedJobDepartment : true;
    const matchJobTitle = selectedJobTitle ? empJobTitle === selectedJobTitle : true;
    const matchDateFrom = dateFrom ? r.date >= dateFrom : true;
    const matchDateTo = dateTo ? r.date <= dateTo : true;
    const matchSearch = searchTerm ? (r.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) : true;
    return matchEmp && matchJobDept && matchJobTitle && matchDateFrom && matchDateTo && matchSearch;
  });"""

old_hr_reports = """  const filteredHR = hrCombined.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchSearch = (item.employeeName || '').toLowerCase().includes(term) || (item.employeeId || '').toLowerCase().includes(term) || (item.details || item.reason || '').toLowerCase().includes(term);
    const matchEmp = selectedEmployee ? item.employeeId === selectedEmployee : true;
    return matchSearch && matchEmp;
  });"""
new_hr_reports = """  const filteredHR = hrCombined.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchSearch = (item.employeeName || '').toLowerCase().includes(term) || (item.employeeId || '').toLowerCase().includes(term) || (item.details || item.reason || '').toLowerCase().includes(term);
    const matchEmp = selectedEmployee ? item.employeeId === selectedEmployee : true;

    const empObj = employees.find(e => e.id === item.employeeId || e.name === item.employeeName);
    const empJobDept = empObj ? (empObj.employeeType || empObj.departmentName) : '';
    const empJobTitle = empObj ? empObj.jobTitle : '';
    const matchJobDept = selectedJobDepartment ? empJobDept === selectedJobDepartment : true;
    const matchJobTitle = selectedJobTitle ? empJobTitle === selectedJobTitle : true;

    return matchSearch && matchEmp && matchJobDept && matchJobTitle;
  });"""

old_filter_draft = """    setPrintFilterDraft({
      selectedEmployee,
      selectedDept,
      selectedCustomer,
      selectedCategory,"""
new_filter_draft = """    setPrintFilterDraft({
      selectedEmployee,
      selectedJobDepartment,
      selectedJobTitle,
      selectedCustomer,
      selectedCategory,"""

old_filter_restore = """    setSelectedEmployee(printFilterDraft?.selectedEmployee || '');
    setSelectedDept(printFilterDraft?.selectedDept || '');
    setSelectedCustomer(printFilterDraft?.selectedCustomer || '');"""
new_filter_restore = """    setSelectedEmployee(printFilterDraft?.selectedEmployee || '');
    setSelectedJobDepartment(printFilterDraft?.selectedJobDepartment || '');
    setSelectedJobTitle(printFilterDraft?.selectedJobTitle || '');
    setSelectedCustomer(printFilterDraft?.selectedCustomer || '');"""

old_names = """  const selectedEmpName = selectedEmployee ? employees.find(e => e.id === selectedEmployee)?.name : 'الجميع';
  const selectedDeptName = selectedDept ? departments[selectedDept] : 'جميع المساطر';
  const selectedCustomerName = selectedCustomer ? customers.find(c => c.id === selectedCustomer)?.name : 'جميع العملاء';"""
new_names = """  const selectedEmpName = selectedEmployee ? employees.find(e => e.id === selectedEmployee)?.name : 'الجميع';
  const selectedJobDeptName = selectedJobDepartment ? selectedJobDepartment : 'الجميع';
  const selectedJobTitleName = selectedJobTitle ? selectedJobTitle : 'الجميع';
  const selectedCustomerName = selectedCustomer ? customers.find(c => c.id === selectedCustomer)?.name : 'جميع العملاء';"""

old_doc_subtitles = """  const docSubtitles = activeReportTab === 'employees'
    ? [
      `الموظف: ${selectedEmpName}`,
      `القسم: ${selectedDeptName}`
    ]"""
new_doc_subtitles = """  const docSubtitles = activeReportTab === 'employees'
    ? [
      `الموظف: ${selectedEmpName}`,
      `القسم الوظيفي: ${selectedJobDeptName}`,
      `المسمى الوظيفي: ${selectedJobTitleName}`
    ]"""

old_badge = """              {(selectedEmployee || selectedDept || selectedCustomer || selectedCategory || selectedWarehouse || selectedStatus || (dateFrom && !isDefaultDate) || dateTo || filterOrderNumber || filterCreatedBy) && (
                <span className="badge badge-primary" style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem' }}>نشط</span>
              )}"""
new_badge = """              {(selectedEmployee || selectedJobDepartment || selectedJobTitle || selectedCustomer || selectedCategory || selectedWarehouse || selectedStatus || (dateFrom && !isDefaultDate) || dateTo || filterOrderNumber || filterCreatedBy) && (
                <span className="badge badge-primary" style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem' }}>نشط</span>
              )}"""

old_ui_modal = """                  {activeReportTab === 'employees' && (
                    <div className="input-group">
                      <label>القسم</label>
                      <select className="input-field" value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
                        <option value="">جميع المساطر</option>
                        {Object.entries(departments).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                  )}"""
new_ui_modal = """                  <div className="input-group">
                    <label>القسم الوظيفي</label>
                    <select className="input-field" value={selectedJobDepartment} onChange={(e) => setSelectedJobDepartment(e.target.value)}>
                      <option value="">الجميع</option>
                      {[...new Set(employees.map(emp => emp.employeeType || emp.departmentName).filter(Boolean))].map((dept, idx) => <option key={idx} value={dept}>{dept}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>المسمى الوظيفي</label>
                    <select className="input-field" value={selectedJobTitle} onChange={(e) => setSelectedJobTitle(e.target.value)}>
                      <option value="">الجميع</option>
                      {[...new Set(employees.map(emp => emp.jobTitle).filter(Boolean))].map((title, idx) => <option key={idx} value={title}>{title}</option>)}
                    </select>
                  </div>"""

old_clear_btn = """              <button className="btn-premium-cancel" onClick={() => {
                setSelectedEmployee(''); setSelectedDept(''); setSelectedCustomer(''); setSelectedCategory(''); setSelectedWarehouse(''); setSelectedStatus('');
                
                setDateFrom(''); setDateTo(''); setFilterOrderNumber(''); setFilterCreatedBy(''); setSearchTerm('');
              }}>تفريغ</button>"""
new_clear_btn = """              <button className="btn-premium-cancel" onClick={() => {
                setSelectedEmployee(''); setSelectedJobDepartment(''); setSelectedJobTitle(''); setSelectedCustomer(''); setSelectedCategory(''); setSelectedWarehouse(''); setSelectedStatus('');
                
                setDateFrom(''); setDateTo(''); setFilterOrderNumber(''); setFilterCreatedBy(''); setSearchTerm('');
              }}>تفريغ</button>"""

old_print_filter = """                  <div className="input-group">
                    <label>القسم</label>
                    <select className="input-field" value={printFilterDraft.selectedDept} onChange={(e) => setPrintFilterDraft((current) => ({ ...current, selectedDept: e.target.value }))}>
                      <option value="">جميع المساطر</option>
                      {Object.entries(departments).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
                    </select>
                  </div>"""
new_print_filter = """                  <div className="input-group">
                    <label>القسم الوظيفي</label>
                    <select className="input-field" value={printFilterDraft.selectedJobDepartment} onChange={(e) => setPrintFilterDraft((current) => ({ ...current, selectedJobDepartment: e.target.value }))}>
                      <option value="">الجميع</option>
                      {[...new Set(employees.map(emp => emp.employeeType || emp.departmentName).filter(Boolean))].map((dept, idx) => <option key={idx} value={dept}>{dept}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>المسمى الوظيفي</label>
                    <select className="input-field" value={printFilterDraft.selectedJobTitle} onChange={(e) => setPrintFilterDraft((current) => ({ ...current, selectedJobTitle: e.target.value }))}>
                      <option value="">الجميع</option>
                      {[...new Set(employees.map(emp => emp.jobTitle).filter(Boolean))].map((title, idx) => <option key={idx} value={title}>{title}</option>)}
                    </select>
                  </div>"""

replace_in_file(admin_path, [
    (old_state, new_state),
    (old_deps, new_deps),
    (old_missing_punches, new_missing_punches),
    (old_employees_reports, new_employees_reports),
    (old_hr_reports, new_hr_reports),
    (old_filter_draft, new_filter_draft),
    (old_filter_restore, new_filter_restore),
    (old_names, new_names),
    (old_doc_subtitles, new_doc_subtitles),
    (old_badge, new_badge),
    (old_ui_modal, new_ui_modal),
    (old_clear_btn, new_clear_btn),
    (old_print_filter, new_print_filter)
])
print("Done.")
