import re

with open('src/pages/admin/AdminReports.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add data-label to sales table
content = content.replace('<td>{order.orderDate}</td>', '<td data-label="التاريخ">{order.orderDate}</td>')
content = content.replace('<td>{order.customerName}</td>', '<td data-label="العميل">{order.customerName}</td>')
content = content.replace('<td>{order.createdBy || \'---\'}</td>', '<td data-label="بواسطة">{order.createdBy || \'---\'}</td>')
content = content.replace('<td>{order.items?.length || 0}</td>', '<td data-label="العدد">{order.items?.length || 0}</td>')

# Note: to be perfectly safe, I will just do string replacements for the specific rows.

# --- CUSTOMERS ---
old_customers = '''                {activeReportTab === 'customers' && sortedRowsByTab.customers.map(row => (
                  <tr key={row.id}>
                    <td className="font-mono text-sm text-slate-500 font-bold text-center">{row.customerNumber || '---'}</td>
                    <td className="text-right pr-4" style={{ fontWeight: 'bold' }}>{row.name}</td>
                    <td dir="ltr" className="text-center">{row.phone}</td>
                    <td className="text-center">{row.location || '---'}</td>
                    <td className="text-center">{row.sector || '---'}</td>
                    <td className="text-center">'''

new_customers = '''                {activeReportTab === 'customers' && sortedRowsByTab.customers.map(row => (
                  <tr key={row.id}>
                    <td data-label="الرقم" className="font-mono text-sm text-slate-500 font-bold text-center">{row.customerNumber || '---'}</td>
                    <td data-label="العميل" className="text-right pr-4" style={{ fontWeight: 'bold' }}>{row.name}</td>
                    <td data-label="الهاتف" dir="ltr" className="text-center">{row.phone}</td>
                    <td data-label="العنوان" className="text-center">{row.location || '---'}</td>
                    <td data-label="القطاع" className="text-center">{row.sector || '---'}</td>
                    <td data-label="الحالة" className="text-center">'''
content = content.replace(old_customers, new_customers)

with open('src/pages/admin/AdminReports.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Customers table fixed")
