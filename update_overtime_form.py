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

# EmployeeDashboard.jsx updates
ed_old_1 = """    const isDept = ['مغادرة خاصة', 'مغادرة عمل'].includes(leaveFormData.type);"""
ed_new_1 = """    const isDept = ['مغادرة خاصة', 'مغادرة عمل', 'بدل عمل إضافي'].includes(leaveFormData.type);"""

ed_old_2 = """                {['مغادرة خاصة', 'مغادرة عمل'].includes(leaveFormData.type) ? (
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
                    </div>"""
ed_new_2 = """                {['مغادرة خاصة', 'مغادرة عمل', 'بدل عمل إضافي'].includes(leaveFormData.type) ? (
                  <div className="space-y-4">
                    <div className="input-group">
                      <label>{leaveFormData.type === 'بدل عمل إضافي' ? 'تاريخ العمل الإضافي' : 'تاريخ المغادرة'}</label>
                      <Flatpickr 
                        value={leaveFormData.date} 
                        onChange={(dates, dateStr) => setLeaveFormData({...leaveFormData, date: dateStr})} 
                        className="input-field" 
                        options={{ 
                          dateFormat: 'Y-m-d',
                          maxDate: leaveFormData.type === 'بدل عمل إضافي' ? 'today' : null 
                        }}
                        placeholder="اختر التاريخ"
                      />
                    </div>"""

# HROvertime.jsx updates
hro_old_1 = """  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'بدل عمل إضافي',
    startDate: '',
    endDate: '',
    notes: '',
    status: 'معلق'
  });"""
hro_new_1 = """  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'بدل عمل إضافي',
    date: '',
    startTime: '',
    endTime: '',
    notes: '',
    status: 'معلق'
  });"""

hro_old_2 = """    if (!formData.startDate || !formData.endDate) {
      Swal.fire('تنبيه', 'الرجاء إدخال تاريخ البداية والنهاية للطلب', 'warning');
      return;
    }"""
hro_new_2 = """    if (!formData.date || !formData.startTime || !formData.endTime) {
      Swal.fire('تنبيه', 'الرجاء إدخال التاريخ ووقت البداية والنهاية للطلب', 'warning');
      return;
    }"""

hro_old_3 = """              <th>من تاريخ - إلى تاريخ</th>"""
hro_new_3 = """              <th>التاريخ والوقت</th>"""

hro_old_4 = """                <td className="text-muted text-sm" dir="ltr">
                  {leave.startDate} {leave.endDate ? ' - ' + leave.endDate : ''}
                </td>"""
hro_new_4 = """                <td className="text-muted text-sm" dir="ltr">
                  {leave.date ? `${leave.date} (${leave.startTime || ''} - ${leave.endTime || ''})` : `${leave.startDate || ''} ${leave.endDate ? ' - ' + leave.endDate : ''}`}
                </td>"""

hro_old_5 = """                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
hro_new_5 = """                <div className="space-y-4">
                  <div className="input-group">
                    <label>تاريخ العمل الإضافي</label>
                    <Flatpickr 
                      value={formData.date} 
                      onChange={(dates, dateStr) => setFormData({...formData, date: dateStr})} 
                      className="input-field" 
                      options={{ dateFormat: 'Y-m-d', maxDate: 'today' }}
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
                </div>"""

hro_old_6 = """        <button 
          onClick={() => {
            setFormData({ employeeId: '', type: 'بدل عمل إضافي', startDate: '', endDate: '', notes: '', status: 'معلق' });
            setShowModal(true);
          }}"""
hro_new_6 = """        <button 
          onClick={() => {
            setFormData({ employeeId: '', type: 'بدل عمل إضافي', date: '', startTime: '', endTime: '', notes: '', status: 'معلق' });
            setShowModal(true);
          }}"""

update_file('src/pages/EmployeeDashboard.jsx', [(ed_old_1, ed_new_1), (ed_old_2, ed_new_2)])
update_file('src/pages/hr/HROvertime.jsx', [
    (hro_old_1, hro_new_1),
    (hro_old_2, hro_new_2),
    (hro_old_3, hro_new_3),
    (hro_old_4, hro_new_4),
    (hro_old_5, hro_new_5),
    (hro_old_6, hro_new_6)
])
