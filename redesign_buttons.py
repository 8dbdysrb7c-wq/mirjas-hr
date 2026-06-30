import re

def update_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
        else:
            print(f"WARNING: String not found in {filepath}:\n{old[:100]}...")
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# 1. HRLeaves.jsx
old_leaves_buttons = """                  <div className="flex gap-2 justify-end">
                    {leave.status === 'معلق' && (
                      <>
                        <button onClick={() => handleStatusChange(leave, 'موافق')} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-all font-medium text-sm border border-emerald-100">
                          <CheckCircle size={15} /> موافقة
                        </button>
                        <button onClick={() => handleStatusChange(leave, 'مرفوض')} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition-all font-medium text-sm border border-rose-100">
                          <XCircle size={15} /> رفض
                        </button>
                      </>
                    )}
                    <button onClick={() => handleDelete(leave.id)} className="flex items-center justify-center w-8 h-8 bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-all border border-slate-200 hover:border-rose-200" title="حذف">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                  </div>"""

new_leaves_buttons = """                  <div className="flex gap-2 justify-end items-center">
                    {leave.status === 'معلق' ? (
                      <>
                        <button onClick={() => handleStatusChange(leave, 'موافق')} className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white border-none flex items-center gap-1 rounded-md px-3 shadow-sm">
                          <CheckCircle size={14} /> موافقة
                        </button>
                        <button onClick={() => handleStatusChange(leave, 'مرفوض')} className="btn btn-sm bg-rose-600 hover:bg-rose-700 text-white border-none flex items-center gap-1 rounded-md px-3 shadow-sm">
                          <XCircle size={14} /> رفض
                        </button>
                      </>
                    ) : (
                      <button onClick={() => handleStatusChange(leave, 'معلق')} className="btn btn-sm bg-slate-600 hover:bg-slate-700 text-white border-none flex items-center gap-1 rounded-md px-3 shadow-sm" title="تعديل القرار">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                        تراجع
                      </button>
                    )}
                    <button onClick={() => handleDelete(leave.id)} className="flex items-center justify-center w-8 h-8 bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 rounded-md transition-all border border-slate-200 hover:border-rose-200 shadow-sm" title="حذف">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                  </div>"""

update_file('src/pages/hr/HRLeaves.jsx', [(old_leaves_buttons, new_leaves_buttons)])

# 2. HROvertime.jsx
old_overtime_buttons = """                  <div className="flex gap-2 justify-end">
                    {leave.status === 'معلق' && (
                      <>
                        <button onClick={() => handleStatusChange(leave, 'موافق')} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-all font-medium text-sm border border-emerald-100">
                          <CheckCircle size={15} /> موافقة
                        </button>
                        <button onClick={() => handleStatusChange(leave, 'مرفوض')} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition-all font-medium text-sm border border-rose-100">
                          <XCircle size={15} /> رفض
                        </button>
                      </>
                    )}
                    <button onClick={() => handleDelete(leave.id)} className="flex items-center justify-center w-8 h-8 bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-all border border-slate-200 hover:border-rose-200" title="حذف">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                  </div>"""

new_overtime_buttons = """                  <div className="flex gap-2 justify-end items-center">
                    {leave.status === 'معلق' ? (
                      <>
                        <button onClick={() => handleStatusChange(leave, 'موافق')} className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white border-none flex items-center gap-1 rounded-md px-3 shadow-sm">
                          <CheckCircle size={14} /> موافقة
                        </button>
                        <button onClick={() => handleStatusChange(leave, 'مرفوض')} className="btn btn-sm bg-rose-600 hover:bg-rose-700 text-white border-none flex items-center gap-1 rounded-md px-3 shadow-sm">
                          <XCircle size={14} /> رفض
                        </button>
                      </>
                    ) : (
                      <button onClick={() => handleStatusChange(leave, 'معلق')} className="btn btn-sm bg-slate-600 hover:bg-slate-700 text-white border-none flex items-center gap-1 rounded-md px-3 shadow-sm" title="تعديل القرار">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                        تراجع
                      </button>
                    )}
                    <button onClick={() => handleDelete(leave.id)} className="flex items-center justify-center w-8 h-8 bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 rounded-md transition-all border border-slate-200 hover:border-rose-200 shadow-sm" title="حذف">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                  </div>"""

update_file('src/pages/hr/HROvertime.jsx', [(old_overtime_buttons, new_overtime_buttons)])

# 3. HRMissingPunches.jsx
old_mp_buttons = """                  <td className="p-4">
                    {p.status === 'معلق' || p.status === 'قيد المراجعة' ? (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => handleUpdateStatus(p, 'موافق عليه')} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-all font-medium text-sm border border-emerald-100">
                          <Check size={15} /> موافقة
                        </button>
                        <button onClick={() => handleUpdateStatus(p, 'مرفوض')} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition-all font-medium text-sm border border-rose-100">
                          <X size={15} /> رفض
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 block text-left">بواسطة: {p.approvedBy || '-'}</span>
                    )}
                  </td>"""

new_mp_buttons = """                  <td className="p-4">
                    {p.status === 'معلق' || p.status === 'قيد المراجعة' ? (
                      <div className="flex gap-2 justify-end items-center">
                        <button onClick={() => handleUpdateStatus(p, 'موافق عليه')} className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white border-none flex items-center gap-1 rounded-md px-3 shadow-sm">
                          <Check size={14} /> موافقة
                        </button>
                        <button onClick={() => handleUpdateStatus(p, 'مرفوض')} className="btn btn-sm bg-rose-600 hover:bg-rose-700 text-white border-none flex items-center gap-1 rounded-md px-3 shadow-sm">
                          <X size={14} /> رفض
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-xs text-slate-400 block text-left">بواسطة: {p.approvedBy || '-'}</span>
                        <button onClick={() => handleUpdateStatus(p, 'قيد المراجعة')} className="btn btn-sm bg-slate-600 hover:bg-slate-700 text-white border-none flex items-center gap-1 rounded-md px-3 shadow-sm" title="تعديل القرار">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                          تراجع
                        </button>
                      </div>
                    )}
                  </td>"""

update_file('src/pages/hr/HRMissingPunches.jsx', [(old_mp_buttons, new_mp_buttons)])
