import re

def update_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
        else:
            print(f"WARNING: String not found in {filepath}:\n{old[:100]}...")
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

old_options = """  const employeeNameOptions = [...employees]
    .sort((a,b)=>String(a.name).localeCompare(String(b.name)))
    .map(emp => ({ value: emp.id, label: `اسم الموظف: ${emp.name}` }));
    
  const employeeIdOptions = [...employees]
    .sort((a,b)=>(parseInt(a.id) || 0) - (parseInt(b.id) || 0))
    .map(emp => ({ value: emp.id, label: `الرقم الوظيفي: ${emp.id}` }));"""

new_options = """  const employeeNameOptions = [...employees]
    .sort((a,b)=>String(a.name).localeCompare(String(b.name)))
    .map(emp => ({ value: emp.id, label: emp.name }));
    
  const employeeIdOptions = [...employees]
    .sort((a,b)=>(parseInt(a.id) || 0) - (parseInt(b.id) || 0))
    .map(emp => ({ value: emp.id, label: String(emp.id) }));"""


old_selects = """            <div className="flex-1 flex gap-4 items-center">
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
            </div>"""

new_selects = """            <div className="flex-1 flex gap-6 items-center">
              <Search color="#94a3b8" size={20} className="shrink-0" />
              
              <div className="flex items-center gap-2 w-[280px] shrink-0">
                <span className="text-sm font-bold text-slate-600 whitespace-nowrap">الرقم الوظيفي:</span>
                <div className="flex-1">
                  <Select 
                    options={employeeIdOptions}
                    value={employeeIdOptions.find(opt => opt.value === selectedEmployeeId) || null}
                    onChange={(selected) => setSelectedEmployeeId(selected ? selected.value : '')}
                    styles={customSelectStyles}
                    placeholder="اختر الرقم..."
                    isSearchable={true}
                    noOptionsMessage={() => "لا يوجد رقم وظيفي"}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm font-bold text-slate-600 whitespace-nowrap">اسم الموظف:</span>
                <div className="flex-1">
                  <Select 
                    options={employeeNameOptions}
                    value={employeeNameOptions.find(opt => opt.value === selectedEmployeeId) || null}
                    onChange={(selected) => setSelectedEmployeeId(selected ? selected.value : '')}
                    styles={customSelectStyles}
                    placeholder="اختر الاسم..."
                    isSearchable={true}
                    noOptionsMessage={() => "لا يوجد موظف بهذا الاسم"}
                  />
                </div>
              </div>
            </div>"""

update_file('src/pages/hr/HRSalaryReports.jsx', [(old_options, new_options), (old_selects, new_selects)])
