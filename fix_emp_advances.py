import re

file_path = "c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/pages/EmployeeDashboard.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add myAdvances hook
old_hook_line = "  const [myLeaves, setMyLeaves] = useState([]);"
new_hook_line = "  const [myLeaves, setMyLeaves] = useState([]);\n  const [myAdvances, setMyAdvances] = useState([]);"
content = content.replace(old_hook_line, new_hook_line)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("EmployeeDashboard.jsx fixed")
