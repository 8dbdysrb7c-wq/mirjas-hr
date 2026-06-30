import re
import sys

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\EmployeeDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# I need to insert DashboardCard component outside EmployeeDashboard
# Let's insert it right before `const EmployeeDashboard = ({ user, onLogout, onUpdateUser }) => {`
comp_insert_idx = content.find('const EmployeeDashboard = ')
if comp_insert_idx == -1:
    print("Could not find EmployeeDashboard declaration")
    sys.exit(1)

dashboard_card_code = """
const DashboardCard = ({ icon: Icon, title, onClick, disabled }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        boxShadow: isHovered && !disabled ? '0 8px 25px rgba(0,0,0,0.08)' : '0 4px 20px rgba(0,0,0,0.04)',
        border: '1px solid #f8fafc',
        padding: '1.5rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        width: '100%',
        transform: isHovered && !disabled ? 'translateY(-2px)' : 'none',
      }}
    >
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        backgroundColor: 'rgba(26, 141, 155, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem',
        transition: 'background-color 0.2s ease'
      }}>
        <Icon size={28} color="#1a8d9b" />
      </div>
      <span style={{
        fontWeight: '700',
        fontSize: '15px',
        color: '#1e293b',
        textAlign: 'center',
        whiteSpace: 'nowrap'
      }}>{title}</span>
      <div style={{
        width: '24px',
        height: '4px',
        backgroundColor: '#1a8d9b',
        borderRadius: '999px',
        marginTop: '0.6rem',
        opacity: 0.8
      }}></div>
    </button>
  );
};
"""

# Check if we already inserted DashboardCard to avoid duplication
if 'const DashboardCard =' not in content:
    content = content[:comp_insert_idx] + dashboard_card_code + "\n" + content[comp_insert_idx:]

# Now replace the Action Buttons block
start_str = '{/* تقديم طلب - Action Buttons */}'
start_idx = content.find(start_str)

if start_idx == -1:
    start_str = '{/*   - Action Buttons */}'
    start_idx = content.find(start_str)

if start_idx == -1:
    start_str = 'Action Buttons'
    start_idx = content.find(start_str)

# Search backward to include section-title
section_start = content.rfind('<div className="section-title', 0, start_idx + 50)
if section_start != -1:
    start_idx = section_start

end_idx = content.find('</motion.div>', start_idx)

new_block = """{/* تقديم طلب - Action Buttons */}
            <div className="section-title mt-6 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck size={22} style={{ color: '#1a8d9b' }} />
                <span className="font-extrabold text-lg text-slate-800">تقديم طلب</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }} dir="rtl">
              <DashboardCard 
                icon={Calendar} 
                title="تقديم إجازة" 
                onClick={() => { setLeaveFormData({...leaveFormData, type: allowedLeaveTypes[0] || 'إجازة سنوية'}); setShowLeaveModal(true); }} 
              />
              <DashboardCard 
                icon={FileText} 
                title="تقرير العمل اليومي" 
                onClick={() => handleTabChange('add')} 
              />
              <DashboardCard 
                icon={Folder} 
                title="طلباتي" 
                onClick={() => handleTabChange('hr_requests')} 
              />
              <DashboardCard 
                icon={DollarSign} 
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
              <DashboardCard 
                icon={Plus} 
                title="عمل إضافي" 
                onClick={() => { setLeaveFormData({...leaveFormData, type: 'بدل عمل إضافي'}); setShowLeaveModal(true); }} 
              />
              <DashboardCard 
                icon={Clock} 
                title="تقديم مغادرة" 
                onClick={() => { setLeaveFormData({...leaveFormData, type: 'مغادرة عمل'}); setShowLeaveModal(true); }} 
              />

              {/* SUPERVISOR / EXTRA ACCESS BUTTONS */}
              {user.hasLiveAccess && (
                <DashboardCard icon={Activity} title="المراقبة المباشرة" onClick={() => handleTabChange('live')} />
              )}
              {canViewMissions && (
                <DashboardCard icon={Truck} title="إدارة التوصيل" onClick={() => handleTabChange('missions')} />
              )}
              {user.hasSalesAccess && (
                <DashboardCard icon={ShoppingCart} title="إدارة المبيعات" onClick={() => handleTabChange('sales')} />
              )}
              {user.hasProductionAccess && (
                <DashboardCard icon={SewingMachineIcon} title="إدارة الإنتاج" onClick={() => handleTabChange('production')} />
              )}
              {isSupervisor && (
                <DashboardCard icon={Layers} title="متابعة الأقسام" onClick={() => handleTabChange('supervisor-tasks')} />
              )}
              {canViewSupervisorReports && (
                <DashboardCard icon={ClipboardCheck} title="تقارير المشرفين" onClick={() => handleTabChange('supervisor-reports')} />
              )}
            </div>

            {/* الختمات الناقصة Widget */}
            <div 
              onClick={() => {
                if (remainingPunches <= 0) {
                  MySwal.fire('تنبيه', 'لا يوجد لديك ختمات ناقصة متبقية لهذا الشهر.', 'success');
                } else {
                  setShowMissingPunchModal(true);
                }
              }}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '24px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                border: '1px solid #f8fafc',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '2rem',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.04)';
              }}
              dir="rtl"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  position: 'relative',
                  width: '64px',
                  height: '64px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', color: '#f1f5f9', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))' }}>
                    <path fill="currentColor" d="M50 3 L93 25 L93 75 L50 97 L7 75 L7 25 Z" />
                  </svg>
                  <Fingerprint size={28} color="#1a8d9b" style={{ position: 'relative', zIndex: 10 }} />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ fontWeight: '800', color: '#1e293b', fontSize: '1rem', marginBottom: '0.25rem' }}>الختمات الناقصة</h4>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1.5', margin: 0, maxWidth: '200px', fontWeight: '500' }}>
                    عدد الأيام التي لم يتم تسجيل الحضور أو الانصراف فيها.
                  </p>
                </div>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: '18px',
                width: '75px',
                height: '75px',
                border: '1px solid #e2e8f0',
                flexShrink: 0
              }}>
                <span style={{ fontSize: '2rem', fontWeight: '800', color: '#1a8d9b', lineHeight: '1', marginBottom: '0.25rem' }}>{remainingPunches}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#64748b' }}>يوم متبقي</span>
              </div>
            </div>
            """

content = content[:start_idx] + new_block + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Successfully replaced layout inline!")
