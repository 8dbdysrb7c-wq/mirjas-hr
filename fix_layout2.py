import re

file_path = r"c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\admin\AdminSettings.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace any className="..." right after stock and missions to have grid-cols-2
# Let's replace: <div className="grid md:grid-cols-2 gap-8 animate-fade-in">
# or <div className="grid md:grid-cols-2 gap-8">
# Let's just find `grid md:grid-cols-2` and replace with `grid grid-cols-2` everywhere inside AdminSettings.jsx
# Wait, if they use `grid md:grid-cols-2`, maybe they are meant to be side by side always.
content = re.sub(r'className="grid md:grid-cols-2([^"]*)"', r'className="grid grid-cols-2\1"', content)
content = re.sub(r'className="grid grid-cols-1 md:grid-cols-2([^"]*)"', r'className="grid grid-cols-2\1"', content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Layout replaced with grid-cols-2")
