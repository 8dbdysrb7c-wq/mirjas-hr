import re

with open('src/pages/admin/AdminReports.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
import_pattern = r"import {([^}]+)} from 'lucide-react';"
def add_imports(match):
    existing = match.group(1)
    new_icons = ['AlertTriangle', 'CheckCircle', 'User']
    for icon in new_icons:
        if icon not in existing:
            existing += f", {icon}"
    return f"import {{{existing}}} from 'lucide-react';"

content = re.sub(import_pattern, add_imports, content)


# 2. Add the mobile view and hide the table container on mobile
mobile_view_code = '''          {/* Mobile view for Supervisors */}
          {activeReportTab === 'supervisors' && (
            <div className="block lg:hidden mt-2 space-y-4">
              {sortedRowsByTab.supervisors.map(row => {
                const isLate = String(row.type).includes('تأخير') || String(row.type).includes('غياب');
                return (
                  <div key={row.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 relative overflow-hidden" style={{ direction: 'rtl' }}>
                    {/* Top color bar */}
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${isLate ? 'bg-amber-400' : 'bg-emerald-500'}`}></div>
                    
                    {/* Header: Date and Badge */}
                    <div className="flex justify-between items-center mb-3 pt-1">
                      <div className="flex items-center gap-2 text-slate-500 text-sm font-bold">
                        <Calendar size={15} className="text-slate-400" />
                        <span>{row.date}</span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${isLate ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {isLate ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                        {row.type || 'معتمد'}
                      </span>
                    </div>

                    {/* Body: Name and Avatar */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1 pr-2">
                        <h3 className="font-black text-slate-800 text-lg mb-2">{row.supervisorName || row.supervisorId}</h3>
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                           <div className="flex items-center gap-1">
                             <Users size={14} className="text-primary" />
                             <span>تم تقييم الموظفين</span>
                           </div>
                           <div className="flex items-center gap-1">
                             <div className={`w-2 h-2 rounded-full ${isLate ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                             <span>{row.type || 'الجميع متواجدون'}</span>
                           </div>
                        </div>
                      </div>
                      <div className="h-12 w-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center border border-slate-100 shadow-sm flex-shrink-0">
                        <User size={24} />
                      </div>
                    </div>
                    
                    {/* Content text */}
                    <div className="text-slate-600 text-sm mt-3 leading-relaxed border-t border-slate-100 pt-3 pb-3">
                      {row.content}
                    </div>

                    {/* Footer actions */}
                    <div className="flex border-t border-slate-100 pt-3 mt-1 divide-x divide-x-reverse divide-slate-100">
                       <button className="flex-1 flex items-center justify-center gap-2 text-primary font-bold text-xs py-1 hover:bg-slate-50 transition-colors">
                         <Eye size={14} /> عرض التقرير
                       </button>
                       <button className="flex-1 flex items-center justify-center gap-2 text-emerald-600 font-bold text-xs py-1 hover:bg-slate-50 transition-colors">
                         <CheckCircle size={14} /> اعتماد التقرير
                       </button>
                       <button className="flex-1 flex items-center justify-center gap-2 text-red-500 font-bold text-xs py-1 hover:bg-slate-50 transition-colors">
                         <Trash2 size={14} /> حذف التقرير
                       </button>
                    </div>
                  </div>
                );
              })}
              {sortedRowsByTab.supervisors.length === 0 && (
                <div className="text-center text-muted p-8">لا يوجد تقارير</div>
              )}
            </div>
          )}
          
          <div className={`table-container ${activeReportTab === 'supervisors' ? 'hidden lg:block' : ''}`}>'''

# Replace the table-container opening tag with the new mobile view and the hidden class
content = content.replace('          <div className="table-container">', mobile_view_code)

with open('src/pages/admin/AdminReports.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Supervisor mobile card view injected!")
