import React, { useState, useEffect } from 'react';
import { LogOut, Home, Users, Settings, FileText, ShoppingBag, ShoppingCart, UserCheck, Target, Plus, MoreHorizontal, X, Truck, ClipboardList, SunMoon, Layers, ChevronDown, ChevronUp, Palette, Package, Moon, Activity, RefreshCw } from 'lucide-react';
import AdminOverview from './admin/AdminOverview';
import AdminEmployees from './admin/AdminEmployees';
import AdminProduction from './admin/AdminProduction';
import AdminSales from './admin/AdminSales';
import AdminDelivery from './admin/AdminDelivery';
import AdminCustomers from './admin/AdminCustomers';
import AdminSettings from './admin/AdminSettings';
import AdminHR from './hr/AdminHR';
import AdminLogs from './admin/AdminLogs';
import AdminTasks from './admin/AdminTasks';
import AdminStock from './admin/AdminStock';
import AdminReports from './admin/AdminReports';
import AdminSupervisorReports from './admin/AdminSupervisorReports';
import AdminSupervisorTasks from './admin/AdminSupervisorTasks';
import AdminLive from './admin/AdminLive';
import { useAttendanceReminders } from '../hooks/useAttendanceReminders';
import { getGlobalSettings, isAdmin, saveEmployee } from '../store';
import NotificationCenter from '../components/NotificationCenter';
import HeaderUserMenu from '../components/HeaderUserMenu';
import AISummaryButton from '../components/AISummaryButton';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
const MySwal = withReactContent(Swal);
window.Swal = Swal;
const MOBILE_BREAKPOINT = 1024;

const SewingMachineIcon = ({ size = 24, color = "currentColor", className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 200 200" 
    fill={color} 
    className={className}
  >
    {/* Base plates */}
    <rect x="20" y="160" width="160" height="10" rx="2" />
    <rect x="25" y="150" width="140" height="10" />
    
    {/* Main Body Silhouette */}
    <path d="
      M 140 150 
      V 90 
      C 140 70, 110 60, 80 80 
      C 60 93, 45 85, 45 70 
      V 65 
      H 35 
      V 130 
      C 35 145, 50 145, 50 130 
      V 105 
      C 50 90, 70 85, 90 85 
      C 110 85, 120 90, 120 110 
      V 150 
      Z" 
    />
    
    {/* Left-side thread lever */}
    <path d="M 35 100 C 20 100, 20 90, 35 90 Z" />
    
    {/* Center circle detail */}
    <circle cx="125" cy="95" r="8" fill="transparent" stroke={color} strokeWidth="3" />
    
    {/* Spool pins on top */}
    <rect x="110" y="50" width="6" height="20" rx="3" />
    <path d="M 105 58 H 121 V 61 H 105 Z" />
    <rect x="42" y="55" width="4" height="10" rx="2" />
    
    {/* Thread swoops (using thin paths) */}
    <path d="M 110 55 C 80 60, 60 50, 44 55" fill="none" stroke={color} strokeWidth="1" />
    
    {/* Needle & foot */}
    <rect x="43" y="130" width="3" height="20" />
    <rect x="38" y="147" width="13" height="3" />
    
    {/* Back thread guide */}
    <rect x="33" y="115" width="2" height="15" />
    <circle cx="34" cy="115" r="3" />
    
    {/* Wheel Connector */}
    <rect x="140" y="75" width="10" height="20" />
    
    {/* Hand Wheel (Vertical block) */}
    <rect x="146" y="60" width="10" height="50" rx="5" />
    <rect x="142" y="70" width="4" height="30" />
    
    {/* Crank mechanism */}
    <path d="M 151 85 H 160 V 105 H 180 C 195 105, 195 95, 180 95 H 165 V 80 H 151 Z" />
  </svg>
);

const AdminDashboard = ({ user, onLogout, onUpdateUser }) => {
  useAttendanceReminders(isAdmin(user));
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('adminActiveTab') || 'overview';
  });

  useEffect(() => {
    sessionStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);
  const [notificationTarget, setNotificationTarget] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [globalSettings, setGlobalSettings] = useState({ siteName: 'Mirjas HR', logoUrl: '/logo-mrsleep.png' });
  const [productionOpen, setProductionOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const settings = await getGlobalSettings();
      setGlobalSettings(settings);
      
      // Update Site Title and Favicon
      document.title = settings.siteName || 'Mirjas HR';
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = settings.logoUrl;
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleSwitchAdminTab = (e) => {
      if (e.detail && e.detail.tab) {
        setActiveTab(e.detail.tab);
        if (e.detail.action || e.detail.data) {
          setNotificationTarget({ ...e.detail });
        }
      }
    };
    window.addEventListener('switchAdminTab', handleSwitchAdminTab);
    return () => window.removeEventListener('switchAdminTab', handleSwitchAdminTab);
  }, []);

  useEffect(() => {
    if (isSidebarOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isSidebarOpen, isMobile]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Handle Initial Permissions Redirect
  useEffect(() => {
    const isFullAdmin = isAdmin(user);
    const canAccess = (tab) => {
      if (isFullAdmin) return true;
      switch (tab) {
        case 'overview': return user.hasOverviewAccess;
        case 'live': return user.hasLiveAccess;
        case 'employees': return user.hasEmployeesAccess;
        case 'production-orders': return user.hasProductionAccess;
        case 'production-tasks': return user.hasProductionTasksAccess;
        case 'sales': return user.hasSalesAccess;
        case 'delivery': return user.hasDeliveryAccess;
        case 'hr': return user.hasHRAccess || isAdmin(user);
        case 'reports': return user.hasReportsAccess;
        case 'supervisor-tasks': return user.hasSupervisorTasksAccess;
        case 'supervisor-reports': return user.hasSupervisorReportsAccess === true || (user.hasSupervisorReportsAccess !== false && (user.level === 'supervisor' || user.level === 'مشرف' || user.level === 'مشرف قسم'));
        case 'stock': return user.hasStockAccess;
        case 'customers': return user.hasCustomersAccess;
        case 'tasks': return user.hasProductionTasksAccess;
        case 'site-settings': return user.hasSiteSettingsAccess;
        case 'scoring': return user.hasScoringAccess;
        case 'logs': return user.hasLogsAccess;
        default: return false;
      }
    };

    if (!canAccess(activeTab)) {
      const tabsOrder = ['overview', 'live', 'hr', 'production-orders', 'production-tasks', 'sales', 'reports', 'supervisor-tasks', 'supervisor-reports', 'delivery', 'stock', 'employees', 'customers', 'site-settings', 'scoring', 'logs'];
      const firstAvailable = tabsOrder.find(t => canAccess(t));
      if (firstAvailable) {
        setActiveTab(firstAvailable);
      }
    }
  }, [user, activeTab]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  const handleNotificationNavigate = (target) => {
    if (!target) return;
    const targetObj = typeof target === 'string' ? { tab: target } : target;
    const nextTab = targetObj.tab || 'overview';
    setProductionOpen(nextTab.startsWith('production-'));
    setSettingsOpen(['site-settings', 'scoring', 'employees', 'logs'].includes(nextTab));
    setActiveTab(nextTab);
    setIsSidebarOpen(false);
    setNotificationTarget({
      ...targetObj,
      nonce: Date.now()
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <AdminOverview onNavigate={handleNotificationNavigate} />;
      case 'live': return <AdminLive user={user} />;
      case 'employees': return <AdminEmployees user={user} />;
      case 'production-orders': return <AdminProduction user={user} />;
      case 'production-tasks': return <AdminTasks user={user} />;
      case 'sales': return <AdminSales user={user} />;
      case 'delivery': return <AdminDelivery user={user} notificationTarget={notificationTarget} />;
      case 'hr': return <AdminHR user={user} notificationTarget={notificationTarget} />;
      case 'reports': return <AdminReports user={user} notificationTarget={notificationTarget} />;
      case 'supervisor-tasks': return <AdminSupervisorTasks user={user} />;
      case 'supervisor-reports': return <AdminSupervisorReports user={user} />;
      case 'stock': return <AdminStock user={user} notificationTarget={notificationTarget} />;
      case 'customers': return <AdminCustomers user={user} />;
      case 'site-settings': return <AdminSettings user={user} />;

      case 'logs': return <AdminLogs user={user} />;
      default: return <AdminOverview onNavigate={handleNotificationNavigate} />;
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    return hour < 12 ? 'صباح الخير' : 'مساء الخير';
  };

  const handleOpenProfileModal = () => {
    Swal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions'
      },
      buttonsStyling: false,
      showCloseButton: false,
      html: `
        <div class="premium-modal-header">
          <div class="premium-modal-title">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-pen text-primary"><path d="M11.5 15H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M18.5 12.5a2.121 2.121 0 0 1 3 3L12 25l-4 1 1-4Z"/></svg>
             <span>تعديل الملف الشخصي</span>
          </div>
          <div class="premium-modal-close" onclick="Swal.close()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </div>
        </div>
        <div class="premium-form">
          <div class="premium-form-group">
            <label><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user text-muted"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> الاسم الكامل</label>
            <input id="prof-name" class="premium-input" value="${user.name}" placeholder="الاسم الجديد">
          </div>
          <div class="premium-form-group">
            <label><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-key-round text-muted"><path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"/><circle cx="16.5" cy="7.5" r=".5"/></svg> كلمة المرور الجديدة</label>
            <input id="prof-pass" class="premium-input" value="${user.password}" placeholder="كلمة المرور الجديدة">
          </div>
          <p class="text-xs text-muted" style="text-align: right; margin-top: -10px;">يمكنك تغيير اسمك وكلمة مرورك مباشرة دون الحاجة للكلمة القديمة.</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'حفظ التغييرات',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        const name = document.getElementById('prof-name').value;
        const password = document.getElementById('prof-pass').value;
        if (!name || !password) {
          Swal.showValidationMessage('يرجى ملء الاسم وكلمة المرور');
          return false;
        }
        return { name, password };
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const updatedUser = { ...user, ...result.value };
        const error = await saveEmployee(updatedUser);
        if (!error) {
          if (onUpdateUser) onUpdateUser(updatedUser);
          Swal.fire({
            title: 'تم التحديث بنجاح',
            text: 'تم تحديث بياناتك الشخصية بنجاح',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        }
      }
    });
  };

  return (
    <div className="w-full h-full" style={{ maxWidth: '100%' }}>

      {/* Bottom Nav */}
      <div className="mobile-bottom-nav no-print">
        {(isAdmin(user) || user.hasOverviewAccess) && (
          <div className={`bottom-nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => handleTabChange('overview')}>
            <Home size={22} /> <span>الرئيسية</span>
          </div>
        )}
        {(isAdmin(user) || user.hasProductionAccess) && (
          <div className={`bottom-nav-item ${activeTab === 'production-orders' ? 'active' : ''}`} onClick={() => handleTabChange('production-orders')}>
            <SewingMachineIcon size={22} /> <span>الإنتاج</span>
          </div>
        )}
        {(isAdmin(user) || user.hasSalesAccess) && (
          <div className={`bottom-nav-item ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => handleTabChange('sales')}>
            <ShoppingCart size={22} /> <span>الطلبيات</span>
          </div>
        )}
        {(isAdmin(user) || user.hasReportsAccess) && (
          <div className={`bottom-nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => handleTabChange('reports')}>
            <FileText size={22} /> <span>التقارير</span>
          </div>
        )}
        <div className="bottom-nav-item" onClick={() => setIsSidebarOpen(true)}>
          <MoreHorizontal size={22} /> <span>المزيد</span>
        </div>
      </div>

      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>

      <div className="admin-layout">
        <div className={`admin-sidebar no-print ${isSidebarOpen ? 'open' : ''}`}>
          <div className="flex flex-col items-center text-center mb-4 pt-4 px-4 relative">
            <div className="cursor-pointer mb-2" style={{ width: '100%', maxWidth: '160px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={globalSettings.logoUrl} alt={globalSettings.siteName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} />
            </div>
          </div>

          <div className="admin-sidebar-menu">
            {(isAdmin(user) || user.hasOverviewAccess) && (
              <div className={`admin-sidebar-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => handleTabChange('overview')}>
                <Home size={22} /> <span>الرئيسية</span>
              </div>
            )}
            {(isAdmin(user) || user.hasLiveAccess) && (
              <div className={`admin-sidebar-item ${activeTab === 'live' ? 'active' : ''}`} onClick={() => handleTabChange('live')}>
                <Activity size={22} /> <span>التحكم المباشر</span>
              </div>
            )}
            {(isAdmin(user) || user.hasReportsAccess) && (
              <div className={`admin-sidebar-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => handleTabChange('reports')}>
                <FileText size={22} /> <span>مركز التقارير</span>
              </div>
            )}

            {(isAdmin(user) || user.hasHRAccess) && (
              <div className={`admin-sidebar-item ${activeTab === 'hr' ? 'active' : ''}`} onClick={() => handleTabChange('hr')}>
                <Users size={22} /> <span>الموارد البشرية</span>
              </div>
            )}

            {(isAdmin(user) || user.hasSupervisorTasksAccess) && (
              <div className={`admin-sidebar-item ${activeTab === 'supervisor-tasks' ? 'active' : ''}`} onClick={() => handleTabChange('supervisor-tasks')}>
                <Layers size={22} /> <span>إدارة المهام</span>
              </div>
            )}
            {(isAdmin(user) || user.hasSupervisorReportsAccess === true || (user.hasSupervisorReportsAccess !== false && (user.level === 'supervisor' || user.level === 'مشرف' || user.level === 'مشرف قسم'))) && (
              <div className={`admin-sidebar-item ${activeTab === 'supervisor-reports' ? 'active' : ''}`} onClick={() => handleTabChange('supervisor-reports')}>
                <ClipboardList size={22} /> <span>تقارير المشرفين</span>
              </div>
            )}

            {/* قسم الإنتاج المطور */}
            {(isAdmin(user) || user.hasProductionAccess || user.hasProductionTasksAccess) && (
              <div className="sidebar-group">
                <div className={`admin-sidebar-item ${(activeTab.startsWith('production-')) ? 'active' : ''}`} onClick={() => setProductionOpen(!productionOpen)}>
                  <div className="flex items-center gap-3">
                    <SewingMachineIcon size={22} /> <span>إدارة الإنتاج</span>
                  </div>
                  {productionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                {productionOpen && (
                  <div className="sidebar-submenu">
                    {(isAdmin(user) || user.hasProductionAccess) && (
                      <div className={`submenu-item ${activeTab === 'production-orders' ? 'active' : ''}`} onClick={() => handleTabChange('production-orders')}>
                        <span>كرت إنتاج</span>
                      </div>
                    )}
                    {(isAdmin(user) || user.hasProductionTasksAccess) && (
                      <div className={`submenu-item ${activeTab === 'production-tasks' ? 'active' : ''}`} onClick={() => handleTabChange('production-tasks')}>
                        <span>مهام الإنتاج</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {(isAdmin(user) || user.hasSalesAccess) && (
              <div className={`admin-sidebar-item ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => handleTabChange('sales')}>
                <ShoppingCart size={22} /> <span>الطلبيات</span>
              </div>
            )}
            {(isAdmin(user) || user.hasDeliveryAccess) && (
              <div className={`admin-sidebar-item ${activeTab === 'delivery' ? 'active' : ''}`} onClick={() => handleTabChange('delivery')}>
                <Truck size={22} /> <span>التوصيل</span>
              </div>
            )}
            {(isAdmin(user) || user.hasStockAccess) && (
              <div className={`admin-sidebar-item ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => handleTabChange('stock')}>
                <Layers size={22} /> <span>المخزون</span>
              </div>
            )}
            {(isAdmin(user) || user.hasCustomersAccess) && (
              <div className={`admin-sidebar-item ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => handleTabChange('customers')}>
                <UserCheck size={22} /> <span>العملاء والموردين</span>
              </div>
            )}

            {/* قسم الإعدادات المطور */}
            {(isAdmin(user) || user.hasSiteSettingsAccess || user.hasEmployeesAccess || user.hasScoringAccess || user.hasLogsAccess) && (
              <div className="sidebar-group">
                <div className={`admin-sidebar-item ${(activeTab === 'site-settings' || activeTab === 'scoring' || activeTab === 'employees' || activeTab === 'logs') ? 'active' : ''}`} onClick={() => setSettingsOpen(!settingsOpen)}>
                  <div className="flex items-center gap-3">
                    <Settings size={22} /> <span>الإعدادات</span>
                  </div>
                  {settingsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                {settingsOpen && (
                  <div className="sidebar-submenu">
                    {(isAdmin(user) || user.hasSiteSettingsAccess) && (
                      <div className={`submenu-item ${activeTab === 'site-settings' ? 'active' : ''}`} onClick={() => handleTabChange('site-settings')}>
                        <span>إعدادات الموقع</span>
                      </div>
                    )}
                    {(isAdmin(user) || user.hasEmployeesAccess) && (
                      <div className={`submenu-item ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => handleTabChange('employees')}>
                        <span>إعدادات الموظفين</span>
                      </div>
                    )}

                    {(isAdmin(user) || user.hasLogsAccess) && (
                      <div className={`submenu-item ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => handleTabChange('logs')}>
                        <span>سجل العمليات</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="sidebar-bottom-action">
            <button className="mode-toggle-btn" onClick={toggleDarkMode}>
              <Moon size={20} />
              <span>تبديل الوضع</span>
            </button>
            <button onClick={onLogout} className="admin-logout-btn">
              <LogOut size={18} /> تسجيل الخروج
            </button>
          </div>
        </div>

        <div className={`admin-content ${activeTab === 'overview' ? 'overview-active' : ''}`}>
          <header className="app-topbar no-print">
            <div className="app-topbar-copy text-right">
              <h2 className="text-2xl font-bold mb-1" style={{ margin: 0 }}>
                {getGreeting()}، {user.name ? (user.name === 'المدير العام' ? 'مشهور' : user.name.split(' ')[0]) : 'أهلاً بك'} 👋
              </h2>
              <div className="app-topbar-meta">
                <div className="text-xl font-bold text-primary">
                  {new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
                </div>
                <div className="text-sm font-semibold text-muted bg-surface-hover px-3 py-1 rounded-lg">
                  {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
            
            <div className="app-topbar-actions">
              <NotificationCenter user={user} onNavigate={handleNotificationNavigate} />
              <button
                type="button"
                className="header-icon-button"
                onClick={() => setActiveTab('overview')}
                aria-label="الرئيسية"
                title="الرئيسية"
              >
                <Home size={19} className="text-teal-600" />
              </button>
              <button
                type="button"
                className="header-icon-button"
                onClick={() => window.location.reload()}
                aria-label="تحديث الصفحة"
                title="تحديث الصفحة"
              >
                <RefreshCw size={19} className="text-sky-500" />
              </button>
              <button
                type="button"
                className="header-icon-button"
                onClick={toggleDarkMode}
                aria-label="تبديل الوضع"
                aria-pressed={darkMode}
              >
                <SunMoon size={19} />
              </button>
              <HeaderUserMenu user={user} onLogout={onLogout} onUpdateUser={onUpdateUser} />
            </div>
          </header>

          <div className={`content-inner ${activeTab === 'overview' ? 'overview-mode' : ''}`}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
