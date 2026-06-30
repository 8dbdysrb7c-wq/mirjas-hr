import re

with open('src/pages/EmployeeDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "saveHRLeave } from '../store';",
    "saveHRLeave, getMissingPunches, saveMissingPunch } from '../store';"
)

content = content.replace(
    "import { LogOut, Home, Users, Settings, FileText, ShoppingBag, ShoppingCart, UserCheck, Target, Plus, MoreHorizontal, X, Truck, ClipboardList, SunMoon, Layers, ChevronDown, ChevronUp, Palette, Package, Moon, Activity, Calendar, Clock, Download, Check, RefreshCw, Edit2, AlertCircle } from 'lucide-react';",
    "import { LogOut, Home, Users, Settings, FileText, ShoppingBag, ShoppingCart, UserCheck, Target, Plus, MoreHorizontal, X, Truck, ClipboardList, SunMoon, Layers, ChevronDown, ChevronUp, Palette, Package, Moon, Activity, Calendar, Clock, Download, Check, RefreshCw, Edit2, AlertCircle, Fingerprint } from 'lucide-react';"
)

# 2. Add state variables
content = content.replace(
    "const [myLeaves, setMyLeaves] = useState([]);",
    "const [myLeaves, setMyLeaves] = useState([]);\n  const [missingPunches, setMissingPunches] = useState([]);\n  const [showMissingPunchModal, setShowMissingPunchModal] = useState(false);\n  const [missingPunchForm, setMissingPunchForm] = useState({ date: '', type: 'دخول', time: '', reason: '' });"
)

# 3. Add fetch logic
content = content.replace(
    "getHRLeaves()",
    "getHRLeaves(), getMissingPunches()"
)

content = content.replace(
    "const [rData, tData, dData, mData, sData, lData] = await Promise.all([",
    "const [rData, tData, dData, mData, sData, lData, mpData] = await Promise.all(["
)

content = content.replace(
    "setMyLeaves(lData.filter(l => String(l.employeeId) === String(user.id) || l.employeeName === user.name));",
    "setMyLeaves(lData.filter(l => String(l.employeeId) === String(user.id) || l.employeeName === user.name));\n      setMissingPunches(mpData.filter(m => String(m.employeeId) === String(user.id)));"
)

# 4. Add logic for missing punches limits
mp_logic = """  const myMissingPunches = missingPunches.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  const currentMonthPunchesCount = myMissingPunches.filter(p => {
    if (!p.date) return false;
    const pDate = new Date(p.date);
    const now = new Date();
    return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
  }).length;
  
  const userMissingPunchQuota = user.missingPunchQuota ?? 0;
  const remainingPunches = Math.max(0, userMissingPunchQuota - currentMonthPunchesCount);

  const handleSaveMissingPunch = async (e) => {
    e.preventDefault();
    if (remainingPunches <= 0) {
      MySwal.fire('تنبيه', 'لقد استنفدت رصيدك المسموح من طلبات الختمات الناقصة لهذا الشهر.', 'warning');
      return;
    }
    await saveMissingPunch({
      ...missingPunchForm,
      employeeId: user.id,
      employeeName: user.name,
      department: departments[userRoles[0]] || 'غير محدد',
      status: 'قيد المراجعة'
    });
    MySwal.fire('نجاح', 'تم إرسال طلب الختمة الناقصة بنجاح', 'success');
    setShowMissingPunchModal(false);
    setMissingPunchForm({ date: '', type: 'دخول', time: '', reason: '' });
    const updatedPunches = await getMissingPunches();
    setMissingPunches(updatedPunches.filter(m => String(m.employeeId) === String(user.id)));
  };"""

content = content.replace("  const handleSaveLeaveRequest = async (e) => {", mp_logic + "\n\n  const handleSaveLeaveRequest = async (e) => {")

# 5. Add rendering for the tab
mp_render = """      case 'missing_punches':
        return (
          <div className="glass-card animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Fingerprint className="text-primary" /> الختمات الناقصة
              </h3>
              <button 
                className="btn btn-primary flex items-center gap-2"
                onClick={() => {
                  if (remainingPunches <= 0) {
                    MySwal.fire('تنبيه', 'لقد استنفدت رصيدك المسموح من طلبات الختمات الناقصة لهذا الشهر.', 'warning');
                  } else {
                    setShowMissingPunchModal(true);
                  }
                }}
              >
                <Plus size={18} /> طلب ختمة ناقصة
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 flex justify-between items-center">
              <div>
                <p className="text-slate-500 text-sm">الرصيد المسموح به شهرياً: <b>{userMissingPunchQuota}</b></p>
                <p className="text-slate-500 text-sm mt-1">الطلبات المقدمة هذا الشهر: <b>{currentMonthPunchesCount}</b></p>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-black ${remainingPunches > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {remainingPunches}
                </div>
                <p className="text-xs text-slate-500">طلبات متبقية</p>
              </div>
            </div>

            {showMissingPunchModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                  <div className="bg-primary p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold">طلب ختمة ناقصة</h3>
                    <button onClick={() => setShowMissingPunchModal(false)} className="text-white hover:text-red-200 transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                  <form onSubmit={handleSaveMissingPunch} className="p-6 space-y-4">
                    <div className="input-group">
                      <label className="text-sm font-bold">التاريخ</label>
                      <input type="date" className="input-field bg-slate-50" required value={missingPunchForm.date} onChange={e => setMissingPunchForm({...missingPunchForm, date: e.target.value})} />
                    </div>
                    <div className="input-group">
                      <label className="text-sm font-bold">نوع الختمة</label>
                      <select className="input-field bg-slate-50" value={missingPunchForm.type} onChange={e => setMissingPunchForm({...missingPunchForm, type: e.target.value})}>
                        <option value="دخول">دخول</option>
                        <option value="خروج">خروج</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label className="text-sm font-bold">الوقت</label>
                      <input type="time" className="input-field bg-slate-50" required value={missingPunchForm.time} onChange={e => setMissingPunchForm({...missingPunchForm, time: e.target.value})} />
                    </div>
                    <div className="input-group">
                      <label className="text-sm font-bold">سبب عدم تسجيل الختمة</label>
                      <textarea className="input-field bg-slate-50 min-h-[80px]" required placeholder="اذكر السبب بوضوح..." value={missingPunchForm.reason} onChange={e => setMissingPunchForm({...missingPunchForm, reason: e.target.value})}></textarea>
                    </div>
                    <div className="pt-2 flex gap-3">
                      <button type="button" className="btn bg-slate-100 text-slate-700 flex-1 hover:bg-slate-200" onClick={() => setShowMissingPunchModal(false)}>إلغاء</button>
                      <button type="submit" className="btn btn-primary flex-1">إرسال الطلب</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="mt-6">
              <h4 className="font-bold mb-4 text-slate-800">سجل طلبات الختمات الناقصة</h4>
              {myMissingPunches.length === 0 ? (
                <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                  لا توجد طلبات سابقة
                </div>
              ) : (
                <div className="space-y-3">
                  {myMissingPunches.map(p => (
                    <div key={p.id} className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-2">
                            {p.type === 'دخول' ? <Clock size={16} className="text-blue-500" /> : <Clock size={16} className="text-orange-500" />}
                            ختمة {p.type} - {p.date}
                          </div>
                          <div className="text-sm text-slate-500 mt-1">
                            <span className="font-medium">الوقت المطلوب:</span> {p.time}
                          </div>
                        </div>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                          p.status === 'موافق عليه' ? 'bg-green-100 text-green-700' :
                          p.status === 'مرفوض' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="text-sm bg-slate-50 p-2 rounded text-slate-600 mt-2 border border-slate-100">
                        {p.reason}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );"""

content = content.replace("      case 'hr_requests':", mp_render + "\n\n      case 'hr_requests':")

# 6. Add tab to nav menus
bottom_nav = """        <div className={`bottom-nav-item ${activeTab === 'hr_requests' ? 'active' : ''}`} onClick={() => handleTabChange('hr_requests')}>
          <Calendar size={18} />
          <span>المغادرات</span>
        </div>
        <div className={`bottom-nav-item ${activeTab === 'missing_punches' ? 'active' : ''}`} onClick={() => handleTabChange('missing_punches')}>
          <Fingerprint size={18} />
          <span>ختمات ناقصة</span>
        </div>"""
content = content.replace("""        <div className={`bottom-nav-item ${activeTab === 'hr_requests' ? 'active' : ''}`} onClick={() => handleTabChange('hr_requests')}>
          <Calendar size={18} />
          <span>المغادرات</span>
        </div>""", bottom_nav)

sidebar_nav = """            <div className={`admin-sidebar-item ${activeTab === 'hr_requests' ? 'active' : ''}`} onClick={() => handleTabChange('hr_requests')}>
              <Calendar size={22} /> <span>الإجازات والمغادرات</span>
            </div>
            <div className={`admin-sidebar-item ${activeTab === 'missing_punches' ? 'active' : ''}`} onClick={() => handleTabChange('missing_punches')}>
              <Fingerprint size={22} /> <span>الختمات الناقصة</span>
            </div>"""
content = content.replace("""            <div className={`admin-sidebar-item ${activeTab === 'hr_requests' ? 'active' : ''}`} onClick={() => handleTabChange('hr_requests')}>
              <Calendar size={22} /> <span>الإجازات والمغادرات</span>
            </div>""", sidebar_nav)

with open('src/pages/EmployeeDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
