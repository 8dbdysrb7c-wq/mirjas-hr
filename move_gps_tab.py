import re

file_path = "c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/pages/admin/AdminSettings.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add the GPS tab button
gps_tab_html = """
        <div className={`premium-tab ${activeTab === 'hr' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('hr')}>
          <Briefcase size={18} /> إعدادات الموارد البشرية
        </div>
        <div className={`premium-tab ${activeTab === 'gps' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('gps')}>
          <Globe size={18} /> إعدادات البصمة والمواقع
        </div>
"""
content = content.replace(
"""        <div className={`premium-tab ${activeTab === 'hr' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('hr')}>
          <Briefcase size={18} /> إعدادات الموارد البشرية
        </div>""",
gps_tab_html
)


# 2. Extract GPS section and put it in activeTab === 'gps'
# Find the start of GPS Multi-Locations Settings
gps_start = content.find("{/* GPS Multi-Locations Settings */}")
if gps_start != -1:
    # Find the end of the site tab div
    # It ends with:
    #               ))}
    #             </div>
    #
    #           </div>
    #         )}
    # Let's find the closing of site tab. 
    # Actually, the GPS block ends before `{activeTab === 'statuses' && (`
    statuses_start = content.find("{activeTab === 'statuses' && (")
    
    # We will split it right before statuses_start
    gps_content = content[gps_start:statuses_start]
    
    # Wait, there is a `</div>` for `space-y-6` and `}` for `activeTab === 'site' && (`
    # We should look at the end of gps_content.
    # It looks like:
    #           </div>
    #         )}
    # 
    #         {activeTab === 'statuses' && (
    
    # We can replace the start of GPS section with `</div>)} {activeTab === 'gps' && (<div className="space-y-6">`
    # That way it properly closes the 'site' tab and opens the 'gps' tab.
    
    replacement_str = """
          </div>
        )}
        
        {activeTab === 'gps' && (
          <div className="space-y-6">
            {/* GPS Multi-Locations Settings */}
"""
    content = content.replace("{/* GPS Multi-Locations Settings */}", replacement_str)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated successfully.")
