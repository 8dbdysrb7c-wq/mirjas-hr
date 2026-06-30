import re

def update_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
        else:
            print(f"WARNING: String not found in {filepath}:\n{old[:100]}...")
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

old_nav = """      <div className="premium-tabs-container no-print mb-4" style={{ borderBottom: 'none' }}>
        {navItems.map(item => (
          <div
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            className={`premium-tab ${activeTab === item.id ? 'premium-tab-active' : 'premium-tab-inactive'}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}
      </div>"""

new_nav = """      <div className="premium-tabs-container no-print mb-4" style={{ borderBottom: 'none' }}>
        {navItems.map(item => (
          <div
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            className={`premium-tab ${activeTab === item.id ? 'premium-tab-active' : 'premium-tab-inactive'}`}
            style={{ position: 'relative' }}
          >
            {item.icon}
            <span>{item.label}</span>
            {pendingCounts[item.id] > 0 && (
              <span style={{
                position: 'absolute',
                top: '-6px',
                left: '-6px',
                backgroundColor: '#e11d48',
                color: 'white',
                fontSize: '10px',
                fontWeight: 'bold',
                padding: '2px 5px',
                borderRadius: '9999px',
                minWidth: '18px',
                textAlign: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                {pendingCounts[item.id]}
              </span>
            )}
          </div>
        ))}
      </div>"""

update_file('src/pages/hr/AdminHR.jsx', [
    (old_nav, new_nav)
])
