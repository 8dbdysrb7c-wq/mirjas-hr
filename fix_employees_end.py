import sys

file_path = 'src/pages/hr/HRSalaryReports.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_employees = False
employees_end_index = -1

for i, line in enumerate(lines):
    if "activeReportTab === 'employees' && (" in line:
        in_employees = True
    elif in_employees and "activeReportTab ===" in line:
        in_employees = False # left employees block
    
    if in_employees and "</table>" in line:
        # Check if next few lines have `)}`
        for j in range(i, min(len(lines), i+6)):
            if "        )}" in lines[j] or "      )}" in lines[j]:
                employees_end_index = j
                break

if employees_end_index != -1:
    lines[employees_end_index] = lines[employees_end_index].replace(")}", "</>\n        )}")

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Done')
