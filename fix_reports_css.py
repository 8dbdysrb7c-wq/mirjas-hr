import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Make premium-tabs-container scrollable on mobile
pattern = r'(\s*\.premium-tabs-container\s*\{[^}]*?)(\n\s*\})'
replacement = r'\1\n      flex-wrap: nowrap !important;\n      overflow-x: auto !important;\n      -webkit-overflow-scrolling: touch;\n      scrollbar-width: none;\n\2'

# Wait, there are multiple .premium-tabs-container. Let's specifically target the one in @media (max-width: 768px).
# It looks like:
#   .premium-tabs-container {
#       gap: 0.6rem;
#       padding-bottom: 0.85rem;
#       margin-left: -0.2rem;
#       margin-right: -0.2rem;
#       padding-left: 0.2rem;
#       padding-right: 0.2rem;
#     }

specific_pattern = r'(\s*\.premium-tabs-container\s*\{\s*gap: 0\.6rem;\s*padding-bottom: 0\.85rem;\s*margin-left: -0\.2rem;\s*margin-right: -0\.2rem;\s*padding-left: 0\.2rem;\s*padding-right: 0\.2rem;\s*\})'
specific_replacement = '''  .premium-tabs-container {
      gap: 0.6rem;
      padding-bottom: 0.85rem;
      margin-left: -0.2rem;
      margin-right: -0.2rem;
      padding-left: 0.2rem;
      padding-right: 0.2rem;
      flex-wrap: nowrap !important;
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }'''

new_css, count = re.subn(specific_pattern, specific_replacement, css)
print(f'Replaced {count} occurrences of premium-tabs-container')

# Also, let's fix the glass-panel flex container on mobile to wrap nicely if needed.
# Actually, the user says the fields and buttons are squished.
# In AdminReports.jsx: <div className="flex gap-4 items-center justify-between w-full flex-wrap">
# On mobile, `flex-wrap` will wrap them.
# The search bar has `w-full md:max-w-md`.
# The select has `minWidth: '200px'`. If both are w-full it's better.
with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(new_css)
