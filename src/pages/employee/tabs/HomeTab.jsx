import React from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, RefreshCw, Fingerprint, LogOut, CheckCircle2, 
  ClipboardCheck, Activity, Truck, ShoppingCart, 
  Settings as SewingMachineIcon, Layers, Users, FileText, Settings, 
  Plus, Clock, DollarSign, Calendar as CustomCalendar, 
  FileText as CustomReport, Folder as CustomFolder, ClipboardList
} from 'lucide-react';
import Swal from 'sweetalert2';
import { isAdmin } from '../../../store';

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
  handleTabChange,
  user,
  setShowAdvanceModal,
  canViewMissions,
  isSupervisor,
  canViewSupervisorReports,
  remainingPunches,
  bonusPunches,
  setShowMissingPunchModal
}) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="employee-home-container animate-fade-in" style={{ paddingBottom: isMobile ? '100px' : '0' }}>
      {/* GPS Live Attendance Card (Compact & Clean Theme) */}
      <div className={`mb-6 glass-card relative overflow-hidden transition-all duration-300 ${isFlash ? 'ring-2 ring-primary shadow-lg scale-[1.02] z-50' : ''}`} style={{ padding: 0 }}>
        
        {/* Subtle Top Gradient Bar */}
        <div className="h-1 w-full bg-gradient-to-r from-primary to-sky-400"></div>
        
        <div className="p-4 md:p-5">
          
          {/* Top Info Row */}
          <div className="flex justify-between items-center mb-4">
            
            {/* Location */}
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2.5 rounded-xl text-primary shrink-0">
                <MapPin size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-slate-800 text-sm">موقع الدوام</h4>
                  <button onClick={fetchAddress} disabled={isCheckingInOut} className="btn-refresh">
                    <RefreshCw size={12} className={isCheckingInOut ? 'animate-spin' : ''} />
                    <span>تحديث</span>
                  </button>
                </div>
                <span className="text-xs text-slate-500 font-medium block max-w-[180px] truncate">
                  {currentAddress}
                </span>
              </div>
            </div>
            
            {/* Time */}
            <LiveClock />
            
          </div>
          
          {/* Action Button */}
          <div className="mt-2">
            {!todayAttendance?.timeIn ? (
              <button 
                onClick={() => handleGPSAction('in')}
                disabled={isCheckingInOut}
                className="w-full btn btn-primary py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md text-base"
              >
                {isCheckingInOut ? (
                  <><div className="spinner w-5 h-5 border-white border-2"></div> <span className="font-bold">التحقق...</span></>
                ) : (
                  <><Fingerprint size={20} /> <span className="font-bold">تسجيل الدخول</span></>
                )}
              </button>
            ) : !todayAttendance?.timeOut ? (
              <button 
                onClick={() => handleGPSAction('out')}
                disabled={isCheckingInOut}
                className="w-full btn btn-danger py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md text-base disabled:opacity-70"
              >
                {isCheckingInOut ? (
                  <><div className="spinner w-5 h-5 border-white border-2"></div> <span className="font-bold">التحقق...</span></>
                ) : (
                  <><LogOut size={20} /> <span className="font-bold">تسجيل الخروج</span></>
                )}
              </button>
            ) : (
              <div className="w-full bg-emerald-50 border border-emerald-100 text-emerald-600 py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm text-base font-bold">
                <CheckCircle2 size={20} />
                <span>اكتمل الدوام اليوم</span>
              </div>
            )}
          </div>
          
        </div>
      </div>

      
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
            setLeaveFormData({...leaveFormData, type: allowedLeaves[0]}); 
            setShowLeaveModal(true); 
          }} 
        />
        <DashboardCard isMobile={isMobile} icon={CustomReport} 
          iconType="custom"
          title="تقرير العمل اليومي" 
          onClick={() => handleTabChange('add')} 
        />
        {(isAdmin(user) || 
          user.employeeId === 'EMP-0017' ||
          user.id === 'EMP-0017'
        ) && (
          <DashboardCard isMobile={isMobile} icon={ClipboardList} 
            iconType="custom"
            title="تقرير زيارة" 
            onClick={() => handleTabChange('rep-visits')} 
          />
        )}
        <DashboardCard isMobile={isMobile} icon={CustomFolder} 
          iconType="custom"
          title="طلباتي" 
          onClick={() => handleTabChange('hr_requests')} 
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
        {user.hasLiveAccess && (
          <DashboardCard isMobile={isMobile} icon={Activity} title="التحكم المباشر" onClick={() => handleTabChange('live')} />
        )}
        {canViewMissions && (
          <DashboardCard isMobile={isMobile} icon={Truck} title="إدارة التوصيل" onClick={() => handleTabChange('missions')} />
        )}
        {user.hasSalesAccess && (
          <DashboardCard isMobile={isMobile} icon={ShoppingCart} title="إدارة المبيعات" onClick={() => handleTabChange('sales')} />
        )}
        {user.hasProductionAccess && (
          <DashboardCard isMobile={isMobile} icon={SewingMachineIcon} title="إدارة الإنتاج" onClick={() => handleTabChange('production')} />
        )}
        

        {isSupervisor && (
          <DashboardCard isMobile={isMobile} icon={Layers} title="المهام" onClick={() => handleTabChange('supervisor-tasks')} />
        )}
        
        {user.hasStockAccess && (
          <DashboardCard isMobile={isMobile} icon={Layers} title="المخزون" onClick={() => handleTabChange('stock')} />
        )}
        {user.hasDeliveryAccess && (
          <DashboardCard isMobile={isMobile} icon={Truck} title="التوصيل" onClick={() => handleTabChange('delivery')} />
        )}
        {user.hasCustomersAccess && (
          <DashboardCard isMobile={isMobile} icon={Users} title="العملاء" onClick={() => handleTabChange('customers')} />
        )}
        {user.hasReportsAccess && (
          <DashboardCard isMobile={isMobile} icon={FileText} title="التقارير" onClick={() => handleTabChange('reports')} />
        )}
        {user.hasProductionTasksAccess && (
          <DashboardCard isMobile={isMobile} icon={ClipboardCheck} title="مهام الإنتاج" onClick={() => handleTabChange('production-tasks')} />
        )}
        {user.hasSiteSettingsAccess && (
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
    </motion.div>
  );
};
