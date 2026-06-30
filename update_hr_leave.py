import sys

file_path = r"c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\hr\HREmployees.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target1 = "vacationBalance: 14, directManager: '', hrNotes: '',"
replace1 = "vacationBalance: 14, sickLeaveBalance: 14, allowedLeaveTypes: ['إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'], directManager: '', hrNotes: '',"

target2 = "vacationBalance: emp.vacationBalance || 14,"
replace2 = "vacationBalance: emp.vacationBalance || 14, sickLeaveBalance: emp.sickLeaveBalance !== undefined ? emp.sickLeaveBalance : 14, allowedLeaveTypes: emp.allowedLeaveTypes || ['إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'],"

target3 = "basicSalary: '', phone: '', employmentStatus: 'فعال', directManager: '', hrNotes: '', vacationBalance: '14',"
replace3 = "basicSalary: '', phone: '', employmentStatus: 'فعال', directManager: '', hrNotes: '', vacationBalance: '14', sickLeaveBalance: '14', allowedLeaveTypes: ['إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'],"

target_ui = """<div className="input-group">
<label>رصيد الإجازات السنوي</label>
<input type="number" value={formData.vacationBalance} onChange={e=>setFormData({...formData, vacationBalance: e.target.value})} className="input-field" />
</div>"""

replace_ui = """<div className="input-group">
<label>رصيد الإجازات السنوي</label>
<input type="number" value={formData.vacationBalance} onChange={e=>setFormData({...formData, vacationBalance: e.target.value})} className="input-field" />
</div>
<div className="input-group">
<label>رصيد الإجازات المرضية</label>
<input type="number" value={formData.sickLeaveBalance} onChange={e=>setFormData({...formData, sickLeaveBalance: e.target.value})} className="input-field" />
</div>

<div className="input-group" style={{ gridColumn: '1 / -1' }}>
<label>صلاحيات أنواع الإجازة</label>
<div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
{['إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'].map(type => (
  <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
    <input type="checkbox" checked={formData.allowedLeaveTypes?.includes(type)} onChange={(e) => {
      const current = formData.allowedLeaveTypes || [];
      if (e.target.checked) setFormData({...formData, allowedLeaveTypes: [...current, type]});
      else setFormData({...formData, allowedLeaveTypes: current.filter(t => t !== type)});
    }} />
    {type}
  </label>
))}
</div>
</div>"""

if target1 in content:
    content = content.replace(target1, replace1)
if target2 in content:
    content = content.replace(target2, replace2)
if target3 in content:
    content = content.replace(target3, replace3)
if target_ui in content:
    content = content.replace(target_ui, replace_ui)

# Update handleSave to convert vacationBalance to number, we should also convert sickLeaveBalance
target_save = """employeeData.vacationBalance = parseInt(formData.vacationBalance) || 0;"""
replace_save = """employeeData.vacationBalance = parseInt(formData.vacationBalance) || 0;
      employeeData.sickLeaveBalance = parseInt(formData.sickLeaveBalance) || 0;
      employeeData.allowedLeaveTypes = formData.allowedLeaveTypes;"""

if target_save in content:
    content = content.replace(target_save, replace_save)


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("HREmployees.jsx updated")
