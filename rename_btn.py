import sys

file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\EmployeeDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace "المراقبة المباشرة" with "التحكم المباشر"
old_text = "المراقبة المباشرة"
new_text = "التحكم المباشر"

if old_text in content:
    content = content.replace(old_text, new_text)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Renamed to التحكم المباشر")
else:
    print("Text not found in the file.")
