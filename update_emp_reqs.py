import sys

filepath = r"c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\EmployeeDashboard.jsx"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Fix imports
if "Edit2" not in content:
    content = content.replace("Trash2,", "Trash2, Edit2,")

if "deleteHRLeave" not in content:
    content = content.replace("saveHRLeave, getMissingPunches", "saveHRLeave, deleteHRLeave, getMissingPunches")

if "deleteMissingPunch" not in content:
    content = content.replace("saveMissingPunch, saveHRAttendance", "saveMissingPunch, deleteMissingPunch, saveHRAttendance")

if "deleteHRAdvance" not in content:
    content = content.replace("saveHRAdvance, addLog", "saveHRAdvance, deleteHRAdvance, addLog")

# Replace allRequests
old_allRequests = """        const allRequests = [
          ...myLeaves.map(l => ({ id: l.id, type: l.type, date: l.startDate || l.date || l.createdAt?.split('T')[0], status: normalizeReqStatus(l.status), details: l.notes ? `السبب: ${l.notes}` : '' })),
          ...missingPunches.filter(p => String(p.employeeId) === String(user.id)).map(p => ({ id: p.id, type: `ختمة ناقصة (${p.type})`, date: p.date || p.createdAt?.split('T')[0], status: normalizeReqStatus(p.status), details: p.reason || p.time || '' })),
          ...myReports.map(r => ({ id: r.id, type: 'تقرير عمل يومي', date: r.date || r.createdAt?.split('T')[0], status: r.supervisorRating ? 'تم التقييم' : 'معلق', details: r.supervisorRating ? `تقييم المشرف: ${r.supervisorRating} (${Math.round(r.finalScore || 0)}%)` : 'معلق (بانتظار المشرف)' })),
          ...myAdvances.map(a => ({ id: a.id, type: a.type, date: a.date || a.createdAt?.split('T')[0], status: normalizeReqStatus(a.status), details: a.reason ? `${a.amount} د.أ - ${a.reason}` : `${a.amount} د.أ` }))
        ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));"""

new_allRequests = """        const allRequests = [
          ...myLeaves.map(l => ({ id: l.id, type: l.type, date: l.startDate || l.date || l.createdAt?.split('T')[0], status: normalizeReqStatus(l.status), details: l.notes ? `السبب: ${l.notes}` : '', originalReq: l, modelType: 'leave' })),
          ...missingPunches.filter(p => String(p.employeeId) === String(user.id)).map(p => ({ id: p.id, type: `ختمة ناقصة (${p.type})`, date: p.date || p.createdAt?.split('T')[0], status: normalizeReqStatus(p.status), details: p.reason || p.time || '', originalReq: p, modelType: 'punch' })),
          ...myReports.map(r => ({ id: r.id, type: 'تقرير عمل يومي', date: r.date || r.createdAt?.split('T')[0], status: r.supervisorRating ? 'تم التقييم' : 'معلق', details: r.supervisorRating ? `تقييم المشرف: ${r.supervisorRating} (${Math.round(r.finalScore || 0)}%)` : 'معلق (بانتظار المشرف)', originalReq: r, modelType: 'report' })),
          ...myAdvances.map(a => ({ id: a.id, type: a.type, date: a.date || a.createdAt?.split('T')[0], status: normalizeReqStatus(a.status), details: a.reason ? `${a.amount} د.أ - ${a.reason}` : `${a.amount} د.أ`, originalReq: a, modelType: 'advance' }))
        ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));"""

content = content.replace(old_allRequests, new_allRequests)

# Add headers
old_headers = """                      <th className="px-4 py-4 font-bold border-b-2 border-slate-300">التفاصيل</th>
                      <th className="px-4 py-4 font-bold border-b-2 border-slate-300 text-center">الحالة</th>
                    </tr>"""
new_headers = """                      <th className="px-4 py-4 font-bold border-b-2 border-slate-300">التفاصيل</th>
                      <th className="px-4 py-4 font-bold border-b-2 border-slate-300 text-center">الحالة</th>
                      <th className="px-4 py-4 font-bold border-b-2 border-slate-300 text-center">الإجراءات</th>
                    </tr>"""
content = content.replace(old_headers, new_headers)

# Add columns
old_columns = """                              {req.status}
                            </span>
                          </td>
                        </tr>"""
new_columns = """                              {req.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {req.status === 'معلق' ? (
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => handleEditRequest(req)} className="btn btn-outline p-1.5 text-blue-500 hover:bg-blue-50 border-transparent"><Edit2 size={16} /></button>
                                <button onClick={() => handleDeleteRequest(req)} className="btn btn-outline p-1.5 text-red-500 hover:bg-red-50 border-transparent"><Trash2 size={16} /></button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>"""
content = content.replace(old_columns, new_columns)

# Add handlers
handlers = """
  const handleEditRequest = (req) => {
    const original = req.originalReq;
    if (req.modelType === 'leave') {
      setLeaveFormData(original);
      setShowLeaveModal(true);
    } else if (req.modelType === 'punch') {
      setMissingPunchForm(original);
      setShowMissingPunchModal(true);
    } else if (req.modelType === 'advance') {
      setAdvanceForm(original);
      setShowAdvanceModal(true);
    } else if (req.modelType === 'report') {
      MySwal.fire('تنبيه', 'لا يمكن تعديل تقرير العمل من هنا، يمكنك إنشاء تقرير جديد.', 'info');
    }
  };

  const handleDeleteRequest = (req) => {
    MySwal.fire({
      title: 'هل أنت متأكد؟',
      text: "هل تريد حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف الطلب',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#ef4444'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          if (req.modelType === 'leave') await deleteHRLeave(req.id);
          else if (req.modelType === 'punch') await deleteMissingPunch(req.id);
          else if (req.modelType === 'advance') await deleteHRAdvance(req.id);
          
          MySwal.fire('تم الحذف', 'تم حذف الطلب بنجاح.', 'success').then(() => window.location.reload());
        } catch (error) {
          console.error(error);
          MySwal.fire('خطأ', 'حدث خطأ أثناء حذف الطلب', 'error');
        }
      }
    });
  };
"""

if "handleDeleteRequest" not in content:
    content = content.replace("const handleLogout = () => {", handlers + "\n  const handleLogout = () => {")

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
