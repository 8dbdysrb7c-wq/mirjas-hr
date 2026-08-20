import React, { useState, useEffect } from 'react';
import { getHRLeaves, getMissingPunches, getHRAdvances, getEmployees, getHRAttendance, getHRAssets, getGlobalSettings, getHRViolations, getAttendanceLogs, getReports, getSupervisorReports, getHRPetitions } from '../../store';
import { Users, Clock, Calendar, AlertTriangle, FileText, Settings, Shield, Menu, X, Fingerprint, History, DollarSign, Gift, Bell, BarChart2, ArrowUpDown, Package } from 'lucide-react';
import HRDashboard from './HRDashboard';
import HRAttendance from './HRAttendance';
import HRLeaves from './HRLeaves';
import HROvertime from './HROvertime';
import HRBonusesAndViolations from './HRBonusesAndViolations';
import HRSalaries from './HRSalaries';
import HRSalaryReports from './HRSalaryReports';
import HRMissingPunches from './HRMissingPunches';
import HRAttendanceAlerts from './HRAttendanceAlerts';
import HRAuditLog from './HRAuditLog';
import HRAdvances from './HRAdvances';
import HRAssets from './HRAssets';
import EmployeeProfile from './EmployeeProfile';
import HRSettlement from './HRSettlement';
import HRPetitions from './HRPetitions';
import './hr.css';

const AdminHR = ({ user, notificationTarget }) => {
  const [activeTab, setActiveTab] = useState('attendance');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [pendingCounts, setPendingCounts] = useState({
    leaves: 0,
    overtime: 0,
    'missing-punches': 0,
    advances: 0,
    assets: 0,
    petitions: 0
  });

  useEffect(() => {
    if (notificationTarget && notificationTarget.tab === 'hr' && notificationTarget.subTab) {
      setActiveTab(notificationTarget.subTab);
    }
  }, [notificationTarget]);

  const fetchCounts = async () => {
    const [leaves, mps, advances, petitions, empsRaw, attendance, assetsData, settings, violations, rawLogs, employeeReports, supervisorReports] = await Promise.all([
      getHRLeaves(), getMissingPunches(), getHRAdvances(), getHRPetitions(), getEmployees(), getHRAttendance(), getHRAssets(), getGlobalSettings(), getHRViolations(),
      getAttendanceLogs(), getReports(), getSupervisorReports()
    ]);
    
    const emps = empsRaw.filter(e => e.name !== 'المدير العام' && e.jobTitle !== 'المدير العام' && e.role !== 'المدير العام' && !['غير فعال', 'مستقيل', 'منتهي خدمات'].includes(e.employmentStatus || e.status));
    
    const pendingLeaves = leaves.filter(l => l.type !== 'بدل عمل إضافي' && l.status === 'معلق').length;
    const pendingOvertime = leaves.filter(l => l.type === 'بدل عمل إضافي' && l.status === 'معلق').length;
    const pendingAdvances = advances.filter(a => a.status === 'معلق').length;
    const pendingPetitions = petitions.filter(p => p.status === 'معلق').length;
    const activeAssets = assetsData.filter(a => a.status === 'نشطة').length;

    const todayStr = new Date().toLocaleDateString('en-CA');
    const pad = (n) => n.toString().padStart(2, '0');
    const getLocalDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const dFrom = new Date();
    dFrom.setDate(1);
    const dTo = new Date();
    
    let pendingMpsCount = mps.filter(m => m.status === 'قيد المراجعة' || m.status === 'معلق').length;
    let pendingAlerts = 0;
    const currentMonthStr = todayStr.substring(0, 7);

    // Build recordsMap for accurate alerts calculation
    const recordsMap = new Map();
    const isTimeEmpty = (t) => !t || t === '--:--';
    
    const normalizeDate = (dStr) => {
      if (!dStr) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
      const parts = dStr.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      return dStr;
    };

    const findEmployee = (id, name) => {
      const idStr = String(id || '').trim().toLowerCase();
      const nameStr = String(name || '').trim().toLowerCase();
      return emps.find(e => String(e.id).trim().toLowerCase() === idStr || String(e.name || '').trim().toLowerCase() === nameStr);
    };

    attendance.forEach(r => {
      if (r.isLeave) return;
      const emp = findEmployee(r.employeeId, r.employeeName);
      if (emp && r.date) {
        const d = normalizeDate(r.date);
        const key = `${emp.id}_${d}`;
        let tIn = r.timeIn || '';
        let tOut = r.timeOut || '';
        if (!r.isLeave && !r.timeIn && r.time) {
           tIn = r.time.includes('-') ? r.time.split('-')[0].trim() : r.time;
        }
        if (!r.isLeave && !r.timeOut && r.time && r.time.includes('-')) {
           tOut = r.time.split('-')[1].trim();
        }
        recordsMap.set(key, { ...r, timeIn: tIn, timeOut: tOut, date: d, employeeId: emp.id, employeeName: emp.name });
      }
    });

    rawLogs.forEach(log => {
      const emp = findEmployee(log.employeeId, log.employeeName || log.name);
      if (emp && log.date) {
        const d = normalizeDate(log.date);
        const key = `${emp.id}_${d}`;
        const existing = recordsMap.get(key);
        const logTimeIn = log.timeIn || log.time || '';
        const logTimeOut = log.timeOut || '';
        
        if (existing) {
          if (isTimeEmpty(existing.timeIn) && logTimeIn && logTimeIn !== '--:--') existing.timeIn = logTimeIn;
          if (isTimeEmpty(existing.timeOut) && logTimeOut && logTimeOut !== '--:--') existing.timeOut = logTimeOut;
        } else {
          recordsMap.set(key, { employeeId: emp.id, employeeName: emp.name, date: d, timeIn: logTimeIn !== '--:--' ? logTimeIn : '', timeOut: logTimeOut !== '--:--' ? logTimeOut : '' });
        }
      }
    });

    employeeReports.forEach(r => {
      const emp = findEmployee(r.userId, r.userName);
      if (emp && r.date) {
        const d = normalizeDate(r.date);
        const key = `${emp.id}_${d}`;
        const existing = recordsMap.get(key);
        if (existing) {
          if (isTimeEmpty(existing.timeIn) && r.timeIn && r.timeIn !== '--:--') existing.timeIn = r.timeIn;
          if (isTimeEmpty(existing.timeOut) && r.timeOut && r.timeOut !== '--:--') existing.timeOut = r.timeOut;
        } else {
          recordsMap.set(key, { employeeId: emp.id, employeeName: emp.name, date: d, timeIn: r.timeIn || '', timeOut: r.timeOut || '' });
        }
      }
    });

    supervisorReports.forEach(r => {
      const emp = findEmployee(r.supervisorId, r.supervisorName);
      if (emp && r.date) {
        const d = normalizeDate(r.date);
        const key = `${emp.id}_${d}`;
        const existing = recordsMap.get(key);
        if (existing) {
          if (isTimeEmpty(existing.timeIn) && r.timeIn && r.timeIn !== '--:--') existing.timeIn = r.timeIn;
          if (isTimeEmpty(existing.timeOut) && r.timeOut && r.timeOut !== '--:--') existing.timeOut = r.timeOut;
        } else {
          recordsMap.set(key, { employeeId: emp.id, employeeName: emp.name, date: d, timeIn: r.timeIn || '', timeOut: r.timeOut || '' });
        }
      }
    });

    const finalRecordsList = Array.from(recordsMap.values());

    const parseTime = (tStr) => {
      if (!tStr) return 0;
      const match = tStr.match(/(\d+):(\d+)/);
      if (match) {
        let h = parseInt(match[1], 10);
        let m = parseInt(match[2], 10);
        if (tStr.toLowerCase().includes('pm') || tStr.includes('م')) { if (h < 12) h += 12; } 
        else if (tStr.toLowerCase().includes('am') || tStr.includes('ص')) { if (h === 12) h = 0; }
        return h * 60 + m;
      }
      return 0;
    };

    emps.forEach(emp => {
      let shiftStart = emp?.shiftStart || '08:00';
      let shiftEnd = emp?.shiftEnd || '16:00';
      if (emp?.workShiftName && settings?.workShifts) {
        const shift = settings.workShifts.find(s => s.name === emp.workShiftName);
        if (shift) { shiftStart = shift.startTime; shiftEnd = shift.endTime; }
      }
      const shiftStartMins = parseTime(shiftStart);
      const shiftEndMins = parseTime(shiftEnd);

      const empIdStr = String(emp.id).trim().toLowerCase();
      const empNameStr = String(emp.name || '').trim().toLowerCase();
      const isMatch = (id, name) => {
        if (id && String(id).trim().toLowerCase() === empIdStr) return true;
        if (name && empNameStr && String(name).trim().toLowerCase() === empNameStr) return true;
        return false;
      };

      const empMonthRecords = finalRecordsList.filter(r => isMatch(r.employeeId || r.userId, r.employeeName || r.userName) && r.date && r.date.startsWith(currentMonthStr));
      
      empMonthRecords.forEach(rec => {
        if (rec.timeIn && rec.timeIn !== '--:--') {
          const actualStartMins = parseTime(rec.timeIn);
          if (actualStartMins > shiftStartMins + 5) {
             const hasPerm = leaves.some(l => isMatch(l.employeeId, l.employeeName) && (l.status === 'موافق' || l.status === 'موافق عليه' || l.status === 'مقبول') && l.type && (l.type.startsWith('إجازة') || l.type === 'إذن تأخير') && (l.date === rec.date || (rec.date >= l.startDate && rec.date <= l.endDate)));
             if (!hasPerm) {
                const viol = violations.find(v => isMatch(v.employeeId, v.employeeName) && v.date === rec.date && v.type === 'تأخير');
                if (!viol || viol.action === 'معلق' || !viol.action) pendingAlerts++;
             }
          }
        }
        if (rec.timeOut && rec.timeOut !== '--:--') {
          const actualEndMins = parseTime(rec.timeOut);
          if (actualEndMins < shiftEndMins) {
             const hasPerm = leaves.some(l => isMatch(l.employeeId, l.employeeName) && (l.status === 'موافق' || l.status === 'موافق عليه' || l.status === 'مقبول') && l.type && (l.type.startsWith('إجازة') || l.type === 'مغادرة خاصة' || l.type === 'مغادرة عمل' || l.type === 'مغادرة الدخان') && (l.date === rec.date || (rec.date >= l.startDate && rec.date <= l.endDate)));
             if (!hasPerm) {
                const viol = violations.find(v => isMatch(v.employeeId, v.employeeName) && v.date === rec.date && v.type === 'مغادرة مبكرة');
                if (!viol || viol.action === 'معلق' || !viol.action) pendingAlerts++;
             }
          }
        }
      });
    });

    for (let d = new Date(dFrom); d <= dTo; d.setDate(d.getDate() + 1)) {
       const dateStr = getLocalDateStr(d);
       if (dateStr > todayStr) continue;
       const isWeekend = d.getDay() === 5;
       if (isWeekend) continue;

       emps.forEach(emp => {
          const hasManual = mps.some(p => String(p.employeeId) === String(emp.id) && p.date === dateStr);
          if (hasManual) return;
          const rec = attendance.find(a => String(a.employeeId) === String(emp.id) && a.date === dateStr);
          const hasLeave = leaves.some(l => 
             String(l.employeeId) === String(emp.id) && 
             (l.status === 'موافق' || l.status === 'مقبول') && 
             l.type && l.type.startsWith('إجازة') &&
             ((l.date === dateStr) || (l.startDate <= dateStr && l.endDate >= dateStr))
          );
          if (hasLeave) return;

          if (!rec || rec.status === 'لم يسجل دخول') {
             pendingMpsCount++;
          }
       });
    }

    const strFrom = getLocalDateStr(dFrom);
    const strTo = getLocalDateStr(dTo);
    attendance.forEach(rec => {
       if (rec.isLeave) return;
       if (rec.date >= strFrom && rec.date <= strTo) {
           const hasManual = mps.some(p => String(p.employeeId) === String(rec.employeeId) && p.date === rec.date && p.type === 'خروج');
           if (hasManual) return;
           const hasLeave = leaves.some(l => 
             String(l.employeeId) === String(rec.employeeId) && 
             (l.status === 'موافق' || l.status === 'موافق عليه' || l.status === 'مقبول') && 
             l.type && l.type.startsWith('إجازة') &&
             ((l.date === rec.date) || (l.startDate <= rec.date && l.endDate >= rec.date))
           );
           if (rec.timeIn && (!rec.timeOut || rec.timeOut === '--:--')) {
              if (!['غائب', 'غياب غير مبرر', 'مغادرة مبكرة', 'إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'].includes(rec.status) && !hasLeave) {
                 const emp = emps.find(e => String(e.id) === String(rec.employeeId));
                 if (emp) pendingMpsCount++;
              }
           }
       }
    });
    
    setPendingCounts({
      leaves: pendingLeaves,
      overtime: pendingOvertime,
      'missing-punches': pendingMpsCount,
      advances: pendingAdvances,
      petitions: pendingPetitions,
      assets: activeAssets,
      'attendance-alerts': pendingAlerts
    });
  };

  useEffect(() => {
    fetchCounts();
    // Refresh counts every 30 seconds
    const intervalId = setInterval(fetchCounts, 30000);
    return () => clearInterval(intervalId);
  }, []);

  const renderContent = () => {
    if (activeTab === 'employee-profile' && selectedEmployeeId) {
      return <EmployeeProfile user={user} employeeId={selectedEmployeeId} onBack={() => setActiveTab('employees')} />;
    }
    
    switch (activeTab) {
      case 'dashboard': return <HRDashboard user={user} onNavigate={setActiveTab} />;
      case 'attendance': return <HRAttendance user={user} />;
      case 'leaves': return <HRLeaves user={user} refreshCounts={fetchCounts} />;
      case 'advances': return <HRAdvances user={user} refreshCounts={fetchCounts} />;
      case 'petitions': return <HRPetitions user={user} refreshCounts={fetchCounts} />;
      case 'missing-punches': return <HRMissingPunches user={user} refreshCounts={fetchCounts} />;
      case 'attendance-alerts': return <HRAttendanceAlerts user={user} />;
      case 'overtime': return <HROvertime user={user} refreshCounts={fetchCounts} />;
      case 'bonuses-violations': return <HRBonusesAndViolations user={user} />;
      case 'salaries': return <HRSalaries user={user} />;
      case 'salary-reports': return <HRSalaryReports user={user} />;
      case 'assets': return <HRAssets user={user} />;
      case 'settlement': return <HRSettlement user={user} />;
      default: return <HRAttendance user={user} />;
    }
  };

  const navItems = [
    { id: 'attendance', label: 'الحضور والانصراف', icon: <Clock />, color: '#14b8a6', bgLight: '#ccfbf1', customBadge: 'اليوم' },
    { id: 'leaves', label: 'الإجازات والمغادرات', icon: <Calendar />, color: '#3b82f6', bgLight: '#dbeafe', badgeNum: pendingCounts['leaves'] || 0 },
    { id: 'attendance-alerts', label: 'تنبيهات الحضور والانصراف', icon: <AlertTriangle />, color: '#f43f5e', bgLight: '#ffe4e6', badgeNum: pendingCounts['attendance-alerts'] || 0 },
    { id: 'missing-punches', label: 'الختمات الناقصة', icon: <Fingerprint />, color: '#8b5cf6', bgLight: '#f3e8ff', badgeNum: pendingCounts['missing-punches'] || 0 },
    { id: 'overtime', label: 'العمل الإضافي', icon: <Clock />, color: '#f59e0b', bgLight: '#fef3c7', badgeNum: pendingCounts['overtime'] || 0 },
    { id: 'advances', label: 'السلف', icon: <DollarSign />, color: '#10b981', bgLight: '#d1fae5', badgeNum: pendingCounts['advances'] || 0 },
    { id: 'petitions', label: 'الاستدعاءات', icon: <FileText />, color: '#3b82f6', bgLight: '#dbeafe', badgeNum: pendingCounts['petitions'] || 0 },
    { id: 'assets', label: 'العهدة', icon: <Package />, color: '#0ea5e9', bgLight: '#e0f2fe', badgeNum: pendingCounts['assets'] || 0 },
    { id: 'bonuses-violations', label: 'المكافآت والمخالفات', icon: <ArrowUpDown />, color: '#a855f7', bgLight: '#f3e8ff', badgeNum: 0 },
    { id: 'salaries', label: 'الرواتب', icon: <FileText />, color: '#6366f1', bgLight: '#e0e7ff', badgeNum: 0 },
    { id: 'salary-reports', label: 'مركز التقارير', icon: <BarChart2 />, color: '#2563eb', bgLight: '#dbeafe', customBadge: 'التقارير' },
    { id: 'settlement', label: 'مخالصة وبراءة ذمة', icon: <FileText />, color: '#f43f5e', bgLight: '#ffe4e6', customBadge: 'مهم' }
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="hr-layout">
      
      <div className="hr-modules-nav-wrap no-print mb-3 pb-2" style={{ direction: 'rtl' }}>
        <div className="hr-modules-nav-grid">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <div
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                style={{
                  backgroundColor: isActive ? item.color : '#ffffff',
                  border: `1.5px solid ${isActive ? item.color : '#f1f5f9'}`,
                  borderRadius: '16px',
                  padding: '16px 8px 12px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: isActive ? `0 10px 25px -5px ${item.color}40` : '0 4px 10px -2px rgba(0, 0, 0, 0.03)',
                  color: isActive ? '#ffffff' : '#334155',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  minHeight: '130px',
                  transform: isActive ? 'scale(1.03)' : 'scale(1)',
                }}
              >
                <div style={{ color: isActive ? '#ffffff' : item.color, marginBottom: '4px' }}>
                  {React.cloneElement(item.icon, { size: 38, strokeWidth: 1.5 })}
                </div>
                
                <span style={{ fontSize: '15px', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.2' }}>
                  {item.label}
                </span>
                
                <div style={{
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : item.bgLight,
                  color: isActive ? '#ffffff' : item.color,
                  padding: '4px 14px',
                  borderRadius: '9999px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: 'auto',
                  border: isActive ? 'none' : `1px solid ${item.color}20`
                }}>
                  <span>{item.customBadge ? item.customBadge : item.badgeNum}</span>
                  {React.cloneElement(item.icon, { size: 13, strokeWidth: 2.5 })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="hr-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminHR;
