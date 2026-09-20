import { awaitsPetitionAdmin } from '../../utils/petitionConversation';
import { watchPetitions } from '../../services/petitionConversation';
import { getHRBadgeData } from '../../services/hrBadgeData';
import { getMissingPunches as detectMissingPunches } from '../../utils/missingPunches';
import { isActiveEmployee } from '../../utils/employeeStatus';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getEmployees, getHRAttendanceByDateRange, getGlobalSettings, getAttendanceLogsByDateRange, getReportsByDateRange, getSupervisorReportsByDateRange } from '../../store';
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
import HREmployeeAlerts from './HREmployeeAlerts';
import { hasPermission } from '../../utils/permissions';
import './hr.css';

const HR_TAB_PERMISSIONS = {
  attendance: 'hr_attendance',
  leaves: 'hr_leaves',
  'attendance-alerts': 'hr_attendance_alerts',
  'missing-punches': 'hr_missing_punches',
  overtime: 'hr_overtime',
  advances: 'hr_advances',
  petitions: 'hr_petitions',
  assets: 'hr_assets',
  'bonuses-violations': 'hr_bonuses_violations',
  salaries: 'hr_salaries',
  'salary-reports': 'hr_salary_reports',
  settlement: 'hr_settlement',
  'employee-alerts': 'hr_employee_alerts'
};

const AdminHR = ({ user, notificationTarget }) => {
  const [activeTab, setActiveTab] = useState('attendance');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [approvalFilters, setApprovalFilters] = useState({ dateMode: 'month', selectedMonth: new Date().toISOString().slice(0, 7), searchTerm: '' });
  const [approvalRequests, setApprovalRequests] = useState([]);
  const pendingApprovalCount = approvalRequests.filter(request => {
    if (request.status !== 'معلق') return false;
    if (approvalFilters.searchTerm && String(request.employeeId) !== String(approvalFilters.searchTerm)) return false;
    if (!request.date) return false;
    const date = new Date(request.date).toISOString().slice(0, 10);
    if (approvalFilters.dateMode === 'day') return date === approvalFilters.selectedDate;
    if (approvalFilters.dateMode === 'month') return date.slice(0, 7) === approvalFilters.selectedMonth;
    return date >= approvalFilters.startDate && date <= approvalFilters.endDate;
  }).length;
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

  useEffect(() => {
    if (!hasPermission(user, 'hr_petitions', 'view')) return;
    return watchPetitions(user, true, rows => setPendingCounts(counts => ({ ...counts, petitions: rows.filter(awaitsPetitionAdmin).length })), console.error);
  }, [user.id]);

  const countsLoadingRef = useRef(false);
  const countsQueuedRef = useRef(false);
  const [countsLoading, setCountsLoading] = useState(false);
  const [countsError, setCountsError] = useState('');
  const fetchCounts = async () => {
    if (countsLoadingRef.current) { countsQueuedRef.current = true; return; }
    countsLoadingRef.current = true;
    setCountsLoading(true);
    setCountsError('');
    try {
      const todayStr = new Date().toLocaleDateString('en-CA');
      const currentMonthStr = todayStr.substring(0, 7);
      const monthStart = `${currentMonthStr}-01`;

      const badgeData = await getHRBadgeData(monthStart, todayStr, false);
      const { leaves = [], mps = [], violations = [], employeeAlerts = [], bonuses = [], advances = 0, assets = 0 } = badgeData || {};

      const pendingLeaves = leaves.filter(l => l.type !== 'بدل عمل إضافي' && (l.status === 'معلق' || l.status === 'قيد المراجعة')).length;
      const pendingOvertime = leaves.filter(l => l.type === 'بدل عمل إضافي' && (l.status === 'معلق' || l.status === 'قيد المراجعة')).length;
      const pendingAdvances = advances;
      const activeAssets = assets;
      const pendingMpsCount = mps.filter(m => m.status === 'قيد المراجعة' || m.status === 'معلق').length;
      const pendingAlerts = violations.filter(v => (!v.date || v.date.startsWith(currentMonthStr)) && (v.status === 'معلق' || v.action === 'معلق' || !v.action)).length;
      const pendingEmpAlerts = employeeAlerts.filter(alert => !alert.archived && alert.status === 'pending').length;

      let finalAlertsCount = pendingAlerts;
      let finalMpsCount = pendingMpsCount;
      try {
        const storedAlerts = localStorage.getItem('hr_pending_attendance_alerts');
        if (storedAlerts !== null && !isNaN(Number(storedAlerts))) {
          finalAlertsCount = Number(storedAlerts);
        }
        const storedMps = localStorage.getItem('hr_pending_missing_punches');
        if (storedMps !== null && !isNaN(Number(storedMps))) {
          finalMpsCount = Number(storedMps);
        }
      } catch (_) {}

      setApprovalRequests([...violations, ...bonuses]);
      setPendingCounts(current => ({
        ...current,
        leaves: pendingLeaves,
        overtime: pendingOvertime,
        'missing-punches': current['missing-punches'] || finalMpsCount,
        advances: pendingAdvances,
        assets: activeAssets,
        'attendance-alerts': (current['attendance-alerts'] !== undefined && current['attendance-alerts'] > 0) ? current['attendance-alerts'] : finalAlertsCount,
        'employee-alerts': pendingEmpAlerts
      }));
    } catch (error) {
      console.error('Failed to refresh HR badges', error);
      setCountsError('تعذر تحديث العدادات. حاول مرة أخرى.');
    } finally {
      countsLoadingRef.current = false;
      setCountsLoading(false);
      if (countsQueuedRef.current) { countsQueuedRef.current = false; void fetchCounts(); }
    }
  };

  useEffect(() => {
    void fetchCounts();
  }, []);

  const renderContent = () => {
    if (activeTab === 'employee-profile' && selectedEmployeeId) {
      return <EmployeeProfile user={user} employeeId={selectedEmployeeId} onBack={() => setActiveTab('employees')} />;
    }

    const resolvedActiveTab = hasPermission(user, HR_TAB_PERMISSIONS[activeTab])
      ? activeTab
      : Object.keys(HR_TAB_PERMISSIONS).find(tab => hasPermission(user, HR_TAB_PERMISSIONS[tab]));
    
    switch (resolvedActiveTab) {
      case 'dashboard': return <HRDashboard user={user} onNavigate={setActiveTab} />;
      case 'attendance': return <HRAttendance user={user} refreshCounts={() => fetchCounts(true)} />;
      case 'leaves': return <HRLeaves user={user} refreshCounts={() => fetchCounts(true)} />;
      case 'advances': return <HRAdvances user={user} refreshCounts={() => fetchCounts(false)} />;
      case 'petitions': return <HRPetitions user={user} refreshCounts={() => fetchCounts(false)} />;
      case 'missing-punches': return <HRMissingPunches user={user} refreshCounts={() => fetchCounts()} onCountsCalculated={(cnt) => handleCountsCalculated('missing-punches', cnt)} />;
      case 'attendance-alerts': return <HRAttendanceAlerts user={user} refreshCounts={() => fetchCounts()} onCountsCalculated={(cnt) => handleCountsCalculated('attendance-alerts', cnt)} />;
      case 'overtime': return <HROvertime user={user} refreshCounts={() => fetchCounts(false)} />;
      case 'bonuses-violations': return <HRBonusesAndViolations user={user} refreshCounts={() => fetchCounts(true)} onFiltersChange={setApprovalFilters} />;
      case 'salaries': return <HRSalaries user={user} />;
      case 'salary-reports': return <HRSalaryReports user={user} />;
      case 'assets': return <HRAssets user={user} refreshCounts={() => fetchCounts(false)} />;
      case 'settlement': return <HRSettlement user={user} />;
      case 'employee-alerts': return <HREmployeeAlerts user={user} refreshCounts={() => fetchCounts(false)} />;
      default: return <HRAttendance user={user} refreshCounts={() => fetchCounts(true)} />;
    }
  };

  const navItems = [
    { id: 'attendance', permission: 'hr_attendance', label: 'الحضور والانصراف', icon: <Clock />, color: '#14b8a6', bgLight: '#ccfbf1', customBadge: 'اليوم' },
    { id: 'leaves', permission: 'hr_leaves', label: 'الإجازات والمغادرات', icon: <Calendar />, color: '#3b82f6', bgLight: '#dbeafe', badgeNum: pendingCounts['leaves'] || 0 },
    { id: 'attendance-alerts', permission: 'hr_attendance_alerts', label: 'تنبيهات الحضور والانصراف', icon: <AlertTriangle />, color: '#f43f5e', bgLight: '#ffe4e6', badgeNum: pendingCounts['attendance-alerts'] || 0 },
    { id: 'missing-punches', permission: 'hr_missing_punches', label: 'الختمات الناقصة', icon: <Fingerprint />, color: '#8b5cf6', bgLight: '#f3e8ff', badgeNum: pendingCounts['missing-punches'] || 0 },
    { id: 'overtime', permission: 'hr_overtime', label: 'العمل الإضافي', icon: <Clock />, color: '#f59e0b', bgLight: '#fef3c7', badgeNum: pendingCounts['overtime'] || 0 },
    { id: 'advances', permission: 'hr_advances', label: 'السلف', icon: <DollarSign />, color: '#10b981', bgLight: '#d1fae5', badgeNum: pendingCounts['advances'] || 0 },
    { id: 'petitions', permission: 'hr_petitions', label: 'الاستدعاءات', icon: <FileText />, color: '#3b82f6', bgLight: '#dbeafe', badgeNum: pendingCounts['petitions'] || 0 },
    { id: 'assets', permission: 'hr_assets', label: 'العهدة', icon: <Package />, color: '#0ea5e9', bgLight: '#e0f2fe', badgeNum: pendingCounts['assets'] || 0 },
    { id: 'bonuses-violations', permission: 'hr_bonuses_violations', label: 'المكافآت والمخالفات', icon: <ArrowUpDown />, color: '#a855f7', bgLight: '#f3e8ff', badgeNum: pendingApprovalCount },
    { id: 'salaries', permission: 'hr_salaries', label: 'الرواتب', icon: <FileText />, color: '#6366f1', bgLight: '#e0e7ff' },
    { id: 'salary-reports', permission: 'hr_salary_reports', label: 'مركز التقارير', icon: <BarChart2 />, color: '#2563eb', bgLight: '#dbeafe', customBadge: 'التقارير' },
    { id: 'settlement', permission: 'hr_settlement', label: 'مخالصة وبراءة ذمة', icon: <FileText />, color: '#f43f5e', bgLight: '#ffe4e6', customBadge: 'مهم' },
    { id: 'employee-alerts', permission: 'hr_employee_alerts', label: 'تنبيهات الموظفين', icon: <Bell />, color: '#ea580c', bgLight: '#ffedd5', badgeNum: pendingCounts['employee-alerts'] || 0 }
  ].filter(item => hasPermission(user, item.permission));

  const handleNavClick = (id) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="hr-layout">
      <div className="no-print" dir="rtl" style={{ marginBottom: 12 }}>
        <button type="button" onClick={() => fetchCounts()} disabled={countsLoading} className="btn btn-secondary">
          {countsLoading ? 'جاري تحديث العدادات...' : 'تحديث العدادات'}
        </button>
        {countsError && <span role="alert" style={{ color: '#b91c1c', marginInlineStart: 12 }}>{countsError}</span>}
      </div>
      
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
                
                {(item.customBadge !== undefined || item.badgeNum !== undefined) && <div style={{
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
                  {!item.hideBadgeIcon && React.cloneElement(item.icon, { size: 13, strokeWidth: 2.5 })}
                </div>}
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
