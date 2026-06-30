import os

base_dir = r"c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src"
admin_settings_path = os.path.join(base_dir, "pages", "admin", "AdminSettings.jsx")

def replace_in_file(filepath, replacements):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

old_tabs = """      <div className="premium-tabs-container">
        <div className={`premium-tab ${activeTab === 'site' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('site')}>
          <Globe size={18} /> <span>إعدادات الموقع</span>
        </div>
        <div className={`premium-tab ${activeTab === 'statuses' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('statuses')}>
          <ListTodo size={18} /> <span>إدارة الحالات</span>
        </div>"""

new_tabs = """      <div className="premium-tabs-container">
        <div className={`premium-tab ${activeTab === 'hr' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('hr')}>
          <Users size={18} /> <span>الموارد البشرية والرواتب</span>
        </div>
        <div className={`premium-tab ${activeTab === 'site' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('site')}>
          <Globe size={18} /> <span>إعدادات الموقع</span>
        </div>
        <div className={`premium-tab ${activeTab === 'statuses' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('statuses')}>
          <ListTodo size={18} /> <span>إدارة الحالات</span>
        </div>"""

replace_in_file(admin_settings_path, [(old_tabs, new_tabs)])
print("HR Tab Button fixed.")
