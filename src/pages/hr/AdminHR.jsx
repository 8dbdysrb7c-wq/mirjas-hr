import React, { useState, useEffect } from 'react';
import { getHRLeaves, getMissingPunches, getHRAdvances, getEmployees, getHRAttendance } from '../../store';
import { Users, Clock, Calendar, AlertTriangle, FileText, Settings, Shield, Menu, X, Fingerprint, History, DollarSign, Gift, Bell, BarChart2, ArrowUpDown, Package } from 'lucide-react';
import HRDashboard from './HRDashboard';
import HRAttendance from './HRAttendance';
import HRLeaves from './HRLeaves';
import HROvertime from './HROvertime';
import HRBonusesAndViolations from './HRBonusesAndViolations';
import HRSalaries from './HRSalaries';
import HRSalaryReports from './HRSalaryReports';
import HRMissingPunches from './HRMissingPunches';
import HRAuditLog from './HRAuditLog';
import HRAdvances from './HRAdvances';
import HRAssets from './HRAssets';
import EmployeeProfile from './EmployeeProfile';
import HRSettlement from './HRSettlement';
import './hr.css';

const AdminHR = ({ user, notificationTarget }) => {
  const [activeTab, setActiveTab] = useState('attendance');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [pendingCounts, setPendingCounts] = useState({
    leaves: 0,
    overtime: 0,
    'missing-punches': 0,
    advances: 0
  });

  useEffect(() => {
    if (notificationTarget && notificationTarget.tab === 'hr' && notificationTarget.subTab) {
      setActiveTab(notificationTarget.subTab);
    }
  }, [notificationTarget]);

  const fetchCounts = async () => {
    const [leaves, mps, advances, emps, attendance] = await Promise.all([getHRLeaves(), getMissingPunches(), getHRAdvances(), getEmployees(), getHRAttendance()]);
    
    const pendingLeaves = leaves.filter(l => l.type !== 'بدل عمل إضافي' && l.status === 'معلق').length;
    const pendingOvertime = leaves.filter(l => l.type === 'بدل عمل إضافي' && l.status === 'معلق').length;
    const pendingAdvances = advances.filter(a => a.status === 'معلق').length;

    // Calculate missing punches (manual + virtual) for the current month
    const todayStr = new Date().toLocaleDateString('en-CA');
    const pad = (n) => n.toString().padStart(2, '0');
    const getLocalDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const dFrom = new Date();
    dFrom.setDate(1);
    const dTo = new Date();
    
    let pendingMpsCount = mps.filter(m => m.status === 'قيد المراجعة' || m.status === 'معلق').length;

    // 1. Missing Check-in
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
             ((l.date === dateStr) || (l.startDate <= dateStr && l.endDate >= dateStr))
          );
          if (hasLeave) return;

          if (!rec || rec.status === 'لم يسجل دخول') {
             pendingMpsCount++;
          }
       });
    }

    // 2. Missing Check-out
    const strFrom = getLocalDateStr(dFrom);
    const strTo = getLocalDateStr(dTo);
    attendance.forEach(rec => {
       if (rec.date >= strFrom && rec.date <= strTo) {
           const hasManual = mps.some(p => String(p.employeeId) === String(rec.employeeId) && p.date === rec.date && p.type === 'خروج');
           if (hasManual) return;
           if (rec.timeIn && (!rec.timeOut || rec.timeOut === '--:--')) {
              if (!['غائب', 'غياب غير مبرر', 'مغادرة مبكرة', 'إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'].includes(rec.status)) {
                 pendingMpsCount++;
              }
           }
       }
    });
    
    setPendingCounts({
      leaves: pendingLeaves,
      overtime: pendingOvertime,
      'missing-punches': pendingMpsCount,
      advances: pendingAdvances
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
      case 'missing-punches': return <HRMissingPunches user={user} refreshCounts={fetchCounts} />;
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
    { id: 'missing-punches', label: 'الختمات الناقصة', icon: <Fingerprint />, color: '#8b5cf6', bgLight: '#f3e8ff', badgeNum: pendingCounts['missing-punches'] || 0 },
    { id: 'overtime', label: 'العمل الإضافي', icon: <Clock />, color: '#f59e0b', bgLight: '#fef3c7', badgeNum: pendingCounts['overtime'] || 0 },
    { id: 'advances', label: 'السلف', icon: <DollarSign />, color: '#10b981', bgLight: '#d1fae5', badgeNum: pendingCounts['advances'] || 0 },
    { id: 'leaves', label: 'الإجازات والمغادرات', icon: <Calendar />, color: '#3b82f6', bgLight: '#dbeafe', badgeNum: pendingCounts['leaves'] || 0 },
    { id: 'assets', label: 'العهد والأصول', icon: <Package />, color: '#0ea5e9', bgLight: '#e0f2fe', badgeNum: 0 },
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
      
      <div className="overflow-x-auto no-print mb-6 pb-2" style={{ direction: 'rtl' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '12px', minWidth: '1450px' }}>
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
