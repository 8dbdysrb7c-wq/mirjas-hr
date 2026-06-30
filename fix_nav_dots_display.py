import sys
import re

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\EmployeeDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the decorative dots from the Missing Punches widget
# It looks like:
# <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px', opacity: 0.12 }}>
#   {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
#     <div key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#14b8a6' }}></div>
#   ))}
# </div>
dots_regex = r'<div style=\{\{\s*position: \'absolute\',\s*top: \'16px\',\s*right: \'16px\',[\s\S]*?<\/div>\s*\}\}\s*>\s*<\/div>\s*\)\}\s*<\/div>'
# A safer way to remove it is string replacement if we know the exact string, but it varies.
# Let's use Python's find and remove carefully.
idx1 = content.find("<div style={{ position: 'absolute', top: '16px', right: '16px', display: 'grid'")
if idx1 != -1:
    idx2 = content.find("</div>\n", idx1) + 7
    # Wait, there's a map inside, so there's nested divs. 
    idx2 = content.find("</div>\n              </div>", idx1) # It might be different. Let's just remove the block we know.
    
    # Better: just replace the `opacity: 0.12` to `opacity: 0` or `display: 'none'`
    content = content.replace("opacity: 0.12 }}", "display: 'none' }}")


# 2. Fix the dots in the mobile bottom navigation bar
# They need explicit width so the flex container doesn't crush them to 0px.
old_nav_dots_right = """<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', opacity: 0.8, cursor: 'pointer' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>"""
new_nav_dots_right = """<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', opacity: 0.8, cursor: 'pointer' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', width: '23px', height: '14px' }}>"""
content = content.replace(old_nav_dots_right, new_nav_dots_right)

old_nav_dots_left = """<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', opacity: 0.8, cursor: 'pointer' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>"""
new_nav_dots_left = """<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', opacity: 0.8, cursor: 'pointer' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', width: '23px', height: '14px' }}>"""
content = content.replace(old_nav_dots_left, new_nav_dots_left)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed old dots and fixed nav dots width.")
