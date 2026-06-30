import re

with open('src/pages/admin/AdminSettings.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove jobtitles tab from main container
content = re.sub(
    r'\s*<div className={`premium-tab \${activeTab === \'jobtitles\' \? \'premium-tab-active\' : \'premium-tab-inactive\'}`} onClick=\{\(\) => setActiveTab\(\'jobtitles\'\)\}>\s*<Briefcase size=\{18\} /> <span>المسميات والأقسام الوظيفية</span>\s*</div>',
    '',
    content
)

# 2. Remove workshifts tab from main container
content = re.sub(
    r'\s*<div className={`premium-tab \${activeTab === \'workshifts\' \? \'premium-tab-active\' : \'premium-tab-inactive\'}`} onClick=\{\(\) => setActiveTab\(\'workshifts\'\)\}>\s*<Clock size=\{18\} /> <span>أوقات الدوام وبصمة الموقع</span>\s*</div>',
    '',
    content
)

# 3. Update the hr tab in main container to stay active for sub-tabs
content = re.sub(
    r'<div className={`premium-tab \${activeTab === \'hr\' \? \'premium-tab-active\' : \'premium-tab-inactive\'}`} onClick=\{\(\) => setActiveTab\(\'hr\'\)\}>',
    r'<div className={`premium-tab ${[\'hr\', \'jobtitles\', \'workshifts\'].includes(activeTab) ? \'premium-tab-active\' : \'premium-tab-inactive\'}`} onClick={() => setActiveTab(\'hr\')}>',
    content
)

# 4. Insert the sub-tabs before the glass-card
sub_tabs = """      {['hr', 'jobtitles', 'workshifts'].includes(activeTab) && (
        <div className="flex gap-3 mb-6 animate-fade-in overflow-x-auto pb-2" style={{ padding: '0 5px' }}>
          <button className={`premium-tab ${activeTab === 'hr' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('hr')}>
            <Settings size={18} /> <span>الإعدادات العامة</span>
          </button>
          <button className={`premium-tab ${activeTab === 'jobtitles' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('jobtitles')}>
            <Briefcase size={18} /> <span>المسميات والأقسام الوظيفية</span>
          </button>
          <button className={`premium-tab ${activeTab === 'workshifts' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('workshifts')}>
            <Clock size={18} /> <span>أوقات الدوام وبصمة الموقع</span>
          </button>
        </div>
      )}

      <div className="glass-card animate-fade-in">"""

content = content.replace('      <div className="glass-card animate-fade-in">', sub_tabs)

with open('src/pages/admin/AdminSettings.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
