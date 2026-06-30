import re

with open('src/pages/hr/HRSalaryReports.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update options definition
options_old = """  const employeeOptions = [...employees]
    .sort((a,b)=>String(a.name).localeCompare(String(b.name)))
    .map(emp => ({ value: emp.id, label: `${emp.name} (رقم: ${emp.id})` }));"""

options_new = """  const employeeNameOptions = [...employees]
    .sort((a,b)=>String(a.name).localeCompare(String(b.name)))
    .map(emp => ({ value: emp.id, label: emp.name }));
    
  const employeeIdOptions = [...employees]
    .sort((a,b)=>(parseInt(a.id) || 0) - (parseInt(b.id) || 0))
    .map(emp => ({ value: emp.id, label: String(emp.id) }));"""

content = content.replace(options_old, options_new)

# 2. Update the Select rendering
select_old = """          {activeReportTab === 'slip' ? (
            <>
              <Search color="#94a3b8" size={20} />
              <Select 
                options={employeeOptions}
                value={employeeOptions.find(opt => opt.value === selectedEmployeeId) || null}
                onChange={(selected) => setSelectedEmployeeId(selected ? selected.value : '')}
                styles={customSelectStyles}
                placeholder="اختر الموظف..."
                isSearchable={true}
                noOptionsMessage={() => "لا يوجد موظف بهذا الاسم"}
                className="flex-1"
              />
            </>
          ) : ("""

select_new = """          {activeReportTab === 'slip' ? (
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

content = content.replace(select_old, select_new)

with open('src/pages/hr/HRSalaryReports.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
