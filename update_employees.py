import sys
import re

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\admin\AdminEmployees.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update initialData for Edit
content = content.replace(
    "allowedLeaveTypes: emp.allowedLeaveTypes || ['إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'],",
    "allowedLeaveTypes: emp.allowedLeaveTypes || ['إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'],\n      allowedMissingPunches: emp.allowedMissingPunches !== undefined ? emp.allowedMissingPunches : 0,"
)

# 2. Update initialData for New
content = content.replace(
    "allowedLeaveTypes: ['إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'],\n      directManager: '',",
    "allowedLeaveTypes: ['إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'],\n      allowedMissingPunches: 0,\n      directManager: '',"
)

# 3. Add input field to the HTML
html_field = """<div class="col-span-4 premium-form-group">
              <label>الختمات الناقصة المسموحة</label>
              <input id="swal-missing-punches" type="number" class="premium-input" placeholder="عدد الختمات" value="${initialData.allowedMissingPunches}">
              <p class="text-xs text-muted mt-1">+ شهريا</p>
            </div>
            
            <div class="col-span-4 premium-form-group">
              <label>رصيد الإجازات السنوي</label>"""
content = content.replace(
    """<div class="col-span-4 premium-form-group">
              <label>رصيد الإجازات السنوي</label>""",
    html_field
)

# 4. Extract value in preConfirm
content = content.replace(
    "const sBalanceRaw = document.getElementById('swal-sick-balance')?.value;",
    "const sBalanceRaw = document.getElementById('swal-sick-balance')?.value;\n        const missingPunchesRaw = document.getElementById('swal-missing-punches')?.value;"
)
content = content.replace(
    "const sickLeaveBalance = sBalanceRaw !== '' && sBalanceRaw !== undefined ? parseInt(sBalanceRaw) : 0;",
    "const sickLeaveBalance = sBalanceRaw !== '' && sBalanceRaw !== undefined ? parseInt(sBalanceRaw) : 0;\n        const allowedMissingPunches = missingPunchesRaw !== '' && missingPunchesRaw !== undefined ? parseInt(missingPunchesRaw) : 0;"
)

# 5. Add to the returned object from preConfirm
content = content.replace(
    "employmentStatus, vacationBalance, sickLeaveBalance, allowedLeaveTypes,",
    "employmentStatus, vacationBalance, sickLeaveBalance, allowedMissingPunches, allowedLeaveTypes,"
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("AdminEmployees.jsx updated successfully.")
