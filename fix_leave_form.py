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

old_leave_form = """  const [leaveFormData, setLeaveFormData] = useState({
    type: 'إجازة سنوية', startDate: '', endDate: '', duration: '', notes: '', status: 'معلق'
  });"""
new_leave_form = """  const [leaveFormData, setLeaveFormData] = useState({
    type: 'إجازة سنوية', startDate: '', endDate: '', notes: '', status: 'معلق'
  });"""

update_file('src/pages/EmployeeDashboard.jsx', [
    (old_leave_form, new_leave_form)
])
