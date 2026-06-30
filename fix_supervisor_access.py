import re

with open('src/pages/EmployeeDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add imports
imports_to_add = """
import AdminStock from './admin/AdminStock';
import AdminDelivery from './admin/AdminDelivery';
import AdminCustomers from './admin/AdminCustomers';
import AdminReports from './admin/AdminReports';
import AdminTasks from './admin/AdminTasks';
import AdminSettings from './admin/AdminSettings';
"""

if 'import AdminStock' not in content:
    content = content.replace("import AdminLive from './admin/AdminLive';", "import AdminLive from './admin/AdminLive';\n" + imports_to_add)

# 2. Add Settings to lucide-react imports if missing
if ' Settings,' not in content and '{ Settings,' not in content:
    content = content.replace('import { RefreshCw,', 'import { RefreshCw, Settings,')

# 3. Add to renderContent
cases_to_add = """
      case 'stock': return <AdminStock user={user} notificationTarget={notificationTarget} />;
      case 'delivery': return <AdminDelivery user={user} notificationTarget={notificationTarget} />;
      case 'customers': return <AdminCustomers user={user} />;
      case 'reports': return <AdminReports notificationTarget={notificationTarget} />;
      case 'production-tasks': return <AdminTasks user={user} />;
      case 'site-settings': return <AdminSettings user={user} />;
"""

# Fix the 'sales' returning AdminProduction bug
content = content.replace(
    "case 'sales': return <AdminProduction user={user} notificationTarget={notificationTarget} />;",
    "case 'sales': return <AdminSales user={user} />;"
)

if "case 'stock': return" not in content:
    content = content.replace(
        "case 'live': return <AdminLive user={user} />;",
        "case 'live': return <AdminLive user={user} />;\n" + cases_to_add
    )

# 4. Add DashboardCards
cards_to_add = """
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
"""

if "title=\"المخزون\"" not in content:
    content = content.replace(
        "{canViewSupervisorReports && (",
        cards_to_add + "\n              {canViewSupervisorReports && ("
    )

# 5. Add to modern-nav-item (bottom nav)
nav_items = """
        {user.hasStockAccess && (
          <div className={`modern-nav-item shrink-0 ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => handleTabChange('stock')}>
            <Layers size={22} /> <span>المخزون</span>
          </div>
        )}
        {user.hasDeliveryAccess && (
          <div className={`modern-nav-item shrink-0 ${activeTab === 'delivery' ? 'active' : ''}`} onClick={() => handleTabChange('delivery')}>
            <Truck size={22} /> <span>التوصيل</span>
          </div>
        )}
        {user.hasCustomersAccess && (
          <div className={`modern-nav-item shrink-0 ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => handleTabChange('customers')}>
            <Users size={22} /> <span>العملاء</span>
          </div>
        )}
        {user.hasReportsAccess && (
          <div className={`modern-nav-item shrink-0 ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => handleTabChange('reports')}>
            <FileText size={22} /> <span>التقارير</span>
          </div>
        )}
        {user.hasProductionTasksAccess && (
          <div className={`modern-nav-item shrink-0 ${activeTab === 'production-tasks' ? 'active' : ''}`} onClick={() => handleTabChange('production-tasks')}>
            <ClipboardCheck size={22} /> <span>الإنتاج</span>
          </div>
        )}
"""

if "<span>المخزون</span>" not in content:
    content = content.replace(
        "{isSupervisor && (",
        nav_items + "\n        {isSupervisor && ("
    )

# 6. Add to admin-sidebar-item (desktop sidebar)
sidebar_items = """
            {user.hasStockAccess && (
              <div className={`admin-sidebar-item ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => handleTabChange('stock')}>
                <Layers size={22} /> <span>المخزون</span>
              </div>
            )}
            {user.hasDeliveryAccess && (
              <div className={`admin-sidebar-item ${activeTab === 'delivery' ? 'active' : ''}`} onClick={() => handleTabChange('delivery')}>
                <Truck size={22} /> <span>التوصيل</span>
              </div>
            )}
            {user.hasCustomersAccess && (
              <div className={`admin-sidebar-item ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => handleTabChange('customers')}>
                <Users size={22} /> <span>العملاء</span>
              </div>
            )}
            {user.hasReportsAccess && (
              <div className={`admin-sidebar-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => handleTabChange('reports')}>
                <FileText size={22} /> <span>التقارير</span>
              </div>
            )}
            {user.hasProductionTasksAccess && (
              <div className={`admin-sidebar-item ${activeTab === 'production-tasks' ? 'active' : ''}`} onClick={() => handleTabChange('production-tasks')}>
                <ClipboardCheck size={22} /> <span>مهام الإنتاج</span>
              </div>
            )}
"""

if "{user.hasStockAccess" not in content.split("admin-sidebar-grid")[1]:
    content = content.replace(
        "{isSupervisor && (\n              <div className={`admin-sidebar-item",
        sidebar_items + "\n            {isSupervisor && (\n              <div className={`admin-sidebar-item"
    )

with open('src/pages/EmployeeDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed Supervisor Access successfully!")
