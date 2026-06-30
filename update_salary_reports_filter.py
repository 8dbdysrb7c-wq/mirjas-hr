import sys
import re

file_path = r"c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\hr\HRSalaryReports.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Insert filteredSheetSalaryData
if "const filteredSheetSalaryData" not in content:
    replacement_data = """  const selectedEmployeeData = salaryData.find(e => e.id === selectedEmployeeId);

  const filteredSheetSalaryData = salaryData
    .filter(emp => selectedDepartment === 'all' || emp.department === departments[selectedDepartment] || emp.department === selectedDepartment)
    .filter(emp => archiveSearch ? emp.id === archiveSearch : true);
"""
    content = content.replace("  const selectedEmployeeData = salaryData.find(e => e.id === selectedEmployeeId);", replacement_data)

# 2. Update the sheet table to use filteredSheetSalaryData instead of salaryData.filter(...)
# We want to replace exactly this in the activeReportTab === 'sheet' section:
# {salaryData
#   .filter(emp => selectedDepartment === 'all' || emp.department === departments[selectedDepartment] || emp.department === selectedDepartment)
pattern_table_filter = re.compile(
    r"\{salaryData\s*\n\s*\.filter\(emp => selectedDepartment === 'all' \|\| emp\.department === departments\[selectedDepartment\] \|\| emp\.department === selectedDepartment\)"
)

content = pattern_table_filter.sub("{filteredSheetSalaryData", content)

# 3. Add the filter UI for activeReportTab === 'sheet'
# We'll look for:
#           ) : activeReportTab === 'missing-punches' || activeReportTab === 'advances' || activeReportTab === 'leaves' || activeReportTab === 'overtime' || activeReportTab === 'attendance' || activeReportTab === 'violations-bonuses' ? (
# And insert the sheet condition before it.
sheet_filter_ui = """          ) : activeReportTab === 'sheet' ? (
            <div className="flex-1 flex gap-4 items-center">
              <Search color="#94a3b8" size={20} className="shrink-0 ml-2" />

              <div className="flex items-center gap-3 min-w-[200px]">
                <span className="text-sm font-bold text-slate-600 whitespace-nowrap">الرقم الوظيفي:</span>
                <div className="w-28">
                  <Select
                    options={employeeIdOptions}
                    value={employeeIdOptions.find(opt => opt.value === archiveSearch) || null}
                    onChange={(selected) => setArchiveSearch(selected ? selected.value : '')}
                    styles={customSelectStyles}
                    placeholder="الكل"
                    isSearchable={true}
                    isClearable={true}
                    noOptionsMessage={() => "لا يوجد رقم"}
                  />
                </div>
              </div>

              <div className="w-px h-8 bg-slate-200 mr-4 ml-10 shrink-0"></div>

              <div className="flex items-center gap-3 flex-1">
                <span className="text-sm font-bold text-slate-600 whitespace-nowrap">اسم الموظف:</span>
                <div className="flex-1 min-w-[280px]">
                  <Select
                    options={employeeNameOptions}
                    value={employeeNameOptions.find(opt => opt.value === archiveSearch) || null}
                    onChange={(selected) => setArchiveSearch(selected ? selected.value : '')}
                    styles={customSelectStyles}
                    placeholder="جميع الموظفين..."
                    isSearchable={true}
                    isClearable={true}
                    noOptionsMessage={() => "لا يوجد موظف بهذا الاسم"}
                  />
                </div>
              </div>
              
              <div className="w-px h-8 bg-slate-200 mr-4 ml-4 shrink-0"></div>
              
              <div className="flex items-center gap-2">
                <Briefcase color="#94a3b8" size={18} />
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '1rem', color: '#1e293b', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  <option value="all">جميع الأقسام</option>
                  {Object.entries(departments).map(([key, name]) => (
                    <option key={key} value={key}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : activeReportTab === 'missing-punches'"""

content = content.replace("          ) : activeReportTab === 'missing-punches'", sheet_filter_ui)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done updating HRSalaryReports.jsx!")
