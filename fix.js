const fs = require('fs');
const file = 'c:\\Users\\a.awwad\\.gemini\\antigravity\\mirjas-hr\\src\\pages\\EmployeeDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// I know that the component ends around line 2000.
// Let's grab the content up to `<div className="input-group">\n                  <label>سبب عدم تسجيل الختمة</label>`
// and then just append the rest of the file correctly.

const splitPoint = '                  <label>سبب عدم تسجيل الختمة</label>';
const parts = content.split(splitPoint);

if (parts.length > 1) {
  const top = parts[0] + splitPoint;
  
  // The rest of the missing punch modal:
  const missingPunchRest = `
                  <textarea rows={2} className="input-field" required placeholder="اذكر السبب بوضوح..." value={missingPunchForm.reason} onChange={e => setMissingPunchForm({...missingPunchForm, reason: e.target.value})}></textarea>
                </div>
                <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-gray-100">
                  <button type="button" onClick={() => setShowMissingPunchModal(false)} className="btn btn-outline">إلغاء</button>
                  <button type="submit" disabled={isRequestSubmitting} className="btn btn-primary">{isRequestSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Leave Request Modal */}
      {showLeaveModal && (
        <div className="modal-overlay" style={{ zIndex: 10500 }}>
          <div className="modal-content" style={{ maxWidth: '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-lg text-slate-800">
                {['إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'].includes(leaveFormData.type) ? 'تقديم طلب إجازة' : 
                 leaveFormData.type === 'بدل عمل إضافي' ? 'تقديم بدل عمل إضافي' : 'تقديم طلب مغادرة'}
              </h3>
              <button type="button" onClick={() => setShowLeaveModal(false)} className="icon-btn hover:bg-gray-100 rounded-full p-2 transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <form onSubmit={handleSaveLeaveRequest} className="space-y-4">
              
              {/* Balances Display */}
              {['إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'].includes(leaveFormData.type) && (
                <>
                  <div className="flex gap-3 mb-4">
                    {leaveFormData.type === 'إجازة سنوية' && allowedLeaveTypes.includes('إجازة سنوية') && (
                      <div className="flex-1 bg-blue-50 border border-blue-100 rounded-xl p-3 text-center shadow-sm">
                        <div className="text-xs text-blue-600 mb-1 font-bold">رصيد الإجازة السنوية</div>
                        <div className="text-xl font-black text-blue-800">{calculatedVacationBalance} <span className="text-sm font-normal">يوم</span></div>
                      </div>
                    )}
                    {leaveFormData.type === 'إجازة مرضية' && allowedLeaveTypes.includes('إجازة مرضية') && (
                      <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center shadow-sm">
                        <div className="text-xs text-emerald-600 mb-1 font-bold">رصيد الإجازة المرضية</div>
                        <div className="text-xl font-black text-emerald-800">{calculatedSickBalance} <span className="text-sm font-normal">يوم</span></div>
                      </div>
                    )}
                  </div>
                  {leaveFormData.type === 'إجازة غير مدفوعة' && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl mb-4 text-sm flex gap-2 items-center">
                      <Info size={16} className="text-amber-600 shrink-0" />
                      ملاحظة: الإجازة غير المدفوعة سوف تُخصم من راتبك القادم.
                    </div>
                  )}
                </>
              )}
                {leaveFormData.type !== 'بدل عمل إضافي' && (
                <div className="input-group">
                  <label>نوع الطلب</label>
                  <select value={leaveFormData.type} onChange={e=>setLeaveFormData({...leaveFormData, type: e.target.value})} className="input-field" required>
                    {['مغادرة خاصة', 'مغادرة عمل', 'إذن تأخير', 'خروج مبكر'].includes(leaveFormData.type) ? (
                      allowedLeaveTypes.filter(t => ['مغادرة خاصة', 'مغادرة عمل', 'إذن تأخير', 'خروج مبكر'].includes(t)).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))
                    ) : (
                      allowedLeaveTypes.filter(t => ['إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'].includes(t)).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))
                    )}
                  </select>
                </div>
                )}
                
                {leaveFormData.type === 'مغادرة خاصة' && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl mb-4 text-sm flex gap-2 items-center">
                    <Info size={16} className="text-amber-600 shrink-0" />
                    ملاحظة: المغادرة الخاصة سوف تُخصم من راتبك القادم.
                  </div>
                )}
                {leaveFormData.type === 'بدل عمل إضافي' && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-xl mb-4 text-sm flex gap-2 items-center">
                    <Info size={16} className="text-blue-600 shrink-0" />
                    ملاحظة: العمل الإضافي يجب أن يكون حصراً خارج أوقات الدوام الرسمي.
                  </div>
                )}
                {['مغادرة خاصة', 'مغادرة عمل', 'إذن تأخير', 'خروج مبكر', 'بدل عمل إضافي'].includes(leaveFormData.type) ? (
                  <div className="space-y-4">
                    <div className="input-group">
                      <label>{leaveFormData.type === 'بدل عمل إضافي' ? 'تاريخ العمل الإضافي' : 'تاريخ المغادرة'}</label>
                      <Flatpickr 
                        value={leaveFormData.date} 
                        onChange={(dates, dateStr) => setLeaveFormData({...leaveFormData, date: dateStr})} 
                        className="input-field w-full bg-white" 
                        options={{ 
                          ...defaultDatePickerOptions,
                          minDate: new Date(new Date().setDate(new Date().getDate() - 2)),
                          maxDate: leaveFormData.type === 'بدل عمل إضافي' ? 'today' : new Date(new Date().setDate(new Date().getDate() + 7))
                        }}
                        placeholder="اختر التاريخ"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="input-group">
                        <label>من الساعة</label>
                        <input 
                          type="time"
                          className="input-field w-full bg-white text-slate-800" 
                          value={leaveFormData.startTime || ''} 
                          onChange={(e) => setLeaveFormData({...leaveFormData, startTime: e.target.value})} 
                          required 
                        />
                      </div>
                      <div className="input-group">
                        <label>إلى الساعة</label>
                        <input 
                          type="time"
                          className="input-field w-full bg-white text-slate-800" 
                          value={leaveFormData.endTime || ''} 
                          onChange={(e) => setLeaveFormData({...leaveFormData, endTime: e.target.value})} 
                          required 
                        />
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
                        className="input-field w-full bg-white" 
                        options={{ ...defaultDatePickerOptions }}
                        placeholder="اختر التاريخ"
                        required
                      />
                    </div>
                    <div className="input-group">
                      <label>إلى تاريخ</label>
                      <Flatpickr 
                        value={leaveFormData.endDate} 
                        onChange={(dates, dateStr) => setLeaveFormData({...leaveFormData, endDate: dateStr})} 
                        className="input-field w-full bg-white" 
                        options={{ ...defaultDatePickerOptions }}
                        placeholder="اختر التاريخ"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="input-group">
                  <label>ملاحظات / السبب</label>
                  <textarea rows={2} value={leaveFormData.notes} onChange={e=>setLeaveFormData({...leaveFormData, notes: e.target.value})} className="input-field" required></textarea>
                </div>
                <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-gray-100">
                  <button type="button" onClick={() => setShowLeaveModal(false)} className="btn btn-outline">إلغاء</button>
                  <button type="submit" disabled={isRequestSubmitting} className="btn btn-primary">{isRequestSubmitting ? 'جاري الحفظ...' : 'حفظ الطلب'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
`;

  // Find where to resume the file. We need to skip the mangled part.
  const regex = /<label>ملاحظات \/ السبب<\/label>[\s\S]*?<\/div>\n\s*\} \/\* End of render \*\/ \n/m;
  const bottomPartSplit = parts[1].split('<label>ملاحظات / السبب</label>');
  
  let restOfFile = '';
  if (bottomPartSplit.length > 1) {
     // Wait, the bottom part starts with `                  <textarea rows={2}...` which we already included in our missingPunchRest.
     // The bottomPartSplit[1] would contain the textarea of leave modal.
     // But wait, there are two instances of `<label>ملاحظات / السبب</label>` in EmployeeDashboard? Wait, there might be one for advance and one for leave.
     // The best is to find the Advance Modal and resume from there.
     
     const advanceModalSplit = content.split('{/* Advance Request Modal */}');
     if (advanceModalSplit.length > 1) {
         restOfFile = '\\n      {/* Advance Request Modal */}' + advanceModalSplit[1];
         fs.writeFileSync(file, top + missingPunchRest + restOfFile);
         console.log('Fixed file.');
     } else {
         console.log('Could not find advance modal split.');
     }
  } else {
     console.log('Could not find split.');
  }

} else {
  console.log('Split point not found');
}
