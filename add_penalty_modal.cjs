const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'hr', 'HRAttendanceAlerts.jsx');

let code = fs.readFileSync(filePath, 'utf8');

// 1. Add X icon
code = code.replace(/import { Bell, Calendar, Search, LogOut, AlertTriangle, ChevronDown, Upload, FileMinus } from 'lucide-react';/, "import { Bell, Calendar, Search, LogOut, AlertTriangle, ChevronDown, Upload, FileMinus, X } from 'lucide-react';");

// 2. Add Modal State
const stateToAdd = `
  const [penaltyModal, setPenaltyModal] = useState({
    isOpen: false,
    employeeName: '',
    type: '',
    date: '',
    action: 'تنبيه',
    deduction: '',
    notes: ''
  });
`;
code = code.replace(/const \[openDropdownId, setOpenDropdownId\] = useState\(null\);/, "const [openDropdownId, setOpenDropdownId] = useState(null);\n" + stateToAdd);

// 3. Update handleRegisterPenalty function
const newHandleRegisterPenalty = `
  const handleRegisterPenalty = (empName, defaultType, defaultNotes) => {
    setOpenDropdownId(null);
    setPenaltyModal({
      isOpen: true,
      employeeName: empName,
      type: defaultType,
      date: selectedDate,
      action: 'تنبيه',
      deduction: '',
      notes: defaultNotes
    });
  };
`;

code = code.replace(/const handleRegisterPenalty = \(empName\) => \{[\s\S]*?\}\)\;\n  \}\;/, newHandleRegisterPenalty.trim());

// 4. Update the onClick in tables
code = code.replace(/handleRegisterPenalty\(emp\.name\)/g, (match, offset) => {
  if (offset < code.indexOf('Repeated Lates Table')) {
    // We are in early departures
    return `handleRegisterPenalty(emp.name, 'مغادرة مبكرة', \`تم تسجيل خروج مبكر للموظف بتاريخ \${selectedDate} في تمام الساعة \${emp.timeOut}، حيث غادر قبل نهاية دوامه بمقدار \${emp.earlyMins} دقيقة ولم يقم بتقديم طلب مغادرة أو إذن رسمي.\`)`;
  } else {
    // We are in repeated lates
    return `handleRegisterPenalty(emp.name, 'تأخير', \`تجاوز الموظف الحد المسموح به للتأخير الصباحي خلال الشهر الحالي، حيث بلغ عدد مرات التأخير غير المبرر \${emp.lateCount} مرات.\`)`;
  }
});

// 5. Add Modal HTML before the final closing div
const modalHtml = `
      {/* Penalty Modal */}
      {penaltyModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '90%', maxWidth: '600px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', position: 'relative' }}>
            <button onClick={() => setPenaltyModal({ ...penaltyModal, isOpen: false })} style={{ position: 'absolute', top: '24px', left: '24px', background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} />
            </button>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', margin: '0 0 24px 0', textAlign: 'right' }}>تسجيل مخالفة جديدة</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: '#475569' }}>الموظف</label>
                <select disabled style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', color: '#1e293b', outline: 'none' }}>
                  <option>{penaltyModal.employeeName}</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: '#475569' }}>نوع المخالفة</label>
                  <select value={penaltyModal.type} onChange={e => setPenaltyModal({...penaltyModal, type: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', outline: 'none', fontFamily: 'inherit' }}>
                    <option value="تأخير">تأخير</option>
                    <option value="مغادرة مبكرة">مغادرة مبكرة</option>
                    <option value="تغيب">تغيب</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: '#475569' }}>تاريخ المخالفة</label>
                  <input type="text" disabled value={penaltyModal.date} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', color: '#1e293b', outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: '#475569' }}>الإجراء المتخذ</label>
                  <select value={penaltyModal.action} onChange={e => setPenaltyModal({...penaltyModal, action: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', outline: 'none', fontFamily: 'inherit' }}>
                    <option value="تنبيه">تنبيه</option>
                    <option value="إنذار أول">إنذار أول</option>
                    <option value="إنذار نهائي">إنذار نهائي</option>
                    <option value="خصم مالي">خصم مالي</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: '#475569' }}>قيمة الخصم (إن وجد)</label>
                  <input type="text" placeholder="المبلغ بالدينار" value={penaltyModal.deduction} onChange={e => setPenaltyModal({...penaltyModal, deduction: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: '#475569' }}>ملاحظات / تفاصيل الإجراء</label>
                <textarea rows="4" value={penaltyModal.notes} onChange={e => setPenaltyModal({...penaltyModal, notes: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', outline: 'none', fontFamily: 'inherit', resize: 'none' }}></textarea>
              </div>

            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '30px', justifyContent: 'flex-start' }}>
              <button 
                onClick={() => {
                  setPenaltyModal({...penaltyModal, isOpen: false});
                  Swal.fire('تم بنجاح!', 'تم تسجيل المخالفة وحفظها في السجل.', 'success');
                }}
                style={{ background: '#e11d48', color: 'white', border: 'none', borderRadius: '8px', padding: '12px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>
                تسجيل المخالفة
              </button>
              <button 
                onClick={() => setPenaltyModal({...penaltyModal, isOpen: false})}
                style={{ background: '#f1f5f9', color: '#1e293b', border: 'none', borderRadius: '8px', padding: '12px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
`;

code = code.replace(/    <\/div>\s*?\);\s*?\}\;\s*?export default HRAttendanceAlerts;/, modalHtml + "\n};\n\nexport default HRAttendanceAlerts;");

fs.writeFileSync(filePath, code, 'utf8');
console.log("✅ Custom Penalty Modal injected successfully!");
