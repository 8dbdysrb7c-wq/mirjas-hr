import sys

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\EmployeeDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

nav_start_idx = content.find('{/* Mobile Bottom Navigation Bar */}')
nav_end_idx = content.find(')}', nav_start_idx) + 2

if nav_start_idx != -1 and nav_end_idx != -1:
    new_nav_bar = """{/* Mobile Bottom Navigation Bar */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '20px',
          right: '20px',
          backgroundColor: '#ffffff',
          borderRadius: '30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          padding: '0.65rem 1.5rem',
          zIndex: 9999,
        }}>
          {/* Right Icon - Grid (rendered with div dots for 100% compatibility) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', opacity: 0.8, cursor: 'pointer' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
              {[1,2,3,4,5,6].map(i => (
                <div key={'r'+i} style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#14b8a6' }}></div>
              ))}
            </div>
          </div>
          
          {/* Center Icon - Home */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', cursor: 'pointer' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#0f766e' }}>الرئيسية</span>
          </div>

          {/* Left Icon - Grid */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', opacity: 0.8, cursor: 'pointer' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
              {[1,2,3,4,5,6].map(i => (
                <div key={'l'+i} style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#14b8a6' }}></div>
              ))}
            </div>
          </div>
        </div>
      )}"""
    
    content = content[:nav_start_idx] + new_nav_bar + content[nav_end_idx:]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Floating pill nav bar restored and dots built with DIVs.')
else:
    print('Could not find nav bar.')
