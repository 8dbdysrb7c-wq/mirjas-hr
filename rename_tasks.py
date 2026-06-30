import sys

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\EmployeeDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace "متابعة الاقسام" or "متابعة الأقسام" with "المهام"
content = content.replace("متابعة الاقسام", "المهام")
content = content.replace("متابعة الأقسام", "المهام")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Renamed to المهام")
