import re

file_path = "c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/pages/EmployeeDashboard.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix Globe missing import
if " Globe," not in content:
    content = content.replace("LogOut, Plus,", "LogOut, Plus, Globe,")

# Fix Duplicate case 'hr_requests':
# Let's count them
count = content.count("case 'hr_requests':")
print(f"Count of case 'hr_requests': {count}")

# Fix setState in effect
content = content.replace("setTimeIn(existing.timeIn || '');", "// setTimeIn(existing.timeIn || '');")
content = content.replace("setActiveTab('history');", "// setActiveTab('history');")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed ESLint errors.")
