import sys

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\EmployeeDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace Mobile Bottom Nav
idx_nav_start = content.find('{/* Mobile Bottom Navigation Bar */}')
idx_nav_end = content.find(')}', idx_nav_start) + 2

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

if idx_nav_start != -1:
    content = content[:idx_nav_start] + new_nav_bar + content[idx_nav_end:]

# 2. Fix the Missing Punches squishiness
idx_widget_start = content.find('{/* الختمات الناقصة Widget */}')
idx_widget_end = content.find('</motion.div>', idx_widget_start)

if idx_widget_start != -1:
    widget_code = content[idx_widget_start:idx_widget_end]
    
    # Use dynamic sizing for mobile
    widget_code = widget_code.replace("padding: '1.25rem 1.5rem'", "padding: isMobile ? '1rem 0.75rem' : '1.25rem 1.5rem'")
    widget_code = widget_code.replace("width: '74px'", "width: isMobile ? '56px' : '74px'")
    widget_code = widget_code.replace("height: '74px'", "height: isMobile ? '56px' : '74px'")
    widget_code = widget_code.replace("size={38}", "size={isMobile ? 28 : 38}")
    widget_code = widget_code.replace("gap: '1.25rem'", "gap: isMobile ? '0.75rem' : '1.25rem'")
    widget_code = widget_code.replace("fontSize: '1.3rem'", "fontSize: isMobile ? '1.05rem' : '1.3rem'")
    widget_code = widget_code.replace("fontSize: '1.25rem'", "fontSize: isMobile ? '1.05rem' : '1.25rem'")
    widget_code = widget_code.replace("width: '75px'", "width: isMobile ? '60px' : '75px'")
    widget_code = widget_code.replace("height: '75px'", "height: isMobile ? '60px' : '75px'")
    widget_code = widget_code.replace("width: '80px'", "width: isMobile ? '60px' : '80px'")
    widget_code = widget_code.replace("height: '80px'", "height: isMobile ? '60px' : '80px'")
    widget_code = widget_code.replace("fontSize: '3rem'", "fontSize: isMobile ? '2.25rem' : '3rem'")
    
    content = content[:idx_widget_start] + widget_code + content[idx_widget_end:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated nav bar and responsive sizes.")
