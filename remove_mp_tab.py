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

old_hr_tabs = """      <div className="flex gap-4 mb-6">
        <button className={`btn ${activeTab === 'leaves' ? 'btn-primary' : 'btn-outline bg-white'}`} onClick={() => setActiveTab('leaves')}>
          الإجازات والمغادرات
        </button>
        <button className={`btn ${activeTab === 'overtime' ? 'btn-primary' : 'btn-outline bg-white'}`} onClick={() => setActiveTab('overtime')}>
          العمل الإضافي
        </button>
        <button className={`btn ${activeTab === 'missingpunches' ? 'btn-primary' : 'btn-outline bg-white'}`} onClick={() => setActiveTab('missingpunches')}>
          الختمات الناقصة
        </button>
      </div>

      {(activeTab === 'leaves' || activeTab === 'overtime') && ("""

new_hr_tabs = """      <div className="flex gap-4 mb-6">
        <button className={`btn ${activeTab === 'leaves' ? 'btn-primary' : 'btn-outline bg-white'}`} onClick={() => setActiveTab('leaves')}>
          الإجازات والمغادرات
        </button>
        <button className={`btn ${activeTab === 'overtime' ? 'btn-primary' : 'btn-outline bg-white'}`} onClick={() => setActiveTab('overtime')}>
          العمل الإضافي
        </button>
      </div>

      {(activeTab === 'leaves' || activeTab === 'overtime') && ("""

old_mp_block = """      {activeTab === 'missingpunches' && (
      <div className="glass-card flex flex-col min-h-[500px] animate-fade-in">
        <div className="mb-4 border-b pb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Clock className="text-primary" /> الختمات الناقصة
          </h2>
          <p className="text-muted text-sm mt-1">إدارة واعتماد طلبات الختمات الناقصة للموظفين</p>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>تاريخ الطلب</th>
                <th>الموظف</th>
                <th>القسم</th>
                <th>النوع والتاريخ</th>
                <th>الوقت المفقود</th>
                <th>السبب</th>
                <th>الحالة</th>
                <th>إجراءات الإدارة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {missingPunches.map((mp) => (
                <tr key={mp.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="text-muted text-sm">{new Date(mp.createdAt).toLocaleDateString('ar-EG')}</td>
                  <td className="font-semibold">{mp.employeeName}</td>
                  <td className="text-muted text-sm">{mp.department || 'غير محدد'}</td>
                  <td>
                    <span className="font-bold text-slate-700">{mp.type}</span><br/>
                    <span className="text-xs text-slate-400">{mp.date}</span>
                  </td>
                  <td className="font-mono font-bold">{mp.time}</td>
                  <td className="max-w-[200px] whitespace-normal text-sm">{mp.reason}</td>
                  <td>
                    <span className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 w-fit ${
                      mp.status === 'موافق' ? 'bg-emerald-50 text-emerald-600' :
                      mp.status === 'مرفوض' ? 'bg-rose-50 text-rose-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {mp.status === 'موافق' && <CheckCircle size={12} />}
                      {mp.status === 'مرفوض' && <XCircle size={12} />}
                      {mp.status === 'قيد المراجعة' && <Clock size={12} />}
                      {mp.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {mp.status === 'قيد المراجعة' && (
                        <>
                          <button onClick={() => handleMpStatusChange(mp.id, 'موافق', mp)} className="btn btn-outline btn-sm text-emerald-600" style={{ borderColor: '#059669' }}>موافقة</button>
                          <button onClick={() => handleMpStatusChange(mp.id, 'مرفوض', mp)} className="btn btn-outline btn-sm text-rose-600" style={{ borderColor: '#e11d48' }}>رفض</button>
                        </>
                      )}
                      <button onClick={() => handleDeleteMp(mp.id)} className="icon-btn icon-btn-delete">حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
              {missingPunches.length === 0 && (
                <tr><td colSpan="8" className="py-10 text-center text-muted">لا توجد طلبات ختمات ناقصة حالياً</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}"""

new_mp_block = ""

update_file('src/pages/hr/HRLeaves.jsx', [
    (old_hr_tabs, new_hr_tabs),
    (old_mp_block, new_mp_block)
])
