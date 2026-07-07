const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'hr', 'HROvertime.jsx');

if (!fs.existsSync(filePath)) {
  console.error("❌ File not found");
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Add getHRAttendance import
if (!content.includes('getHRAttendance')) {
  content = content.replace('import { getEmployees, getHRLeaves, saveHRLeave, deleteHRLeave, getGlobalSettings } from \'../../store\';', 
    'import { getEmployees, getHRLeaves, saveHRLeave, deleteHRLeave, getGlobalSettings, getHRAttendance } from \'../../store\';');
}

// 2. Add smartModal state and openSmartApproval logic right after useStates
if (!content.includes('smartModal')) {
  const insertIndex = content.indexOf('const [pickerYear');
  if (insertIndex > -1) {
    const nextLineBreak = content.indexOf('\n', insertIndex);
    const logic = `
  const [smartModal, setSmartModal] = useState({ show: false, leave: null, attendance: null, deficitMins: 0, requestedMins: 0, loading: false });

  const openSmartApproval = async (leave) => {
    setSmartModal({ show: true, leave, attendance: null, deficitMins: 0, requestedMins: 0, loading: true });
    
    // Calculate requested minutes
    let reqMins = 0;
    if (leave.startTime && leave.endTime) {
      const [sh, sm] = leave.startTime.split(':').map(Number);
      const [eh, em] = leave.endTime.split(':').map(Number);
      reqMins = (eh * 60 + em) - (sh * 60 + sm);
    } else {
      reqMins = 8 * 60; // Default full day
    }
    
    // Fetch attendance for the employee on that day
    let attendanceData = null;
    let defMins = 0;
    try {
      const attList = await getHRAttendance();
      attendanceData = attList.find(a => String(a.employeeId) === String(leave.employeeId) && a.date === leave.date);
      
      const emp = employees.find(e => String(e.id) === String(leave.employeeId) || String(e.employeeId) === String(leave.employeeId));
      let shiftStart = emp?.shiftStart || '08:00';
      let shiftEnd = emp?.shiftEnd || '16:00';
      
      try {
        const settings = await getGlobalSettings();
        if (emp?.workShiftName && settings.workShifts) {
          const shift = settings.workShifts.find(s => s.name === emp.workShiftName);
          if (shift) { shiftStart = shift.startTime; shiftEnd = shift.endTime; }
        }
      } catch(e) {}
      
      const [ssh, ssm] = shiftStart.split(':').map(Number);
      const [seh, sem] = shiftEnd.split(':').map(Number);
      const shiftMins = (seh * 60 + sem) - (ssh * 60 + ssm);

      if (attendanceData && attendanceData.timeIn && attendanceData.timeOut && attendanceData.timeOut !== '--:--') {
        const [ah, am] = attendanceData.timeIn.split(':').map(Number);
        const [oh, om] = attendanceData.timeOut.split(':').map(Number);
        
        const actualMins = (oh * 60 + om) - (ah * 60 + am);
        
        // Calculate deficit
        if (actualMins < shiftMins) {
           defMins = shiftMins - actualMins;
        }
      } else {
        const lDate = new Date(leave.date);
        if (lDate.getDay() !== 5) { // Assuming Friday is weekend
           defMins = shiftMins; // full day deficit
        }
      }
    } catch (err) {
      console.error(err);
    }
    
    setSmartModal({
      show: true,
      leave,
      attendance: attendanceData,
      deficitMins: defMins,
      requestedMins: reqMins,
      loading: false
    });
  };

  const confirmSmartApproval = async () => {
    const { leave, deficitMins, requestedMins } = smartModal;
    
    // Check if it's weekend
    const lDate = new Date(leave.date);
    const isHoliday = lDate.getDay() === 5; // simplified holiday check (Friday)
    
    let baseRate = isHoliday ? '1:1.5' : '1:1.25';
    if(leave.rate) baseRate = leave.rate; // Respect original if set explicitly
    
    let compMins = 0; // Compensating (1:1)
    let extraMins = 0; // Pure overtime
    
    if (deficitMins > 0) {
      if (requestedMins <= deficitMins) {
        compMins = requestedMins;
      } else {
        compMins = deficitMins;
        extraMins = requestedMins - deficitMins;
      }
    } else {
      extraMins = requestedMins;
    }
    
    const compHoursStr = compMins > 0 ? \`\${Math.floor(compMins/60)} ساعة و \${compMins%60} دقيقة (بمعدل 1:1 لتغطية العجز)\` : '';
    const extraHoursStr = extraMins > 0 ? \`\${Math.floor(extraMins/60)} ساعة و \${extraMins%60} دقيقة (بمعدل \${baseRate})\` : '';
    
    let splitNotes = \`\\n\\n-- تفاصيل الاحتساب الذكي --\\n\`;
    if(compMins > 0) splitNotes += \`* تم اقتطاع \${compHoursStr}\\n\`;
    if(extraMins > 0) splitNotes += \`* الصافي الفعلي للإضافي: \${extraHoursStr}\\n\`;
    
    const finalNotes = (leave.notes || '') + splitNotes;
    
    const updatedLeave = {
      ...leave,
      notes: finalNotes,
      status: 'موافق',
      rateDetails: {
         compMins,
         extraMins,
         baseRate
      }
    };
    
    Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false });
    Swal.showLoading();
    try {
      await saveHRLeave(updatedLeave);
      setLeaves(prev => prev.map(l => l.id === leave.id ? updatedLeave : l));
      setSmartModal({ show: false, leave: null, attendance: null, deficitMins: 0, requestedMins: 0, loading: false });
      if(refreshCounts) refreshCounts();
      Swal.fire('نجاح', 'تم احتساب الإضافي والموافقة عليه بإنصاف', 'success');
    } catch(e) {
       Swal.fire('خطأ', 'حدث خطأ', 'error');
    }
  };
`;
    content = content.slice(0, nextLineBreak + 1) + logic + content.slice(nextLineBreak + 1);
  }
}

// 3. Replace handleStatusChange(leave, 'موافق') with openSmartApproval(leave)
const oldBtn = 'onClick={() => handleStatusChange(leave, \'موافق\')}';
const newBtn = 'onClick={() => openSmartApproval(leave)}';
if (content.includes(oldBtn)) {
  content = content.replace(oldBtn, newBtn);
}

// 4. Inject Smart Modal JSX
const smartModalJSX = `
      {/* Smart Approval Modal */}
      {smartModal.show && smartModal.leave && (
        <div className="modal-overlay" style={{ zIndex: 10600 }}>
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <CheckCircle className="text-emerald-500" />
                شاشة الاحتساب الذكي للإضافي
              </h3>
              <button type="button" onClick={() => setSmartModal({ show: false, leave: null })} className="icon-btn hover:bg-gray-100 rounded-full p-2 transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              {smartModal.loading ? (
                 <div className="text-center py-8">جاري التدقيق...</div>
              ) : (
                <div className="space-y-6">
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                     <h4 className="font-bold text-slate-700 mb-3 border-b pb-2">بيانات الطلب الأصلي</h4>
                     <div className="grid grid-cols-2 gap-4 text-sm">
                       <div><span className="text-muted">الموظف:</span> <span className="font-semibold">{smartModal.leave.employeeName}</span></div>
                       <div><span className="text-muted">التاريخ:</span> <span className="font-mono">{smartModal.leave.date}</span></div>
                       <div><span className="text-muted">المدة المطلوبة:</span> <span className="font-bold text-primary">{Math.floor(smartModal.requestedMins / 60)} ساعة و {smartModal.requestedMins % 60} دقيقة</span></div>
                       <div><span className="text-muted">معدل الطلب:</span> <span className="font-mono bg-indigo-100 text-indigo-700 px-2 rounded">{smartModal.leave.rate || '1:1'}</span></div>
                     </div>
                   </div>

                   <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                     <h4 className="font-bold text-slate-700 mb-3 border-b border-orange-200 pb-2">تدقيق الدوام في نفس اليوم</h4>
                     <div className="grid grid-cols-2 gap-4 text-sm">
                       <div>
                         <span className="text-muted">حالة الحضور:</span> 
                         {smartModal.attendance ? (
                           <span className="font-semibold text-emerald-600 mr-2">حاضر ({smartModal.attendance.timeIn} - {smartModal.attendance.timeOut || 'لا يوجد خروج'})</span>
                         ) : (
                           <span className="font-semibold text-rose-600 mr-2">لم يتم العثور على سجل دوام كامل!</span>
                         )}
                       </div>
                       <div>
                         <span className="text-muted">عجز الدوام (تأخير/مغادرة):</span> 
                         {smartModal.deficitMins > 0 ? (
                           <span className="font-bold text-rose-600 mr-2">{Math.floor(smartModal.deficitMins / 60)} ساعة و {smartModal.deficitMins % 60} دقيقة</span>
                         ) : (
                           <span className="font-bold text-emerald-600 mr-2">لا يوجد عجز (0)</span>
                         )}
                       </div>
                     </div>
                   </div>

                   <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                     <h4 className="font-bold text-slate-700 mb-3 border-b border-emerald-200 pb-2 flex items-center gap-2">
                       <CheckCircle size={16} className="text-emerald-500" /> نتيجة الاحتساب (اقتراح النظام)
                     </h4>
                     <div className="space-y-2 text-sm">
                       {smartModal.deficitMins > 0 ? (
                         <>
                           <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-emerald-100">
                             <span className="font-semibold">ساعات تعويض العجز (بمعدل 1:1)</span>
                             <span className="font-bold text-amber-600">{Math.floor(Math.min(smartModal.deficitMins, smartModal.requestedMins) / 60)} ساعة و {Math.min(smartModal.deficitMins, smartModal.requestedMins) % 60} دقيقة</span>
                           </div>
                           <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-emerald-100">
                             <span className="font-semibold">الصافي الفعلي للإضافي (بمعدل {new Date(smartModal.leave.date).getDay() === 5 ? '1:1.5' : (smartModal.leave.rate || '1:1.25')})</span>
                             <span className="font-bold text-emerald-600">
                               {smartModal.requestedMins > smartModal.deficitMins 
                                 ? Math.floor((smartModal.requestedMins - smartModal.deficitMins) / 60) + ' ساعة و ' + ((smartModal.requestedMins - smartModal.deficitMins) % 60) + ' دقيقة'
                                 : '0 دقيقة'}
                             </span>
                           </div>
                         </>
                       ) : (
                         <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-emerald-100">
                           <span className="font-semibold">جميع الساعات مستحقة بمعدل ({new Date(smartModal.leave.date).getDay() === 5 ? '1:1.5' : (smartModal.leave.rate || '1:1.25')})</span>
                           <span className="font-bold text-emerald-600">{Math.floor(smartModal.requestedMins / 60)} ساعة و {smartModal.requestedMins % 60} دقيقة</span>
                         </div>
                       )}
                       <p className="text-xs text-muted mt-2 text-center">* سيتم إدراج هذه التفاصيل كمرجع في ملاحظات الطلب لغايات احتساب الرواتب.</p>
                     </div>
                   </div>
                </div>
              )}
            </div>
            
            <div style={{ padding: '1.25rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', backgroundColor: '#fff', borderBottomLeftRadius: '0.5rem', borderBottomRightRadius: '0.5rem' }}>
               <button type="button" onClick={() => setSmartModal({ show: false, leave: null })} className="btn btn-outline">إلغاء</button>
               <button type="button" onClick={confirmSmartApproval} disabled={smartModal.loading} className="btn btn-primary" style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>تأكيد التقسيم والموافقة</button>
            </div>
          </div>
        </div>
      )}
`;

if (!content.includes('شاشة الاحتساب الذكي للإضافي')) {
  // Inject before the last closing tags
  const endIndex = content.lastIndexOf('</>');
  if (endIndex > -1) {
    content = content.slice(0, endIndex) + smartModalJSX + '\n    ' + content.slice(endIndex);
  }
}

fs.writeFileSync(filePath, content.replace(/\n/g, '\r\n'), 'utf8');
console.log("✅ Smart Overtime Calculation Modal added successfully!");
