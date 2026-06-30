import sys

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\EmployeeDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# I need to find the `const DashboardCard = ` definition
start_idx = content.find('const DashboardCard = ({ icon: Icon, title, onClick, disabled }) => {')
if start_idx == -1:
    print("DashboardCard not found")
    sys.exit(1)

end_idx = content.find('};', start_idx) + 2

# We will replace DashboardCard
new_dashboard_card = """const DashboardCard = ({ icon: Icon, title, onClick, disabled, isSolidIcon = false }) => {
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
        boxShadow: isHovered && !disabled ? '0 12px 30px rgba(26, 141, 155, 0.12)' : '0 6px 16px rgba(0,0,0,0.04)',
        border: '1px solid #f8fafc',
        padding: '1.75rem 1rem 1.25rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        width: '100%',
        transform: isHovered && !disabled ? 'translateY(-4px)' : 'none',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative Dots Background like the mockup */}
      <div style={{ position: 'absolute', top: '20px', right: '25%', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#b2dfdb', opacity: 0.6 }}></div>
      <div style={{ position: 'absolute', top: '15px', left: '30%', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#80cbc4', opacity: 0.4 }}></div>
      <div style={{ position: 'absolute', bottom: '40px', right: '20%', width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#e0f2f1', opacity: 0.8 }}></div>
      <div style={{ position: 'absolute', top: '50%', left: '15%', width: '3px', height: '3px', borderRadius: '50%', backgroundColor: '#4db6ac', opacity: 0.5 }}></div>

      <div style={{
        position: 'relative',
        width: '76px',
        height: '76px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(224, 242, 241, 0.8) 0%, rgba(224, 242, 241, 0) 70%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '0.75rem',
      }}>
        {/* The Icon itself */}
        <Icon 
          size={32} 
          color="#126a75" 
          fill={isSolidIcon ? "#1a8d9b" : "none"} 
          strokeWidth={isSolidIcon ? 1.5 : 2}
          style={{ 
            filter: 'drop-shadow(0 4px 6px rgba(26, 141, 155, 0.2))',
            transform: isHovered && !disabled ? 'scale(1.1)' : 'scale(1)',
            transition: 'transform 0.3s ease'
          }} 
        />
      </div>
      
      <span style={{
        fontWeight: '800',
        fontSize: '15px',
        color: '#126a75',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        marginBottom: '0.5rem'
      }}>{title}</span>
      
      <div style={{
        width: '24px',
        height: '3px',
        backgroundColor: '#2dd4bf',
        borderRadius: '999px',
        opacity: 0.9,
        transition: 'width 0.3s ease',
        ...(isHovered && !disabled ? { width: '36px' } : {})
      }}></div>
    </button>
  );
};"""

content = content[:start_idx] + new_dashboard_card + content[end_idx:]

# Also let's update the Missing Punches widget based on the mockup layout
# The mockup has the number on the RIGHT, text in MIDDLE, hexagon on the LEFT
# Let's find the missing punches widget
widget_start = content.find('{/* الختمات الناقصة Widget */}')
widget_end = content.find('</motion.div>', widget_start)

if widget_start != -1 and widget_end != -1:
    old_widget = content[widget_start:widget_end]
    # Re-writing the widget
    new_widget = """{/* الختمات الناقصة Widget */}
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
                boxShadow: '0 6px 20px rgba(0,0,0,0.04)',
                border: '1px solid #f8fafc',
                padding: '1.25rem 1.5rem',
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
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(26, 141, 155, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.04)';
              }}
              dir="rtl"
            >
              {/* Decorative subtle waves/dots background for widget */}
              <div style={{ position: 'absolute', left: 0, bottom: 0, opacity: 0.1, pointerEvents: 'none' }}>
                <svg width="150" height="50" viewBox="0 0 150 50">
                  <path d="M0,50 Q37.5,0 75,50 T150,50 L150,50 L0,50 Z" fill="#1a8d9b" />
                </svg>
              </div>

              {/* Number box on the RIGHT (in RTL, it means first child in flex) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', zIndex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f8fafc',
                  borderRadius: '16px',
                  width: '65px',
                  height: '65px',
                  border: '1px solid #e2e8f0',
                  flexShrink: 0
                }}>
                  <span style={{ fontSize: '2.25rem', fontWeight: '800', color: '#1a8d9b', lineHeight: '1' }}>{remainingPunches}</span>
                </div>
                
                {/* Text in the MIDDLE */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ fontWeight: '800', color: '#126a75', fontSize: '1.1rem', margin: 0 }}>الختمات الناقصة</h4>
                </div>
              </div>

              {/* Hexagon on the LEFT */}
              <div style={{
                position: 'relative',
                width: '64px',
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                zIndex: 1,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.06))'
              }}>
                <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', color: '#ffffff' }}>
                  <path fill="currentColor" d="M50 3 L93 25 L93 75 L50 97 L7 75 L7 25 Z" />
                </svg>
                <Fingerprint size={30} color="#1a8d9b" style={{ position: 'relative', zIndex: 10 }} />
              </div>
            </div>
            """
    content = content[:widget_start] + new_widget + content[widget_end:]

# Update all DashboardCard usages to add isSolidIcon for Folder, FileText, Calendar
# Folder, FileText, Calendar, DollarSign, Plus, Clock, Activity, Truck, ShoppingCart, SewingMachineIcon, Layers, ClipboardCheck
# Let's make some of them solid to look like the mockup
content = content.replace('<DashboardCard \n                icon={Calendar}', '<DashboardCard \n                icon={Calendar} \n                isSolidIcon={true}')
content = content.replace('<DashboardCard \n                icon={FileText}', '<DashboardCard \n                icon={FileText} \n                isSolidIcon={true}')
content = content.replace('<DashboardCard \n                icon={Folder}', '<DashboardCard \n                icon={Folder} \n                isSolidIcon={true}')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Applied aesthetic updates.")
