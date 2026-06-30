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

old_emp_state = """  const [leaveFormData, setLeaveFormData] = useState({
    type: 'إجازة سنوية', startDate: '', endDate: '', notes: '', status: 'معلق'
  });"""
new_emp_state = """  const [leaveFormData, setLeaveFormData] = useState({
    type: 'إجازة سنوية', startDate: '', endDate: '', date: '', startTime: '', endTime: '', notes: '', status: 'معلق'
  });"""

old_emp_save = """  const handleSaveLeaveRequest = async (e) => {
    e.preventDefault();
    if (!leaveFormData.notes || leaveFormData.notes.trim() === '') {
      MySwal.fire('تنبيه', 'الرجاء إدخال السبب / الملاحظات لإتمام الطلب', 'warning');
      return;
    }"""
new_emp_save = """  const handleSaveLeaveRequest = async (e) => {
    e.preventDefault();
    if (!leaveFormData.notes || leaveFormData.notes.trim() === '') {
      MySwal.fire('تنبيه', 'الرجاء إدخال السبب / الملاحظات لإتمام الطلب', 'warning');
      return;
    }
    
    const isDept = ['مغادرة خاصة', 'مغادرة عمل'].includes(leaveFormData.type);
    if (isDept) {
      if (!leaveFormData.date || !leaveFormData.startTime || !leaveFormData.endTime) {
        MySwal.fire('تنبيه', 'الرجاء إدخال التاريخ ووقت البداية والنهاية للمغادرة', 'warning');
        return;
      }
    } else {
      if (!leaveFormData.startDate || !leaveFormData.endDate) {
        MySwal.fire('تنبيه', 'الرجاء إدخال تاريخ البداية والنهاية للطلب', 'warning');
        return;
      }
    }"""

old_emp_modal_dates = """                <div className="grid grid-cols-2 gap-3">
                  <div className="input-group">
                    <label>من تاريخ</label>
                    <Flatpickr 
                      value={leaveFormData.startDate} 
                      onChange={(dates, dateStr) => setLeaveFormData({...leaveFormData, startDate: dateStr})} 
                      className="input-field" 
                      options={{ dateFormat: 'Y-m-d' }}
                      placeholder="اختر التاريخ"
                    />
                  </div>
                  <div className="input-group">
                    <label>إلى تاريخ</label>
                    <Flatpickr 
                      value={leaveFormData.endDate} 
                      onChange={(dates, dateStr) => setLeaveFormData({...leaveFormData, endDate: dateStr})} 
                      className="input-field" 
                      options={{ dateFormat: 'Y-m-d' }}
                      placeholder="اختر التاريخ"
                    />
                  </div>
                </div>"""
new_emp_modal_dates = """                {['مغادرة خاصة', 'مغادرة عمل'].includes(leaveFormData.type) ? (
                  <div className="space-y-4">
                    <div className="input-group">
                      <label>تاريخ المغادرة</label>
                      <Flatpickr 
                        value={leaveFormData.date} 
                        onChange={(dates, dateStr) => setLeaveFormData({...leaveFormData, date: dateStr})} 
                        className="input-field" 
                        options={{ dateFormat: 'Y-m-d' }}
                        placeholder="اختر التاريخ"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="input-group">
                        <label>من الساعة</label>
                        <input type="time" value={leaveFormData.startTime} onChange={e=>setLeaveFormData({...leaveFormData, startTime: e.target.value})} className="input-field" required />
                      </div>
                      <div className="input-group">
                        <label>إلى الساعة</label>
                        <input type="time" value={leaveFormData.endTime} onChange={e=>setLeaveFormData({...leaveFormData, endTime: e.target.value})} className="input-field" required />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="input-group">
                      <label>من تاريخ</label>
                      <Flatpickr 
                        value={leaveFormData.startDate} 
                        onChange={(dates, dateStr) => setLeaveFormData({...leaveFormData, startDate: dateStr})} 
                        className="input-field" 
                        options={{ dateFormat: 'Y-m-d' }}
                        placeholder="اختر التاريخ"
                      />
                    </div>
                    <div className="input-group">
                      <label>إلى تاريخ</label>
                      <Flatpickr 
                        value={leaveFormData.endDate} 
                        onChange={(dates, dateStr) => setLeaveFormData({...leaveFormData, endDate: dateStr})} 
                        className="input-field" 
                        options={{ dateFormat: 'Y-m-d' }}
                        placeholder="اختر التاريخ"
                      />
                    </div>
                  </div>
                )}"""

old_emp_table_th = """                      <th className="p-3">التاريخ</th>
                      <th className="p-3">نوع الطلب</th>
                      <th className="p-3">المدة</th>
                      <th className="p-3">الحالة</th>"""
new_emp_table_th = """                      <th className="p-3">تاريخ التقديم</th>
                      <th className="p-3">نوع الطلب</th>
                      <th className="p-3">من - إلى</th>
                      <th className="p-3">الحالة</th>"""

old_emp_table_td = """                        <td className="p-3 text-sm text-slate-600">{new Date(leave.createdAt).toLocaleDateString('ar-EG')}</td>
                        <td className="p-3 font-semibold text-slate-800">{leave.type}</td>
                        <td className="p-3 text-sm text-slate-600">{leave.duration || '-'}</td>"""
new_emp_table_td = """                        <td className="p-3 text-sm text-slate-600">{new Date(leave.createdAt).toLocaleDateString('ar-EG')}</td>
                        <td className="p-3 font-semibold text-slate-800">{leave.type}</td>
                        <td className="p-3 text-sm text-slate-600" dir="ltr">
                          {leave.date ? `${leave.date} (${leave.startTime} - ${leave.endTime})` : `${leave.startDate || ''} ${leave.endDate ? ' - ' + leave.endDate : ''}`}
                        </td>"""

update_file('src/pages/EmployeeDashboard.jsx', [
    (old_emp_state, new_emp_state),
    (old_emp_save, new_emp_save),
    (old_emp_modal_dates, new_emp_modal_dates),
    (old_emp_table_th, new_emp_table_th),
    (old_emp_table_td, new_emp_table_td)
])


# ==========================================
# 2. HRLeaves.jsx updates
# ==========================================

old_hr_state = """  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'إجازة سنوية',
    startDate: '',
    endDate: '',
    notes: '',
    status: 'معلق'
  });"""
new_hr_state = """  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'إجازة سنوية',
    startDate: '',
    endDate: '',
    date: '',
    startTime: '',
    endTime: '',
    notes: '',
    status: 'معلق'
  });"""

old_hr_save = """  const handleSave = async (e) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === formData.employeeId);"""
new_hr_save = """  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.notes || formData.notes.trim() === '') {
      Swal.fire('تنبيه', 'الرجاء إدخال السبب / الملاحظات', 'warning');
      return;
    }
    const isDept = ['مغادرة خاصة', 'مغادرة عمل'].includes(formData.type);
    if (isDept) {
      if (!formData.date || !formData.startTime || !formData.endTime) {
        Swal.fire('تنبيه', 'الرجاء إدخال التاريخ ووقت البداية والنهاية للمغادرة', 'warning');
        return;
      }
    } else {
      if (!formData.startDate || !formData.endDate) {
        Swal.fire('تنبيه', 'الرجاء إدخال تاريخ البداية والنهاية للطلب', 'warning');
        return;
      }
    }
    const emp = employees.find(e => e.id === formData.employeeId);"""

old_hr_modal_dates = """                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label>من تاريخ</label>
                    <Flatpickr 
                      value={formData.startDate} 
                      onChange={(dates, dateStr) => setFormData({...formData, startDate: dateStr})} 
                      className="input-field" 
                      options={{ dateFormat: 'Y-m-d' }}
                      placeholder="اختر التاريخ"
                    />
                  </div>
                  <div className="input-group">
                    <label>إلى تاريخ</label>
                    <Flatpickr 
                      value={formData.endDate} 
                      onChange={(dates, dateStr) => setFormData({...formData, endDate: dateStr})} 
                      className="input-field" 
                      options={{ dateFormat: 'Y-m-d' }}
                      placeholder="اختر التاريخ"
                    />
                  </div>
                </div>"""
new_hr_modal_dates = """                {['مغادرة خاصة', 'مغادرة عمل'].includes(formData.type) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="input-group">
                      <label>تاريخ المغادرة</label>
                      <Flatpickr 
                        value={formData.date} 
                        onChange={(dates, dateStr) => setFormData({...formData, date: dateStr})} 
                        className="input-field" 
                        options={{ dateFormat: 'Y-m-d' }}
                        placeholder="اختر التاريخ"
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="input-group">
                        <label>من الساعة</label>
                        <input type="time" value={formData.startTime} onChange={e=>setFormData({...formData, startTime: e.target.value})} className="input-field" required />
                      </div>
                      <div className="input-group">
                        <label>إلى الساعة</label>
                        <input type="time" value={formData.endTime} onChange={e=>setFormData({...formData, endTime: e.target.value})} className="input-field" required />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="input-group">
                      <label>من تاريخ</label>
                      <Flatpickr 
                        value={formData.startDate} 
                        onChange={(dates, dateStr) => setFormData({...formData, startDate: dateStr})} 
                        className="input-field" 
                        options={{ dateFormat: 'Y-m-d' }}
                        placeholder="اختر التاريخ"
                      />
                    </div>
                    <div className="input-group">
                      <label>إلى تاريخ</label>
                      <Flatpickr 
                        value={formData.endDate} 
                        onChange={(dates, dateStr) => setFormData({...formData, endDate: dateStr})} 
                        className="input-field" 
                        options={{ dateFormat: 'Y-m-d' }}
                        placeholder="اختر التاريخ"
                      />
                    </div>
                  </div>
                )}"""

old_hr_table_td = """                <td className="text-muted text-sm">{leave.startDate} {leave.endDate ? `إلى ${leave.endDate}` : ''}</td>"""
new_hr_table_td = """                <td className="text-muted text-sm" dir="ltr">
                  {leave.date ? `${leave.date} (${leave.startTime} - ${leave.endTime})` : `${leave.startDate || ''} ${leave.endDate ? ' - ' + leave.endDate : ''}`}
                </td>"""

update_file('src/pages/hr/HRLeaves.jsx', [
    (old_hr_state, new_hr_state),
    (old_hr_save, new_hr_save),
    (old_hr_modal_dates, new_hr_modal_dates),
    (old_hr_table_td, new_hr_table_td)
])

print("Modals updated with Departure specific date/time!")
