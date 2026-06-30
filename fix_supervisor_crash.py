import re

filepath = r"c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\admin\AdminSupervisorReports.jsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add missing imports
if 'ArrowUp,' not in content and 'ArrowUp ' not in content:
    content = content.replace('ArrowUpDown}', 'ArrowUpDown, ArrowUp, ArrowDown}')

# 2. Add sorting logic to visibleReports
# Find where visibleReports is defined:
# const visibleReports = reports.filter(report => {
# ...
#   return matchesDate;
# });
# We need to change it to:
# const filteredReports = reports.filter(...)
# const visibleReports = getSortedData(filteredReports)

get_sorted_data_func = """
  const getSortedData = (data) => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      let valueA = a[sortConfig.key];
      let valueB = b[sortConfig.key];
      
      // Handle strings
      if (typeof valueA === 'string') valueA = valueA.toLowerCase();
      if (typeof valueB === 'string') valueB = valueB.toLowerCase();
      
      // Date specific handling
      if (sortConfig.key === 'date') {
        const dateA = new Date(valueA || 0).getTime();
        const dateB = new Date(valueB || 0).getTime();
        if (!isNaN(dateA) && !isNaN(dateB)) {
          return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
      }
      
      // Employee evaluations specific
      if (sortConfig.key === 'employeeEvaluations') {
        valueA = a.employeeEvaluations?.length || 0;
        valueB = b.employeeEvaluations?.length || 0;
      }

      if (valueA < valueB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };
"""

# Insert getSortedData before visibleReports
if 'const getSortedData =' not in content:
    content = content.replace('const visibleReports = reports.filter(report => {', get_sorted_data_func + '\n  const filteredReports = reports.filter(report => {')
    content = content.replace('  const getStatusColor = (statusName) => {', '  const visibleReports = getSortedData(filteredReports);\n\n  const getStatusColor = (statusName) => {')

    # If getStatusColor is not immediately after the filter, let's just replace the end of the filter.
    # The filter ends with:
    #     return matchesDate;
    #   });
    # We replace it with:
    #     return matchesDate;
    #   });
    #   const visibleReports = getSortedData(filteredReports);
    
    # Actually let's use regex to find the end of the filter
    content = re.sub(r'(const filteredReports = reports\.filter\(report => \{.*?return matchesDate;\n\s*\}\);)', r'\1\n  const visibleReports = getSortedData(filteredReports);', content, flags=re.DOTALL)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed AdminSupervisorReports.jsx")
