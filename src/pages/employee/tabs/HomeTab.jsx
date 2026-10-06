import React from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, RefreshCw, Fingerprint, LogOut, CheckCircle2, 
  ClipboardCheck, Activity, Truck, ShoppingCart, 
  Settings as SewingMachineIcon, Layers, Users, FileText, Settings, 
  Plus, Clock, DollarSign, Calendar as CustomCalendar, 
  FileText as CustomReport, Folder as CustomFolder, ClipboardList,
  LogIn, Edit3, Package, AlertTriangle
} from 'lucide-react';
import Swal from 'sweetalert2';
import { isAdmin } from '../../../store';
import { hasPermission } from '../../../utils/permissions';

// DashboardCard is assumed to be imported locally inside EmployeeDashboard, 
// so we might need to pass it or we should just import it if it's external.
// Actually, EmployeeDashboard has DashboardCard as an internal component or imported.
// Wait, looking at EmployeeDashboard, DashboardCard is likely imported from components.
// We'll pass it as a prop for now to avoid import issues, or import it if it's standard.
// For now, let's pass it as a prop.

export const HomeTab = ({
  isMobile,
  isFlash,
  fetchAddress,
  isCheckingInOut,
  currentAddress,
  LiveClock, // Pass the LiveClock component
  todayAttendance,
  handleGPSAction,
  DashboardCard, // Pass the component
  allowedLeaveTypes,
  leaveFormData,
  setLeaveFormData,
  setShowLeaveModal,
  calculatedVacationBalance,
  calculatedSickBalance,
  handleTabChange,
  user,
  setShowAdvanceModal,
  canViewMissions,
  isSupervisor,
  canViewSupervisorReports,
  remainingPunches,
  bonusPunches,
  setShowMissingPunchModal,
  pendingTasksCount,
  pendingSalesOrdersCount,
  pendingProductionCount,
  pendingPackagingCount,
  pendingPreparationCount,
  pendingMissionsCount,
  pendingDeliveryMissionsCount,
  pendingStockAuditsCount,
  setShowPetitionModal,
  todayEvaluatedReport,
  handleViewReportDetails
}) => {
  const [showManualActionModal, setShowManualActionModal] = React.useState(false);
  const [manualActionOverride, setManualActionOverride] = React.useState(null);
  
  const [liveTime, setLiveTime] = React.useState(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = liveTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const timeParts = timeStr.split(' ');
  const onlyTime = timeParts[0] || '';
  const amPm = timeParts[1] || '';

  const dateStr = liveTime.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const dayName = liveTime.toLocaleDateString('ar-EG', { weekday: 'long' });

  const formatTimeOnly = (tStr) => {
    if (!tStr || tStr === '--:--') return '--:--';
    const clean = String(tStr).replace(/[صم]/g, '').trim();
    const parts = clean.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return clean;
  };

  const currentAction = manualActionOverride || 
    ((!todayAttendance?.timeIn || todayAttendance?.timeIn === '--:--') ? 'in' : 
     (!todayAttendance?.timeOut || todayAttendance?.timeOut === '--:--') ? 'out' : 'done');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="employee-home-container animate-fade-in" style={{ paddingBottom: isMobile ? '100px' : '0' }}>
      {/* GPS Live Attendance Card (Compact & Clean Theme) */}
      <div className={`mb-6 glass-card relative overflow-hidden transition-all duration-300 ${isFlash ? 'ring-2 ring-primary shadow-lg scale-[1.02] z-50' : ''}`} style={{ padding: 0 }}>
        <div style={{ backgroundColor: '#ffffff', padding: isMobile ? '0.75rem' : '1.5rem', display: 'flex', flexDirection: 'column', gap: isMobile ? '0.75rem' : '1.25rem', boxSizing: 'border-box' }}>
          {/* Top Info Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', width: '100%', direction: 'rtl' }}>
            
            {/* Location (Right Side in RTL) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '0.75rem' }}>
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #f1f5f9',
                borderRadius: '16px',
                padding: isMobile ? '0.5rem' : '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                color: '#0f766e',
                height: isMobile ? '38px' : '46px',
                width: isMobile ? '38px' : '46px',
                boxSizing: 'border-box'
              }}>
                <MapPin size={isMobile ? 18 : 24} style={{ color: '#0f766e' }} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <h4 style={{ fontWeight: '800', color: '#1e293b', fontSize: isMobile ? '0.8rem' : '0.95rem', margin: 0, marginBottom: '0.15rem' }}>موقع الدوام</h4>
                <span style={{ color: '#0f766e', fontWeight: 'bold', fontSize: isMobile ? '0.7rem' : '0.8rem', display: 'block', maxWidth: isMobile ? '100px' : '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentAddress}
                </span>
              </div>
            </div>
            
            {/* Live Clock (Center) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', direction: 'ltr' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem', direction: 'ltr' }}>
                <span style={{ fontSize: isMobile ? '1.35rem' : '1.75rem', fontWeight: '800', color: '#1e293b', letterSpacing: '0.02em', fontFamily: 'sans-serif' }}>
                  {onlyTime}
                </span>
                <span style={{ fontSize: isMobile ? '0.7rem' : '0.85rem', fontWeight: '800', color: '#0f766e', textTransform: 'uppercase' }}>
                  {amPm}
                </span>
              </div>
              <div style={{ fontSize: isMobile ? '0.7rem' : '0.8rem', color: '#64748b', marginTop: '0.15rem', fontWeight: 'bold' }}>
                {dateStr} - {dayName}
              </div>
            </div>

            {/* Refresh (Left Side in RTL) */}
            <button 
              onClick={fetchAddress} 
              disabled={isCheckingInOut}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #f1f5f9',
                borderRadius: '16px',
                padding: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.15rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                minWidth: isMobile ? '46px' : '55px',
                height: isMobile ? '46px' : '55px',
                boxSizing: 'border-box'
              }}
            >
              <RefreshCw size={isMobile ? 14 : 18} className={isCheckingInOut ? 'animate-spin' : ''} style={{ color: '#0f766e' }} />
              <span style={{ fontSize: isMobile ? '0.55rem' : '0.65rem', color: '#64748b', fontWeight: 'bold' }}>تحديث</span>
            </button>
            
          </div>

          {todayAttendance?.isError && (
            <div style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fef3c7',
              color: '#b45309',
              padding: '0.65rem 0.9rem',
              borderRadius: '14px',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontSize: '0.8rem',
              fontWeight: '500',
              lineHeight: 1.4
            }}>
              <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
              <span>تعذر التحقق من البصمة حالياً بسبب ضغط الاتصال أو الحصة. لم يتم احتسابك غائباً، يرجى الضغط على زر التحديث بعد قليل.</span>
            </div>
          )}

          {/* Middle Section (Check-in / Check-out Times) */}
          <div style={{
            position: 'relative',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '18px',
            padding: '1.25rem 0.5rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            boxSizing: 'border-box',
            direction: 'ltr'
          }}>
            {/* Divider Line */}
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '10%',
              bottom: '10%',
              width: '1px',
              backgroundColor: '#e2e8f0',
              zIndex: 1
            }}></div>

            {/* Calendar Circle in center */}
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
              color: '#0f766e',
              zIndex: 3
            }}>
              <CustomCalendar size={18} style={{ color: '#0f766e' }} />
            </div>

            {/* Left Column (تسجيل الخروج - Check-Out) */}
            <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
              <div style={{
                position: 'absolute',
                left: isMobile ? '0.2rem' : '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: '#ffffff',
                border: '1px solid #f1f5f9',
                borderRadius: isMobile ? '12px' : '16px',
                padding: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.02)',
                color: '#0f766e',
                width: isMobile ? '38px' : '52px',
                height: isMobile ? '38px' : '52px',
                boxSizing: 'border-box',
                flexShrink: 0
              }}>
                <LogOut size={isMobile ? 18 : 26} style={{ color: '#0f766e', transform: 'scaleX(-1)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <span style={{ color: '#64748b', fontSize: isMobile ? '0.65rem' : '0.75rem', fontWeight: 'bold' }}>تسجيل الخروج</span>
                <span style={{ color: (todayAttendance?.timeOut && todayAttendance?.timeOut !== '--:--') ? '#059669' : '#1e293b', fontSize: isMobile ? '1.25rem' : '1.9rem', fontWeight: '800', fontFamily: 'sans-serif', margin: '0.1rem 0', lineHeight: 1 }}>
                  {(todayAttendance?.timeOut && todayAttendance?.timeOut !== '--:--') ? formatTimeOnly(todayAttendance.timeOut) : '--:--'}
                </span>
                <span style={{ color: '#94a3b8', fontSize: isMobile ? '0.6rem' : '0.75rem', fontWeight: 'bold' }} dir="ltr">
                  {todayAttendance?.date ? todayAttendance.date.split('-').reverse().join('/') : '---'}
                </span>
              </div>
            </div>

            {/* Right Column (تسجيل الدخول - Check-In) */}
            <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <span style={{ color: '#64748b', fontSize: isMobile ? '0.65rem' : '0.75rem', fontWeight: 'bold' }}>تسجيل الدخول</span>
                <span style={{ color: '#1e293b', fontSize: isMobile ? '1.25rem' : '1.9rem', fontWeight: '800', fontFamily: 'sans-serif', margin: '0.1rem 0', lineHeight: 1 }}>
                  {(todayAttendance?.timeIn && todayAttendance?.timeIn !== '--:--') ? formatTimeOnly(todayAttendance.timeIn) : '--:--'}
                </span>
                <span style={{ color: '#94a3b8', fontSize: isMobile ? '0.6rem' : '0.75rem', fontWeight: 'bold' }} dir="ltr">
                  {todayAttendance?.date ? todayAttendance.date.split('-').reverse().join('/') : '---'}
                </span>
              </div>
              <div style={{
                position: 'absolute',
                right: isMobile ? '0.2rem' : '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: '#ffffff',
                border: '1px solid #f1f5f9',
                borderRadius: isMobile ? '12px' : '16px',
                padding: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.02)',
                color: '#1e3a8a',
                width: isMobile ? '38px' : '52px',
                height: isMobile ? '38px' : '52px',
                boxSizing: 'border-box',
                flexShrink: 0
              }}>
                <LogIn size={isMobile ? 18 : 26} style={{ color: '#1e3a8a', transform: 'scaleX(-1)' }} />
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', width: '100%', alignItems: 'center', direction: 'rtl' }}>
            
            {/* Main Action Button (Right Side in RTL) */}
            <div style={{ flex: '1 1 auto', height: '46px' }}>
              {currentAction === 'in' ? (
                <button 
                  onClick={() => { handleGPSAction('in'); setManualActionOverride(null); }}
                  disabled={isCheckingInOut}
                  className="btn btn-primary"
                  style={{ width: '100%', height: '46px', padding: '0 1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 10px rgba(15, 118, 110, 0.2)', fontSize: '0.95rem', fontWeight: 'bold', boxSizing: 'border-box', direction: 'ltr' }}
                >
                  {isCheckingInOut ? (
                    <><div className="spinner w-5 h-5 border-white border-2"></div> <span className="font-bold">التحقق...</span></>
                  ) : (
                    <><Fingerprint size={20} /> <span className="font-bold">تسجيل الدخول</span></>
                  )}
                </button>
              ) : currentAction === 'out' ? (
                <button 
                  onClick={() => { handleGPSAction('out'); setManualActionOverride(null); }}
                  disabled={isCheckingInOut}
                  className="btn btn-danger"
                  style={{ width: '100%', height: '46px', padding: '0 1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 10px rgba(220, 38, 38, 0.2)', fontSize: '0.95rem', fontWeight: 'bold', opacity: isCheckingInOut ? 0.7 : 1, boxSizing: 'border-box', direction: 'ltr' }}
                >
                  {isCheckingInOut ? (
                    <><div className="spinner w-5 h-5 border-white border-2"></div> <span className="font-bold">التحقق...</span></>
                  ) : (
                    <><LogOut size={20} /> <span className="font-bold">تسجيل الخروج</span></>
                  )}
                </button>
              ) : (
                <div style={{ width: '100%', height: '46px', backgroundColor: '#0f766e', color: '#ffffff', padding: '0 1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 10px rgba(15, 118, 110, 0.2)', fontSize: '0.95rem', fontWeight: 'bold', boxSizing: 'border-box', direction: 'ltr' }}>
                  <CheckCircle2 size={20} />
                  <span>اكتمل الدوام اليوم</span>
                </div>
              )}
            </div>
            
            {/* Change Button (Left Side in RTL) */}
            <button 
              onClick={() => setShowManualActionModal(true)}
              disabled={isCheckingInOut}
              style={{
                height: '46px',
                padding: '0 1.5rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                color: '#0f766e',
                backgroundColor: '#ffffff',
                border: '1.5px solid #0f766e',
                fontWeight: 'bold',
                cursor: 'pointer', direction: 'ltr', boxShadow: '0 2px 5px rgba(0,0,0,0.02)', minWidth: '100px', flexShrink: 0, fontSize: '0.95rem', boxSizing: 'border-box'
              }}
            >
              <Edit3 size={16} />
              <span>تغيير</span>
            </button>
          </div>

          {/* Footer Thank You Note */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', margin: '1.5rem 0 0.5rem 0', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, height: '1px', backgroundColor: '#e2e8f0', zIndex: 1 }}></div>
            <div style={{ backgroundColor: '#ffffff', padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.8rem', fontWeight: 'bold', zIndex: 2, direction: 'ltr' }}>
              <Clock size={16} />
              <span>شكراً لإلتزامك</span>
            </div>
          </div>
        </div>
      </div>

      {todayEvaluatedReport && (
        <div style={{ marginBottom: '1.25rem', padding: isMobile ? '14px' : '18px 20px', borderRadius: '16px', border: '1px solid #c4b5fd', background: 'linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%)', boxShadow: '0 4px 14px rgba(124,58,237,.08)', direction: 'rtl', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <div style={{ color: '#6d28d9', fontSize: '12px', fontWeight: 900, marginBottom: '5px' }}>آخر تقييم للمشرف · {todayEvaluatedReport.date}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
              <strong style={{ color: '#1e293b', fontSize: '20px' }}>{todayEvaluatedReport.supervisorRating}</strong>
              <span dir="ltr" style={{ color: '#7c3aed', fontSize: '18px', fontWeight: 900 }}>{Math.round(Number(todayEvaluatedReport.finalScore || 0))}%</span>
            </div>
            {todayEvaluatedReport.supervisorReason && <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 700, marginTop: '6px' }}>ملاحظة المشرف: {todayEvaluatedReport.supervisorReason}</div>}
          </div>
          <button type="button" onClick={() => handleViewReportDetails?.(todayEvaluatedReport)} style={{ height: '38px', border: '1px solid #8b5cf6', borderRadius: '10px', background: '#fff', color: '#6d28d9', padding: '0 16px', fontWeight: 900, cursor: 'pointer' }}>عرض التفاصيل</button>
        </div>
      )}

      
      {/* تقديم طلب - Action Buttons */}
      <div className="section-title mt-6 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={22} style={{ color: '#1a8d9b' }} />
          <span className="font-extrabold text-lg text-slate-800">تقديم طلب</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? '0.5rem' : '1rem', marginBottom: '2rem' }} dir="rtl">
        <DashboardCard isMobile={isMobile} icon={CustomCalendar} 
          iconType="custom"
          title="تقديم إجازة" 
          onClick={() => { 
            const allowedLeaves = allowedLeaveTypes.filter(t => ['إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'].includes(t));
            if (allowedLeaves.length === 0) {
               Swal.fire('مرفوض', 'ليس لديك صلاحية لتقديم إجازة.', 'error');
               return;
            }
            const firstValid = allowedLeaves.includes('إجازة سنوية') ? 'إجازة سنوية' : allowedLeaves[0];
            setLeaveFormData({...leaveFormData, type: firstValid}); 
            setShowLeaveModal(true); 
          }} 
        />
        <DashboardCard isMobile={isMobile} icon={CustomReport} 
          iconType="custom"
          title="تقرير العمل اليومي" 
          onClick={() => handleTabChange('add')} 
        />
        {(isAdmin(user) || 
          user?.department === 'المبيعات' ||
          user?.permissions?.rep_visits?.view ||
          user?.permissions?.rep_visits?.add ||
          user.employeeId === 'EMP-0017' ||
          user.id === 'EMP-0017'
        ) && (
          <>
            <DashboardCard isMobile={isMobile} icon={ClipboardList} 
              iconType="custom"
              title="تسجيل زيارة" 
              onClick={() => handleTabChange('rep-visits')} 
            />
            <DashboardCard isMobile={isMobile} icon={RefreshCw} 
              iconType="custom"
              title="سجل زياراتي" 
              onClick={() => handleTabChange('rep-visits-history')} 
            />
          </>
        )}
        <DashboardCard isMobile={isMobile} icon={CustomFolder} 
          iconType="custom"
          title="طلباتي" 
          onClick={() => handleTabChange('hr_requests')} 
        />
        <DashboardCard isMobile={isMobile} icon={FileText} 
          iconType="custom"
          title="طلب استدعاء" 
          onClick={() => { 
            if (typeof setShowPetitionModal === 'function') {
               setShowPetitionModal(true);
            }
          }} 
        />
        <DashboardCard isMobile={isMobile} icon={DollarSign} 
          iconType="ring"
          title="طلب سلفة" 
          disabled={user.allowAdvances === false}
          onClick={() => { 
            if (user.allowAdvances === false) {
              Swal.fire('مرفوض', 'ليس لديك صلاحية لطلب سلفة حالياً.', 'error');
            } else {
              setShowAdvanceModal(true); 
            }
          }} 
        />
        {hasPermission(user, 'hr_petty_cash', 'view') && <DashboardCard isMobile={isMobile} icon={DollarSign}
          iconType="solid-bg"
          title="السلفة النثرية"
          onClick={() => handleTabChange('petty_cash')}
        />}
        <DashboardCard isMobile={isMobile} icon={Plus} 
          iconType="solid-bg"
          title="عمل إضافي" 
          onClick={() => { 
            if (!allowedLeaveTypes.includes('بدل عمل إضافي')) {
               Swal.fire('مرفوض', 'ليس لديك صلاحية لتقديم عمل إضافي.', 'error');
               return;
            }
            setLeaveFormData({...leaveFormData, type: 'بدل عمل إضافي'}); 
            setShowLeaveModal(true); 
          }} 
        />
        <DashboardCard isMobile={isMobile} icon={Clock} 
          iconType="ring"
          title="تقديم مغادرة" 
          onClick={() => { 
            const allowedDepartures = allowedLeaveTypes.filter(t => ['مغادرة خاصة', 'مغادرة عمل', 'إذن تأخير', 'خروج مبكر', 'مغادرة الدخان'].includes(t));
            if (allowedDepartures.length === 0) {
               Swal.fire('مرفوض', 'ليس لديك صلاحية لتقديم مغادرة.', 'error');
               return;
            }
            setLeaveFormData({...leaveFormData, type: allowedDepartures[0]}); 
            setShowLeaveModal(true); 
          }} 
        />
        {/* SUPERVISOR / EXTRA ACCESS BUTTONS */}
        <DashboardCard isMobile={isMobile} icon={FileText} title="تقرير الدوام" onClick={() => handleTabChange('my-monthly-reports')} />
        {hasPermission(user, 'live') && (
          <DashboardCard isMobile={isMobile} icon={Activity} title="التحكم المباشر" onClick={() => handleTabChange('live')} />
        )}
        {canViewMissions && (
          <DashboardCard isMobile={isMobile} icon={Truck} title="المهمات المكلف بها" badgeCount={pendingMissionsCount} onClick={() => handleTabChange('missions')} />
        )}
        {hasPermission(user, 'quotes') && (
          <DashboardCard isMobile={isMobile} icon={FileText} title="عروض الأسعار" onClick={() => handleTabChange('quotes')} />
        )}
        {hasPermission(user, 'orders') && (
          <DashboardCard isMobile={isMobile} icon={ShoppingCart} title="إدارة الطلبيات" badgeCount={pendingSalesOrdersCount} onClick={() => handleTabChange('sales')} />
        )}
        {hasPermission(user, 'production') && (
          <DashboardCard isMobile={isMobile} icon={SewingMachineIcon} title="إنتاج قيد الخياطة" badgeCount={pendingProductionCount} onClick={() => handleTabChange('production')} />
        )}
        {hasPermission(user, 'production_packaging') && (
          <DashboardCard isMobile={isMobile} icon={Package} title="قسم التغليف" badgeCount={pendingPackagingCount} onClick={() => handleTabChange('production-packaging')} />
        )}
        {hasPermission(user, 'preparation') && (
          <DashboardCard isMobile={isMobile} icon={SewingMachineIcon} title="إنتاج قيد التحضير" badgeCount={pendingPreparationCount} onClick={() => handleTabChange('preparation')} />
        )}
        

        {hasPermission(user, 'supervisor_tasks') && (
          <DashboardCard isMobile={isMobile} icon={Layers} title="المهام" badgeCount={pendingTasksCount} onClick={() => handleTabChange('supervisor-tasks')} />
        )}
        
        {hasPermission(user, 'hr') && (
          <DashboardCard isMobile={isMobile} icon={Users} title="الموارد البشرية" onClick={() => handleTabChange('hr')} />
        )}

        {hasPermission(user, 'stock') && (
          <DashboardCard isMobile={isMobile} icon={Layers} title="المخزون" onClick={() => handleTabChange('stock')} />
        )}

        {hasPermission(user, 'product_costing') && (
          <DashboardCard isMobile={isMobile} icon={DollarSign} title="تسعير المنتج" onClick={() => handleTabChange('product-costing')} />
        )}
        {hasPermission(user, 'delivery') && (
          <DashboardCard isMobile={isMobile} icon={Truck} title="التوصيل" badgeCount={pendingDeliveryMissionsCount} onClick={() => handleTabChange('delivery')} />
        )}
        {hasPermission(user, 'customers') && (
          <DashboardCard isMobile={isMobile} icon={Users} title="العملاء" onClick={() => handleTabChange('customers')} />
        )}
        {hasPermission(user, 'reports') && (
          <DashboardCard isMobile={isMobile} icon={FileText} title="تقارير الإدارة" onClick={() => handleTabChange('reports')} />
        )}
        {hasPermission(user, 'production_tasks') && (
          <DashboardCard isMobile={isMobile} icon={ClipboardCheck} title="مهام الإنتاج" onClick={() => handleTabChange('production-tasks')} />
        )}
        {hasPermission(user, 'site_settings') && (
          <DashboardCard isMobile={isMobile} icon={Settings} title="الإعدادات" onClick={() => handleTabChange('site-settings')} />
        )}

        {canViewSupervisorReports && (
          <DashboardCard isMobile={isMobile} icon={ClipboardCheck} title="تقارير المشرفين" onClick={() => handleTabChange('supervisor-reports')} />
        )}
      </div>

      {/* الختمات الناقصة Widget */}
      <div 
        onClick={() => {
          if (remainingPunches <= 0) {
            Swal.fire('تنبيه', 'لا يوجد لديك ختمات ناقصة متبقية لهذا الشهر.', 'success');
          } else {
            setShowMissingPunchModal(true);
          }
        }}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
          border: '1px solid #f8fafc',
          padding: isMobile ? '1rem 0.75rem' : '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          cursor: 'pointer',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 12px 35px rgba(26, 141, 155, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.04)';
        }}
        dir="rtl"
      >
        {/* Decorative Dot Grid in Top Right */}
        <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px', display: 'none' }}>
          {Array.from({length: 16}).map((_, i) => (
            <div key={i} style={{width:'4px',height:'4px',borderRadius:'50%',background:'#475569'}}></div>
          ))}
        </div>

        {/* Decorative Wavy Lines in Bottom Left (Elegant and loose) */}
        <div style={{ 
          position: 'absolute', 
          left: 0, 
          bottom: 0, 
          width: '60%', 
          height: '100%', 
          opacity: 0.7, 
          pointerEvents: 'none', 
          zIndex: 0,
          WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
          maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)'
        }}>
          <svg viewBox="0 0 300 100" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
            <path d="M0,80 C100,100 200,40 300,60" fill="none" stroke="#2dd4bf" strokeWidth="1.5" opacity="0.6"/>
            <path d="M0,90 C80,70 150,110 300,50" fill="none" stroke="#14b8a6" strokeWidth="1" opacity="0.5"/>
            <path d="M0,75 C120,50 180,90 300,70" fill="none" stroke="#0d9488" strokeWidth="2" opacity="0.3"/>
            <path d="M0,85 C90,110 160,30 300,80" fill="none" stroke="#99f6e4" strokeWidth="1" opacity="0.7"/>
            <path d="M0,95 C110,80 190,100 300,40" fill="none" stroke="#5eead4" strokeWidth="1.2" opacity="0.4"/>
          </svg>
        </div>

        {/* Right Side: Hexagon + Text */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.75rem' : '1.25rem', zIndex: 1 }}>
          {/* Hexagon */}
          <div style={{
            position: 'relative',
            width: isMobile ? '56px' : '74px',
            height: isMobile ? '56px' : '74px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.06))' }}>
              <path fill="#ffffff" d="M30 5 L70 5 C75 5 80 8 82 12 L98 42 C100 47 100 53 98 58 L82 88 C80 92 75 95 70 95 L30 95 C25 95 20 92 18 88 L2 58 C0 53 0 47 2 42 L18 12 C20 8 25 5 30 5 Z" />
              <path fill="none" stroke="#e2e8f0" strokeWidth="0.5" d="M30 5 L70 5 C75 5 80 8 82 12 L98 42 C100 47 100 53 98 58 L82 88 C80 92 75 95 70 95 L30 95 C25 95 20 92 18 88 L2 58 C0 53 0 47 2 42 L18 12 C20 8 25 5 30 5 Z" />
            </svg>
            <Fingerprint size={isMobile ? 28 : 38} color="#0f766e" strokeWidth={2} style={{ position: 'relative', zIndex: 10 }} />
          </div>
          
          {/* Text */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h4 style={{ fontWeight: '800', color: '#115e59', fontSize: isMobile ? '1.05rem' : '1.25rem', margin: 0 }}>الختمات الناقصة</h4>
            {bonusPunches > 0 && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-1 w-max">
                بونص إضافي: +{bonusPunches}
              </span>
            )}
          </div>
        </div>

        {/* Left Side: Number box */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          borderRadius: '18px',
          width: isMobile ? '60px' : '75px',
          height: isMobile ? '60px' : '75px',
          boxShadow: '0 6px 16px rgba(0,0,0,0.05)',
          border: 'none',
          flexShrink: 0,
          zIndex: 10
        }}>
          <span style={{ fontSize: isMobile ? '2.25rem' : '3rem', fontWeight: '900', color: '#0f766e', lineHeight: '1' }}>{remainingPunches}</span>
        </div>
      </div>

      {/* Manual Action Modal */}
      {showManualActionModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem'
        }} onClick={() => setShowManualActionModal(false)}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '2rem 1.5rem',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            transform: 'translateY(0)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{
              fontWeight: '800',
              textAlign: 'center',
              fontSize: '1.25rem',
              color: '#1e293b',
              marginBottom: '1.75rem'
            }}>تحديد الإجراء يدوياً</h3>
            
            <div style={{ display: 'flex', gap: '1rem', flexDirection: 'row-reverse' }}>
              
              {/* IN Button */}
              <button 
                onClick={() => { setShowManualActionModal(false); setManualActionOverride('in'); }}
                disabled={todayAttendance?.timeIn && todayAttendance?.timeIn !== '--:--'}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  padding: '1.5rem 0.5rem',
                  borderRadius: '20px',
                  border: '2px solid',
                  borderColor: (todayAttendance?.timeIn && todayAttendance?.timeIn !== '--:--') ? '#e2e8f0' : '#e0f2fe',
                  backgroundColor: (todayAttendance?.timeIn && todayAttendance?.timeIn !== '--:--') ? '#f8fafc' : '#f0f9ff',
                  color: (todayAttendance?.timeIn && todayAttendance?.timeIn !== '--:--') ? '#94a3b8' : '#0284c7',
                  cursor: (todayAttendance?.timeIn && todayAttendance?.timeIn !== '--:--') ? 'not-allowed' : 'pointer',
                  opacity: (todayAttendance?.timeIn && todayAttendance?.timeIn !== '--:--') ? 0.7 : 1,
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  backgroundColor: (todayAttendance?.timeIn && todayAttendance?.timeIn !== '--:--') ? '#cbd5e1' : '#0ea5e9',
                  color: 'white',
                  padding: '1rem',
                  borderRadius: '50%',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                }}>
                  <MapPin size={32} />
                </div>
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>تسجيل الدخول</span>
                {(todayAttendance?.timeIn && todayAttendance?.timeIn !== '--:--') && <span style={{ fontSize: '0.75rem' }}>مسجل مسبقاً</span>}
              </button>

              {/* OUT Button */}
              <button 
                onClick={() => { setShowManualActionModal(false); setManualActionOverride('out'); }}
                disabled={todayAttendance?.timeOut && todayAttendance?.timeOut !== '--:--'}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  padding: '1.5rem 0.5rem',
                  borderRadius: '20px',
                  border: '2px solid',
                  borderColor: (todayAttendance?.timeOut && todayAttendance?.timeOut !== '--:--') ? '#e2e8f0' : '#fee2e2',
                  backgroundColor: (todayAttendance?.timeOut && todayAttendance?.timeOut !== '--:--') ? '#f8fafc' : '#fef2f2',
                  color: (todayAttendance?.timeOut && todayAttendance?.timeOut !== '--:--') ? '#94a3b8' : '#e11d48',
                  cursor: (todayAttendance?.timeOut && todayAttendance?.timeOut !== '--:--') ? 'not-allowed' : 'pointer',
                  opacity: (todayAttendance?.timeOut && todayAttendance?.timeOut !== '--:--') ? 0.7 : 1,
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  backgroundColor: (todayAttendance?.timeOut && todayAttendance?.timeOut !== '--:--') ? '#cbd5e1' : '#ef4444',
                  color: 'white',
                  padding: '1rem',
                  borderRadius: '50%',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                }}>
                  <MapPin size={32} />
                </div>
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>تسجيل الخروج</span>
                {(todayAttendance?.timeOut && todayAttendance?.timeOut !== '--:--') && <span style={{ fontSize: '0.75rem' }}>مسجل مسبقاً</span>}
              </button>

            </div>
            
            <button 
              onClick={() => setShowManualActionModal(false)}
              style={{
                marginTop: '1.5rem',
                width: '100%',
                padding: '1rem',
                borderRadius: '16px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.05rem',
                transition: 'background-color 0.2s'
              }}
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

    </motion.div>
  );
};
