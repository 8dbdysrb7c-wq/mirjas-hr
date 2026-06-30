import sys

with open('src/pages/admin/AdminReports.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "activeReportTab === 'hr'" in line:
        start = max(0, i-5)
        end = min(len(lines), i+20)
        print('Line ' + str(i))
        print(''.join(lines[start:end]))
        print('---')
