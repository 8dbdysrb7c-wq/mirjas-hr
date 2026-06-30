import sys
import re

file_path = 'src/pages/admin/AdminReports.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import if missing
if "import HRSalaryReports from '../hr/HRSalaryReports';" not in content:
    content = content.replace("import AdminSidebar from '../../components/AdminSidebar';", "import AdminSidebar from '../../components/AdminSidebar';\nimport HRSalaryReports from '../hr/HRSalaryReports';")

# We want to find the end of the tabs rendering block.
# Usually it looks like:
#             ))}
#           </div>
# 
#           <div className="reports-filters-card mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
# 
# We'll use regex to find `<div className="reports-filters-card mb-6 animate-slide-up"` and prepend our conditional logic.

pattern = r'(<div className="reports-filters-card mb-6 animate-slide-up")'
replacement = r'{activeReportTab === \'hr\' ? (\n          <HRSalaryReports user={user} isNested={true} />\n        ) : (\n          <>\n            \1'

# We also need to close the `</>` fragment at the end of the `admin-content` div.
# Looking at the end of the file:
#       </div>
#     </div>
#   );
# };
# export default AdminReports;

pattern_end = r'(      </div>\n    </div>\n  \);\n};)'
replacement_end = r'          </>\n        )}\n\1'

if "{activeReportTab === 'hr' ? (" not in content:
    content = re.sub(pattern, replacement, content, 1)
    content = re.sub(pattern_end, replacement_end, content, 1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
