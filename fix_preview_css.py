import re

with open('src/pages/admin/AdminReports.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the classes
content = content.replace('className="block lg:hidden mt-4 space-y-4"', 'className="supervisors-mobile-view mt-4 space-y-4"')
content = content.replace("className={`table-container ${activeReportTab === 'supervisors' ? 'hidden lg:block' : ''}`}", "className={`table-container ${activeReportTab === 'supervisors' ? 'supervisors-table-view' : ''}`}")

with open('src/pages/admin/AdminReports.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('src/index.css', 'a', encoding='utf-8') as f:
    f.write('''
/* Supervisors Mobile Cards View */
.supervisors-mobile-view { display: none; }
.supervisors-table-view { display: block; }

@media (max-width: 1024px) {
  .supervisors-mobile-view { display: block; }
  .supervisors-table-view { display: none; }
}

.preview-active.preview-phone .supervisors-mobile-view,
.preview-active.preview-tablet.preview-portrait .supervisors-mobile-view {
  display: block !important;
}

.preview-active.preview-phone .supervisors-table-view,
.preview-active.preview-tablet.preview-portrait .supervisors-table-view {
  display: none !important;
}
''')

print("Applied precise CSS for Preview Mode!")
