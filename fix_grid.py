import sys
import re

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\EmployeeDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the Grid SVGs
old_svg = r'<svg width="24" height="16" viewBox="0 0 24 16" fill="#14b8a6">.*?<circle cx="20" cy="12" r="2" />\s*</svg>'

new_svg = """<svg width="28" height="20" viewBox="0 0 24 16">
              <circle cx="4" cy="4" r="2.5" fill="#14b8a6" />
              <circle cx="12" cy="4" r="2.5" fill="#14b8a6" />
              <circle cx="20" cy="4" r="2.5" fill="#14b8a6" />
              <circle cx="4" cy="12" r="2.5" fill="#14b8a6" />
              <circle cx="12" cy="12" r="2.5" fill="#14b8a6" />
              <circle cx="20" cy="12" r="2.5" fill="#14b8a6" />
            </svg>"""

if re.search(old_svg, content, re.DOTALL):
    content = re.sub(old_svg, new_svg, content, flags=re.DOTALL)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed grid icons.")
else:
    print("Could not find the old grid SVGs to replace.")
