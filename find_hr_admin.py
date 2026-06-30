import sys

file_path = 'src/pages/admin/AdminReports.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "activeReportTab === 'hr'" in line:
        start = max(0, i-2)
        end = min(len(lines), i+5)
        print('Line ' + str(i))
        print(''.join(lines[start:end]))
        print('---')
