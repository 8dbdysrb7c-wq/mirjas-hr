import os

file_path = 'src/pages/admin/AdminReports.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

with open('admin_reports_dump.txt', 'w', encoding='utf-8') as f:
    f.write(content)
