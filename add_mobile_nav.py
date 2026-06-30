import sys
import re

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\EmployeeDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add paddingBottom to the main container when isMobile is true
container_old = '<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="employee-home-container animate-fade-in">'
container_new = '<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="employee-home-container animate-fade-in" style={{ paddingBottom: isMobile ? \'100px\' : \'0\' }}>'
content = content.replace(container_old, container_new)

# Inject the Bottom Navigation Bar before the final </div> of EmployeeDashboard
injection_point = r'(</div>\s*</div>\s*\)\}\s*</div>\s*\);\s*\};\s*export default EmployeeDashboard;)'
match = re.search(injection_point, content)

new_nav_bar = """
      {/* Mobile Bottom Navigation Bar */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '20px',
          right: '20px',
          backgroundColor: '#ffffff',
          borderRadius: '30px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.8rem 2.5rem',
          zIndex: 9999,
          border: '1px solid #f8fafc'
        }}>
          {/* Right Icon - Grid */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8, cursor: 'pointer' }}>
            <svg width="24" height="16" viewBox="0 0 24 16" fill="#14b8a6">
              <circle cx="4" cy="4" r="2" />
              <circle cx="12" cy="4" r="2" />
              <circle cx="20" cy="4" r="2" />
              <circle cx="4" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="20" cy="12" r="2" />
            </svg>
          </div>
          
          {/* Center Icon - Home */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f766e' }}>الرئيسية</span>
          </div>

          {/* Left Icon - Grid */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8, cursor: 'pointer' }}>
            <svg width="24" height="16" viewBox="0 0 24 16" fill="#14b8a6">
              <circle cx="4" cy="4" r="2" />
              <circle cx="12" cy="4" r="2" />
              <circle cx="20" cy="4" r="2" />
              <circle cx="4" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="20" cy="12" r="2" />
            </svg>
          </div>
        </div>
      )}
"""

if match:
    content = content[:match.start()] + new_nav_bar + content[match.start():]
else:
    print("Could not find injection point")
    sys.exit(1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Mobile Bottom Navigation Bar added.")
