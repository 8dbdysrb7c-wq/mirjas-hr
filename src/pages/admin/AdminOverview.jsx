import React, { useEffect, useState } from 'react';
import { getEmployees, getOrders, getSalesOrders, getMissions, getSupervisorReports, getSmokingLogs, isAdmin, getAttendanceLogs, getReports, getHRLeaves, getHRAdvances, getMissingPunches } from '../../store';
import { ChevronLeft, UserCheck, UserX, Clock, ClipboardList, TrendingUp, CheckCircle2, ShieldCheck, Activity, FileText, Users, CalendarPlus, LogOut, DollarSign, Fingerprint, Search } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import OrderTrackerModal from '../../components/OrderTrackerModal';

const MySwal = withReactContent(Swal);
import './AdminOverview.css';

const toLocalDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().split('T')[0];
};

const AnimatedNumber = ({ value, duration = 900, suffix = '' }) => {
  const numericValue = Number(value) || 0;
  const [displayValue, setDisplayValue] = useState(numericValue);

  useEffect(() => {
    let animationFrame;
    const start = performance.now();
    const initialValue = displayValue;
    const delta = numericValue - initialValue;

    if (delta === 0) return undefined;

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = initialValue + delta * eased;
      setDisplayValue(progress >= 1 ? numericValue : nextValue);
      if (progress < 1) animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [numericValue]);

  return <span>{Math.round(displayValue).toLocaleString('en-US')}{suffix}</span>;
};

const CircularProgress = ({ percentage, color }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '96px', height: '96px' }}>
      <svg style={{ transform: 'rotate(-90deg)', width: '96px', height: '96px' }}>
        <circle cx="48" cy="48" r={radius} stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
        <circle 
          cx="48" cy="48" r={radius} 
          stroke={color} 
          strokeWidth="8" 
          fill="transparent" 
          strokeDasharray={circumference} 
          strokeDashoffset={strokeDashoffset} 
          style={{ transition: 'stroke-dashoffset 1s ease-out' }} 
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b' }}>{percentage}%</span>
      </div>
    </div>
  );
};

const AdminOverview = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    production: { active: 0, delayed: 0, todayCompleted: 0 },
    delivery: { active: 0, delayed: 0 },
    sales: { active: 0, delayed: 0, todayCompleted: 0 },
    employees: { total: 0, present: 0, absent: 0, late: 0 },
    supervisors: { present: 0, total: 0 },
    reports: { submitted: 0, required: 0 },
    employeeReports: { submitted: 0, required: 0 },
    smokingArea: { status: 'unknown' },
    quality: 0,
    hrPending: { leaves: 0, missions: 0, overtime: 0, advances: 0, missingPunches: 0 }
  });

  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [trackerSearchTerm, setTrackerSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      const [prodOrd, salesOrd, emps, missions, supReports, sLogs, allAttLogs, empReports, hrLeaves, advances, missingPunches] = await Promise.all([
        getOrders(),
        getSalesOrders(),
        getEmployees(),
        getMissions(),
        getSupervisorReports(),
        getSmokingLogs(),
        getAttendanceLogs(),
        getReports(),
        getHRLeaves(),
        getHRAdvances(),
        getMissingPunches()
      ]);

      if (!isMounted) return;

      const todayKey = toLocalDateKey();
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      // --- Production ---
      const activeProd = prodOrd.filter(o => o.status !== 'منتهي');
      const delayedProd = activeProd.filter(o => {
        if (o.executionStatus === 'متعثر') return true;
        const createdAt = new Date(o.createdAt || new Date());
        return createdAt < threeDaysAgo;
      }).length;
      const todayCompletedProd = prodOrd.filter(o => o.status === 'منتهي' && o.statusUpdateDate === todayKey).length;

      // --- Delivery ---
      const activeMissions = missions.filter(m => m.status !== 'تم الإنجاز');
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const delayedMissions = activeMissions.filter(m => {
        const createdAt = new Date(m.createdAt || new Date());
        return createdAt < oneDayAgo;
      }).length;

      // --- Sales ---
      const activeSales = salesOrd.filter(o => !['تم التوصيل', 'ملغي', 'مرفوض', 'منتهي'].includes(o.status));
      const delayedSales = activeSales.filter(o => {
        const createdAt = new Date(o.createdAt || new Date());
        return createdAt < threeDaysAgo;
      }).length;
      const todayCompletedSales = salesOrd.filter(o => o.status === 'تم التوصيل' && o.statusUpdateDate === todayKey).length;

      // --- Employees ---
      const normalEmps = emps.filter(e => !isAdmin(e));
      const todayReports = supReports.filter(r => r.date === todayKey);
      const todayLogs = allAttLogs.filter(log => log.date === todayKey);
      
      let absentCount = 0;
      let lateCount = 0;
      let presentCount = 0;
      let totalRating = 0;
      let ratingCount = 0;
      
      let presentList = [];
      let absentList = [];
      let lateList = [];

      // Count direct attendance logs first
      normalEmps.forEach(emp => {
         const empLog = todayLogs.find(l => String(l.employeeId || '').trim() === String(emp.id || '').trim() || String(l.employeeName || '').trim() === String(emp.name || '').trim());
         if (empLog) {
            if (empLog.status === 'غياب') {
               absentCount++;
               absentList.push(emp.name);
            }
            else if (empLog.status === 'حضور') {
               presentCount++;
               presentList.push(emp.name);
            }
            else if (empLog.status === 'تأخير' || empLog.status === 'حاضر متأخر') {
               presentCount++; // because they are present!
               lateCount++;
               presentList.push(emp.name);
               lateList.push(emp.name);
            }
         }
      });

      // Also still account for quality scores from reports
      todayReports.forEach(r => {
        if (r.employeeEvaluations) {
          Object.values(r.employeeEvaluations).forEach(ev => {
            if (ev.rating === 'ممتاز') { totalRating += 100; ratingCount++; }
            else if (ev.rating === 'جيد') { totalRating += 80; ratingCount++; }
            else if (ev.rating === 'مقبول') { totalRating += 60; ratingCount++; }
            else if (ev.rating === 'سيئ') { totalRating += 40; ratingCount++; }
          });
        }
      });

      // If we don't have attendance logs, maybe fallback to ratingCount or legacy report delays?
      if (presentCount === 0 && ratingCount > 0 && absentCount === 0) {
          presentCount = ratingCount;
          todayReports.forEach(r => {
              absentCount += (r.absences?.length || 0);
              lateCount += (r.delays?.length || 0);
          });
      }

      const qualityScore = ratingCount > 0 ? Math.round(totalRating / ratingCount) : 100; // Default 100 if no evals yet

      const allSupervisors = emps.filter(e => e.level === 'supervisor' || e.level === 'مشرف' || e.level === 'مشرف قسم' || e.userType === 'مشرف قسم' || e.role === 'مشرف قسم' || e.permissions?.isSupervisor || (e.name && e.name.includes('مشرف')));
      const supervisorsTotal = allSupervisors.length > 0 ? allSupervisors.length : 1; 

      let supervisorsPresentCount = 0;
      let supervisorsPresentList = [];
      allSupervisors.forEach(sup => {
          const supLog = todayLogs.find(l => String(l.employeeId || '').trim() === String(sup.id || '').trim() || String(l.employeeName || '').trim() === String(sup.name || '').trim());
          if (supLog && (supLog.status === 'حضور' || supLog.status === 'حاضر متأخر' || supLog.status === 'تأخير')) {
              supervisorsPresentCount++;
              supervisorsPresentList.push(sup.name);
          }
      });

      const uniqueSupervisorsReported = new Set(todayReports.map(r => r.supervisorId)).size;
      const finalSupervisorsPresent = Math.max(supervisorsPresentCount, uniqueSupervisorsReported);
      // Fallback if we have reports but no attendance logs for supervisors
      if (supervisorsPresentList.length === 0 && todayReports.length > 0) {
        const supIds = [...new Set(todayReports.map(r => r.supervisorId))];
        supervisorsPresentList = supIds.map(id => allSupervisors.find(s => s.id === id)?.name || 'مشرف غير معروف');
      }

      const smokingLogsToday = sLogs.filter(log => toLocalDateKey(log.timestamp) === todayKey);
      smokingLogsToday.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const latestSmokingLog = smokingLogsToday[0];
      const smokingStatus = latestSmokingLog ? (latestSmokingLog.status.includes('مخالف') ? 'bad' : 'good') : 'unknown';
      const submittedReports = todayReports.length;
      const expectedReports = Math.max(1, supervisorsTotal);

      const todayEmpReports = empReports.filter(r => r.date === todayKey);

      const pendingLeaves = hrLeaves.filter(l => l.status === 'معلق' && ['إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'].includes(l.type)).length;
      const pendingMissions = hrLeaves.filter(l => l.status === 'معلق' && ['مغادرة خاصة', 'مغادرة عمل'].includes(l.type)).length;
      const pendingOvertime = hrLeaves.filter(l => l.status === 'معلق' && l.type === 'بدل عمل إضافي').length;
      const pendingAdvances = advances ? advances.filter(a => a.status === 'معلق').length : 0;
      const pendingMissingPunches = missingPunches ? missingPunches.filter(p => p.status === 'معلق' || p.status === 'قيد المراجعة').length : 0;

      const regularEmpsCount = normalEmps.filter(e => !allSupervisors.some(s => s.id === e.id)).length;

      setData({
        production: { active: activeProd.length, delayed: delayedProd, todayCompleted: todayCompletedProd },
        delivery: { active: activeMissions.length, delayed: delayedMissions },
        sales: { active: activeSales.length, delayed: delayedSales, todayCompleted: todayCompletedSales },
        employees: { 
          total: normalEmps.length, 
          present: presentCount, 
          absent: absentCount, 
          late: lateCount,
          presentList,
          absentList,
          lateList
        },
        supervisors: { 
          present: finalSupervisorsPresent, 
          total: expectedReports,
          presentList: supervisorsPresentList
        },
        reports: { submitted: submittedReports, required: expectedReports },
        employeeReports: { submitted: todayEmpReports.length, required: regularEmpsCount },
        smokingArea: { status: smokingStatus },
        quality: qualityScore,
        hrPending: { leaves: pendingLeaves, missions: pendingMissions, overtime: pendingOvertime, advances: pendingAdvances, missingPunches: pendingMissingPunches }
      });

      setLoading(false);
    };

    fetchData();
    const intervalId = window.setInterval(fetchData, 60000);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const handleShowListModal = (title, list) => {
    if (!list || list.length === 0) {
      MySwal.fire({
        icon: 'info',
        title: 'لا يوجد بيانات',
        text: 'لا توجد أسماء لعرضها في هذه القائمة حالياً.',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#10b981'
      });
      return;
    }

    const htmlList = list.map(name => `<div style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #1e293b; font-weight: 500;">${name}</div>`).join('');
    
    MySwal.fire({
      title: title,
      html: `<div style="max-height: 300px; overflow-y: auto; text-align: right;">${htmlList}</div>`,
      confirmButtonText: 'إغلاق',
      confirmButtonColor: '#10b981',
      width: '400px'
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="overview-wrapper">
      
      {/* Header */}
      <div className="overview-header">
        <div className="pulse-dot"></div>
        <span className="header-status">مباشر</span>
        <h2 className="header-title">نظرة سريعة على أداء المصنع</h2>
      </div>

      {/* Unified 4x4 Grid for all 16 cards */}
      <div className="overview-grid unified-grid">
        
        {/* 1 */}
        <div className="stat-card prod-theme">
          <div className="icon-wrapper">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15h16"/><path d="M6 15v2"/><path d="M10 15v2"/><path d="M14 15v2"/><path d="M18 15v2"/><rect x="2" y="8" width="8" height="7" rx="1"/><rect x="14" y="5" width="8" height="10" rx="1"/><path d="M6 8V6a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2"/></svg>
          </div>
          <h3 className="stat-title">طلبات قيد الانتاج</h3>
          <div className="stat-number"><AnimatedNumber value={data.production.active} /></div>
          <div className="stat-pill">{data.production.delayed} متعثر</div>
          <button className="card-button" onClick={() => onNavigate && onNavigate('production-orders')}>
            <span>عرض التفاصيل</span>
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* 2 */}
        <div className="stat-card del-theme">
          <div className="icon-wrapper">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/><path d="M14 17h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
          </div>
          <h3 className="stat-title">طلبات قيد التوصيل</h3>
          <div className="stat-number"><AnimatedNumber value={data.delivery.active} /></div>
          <div className="stat-pill">{data.delivery.delayed} متأخرة</div>
          <button className="card-button" onClick={() => onNavigate && onNavigate('delivery')}>
            <span>عرض التفاصيل</span>
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* 3 */}
        <div className="stat-card sales-theme">
          <div className="icon-wrapper">
            <ClipboardList size={28} />
          </div>
          <h3 className="stat-title">طلبات قيد التجهيز</h3>
          <div className="stat-number"><AnimatedNumber value={data.sales.active} /></div>
          <div className="stat-pill">{data.sales.delayed} متأخرة</div>
          <button className="card-button" onClick={() => onNavigate && onNavigate('sales')}>
            <span>عرض التفاصيل</span>
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* 4 */}
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #fdf4ff 0%, #f3e8ff 100%)', borderColor: '#e9d5ff' }}>
          <div className="icon-wrapper" style={{ backgroundColor: '#e9d5ff', color: '#9333ea' }}>
            <Search size={28} />
          </div>
          <h3 className="stat-title">تتبع الطلبات</h3>
          <div className="stat-number"><span style={{ fontSize: '22px' }}>تتبع داخلي</span></div>
          <div className="stat-pill" style={{ color: '#9333ea', backgroundColor: 'rgba(147, 51, 234, 0.1)' }}>مباشر</div>
          <button className="card-button" onClick={() => {
            setTrackerSearchTerm('');
            setShowTrackerModal(true);
          }}>
            <span style={{ color: '#9333ea', fontWeight: 'bold' }}>افتح نافذة التتبع</span>
            <ChevronLeft size={16} style={{ color: '#9333ea' }} />
          </button>
        </div>

        {/* 5 */}
        <div className="stat-card sup-theme">
          <div className="icon-wrapper">
            <ShieldCheck size={28} />
          </div>
          <h3 className="stat-title">المشرفون المتواجدون</h3>
          <div className="stat-number"><AnimatedNumber value={data.supervisors.present} /></div>
          <div className="stat-pill">من أصل {data.supervisors.total}</div>
          <button className="card-button" onClick={() => handleShowListModal('المشرفون المتواجدون', data.supervisors.presentList)}>
            <span>عرض التفاصيل</span>
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* 6 */}
        <div className={`stat-card ${data.smokingArea.status === 'bad' ? 'smoke-bad-theme' : 'smoke-good-theme'}`}>
          <div className="icon-wrapper">
            <Activity size={28} />
          </div>
          <h3 className="stat-title">منطقة الطعام والتدخين</h3>
          <div className="stat-number text-2xl font-bold" style={{ fontSize: '32px' }}>
            {data.smokingArea.status === 'bad' ? 'مخالف' : (data.smokingArea.status === 'good' ? 'مثالي' : 'غير محدد')}
          </div>
          <div className="stat-pill">حالة اليوم</div>

        </div>

        {/* 7 */}
        <div className="stat-card report-theme">
          <div className="icon-wrapper">
            <ClipboardList size={28} />
          </div>
          <h3 className="stat-title">تقارير المشرفين</h3>
          <div className="stat-number" style={{ fontSize: '36px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AnimatedNumber value={data.reports.submitted} /> <span style={{ fontSize: '24px', color: '#94a3b8' }}>/ {data.reports.required}</span>
          </div>
          <div className="stat-pill">تقرير مستلم</div>
          <button className="card-button" onClick={() => onNavigate && onNavigate('supervisor-reports')}>
            <span>عرض التفاصيل</span>
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* 8 */}
        <div className="stat-card prod-theme" style={{ borderColor: '#bbf7d0' }}>
          <div className="icon-wrapper" style={{ backgroundColor: '#dcfce3', color: '#16a34a' }}>
            <UserCheck size={28} />
          </div>
          <h3 className="stat-title">الموظفون المتواجدون</h3>
          <div className="stat-number"><AnimatedNumber value={data.employees.present} /></div>
          <div className="stat-pill">من أصل {data.employees.total}</div>
          <button className="card-button" onClick={() => handleShowListModal('الموظفون المتواجدون', data.employees.presentList)}>
            <span>عرض التفاصيل</span>
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* 9 */}
        <div className="stat-card absent-theme">
          <div className="icon-wrapper">
            <UserX size={28} />
          </div>
          <h3 className="stat-title">الموظفون الغائبون</h3>
          <div className="stat-number"><AnimatedNumber value={data.employees.absent} /></div>
          <div className="stat-pill">اليوم</div>
          <button className="card-button" onClick={() => handleShowListModal('الموظفون الغائبون', data.employees.absentList)}>
            <span>عرض التفاصيل</span>
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* 10 */}
        <div className="stat-card late-theme">
          <div className="icon-wrapper">
            <Clock size={28} />
          </div>
          <h3 className="stat-title">الموظفون المتأخرون</h3>
          <div className="stat-number"><AnimatedNumber value={data.employees.late} /></div>
          <div className="stat-pill">اليوم</div>
          <button className="card-button" onClick={() => handleShowListModal('الموظفون المتأخرون', data.employees.lateList)}>
            <span>عرض التفاصيل</span>
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* 11 */}
        <div className="stat-card report-theme" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)', borderColor: '#bbf7d0' }}>
          <div className="icon-wrapper" style={{ backgroundColor: '#dcfce3', color: '#16a34a' }}>
            <FileText size={28} />
          </div>
          <h3 className="stat-title">تقارير الموظفين</h3>
          <div className="stat-number" style={{ fontSize: '36px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AnimatedNumber value={data.employeeReports.submitted} /> <span style={{ fontSize: '24px', color: '#94a3b8' }}>/ {data.employeeReports.required}</span>
          </div>
          <div className="stat-pill">اليوم</div>
          <button className="card-button" onClick={() => onNavigate && onNavigate('reports')}>
            <span>عرض التفاصيل</span>
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* 12 */}
        <div className="stat-card leaves-theme">
          <div className="icon-wrapper">
            <CalendarPlus size={28} />
          </div>
          <h3 className="stat-title">الإجازات</h3>
          <div className="stat-number"><AnimatedNumber value={data.hrPending.leaves} /></div>
          <div className="stat-pill">طلبات معلقة</div>
          <button className="card-button" onClick={() => onNavigate && onNavigate({ tab: 'hr', subTab: 'leaves' })}>
            <span>عرض الطلبات</span>
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* 13 */}
        <div className="stat-card missions-theme">
          <div className="icon-wrapper">
            <LogOut size={28} style={{ transform: 'rotate(180deg)' }} />
          </div>
          <h3 className="stat-title">المغادرات</h3>
          <div className="stat-number"><AnimatedNumber value={data.hrPending.missions} /></div>
          <div className="stat-pill">طلبات معلقة</div>
          <button className="card-button" onClick={() => onNavigate && onNavigate({ tab: 'hr', subTab: 'leaves' })}>
            <span>عرض الطلبات</span>
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* 14 */}
        <div className="stat-card overtime-theme">
          <div className="icon-wrapper">
            <Clock size={28} />
          </div>
          <h3 className="stat-title">عمل إضافي</h3>
          <div className="stat-number"><AnimatedNumber value={data.hrPending.overtime} /></div>
          <div className="stat-pill">طلبات معلقة</div>
          <button className="card-button" onClick={() => onNavigate && onNavigate({ tab: 'hr', subTab: 'overtime' })}>
            <span>عرض الطلبات</span>
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* 15 */}
        <div className="stat-card advances-theme">
          <div className="icon-wrapper">
            <DollarSign size={28} />
          </div>
          <h3 className="stat-title">السلفة</h3>
          <div className="stat-number"><AnimatedNumber value={data.hrPending.advances} /></div>
          <div className="stat-pill">طلبات معلقة</div>
          <button className="card-button" onClick={() => onNavigate && onNavigate({ tab: 'hr', subTab: 'advances' })}>
            <span>عرض الطلبات</span>
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* 16 */}
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderColor: '#e2e8f0' }}>
          <div className="icon-wrapper" style={{ backgroundColor: '#e2e8f0', color: '#64748b' }}>
            <Fingerprint size={28} />
          </div>
          <h3 className="stat-title">ختمة ناقصة</h3>
          <div className="stat-number"><AnimatedNumber value={data.hrPending.missingPunches} /></div>
          <div className="stat-pill">طلبات معلقة</div>
          <button className="card-button" onClick={() => onNavigate && onNavigate({ tab: 'hr', subTab: 'missing-punches' })}>
            <span>عرض الطلبات</span>
            <ChevronLeft size={16} />
          </button>
        </div>

      </div>

      {/* Order Tracker Modal */}
      {showTrackerModal && (
        <OrderTrackerModal 
          initialOrderNumber={trackerSearchTerm} 
          onClose={() => {
            setShowTrackerModal(false);
            setTrackerSearchTerm('');
          }} 
        />
      )}

    </div>
  );
};

export default AdminOverview;

