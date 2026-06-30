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

# ==========================================
# 1. EmployeeDashboard.jsx updates
# ==========================================

old_leave_save = """  const handleSaveLeaveRequest = async (e) => {
    e.preventDefault();"""
new_leave_save = """  const handleSaveLeaveRequest = async (e) => {
    e.preventDefault();
    if (!leaveFormData.notes || leaveFormData.notes.trim() === '') {
      MySwal.fire('تنبيه', 'الرجاء إدخال السبب / الملاحظات لإتمام الطلب', 'warning');
      return;
    }"""

old_leave_form = """  const [leaveFormData, setLeaveFormData] = useState({ type: 'إجازة سنوية', startDate: '', endDate: '', duration: '', notes: '' });"""
new_leave_form = """  const [leaveFormData, setLeaveFormData] = useState({ type: 'إجازة سنوية', startDate: '', endDate: '', notes: '' });"""

old_leave_dropdown = """                <div className="input-group">
                  <label>نوع الطلب</label>
                  <select value={leaveFormData.type} onChange={e=>setLeaveFormData({...leaveFormData, type: e.target.value})} className="input-field" required>
                    {allowedLeaveTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>"""
new_leave_dropdown = """                {leaveFormData.type !== 'بدل عمل إضافي' && (
                <div className="input-group">
                  <label>نوع الطلب</label>
                  <select value={leaveFormData.type} onChange={e=>setLeaveFormData({...leaveFormData, type: e.target.value})} className="input-field" required>
                    {allowedLeaveTypes.filter(t => {
                      const isLeaveBtn = ['إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'].includes(leaveFormData.type);
                      const isDeptBtn = ['مغادرة خاصة', 'مغادرة عمل'].includes(leaveFormData.type);
                      if (isLeaveBtn) return ['إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'].includes(t);
                      if (isDeptBtn) return ['مغادرة خاصة', 'مغادرة عمل'].includes(t);
                      return true;
                    }).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                )}"""

old_leave_duration = """                <div className="input-group">
                  <label>المدة (أيام أو ساعات)</label>
                  <input type="text" placeholder="مثال: يومين، 3 ساعات" value={leaveFormData.duration} onChange={e=>setLeaveFormData({...leaveFormData, duration: e.target.value})} className="input-field" required />
                </div>"""
new_leave_duration = ""

# Since I removed "duration" from HRLeaves.jsx previously, we will do it here too

update_file('src/pages/EmployeeDashboard.jsx', [
    (old_leave_save, new_leave_save),
    (old_leave_form, new_leave_form),
    (old_leave_dropdown, new_leave_dropdown),
    (old_leave_duration, new_leave_duration),
    ("مغادرة شخصية", "مغادرة خاصة")
])

# ==========================================
# 2. HRLeaves.jsx updates
# ==========================================

old_hr_imports = """import { getEmployees, getHRLeaves, saveHRLeave, deleteHRLeave } from '../../store';"""
new_hr_imports = """import { getEmployees, getHRLeaves, saveHRLeave, deleteHRLeave, getMissingPunches, updateMissingPunchStatus, deleteMissingPunch } from '../../store';"""

old_hr_state = """  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'إجازة سنوية',
    startDate: '',
    endDate: '',
    duration: '',
    notes: '',
    status: 'معلق'
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });"""

new_hr_state = """  const [activeTab, setActiveTab] = useState('leaves');
  const [leaves, setLeaves] = useState([]);
  const [missingPunches, setMissingPunches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'إجازة سنوية',
    startDate: '',
    endDate: '',
    notes: '',
    status: 'معلق'
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });"""

old_hr_fetch = """  const fetchData = async () => {
    setLoading(true);
    const [leavesData, empsData] = await Promise.all([getHRLeaves(), getEmployees()]);
    setLeaves(leavesData);
    setEmployees(empsData);
    setLoading(false);
  };"""

new_hr_fetch = """  const fetchData = async () => {
    setLoading(true);
    const [leavesData, empsData, mpData] = await Promise.all([getHRLeaves(), getEmployees(), getMissingPunches()]);
    setLeaves(leavesData);
    setEmployees(empsData);
    setMissingPunches(mpData);
    setLoading(false);
  };"""

old_hr_delete = """  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: 'هل أنت متأكد؟',
      text: 'لن تتمكن من التراجع عن الحذف',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    });
    if (res.isConfirmed) {
      await deleteHRLeave(id);
      fetchData();
    }
  };"""

new_hr_delete = """  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: 'هل أنت متأكد؟',
      text: 'لن تتمكن من التراجع عن الحذف',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    });
    if (res.isConfirmed) {
      await deleteHRLeave(id);
      fetchData();
    }
  };

  const handleDeleteMp = async (id) => {
    const res = await Swal.fire({
      title: 'هل أنت متأكد؟',
      text: 'لن تتمكن من التراجع عن الحذف',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    });
    if (res.isConfirmed) {
      await deleteMissingPunch(id);
      fetchData();
    }
  };
  
  const handleMpStatusChange = async (id, newStatus, punchData) => {
    await updateMissingPunchStatus(id, newStatus, user?.name || 'المدير', punchData);
    fetchData();
  };"""

old_hr_render_start = """    <>
      <div className="glass-card flex flex-col min-h-[500px]">
        <div className="flex-responsive mb-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="text-primary" /> الإجازات والمغادرات
          </h2>
          <p className="text-muted text-sm mt-1">إدارة طلبات إجازات الموظفين واعتمادها</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ employeeId: '', type: 'إجازة سنوية', startDate: '', endDate: '', duration: '', notes: '', status: 'معلق' });
            setShowModal(true);
          }}
          className="premium-add-btn flex items-center gap-2 whitespace-nowrap"
        >
          <Plus size={18} /> تقديم طلب جديد
        </button>
      </div>

      <div className="table-responsive">"""

new_hr_render_start = """    <>
      <div className="flex gap-4 mb-6">
        <button className={`btn ${activeTab === 'leaves' ? 'btn-primary' : 'btn-outline bg-white'}`} onClick={() => setActiveTab('leaves')}>
          الإجازات والمغادرات والعمل الإضافي
        </button>
        <button className={`btn ${activeTab === 'missingpunches' ? 'btn-primary' : 'btn-outline bg-white'}`} onClick={() => setActiveTab('missingpunches')}>
          الختمات الناقصة
        </button>
      </div>

      {activeTab === 'leaves' && (
      <div className="glass-card flex flex-col min-h-[500px] animate-fade-in">
        <div className="flex-responsive mb-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="text-primary" /> الإجازات والمغادرات
          </h2>
          <p className="text-muted text-sm mt-1">إدارة طلبات إجازات ومغادرات وعمل الموظفين الإضافي</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ employeeId: '', type: 'إجازة سنوية', startDate: '', endDate: '', notes: '', status: 'معلق' });
            setShowModal(true);
          }}
          className="premium-add-btn flex items-center gap-2 whitespace-nowrap"
        >
          <Plus size={18} /> تقديم طلب جديد
        </button>
      </div>

      <div className="table-responsive">"""

old_hr_duration_col = """              <th className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('duration')}>
                <div className="flex items-center gap-2">المدة {renderSortIcon('duration')}</div>
              </th>"""
new_hr_duration_col = ""

old_hr_duration_td = """                <td>{leave.duration}</td>"""
new_hr_duration_td = ""

old_hr_end_table = """          </tbody>
        </table>
      </div>
      </div>"""

new_hr_end_table = """          </tbody>
        </table>
      </div>
      </div>
      )}

      {activeTab === 'missingpunches' && (
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

old_hr_modal_duration = """                <div className="input-group">
                  <label>المدة (أيام أو ساعات)</label>
                  <input type="text" placeholder="مثال: يومين، 3 ساعات" value={formData.duration} onChange={e=>setFormData({...formData, duration: e.target.value})} className="input-field" />
                </div>"""
new_hr_modal_duration = ""

update_file('src/pages/hr/HRLeaves.jsx', [
    (old_hr_imports, new_hr_imports),
    (old_hr_state, new_hr_state),
    (old_hr_fetch, new_hr_fetch),
    (old_hr_delete, new_hr_delete),
    (old_hr_render_start, new_hr_render_start),
    (old_hr_duration_col, new_hr_duration_col),
    (old_hr_duration_td, new_hr_duration_td),
    (old_hr_end_table, new_hr_end_table),
    (old_hr_modal_duration, new_hr_modal_duration)
])

print("Files updated successfully.")
