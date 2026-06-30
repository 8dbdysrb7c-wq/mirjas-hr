import sys

file_path = r"c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\EmployeeDashboard.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """</select>
            </div>
          )}"""

replace = """</select>
              {leaveFormData.type === 'إجازة سنوية' && user.vacationBalance !== undefined && (
                <div className="text-xs text-primary font-bold mt-2 bg-primary/5 p-2 rounded-lg border border-primary/10">
                  الرصيد المتبقي للإجازة السنوية: {user.vacationBalance} أيام
                </div>
              )}
              {leaveFormData.type === 'إجازة مرضية' && user.sickLeaveBalance !== undefined && (
                <div className="text-xs text-primary font-bold mt-2 bg-primary/5 p-2 rounded-lg border border-primary/10">
                  الرصيد المتبقي للإجازة المرضية: {user.sickLeaveBalance} أيام
                </div>
              )}
            </div>
          )}"""

if target in content:
    content = content.replace(target, replace)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("EmployeeDashboard.jsx updated")
