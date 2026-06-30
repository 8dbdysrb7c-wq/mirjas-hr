import sys

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\EmployeeDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add position: 'relative', zIndex: 10 to the h3 tag in DashboardCard
# The h3 tag starts with <h3 style={{
# Find the exact style block for h3

old_h3_style = """<h3 style={{
          fontSize: isMobile ? '0.7rem' : '1.05rem',
          fontWeight: '800',
          color: disabled ? '#94a3b8' : '#0f766e',
          margin: 0,
          textAlign: 'center',
          whiteSpace: 'normal', lineHeight: '1.3'
        }}>"""

new_h3_style = """<h3 style={{
          position: 'relative',
          zIndex: 10,
          fontSize: isMobile ? '0.7rem' : '1.05rem',
          fontWeight: '800',
          color: disabled ? '#94a3b8' : '#0f766e',
          margin: 0,
          textAlign: 'center',
          whiteSpace: 'normal', lineHeight: '1.3'
        }}>"""

if old_h3_style in content:
    content = content.replace(old_h3_style, new_h3_style)
else:
    # Try a more generic replacement if the exact string isn't found
    import re
    h3_regex = r'<h3 style=\{\{([\s\S]*?)fontSize: isMobile \? \'0\.7rem\' : \'1\.05rem\','
    content = re.sub(h3_regex, r'<h3 style={{\n          position: \'relative\',\n          zIndex: 10,\1fontSize: isMobile ? \'0.7rem\' : \'1.05rem\',', content)

# Also ensure the icon container is above the dots
# The icon container has:
# <div style={{
#          position: 'relative',
#          width: isMobile ? '56px' : '76px',
old_icon_style = """<div style={{
          position: 'relative',
          width: isMobile ? '56px' : '76px',"""
new_icon_style = """<div style={{
          position: 'relative',
          zIndex: 10,
          width: isMobile ? '56px' : '76px',"""
if old_icon_style in content:
    content = content.replace(old_icon_style, new_icon_style)


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated z-index of text and icon to be above decorative dots.")
