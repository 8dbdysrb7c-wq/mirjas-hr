import re

file_path = "c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/pages/EmployeeDashboard.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the first `case 'hr_requests':` with `case 'hr_requests_history':` just to fix the syntax error.
# The user might have a tab for 'hr_requests_history' or we just want to avoid the crash.
content = content.replace("case 'hr_requests':", "case 'hr_requests_history':", 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed duplicate case hr_requests")
