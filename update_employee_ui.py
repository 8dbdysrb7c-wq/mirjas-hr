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

# Update the pills in the Sidebar
sidebar_old = """              <span className="dashboard-header-pill" style={{ justifyContent: 'center' }}>الرقم الوظيفي: {user.id}</span>
              <span className="dashboard-header-pill" style={{ justifyContent: 'center' }}>المسمى: {userTitle}</span>"""
sidebar_new = """              <span className="dashboard-header-pill" style={{ justifyContent: 'center' }}>الرقم الوظيفي: {user.id}</span>
              {user.jobTitle && <span className="dashboard-header-pill" style={{ justifyContent: 'center' }}>المسمى الوظيفي: {user.jobTitle}</span>}"""

# Update the pills in the Header
header_old = """                  <span className="dashboard-header-pill">
                    الرقم الوظيفي: {user.id}
                  </span>
                  <span className="dashboard-header-pill">
                    المسمى: {userTitle}
                  </span>"""
header_new = """                  <span className="dashboard-header-pill">
                    الرقم الوظيفي: {user.id}
                  </span>
                  {user.jobTitle && (
                    <span className="dashboard-header-pill">
                      المسمى الوظيفي: {user.jobTitle}
                    </span>
                  )}"""

# Update the 4 buttons in hr_requests tab
buttons_old = """            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <button onClick={() => { setLeaveFormData({...leaveFormData, type: allowedLeaveTypes[0] || 'إجازة سنوية'}); setShowLeaveModal(true); }} className="btn btn-outline flex flex-col items-center justify-center p-4 h-auto min-h-[6rem] gap-2 bg-white hover:bg-slate-50 border-slate-200">
                <Calendar size={24} className="text-primary" />
                <span className="font-semibold">تقديم إجازة</span>
              </button>
              <button onClick={() => { setLeaveFormData({...leaveFormData, type: 'مغادرة خاصة'}); setShowLeaveModal(true); }} className="btn btn-outline flex flex-col items-center justify-center p-4 h-auto min-h-[6rem] gap-2 bg-white hover:bg-slate-50 border-slate-200">
                <Clock size={24} className="text-amber-500" />
                <span className="font-semibold">تقديم مغادرة</span>
              </button>
              <button onClick={() => { setLeaveFormData({...leaveFormData, type: 'بدل عمل إضافي'}); setShowLeaveModal(true); }} className="btn btn-outline flex flex-col items-center justify-center p-4 h-auto min-h-[6rem] gap-2 bg-white hover:bg-slate-50 border-slate-200">
                <Plus size={24} className="text-emerald-500" />
                <span className="font-semibold text-center">تقديم عمل إضافي</span>
              </button>
              <button onClick={() => setShowMissingPunchModal(true)} className="btn btn-outline flex flex-col items-center justify-center p-4 h-auto min-h-[6rem] gap-1 bg-white hover:bg-slate-50 border-slate-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-1 bg-blue-500 opacity-20"></div>
                <Fingerprint size={24} className="text-blue-500 mb-1" />
                <span className="font-semibold text-center">الختمات الناقصة</span>
                <span className="text-xs text-slate-500 font-medium">الرصيد: {remainingPunches}</span>
              </button>
            </div>"""

buttons_new = """            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <button onClick={() => { setLeaveFormData({...leaveFormData, type: allowedLeaveTypes[0] || 'إجازة سنوية'}); setShowLeaveModal(true); }} className="btn bg-primary text-white flex items-center justify-center p-3 h-auto min-h-[3.5rem] gap-2 hover:bg-primary/90 transition-all rounded-xl shadow-sm border-0">
                <Calendar size={20} className="text-white" />
                <span className="font-bold text-sm">تقديم إجازة</span>
              </button>
              <button onClick={() => { setLeaveFormData({...leaveFormData, type: 'مغادرة خاصة'}); setShowLeaveModal(true); }} className="btn bg-primary text-white flex items-center justify-center p-3 h-auto min-h-[3.5rem] gap-2 hover:bg-primary/90 transition-all rounded-xl shadow-sm border-0">
                <Clock size={20} className="text-white" />
                <span className="font-bold text-sm">تقديم مغادرة</span>
              </button>
              <button onClick={() => { setLeaveFormData({...leaveFormData, type: 'بدل عمل إضافي'}); setShowLeaveModal(true); }} className="btn bg-primary text-white flex items-center justify-center p-3 h-auto min-h-[3.5rem] gap-2 hover:bg-primary/90 transition-all rounded-xl shadow-sm border-0">
                <Plus size={20} className="text-white" />
                <span className="font-bold text-sm text-center">عمل إضافي</span>
              </button>
              <button onClick={() => setShowMissingPunchModal(true)} className="btn bg-primary text-white flex flex-col items-center justify-center p-2 h-auto min-h-[3.5rem] gap-1 hover:bg-primary/90 transition-all rounded-xl shadow-sm border-0 relative overflow-hidden">
                <div className="flex items-center gap-2">
                  <Fingerprint size={20} className="text-white" />
                  <span className="font-bold text-sm text-center">الختمات الناقصة</span>
                </div>
                <span className="text-[10px] text-white/80 font-medium">الرصيد: {remainingPunches}</span>
              </button>
            </div>"""

update_file('src/pages/EmployeeDashboard.jsx', [
    (sidebar_old, sidebar_new),
    (header_old, header_new),
    (buttons_old, buttons_new)
])
