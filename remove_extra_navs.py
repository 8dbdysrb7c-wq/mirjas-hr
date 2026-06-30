import re

with open('src/pages/EmployeeDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. We need to clear everything inside `modern-bottom-nav` AFTER the 'home' item, up to the closing `</div>` of the nav.
# Let's find `<div className="modern-bottom-nav` and the ending `</div>` before `{/* Sidebar Overlay */}`

bottom_nav_start = content.find('<div className="modern-bottom-nav')
overlay_start = content.find('{/* Sidebar Overlay */}')
if bottom_nav_start != -1 and overlay_start != -1:
    bottom_nav_section = content[bottom_nav_start:overlay_start]
    
    # We want to keep only the 'home' item inside bottom_nav_section
    # Let's rebuild it manually:
    home_item = """<div className={`modern-nav-item shrink-0 ${activeTab === 'home' ? 'active' : ''}`} onClick={() => handleTabChange('home')}>
          <Home size={22} /> <span>الرئيسية</span>
        </div>"""
    
    # Extract the div header
    div_header_end = bottom_nav_section.find('>') + 1
    new_bottom_nav = bottom_nav_section[:div_header_end] + "\n        " + home_item + "\n      </div>\n\n      "
    
    content = content[:bottom_nav_start] + new_bottom_nav + content[overlay_start:]

# 2. We need to clear everything inside `admin-sidebar-grid` AFTER the 'home' item.
# Let's find `<div className="admin-sidebar-grid">` and its end.

sidebar_grid_start = content.find('<div className="admin-sidebar-grid">')
if sidebar_grid_start != -1:
    # Find the end of this div. It should end right before `</div>` and then `</div>` and then `        {/* Main Content */}` or `      <div className="admin-content`
    # Let's just find the `admin-content` string which starts right after the sidebar.
    admin_content_start = content.find('<div className={`admin-content')
    if admin_content_start != -1:
        # Search backwards for the closing div of the sidebar
        sidebar_end = content.rfind('</div>', sidebar_grid_start, admin_content_start)
        
        sidebar_grid_section = content[sidebar_grid_start:sidebar_end]
        
        home_item_sidebar = """<div className={`admin-sidebar-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => handleTabChange('home')}>
              <Home size={22} /> <span>الرئيسية</span>
            </div>"""
        
        new_sidebar_grid = '<div className="admin-sidebar-grid">\n            ' + home_item_sidebar + '\n          </div>'
        
        content = content[:sidebar_grid_start] + new_sidebar_grid + '\n        </div>\n\n        ' + content[admin_content_start:]

with open('src/pages/EmployeeDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Removed all extra sidebar and bottom nav items successfully!")
