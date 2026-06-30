import sys

file_path = 'src/pages/admin/AdminReports.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import if missing
if "import HRSalaryReports" not in content:
    content = content.replace("import React,", "import React,\nimport HRSalaryReports from '../hr/HRSalaryReports';\n", 1)
    if "import HRSalaryReports" not in content: # Fallback
        content = "import HRSalaryReports from '../hr/HRSalaryReports';\n" + content

# 2. Inject conditional rendering
if "{activeReportTab === 'hr' ? (" not in content:
    content = content.replace("{/* Print Portals */}", "{activeReportTab === 'hr' ? (<HRSalaryReports user={user} isNested={true} />) : (<>\n      {/* Print Portals */}")
    
    content = content.replace("<style dangerouslySetInnerHTML", "</>\n      )}\n      <style dangerouslySetInnerHTML")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
