import re

with open('src/pages/admin/AdminSupervisorReports.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_block = """                      <div className="flex justify-center gap-2">
                        <button className="btn btn-outline p-1.5" onClick={() => handleViewReport(report)} title="عرض التفاصيل">
                          <Eye size={18} />
                        </button>
                        {!isSuperAdmin && report.status !== 'معتمد' && (
                          <button className="btn btn-outline p-1.5 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => handleEditReport(report)} title="تعديل التقرير">
                            <Edit size={18} />
                          </button>
                        )}
                        {isSuperAdmin && report.status !== 'معتمد' && (
                          <button className="btn btn-outline p-1.5 text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleChangeReportStatus(report, 'معتمد')} title="اعتماد التقرير ومنع التعديل">
                            <CheckCircle size={18} />
                          </button>
                        )}
                        {isSuperAdmin && report.status === 'معتمد' && (
                          <button className="btn btn-outline p-1.5 text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => handleChangeReportStatus(report, 'مرفوض/مُعاد')} title="إعادة التقرير للمشرف (إتاحة التعديل)">
                            <RotateCcw size={18} />
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button className="btn btn-outline p-1.5 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDeleteReport(report)} title="حذف التقرير">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>"""

new_block = """                      <div className="flex justify-center gap-3">
                        <button className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors" onClick={() => handleViewReport(report)} title="عرض التفاصيل">
                          <Eye size={20} />
                        </button>
                        {!isSuperAdmin && report.status !== 'معتمد' && (
                          <button className="flex items-center justify-center w-10 h-10 rounded-full border border-blue-200 text-blue-500 hover:bg-blue-50 transition-colors" onClick={() => handleEditReport(report)} title="تعديل التقرير">
                            <Edit size={20} />
                          </button>
                        )}
                        {isSuperAdmin && report.status !== 'معتمد' && (
                          <button className="flex items-center justify-center w-10 h-10 rounded-full border border-emerald-200 text-emerald-500 hover:bg-emerald-50 transition-colors" onClick={() => handleChangeReportStatus(report, 'معتمد')} title="اعتماد التقرير ومنع التعديل">
                            <Check size={20} />
                          </button>
                        )}
                        {isSuperAdmin && report.status === 'معتمد' && (
                          <button className="flex items-center justify-center w-10 h-10 rounded-full border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors" onClick={() => handleChangeReportStatus(report, 'مرفوض/مُعاد')} title="إعادة التقرير للمشرف (إتاحة التعديل)">
                            <X size={20} />
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button className="flex items-center justify-center w-10 h-10 rounded-full border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors" onClick={() => handleDeleteReport(report)} title="حذف التقرير">
                            <Trash2 size={20} />
                          </button>
                        )}
                      </div>"""

# make sure Check is imported
if ' Check,' not in content and '{ Check,' not in content:
    content = content.replace('import { FileText,', 'import { FileText, Check,')

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('src/pages/admin/AdminSupervisorReports.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Buttons updated successfully.")
else:
    print("Could not find the block to replace. It might have been modified.")
