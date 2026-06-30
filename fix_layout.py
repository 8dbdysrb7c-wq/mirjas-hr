import re

file_path = r"c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\admin\AdminSettings.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace grid md:grid-cols-2 with grid grid-cols-1 lg:grid-cols-2 items-start
# Also add flex-1 if we switch to flex. But let's just force grid-cols-2.
# "grid md:grid-cols-2 gap-8 animate-fade-in" -> "grid grid-cols-1 xl:grid-cols-2 gap-6 items-start animate-fade-in"

content = content.replace(
    'className="grid md:grid-cols-2 gap-8 animate-fade-in"',
    'className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start animate-fade-in"'
)

# For stock, it has 4 items. So xl:grid-cols-2 is perfect.
# Wait, let's also just try flex flex-wrap for stock? No, grid is better.
# Let's make it grid-cols-2 on lg as well.
content = content.replace(
    'className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start animate-fade-in"',
    'className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-fade-in"'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Layout fixed")
