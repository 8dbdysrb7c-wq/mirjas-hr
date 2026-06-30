import sys
import re

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\EmployeeDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix the Mobile Bottom Navigation Bar
nav_bar_regex = r'\{\/\* Mobile Bottom Navigation Bar \*\/\}[\s\S]*?\}\)'
nav_match = re.search(nav_bar_regex, content)

new_nav_bar = """{/* Mobile Bottom Navigation Bar */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          padding: '0.75rem 1.5rem 1rem 1.5rem',
          zIndex: 9999,
          borderTop: '1px solid #f1f5f9'
        }}>
          {/* Right Icon - Grid */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', opacity: 0.8, cursor: 'pointer' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="5" cy="8" r="2.5" fill="#14b8a6" />
              <circle cx="12" cy="8" r="2.5" fill="#14b8a6" />
              <circle cx="19" cy="8" r="2.5" fill="#14b8a6" />
              <circle cx="5" cy="16" r="2.5" fill="#14b8a6" />
              <circle cx="12" cy="16" r="2.5" fill="#14b8a6" />
              <circle cx="19" cy="16" r="2.5" fill="#14b8a6" />
            </svg>
          </div>
          
          {/* Center Icon - Home */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0f766e' }}>الرئيسية</span>
          </div>

          {/* Left Icon - Grid */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', opacity: 0.8, cursor: 'pointer' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="5" cy="8" r="2.5" fill="#14b8a6" />
              <circle cx="12" cy="8" r="2.5" fill="#14b8a6" />
              <circle cx="19" cy="8" r="2.5" fill="#14b8a6" />
              <circle cx="5" cy="16" r="2.5" fill="#14b8a6" />
              <circle cx="12" cy="16" r="2.5" fill="#14b8a6" />
              <circle cx="19" cy="16" r="2.5" fill="#14b8a6" />
            </svg>
          </div>
        </div>
      )}"""

if nav_match:
    content = content[:nav_match.start()] + new_nav_bar + content[nav_match.end():]
else:
    print("Could not find mobile nav bar to replace.")


# 2. Fix the Missing Punches Widget squishiness
# Reduce the paddings and fixed sizes if it's mobile.
# Since it's inline styles, we can use `isMobile ? ... : ...`
# Let's replace the fixed widths and padding with dynamic ones.

widget_regex = r'\{\/\* الختمات الناقصة Widget \*\/\}[\s\S]*?(?=\{\/\* Admin Settings Grid)'
widget_match = re.search(widget_regex, content)
if widget_match:
    widget_code = widget_match.group(0)
    
    # 1. Padding
    widget_code = widget_code.replace("padding: '1.25rem 1.5rem'", "padding: isMobile ? '1rem 0.75rem' : '1.25rem 1.5rem'")
    
    # 2. Hexagon Size
    widget_code = widget_code.replace("width: '74px'", "width: isMobile ? '56px' : '74px'")
    widget_code = widget_code.replace("height: '74px'", "height: isMobile ? '56px' : '74px'")
    widget_code = widget_code.replace("size={38}", "size={isMobile ? 28 : 38}")
    
    # 3. Gap between Hexagon and Text
    widget_code = widget_code.replace("gap: '1.25rem'", "gap: isMobile ? '0.75rem' : '1.25rem'")
    
    # 4. Text Size
    widget_code = widget_code.replace("fontSize: '1.25rem'", "fontSize: isMobile ? '1.05rem' : '1.25rem'")
    
    # 5. Number Box Size
    widget_code = widget_code.replace("width: '75px'", "width: isMobile ? '60px' : '75px'")
    widget_code = widget_code.replace("height: '75px'", "height: isMobile ? '60px' : '75px'")
    widget_code = widget_code.replace("fontSize: '3rem'", "fontSize: isMobile ? '2.25rem' : '3rem'")
    
    content = content[:widget_match.start()] + widget_code + content[widget_match.end():]
else:
    print("Could not find Missing Punches widget.")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Mobile nav and widget spacing fixed.")
