import re
import sys

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\EmployeeDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start of the action buttons block
start_str = '{/* تقديم طلب - Action Buttons */}'
start_idx = content.find(start_str)

if start_idx == -1:
    start_str = '{/*   - Action Buttons */}'
    start_idx = content.find(start_str)
    
if start_idx == -1:
    start_str = 'Action Buttons'
    start_idx = content.find(start_str)

if start_idx == -1:
    print("Could not find start index")
    sys.exit(1)

# Find the end of the home tab return block (right before </motion.div>)
end_idx = content.find('</motion.div>', start_idx)

if end_idx == -1:
    print("Could not find end index")
    sys.exit(1)

original_block = content[start_idx:end_idx]
print("Found block to replace length:", len(original_block))

new_block = """{/* تقديم طلب - Action Buttons */}
            <div className="section-title mt-6 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck size={22} className="text-teal-600" />
                <span className="font-extrabold text-lg text-slate-800">تقديم طلب</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8" dir="rtl">
              <button 
                className="bg-white flex flex-col items-center justify-center p-6 rounded-[24px] shadow-sm border border-slate-100 hover:shadow-md transition-all group"
                onClick={() => { setLeaveFormData({...leaveFormData, type: allowedLeaveTypes[0] || 'إجازة سنوية'}); setShowLeaveModal(true); }}
              >
                <div className="bg-teal-50 w-16 h-16 rounded-full flex items-center justify-center mb-3 group-hover:bg-teal-100 transition-colors">
                  <Calendar size={28} className="text-teal-600" />
                </div>
                <span className="font-bold text-slate-800 text-[15px]">تقديم إجازة</span>
                <div className="w-6 h-1 bg-teal-500 rounded-full mt-2 opacity-80"></div>
              </button>

              <button 
                className="bg-white flex flex-col items-center justify-center p-6 rounded-[24px] shadow-sm border border-slate-100 hover:shadow-md transition-all group"
                onClick={() => handleTabChange('add')}
              >
                <div className="bg-teal-50 w-16 h-16 rounded-full flex items-center justify-center mb-3 group-hover:bg-teal-100 transition-colors">
                  <FileText size={28} className="text-teal-600" />
                </div>
                <span className="font-bold text-slate-800 text-[15px]">تقرير العمل اليومي</span>
                <div className="w-6 h-1 bg-teal-500 rounded-full mt-2 opacity-80"></div>
              </button>

              <button 
                className="bg-white flex flex-col items-center justify-center p-6 rounded-[24px] shadow-sm border border-slate-100 hover:shadow-md transition-all group"
                onClick={() => handleTabChange('hr_requests')}
              >
                <div className="bg-teal-50 w-16 h-16 rounded-full flex items-center justify-center mb-3 group-hover:bg-teal-100 transition-colors">
                  <Folder size={28} className="text-teal-600" />
                </div>
                <span className="font-bold text-slate-800 text-[15px]">طلباتي</span>
                <div className="w-6 h-1 bg-teal-500 rounded-full mt-2 opacity-80"></div>
              </button>

              <button 
                className={`bg-white flex flex-col items-center justify-center p-6 rounded-[24px] shadow-sm border border-slate-100 transition-all group ${user.allowAdvances === false ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}
                onClick={() => { 
                  if (user.allowAdvances === false) {
                    Swal.fire('مرفوض', 'ليس لديك صلاحية لطلب سلفة حالياً.', 'error');
                  } else {
                    setShowAdvanceModal(true); 
                  }
                }}
              >
                <div className="bg-teal-50 w-16 h-16 rounded-full flex items-center justify-center mb-3 group-hover:bg-teal-100 transition-colors">
                  <DollarSign size={28} className="text-teal-600" />
                </div>
                <span className="font-bold text-slate-800 text-[15px]">طلب سلفة</span>
                <div className="w-6 h-1 bg-teal-500 rounded-full mt-2 opacity-80"></div>
              </button>

              <button 
                className="bg-white flex flex-col items-center justify-center p-6 rounded-[24px] shadow-sm border border-slate-100 hover:shadow-md transition-all group"
                onClick={() => { setLeaveFormData({...leaveFormData, type: 'بدل عمل إضافي'}); setShowLeaveModal(true); }}
              >
                <div className="bg-teal-50 w-16 h-16 rounded-full flex items-center justify-center mb-3 group-hover:bg-teal-100 transition-colors">
                  <Plus size={28} className="text-teal-600" />
                </div>
                <span className="font-bold text-slate-800 text-[15px]">عمل إضافي</span>
                <div className="w-6 h-1 bg-teal-500 rounded-full mt-2 opacity-80"></div>
              </button>

              <button 
                className="bg-white flex flex-col items-center justify-center p-6 rounded-[24px] shadow-sm border border-slate-100 hover:shadow-md transition-all group"
                onClick={() => { setLeaveFormData({...leaveFormData, type: 'مغادرة عمل'}); setShowLeaveModal(true); }}
              >
                <div className="bg-teal-50 w-16 h-16 rounded-full flex items-center justify-center mb-3 group-hover:bg-teal-100 transition-colors">
                  <Clock size={28} className="text-teal-600" />
                </div>
                <span className="font-bold text-slate-800 text-[15px]">تقديم مغادرة</span>
                <div className="w-6 h-1 bg-teal-500 rounded-full mt-2 opacity-80"></div>
              </button>

              {/* SUPERVISOR / EXTRA ACCESS BUTTONS */}
              {user.hasLiveAccess && (
                <button 
                  className="bg-white flex flex-col items-center justify-center p-6 rounded-[24px] shadow-sm border border-slate-100 hover:shadow-md transition-all group"
                  onClick={() => handleTabChange('live')}
                >
                  <div className="bg-sky-50 w-16 h-16 rounded-full flex items-center justify-center mb-3 group-hover:bg-sky-100 transition-colors">
                    <Activity size={28} className="text-sky-600" />
                  </div>
                  <span className="font-bold text-slate-800 text-[15px]">المراقبة المباشرة</span>
                  <div className="w-6 h-1 bg-sky-500 rounded-full mt-2 opacity-80"></div>
                </button>
              )}

              {canViewMissions && (
                <button 
                  className="bg-white flex flex-col items-center justify-center p-6 rounded-[24px] shadow-sm border border-slate-100 hover:shadow-md transition-all group"
                  onClick={() => handleTabChange('missions')}
                >
                  <div className="bg-amber-50 w-16 h-16 rounded-full flex items-center justify-center mb-3 group-hover:bg-amber-100 transition-colors">
                    <Truck size={28} className="text-amber-600" />
                  </div>
                  <span className="font-bold text-slate-800 text-[15px]">إدارة التوصيل</span>
                  <div className="w-6 h-1 bg-amber-500 rounded-full mt-2 opacity-80"></div>
                </button>
              )}

              {user.hasSalesAccess && (
                <button 
                  className="bg-white flex flex-col items-center justify-center p-6 rounded-[24px] shadow-sm border border-slate-100 hover:shadow-md transition-all group"
                  onClick={() => handleTabChange('sales')}
                >
                  <div className="bg-rose-50 w-16 h-16 rounded-full flex items-center justify-center mb-3 group-hover:bg-rose-100 transition-colors">
                    <ShoppingCart size={28} className="text-rose-600" />
                  </div>
                  <span className="font-bold text-slate-800 text-[15px]">إدارة المبيعات</span>
                  <div className="w-6 h-1 bg-rose-500 rounded-full mt-2 opacity-80"></div>
                </button>
              )}

              {user.hasProductionAccess && (
                <button 
                  className="bg-white flex flex-col items-center justify-center p-6 rounded-[24px] shadow-sm border border-slate-100 hover:shadow-md transition-all group"
                  onClick={() => handleTabChange('production')}
                >
                  <div className="bg-purple-50 w-16 h-16 rounded-full flex items-center justify-center mb-3 group-hover:bg-purple-100 transition-colors">
                    <SewingMachineIcon size={28} className="text-purple-600" />
                  </div>
                  <span className="font-bold text-slate-800 text-[15px]">إدارة الإنتاج</span>
                  <div className="w-6 h-1 bg-purple-500 rounded-full mt-2 opacity-80"></div>
                </button>
              )}

              {isSupervisor && (
                <button 
                  className="bg-white flex flex-col items-center justify-center p-6 rounded-[24px] shadow-sm border border-slate-100 hover:shadow-md transition-all group"
                  onClick={() => handleTabChange('supervisor-tasks')}
                >
                  <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition-colors">
                    <Layers size={28} className="text-indigo-600" />
                  </div>
                  <span className="font-bold text-slate-800 text-[15px]">متابعة الأقسام</span>
                  <div className="w-6 h-1 bg-indigo-500 rounded-full mt-2 opacity-80"></div>
                </button>
              )}

              {canViewSupervisorReports && (
                <button 
                  className="bg-white flex flex-col items-center justify-center p-6 rounded-[24px] shadow-sm border border-slate-100 hover:shadow-md transition-all group"
                  onClick={() => handleTabChange('supervisor-reports')}
                >
                  <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mb-3 group-hover:bg-orange-100 transition-colors">
                    <ClipboardCheck size={28} className="text-orange-600" />
                  </div>
                  <span className="font-bold text-slate-800 text-[15px]">تقارير المشرفين</span>
                  <div className="w-6 h-1 bg-orange-500 rounded-full mt-2 opacity-80"></div>
                </button>
              )}
            </div>

            {/* الختمات الناقصة Widget */}
            <div 
              className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-5 flex items-center justify-between mb-8 cursor-pointer hover:shadow-md transition-all"
              onClick={() => {
                if (remainingPunches <= 0) {
                  MySwal.fire('تنبيه', 'لا يوجد لديك ختمات ناقصة متبقية لهذا الشهر.', 'success');
                } else {
                  setShowMissingPunchModal(true);
                }
              }}
              dir="rtl"
            >
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-slate-100 drop-shadow-sm">
                    <path fill="currentColor" d="M50 3 L93 25 L93 75 L50 97 L7 75 L7 25 Z" />
                  </svg>
                  <Fingerprint size={28} className="text-teal-600 relative z-10" />
                </div>
                
                <div className="flex flex-col">
                  <h4 className="font-extrabold text-slate-800 text-base mb-1">الختمات الناقصة</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed max-w-[200px] font-medium">
                    عدد الأيام التي لم يتم تسجيل الحضور أو الانصراف فيها.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center bg-slate-50 rounded-[18px] w-[75px] h-[75px] border border-slate-200 shrink-0">
                <span className="text-3xl font-extrabold text-teal-600 leading-none mb-1">{remainingPunches}</span>
                <span className="text-[10px] font-bold text-slate-500">يوم متبقي</span>
              </div>
            </div>
            """

content = content[:start_idx] + new_block + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Successfully replaced layout!")
