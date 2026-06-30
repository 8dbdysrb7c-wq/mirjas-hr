import re

file_path = "c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/pages/EmployeeDashboard.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Merge hr_requests_history into hr_requests
# The old block looks like:
#       case 'hr_requests_history':
#         return (
#           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="animate-fade-in space-y-6">
#             <div className="section-title mb-4 flex items-center gap-2">
#               <FileText size={20} className="text-primary" />
#               <span>سجل الطلبات والتقارير المقدمة</span>
#             ...
#             </div>
#           </motion.div>
#         );

if "case 'hr_requests_history':" in content:
    history_start = content.find("case 'hr_requests_history':")
    history_end = content.find("        );", history_start) + 10
    history_block = content[history_start:history_end]
    
    # Extract just the UI part we want (the div containing the section-title)
    ui_start = history_block.find('<div className="section-title')
    ui_end = history_block.rfind('</motion.div>')
    history_ui = history_block[ui_start:ui_end].strip()
    
    # Remove the old hr_requests_history case
    content = content[:history_start] + content[history_end:]
    
    # Insert history_ui into hr_requests, right before its </motion.div>
    hr_start = content.find("case 'hr_requests':")
    hr_end = content.find("</motion.div>", hr_start)
    
    content = content[:hr_end] + "\n            {/* History Table */}\n            " + history_ui + "\n          " + content[hr_end:]

# 2. Add Arabic locale to Flatpickr
if "import { Arabic }" not in content:
    content = content.replace("import Flatpickr from 'react-flatpickr';", "import Flatpickr from 'react-flatpickr';\nimport { Arabic } from 'flatpickr/dist/l10n/ar.js';")

# 3. Replace <input type="time"> with Flatpickr for Missing Punch
old_missing_punch_time = '<input type="time" className="input-field" required value={missingPunchForm.time} onChange={e => setMissingPunchForm({...missingPunchForm, time: e.target.value})} />'
new_missing_punch_time = """<Flatpickr 
                      className="input-field" 
                      value={missingPunchForm.time} 
                      onChange={([d]) => setMissingPunchForm({...missingPunchForm, time: d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''})} 
                      options={{ enableTime: true, noCalendar: true, dateFormat: "h:i K", locale: Arabic, disableMobile: true }} 
                      placeholder="اختر الوقت" 
                      required 
                    />"""
content = content.replace(old_missing_punch_time, new_missing_punch_time)

# 4. Replace <input type="time"> with Flatpickr for Leave Start Time
old_leave_start_time = '<input type="time" value={leaveFormData.startTime} onChange={e=>setLeaveFormData({...leaveFormData, startTime: e.target.value})} className="input-field" required />'
new_leave_start_time = """<Flatpickr 
                          className="input-field" 
                          value={leaveFormData.startTime} 
                          onChange={([d]) => setLeaveFormData({...leaveFormData, startTime: d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''})} 
                          options={{ enableTime: true, noCalendar: true, dateFormat: "h:i K", locale: Arabic, disableMobile: true }} 
                          placeholder="وقت البداية" 
                          required 
                        />"""
content = content.replace(old_leave_start_time, new_leave_start_time)

# 5. Replace <input type="time"> with Flatpickr for Leave End Time
old_leave_end_time = '<input type="time" value={leaveFormData.endTime} onChange={e=>setLeaveFormData({...leaveFormData, endTime: e.target.value})} className="input-field" required />'
new_leave_end_time = """<Flatpickr 
                          className="input-field" 
                          value={leaveFormData.endTime} 
                          onChange={([d]) => setLeaveFormData({...leaveFormData, endTime: d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''})} 
                          options={{ enableTime: true, noCalendar: true, dateFormat: "h:i K", locale: Arabic, disableMobile: true }} 
                          placeholder="وقت النهاية" 
                          required 
                        />"""
content = content.replace(old_leave_end_time, new_leave_end_time)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Applied UI fixes to EmployeeDashboard.jsx")
