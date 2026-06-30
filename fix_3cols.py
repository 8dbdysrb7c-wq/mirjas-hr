import sys
import re

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\EmployeeDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Modify the grid wrapper
old_grid = "gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr'"
new_grid = "gridTemplateColumns: 'repeat(3, 1fr)'"
content = content.replace(old_grid, new_grid)

# Change the gap from 1rem to 0.5rem on mobile
old_grid_style = "gap: '1rem', marginBottom: '2rem'"
new_grid_style = "gap: isMobile ? '0.5rem' : '1rem', marginBottom: '2rem'"
content = content.replace(old_grid_style, new_grid_style)

# 2. Modify DashboardCard to accept isMobile
old_decl = "const DashboardCard = ({ icon: Icon, title, onClick, disabled, iconType = 'solid' }) => {"
new_decl = "const DashboardCard = ({ icon: Icon, title, onClick, disabled, iconType = 'solid', isMobile }) => {"
content = content.replace(old_decl, new_decl)

# 3. Add isMobile to all DashboardCard instances
# It's inside EmployeeDashboard, so we can pass it
content = re.sub(r'<DashboardCard\s+', r'<DashboardCard isMobile={isMobile} ', content)

# 4. Make DashboardCard contents responsive using isMobile prop
# Padding
content = content.replace("padding: '1.75rem 0.5rem 1.25rem 0.5rem'", "padding: isMobile ? '1rem 0.25rem' : '1.75rem 0.5rem 1.25rem 0.5rem'")

# Icon container width
content = content.replace("width: '76px',", "width: isMobile ? '56px' : '76px',")
content = content.replace("height: '76px',", "height: isMobile ? '56px' : '76px',")

# Title font size
content = content.replace("fontSize: '1.05rem',", "fontSize: isMobile ? '0.85rem' : '1.05rem',")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated grid to 3 columns and made cards responsive.")
