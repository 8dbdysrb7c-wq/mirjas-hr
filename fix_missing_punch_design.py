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

old_modal = """      {/* Missing Punch Modal */}
      {showMissingPunchModal && (
        <div className="fixed inset-0 z-[10500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
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
      )}"""

new_modal = """      {/* Missing Punch Modal */}
      {showMissingPunchModal && (
        <div className="modal-overlay" style={{ zIndex: 10500 }}>
          <div className="modal-content" style={{ maxWidth: '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-lg text-slate-800">طلب ختمة ناقصة</h3>
              <button type="button" onClick={() => setShowMissingPunchModal(false)} className="icon-btn hover:bg-gray-100 rounded-full p-2 transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <form onSubmit={handleSaveMissingPunch} className="space-y-4">
                <div className="input-group">
                  <label>التاريخ</label>
                  <input type="date" className="input-field" required value={missingPunchForm.date} onChange={e => setMissingPunchForm({...missingPunchForm, date: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="input-group">
                    <label>نوع الختمة</label>
                    <select className="input-field" value={missingPunchForm.type} onChange={e => setMissingPunchForm({...missingPunchForm, type: e.target.value})}>
                      <option value="دخول">دخول</option>
                      <option value="خروج">خروج</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>الوقت</label>
                    <input type="time" className="input-field" required value={missingPunchForm.time} onChange={e => setMissingPunchForm({...missingPunchForm, time: e.target.value})} />
                  </div>
                </div>
                <div className="input-group">
                  <label>سبب عدم تسجيل الختمة</label>
                  <textarea rows={2} className="input-field" required placeholder="اذكر السبب بوضوح..." value={missingPunchForm.reason} onChange={e => setMissingPunchForm({...missingPunchForm, reason: e.target.value})}></textarea>
                </div>
                <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-gray-100">
                  <button type="button" onClick={() => setShowMissingPunchModal(false)} className="btn btn-outline">إلغاء</button>
                  <button type="submit" className="btn btn-primary">إرسال الطلب</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}"""

update_file('src/pages/EmployeeDashboard.jsx', [(old_modal, new_modal)])
