import re

with open('src/pages/admin/AdminReports.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace supervisors table rows with data-label
old_supervisors_rows = '''                {activeReportTab === 'supervisors' && sortedRowsByTab.supervisors.map(row => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 'bold' }}>{row.date}</td>
                    <td>{row.supervisorName || row.supervisorId}</td>
                    <td>{row.type}</td>
                    <td>{row.content}</td>
                  </tr>
                ))}'''

new_supervisors_rows = '''                {activeReportTab === 'supervisors' && sortedRowsByTab.supervisors.map(row => (
                  <tr key={row.id}>
                    <td data-label="التاريخ" style={{ fontWeight: 'bold' }}>{row.date}</td>
                    <td data-label="المشرف">{row.supervisorName || row.supervisorId}</td>
                    <td data-label="حالة الحضور">{row.type}</td>
                    <td data-label="محتوى التقرير">{row.content}</td>
                  </tr>
                ))}'''

content = content.replace(old_supervisors_rows, new_supervisors_rows)

with open('src/pages/admin/AdminReports.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Supervisors table rows updated with data-label")
