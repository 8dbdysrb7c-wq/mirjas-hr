import sys
import re

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\EmployeeDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add custom icons right before DashboardCard
custom_icons_code = """
const CustomFolder = ({ size, style }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <defs>
      <filter id="folderShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#126a75" floodOpacity="0.3"/>
      </filter>
      <linearGradient id="folderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#4db6ac" />
        <stop offset="100%" stopColor="#1a8d9b" />
      </linearGradient>
    </defs>
    <g filter="url(#folderShadow)">
      {/* Back flap */}
      <path d="M8 18 C8 15 10 13 13 13 L26 13 L30 17 L51 17 C54 17 56 19 56 22 L56 46 C56 49 54 51 51 51 L13 51 C10 51 8 49 8 46 Z" fill="#126a75" />
      {/* Paper inside */}
      <path d="M14 20 L50 20 L50 42 L14 42 Z" fill="#ffffff" />
      {/* Front flap (slanted) */}
      <path d="M6 30 C6 28 8 26 10 26 L54 26 C56 26 58 28 58 30 L54 51 C54 53 52 55 49 55 L11 55 C8 55 6 53 6 51 Z" fill="url(#folderGrad)" />
    </g>
  </svg>
);

const CustomReport = ({ size, style }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <defs>
      <filter id="reportShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#126a75" floodOpacity="0.25"/>
      </filter>
    </defs>
    <g filter="url(#reportShadow)">
      {/* Body with fold cut out */}
      <path d="M18 10 C18 8 20 6 22 6 L36 6 L48 18 L48 54 C48 56 46 58 44 58 L22 58 C20 58 18 56 18 54 Z" fill="#ffffff" stroke="#126a75" strokeWidth="4" strokeLinejoin="round" />
      {/* Folded corner */}
      <path d="M36 6 L36 18 L48 18 Z" fill="#1a8d9b" stroke="#126a75" strokeWidth="4" strokeLinejoin="round" />
      {/* Lines */}
      <line x1="26" y1="30" x2="40" y2="30" stroke="#1a8d9b" strokeWidth="4" strokeLinecap="round" />
      <line x1="26" y1="40" x2="40" y2="40" stroke="#1a8d9b" strokeWidth="4" strokeLinecap="round" />
    </g>
  </svg>
);

const CustomCalendar = ({ size, style }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <defs>
      <filter id="calShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#126a75" floodOpacity="0.25"/>
      </filter>
    </defs>
    <g filter="url(#calShadow)">
      {/* Main body */}
      <rect x="12" y="16" width="40" height="38" rx="6" fill="#ffffff" />
      {/* Top bar */}
      <path d="M12 22 C12 18.7 14.7 16 18 16 L46 16 C49.3 16 52 18.7 52 22 L52 28 L12 28 Z" fill="#1a8d9b" />
      {/* Loops */}
      <rect x="20" y="10" width="4" height="12" rx="2" fill="#126a75" />
      <rect x="40" y="10" width="4" height="12" rx="2" fill="#126a75" />
      {/* Grid squares */}
      <rect x="18" y="34" width="5" height="5" rx="1" fill="#1a8d9b" />
      <rect x="26" y="34" width="5" height="5" rx="1" fill="#1a8d9b" />
      <rect x="34" y="34" width="5" height="5" rx="1" fill="#1a8d9b" />
      <rect x="42" y="34" width="5" height="5" rx="1" fill="#1a8d9b" />
      
      <rect x="18" y="42" width="5" height="5" rx="1" fill="#1a8d9b" />
      <rect x="26" y="42" width="5" height="5" rx="1" fill="#1a8d9b" />
      <rect x="34" y="42" width="5" height="5" rx="1" fill="#1a8d9b" />
      <rect x="42" y="42" width="5" height="5" rx="1" fill="#1a8d9b" />
    </g>
  </svg>
);
"""

# Inject custom icons
dashboard_card_start = content.find('const DashboardCard =')
if 'const CustomFolder =' not in content:
    content = content[:dashboard_card_start] + custom_icons_code + '\n' + content[dashboard_card_start:]


# Update DashboardCard to handle 'custom'
# We need to change the rendering part
old_render = """{/* Background Circle / Ring logic */}"""
new_render = """{/* Background Circle / Ring logic */}
        {iconType === 'custom' && (
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(26, 141, 155, 0.08) 0%, rgba(26, 141, 155, 0.02) 60%, transparent 70%)',
          }}></div>
        )}"""

content = content.replace(old_render, new_render)

# Now update the Icon rendering part
old_icon_render = """{/* The Icon itself */}
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
        </div>"""

new_icon_render = """{/* The Icon itself */}
        <div style={{ 
            position: 'relative', 
            zIndex: 10,
            transform: isHovered && !disabled ? 'scale(1.1)' : 'scale(1)',
            transition: 'transform 0.3s ease'
        }}>
          {iconType === 'custom' ? (
             <Icon size={46} style={{ filter: 'none' }} />
          ) : (
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
          )}
        </div>"""

if old_icon_render in content:
    content = content.replace(old_icon_render, new_icon_render)

# Update the components usage
content = re.sub(r'<DashboardCard \n                icon=\{Calendar\} \n                iconType="solid"', r'<DashboardCard \n                icon={CustomCalendar} \n                iconType="custom"', content, flags=re.DOTALL)
content = re.sub(r'<DashboardCard \n                icon=\{FileText\} \n                iconType="solid"', r'<DashboardCard \n                icon={CustomReport} \n                iconType="custom"', content, flags=re.DOTALL)
content = re.sub(r'<DashboardCard \n                icon=\{Folder\} \n                iconType="solid"', r'<DashboardCard \n                icon={CustomFolder} \n                iconType="custom"', content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated to use precise custom SVG icons")
