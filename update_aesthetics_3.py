import sys

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\EmployeeDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('const DashboardCard = ({ icon: Icon, title, onClick, disabled')
if start_idx == -1:
    print("DashboardCard not found")
    sys.exit(1)

end_idx = content.find('};', start_idx) + 2

new_dashboard_card = """const DashboardCard = ({ icon: Icon, title, onClick, disabled, iconType = 'solid' }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // iconType can be: 'solid', 'solid-bg', 'ring'
  
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        boxShadow: isHovered && !disabled ? '0 12px 30px rgba(26, 141, 155, 0.12)' : '0 4px 15px rgba(0,0,0,0.03)',
        border: '1px solid #f1f5f9',
        padding: '1.75rem 0.5rem 1.25rem 0.5rem',
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
      <div style={{ position: 'absolute', top: '15%', right: '15%', width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#b2dfdb', opacity: 0.6 }}></div>
      <div style={{ position: 'absolute', top: '25%', right: '28%', width: '3px', height: '3px', borderRadius: '50%', backgroundColor: '#80cbc4', opacity: 0.4 }}></div>
      <div style={{ position: 'absolute', bottom: '30%', left: '15%', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#e0f2f1', opacity: 0.8 }}></div>
      <div style={{ position: 'absolute', top: '40%', left: '25%', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#4db6ac', opacity: 0.5 }}></div>

      <div style={{
        position: 'relative',
        width: '76px',
        height: '76px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '0.75rem',
      }}>
        
        {/* Background Circle / Ring logic */}
        {iconType === 'solid' && (
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(26, 141, 155, 0.08) 0%, rgba(26, 141, 155, 0.02) 60%, transparent 70%)',
          }}></div>
        )}
        
        {iconType === 'solid-bg' && (
          <div style={{
            position: 'absolute',
            width: '80%',
            height: '80%',
            borderRadius: '50%',
            backgroundColor: '#1a8d9b',
            boxShadow: '0 4px 10px rgba(26, 141, 155, 0.3)'
          }}></div>
        )}

        {iconType === 'ring' && (
          <>
            <div style={{
              position: 'absolute',
              width: '90%',
              height: '90%',
              borderRadius: '50%',
              border: '2px solid rgba(26, 141, 155, 0.15)',
              borderTopColor: 'rgba(26, 141, 155, 0.6)',
              transform: 'rotate(-45deg)'
            }}></div>
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(26, 141, 155, 0.05) 0%, transparent 60%)',
            }}></div>
          </>
        )}

        {/* The Icon itself */}
        <div style={{ 
            position: 'relative', 
            zIndex: 10,
            transform: isHovered && !disabled ? 'scale(1.1)' : 'scale(1)',
            transition: 'transform 0.3s ease'
        }}>
          <Icon 
            size={iconType === 'solid-bg' ? 32 : 36} 
            color={iconType === 'solid-bg' ? "#ffffff" : "#126a75"} 
            fill={iconType === 'solid' ? "#1a8d9b" : "none"} 
            strokeWidth={iconType === 'solid-bg' ? 2.5 : 1.5}
            style={{ 
              filter: iconType !== 'solid-bg' ? 'drop-shadow(0 2px 4px rgba(26, 141, 155, 0.2))' : 'none',
              opacity: iconType === 'solid' ? 0.9 : 1
            }} 
          />
        </div>
      </div>
      
      <span style={{
        fontWeight: '800',
        fontSize: '15px',
        color: '#126a75',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        marginBottom: '0.4rem'
      }}>{title}</span>
      
      <div style={{
        width: '20px',
        height: '3px',
        backgroundColor: '#1a8d9b',
        borderRadius: '999px',
        opacity: 0.9,
        transition: 'width 0.3s ease',
        ...(isHovered && !disabled ? { width: '30px' } : {})
      }}></div>
    </button>
  );
};"""

content = content[:start_idx] + new_dashboard_card + content[end_idx:]

# Update usages of DashboardCard
# 'تقديم إجازة' -> Calendar -> solid
# 'تقرير العمل اليومي' -> FileText -> solid
# 'طلباتي' -> Folder -> solid
# 'عمل إضافي' -> Plus -> solid-bg
# 'تقديم مغادرة' -> Clock -> ring
# 'طلب سلفة' -> DollarSign -> ring

replacements = {
    '<DashboardCard \n                icon={Calendar} \n                isSolidIcon={true}\n                title="تقديم إجازة"': '<DashboardCard \n                icon={Calendar} \n                iconType="solid"\n                title="تقديم إجازة"',
    '<DashboardCard \n                icon={FileText} \n                isSolidIcon={true}\n                title="تقرير العمل اليومي"': '<DashboardCard \n                icon={FileText} \n                iconType="solid"\n                title="تقرير العمل اليومي"',
    '<DashboardCard \n                icon={Folder} \n                isSolidIcon={true}\n                title="طلباتي"': '<DashboardCard \n                icon={Folder} \n                iconType="solid"\n                title="طلباتي"',
    '<DashboardCard \n                icon={Plus} \n                title="عمل إضافي"': '<DashboardCard \n                icon={Plus} \n                iconType="solid-bg"\n                title="عمل إضافي"',
    '<DashboardCard \n                icon={Clock} \n                title="تقديم مغادرة"': '<DashboardCard \n                icon={Clock} \n                iconType="ring"\n                title="تقديم مغادرة"',
    '<DashboardCard \n                icon={DollarSign} \n                title="طلب سلفة"': '<DashboardCard \n                icon={DollarSign} \n                iconType="ring"\n                title="طلب سلفة"',
}

# The previous script had some variations in formatting, let's do a more robust regex or simple replace
import re

content = re.sub(r'<DashboardCard\s+icon=\{Calendar\}(.*?)(?:isSolidIcon=\{true\})?\s*title="تقديم إجازة"', r'<DashboardCard \n                icon={Calendar} \n                iconType="solid"\n                title="تقديم إجازة"', content, flags=re.DOTALL)
content = re.sub(r'<DashboardCard\s+icon=\{FileText\}(.*?)(?:isSolidIcon=\{true\})?\s*title="تقرير العمل اليومي"', r'<DashboardCard \n                icon={FileText} \n                iconType="solid"\n                title="تقرير العمل اليومي"', content, flags=re.DOTALL)
content = re.sub(r'<DashboardCard\s+icon=\{Folder\}(.*?)(?:isSolidIcon=\{true\})?\s*title="طلباتي"', r'<DashboardCard \n                icon={Folder} \n                iconType="solid"\n                title="طلباتي"', content, flags=re.DOTALL)
content = re.sub(r'<DashboardCard\s+icon=\{Plus\}\s+title="عمل إضافي"', r'<DashboardCard \n                icon={Plus} \n                iconType="solid-bg"\n                title="عمل إضافي"', content, flags=re.DOTALL)
content = re.sub(r'<DashboardCard\s+icon=\{Clock\}\s+title="تقديم مغادرة"', r'<DashboardCard \n                icon={Clock} \n                iconType="ring"\n                title="تقديم مغادرة"', content, flags=re.DOTALL)
content = re.sub(r'<DashboardCard\s+icon=\{DollarSign\}\s+title="طلب سلفة"', r'<DashboardCard \n                icon={DollarSign} \n                iconType="ring"\n                title="طلب سلفة"', content, flags=re.DOTALL)

# Missing Punches widget tweaks
# Use a beautiful rounded hexagon SVG for the icon
rounded_hexagon_svg = """<svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', color: '#ffffff', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.06))' }}>
                  <path fill="currentColor" d="M30 5 L70 5 C75 5 80 8 82 12 L98 42 C100 47 100 53 98 58 L82 88 C80 92 75 95 70 95 L30 95 C25 95 20 92 18 88 L2 58 C0 53 0 47 2 42 L18 12 C20 8 25 5 30 5 Z" />
                </svg>"""

# Replace the old hexagon
old_hexagon = """<svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', color: '#ffffff' }}>
                  <path fill="currentColor" d="M50 3 L93 25 L93 75 L50 97 L7 75 L7 25 Z" />
                </svg>"""

if old_hexagon in content:
    content = content.replace(old_hexagon, rounded_hexagon_svg)

# Replace the number box to make it exactly like the mockup
# Mockup: background is a very light gradient or solid white with soft border, number is teal.
old_number_box = """<div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f8fafc',
                  borderRadius: '16px',
                  width: '65px',
                  height: '65px',
                  border: '1px solid #e2e8f0',
                  flexShrink: 0
                }}>"""
new_number_box = """<div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  borderRadius: '16px',
                  width: '75px',
                  height: '75px',
                  border: '1px solid #e2e8f0',
                  boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.8), 0 2px 8px rgba(0,0,0,0.03)',
                  flexShrink: 0
                }}>"""

if old_number_box in content:
    content = content.replace(old_number_box, new_number_box)

# Dot grid in top left of widget
dot_grid = """{/* Decorative subtle waves/dots background for widget */}
              <div style={{ position: 'absolute', top: '15px', left: '15px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', opacity: 0.1 }}>
                <div style={{width:'3px',height:'3px',borderRadius:'50%',background:'#1a8d9b'}}></div>
                <div style={{width:'3px',height:'3px',borderRadius:'50%',background:'#1a8d9b'}}></div>
                <div style={{width:'3px',height:'3px',borderRadius:'50%',background:'#1a8d9b'}}></div>
                <div style={{width:'3px',height:'3px',borderRadius:'50%',background:'#1a8d9b'}}></div>
                <div style={{width:'3px',height:'3px',borderRadius:'50%',background:'#1a8d9b'}}></div>
                <div style={{width:'3px',height:'3px',borderRadius:'50%',background:'#1a8d9b'}}></div>
                <div style={{width:'3px',height:'3px',borderRadius:'50%',background:'#1a8d9b'}}></div>
                <div style={{width:'3px',height:'3px',borderRadius:'50%',background:'#1a8d9b'}}></div>
                <div style={{width:'3px',height:'3px',borderRadius:'50%',background:'#1a8d9b'}}></div>
              </div>"""

old_decorative = """{/* Decorative subtle waves/dots background for widget */}
              <div style={{ position: 'absolute', left: 0, bottom: 0, opacity: 0.1, pointerEvents: 'none' }}>
                <svg width="150" height="50" viewBox="0 0 150 50">
                  <path d="M0,50 Q37.5,0 75,50 T150,50 L150,50 L0,50 Z" fill="#1a8d9b" />
                </svg>
              </div>"""

if old_decorative in content:
    # Also add the waves to the bottom left
    new_decorative = dot_grid + """
              <div style={{ position: 'absolute', left: 0, bottom: 0, opacity: 0.1, pointerEvents: 'none' }}>
                <svg width="150" height="40" viewBox="0 0 150 40" preserveAspectRatio="none">
                  <path d="M0,40 Q30,10 75,25 T150,0 L150,40 L0,40 Z" fill="#1a8d9b" />
                </svg>
              </div>"""
    content = content.replace(old_decorative, new_decorative)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Applied level 3 aesthetics.")
