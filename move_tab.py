import re

file_path = "c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/pages/admin/AdminSettings.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# The gps tab button string
gps_tab = """        <div className={`premium-tab ${activeTab === 'gps' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('gps')}>
          <Globe size={18} /> إعدادات البصمة والمواقع
        </div>
"""

# Remove the gps tab from its current location
content = content.replace(gps_tab, "")

# The leavepermissions tab string
leave_tab = """        <div className={`premium-tab ${activeTab === 'leavepermissions' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('leavepermissions')}>
          <Users size={18} /> صلاحيات الإجازات
        </div>
"""

# Find leave_tab and append gps_tab after it
if leave_tab in content:
    content = content.replace(leave_tab, leave_tab + gps_tab)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Moved successfully")
else:
    print("Could not find leave_tab string exactly as expected.")
