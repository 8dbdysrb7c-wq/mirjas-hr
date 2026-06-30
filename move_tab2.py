import re

file_path = "c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/pages/admin/AdminSettings.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Find the GPS tab button block
gps_tab_match = re.search(r'\s*<div className={`premium-tab \$\{activeTab === \'gps\' \? \'premium-tab-active\' : \'premium-tab-inactive\'\}`} onClick=\{\(\) => setActiveTab\(\'gps\'\)\}>\s*<Globe size=\{18\} />[^{<]+</div>\n', content)

if gps_tab_match:
    gps_tab = gps_tab_match.group(0)
    
    # Remove it
    content = content.replace(gps_tab, "")
    
    # Find the leavepermissions tab block end
    leave_match = re.search(r'<div className={`premium-tab \$\{activeTab === \'leavepermissions\'.*?</div>\n', content, re.DOTALL)
    
    if leave_match:
        leave_tab = leave_match.group(0)
        # Append gps_tab after leave_tab
        content = content.replace(leave_tab, leave_tab + gps_tab)
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print("Successfully moved GPS tab next to leavepermissions.")
    else:
        print("Could not find leavepermissions tab.")
else:
    print("Could not find GPS tab.")
