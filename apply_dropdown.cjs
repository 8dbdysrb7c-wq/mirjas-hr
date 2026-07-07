const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'hr', 'HRAttendanceAlerts.jsx');

const code = `import React, { useState, useEffect, useRef } from 'react';
import { Bell, Calendar, Search, LogOut, AlertTriangle, ChevronDown, Upload, FileMinus } from 'lucide-react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/airbnb.css';
import { getEmployees, getHRAttendance, getGlobalSettings } from '../../store';
import Swal from 'sweetalert2';

const getLocalDateStr = (d) => {
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const HRAttendanceAlerts = ({ user }) => {
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getLocalDateStr(new Date()));
  const [search, setSearch] = useState('');
  const [settings, setSettings] = useState(null);

  const [earlyDepartures, setEarlyDepartures] = useState([]);
  const [repeatedLates, setRepeatedLates] = useState([]);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [emps, records, globSet] = await Promise.all([
        getEmployees(), 
        getHRAttendance(),
        getGlobalSettings()
      ]);
      setEmployees(emps);
      setAttendanceRecords(records);
      setSettings(globSet);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (loading) return;

    const todayRecords = attendanceRecords.filter(r => r.date === selectedDate);
    
    // Determine early departures for today
    const earlyList = [];
    
    // Calculate lates for the current month
    const currentMonth = selectedDate.substring(0, 7);
    const monthRecords = attendanceRecords.filter(r => r.date && r.date.startsWith(currentMonth));
    const lateList = [];

    employees.forEach(emp => {
      let shiftStart = emp?.shiftStart || '08:00';
      let shiftEnd = emp?.shiftEnd || '16:00';
      
      if (emp?.workShiftName && settings?.workShifts) {
        const shift = settings.workShifts.find(s => s.name === emp.workShiftName);
        if (shift) { shiftStart = shift.startTime; shiftEnd = shift.endTime; }
      }
      
      const [ssh, ssm] = shiftStart.split(':').map(Number);
      const [seh, sem] = shiftEnd.split(':').map(Number);
      
      // Early Departures Today
      const todayRecord = todayRecords.find(r => String(r.employeeId) === String(emp.id));
      if (todayRecord && todayRecord.timeOut && todayRecord.timeOut !== '--:--') {
        const [oh, om] = todayRecord.timeOut.split(':').map(Number);
        const actualEndMins = oh * 60 + om;
        const shiftEndMins = seh * 60 + sem;
        
        if (actualEndMins < shiftEndMins) {
           const earlyMins = shiftEndMins - actualEndMins;
           earlyList.push({
             id: emp.id,
             name: emp.name,
             department: emp.department || '-',
             timeOut: todayRecord.timeOut,
             earlyMins: earlyMins,
             shiftEnd: shiftEnd
           });
        }
      }

      // Repeated Lates for the month
      let lateCount = 0;
      const empMonthRecords = monthRecords.filter(r => String(r.employeeId) === String(emp.id));
      empMonthRecords.forEach(rec => {
        if (rec.timeIn && rec.timeIn !== '--:--') {
          const [ah, am] = rec.timeIn.split(':').map(Number);
          const actualStartMins = ah * 60 + am;
          const shiftStartMins = ssh * 60 + ssm;
          if (actualStartMins > shiftStartMins + 15) { 
             lateCount++;
          }
        }
      });
      
      if (lateCount >= 3) {
         lateList.push({
            id: emp.id,
            name: emp.name,
            department: emp.department || '-',
            lateCount: lateCount
         });
      }
    });

    setEarlyDepartures(earlyList);
    setRepeatedLates(lateList);
  }, [selectedDate, attendanceRecords, employees, settings, loading]);

  const handleApplyDeduction = (empName) => {
    setOpenDropdownId(null);
    Swal.fire({
      title: 'تطبيق الخصم',
      text: \`هل أنت متأكد من تطبيق خصم مالي للموظف \${empName}؟\`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'نعم، قم بالخصم',
      cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire('تم بنجاح!', 'تم إدراج الخصم المالي في حساب الرواتب.', 'success');
      }
    });
  };

  const handleRegisterPenalty = (empName) => {
    setOpenDropdownId(null);
    Swal.fire({
      title: 'تسجيل مخالفة',
      html: \`
        <div style="text-align: right; margin-bottom: 10px;">تسجيل مخالفة للموظف: <b>\${empName}</b></div>
        <select id="penalty-type" class="swal2-input" style="width: 80%; display: block; margin: 0 auto;">
           <option value="">-- اختر نوع المخالفة --</option>
           <option value="تأخير متكرر">تأخير متكرر</option>
           <option value="مغادرة مبكرة">مغادرة مبكرة بدون إذن</option>
           <option value="تغيب">تغيب عن العمل</option>
        </select>
        <textarea id="penalty-notes" class="swal2-textarea" placeholder="تفاصيل المخالفة..." style="width: 80%; margin-top: 15px;"></textarea>
      \`,
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'تسجيل المخالفة',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        const type = document.getElementById('penalty-type').value;
        if (!type) {
          Swal.showValidationMessage('الرجاء اختيار نوع المخالفة');
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire('تم بنجاح!', 'تم تسجيل المخالفة وحفظها في السجل.', 'success');
      }
    });
  };

  if (loading && employees.length === 0) return <div style={{textAlign:'center', padding:'40px'}}>جاري التحميل...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'inherit', direction: 'rtl' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
        
        {/* Right Side (Title and Bell) */}
        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ color: '#6366f1', background: '#eff6ff', padding: '10px', borderRadius: '12px' }}>
            <Bell size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>تنبيهات التأخير والعقوبات</h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0' }}>الموظفون الذين تجاوزوا الحد المسموح لتأخير الدوام</p>
          </div>
        </div>

        {/* Left Side (Search and Date) */}
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Calendar style={{ position: 'absolute', right: '12px', top: '10px', color: '#94a3b8' }} size={18} />
            <Flatpickr 
              value={selectedDate}
              onChange={(dates, dateStr) => setSelectedDate(dateStr)}
              options={{ dateFormat: 'Y-m-d' }}
              style={{ padding: '10px 40px 10px 15px', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', width: '180px', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', right: '12px', top: '10px', color: '#94a3b8' }} size={18} />
            <input 
              type="text" 
              placeholder="بحث باسم أو رقم..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '10px 40px 10px 15px', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', width: '250px' }}
            />
          </div>
        </div>

      </div>

      {/* Stats Cards - Early Departures (Orange) FIRST so it's on the RIGHT in RTL */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '30px' }}>
        
        {/* Early Departures Card (Right Side in RTL) */}
        <div style={{ background: '#ffffff', border: '1px solid #fbd38d', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b', lineHeight: '1' }}>{earlyDepartures.length}</div>
            <div style={{ color: '#f59e0b', fontWeight: '600', fontSize: '0.9rem', marginTop: '4px' }}>طلب</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>المغادرة المبكرة</h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0' }}>موظفون سجلوا خروج قبل نهاية دوامهم<br/>ولم يقدموا إذن/مغادرة</p>
            </div>
            <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '50%', color: '#f59e0b', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <LogOut size={32} />
            </div>
          </div>
        </div>

        {/* Repeated Lates Card (Left Side in RTL) */}
        <div style={{ background: '#fff5f5', border: '1px solid #fee2e2', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ef4444', lineHeight: '1' }}>{repeatedLates.length}</div>
            <div style={{ color: '#ef4444', fontWeight: '600', fontSize: '0.9rem', marginTop: '4px' }}>تنبيه</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>تنبيهات التأخير المتكرر</h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0' }}>موظفون تجاوزوا عدد فرص التأخير<br/>المسموح بها</p>
            </div>
            <div style={{ background: '#fee2e2', padding: '16px', borderRadius: '50%', color: '#ef4444', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <AlertTriangle size={32} />
            </div>
          </div>
        </div>

      </div>

      {/* Tables Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }} ref={dropdownRef}>
        
        {/* Early Departures Table */}
        <div style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <h3 style={{ fontWeight: 'bold', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                 المغادرة المبكرة ({earlyDepartures.length})
               </h3>
               <LogOut size={18} style={{ color: '#f59e0b' }} />
            </div>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>موظفون سجلوا خروج قبل نهاية دوامهم ولم يقدموا إذن/مغادرة</span>
          </div>
          
          <div style={{ overflowX: 'auto', paddingBottom: openDropdownId ? '100px' : '0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead style={{ background: '#f8fafc', color: '#475569', fontSize: '0.9rem' }}>
                <tr>
                  <th style={{ padding: '16px 24px', fontWeight: '600' }}>الموظف</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600' }}>القسم</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>وقت الخروج</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>الخروج المبكر</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>نهاية الدوام</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {earlyDepartures.filter(e => e.name.includes(search)).map((emp, index) => (
                  <tr key={index} style={{ borderTop: '1px solid #f1f5f9', transition: 'all 0.2s' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 'bold', color: '#1e293b' }}>{emp.name}</td>
                    <td style={{ padding: '16px 24px', color: '#64748b' }}>{emp.department}</td>
                    <td style={{ padding: '16px 24px', fontWeight: 'bold', color: '#1e293b', textAlign: 'center' }} dir="ltr">{emp.timeOut}</td>
                    <td style={{ padding: '16px 24px', fontWeight: 'bold', color: '#d97706', textAlign: 'center' }}>{emp.earlyMins} دقيقة</td>
                    <td style={{ padding: '16px 24px', fontWeight: 'bold', color: '#1e293b', textAlign: 'center' }} dir="ltr">{emp.shiftEnd}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'center', position: 'relative' }}>
                      <button 
                        onClick={() => setOpenDropdownId(openDropdownId === \`early-\${emp.id}\` ? null : \`early-\${emp.id}\`)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#fffbeb', border: '1px solid #fde68a', color: '#d97706', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', width: '180px', justifyContent: 'space-between' }}
                      >
                         <ChevronDown size={16} /> تطبيق إجراء <Upload size={14} />
                      </button>
                      
                      {openDropdownId === \`early-\${emp.id}\` && (
                        <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 50, width: '200px', marginTop: '4px', overflow: 'hidden' }}>
                           <button onClick={() => handleApplyDeduction(emp.name)} style={{ width: '100%', padding: '12px 16px', textAlign: 'right', background: 'transparent', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#d97706', fontWeight: '600' }} onMouseOver={(e) => e.currentTarget.style.background = '#fef3c7'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                             <Upload size={14} /> تطبيق خصم من الراتب
                           </button>
                           <button onClick={() => handleRegisterPenalty(emp.name)} style={{ width: '100%', padding: '12px 16px', textAlign: 'right', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: '600' }} onMouseOver={(e) => e.currentTarget.style.background = '#fee2e2'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                             <FileMinus size={14} /> تسجيل مخالفة
                           </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {earlyDepartures.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '50%' }}><LogOut size={24} /></div>
                        لا يوجد موظفين غادروا مبكراً في هذا اليوم
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Repeated Lates Table */}
        <div style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <h3 style={{ fontWeight: 'bold', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                 تنبيهات التأخير المتكرر ({repeatedLates.length})
               </h3>
               <AlertTriangle size={18} style={{ color: '#ef4444' }} />
            </div>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>تجاوزوا 3 فرص تأخير</span>
          </div>
          
          <div style={{ overflowX: 'auto', paddingBottom: openDropdownId ? '100px' : '0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead style={{ background: '#f8fafc', color: '#475569', fontSize: '0.9rem' }}>
                <tr>
                  <th style={{ padding: '16px 24px', fontWeight: '600' }}>الموظف</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600' }}>القسم</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>التأخيرات (غير مخصومة)</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {repeatedLates.filter(e => e.name.includes(search)).map((emp, index) => (
                  <tr key={index} style={{ borderTop: '1px solid #f1f5f9', transition: 'all 0.2s' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 'bold', color: '#1e293b' }}>{emp.name}</td>
                    <td style={{ padding: '16px 24px', color: '#64748b' }}>{emp.department}</td>
                    <td style={{ padding: '16px 24px', fontWeight: 'bold', color: '#ef4444', textAlign: 'center' }}>{emp.lateCount} تأخيرات</td>
                    <td style={{ padding: '16px 24px', textAlign: 'center', position: 'relative' }}>
                      <button 
                        onClick={() => setOpenDropdownId(openDropdownId === \`late-\${emp.id}\` ? null : \`late-\${emp.id}\`)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', width: '180px', justifyContent: 'space-between' }}
                      >
                         <ChevronDown size={16} /> تطبيق إجراء <Upload size={14} />
                      </button>
                      
                      {openDropdownId === \`late-\${emp.id}\` && (
                        <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 50, width: '200px', marginTop: '4px', overflow: 'hidden' }}>
                           <button onClick={() => handleApplyDeduction(emp.name)} style={{ width: '100%', padding: '12px 16px', textAlign: 'right', background: 'transparent', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: '600' }} onMouseOver={(e) => e.currentTarget.style.background = '#fee2e2'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                             <Upload size={14} /> توجيه إنذار / خصم
                           </button>
                           <button onClick={() => handleRegisterPenalty(emp.name)} style={{ width: '100%', padding: '12px 16px', textAlign: 'right', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: '600' }} onMouseOver={(e) => e.currentTarget.style.background = '#fee2e2'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                             <FileMinus size={14} /> تسجيل مخالفة
                           </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {repeatedLates.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '50%' }}><AlertTriangle size={24} /></div>
                        لا يوجد موظفين تجاوزوا حد التأخير في هذه الفترة
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};

export default HRAttendanceAlerts;
`;

fs.writeFileSync(filePath, code.replace(/\n/g, '\r\n'), 'utf8');
console.log("✅ Dropdowns added successfully!");
