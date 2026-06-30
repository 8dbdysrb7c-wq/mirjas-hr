import sys

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\EmployeeDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Modify font size and whiteSpace
# Find: fontSize: isMobile ? '0.85rem' : '1.05rem',
old_font = "fontSize: isMobile ? '0.85rem' : '1.05rem',"
new_font = "fontSize: isMobile ? '0.7rem' : '1.05rem',"
content = content.replace(old_font, new_font)

# Find: whiteSpace: 'nowrap'
# Replace with: whiteSpace: 'normal', lineHeight: '1.3'
old_ws = "whiteSpace: 'nowrap'"
new_ws = "whiteSpace: 'normal', lineHeight: '1.3'"
content = content.replace(old_ws, new_ws)

# Also let's fix the gap of the cards. The gap is currently '0.5rem'. That's fine.

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated font size and whitespace to wrap text properly.")
