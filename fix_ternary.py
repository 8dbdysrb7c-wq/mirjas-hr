import re

with open('src/pages/admin/AdminReports.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the ternary in table headers
bad_stock = """) : (
                <tr>
                  <th onClick={() => handleSort('itemNumber')} className="cursor-pointer hover:text-primary transition-colors">"""

good_stock = """) : activeReportTab === 'stock' ? (
                <tr>
                  <th onClick={() => handleSort('itemNumber')} className="cursor-pointer hover:text-primary transition-colors">"""

content = content.replace(bad_stock, good_stock)

with open('src/pages/admin/AdminReports.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
