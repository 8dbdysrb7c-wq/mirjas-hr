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

old_import_react = "import React, { useState } from 'react';"
new_import_react = "import React, { useState, useEffect } from 'react';\nimport { getHRLeaves, getMissingPunches } from '../../store';"

old_admin_hr_state = """const AdminHR = ({ user }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);"""

new_admin_hr_state = """const AdminHR = ({ user }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [pendingCounts, setPendingCounts] = useState({
    leaves: 0,
    overtime: 0,
    'missing-punches': 0
  });

  useEffect(() => {
    const fetchCounts = async () => {
      const [leaves, mps] = await Promise.all([getHRLeaves(), getMissingPunches()]);
      
      const pendingLeaves = leaves.filter(l => l.type !== 'بدل عمل إضافي' && l.status === 'معلق').length;
      const pendingOvertime = leaves.filter(l => l.type === 'بدل عمل إضافي' && l.status === 'معلق').length;
      const pendingMps = mps.filter(m => m.status === 'قيد المراجعة' || m.status === 'معلق').length;
      
      setPendingCounts({
        leaves: pendingLeaves,
        overtime: pendingOvertime,
        'missing-punches': pendingMps
      });
    };
    
    fetchCounts();
    // Refresh counts every 30 seconds
    const intervalId = setInterval(fetchCounts, 30000);
    return () => clearInterval(intervalId);
  }, []);"""

old_nav_render = """      <div className="premium-tabs-container no-print mb-4" style={{ borderBottom: 'none' }}>
        {navItems.map(item => (
          <div
            key={item.id}
            className={`premium-tab ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => handleNavClick(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}
      </div>"""

new_nav_render = """      <div className="premium-tabs-container no-print mb-4" style={{ borderBottom: 'none' }}>
        {navItems.map(item => (
          <div
            key={item.id}
            className={`premium-tab ${activeTab === item.id ? 'active' : ''}`}
            style={{ position: 'relative' }}
            onClick={() => handleNavClick(item.id)}
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
    (old_import_react, new_import_react),
    (old_admin_hr_state, new_admin_hr_state),
    (old_nav_render, new_nav_render)
])
