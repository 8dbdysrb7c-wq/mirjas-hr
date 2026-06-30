import sys

file_path = r"c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\admin\AdminEmployees.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add sickLeaveBalance and allowedLeaveTypes UI
target_ui = """<div class="col-span-4 premium-form-group">
<label>رصيد الإجازات السنوي</label>
<input id="swal-vacation-balance" type="number" class="premium-input" placeholder="رصيد الإجازات السنوي" value="${initialData.vacationBalance}">
</div>"""

replacement_ui = """<div class="col-span-4 premium-form-group">
<label>رصيد الإجازات السنوي</label>
<input id="swal-vacation-balance" type="number" class="premium-input" placeholder="رصيد الإجازات السنوي" value="${initialData.vacationBalance}">
</div>

<div class="col-span-4 premium-form-group">
<label>رصيد الإجازات المرضية</label>
<input id="swal-sick-balance" type="number" class="premium-input" placeholder="رصيد الإجازات المرضية" value="${initialData.sickLeaveBalance !== undefined ? initialData.sickLeaveBalance : 14}">
</div>

<div class="col-span-4 premium-form-group">
<label>صلاحيات أنواع الإجازة</label>
<div class="premium-checkbox-grid" style="grid-template-columns: 1fr; background: #fff; border: 1px solid #e2e8f0; gap: 0.25rem; padding: 0.5rem;">
<label class="premium-checkbox-item" style="padding: 0.25rem;">
<input type="checkbox" id="swal-leave-annual" ${(!initialData.allowedLeaveTypes || initialData.allowedLeaveTypes.includes('إجازة سنوية')) ? 'checked' : ''}>
<span style="font-size: 0.8rem;">إجازة سنوية</span>
</label>
<label class="premium-checkbox-item" style="padding: 0.25rem;">
<input type="checkbox" id="swal-leave-sick" ${(!initialData.allowedLeaveTypes || initialData.allowedLeaveTypes.includes('إجازة مرضية')) ? 'checked' : ''}>
<span style="font-size: 0.8rem;">إجازة مرضية</span>
</label>
<label class="premium-checkbox-item" style="padding: 0.25rem;">
<input type="checkbox" id="swal-leave-unpaid" ${(!initialData.allowedLeaveTypes || initialData.allowedLeaveTypes.includes('إجازة غير مدفوعة')) ? 'checked' : ''}>
<span style="font-size: 0.8rem;">إجازة غير مدفوعة</span>
</label>
</div>
</div>"""

if target_ui in content:
    content = content.replace(target_ui, replacement_ui)

# 2. Add to preConfirm extract
target_preconfirm = """const vacationBalance = document.getElementById('swal-vacation-balance').value;"""
replacement_preconfirm = """const vacationBalance = document.getElementById('swal-vacation-balance').value;
const sickLeaveBalance = document.getElementById('swal-sick-balance')?.value || 0;
const allowedLeaveTypes = [];
if (document.getElementById('swal-leave-annual')?.checked) allowedLeaveTypes.push('إجازة سنوية');
if (document.getElementById('swal-leave-sick')?.checked) allowedLeaveTypes.push('إجازة مرضية');
if (document.getElementById('swal-leave-unpaid')?.checked) allowedLeaveTypes.push('إجازة غير مدفوعة');"""

if target_preconfirm in content:
    content = content.replace(target_preconfirm, replacement_preconfirm)

# 3. Add to returned object
target_return = """vacationBalance: parseInt(vacationBalance) || 0,"""
replacement_return = """vacationBalance: parseInt(vacationBalance) || 0,
sickLeaveBalance: parseInt(sickLeaveBalance) || 0,
allowedLeaveTypes,"""

if target_return in content:
    content = content.replace(target_return, replacement_return)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("AdminEmployees.jsx updated")
