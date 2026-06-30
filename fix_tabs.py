
with open('src/pages/admin/AdminReports.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_func = """  const handleTabChange = (tab) => {
    setActiveReportTab(tab);
    switch (tab) {
      case 'employees': setSortConfig({ key: 'date', direction: 'descending' }); break;
      case 'sales': setSortConfig({ key: 'orderDate', direction: 'descending' }); break;
      case 'production': setSortConfig({ key: 'orderDate', direction: 'descending' }); break;
      case 'delivery': setSortConfig({ key: 'createdAt', direction: 'descending' }); break;
      case 'stock': setSortConfig({ key: 'itemNumber', direction: 'ascending' }); break;
      default: setSortConfig({ key: 'date', direction: 'descending' });
    }
  };"""

content = content.replace(
    '  const handleSort = (key) => {',
    new_func + '\n\n  const handleSort = (key) => {'
)

content = content.replace(
    "setActiveReportTab('employees')",
    "handleTabChange('employees')"
)
content = content.replace(
    "setActiveReportTab('sales')",
    "handleTabChange('sales')"
)
content = content.replace(
    "setActiveReportTab('production')",
    "handleTabChange('production')"
)
content = content.replace(
    "setActiveReportTab('delivery')",
    "handleTabChange('delivery')"
)
content = content.replace(
    "setActiveReportTab('stock')",
    "handleTabChange('stock')"
)

with open('src/pages/admin/AdminReports.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
