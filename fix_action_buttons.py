import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    css_content = f.read()

new_css = """

/* Circular Action Buttons */
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1.5px solid #cbd5e1;
  background-color: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}
.action-btn:hover {
  background-color: #f8fafc;
}
.action-btn.danger {
  border-color: #f87171;
  color: #ef4444;
}
.action-btn.danger:hover {
  background-color: #fef2f2;
}
.action-btn.success {
  border-color: #34d399;
  color: #10b981;
}
.action-btn.success:hover {
  background-color: #ecfdf5;
}
.action-btn.info {
  border-color: #93c5fd;
  color: #3b82f6;
}
.action-btn.info:hover {
  background-color: #eff6ff;
}
"""

if '.action-btn.danger' not in css_content:
    with open('src/index.css', 'a', encoding='utf-8') as f:
        f.write(new_css)

with open('src/pages/admin/AdminSupervisorReports.jsx', 'r', encoding='utf-8') as f:
    jsx_content = f.read()

# Replace the current broken tailwind classes with the new ones
import re

old_block_pattern = r'<div className="flex justify-center gap-3">.*?</div>\s*</td>'

new_block = """<div className="flex justify-center gap-2">
                        <button className="action-btn" onClick={() => handleViewReport(report)} title="عرض التفاصيل">
                          <Eye size={18} />
                        </button>
                        {!isSuperAdmin && report.status !== 'معتمد' && (
                          <button className="action-btn info" onClick={() => handleEditReport(report)} title="تعديل التقرير">
                            <Edit size={18} />
                          </button>
                        )}
                        {isSuperAdmin && report.status !== 'معتمد' && (
                          <button className="action-btn success" onClick={() => handleChangeReportStatus(report, 'معتمد')} title="اعتماد التقرير ومنع التعديل">
                            <Check size={18} />
                          </button>
                        )}
                        {isSuperAdmin && report.status === 'معتمد' && (
                          <button className="action-btn danger" onClick={() => handleChangeReportStatus(report, 'مرفوض/مُعاد')} title="إعادة التقرير للمشرف (إتاحة التعديل)">
                            <X size={18} />
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button className="action-btn danger" onClick={() => handleDeleteReport(report)} title="حذف التقرير">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>"""

jsx_content = re.sub(old_block_pattern, new_block, jsx_content, flags=re.DOTALL)

with open('src/pages/admin/AdminSupervisorReports.jsx', 'w', encoding='utf-8') as f:
    f.write(jsx_content)

print("Buttons fixed with custom CSS classes.")
