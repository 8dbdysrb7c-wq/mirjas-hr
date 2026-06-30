import re

with open('src/pages/EmployeeDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Fingerprint to imports
content = content.replace(
    "Activity } from 'lucide-react';",
    "Activity, Fingerprint } from 'lucide-react';"
)

# 2. Add the missing punch button to hr_requests tab
buttons_old = """            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              <button onClick={() => { setLeaveFormData({...leaveFormData, type: allowedLeaveTypes[0] || 'إجازة سنوية'}); setShowLeaveModal(true); }} className="btn btn-outline flex flex-col items-center justify-center p-4 h-24 gap-2 bg-white hover:bg-slate-50 border-slate-200">
                <Calendar size={24} className="text-primary" />
                <span className="font-semibold">تقديم إجازة</span>
              </button>
              <button onClick={() => { setLeaveFormData({...leaveFormData, type: 'مغادرة شخصية'}); setShowLeaveModal(true); }} className="btn btn-outline flex flex-col items-center justify-center p-4 h-24 gap-2 bg-white hover:bg-slate-50 border-slate-200">
                <Clock size={24} className="text-amber-500" />
                <span className="font-semibold">تقديم مغادرة</span>
              </button>
              <button onClick={() => { setLeaveFormData({...leaveFormData, type: 'بدل عمل إضافي'}); setShowLeaveModal(true); }} className="btn btn-outline flex flex-col items-center justify-center p-4 h-24 gap-2 bg-white hover:bg-slate-50 border-slate-200">
                <Plus size={24} className="text-emerald-500" />
                <span className="font-semibold">تقديم عمل إضافي</span>
              </button>
            </div>"""

buttons_new = """            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <button onClick={() => { setLeaveFormData({...leaveFormData, type: allowedLeaveTypes[0] || 'إجازة سنوية'}); setShowLeaveModal(true); }} className="btn btn-outline flex flex-col items-center justify-center p-4 h-auto min-h-[6rem] gap-2 bg-white hover:bg-slate-50 border-slate-200">
                <Calendar size={24} className="text-primary" />
                <span className="font-semibold">تقديم إجازة</span>
              </button>
              <button onClick={() => { setLeaveFormData({...leaveFormData, type: 'مغادرة شخصية'}); setShowLeaveModal(true); }} className="btn btn-outline flex flex-col items-center justify-center p-4 h-auto min-h-[6rem] gap-2 bg-white hover:bg-slate-50 border-slate-200">
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

content = content.replace(buttons_old, buttons_new)

with open('src/pages/EmployeeDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
