import re

# Fix EmployeeDashboard.jsx
with open('src/pages/EmployeeDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_code = """  const allowedLeaveTypes = user?.allowedLeaveTypes || ALL_LEAVE_TYPES;"""
new_code = """  const _allowed = user?.allowedLeaveTypes;
  const allowedLeaveTypes = Array.isArray(_allowed) ? _allowed : (typeof _allowed === 'string' ? [_allowed] : ALL_LEAVE_TYPES);"""

content = content.replace(old_code, new_code)

with open('src/pages/EmployeeDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

# Fix AdminSettings.jsx
with open('src/pages/admin/AdminSettings.jsx', 'r', encoding='utf-8') as f:
    content2 = f.read()

# Fix in toggleLeavePermission
old_toggle = """      const emp = newEmps[index];
      const currentAllowed = emp.allowedLeaveTypes || ALL_LEAVE_TYPES;"""
new_toggle = """      const emp = newEmps[index];
      const _curr = emp.allowedLeaveTypes;
      const currentAllowed = Array.isArray(_curr) ? _curr : (typeof _curr === 'string' ? [_curr] : ALL_LEAVE_TYPES);"""

content2 = content2.replace(old_toggle, new_toggle)

# Fix in render loop
old_render = """                    {employees.map((emp) => {
                      const allowed = emp.allowedLeaveTypes || ALL_LEAVE_TYPES;"""
new_render = """                    {employees.map((emp) => {
                      const _allow = emp.allowedLeaveTypes;
                      const allowed = Array.isArray(_allow) ? _allow : (typeof _allow === 'string' ? [_allow] : ALL_LEAVE_TYPES);"""

content2 = content2.replace(old_render, new_render)

with open('src/pages/admin/AdminSettings.jsx', 'w', encoding='utf-8') as f:
    f.write(content2)
