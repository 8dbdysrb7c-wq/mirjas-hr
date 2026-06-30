import re

with open('src/pages/hr/HRSalaryReports.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Update Options
options_old = """  const employeeNameOptions = [...employees]
    .sort((a,b)=>String(a.name).localeCompare(String(b.name)))
    .map(emp => ({ value: emp.id, label: emp.name }));
    
  const employeeIdOptions = [...employees]
    .sort((a,b)=>(parseInt(a.id) || 0) - (parseInt(b.id) || 0))
    .map(emp => ({ value: emp.id, label: String(emp.id) }));"""

options_new = """  const employeeNameOptions = [...employees]
    .sort((a,b)=>String(a.name).localeCompare(String(b.name)))
    .map(emp => ({ value: emp.id, label: `اسم الموظف: ${emp.name}` }));
    
  const employeeIdOptions = [...employees]
    .sort((a,b)=>(parseInt(a.id) || 0) - (parseInt(b.id) || 0))
    .map(emp => ({ value: emp.id, label: `الرقم الوظيفي: ${emp.id}` }));"""

content = content.replace(options_old, options_new)

# Update DOM elements (Swap their order)
select_old = """          {activeReportTab === 'slip' ? (
            <div className="flex-1 flex gap-4 items-center">
              <Search color="#94a3b8" size={20} className="shrink-0" />
              <div className="flex-1">
                <Select 
                  options={employeeNameOptions}
                  value={employeeNameOptions.find(opt => opt.value === selectedEmployeeId) || null}
                  onChange={(selected) => setSelectedEmployeeId(selected ? selected.value : '')}
                  styles={customSelectStyles}
                  placeholder="ابحث باسم الموظف..."
                  isSearchable={true}
                  noOptionsMessage={() => "لا يوجد موظف بهذا الاسم"}
                />
              </div>
              <div className="w-48 shrink-0">
                <Select 
                  options={employeeIdOptions}
                  value={employeeIdOptions.find(opt => opt.value === selectedEmployeeId) || null}
                  onChange={(selected) => setSelectedEmployeeId(selected ? selected.value : '')}
                  styles={customSelectStyles}
                  placeholder="ابحث بالرقم الوظيفي..."
                  isSearchable={true}
                  noOptionsMessage={() => "لا يوجد رقم وظيفي"}
                />
              </div>
            </div>
          ) : ("""

select_new = """          {activeReportTab === 'slip' ? (
            <div className="flex-1 flex gap-4 items-center">
              <Search color="#94a3b8" size={20} className="shrink-0" />
              <div className="w-64 shrink-0">
                <Select 
                  options={employeeIdOptions}
                  value={employeeIdOptions.find(opt => opt.value === selectedEmployeeId) || null}
                  onChange={(selected) => setSelectedEmployeeId(selected ? selected.value : '')}
                  styles={customSelectStyles}
                  placeholder="الرقم الوظيفي..."
                  isSearchable={true}
                  noOptionsMessage={() => "لا يوجد رقم وظيفي"}
                />
              </div>
              <div className="flex-1">
                <Select 
                  options={employeeNameOptions}
                  value={employeeNameOptions.find(opt => opt.value === selectedEmployeeId) || null}
                  onChange={(selected) => setSelectedEmployeeId(selected ? selected.value : '')}
                  styles={customSelectStyles}
                  placeholder="اسم الموظف..."
                  isSearchable={true}
                  noOptionsMessage={() => "لا يوجد موظف بهذا الاسم"}
                />
              </div>
            </div>
          ) : ("""

content = content.replace(select_old, select_new)

with open('src/pages/hr/HRSalaryReports.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
